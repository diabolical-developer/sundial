# Builds Sundial.apk on this PC, the same way DrinkUp's build.ps1 does: no Expo account, no cloud.
# Everything it needs lives in .local-build\ (Android SDK + NDK, Gradle cache, release keystore).
#
#   .\build-apk.ps1            Sundial.apk for 64-bit phones (every Android phone from roughly 2017 on)
#   .\build-apk.ps1 -AllAbis   also 32-bit phones and x86 emulators (bigger file, slower build)
#   .\build-apk.ps1 -Clean     regenerate the android\ project from scratch first
#
# The first build compiles native code and takes 15-25 minutes; later builds take a few minutes.
# Keep .local-build\sundial-release.keystore safe: updates must be signed with the same key,
# or Android refuses to install them over the existing app.
param([switch]$AllAbis, [switch]$Clean)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
Set-Location $root
$tools = "$root\.local-build"

function Run($exe, [string[]]$a) {
  & $exe @a
  if ($LASTEXITCODE -ne 0) { throw "$exe failed ($LASTEXITCODE)" }
}

# The NDK can't run from a path with spaces ("Important Projects"): CMake then calls clang++ by its
# 8.3 short name and clang forgets it's linking C++. So the SDK is reached through a space-free
# junction (a link, nothing is copied) in %LOCALAPPDATA%.
$sdk = "$tools\sdk"
if ($sdk -match ' ') {
  $link = Join-Path $env:LOCALAPPDATA 'sundial-android-sdk'
  if ($link -match ' ') { throw "Can't find a path without spaces for the Android SDK: $link" }
  if (-not (Test-Path $link)) { cmd /c mklink /J "$link" "$sdk" | Out-Null }
  $sdk = $link
}
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:GRADLE_USER_HOME = "$tools\gradle"
$env:CI = '1'              # keeps the Expo CLI from asking questions
$env:NODE_ENV = 'production'
if (-not $env:JAVA_HOME) {
  $line = cmd /c 'java -XshowSettings:properties -version 2>&1' | Select-String 'java.home' | Select-Object -First 1
  if (-not $line) { throw 'Java 17 or newer is required (java was not found).' }
  $env:JAVA_HOME = ($line.ToString() -split '=', 2)[1].Trim()
}
if (-not (Test-Path "$env:ANDROID_HOME\platforms")) { throw 'Android SDK not found in .local-build\sdk.' }

# Release signing key: created once, then reused for every update.
$ks = "$tools\sundial-release.keystore"
$propsFile = "$tools\signing.properties"
if (-not (Test-Path $ks)) {
  $pw = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
  Run 'keytool' @('-genkeypair', '-keystore', $ks, '-alias', 'sundial', '-keyalg', 'RSA', '-keysize', '2048',
    '-validity', '10000', '-storepass', $pw, '-keypass', $pw, '-dname', 'CN=Sundial, O=Sid, C=IN')
  @("storeFile=$($ks -replace '\\', '/')", "storePassword=$pw", 'keyAlias=sundial', "keyPassword=$pw") | Set-Content $propsFile
}
$sign = @{}
Get-Content $propsFile | Where-Object { $_ -match '=' } | ForEach-Object { $k, $v = $_ -split '=', 2; $sign[$k.Trim()] = $v.Trim() }

Write-Host '1/4 dependencies'
if (-not (Test-Path "$root\node_modules")) { Run 'npm' @('ci') }

Write-Host '2/4 generating the Android project'
$prebuild = @('expo', 'prebuild', '--platform', 'android', '--no-install')
if ($Clean) {
  $prebuild += '--clean'
  # Drop cached native builds of the libraries too.
  Get-ChildItem "$root\node_modules" -Directory -Recurse -Depth 3 -Filter '.cxx' -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Parent.Name -eq 'android' } | Remove-Item -Recurse -Force
}
Run 'npx' $prebuild
Set-Content "$root\android\local.properties" "sdk.dir=$($env:ANDROID_HOME -replace '\\', '/')"

Write-Host '3/4 compiling'
$abis = if ($AllAbis) { 'armeabi-v7a,arm64-v8a,x86,x86_64' } else { 'arm64-v8a' }
Push-Location "$root\android"
try { Run '.\gradlew.bat' @('assembleRelease', "-PreactNativeArchitectures=$abis", '--console=plain') }
finally { Pop-Location }

Write-Host '4/4 signing'
$bt = Get-ChildItem "$env:ANDROID_HOME\build-tools" -Directory | Sort-Object { [version]$_.Name } | Select-Object -Last 1
$built = "$root\android\app\build\outputs\apk\release\app-release.apk"
$out = "$root\Sundial.apk"
Run "$($bt.FullName)\apksigner.bat" @('sign', '--ks', $ks, '--ks-key-alias', $sign['keyAlias'],
  '--ks-pass', "pass:$($sign['storePassword'])", '--key-pass', "pass:$($sign['keyPassword'])", '--out', $out, $built)
Run "$($bt.FullName)\apksigner.bat" @('verify', $out)
$mb = [math]::Round((Get-Item $out).Length / 1MB, 1)
Write-Host "BUILD OK -> $out ($mb MB)"
