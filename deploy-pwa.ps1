# Builds the PWA and publishes it to GitHub Pages (the gh-pages branch of this repo).
# Live at https://<owner>.github.io/<repo>/ a minute or two after it finishes.
#
#   .\deploy-pwa.ps1            build + publish
#   .\deploy-pwa.ps1 -NoPush    build only (into .local-build\pages), to check it first
#
# iPhone users open the link in Safari, then Share -> Add to Home Screen.
param([switch]$NoPush)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
Set-Location $root

function Run($exe, [string[]]$a) {
  & $exe @a
  if ($LASTEXITCODE -ne 0) { throw "$exe failed ($LASTEXITCODE)" }
}

# owner/repo from the git remote, e.g. https://github.com/diabolical-developer/sundial.git
$remote = (git remote get-url origin).Trim()
if ($remote -notmatch 'github\.com[:/](?<owner>[^/]+)/(?<repo>[^/.]+)') { throw "origin is not a GitHub repo: $remote" }
$owner = $Matches.owner; $repo = $Matches.repo
$out = "$root\.local-build\pages"

Write-Host "1/3 building the web app for /$repo/"
if (Test-Path $out) { Remove-Item -Recurse -Force $out }
$env:EXPO_BASE_URL = "/$repo"
try { Run 'npx' @('expo', 'export', '--platform', 'web', '--output-dir', $out) }
finally { Remove-Item Env:EXPO_BASE_URL }
Copy-Item "$out\index.html" "$out\404.html"
New-Item -ItemType File "$out\.nojekyll" -Force | Out-Null

if ($NoPush) { Write-Host "BUILD OK -> $out"; return }

Write-Host '2/3 publishing to the gh-pages branch'
$sha = (git rev-parse --short HEAD).Trim()
Push-Location $out
try {
  Run 'git' @('init', '-q', '-b', 'gh-pages')
  Run 'git' @('add', '-A')
  Run 'git' @('-c', 'user.name=Sundial deploy', '-c', "user.email=$((git -C $root config user.email))", 'commit', '-q', '-m', "Deploy PWA from $sha")
  Run 'git' @('push', '-q', '--force', $remote, 'gh-pages')
}
finally { Pop-Location }

Write-Host '3/3 making sure GitHub Pages serves the gh-pages branch'
if (Get-Command gh -ErrorAction SilentlyContinue) {
  $prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  gh api "repos/$owner/$repo/pages" --silent 2>$null
  if ($LASTEXITCODE -ne 0) {
    gh api -X POST "repos/$owner/$repo/pages" -f 'source[branch]=gh-pages' -f 'source[path]=/' --silent
  }
  $ErrorActionPreference = $prev
}
Write-Host "DEPLOYED -> https://$($owner.ToLower()).github.io/$repo/"
