# OpenClaw Docker

最小化 Docker 部署 [OpenClaw](https://github.com/openclaw/openclaw)，适合 VPS / 树莓派 / NAS 等场景。

## 快速开始

```bash
# 构建
docker compose build

# 首次运行（交互式配置）
docker compose run --rm openclaw gateway start --foreground

# 后台运行
docker compose up -d

# 查看日志
docker compose logs -f
```

## 配置

配置持久化在 `openclaw-data` volume 中。首次启动会进入交互式配置。

如果已有配置，挂载到 `/root/.openclaw/`：

```bash
docker compose run --rm -v /path/to/your/config:/root/.openclaw openclaw gateway start --foreground
```

## SSH 密钥

Git 操作需要 SSH 密钥时，放到 `./ssh/` 目录：

```bash
mkdir ssh
cp ~/.ssh/id_ed25519 ssh/
cp ~/.ssh/id_ed25519.pub ssh/
```

## GitHub CLI

传入 `GH_TOKEN` 环境变量即可：

```bash
GH_TOKEN=ghp_xxx docker compose up -d
```

## 资源需求

- CPU: 1 核
- RAM: 512MB
- Disk: ~500MB（镜像）+ 配置/workspace

## 包含组件

- Node.js 22 (slim)
- OpenClaw (源码构建)
- Git, curl, Python 3, uv
- GitHub CLI (`gh`)
