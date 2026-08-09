// Company marketing Static Web App + shared Linux plan for Decap OAuth Function.
// Deploy into rg-ssd-marketing. Secrets live in rg-ssd-global / ssd-global-kv-prod-ae.

@description('Azure region for App Service plan / Function')
param location string = resourceGroup().location

@description('Static Web Apps region (Free SKU is region-limited; eastasia works)')
param swaLocation string = 'eastasia'

@description('CAF marketing Static Web App name')
param marketingSwaName string = 'ssd-mkt-prod-ae'

@description('App Service Plan name for Decap OAuth Function')
param planName string = 'ssd-mkt-plan-prod-ae'

@description('App Service Plan SKU')
@allowed(['B1', 'Y1'])
param appServiceSku string = 'B1'

@allowed(['Free', 'Standard'])
param staticWebAppSku string = 'Free'

var marketingTags = {
  org: 'singleton-sd'
  project: 'marketing'
  repo: 'singleton-sd/marketing'
  env: 'prod'
  'managed-by': 'bicep'
}

resource appPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  tags: union(marketingTags, { component: 'appservice-plan' })
  sku: {
    name: appServiceSku
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource marketingStaticWebApp 'Microsoft.Web/staticSites@2022-09-01' = {
  name: marketingSwaName
  location: swaLocation
  tags: union(marketingTags, { component: 'swa' })
  sku: {
    name: staticWebAppSku
    tier: staticWebAppSku
  }
  properties: {
    allowConfigFileUpdates: true
    stagingEnvironmentPolicy: 'Enabled'
  }
}

output marketingStaticWebAppName string = marketingStaticWebApp.name
output marketingStaticWebAppHostname string = marketingStaticWebApp.properties.defaultHostname
output planNameOut string = appPlan.name
output planId string = appPlan.id
