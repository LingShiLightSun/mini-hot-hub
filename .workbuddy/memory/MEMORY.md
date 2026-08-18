# mini-hot-hub 项目长期记忆

## 产品定位与设计哲学（核心灵魂，最高优先级）

- **产品核心理念：「将心注入、将爱注入」**：即使只是收集热点的小站，也希望每个交互细节透出温度——让人感到被认真对待、被温柔以待，而非面对冷冰冰的抓取机器。
  - 三个层次的「尊重」：① 对内容尊重=真实不糊弄（呼应严格不回退）；② 对人尊重=温柔不冰冷（出错给像人说的提示+重试出路，等待给安抚而非空白）；③ 对时间尊重=克制不骚扰（不弹窗不焦虑，热榜本就10分钟一更，主动把节奏还用户）。
  - **落地文档**：`2.PRD.md`（产品需求文档，属 `1.RESEARCH/2.PRD/3.TECH_DESIGN/4.AGENTS` 编号系列，2026-08-18 已把定位与原则合入其中）——承载定位、设计原则 P1~P5、功能边界、视觉气质指引、验收视角。是所有 UI/UX/文案决策的终审依据。勿再新建独立 `PRD.md`（已删，避免与编号系列割裂）。
  - **设计原则优先级（冲突时靠前者优先）**：P1 温暖优先于效率 / P2 人性化优先于机械感（文案像人说话、错误态有温度、加载态有安抚）/ P3 诚实优先于漂亮（严格不回退，绝不造假）/ P4 克制优先于堆砌（少即是暖）/ P5 包容优先于炫技（手机桌面都好用、字号看清、动效不引发不适）。
  - **视觉基调（硬约束）**：温暖、柔软、低饱和、有呼吸感；拒绝冷硬科技风、高饱和刺眼色、拥挤排版。圆角柔和、柔影淡、正文须看得清、动效轻缓无强闪。候选暖色主调（A全站暖奶黄/B奶黄+紫/C奶油白+焦糖金）优化阶段拍板，均须满足此基调。
  - ⚠️ 后续任何 UI/配色/文案改动，先过 PRD 五条原则；选色系时 P1 偏暖奶黄而非冷科技蓝。

## 用户的硬性任务约束（绝对优先）

- **「真实跑通，绝不降级回 mock」**：用户在做学习打卡任务，**所有热搜数据必须从真实第三方 API 抓取**，不允许在抓取失败时回退到本地 Mock 数据来"假装成功"。
  - 含义：后端 `weibo` 等真实抓取路由**不能**有 "fetch 失败 → 返回本地写死的 Mock 数组" 这种降级路径。失败必须如实返回 error 态，由前端展示。
  - 含义：换源可以（换能通的第三方 API），但**不能**用项目内 `WEIBO_HOT` / `ZHIHU_HOT` / `BILIBILI_HOT` 硬编码数组冒充真实数据。**（2026-08-18 这三个 Mock 数组已从 server/index.js 彻底删除：`PLATFORMS` 现仅存 sourceName/listName 元信息，未登记平台改走 error 态而非假数据。）**
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

