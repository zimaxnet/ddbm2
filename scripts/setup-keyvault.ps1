# DDBM Key Vault Setup Script (PowerShell)
# This script sets up Azure Key Vault for secure secret management

param(
    [string]$ResourceGroup = "ddbm-rg",
    [string]$KeyVaultName = "ddbm-keyvault",
    [string]$Location = "East US",
    [string]$FunctionAppName = "ddbm-api-functions"
)

# Configuration
$ErrorActionPreference = "Stop"

Write-Host "🔐 DDBM Key Vault Setup Script" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green

# Check if Azure CLI is installed
try {
    $azVersion = az version --output json | ConvertFrom-Json
    Write-Host "✅ Azure CLI is ready (Version: $($azVersion.'azure-cli'))" -ForegroundColor Green
} catch {
    Write-Host "❌ Azure CLI is not installed. Please install it first." -ForegroundColor Red
    exit 1
}

# Check if user is logged in
try {
    $account = az account show --output json | ConvertFrom-Json
    Write-Host "✅ Logged in as: $($account.user.name)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Please log in to Azure first:" -ForegroundColor Yellow
    az login
}

# Create Key Vault
Write-Host "`n🔧 Creating Azure Key Vault..." -ForegroundColor Yellow
az keyvault create `
    --name $KeyVaultName `
    --resource-group $ResourceGroup `
    --location $Location `
    --sku standard `
    --enable-rbac-authorization true `
    --enable-soft-delete true `
    --soft-delete-retention-in-days 7 `
    --enable-purge-protection true

Write-Host "✅ Key Vault created successfully" -ForegroundColor Green

# Enable managed identity for Function App
Write-Host "`n🔧 Enabling managed identity for Function App..." -ForegroundColor Yellow
az functionapp identity assign `
    --name $FunctionAppName `
    --resource-group $ResourceGroup

# Get the Function App's managed identity
Write-Host "`n🔧 Getting Function App managed identity..." -ForegroundColor Yellow
$functionAppIdentity = az functionapp identity show `
    --name $FunctionAppName `
    --resource-group $ResourceGroup `
    --output json | ConvertFrom-Json

$functionAppPrincipalId = $functionAppIdentity.principalId
Write-Host "✅ Function App Principal ID: $functionAppPrincipalId" -ForegroundColor Green

# Grant Key Vault access to Function App
Write-Host "`n🔧 Granting Key Vault access to Function App..." -ForegroundColor Yellow
az keyvault set-policy `
    --name $KeyVaultName `
    --object-id $functionAppPrincipalId `
    --secret-permissions get list

Write-Host "✅ Key Vault access granted" -ForegroundColor Green

# Generate and store secrets
Write-Host "`n🔧 Generating and storing secrets..." -ForegroundColor Yellow

# Generate JWT secret
$jwtSecret = -join ((33..126) | Get-Random -Count 32 | ForEach-Object {[char]$_})
$jwtSecretBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($jwtSecret))
Write-Host "✅ Generated JWT secret" -ForegroundColor Green

# Store JWT secret
az keyvault secret set `
    --vault-name $KeyVaultName `
    --name "jwt-secret-prod" `
    --value $jwtSecretBase64 `
    --description "JWT signing secret for DDBM production"

Write-Host "✅ JWT secret stored in Key Vault" -ForegroundColor Green

# Prompt for Azure Client Secret
Write-Host "`n🔧 Please enter your Azure AD Client Secret:" -ForegroundColor Yellow
$azureClientSecret = Read-Host -AsSecureString
$azureClientSecretPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($azureClientSecret))

# Store Azure Client Secret
az keyvault secret set `
    --vault-name $KeyVaultName `
    --name "azure-client-secret" `
    --value $azureClientSecretPlain `
    --description "Azure AD Client Secret for DDBM"

Write-Host "✅ Azure Client Secret stored in Key Vault" -ForegroundColor Green

# Prompt for other configuration values
Write-Host "`n🔧 Please enter your Azure AD Client ID:" -ForegroundColor Yellow
$azureClientId = Read-Host

Write-Host "`n🔧 Please enter your Azure AD Tenant ID:" -ForegroundColor Yellow
$azureTenantId = Read-Host

Write-Host "`n🔧 Please enter your service account email:" -ForegroundColor Yellow
$serviceAccountEmail = Read-Host

# Configure Function App to use Key Vault references
Write-Host "`n🔧 Configuring Function App with Key Vault references..." -ForegroundColor Yellow
az functionapp config appsettings set `
    --name $FunctionAppName `
    --resource-group $ResourceGroup `
    --settings `
        AZURE_CLIENT_ID="$azureClientId" `
        AZURE_TENANT_ID="$azureTenantId" `
        SERVICE_ACCOUNT_EMAIL="$serviceAccountEmail" `
        JWT_SECRET="@Microsoft.KeyVault(SecretUri=https://$KeyVaultName.vault.azure.net/secrets/jwt-secret-prod/)" `
        AZURE_CLIENT_SECRET="@Microsoft.KeyVault(SecretUri=https://$KeyVaultName.vault.azure.net/secrets/azure-client-secret/)"

Write-Host "✅ Function App configured with Key Vault references" -ForegroundColor Green

# Display summary
Write-Host "`n🎉 Key Vault setup completed successfully!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host "Key Vault Name: $KeyVaultName" -ForegroundColor Yellow
Write-Host "Resource Group: $ResourceGroup" -ForegroundColor Yellow
Write-Host "Function App: $FunctionAppName" -ForegroundColor Yellow
Write-Host "Principal ID: $functionAppPrincipalId" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Secrets stored:" -ForegroundColor Green
Write-Host "  - jwt-secret-prod" -ForegroundColor White
Write-Host "  - azure-client-secret" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Next steps:" -ForegroundColor Yellow
Write-Host "1. Verify secrets are accessible in Azure Portal" -ForegroundColor White
Write-Host "2. Test Function App authentication" -ForegroundColor White
Write-Host "3. Monitor Key Vault access logs" -ForegroundColor White
Write-Host "4. Set up secret rotation policies" -ForegroundColor White
Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green 