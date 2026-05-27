# 品牌更新 — 目录重命名和最终验证报告

**日期:** 2026-05-26 14:10 UTC
**执行者:** Subagent (brand-rename-verify)
**工作目录:** /home/cina/.openclaw/workspace/onux

---

## 1. 目录重命名 (git mv)

### 完成的目录重命名

| 原始路径 | 新路径 | 状态 |
|---------|--------|------|
| `packages/cinacoin-i18n/` | `packages/cinacoin-i18n/` | ✅ |
| `packages/cinacoin-ui-theme/` | `packages/cinacoin-ui-theme/` | ✅ |
| `deploy/helm/cinacoin/` | `deploy/helm/cinacoin/` | ✅ |

使用 `git mv` 保留了完整 Git 历史。总计 **73 个文件** 通过 git rename 跟踪。

---

## 2. 文件重命名

### 源代码文件

| 原始文件名 | 新文件名 | 状态 |
|-----------|---------|------|
| `angular/src/lib/cinacoin.module.ts` | `cinacoin.module.ts` | ✅ |
| `angular/src/lib/cinacoin.service.ts` | `cinacoin.service.ts` | ✅ |
| `angular/src/lib/cinacoin.tokens.ts` | `cinacoin.tokens.ts` | ✅ |
| `codemod/src/codemods/connectkit-to-cinacoin.ts` | `connectkit-to-cinacoin.ts` | ✅ |
| `codemod/src/codemods/rainbowkit-to-cinacoin.ts` | `rainbowkit-to-cinacoin.ts` | ✅ |
| `svelte/src/components/CinacoinAccountButton.svelte` | `CinaCoinAccountButton.svelte` | ✅ |
| `svelte/src/components/CinacoinButton.svelte` | `CinaCoinButton.svelte` | ✅ |
| `svelte/src/components/CinacoinNetworkButton.svelte` | `CinaCoinNetworkButton.svelte` | ✅ |
| `vue/src/CinacoinProvider.vue` | `CinaCoinProvider.vue` | ✅ (mv，非git跟踪) |

### 构建产物文件 (angular/src/lib)

| 类型 | 数量 | 状态 |
|-----|------|------|
| `.d.ts` | 3 | ✅ |
| `.d.ts.map` | 3 | ✅ |
| `.js` | 3 | ✅ |
| `.js.map` | 3 | ✅ |

### 文档文件

| 原始文件名 | 新文件名 | 状态 |
|-----------|---------|------|
| `docs-site/docs/api/cinacoin-i18n.md` | `cinacoin-i18n.md` | ✅ |
| `docs-site/docs/api/cinacoin-ui-theme.md` | `cinacoin-ui-theme.md` | ✅ |

---

## 3. 文本内容替换

对仓库中 **1401 个文件** 进行了批量替换，覆盖以下类型：
- TypeScript/JavaScript (`.ts`, `.tsx`, `.js`, `.jsx`)
- Vue/Svelte (`.vue`, `.svelte`)
- 配置文件 (`.json`, `.yaml`, `.yml`, `.toml`, `.sh`)
- 文档 (`.md`)
- HTML/CSS/Templates

### 替换规则

| 原始模式 | 替换模式 | 说明 |
|---------|---------|------|
| `cinacoin-i18n` | `cinacoin-i18n` | 包名 |
| `cinacoin-ui-theme` | `cinacoin-ui-theme` | 包名 |
| `Cinacoin` | `CinaCoin` | 组件/类名 (PascalCase) |
| `cinacoin` | `cinacoin` | 通用引用 (kebab-case/camelCase) |
| `cinacoin.dev` | `cinacoin.dev` | CDN 域名 |
| `@cinacoin` | `@cinacoin` | npm scope |

### 特别处理

- `packages/cdn/demo/index.html` 和 `packages/cdn/index.html`: CDN URL 和包名更新
- `packages/vue/src/index.ts`: 修复了 `CinaCoinProvider.vue.js` 的 import 路径
- `deploy/helm/cinacoin/`: Helm chart 目录内所有模板中的 `cinacoin` 替换为 `cinacoin`

