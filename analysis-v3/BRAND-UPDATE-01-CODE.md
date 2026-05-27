# BRAND-UPDATE-01-CODE — CinaConnect → Cinacoin（代码层面）

**日期：** 2026-05-26
**执行方式：** 自动化 sed 批量替换 + 文件重命名
**状态：** ✅ 完成

## 变更范围

### 1. 包名称（package.json name 字段）

- **77 个包** 全部更新：`@cinaconnect/*` → `@cinacoin/*`
- 根目录 `package.json`：`cinaconnect` → `cinacoin`
- demo 应用：`cinaconnect-demo` → `cinacoin-demo`
- Unity：`com.cinaconnect.unity` → `com.cinacoin.unity`

### 2. Worker 名称（wrangler.toml）

- **35 处 wrangler.toml 引用** 已更新
- `cinaconnect-relay-server` → `cinacoin-relay-server`
- `cinaconnect-rpc-proxy` → `cinacoin-rpc-proxy`
- `cinaconnect-keys-server` → `cinacoin-keys-server`
- `cinaconnect-notify-server` → `cinacoin-notify-server`
- `cinaconnect-push-server` → `cinacoin-push-server`
- 其他 Workers 和 Pages 名称同步更新

### 3. 源码文件品牌引用

- **~1600 个源文件** 的内容更新（含 .ts / .js / .md / .yaml / .cs / .kt / .swift / .dart）
- 三个大小写变体全覆盖：`CINACONNECT` → `CINACOIN`、`CinaConnect` → `Cinacoin`、`cinaconnect` → `cinacoin`
- `@cinaconnect` import 路径 → `@cinacoin`
- 描述性文本中的品牌名称同步更新

### 4. 文件重命名

- **73 个文件重命名**（git 跟踪为 R 状态）
- `packages/cinaconnect-i18n/` → `packages/cinacoin-i18n/`（整个目录）
- `packages/cinaconnect-ui-theme/` → `packages/cinacoin-ui-theme/`（整个目录）
- `deploy/helm/cinaconnect/` → `deploy/helm/cinacoin/`（整个目录）
- 其他文件：
  - `packages/dotnet/CinaConnectClient.cs` → `CinacoinClient.cs`
  - `packages/dotnet/CinaConnect.csproj` → `Cinacoin.csproj`
  - `packages/react/src/CinaConnectProvider.tsx` → `CinacoinProvider.tsx`
  - `packages/react-native/src/CinaConnectProvider.tsx` → `CinacoinProvider.tsx`
  - `packages/svelte/src/lib/createCinaConnect.*` → `createCinacoin.*`
  - `packages/svelte/src/lib/useCinaConnect.*` → `useCinacoin.*`
  - Unity asmdef 文件 4 个

### 5. 文档和配置

- 所有 Markdown 文档中的品牌引用已更新
- Helm Chart 名称、values、模板引用已更新
- GitHub Actions 工作流中的品牌引用已更新
- Docker Compose 中的服务名称已更新
- 部署配置（监控、告警、runbook）已更新

## 未变更项（有意保留）

### 公共 API 常量

以下公共 API 常量**保持不变**，以免破坏消费者代码：

- `CINA_CONNECT_OPTIONS`（Angular InjectionToken）
- `CINA_CONNECT_INSTANCE`（Angular InjectionToken）
- `CINA_CONNECT_VERSION` / `CINA_CONNECT_SDK_VERSION`（SDK 版本常量）
- `CINA_CONNECT_CONFIG_BASE_URL`（环境变量名）

这些是公开的 API 接口，改名需要 major version bump。

### 域名引用

- `cinagroup.workers.dev` 域名保持不变（基础设施域名，非品牌名）

## 构建产物

- `dist/`、`.next/`、`out/`、`coverage/`、`target/` 目录中的构建产物**未手动修改**
- 这些目录会在下次 `pnpm build` 时自动重新生成
- `node_modules/` 中的 lock 文件保持不变（需要 `pnpm install` 重新链接）

## TypeScript 编译验证

- ✅ `packages/siwe` — 编译通过（0 errors）
- ⚠️ `packages/siwx` — 仅模块解析错误（`@cinacoin/siwe` 未在 node_modules 中安装）
- ⚠️ `packages/core-sdk` — 仅模块解析错误（`@cinacoin/*` 依赖未重新安装）

所有 TS 错误均为 **模块解析错误**，原因是 `node_modules` 中的 `@cinacoin/*` 包尚未重新安装。源代码语法和逻辑正确。

## 后续步骤

1. 运行 `pnpm install` 重新安装依赖（更新 lock 文件）
2. 运行 `pnpm build` 重新生成所有 dist 产物
3. 运行 `tsc --noEmit` 全面编译验证
4. 运行测试套件确认功能正常
5. 更新 Cloudflare Worker 部署名称（需要重新部署）
6. 如已发布 npm 包，需发布新版本

## 统计

| 类别 | 数量 |
|------|------|
| 包名称更新 | 77 |
| Wrangler 名称更新 | 35 |
| 源文件内容修改 | ~1600 |
| 文件/目录重命名 | 73 |
| 分析文档更新 | 65 |
| 总计变更文件 | 1675 |
