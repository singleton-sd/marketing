// Decap CMS GitHub OAuth proxy — Azure Functions on marketing Linux plan.
// Secrets: OAUTH_CLIENT_SECRET from global Key Vault only.
// CAF: ssd-mkt-decap-oauth-prod-ae

@description('Azure region')
param location string = resourceGroup().location

@description('Function App name (CAF)')
param functionAppName string = 'ssd-mkt-decap-oauth-prod-ae'

@description('Storage account for Functions (3-24 lowercase alphanumeric)')
param storageAccountName string = 'ssdmktstoauth'

@description('Existing Linux App Service Plan name')
param planName string = 'ssd-mkt-plan-prod-ae'

@description('Global Key Vault name (rg-ssd-global)')
param keyVaultName string = 'ssd-global-kv-prod-ae'

@description('Resource group of the global Key Vault')
param keyVaultResourceGroup string = 'rg-ssd-global'

@description('GitHub OAuth App client id (non-secret)')
param oauthClientId string

@description('Comma-separated Decap opener hostnames (no scheme)')
param origins string = 'singletonsd.com,www.singletonsd.com,localhost:4321'

@description('KV secret name for GitHub OAuth client secret')
param oauthClientSecretName string = 'github-decap-oauth-client-secret'

var roleKeyVaultSecretsUser = '4633458b-17de-408a-b874-0445c86b69e6'
var redirectUrl = 'https://${functionAppName}.azurewebsites.net/callback'

var marketingTags = {
  org: 'singleton-sd'
  project: 'marketing'
  repo: 'singleton-sd/marketing'
  env: 'prod'
  component: 'decap-oauth'
  'managed-by': 'bicep'
}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  tags: marketingTags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' existing = {
  name: planName
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
  scope: resourceGroup(keyVaultResourceGroup)
}

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  tags: marketingTags
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'Node|24'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storage.listKeys().keys[0].value}'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'AzureWebJobsFeatureFlags'
          value: 'EnableWorkerIndexing'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~24'
        }
        {
          name: 'OAUTH_CLIENT_ID'
          value: oauthClientId
        }
        {
          name: 'OAUTH_CLIENT_SECRET'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/${oauthClientSecretName}/)'
        }
        {
          name: 'REDIRECT_URL'
          value: redirectUrl
        }
        {
          name: 'SCOPES'
          value: 'repo,user'
        }
        {
          name: 'ORIGINS'
          value: origins
        }
      ]
    }
  }
}

resource kvFunctionSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, functionApp.id, roleKeyVaultSecretsUser)
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleKeyVaultSecretsUser)
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

output functionAppName string = functionApp.name
output functionAppHostname string = functionApp.properties.defaultHostName
output functionAppPrincipalId string = functionApp.identity.principalId
output redirectUrl string = redirectUrl
output baseUrl string = 'https://${functionApp.properties.defaultHostName}'