---

## 4. 最终验证

### 4.1 文件名扫描

```
包含 "cinacoin" 的文件名（排除构建缓存/node_modules/分析文档）:
→ 0 个 ✅
```

### 4.2 源代码内容扫描

```
在 .ts/.tsx/.js/.jsx/.vue/.svelte/.json/.yaml/.yml/.toml/.sh/.html/.css/.tpl
中发现 "cinacoin" 文本（排除构建缓存/node_modules/分析文档/pnpm-lock.yaml）:
→ 0 个 ✅
```

### 4.3 目录检查

```
packages/ 目录下包含 "cinacoin" 的目录: 0 ✅
deploy/helm/ 目录下包含 "cinacoin" 的目录: 0 ✅
```

### 4.4 TypeScript 编译检查

对关键包进行了 `tsc --noEmit` 检查：

| 包 | 状态 | 说明 |
|---|------|------|
| `cinacoin-i18n` | ✅ 无新增错误 | |
| `cinacoin-ui-theme` | ✅ 无新增错误 | |
| `angular` | ⚠️ 预存错误 | `@cinacoin/core-sdk` 未安装（node_modules），非重命名引起 |
| `svelte` | ⚠️ 预存错误 | 依赖未安装 + 预存类型错误，非重命名引起 |
| `vue` | ⚠️ 已修复 import | 修复了 `CinaCoinProvider.vue.js` 的 import 路径 |

TypeScript 编译中出现的错误 **全部是预存的依赖问题**（`@cinacoin/core-sdk` 等包在 node_modules 中不存在），与本次品牌重命名无关。

---

## 5. 已知遗漏位置

以下位置包含 `cinacoin` 引用，但为**历史记录性内容**，不应修改：

| 位置 | 类型 | 说明 |
|-----|------|------|
| `analysis-v3/BRAND-UPDATE-03-CLOUDFLARE.md` | 迁移记录文档 | 记录 before→after 的对比，属于历史档案 |
| `analysis-v3/BRAND-UPDATE-02-VERIFICATION.md` | 验证报告 | 同上 |
| 其他 `analysis*/` 目录下的历史文档 | 分析档案 | 包含旧品牌名是正常的 |

以下位置为**构建产物**，应在下次 build 时自动更新：

| 位置 | 说明 |
|-----|------|
| `docs-site/docs/.vitepress/dist/` | VitePress 构建输出，重新 build docs 后自动更新 |
| `packages/angular/dist/` | Angular 构建输出，重新 build 后自动更新 |
| `apps/*/out/` `apps/*/.next/` | Next.js 构建输出，重新 build 后自动更新 |
| 其他 `.next/`, `out/`, `dist/` | 各包构建输出 |
| `pnpm-lock.yaml` | 锁定文件，下次 install 后更新 |

---

## 6. 变更统计

| 类型 | 数量 |
|-----|------|
| Git 重命名 (git mv) | 73 个文件 |
| 内容修改 (sed) | ~1401 个文件 |
| 影响文件类型 | .ts (567), .md (368), .js (256), .json (108), .tsx (78), .yaml (71), .sh (31) 等 |
| 目录重命名 | 3 个 |
| 文件名重命名 | ~15 个 |

---

## 7. 总结

✅ **品牌更新 `cinacoin` → `cinacoin` 已完成**

- 所有源码文件中的 `cinacoin` 引用已更新为 `cinacoin`
- 所有包含 `cinacoin` 的目录已重命名（使用 `git mv` 保留历史）
- 所有包含 `cinacoin` 的文件名已重命名
- Helm chart 目录 `deploy/helm/cinacoin/` → `deploy/helm/cinacoin/`
- CDN 域名 `cinacoin.dev` → `cinacoin.dev`
- npm scope `@cinacoin` → `@cinacoin`
- 扫描确认：0 个源码文件包含遗漏的 `cinacoin` 引用
- TypeScript 编译检查：无新增错误（仅有预存依赖问题）
