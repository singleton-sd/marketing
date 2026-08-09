<#
.SYNOPSIS
  Deploy Decap GitHub OAuth Azure Function (infra + zip).
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string] $OauthClientId,

  [string] $ResourceGroup = 'rg-ssd-marketing',
  [string] $FunctionAppName = 'ssd-mkt-decap-oauth-prod-ae',
  [string] $Origins = '',
  [switch] $SkipInfra,
  [switch] $SkipZip
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$appDir = Join-Path $root 'apps/marketing-oauth'

Add-Type -AssemblyName System.IO.Compression.FileSystem

Push-Location $root
try {
  if ([string]::IsNullOrWhiteSpace($Origins)) {
    $hostName = az staticwebapp show -g $ResourceGroup -n ssd-mkt-prod-ae --query defaultHostname -o tsv
    $prefix = ($hostName -split '\.')[0]
    $Origins = "singletonsd.com,www.singletonsd.com,${prefix}*.azurestaticapps.net,localhost:4321"
  }

  if (-not $SkipInfra) {
    Write-Host "Deploying Bicep infra/decap-oauth.bicep ..."
    az deployment group create `
      --resource-group $ResourceGroup `
      --template-file (Join-Path $root 'infra/decap-oauth.bicep') `
      --parameters oauthClientId=$OauthClientId origins=$Origins `
      --name "decap-oauth-$(Get-Date -Format 'yyyyMMddHHmmss')" | Out-Host
  }

  if ($SkipZip) {
    return
  }

  Write-Host "Building @singleton-sd/marketing-oauth ..."
  pnpm --filter @singleton-sd/marketing-oauth... install
  pnpm --filter @singleton-sd/marketing-oauth run build

  $stage = Join-Path $env:TEMP "decap-oauth-stage-$(Get-Random)"
  New-Item -ItemType Directory -Path $stage | Out-Null
  try {
    Copy-Item (Join-Path $appDir 'host.json') $stage
    Copy-Item (Join-Path $appDir 'package.json') $stage
    Copy-Item (Join-Path $appDir 'dist') (Join-Path $stage 'dist') -Recurse

    Push-Location $stage
    try {
      npm install --omit=dev --package-lock=false | Out-Host
      $zipPath = Join-Path $env:TEMP 'decap-oauth-deploy.zip'
      if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
      [System.IO.Compression.ZipFile]::CreateFromDirectory($stage, $zipPath)
    }
    finally {
      Pop-Location
    }

    Write-Host "Zip deploying to $FunctionAppName ..."
    az functionapp deployment source config-zip `
      --resource-group $ResourceGroup `
      --name $FunctionAppName `
      --src $zipPath | Out-Host

    Write-Host "Done. base_url=https://$FunctionAppName.azurewebsites.net"
  }
  finally {
    Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
  }
}
finally {
  Pop-Location
}