## 调试反思 / 原则（下次不能再犯的）
- **env 字符串值打印必须用 `JSON.stringify(process.env.X)`，绝不用 `console.log(process.env.X)`**：尾随空格、换行符、引号、不可见 Unicode 等"看起来对但其实不对"的情况，肉眼根本分辨不出来。`"1 "` 打印出来就是 `1 `（注意空格），看着像正确值。**用 `JSON.stringify` 才能看到原样的引号和空格**。这条是今天排查 4 轮才定位尾随空格 bug 的根本原因。
- **代码侧对 env 字符串值默认 `.trim()` 再判定**：永不信任从外部传进来的 env 字符串，"看起来是 1" 和 "真的是 '1'" 之间可能差一个空格/换行/全角空格。一行 `x.trim() === '1'` 就能根治（已落地在 `server/index.js` injectFail 判断）。同理：URL、header、cookie 这类外部输入都建议 trim。
- **多轮诊断要"最短链路优先"**：今天走过的弯路是同时怀疑"PowerShell 语法 / PowerShell→cmd 子进程 / npm 吞 env / 端口冲突"4 个互不相关的可能，每个都让用户试一遍才排除。**正确顺序**：① 先 `curl` 看真实响应（10 秒出真相）；② 再 `JSON.stringify` 看 env 原值（30 秒定位真凶）；③ 最后才怀疑代码、shell、工具链。下次类似"开关/变量看起来没生效"的场景，按这顺序能省一半对话。
- **怀疑链 ≥3 还没锁定根因时，立刻加诊断日志**：本次错在第 2 轮就该加 `JSON.stringify(process.env)` 看一眼原始值，而不是从 PowerShell→cmd→npm 三个层面逐个绕。多打一行诊断日志 > 走 3 圈冤枉路。
- **用户报"某平台是错误态"时，先确认后端 3001 到底在不在跑**：本次用户说"知乎是错误态"，实际 `netstat -ano | grep :3001` 显示**没有任何进程监听 3001**（后端早已不在跑，可能在长对话里终端被关/崩了）。此时浏览器看到的是 Vite 代理 502、**三张卡全红**，而非单知乎故障——用户只是盯着知乎那张。排查"某卡报错"前，先 `curl http://localhost:3001/api/health` 或 `netstat -ano | grep :3001` 确认后端活着；后端死了就是全卡错，跟具体哪个平台无关。
- **`MOCK_FAIL_*` 修完尾随空格后才"真生效"**：旧代码 `=== '1'` 下，`set MOCK_FAIL_X=1`（带尾随空格）不触发；`.trim()` 修复后，任何带/不带空格的 `MOCK_FAIL_X=1` 都会真正注入故障。**所以"修完之后反而看到错误态"很可能是旧开关现在生效了**——排查错误态前，先确认后端启动命令没带 `MOCK_FAIL_*`（`netstat` 找 3001 PID → 看其启动命令行 / 或直接干净重启 `MOCK_FAIL_WEIBO= MOCK_FAIL_ZHIHU= MOCK_FAIL_BILIBILI= node --watch index.js`）。

## 用户环境踩坑（复用）

