import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3578;
const OPENCLAW_DIR = process.env.OPENCLAW_DIR || join(process.env.HOME, ".openclaw");
const CONFIG_PATH = join(OPENCLAW_DIR, "openclaw.json");

const CLIENT_ID = "Iv1.b507a08c87ecfe98";
const DEVICE_CODE_URL = "https://github.com/login/device/code";
const ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";

// In-memory state for device flow
let deviceFlowState = null;

const html = readFileSync(join(__dirname, "index.html"), "utf-8");

function generateToken() {
  return randomBytes(32).toString("hex");
}

function buildConfig({ gatewayToken, telegramToken, provider, githubToken }) {
  const config = {
    meta: { lastTouchedVersion: "docker-fre", lastTouchedAt: new Date().toISOString() },
    gateway: {
      auth: { mode: "token", token: gatewayToken },
      bind: { address: "0.0.0.0", port: 3578 },
    },
    agents: {
      defaults: {
        workspace: join(OPENCLAW_DIR, "workspace"),
        compaction: { mode: "safeguard" },
      },
      list: [{ id: "main" }],
    },
  };

  if (provider === "github-copilot" && githubToken) {
    config.auth = {
      profiles: {
        "github-copilot:github": { provider: "github-copilot", mode: "token" },
      },
    };
    config.agents.defaults.model = { primary: "github-copilot/claude-sonnet-4" };
    config.agents.defaults.models = { "github-copilot/claude-sonnet-4": {} };
  } else if (provider === "openai") {
    config.agents.defaults.model = { primary: "openai/gpt-4o" };
  } else if (provider === "anthropic") {
    config.agents.defaults.model = { primary: "anthropic/claude-sonnet-4-20250514" };
  }

  if (telegramToken) {
    config.channels = { telegram: { enabled: true, token: telegramToken } };
  }

  return config;
}

function saveGithubToken(token) {
  // Save to openclaw's auth store (keychain fallback: file-based)
  const storePath = join(OPENCLAW_DIR, ".auth-profiles.json");
  const store = existsSync(storePath) ? JSON.parse(readFileSync(storePath, "utf-8")) : {};
  store["github-copilot:github"] = {
    type: "token",
    provider: "github-copilot",
    token,
  };
  mkdirSync(OPENCLAW_DIR, { recursive: true });
  writeFileSync(storePath, JSON.stringify(store, null, 2));
}

async function handleAPI(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let body = "";
  for await (const chunk of req) body += chunk;
  const data = body ? JSON.parse(body) : {};

  if (url.pathname === "/api/device-code") {
    // Start GitHub device flow
    const resp = await fetch(DEVICE_CODE_URL, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: CLIENT_ID, scope: "read:user" }),
    });
    const json = await resp.json();
    deviceFlowState = {
      deviceCode: json.device_code,
      interval: Math.max(5, json.interval) * 1000,
      expiresAt: Date.now() + json.expires_in * 1000,
    };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ user_code: json.user_code, verification_uri: json.verification_uri }));
    return;
  }

  if (url.pathname === "/api/device-poll") {
    if (!deviceFlowState) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No device flow in progress" }));
      return;
    }
    const resp = await fetch(ACCESS_TOKEN_URL, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        device_code: deviceFlowState.deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });
    const json = await resp.json();
    if (json.access_token) {
      deviceFlowState = null;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, token: json.access_token }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ pending: true, error: json.error }));
    return;
  }

  if (url.pathname === "/api/setup") {
    const gatewayToken = generateToken();
    const { telegramToken, provider, githubToken } = data;

    mkdirSync(OPENCLAW_DIR, { recursive: true });
    mkdirSync(join(OPENCLAW_DIR, "workspace"), { recursive: true });

    if (githubToken) saveGithubToken(githubToken);

    const config = buildConfig({ gatewayToken, telegramToken, provider, githubToken });
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, gatewayToken, message: "Config saved. Restarting..." }));

    // Give response time to flush, then exit so entrypoint restarts with gateway
    setTimeout(() => process.exit(0), 500);
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
}

const server = createServer((req, res) => {
  if (req.url === "/" || req.url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  } else if (req.url.startsWith("/api/")) {
    handleAPI(req, res).catch((e) => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    });
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🐾 OpenClaw First Run Setup: http://localhost:${PORT}\n`);
});
