// Infra deployment for app-developer-static
// - Creates an Azure Storage Account and a blob container named 'submissions'
// - Optionally (disabled by default) creates an Azure Static Web App resource.
//
// Notes:
// - Creating a Static Web App via ARM/Bicep requires a repository token to connect to GitHub
//   (the portal/CLI experience is often easier). If you enable the SWA creation, provide
//   a non-empty `repositoryToken` parameter.
// - This template intentionally does NOT output secrets (connection strings). Use the CLI
//   to fetch the storage connection string after deployment and add it to your Static Web App
//   (or Function App) configuration under AZURE_STORAGE_CONNECTION_STRING.

@description('Prefix for resource names. Use lowercase letters and numbers only.')
param prefix string = '204sol'

@description('Location for all resources. Defaults to centralus unless overridden.')
param location string = 'centralus'

@description('When true, the template will attempt to create a Static Web App resource. Default: false')
param createStaticWebApp bool = false

@description('Name to use for the Static Web App resource (only used if createStaticWebApp = true)')
param staticWebAppName string = '${prefix}-swa'

@description('Repository URL for the Static Web App (required if createStaticWebApp = true). Example: https://github.com/owner/repo')
param repositoryUrl string = ''

@description('Git branch to connect for automatic deployments')
param branch string = 'main'

@description('Build locations (relative to repo root)')
param appLocation string = '/'
param apiLocation string = 'api'
param outputLocation string = ''

// Storage account name must be globally unique and lowercase; keep it reasonably short.
var storageAccountName = toLower('${prefix}stg')

// Create Storage Account
resource storage 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
  }
}

// Create the blob service resource (the default service) and the 'submissions' container
resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2021-09-01' = {
  name: 'default'
  parent: storage
  properties: {}
}

resource submissionsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2021-09-01' = {
  name: 'submissions'
  parent: blobService
  properties: {
    publicAccess: 'None'
  }
}

// Optional: create a Static Web App resource connected to GitHub. This requires
// providing a repository token (GitHub PAT with repo access) in order for Azure
// to connect the repository for CI/CD. Many users prefer creating the Static Web App
// via the Azure Portal or `az staticwebapp create` because the portal will handle
// the GitHub auth flow and create the GitHub Action automatically.
resource staticWebApp 'Microsoft.Web/staticSites@2022-03-01' = if (createStaticWebApp) {
  name: staticWebAppName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryUrl: repositoryUrl
    branch: branch
    // repositoryToken is intentionally NOT a parameter in this template. If you want
    // the Bicep to create the SWA end-to-end, provide a token here by editing the
    // properties block and adding repositoryToken: '<YOUR_TOKEN>' (not recommended in source control).
    buildProperties: {
      appLocation: appLocation
      apiLocation: apiLocation
      appArtifactLocation: outputLocation
    }
  }
}

output storageAccountName string = storage.name
output submissionsContainerName string = submissionsContainer.name
output storageResourceId string = storage.id
output createStaticWebAppRequested bool = createStaticWebApp
output staticWebAppName string = createStaticWebApp ? staticWebApp.name : ''

/*
  Post-deployment steps
  ---------------------
  1) Get the storage connection string (do NOT commit this value):

     az storage account show-connection-string --name ${storageAccountName} --resource-group ${resourceGroup().name} -o tsv

  2) If you created the Static Web App via the portal or CLI, set the app setting
     AZURE_STORAGE_CONNECTION_STRING on the Static Web App so your Azure Function
     can access the storage account. Example (CLI):

     # Fetch the connection string
     CONN_STR=$(az storage account show-connection-string --name ${storageAccountName} --resource-group ${resourceGroup().name} -o tsv)

     # Set the app setting on the Static Web App (portal also works)
     az staticwebapp appsettings set --name <your-swa-name> --resource-group ${resourceGroup().name} --settings AZURE_STORAGE_CONNECTION_STRING="$CONN_STR"

  3) If you did NOT create the Static Web App with this template (recommended), create it
     via the portal or this CLI command and point it to this repo. Example:

     az staticwebapp create \
       --name <your-swa-name> \
       --resource-group ${resourceGroup().name} \
       --location ${location} \
       --source <repo-url> \
       --branch ${branch} \
       --app-location "${appLocation}" \
       --api-location "${apiLocation}"

  4) After the Static Web App is deployed and the app setting is set, push or trigger your
     deployment and verify that form submissions appear in the `submissions` container.

*/
