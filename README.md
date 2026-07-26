# Appointly Frontend

Appointly 客户预约 Web 应用（React + Vite + TypeScript）。

后端 API 仓库：[appointly](https://github.com/Hanzlgit/appointly)

## 技术栈

- React 19 + TypeScript
- Vite 8
- React Router 7
- TanStack Query
- Tailwind CSS 4

## 本地开发

### 1. 启动后端

在 `appointly` 仓库中：

```powershell
docker compose up -d
uv run python manage.py migrate
uv run python manage.py runserver
```

### 2. 启动前端

```powershell
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173 ，默认进入 `/t/acme`（需后端存在 slug 为 `acme` 的租户）。

开发模式下 Vite 会将 `/api` 与 `/health` 代理到 `http://127.0.0.1:8000`，无需额外配置 CORS。

### 3. 构建

```powershell
npm run build
npm run preview
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `VITE_API_BASE_URL` | 生产环境 API 根地址，如 `https://api.example.com`；本地开发留空即可 |

复制 `.env.example` 为 `.env.local` 按需修改。

## 路由

| 路径 | 说明 |
|------|------|
| `/t/:tenantSlug` | 租户首页（服务列表） |
| `/t/:tenantSlug/login` | 手机号 OTP 登录 |
| `/t/:tenantSlug/book?serviceId=` | 预约流程 |
| `/t/:tenantSlug/bookings` | 我的预约 |

## 与后端的关系

本仓库与 `appointly` 后端**独立部署**。生产环境常见组合：

- 前端静态文件由 Nginx / CDN 托管
- API 请求通过 `VITE_API_BASE_URL` 指向后端，并在后端配置 `CORS_ALLOWED_ORIGINS`

也可在 CI/CD 中将 `npm run build` 产物复制到后端 Nginx 静态目录，实现同域部署。
