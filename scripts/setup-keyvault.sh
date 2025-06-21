#!/bin/bash

# DDBM Key Vault Setup Script
# This script sets up Azure Key Vault for secure secret management

set -e

# Configuration
RESOURCE_GROUP="ddbm-rg"
KEY_VAULT_NAME="ddbm-keyvault"
LOCATION="East US"
FUNCTION_APP_NAME="ddbm-api-functions"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 DDBM Key Vault Setup Script${NC}"
echo "=================================="

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if user is logged in
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}⚠️  Please log in to Azure first:${NC}"
    az login
fi

echo -e "${GREEN}✅ Azure CLI is ready${NC}"

# Create Key Vault
echo -e "\n${YELLOW}🔧 Creating Azure Key Vault...${NC}"
az keyvault create \
    --name "$KEY_VAULT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku standard \
    --enable-rbac-authorization true \
    --enable-soft-delete true \
    --soft-delete-retention-in-days 7 \
    --enable-purge-protection true

echo -e "${GREEN}✅ Key Vault created successfully${NC}"

# Enable managed identity for Function App
echo -e "\n${YELLOW}🔧 Enabling managed identity for Function App...${NC}"
az functionapp identity assign \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP"

# Get the Function App's managed identity
echo -e "\n${YELLOW}🔧 Getting Function App managed identity...${NC}"
FUNCTION_APP_PRINCIPAL_ID=$(az functionapp identity show \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query principalId --output tsv)

echo -e "${GREEN}✅ Function App Principal ID: $FUNCTION_APP_PRINCIPAL_ID${NC}"

# Grant Key Vault access to Function App
echo -e "\n${YELLOW}🔧 Granting Key Vault access to Function App...${NC}"
az keyvault set-policy \
    --name "$KEY_VAULT_NAME" \
    --object-id "$FUNCTION_APP_PRINCIPAL_ID" \
    --secret-permissions get list

echo -e "${GREEN}✅ Key Vault access granted${NC}"

# Generate and store secrets
echo -e "\n${YELLOW}🔧 Generating and storing secrets...${NC}"

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)
echo -e "${GREEN}✅ Generated JWT secret${NC}"

# Store JWT secret
az keyvault secret set \
    --vault-name "$KEY_VAULT_NAME" \
    --name "jwt-secret-prod" \
    --value "$JWT_SECRET" \
    --description "JWT signing secret for DDBM production"

echo -e "${GREEN}✅ JWT secret stored in Key Vault${NC}"

# Prompt for Azure Client Secret
echo -e "\n${YELLOW}🔧 Please enter your Azure AD Client Secret:${NC}"
read -s AZURE_CLIENT_SECRET

# Store Azure Client Secret
az keyvault secret set \
    --vault-name "$KEY_VAULT_NAME" \
    --name "azure-client-secret" \
    --value "$AZURE_CLIENT_SECRET" \
    --description "Azure AD Client Secret for DDBM"

echo -e "${GREEN}✅ Azure Client Secret stored in Key Vault${NC}"

# Prompt for other configuration values
echo -e "\n${YELLOW}🔧 Please enter your Azure AD Client ID:${NC}"
read AZURE_CLIENT_ID

echo -e "\n${YELLOW}🔧 Please enter your Azure AD Tenant ID:${NC}"
read AZURE_TENANT_ID

echo -e "\n${YELLOW}🔧 Please enter your service account email:${NC}"
read SERVICE_ACCOUNT_EMAIL

# Configure Function App to use Key Vault references
echo -e "\n${YELLOW}🔧 Configuring Function App with Key Vault references...${NC}"
az functionapp config appsettings set \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --settings \
        AZURE_CLIENT_ID="$AZURE_CLIENT_ID" \
        AZURE_TENANT_ID="$AZURE_TENANT_ID" \
        SERVICE_ACCOUNT_EMAIL="$SERVICE_ACCOUNT_EMAIL" \
        JWT_SECRET="@Microsoft.KeyVault(SecretUri=https://$KEY_VAULT_NAME.vault.azure.net/secrets/jwt-secret-prod/)" \
        AZURE_CLIENT_SECRET="@Microsoft.KeyVault(SecretUri=https://$KEY_VAULT_NAME.vault.azure.net/secrets/azure-client-secret/)"

echo -e "${GREEN}✅ Function App configured with Key Vault references${NC}"

# Display summary
echo -e "\n${GREEN}🎉 Key Vault setup completed successfully!${NC}"
echo "=================================="
echo -e "${YELLOW}Key Vault Name:${NC} $KEY_VAULT_NAME"
echo -e "${YELLOW}Resource Group:${NC} $RESOURCE_GROUP"
echo -e "${YELLOW}Function App:${NC} $FUNCTION_APP_NAME"
echo -e "${YELLOW}Principal ID:${NC} $FUNCTION_APP_PRINCIPAL_ID"
echo ""
echo -e "${GREEN}✅ Secrets stored:${NC}"
echo "  - jwt-secret-prod"
echo "  - azure-client-secret"
echo ""
echo -e "${YELLOW}🔐 Next steps:${NC}"
echo "1. Verify secrets are accessible in Azure Portal"
echo "2. Test Function App authentication"
echo "3. Monitor Key Vault access logs"
echo "4. Set up secret rotation policies"
echo ""
echo -e "${GREEN}✅ Setup complete!${NC}" 