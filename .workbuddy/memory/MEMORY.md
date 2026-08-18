# mini-hot-hub 项目长期记忆

## 用户的硬性任务约束（绝对优先）

- **「真实跑通，绝不降级回 mock」**：用户在做学习打卡任务，**所有热搜数据必须从真实第三方 API 抓取**，不允许在抓取失败时回退到本地 Mock 数据来"假装成功"。
  - 含义：后端 `weibo` 等真实抓取路由**不能**有 "fetch 失败 → 返回本地写死的 Mock 数组" 这种降级路径。失败必须如实返回 error 态，由前端展示。
  - 含义：换源可以（换能通的第三方 API），但**不能**用项目内 `WEIBO_HOT` / `ZHIHU_HOT` / `BILIBILI_HOT` 硬编码数组冒充真实数据。
  - 场景：用户明确说过"这是我 AI 打卡任务里面的一个要求"，"绝对不换mock数据"。

## 项目结构

- 前端：`client/`（Vite + React 19 + TS，纯 CSS，治愈风）
- 后端：`server/`（Express + CORS，端口 3001）
- 缓存：`server/utils/cache.js`（进程内 Map，TTL 默认 600s，env `CACHE_TTL` 可改）
- 真实抓取服务：`server/services/{weibo}.js`（按平台一个文件）
- 缓存 key：`hot:<source>`；`?refresh=1` 跳过缓存
- 路由：`GET /api/hot/:source`（单平台）、`GET /api/hot`（聚合）、`GET /api/health`
- Vite 代理：`/api -> http://localhost:3001`（仅 dev 生效）
- 严格不回退：前端 `client/src/api/hot.ts` 用 `BACKEND_ROUTES` 登记，未登记/失败均显式 error 态

## 用户环境踩坑（复用）

- Windows PowerShell 终端缓冲会让 `node index.js` 实时日志看不到：用 `node index.js > server.log 2>&1` + `type server.log` 解决
- 后端被 `Ctrl+C` 关掉后 git push 会导致 502；记得用 `node --watch index.js` 常驻
- Vite 5173 端口被占（僵尸进程）：`taskkill /PID <pid> /F` 强制杀掉
- npm EPERM（AppData npm-cache 权限）：用 `npm install --cache <项目内目录>`
- 第三方 API 易出问题的根因：**curl 才能区分 DNS 不通 / TLS 证书过期 / 接口拒**；Node `fetch failed` 把这三类混在一起
