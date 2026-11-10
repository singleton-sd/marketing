// Company marketing Static Web App (legacy host).
// Site hosting moved to GitHub Pages; do not deploy this after cutover.
// Delete ssd-mkt-prod-ae only after docs/github-pages-cutover.md verification.
// Secrets live in rg-ssd-global / ssd-global-kv-prod-ae.
// Decap OAuth is the shared cms-oauth-kit service (auth.singletonsd.com) — no plan here.

@description('Static Web Apps region (Free SKU is region-limited; eastasia works)')
param swaLocation string = 'eastasia'

@description('CAF marketing Static Web App name')
param marketingSwaName string = 'ssd-mkt-prod-ae'

@allowed(['Free', 'Standard'])
param staticWebAppSku string = 'Free'

var marketingTags = {
  org: 'singleton-sd'
  project: 'marketing'
  repo: 'singleton-sd/marketing'
  env: 'prod'
  'managed-by': 'bicep'
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
