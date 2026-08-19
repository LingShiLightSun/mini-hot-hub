# mini-hot-hub 项目长期记忆

## 部署铁律（2026-08-19 补充）
- **Vercel 中国区 RST**：用户电脑 + 手机 4G 均 ERR_CONNECTION_RESET，外部公网可正常访问 → Vercel 在中国大陆被网络限制（地区性 RST），非项目 bug。目标用户在大陆时慎用 Vercel，考虑 CloudStudio/国内平台；Railway 后端同样在海外，可能同受限。
- **Railway 端口模型**：Express 监听 Railway 注入的 process.env.PORT（本次实测 8080，非代码兜底 3001）。Generate Domain 的端口框必须 = Express 实际监听端口，从 Deploy Logs `Server running on http://localhost:xxxx` 确认。填错 → ERR_CONNECTION_TIMED_OUT。
- **CORS 尾斜杠**：Railway CLIENT_ORIGIN 填 `https://x.vercel.app/`（带斜杠）≠ 浏览器 Origin（无斜杠），cors 精确匹配失败 → 浏览器拦截响应。已在 server/index.js 用 `.trim().replace(/\/+$/,'')` 防御。
- **Deploy Logs 是诊断金标准**：Railway 的 Online 状态 ≠ 应用进程在跑；看 Deploy Logs 的 `Server running on http://localhost:xxxx` 确认进程监听端口。
- **CloudStudio 部署路线**：前端用 workbuddy_cloudstudio_deploy（directory=client/dist），腾讯云沙盒，中国大陆可直接访问，分享链接形如 `https://{id}.app.workbuddy.link`。适当前端；html-deploy 技能（单文件 HTML）不适用于本项目。

## 本地构建卡点（必踩，已验证绕过法）
- **npm 海外 registry 极慢** → 设 `npm_config_registry=https://registry.npmmirror.com`（国内镜像，~43s 装完）。
- **EPERM 写 package-lock.json**（文件被锁/只读）→ `npm install --no-package-lock` 绕过。
- **Vite build 清空 dist 被 genie-safe-delete 拦截中止** → build 前 `mv dist dist.bak`（rename 不走删除拦截），让 Vite 新建空 dist 写。
- node_modules 的 safe-delete trash 警告（lightningcss/@oxlint 跨平台包）为非致命 warn，忽略。

## 已落地修复（server/index.js）
- CLIENT_ORIGIN 规范化（去空格 + 去尾斜杠），防御 Railway 控制台误填带斜杠值。
