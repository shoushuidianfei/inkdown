# InkDown 手动发布脚本
# 用法: .\scripts\publish-release.ps1 -Token "ghp_xxxxxxxx"
# 或设置环境变量: $env:GITHUB_TOKEN = "ghp_xxxxxxxx"

param(
    [string]$Tag = "v0.1.0",
    [string]$Name = "InkDown v0.1.0",
    [string]$Body = "InkDown 初始版本发布。`n`n## 安装方式`n- .msi：Windows 标准安装包（推荐）`n- -setup.exe：便携安装程序`n`n## 功能特性`n- 黄蓝极简风格 UI`n- 双链笔记 + 知识图谱`n- AI 辅助写作（支持 OpenAI / 通义千问 / 文心一言 / DeepSeek / 小米 MiMo）`n- WebDAV 同步`n- 本地 SQLite 全文搜索",
    [bool]$Draft = $false,
    [bool]$Prerelease = $false,
    [string]$Token = ""
)

$ErrorActionPreference = "Stop"

# 获取 GitHub Token
if (-not $Token) { $Token = $env:GITHUB_TOKEN }
if (-not $Token) {
    Write-Error "缺少 GitHub Token。请通过以下方式之一提供：`n  1. 设置环境变量: `$env:GITHUB_TOKEN = 'ghp_xxx'`n  2. 传入参数: .\scripts\publish-release.ps1 -Token 'ghp_xxx'`n`nToken 可在 https://github.com/settings/tokens 创建（勾选 'repo' 权限）"
    exit 1
}

$owner = "shoushuidianfei"
$repo = "inkdown"
$apiBase = "https://api.github.com"
$uploadBase = "https://uploads.github.com"

# 构建 release 请求体
$releasePayload = @{
    tag_name = $Tag
    name = $Name
    body = $Body
    draft = $Draft
    prerelease = $Prerelease
} | ConvertTo-Json -Depth 10

$headers = @{
    Accept = "application/vnd.github+json"
    Authorization = "Bearer $Token"
    "X-GitHub-Api-Version" = "2022-11-28"
}

Write-Host "正在创建 Release $Tag ..." -ForegroundColor Cyan

try {
    $release = Invoke-RestMethod -Uri "$apiBase/repos/$owner/$repo/releases" `
        -Method Post -Headers $headers -Body $releasePayload -ContentType "application/json"
    Write-Host "Release 创建成功: $($release.html_url)" -ForegroundColor Green
} catch {
    $err = $_
    if ($err.Exception.Response -and $err.Exception.Response.StatusCode.value__ -eq 422) {
        Write-Host "Release 可能已存在，尝试获取现有 Release..." -ForegroundColor Yellow
        $releases = Invoke-RestMethod -Uri "$apiBase/repos/$owner/$repo/releases" -Headers $headers
        $release = $releases | Where-Object { $_.tag_name -eq $Tag } | Select-Object -First 1
        if (-not $release) { throw $err }
    } else {
        throw $err
    }
}

$assets = @(
    "src-tauri/target/release/bundle/msi/InkDown_0.1.0_x64_en-US.msi",
    "src-tauri/target/release/bundle/nsis/InkDown_0.1.0_x64-setup.exe"
)

foreach ($relPath in $assets) {
    $fullPath = Join-Path $PSScriptRoot ".." $relPath | Resolve-Path
    if (-not (Test-Path $fullPath)) {
        Write-Warning "文件不存在，跳过: $fullPath"
        continue
    }

    $fileName = Split-Path $fullPath -Leaf
    $contentType = switch ([System.IO.Path]::GetExtension($fileName).ToLower()) {
        ".msi" { "application/x-msi" }
        ".exe" { "application/x-msdownload" }
        default { "application/octet-stream" }
    }

    Write-Host "正在上传 $fileName ..." -ForegroundColor Cyan

    try {
        $uploadHeaders = $headers.Clone()
        $uploadHeaders["Content-Type"] = $contentType

        $result = Invoke-RestMethod `
            -Uri "$uploadBase/repos/$owner/$repo/releases/$($release.id)/assets?name=$fileName" `
            -Method Post `
            -Headers $uploadHeaders `
            -InFile $fullPath

        Write-Host "上传成功: $($result.browser_download_url)" -ForegroundColor Green
    } catch {
        Write-Error "上传失败: $_"
    }
}

Write-Host "`n全部完成！Release 页面: $($release.html_url)" -ForegroundColor Green
if ($Draft) { Write-Host "注意：当前为 Draft 状态，请前往 GitHub 手动发布。" -ForegroundColor Yellow }
