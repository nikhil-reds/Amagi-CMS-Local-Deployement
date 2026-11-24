import java.util.Properties

plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
val signingFile = rootProject.file(".signing/release.properties")
val signingValues = Properties().apply { if (signingFile.exists()) signingFile.inputStream().use { load(it) } }
android {
    namespace = "com.amagi.screenplayer"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.amagi.screenplayer"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "1.0.1"
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    signingConfigs {
        if (signingFile.exists()) create("playerRelease") {
            storeFile = rootProject.file(".signing/player-release.jks")
            storePassword = signingValues.getProperty("password")
            keyAlias = "xos-player"
            keyPassword = signingValues.getProperty("password")
        }
    }
    buildTypes { getByName("release") {
        isMinifyEnabled = false
        if (signingFile.exists()) signingConfig = signingConfigs.getByName("playerRelease")
    } }
}
dependencies { implementation("androidx.webkit:webkit:1.12.1") }
