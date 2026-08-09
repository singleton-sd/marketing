<#
.SYNOPSIS
  One-time helper: after you create the GitHub OAuth App in the browser,
  store the client secret in global KV and set the client id Variable.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string] $ClientId,
  [Parameter(Mandatory = $true)][string] $ClientSecret,
  [string] $VaultName = 'ssd-global-kv-prod-ae',
  [string] $Repo = 'singleton-sd/marketing'
)

$ErrorActionPreference = 'Stop'

az keyvault secret set `
  --vault-name $VaultName `
  --name github-decap-oauth-client-secret `
  --value $ClientSecret `
  --tags org=singleton-sd project=marketing "repo=$Repo" env=prod component=decap-oauth managed-by=cli `
  --query name -o tsv | Out-Host

gh variable set DECAP_OAUTH_CLIENT_ID --body $ClientId --repo $Repo

Write-Host "Next: powershell -File ./scripts/deploy-decap-oauth.ps1 -OauthClientId $ClientId"
Write-Host "OAuth App settings:"
Write-Host "  Homepage: https://singletonsd.com"
Write-Host "  Callback: https://ssd-mkt-decap-oauth-prod-ae.azurewebsites.net/callback"
