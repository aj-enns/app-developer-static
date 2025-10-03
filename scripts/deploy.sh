#!/usr/bin/env bash
set -euo pipefail

cwd="$(cd "$(dirname "$0")/.." && pwd)"
infra_file="$cwd/infra/main.bicep"

usage() {
  cat <<EOF
Usage: $(basename $0) [options]

Deploy infra and (optionally) create a Static Web App and wire the storage connection string.

Options:
  -g <resource-group>   Resource group name (required)
  -l <location>         Location (default: centralus)
  -p <prefix>           Resource name prefix (default: 204sol)
  --with-swa-cli        Create Static Web App using 'az staticwebapp create' (optional)
  -n <swa-name>         Static Web App name (required if --with-swa-cli)
  -r <repo-url>         Repository URL (required if --with-swa-cli)
  -b <branch>           Git branch (default: main)
  --help                Show this help

Examples:
  # Deploy infra only
  ./scripts/deploy.sh -g myRg -p myprefix

  # Deploy infra and create SWA via CLI (portal/CLI will handle GitHub auth)
  ./scripts/deploy.sh -g myRg -p myprefix --with-swa-cli -n my-swa-name -r https://github.com/owner/repo -b main

EOF
}

if ! command -v az >/dev/null 2>&1; then
  echo "az CLI is required. Install from https://learn.microsoft.com/cli/azure/install-azure-cli"
  exit 1
fi

RG=""
LOCATION="centralus"
PREFIX="204sol"
WITH_SWA_CLI=false
SWA_NAME=""
REPO_URL=""
BRANCH="main"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -g) RG="$2"; shift 2;;
    -l) LOCATION="$2"; shift 2;;
    -p) PREFIX="$2"; shift 2;;
    --with-swa-cli) WITH_SWA_CLI=true; shift;;
    -n) SWA_NAME="$2"; shift 2;;
    -r) REPO_URL="$2"; shift 2;;
    -b) BRANCH="$2"; shift 2;;
    --help) usage; exit 0;;
    *) echo "Unknown option: $1"; usage; exit 1;;
  esac
done

if [[ -z "$RG" ]]; then
  echo "Error: resource group is required (-g)"; usage; exit 1
fi

if [[ ! -f "$infra_file" ]]; then
  echo "Infra file not found at $infra_file"; exit 1
fi

echo "Using resource group: $RG"
if [[ -n "$LOCATION" ]]; then
  echo "Location: $LOCATION"
fi
echo "Prefix: $PREFIX"

echo "Ensuring resource group exists..."
if [[ -n "$LOCATION" ]]; then
  az group create -n "$RG" -l "$LOCATION" >/dev/null
else
  az group create -n "$RG" >/dev/null
fi

DEPLOY_NAME="infra-deploy-$(date +%s)"
echo "Deploying Bicep template as deployment: $DEPLOY_NAME"
az deployment group create \
  --resource-group "$RG" \
  --name "$DEPLOY_NAME" \
  --template-file "$infra_file" \
  --parameters prefix="$PREFIX" \
  || { echo "Bicep deployment failed"; exit 1; }

echo "Fetching storage account name from deployment outputs..."
STORAGE_NAME=$(az deployment group show -g "$RG" -n "$DEPLOY_NAME" --query properties.outputs.storageAccountName.value -o tsv)
if [[ -z "$STORAGE_NAME" || "$STORAGE_NAME" == 'null' ]]; then
  echo "Failed to read storageAccountName from deployment outputs"; exit 1
fi
echo "Storage account: $STORAGE_NAME"

echo "Retrieving storage connection string..."
CONN_STR=$(az storage account show-connection-string --name "$STORAGE_NAME" --resource-group "$RG" --query connectionString -o tsv)
if [[ -z "$CONN_STR" ]]; then
  echo "Failed to read storage connection string"; exit 1
fi

if [[ "$WITH_SWA_CLI" == true ]]; then
  if [[ -z "$SWA_NAME" || -z "$REPO_URL" ]]; then
    echo "When using --with-swa-cli you must provide -n <swa-name> and -r <repo-url>"; exit 1
  fi

  echo "Creating Static Web App via Azure CLI (this will prompt to authorize GitHub if needed)..."
  az staticwebapp create \
    --name "$SWA_NAME" \
    --resource-group "$RG" \
    --location "${LOCATION:-$(az group show -n $RG --query location -o tsv)}" \
    --source "$REPO_URL" \
    --branch "$BRANCH" \
    --app-location "/" \
    --api-location "api" \
    --output none || { echo "Failed to create Static Web App via CLI"; exit 1; }

  echo "Setting AZURE_STORAGE_CONNECTION_STRING for Static Web App..."
  az staticwebapp appsettings set --name "$SWA_NAME" --resource-group "$RG" --settings AZURE_STORAGE_CONNECTION_STRING="$CONN_STR"

  echo "Static Web App created and configured: $SWA_NAME"
  echo "Note: the deployment may take a few minutes and GitHub Actions will be created in your repo." 
else
  echo "Static Web App creation skipped. To create it later, run 'az staticwebapp create' or use the Azure Portal."
  echo "Store the connection string in your Static Web App configuration as AZURE_STORAGE_CONNECTION_STRING:" 
  echo
  echo "$CONN_STR"
fi

echo "Done. Verify submissions container exists (submissions) in storage account: $STORAGE_NAME"
echo "You can list blobs with:"
echo "  az storage blob list --account-name $STORAGE_NAME --connection-string \"$CONN_STR\" --container-name submissions -o table"

echo "If you used --with-swa-cli, open the Static Web App in the portal or watch the GitHub Actions for deployment status."
