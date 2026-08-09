// Shared Singleton SD Key Vault (org-wide secrets).
// Deploy into rg-ssd-global.
// CAF: ssd-global-kv-prod-ae

@description('Azure region')
param location string = resourceGroup().location

@description('Key Vault name (max 24)')
@minLength(3)
@maxLength(24)
param keyVaultName string = 'ssd-global-kv-prod-ae'

@description('Object ID of deployer/user to grant Key Vault Administrator (empty skips)')
param deployerObjectId string = ''

var roleKeyVaultAdministrator = '00482a5a-887f-4fb3-b363-3b7fe8e74483'

var commonTags = {
  org: 'singleton-sd'
  project: 'global'
  env: 'prod'
  component: 'key-vault'
  'managed-by': 'bicep'
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: commonTags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: tenant().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    publicNetworkAccess: 'Enabled'
  }
}

resource kvAdminRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(deployerObjectId)) {
  name: guid(keyVault.id, deployerObjectId, roleKeyVaultAdministrator)
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleKeyVaultAdministrator)
    principalId: deployerObjectId
    principalType: 'User'
  }
}

output keyVaultName string = keyVault.name
output keyVaultUri string = keyVault.properties.vaultUri
output keyVaultId string = keyVault.id