- Windows PowerShell 终端缓冲会让 `node index.js` 实时日志看不到：用 `node index.js > server.log 2>&1` + `type server.log` 解决
- 后端被 `Ctrl+C` 关掉后 git push 会导致 502；记得用 `node --watch index.js` 常驻
- Vite 5173 端口被占（僵尸进程）：`taskkill /PID <pid> /F` 强制杀掉
- npm EPERM（AppData npm-cache 权限）：用 `npm install --cache <项目内目录>`
- 第三方 API 易出问题的根因：**curl 才能区分 DNS 不通 / TLS 证书过期 / 接口拒**；Node `fetch failed` 把这三类混在一起
- **真机调试（手机测页面布局/响应式）**：Vite 默认只绑 `localhost`，手机访问不到 `localhost:5173`。要让手机能开，需让 Vite 监听 `0.0.0.0`：`npm run dev -- --host`（在 `client/` 目录）。再用 `ipconfig` 查本机局域网 IPv4（如 `192.168.x.x`/`10.x.x.x`），手机与电脑连同一 Wi-Fi 后访问 `http://<IP>:5173`。**后端 CORS 锁 `localhost:5173` 不会拦手机**——因 Vite 的 `/api` 代理是服务端转发到 `localhost:3001`，浏览器视角全程同域，不触发 CORS。Windows 防火墙需放行 `node`/`vite` 入站（专用网络）。换端口避冲突：`--host --port 5174`。
- **PowerShell 不支持 Unix 内联环境变量**：`MOCK_FAIL_WEIBO=1 npm run dev` 这种 `KEY=VALUE command` 写法只在 Bash/Git Bash/WSL 有效，PowerShell 会当成命令名解析并报「不是内部或外部命令」。PowerShell 正确写法：`$env:MOCK_FAIL_WEIBO="1"; npm run dev`（一行内，分号分隔），或者先 `$env:MOCK_FAIL_WEIBO="1"` 单独跑一次再 `npm run dev`。一次性的：开关调试可在 `server/package.json` 加 `"dev:fail-weibo": "node --watch index.js"` 并在启动脚本里读 `process.env.MOCK_FAIL_WEIBO`，或用 `cross-env` 跨平台统一写法避免复发。
- **PowerShell 里输入 `cmd` 会进入 cmd.exe 子进程**：提示符仍是 `>` 但语法全换了，PowerShell 写法（`$env:`、`Get-ChildItem`）会全炸成 cmd 风格报错（「xxx 不是内部或外部命令」/「文件名目录名卷标语法不正确」）。需要退出用 `exit` 回到 PowerShell，或者直接改成 cmd 写法（`set MOCK_FAIL_X=1 && command`）。
- **`npm run dev` 已起来但前端看不到 env 效果（端口冲突假象）**：场景：用户带着 env 重启后端，终端显示 `Server running on http://localhost:3001`、进入 `Waiting for file changes`，但前端请求仍走**旧的没 env 的**服务。根因：旧 `node --watch` 进程没被 `Ctrl+C` 真正终止或被新启动的 npm 进程挤掉，旧进程继续占用 3001，新进程拿不到端口（或静默退出）但终端仍给出"running"。诊断：`curl http://localhost:3001/api/hot/<source>` 看返回；`netstat -ano | findstr :3001` 看占用 PID。修法：`taskkill /PID <PID> /F` 精准杀（**不要** `taskkill /IM node.exe /F`，会把前端的 Vite 也一起杀掉），然后再起带 env 的服务。
- **Windows cmd + `set X=Y && npm run dev` 可能吞自定义 env**：场景：MOCK_FAIL 这种自定义开发期开关，`set X=Y && node -e "console.log(process.env.X)"` 能打出 `Y`（**直传 node 是 OK 的**），但同一个 cmd 行 `set X=Y && npm run dev` 再请求后端时日志显示**根本没收到 env**（请求走成功路径不报错）。根因：npm 在 Windows 上跑 scripts 时会启 cmd 子 shell（`cmd /c`）执行命令，某些版本会通过 `setlocal/endlocal` 隔离临时环境变量，自定义 env 在跨 npm 边界时被吞。诊断：在 cmd 直接跑 `set X=Y && node -e "console.log(process.env.X)"` 看是否直传 OK；区分"npm 吞 env"与"代码 bug"。修法：**绕过 npm script，直接给 node 启动**——`set X=Y && node --watch index.js`（在 `server/` 目录）；或长期方案：装 `cross-env` 让 `cross-env X=Y npm run dev` 跨平台稳透。
- **Windows cmd `set X=1` 会把行尾空格吃进变量值（尾随空格陷阱）**：场景：用户 `set MOCK_FAIL_WEIBO=1 && node --watch index.js`，后端 `node -e` 打印 `process.env.MOCK_FAIL_WEIBO` 显示 `1`（**肉眼看不出空格**），但实际进程里值是 `"1 "`（带尾随空格）。若代码用 `failFlag === '1'` 严格判定就会永远 false、故障注入看似"不生效"，绕了一大圈。根因：cmd 的 `set VAR=VALUE` 不修剪 `=` 后到行尾的空格。修法：① 代码层对 env 值统一 `.trim()` 后再判定（已落地在 `server/index.js` 的 injectFail 判断）；② cmd 层用带引号写法 `set "MOCK_FAIL_WEIBO=1"`（引号内的空格不会被吃）。诊断神器：在服务启动瞬间 `console.log('[boot]', JSON.stringify(process.env))` 把值原样打印，能直接看到 `"1 "` 这种带空格值。

## uapis.cn 数据语义（关键，防混淆）
- 统一策略：三平台均按 `hot_value` 降序排（utils/sortByHeatDesc.js），但各平台 hot_value 语义不同：
  - **微博**：hot_value = 微博官方**综合热度分**（搜索/讨论/阅读/传播速度多维加权），与官方 `index`(1..50) **严格一致(0违反)** → 按 hot_value 排 = 微博官方热搜序。
  - **知乎**：hot_value = 知乎热度分，与官方 `index`(1..30) **严格一致(0违反)** → 按 hot_value 排 = 知乎官方热搜序。
  - **B站**：hot_value = 视频**累计历史播放量**（extra.stat.view，已实测 hot_value 数字与 stat.view 100%一致），与官方 `index`(1..100) **不一致(54处违反)**。B站 官方按综合热度分（含时间衰减+互动加权）排而非纯播放量，故 index ≠ 播放量序。按 hot_value 排 = **纯播放量榜（≠B站官方热门序）**。
