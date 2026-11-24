param([switch]$Setup)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$androidRoot = Split-Path $PSScriptRoot -Parent
$toolsRoot = Join-Path $androidRoot '.tools'
$jdkRoot = Join-Path $toolsRoot 'jdk'
$sdkRoot = Join-Path $toolsRoot 'sdk'
$gradleRoot = Join-Path $toolsRoot 'gradle-8.11.1'
if ($Setup) {
    New-Item -ItemType Directory -Force $toolsRoot, $sdkRoot | Out-Null
    if (!(Test-Path "$jdkRoot/bin/java.exe")) {
        Write-Host 'Downloading Java 17...'
        & curl.exe --fail --location --retry 3 --continue-at - 'https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse' --output "$toolsRoot/jdk.zip"
        if ($LASTEXITCODE -ne 0) { throw 'Java download failed' }
        Expand-Archive "$toolsRoot/jdk.zip" "$toolsRoot/java" -Force
        $javaFolder = Get-ChildItem "$toolsRoot/java" -Directory | Select-Object -First 1
        Move-Item -LiteralPath $javaFolder.FullName -Destination $jdkRoot
    }
    if (!(Test-Path "$gradleRoot/bin/gradle.bat")) {
        Write-Host 'Downloading Gradle 8.11.1...'
        & curl.exe --fail --location --retry 3 --continue-at - 'https://services.gradle.org/distributions/gradle-8.11.1-bin.zip' --output "$toolsRoot/gradle.zip"
        if ($LASTEXITCODE -ne 0) { throw 'Gradle download failed' }
        Expand-Archive "$toolsRoot/gradle.zip" $toolsRoot -Force
    }
    if (!(Test-Path "$sdkRoot/cmdline-tools/latest/bin/sdkmanager.bat")) {
        Write-Host 'Downloading Android command-line tools...'
        & curl.exe --fail --location --retry 3 --continue-at - 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip' --output "$toolsRoot/sdk.zip"
        if ($LASTEXITCODE -ne 0) { throw 'SDK download failed' }
        Expand-Archive "$toolsRoot/sdk.zip" "$toolsRoot/sdk-unpack" -Force
        New-Item -ItemType Directory -Force "$sdkRoot/cmdline-tools" | Out-Null
        Move-Item -LiteralPath "$toolsRoot/sdk-unpack/cmdline-tools" -Destination "$sdkRoot/cmdline-tools/latest"
    }
}
if (!(Test-Path "$jdkRoot/bin/java.exe") -or !(Test-Path "$gradleRoot/bin/gradle.bat")) { throw 'Run this script with -Setup to install the isolated toolchain.' }
$env:JAVA_HOME = $jdkRoot
$env:ANDROID_HOME = $sdkRoot
$env:GRADLE_USER_HOME = Join-Path $toolsRoot 'gradle-cache'
$env:PATH = "$jdkRoot/bin;$env:PATH"
if ($Setup) {
    $answers = (1..30 | ForEach-Object { 'y' }) -join "`n"
    $answers | & "$sdkRoot/cmdline-tools/latest/bin/sdkmanager.bat" --licenses | Out-File "$toolsRoot/sdk-license-setup.log"
    if ($LASTEXITCODE -ne 0) { throw 'Android SDK license setup failed' }
    & "$sdkRoot/cmdline-tools/latest/bin/sdkmanager.bat" 'platforms;android-35' 'build-tools;35.0.0' 'platform-tools'
    if ($LASTEXITCODE -ne 0) { throw 'Android SDK setup failed' }
}
Push-Location $androidRoot
try {
    node scripts/prepare-assets.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Asset preparation failed' }
    $signingRoot = Join-Path $androidRoot '.signing'
    New-Item -ItemType Directory -Force $signingRoot | Out-Null
    if (!(Test-Path "$signingRoot/player-release.jks")) {
        $keySecret = [guid]::NewGuid().ToString('N')
        "password=$keySecret" | Set-Content "$signingRoot/release.properties" -Encoding Ascii
        $env:XOS_KEY_PASSWORD = $keySecret
        & "$jdkRoot/bin/keytool.exe" -genkeypair -keystore "$signingRoot/player-release.jks" -storetype JKS -storepass:env XOS_KEY_PASSWORD -keypass:env XOS_KEY_PASSWORD -alias xos-player -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=Amagi XOS Player'
        if ($LASTEXITCODE -ne 0) { throw 'APK signing key creation failed' }
        Remove-Item Env:XOS_KEY_PASSWORD
    }
    & "$gradleRoot/bin/gradle.bat" --no-daemon assembleRelease lintRelease
    if ($LASTEXITCODE -ne 0) { throw 'Android build failed' }
    & "$sdkRoot/build-tools/35.0.0/apksigner.bat" verify --verbose 'app/build/outputs/apk/release/app-release.apk'
    if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed' }
    Copy-Item 'app/build/outputs/apk/release/app-release.apk' '../public/XOS-Android.apk'
    Write-Host 'APK ready: public/XOS-Android.apk (signed release)'
} finally { Pop-Location }
