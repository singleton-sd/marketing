<#
.SYNOPSIS
  After creating the GitHub OAuth App, store id/secret/config in global KV
  and set the GitHub Actions Variable.

.DESCRIPTION
  Writes three Key Vault secrets (tagged for marketing):

  | Secret | Contents |
  | --- | --- |
  | github-decap-oauth-client-id | OAuth App client id |
  | github-decap-oauth-client-secret | OAuth App client secret |
  | github-decap-oauth-app-config | JSON: name, homepageUrl, callbackUrl, description |

  Re-read later with:
    az keyvault secret show --vault-name ssd-global-kv-prod-ae --name github-decap-oauth-app-config --query value -o tsv

.EXAMPLE
  powershell -File ./scripts/bootstrap-decap-oauth.ps1 -ClientId 'Ov23li...' -ClientSecret '...'
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string] $ClientId,
  [Parameter(Mandatory = $true)][string] $ClientSecret,

  [string] $VaultName = 'ssd-global-kv-prod-ae',
  [string] $Repo = 'singleton-sd/marketing',

  [string] $ApplicationName = 'Singleton SD Marketing Decap',
  [string] $HomepageUrl = 'https://singletonsd.com',
  [string] $CallbackUrl = 'https://ssd-mkt-decap-oauth-prod-ae.azurewebsites.net/callback',
  [string] $Description = 'Decap CMS login for company marketing'
)

$ErrorActionPreference = 'Stop'

$tags = @(
  'org=singleton-sd',
  'project=marketing',
  "repo=$Repo",
  'env=prod',
  'component=decap-oauth',
  'managed-by=cli'
)

function Set-KvSecret {
  param([string]$Name, [string]$Value)
  az keyvault secret set `
    --vault-name $VaultName `
    --name $Name `
    --value $Value `
    --tags $tags `
    --query name -o tsv | Out-Host
}

$appConfig = @{
  applicationName = $ApplicationName
  homepageUrl     = $HomepageUrl
  callbackUrl     = $CallbackUrl
  description     = $Description
  clientIdSecret  = 'github-decap-oauth-client-id'
  clientSecretSecret = 'github-decap-oauth-client-secret'
  functionApp     = 'ssd-mkt-decap-oauth-prod-ae'
  createdAt       = (Get-Date).ToUniversalTime().ToString('o')
} | ConvertTo-Json -Compress

Write-Host "Writing OAuth secrets to $VaultName ..."
Set-KvSecret -Name 'github-decap-oauth-client-id' -Value $ClientId
Set-KvSecret -Name 'github-decap-oauth-client-secret' -Value $ClientSecret
Set-KvSecret -Name 'github-decap-oauth-app-config' -Value $appConfig

Write-Host "Setting GitHub Variable DECAP_OAUTH_CLIENT_ID on $Repo ..."
gh variable set DECAP_OAUTH_CLIENT_ID --body $ClientId --repo $Repo

Write-Host ""
Write-Host "KV secrets saved:"
Write-Host "  github-decap-oauth-client-id"
Write-Host "  github-decap-oauth-client-secret"
Write-Host "  github-decap-oauth-app-config"
Write-Host ""
Write-Host "OAuth App form values (also in app-config JSON):"
Write-Host "  Application name: $ApplicationName"
Write-Host "  Homepage URL:     $HomepageUrl"
Write-Host "  Callback URL:     $CallbackUrl"
Write-Host ""
Write-Host "Next: powershell -File ./scripts/deploy-decap-oauth.ps1 -OauthClientId $ClientId"
