# OpenClaw Docker

最小化 Docker 部署 [OpenClaw](https://github.com/openclaw/openclaw)，适合 VPS / 树莓派 / NAS 等场景。

## 使用预构建镜像

```bash
docker pull ghcr.io/billxc/openclaw-docker:latest
```

### 1. 首次配置

```bash
# 创建数据目录
mkdir -p ~/.openclaw

# 交互式配置（设置 Telegram token 等）
docker run -it --rm \
  -v ~/.openclaw:/root/.openclaw \
  ghcr.io/billxc/openclaw-docker:latest \
  setup
```

### 2. 启动

```bash
docker run -d --name openclaw \
  --restart unless-stopped \
  -v ~/.openclaw:/root/.openclaw \
  -p 3578:3578 \
  -e TZ=Asia/Shanghai \
  ghcr.io/billxc/openclaw-docker:latest
```

### 3. 常用命令

```bash
# 查看日志
docker logs -f openclaw

# 查看状态
docker exec openclaw openclaw status

# 停止
docker stop openclaw

# 更新镜像
docker pull ghcr.io/billxc/openclaw-docker:latest
docker stop openclaw && docker rm openclaw
# 重新执行启动命令
```

## 使用 Docker Compose

```bash
git clone https://github.com/billxc/openclaw-docker.git
cd openclaw-docker
docker compose up -d
```

## 自行构建

```bash
git clone https://github.com/billxc/openclaw-docker.git
cd openclaw-docker
docker compose build
docker compose up -d
```

## SSH 密钥

Git 操作需要 SSH 密钥时：

```bash
docker run -d --name openclaw \
  --restart unless-stopped \
  -v ~/.openclaw:/root/.openclaw \
  -v ~/.ssh:/root/.ssh:ro \
  -p 3578:3578 \
  ghcr.io/billxc/openclaw-docker:latest
```

## GitHub CLI

传入 `GH_TOKEN` 环境变量：

```bash
docker run -d --name openclaw \
  --restart unless-stopped \
  -v ~/.openclaw:/root/.openclaw \
  -e GH_TOKEN=ghp_xxx \
  -p 3578:3578 \
  ghcr.io/billxc/openclaw-docker:latest
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
