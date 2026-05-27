# 品牌更新 — GitHub 项目名称更新

**日期:** 2026-05-26  
**状态:** ✅ 本地更新完成，GitHub 端需手动操作

---

## 概述

将 GitHub 项目名称从 `CinaCoin` / `onux` 更新为 `Cinacoin`。

---

## 已完成的工作

### 1. Git Remote 配置

```bash
# 更新前
origin  git@github.com:cinagroup/cinacoin.git (fetch)
origin  git@github.com:cinagroup/cinacoin.git (push)

# 更新后
origin  git@github.com:cinagroup/Cinacoin.git (fetch)
origin  git@github.com:cinagroup/Cinacoin.git (push)
```

命令：`git remote set-url origin git@github.com:cinagroup/Cinacoin.git`

### 2. README.md — GitHub 克隆链接

**文件:** `README.md` 第 13 行

```diff
- gh repo clone cinacoin/cinacoin && cd cinacoin
+ gh repo clone cinagroup/Cinacoin && cd Cinacoin
```

### 3. package.json — Repository 字段

**文件:** `package.json`（根目录）

新增 repository 字段：

```json
"repository": {
  "type": "git",
  "url": "https://github.com/cinagroup/Cinacoin.git"
}
```

### 4. docs/social/github.md — GitHub 链接引用

**文件:** `docs/social/github.md`

两处更新：

```diff
- git clone https://github.com/cinacoin/cinacoin.git
+ git clone https://github.com/cinagroup/Cinacoin.git

- **Full Changelog:** [v0.1.0 → v0.2.0](https://github.com/cinacoin/cinacoin/compare/v0.1.0...v0.2.0)
+ **Full Changelog:** [v0.1.0 → v0.2.0](https://github.com/cinagroup/Cinacoin/compare/v0.1.0...v0.2.0)
```

### 5. 子包 package.json — Repository URL

更新以下 4 个子包的 repository.url 字段：

- `packages/multiwallet/package.json`
- `packages/embedded-wallet/package.json`
- `packages/gas-sponsorship/package.json`
- `packages/angular/package.json`

全部从 `https://github.com/cinacoin/onux.git` 更新为 `https://github.com/cinagroup/Cinacoin.git`

---

## 需要用户在 GitHub 网站上执行的步骤

### 在 GitHub 上重命名仓库

1. 打开浏览器访问 https://github.com/cinagroup/cinacoin
2. 点击仓库顶部的 **Settings** 标签
3. 向下滚动到 **Danger Zone** 区域
4. 点击 **Change repository name** 旁边的 **Rename** 按钮
5. 在弹出的对话框中，将仓库名从 `cinacoin` 改为 `Cinacoin`
6. 确认重命名

⚠️ **重要提醒：**
- GitHub 会自动设置重定向（旧 URL 仍然有效），但这是临时行为，建议尽快更新所有引用
- 如果有人克隆了旧的仓库地址，`git remote` 需要手动更新
- GitHub Actions workflows 可能需要重新触发

---

## 本地 git 命令（已完成）

```bash
cd /home/cina/.openclaw/workspace/onux
git remote set-url origin git@github.com:cinagroup/Cinacoin.git
git remote -v  # 验证
```

---

## 未修改的内容（有意保留）

以下内容未修改，因为它们是 **npm 包名/品牌名**，不是 GitHub 仓库名：

- `package.json` 中的 `"name": "cinacoin"` — 这是 npm 包名，修改会影响已发布的包
- 所有 `@cinacoin/*` scoped package names — 这些是 npm 包命名空间
- 源代码中的 `CinaCoin` 品牌引用（README 标题、文档等）
- 代码中的 `cinacoin` 模块导入路径

这些是品牌层面的修改，如果需要同时修改，应该单独执行。

---

## 其他发现

在以下文件中还发现了旧的 GitHub URL，但这些是编译输出或 UI 组件中的链接，建议作为后续品牌更新的一部分处理：

- `apps/demo/src/app/auth/page.js` — GitHub 链接指向 `https://github.com/cinaseek/onux`

---

**执行者:** Subagent (品牌更新任务)  
**时间:** 2026-05-26 14:07 UTC
