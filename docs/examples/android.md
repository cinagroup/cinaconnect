# Android 示例

> Android 原生 Kotlin 示例，展示 Cinacoin Android SDK 集成。

## 目录结构

```
examples/android/
├── app/src/main/
│   ├── java/com/cinacoin/example/
│   │   └── MainActivity.kt         # 主 Activity
│   └── res/layout/
│       ├── activity_main.xml       # 主布局
│       └── connect_fragment.xml    # 连接 Fragment
└── README.md
```

## 运行示例

```bash
cd examples/android

# 用 Android Studio 打开，或命令行：
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

## 要求

- **Android 8.0+** (API 26+)
- **Kotlin 1.9+**
- **Gradle 8.0+**
- **Android Studio Hedgehog+**

## 功能说明

### 1. MainActivity

主 Activity：

- Jetpack Compose UI
- 导航组件 (Navigation Compose)
- ViewModel 状态管理
- 连接状态展示

### 2. ConnectFragment

钱包连接界面：

- RecyclerView 钱包列表
- QR 码扫描 (使用 ML Kit)
- 连接动画
- 错误 Toast 提示

## Android SDK 使用

```kotlin
import com.cinacoin.core.Cinacoin
import com.cinacoin.core.config.CinacoinConfig

// 初始化
val config = CinacoinConfig(
    projectId = "your-project-id",
    relayUrl = "wss://relay.yourdomain.com/v1",
    chains = listOf(
        Chain(id = 1, name = "Ethereum", symbol = "ETH"),
        Chain(id = 137, name = "Polygon", symbol = "MATIC"),
    )
)

val cinacoin = Cinacoin(config, applicationContext)

// 连接
lifecycleScope.launch {
    val result = cinacoin.connect(walletId = "metamask")
    result.fold(
        onSuccess = { connection ->
            Toast.makeText(this@MainActivity, "Connected: ${connection.address}", Toast.LENGTH_SHORT).show()
        },
        onFailure = { error ->
            Toast.makeText(this@MainActivity, "Error: ${error.message}", Toast.LENGTH_SHORT).show()
        }
    )
}

// 监听状态
cinacoin.onAccountChange { address ->
    Log.d("Cinacoin", "Account changed: $address")
}
```

## Deep Link 配置

在 `AndroidManifest.xml` 中添加 intent filter：

```xml
<activity android:name=".MainActivity">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="cinacoin-example" />
    </intent-filter>
</activity>
```

## 依赖配置

```gradle
dependencies {
    implementation "com.cinacoin:core:0.1.0"
    implementation "com.cinacoin:android:0.1.0"
    
    // 可选：扫码功能
    implementation "com.google.mlkit:barcode-scanning:17.2.0"
}
```
