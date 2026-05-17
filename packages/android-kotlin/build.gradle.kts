plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.cinaconnect.android"
    compileSdk = 34
    defaultConfig {
        minSdk = 24
    }
}

dependencies {
    implementation("com.walletconnect:android-core:1.15.0")
    implementation("com.walletconnect:sign:1.15.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")
}
