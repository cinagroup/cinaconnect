# 安装

> 在各类项目中使用 Cinacoin。

## 支持的环境

| 环境 | 包名 | 最低版本 |
|------|------|---------|
| Web (通用) | `@cinacoin/core` | 0.1.0+ |
| React | `@cinacoin/react` | 0.1.0+ |
| Vue | `@cinacoin/vue` | 0.1.0+ |
| React Native | `@cinacoin/react-native` | 0.1.0+ |

## npm / yarn / pnpm

### Web 项目

```bash
# npm
npm install @cinacoin/core

# yarn
yarn add @cinacoin/core

# pnpm
pnpm add @cinacoin/core
```

### React 项目

```bash
npm install @cinacoin/core @cinacoin/react
```

### Vue 项目

```bash
npm install @cinacoin/core @cinacoin/vue
```

### React Native 项目

```bash
npm install @cinacoin/core @cinacoin/react-native
# 如果未安装 react-native-camera 等依赖
npx pod-install  # iOS
```

## CDN 引入（快速原型）

适合原型验证，生产环境建议使用 npm 安装：

```html
<script type="module">
  import { Cinacoin } from 'https://esm.sh/@cinacoin/core'
  // ...
</script>
```

## Monorepo 工作区

如果使用 Turborepo / Nx 等 monorepo 工具：

```json
{
  "workspaces": [
    "packages/*",
    "apps/*"
  ]
}
```

```json
{
  "dependencies": {
    "@cinacoin/core": "workspace:*",
    "@cinacoin/react": "workspace:*"
  }
}
```

## 依赖要求

| 依赖 | 最低版本 | 说明 |
|------|---------|------|
| TypeScript | 5.0+ | 推荐启用 |
| React (React 适配器) | 18.0+ | 如使用 @cinacoin/react |
| Node.js (开发时) | 18.0+ | 构建工具要求 |

## 验证安装

```bash
# 检查包是否正确安装
npm ls @cinacoin/core

# 应该看到类似输出：
# my-project@1.0.0
# └── @cinacoin/core@0.1.0
```