- **最终决策（用户拍板）**：三平台统一用**方案 B（按 hot_value 降序）**，用户认为更直观/更好；代码已实现（sortByHeatDesc），无需改动。B站 虽≠官方序，但用户明确偏好播放量口径。
- 用户点进详情页看到的"阅读量/播放量"是平台独立统计，uapis.cn 未返回、代码未采用，与 hot_value 两套口径，不可混用。
- ⚠️ 踩坑根因：① 勿把"详情页阅读量"误当 hot_value；② 勿未抓原始数据就下"hot_value=阅读量/排序依据"类结论；③ **B站 hot_value 是累计播放量、非综合热度分**（早期记错已更正）；④ B站 `index` 是否为官方综合热度序仅为推断，未实测比对 B站 真实热门页。

## 待办 / 伏笔（用户说后续会做问题汇总、逐个解决）

- **【伏笔-标题信息量】** 标题显示方案：
  - **桌面端（≥720px）**：维持**单行省略**（`white-space:nowrap`+ellipsis）。用户此前选"1行+省略，后续加功能弥补短标题看不出内容"，已定方案，勿擅自改（此条仍待后续补"看出内容"的功能）。
  - **手机端（<720px）**：**自动换行显示完整**（今日头条式，`white-space:normal` + `overflow-wrap:anywhere`）—— 用户 2026-08-18 拍板**去掉"临时方案"标注、确认采用为正式方案**（原"暂时尝试，后续可能换"作废）。
  - **根因**：原单行省略在手机 flex 子项（`.hot-card__title-link` 是 `.hot-card__item` 的 flex 子项）下 `text-overflow:ellipsis` 易失效 → B站 超长标题没被裁、横向溢出撑宽卡片、整页可横滑。自动换行从根上消除。
  - **勿擅自**：回退手机端换行、把桌面端也改换行、或改回强制 2 行高（用户已否决：1/2 行混排长短不一观感差）。
- ⚠️ 布局相关已确认的用户偏好：桌面三卡**强制等宽**（`repeat(3,minmax(0,1fr))`）、**响应式保持现状**（<720px 竖堆）、错误态卡只需**同宽**即可（内容稀疏暂时不在意）。
- **【伏笔-卡片尺寸/字体】** 用户觉得**卡片宽度偏小、字体偏小**，阅读观感不佳。暂时**不修改**，待后续问题汇总时一起处理（可能方向：加大桌面列宽/容器 max-width、调大正文字号与行高）。与「伏笔-标题信息量」同属布局观感类，汇总时一并评估。
- **【伏笔-分类栏"实习"】** 用户提出：未来页面的**分类栏（内容主题维度，非现有「平台维度」三卡）可增加「实习」分类**（即实习/校招/招聘类热榜方向）。当前仅有微博/知乎/B站三个平台聚合，尚无按内容主题的分类切换；此为**方向性想法、尚未设计、未写代码**。后续若做分类栏，可列入候选分类之一（实习、招聘、校招等）。与现有"三平台真实抓取"架构无冲突，但需新数据源/分类维度，落地前再评估。
- **【伏笔-真机访问方式】** 后续将**手机端访问方式从「局域网登录」改为「网址登录」**。当前手机调试靠 Vite `--host` 暴露局域网 IP（如 `http://192.168.30.186:5174`），依赖同 Wi-Fi + 防火墙放行 node/vite 入站，可分享性差、换网络即失效。未来方向：改为通过**公网网址/域名**访问（如部署到云托管/静态站点/CDN，或内网穿透拿到公网 URL），手机用普通网址打开，不再依赖局域网。与现有前端架构无冲突；落地需先选部署方案（参考「用户环境踩坑·真机调试」节）。状态：**方向性想法，未设计、未部署**。
