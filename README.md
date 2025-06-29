# DDBM - Intelligent Data Platform

A modern data platform with Azure AD External ID (CIAM) authentication, built on Azure Static Web Apps and Azure Functions.

## 🏗️ Architecture

- **Frontend**: Static HTML/CSS/JavaScript hosted on Azure Static Web Apps
- **Authentication**: Azure AD External ID (CIAM) with email/password and Microsoft SSO
- **API**: Azure Functions (Node.js) for custom authentication logic
- **Secrets Management**: Azure Key Vault (enterprise setups)
- **Domain**: ddbm.us with custom SSL certificate

## 📁 Project Structure

```
ddbm/
├── index.html                 # Main login page
├── dashboard/
│   └── index.html            # Dashboard after login
├── api/                      # Azure Functions
│   ├── auth/
│   │   ├── login.js         # Email/password authentication
│   │   └── reset-password.js # Password reset functionality
│   ├── package.json         # Function dependencies
│   └── host.json           # Function app configuration
├── scripts/                  # Deployment scripts
│   ├── setup-keyvault.sh    # Key Vault setup (Linux/macOS)
│   └── setup-keyvault.ps1   # Key Vault setup (Windows)
├── staticwebapp.config.json # Static Web App routing & auth
├── .github/workflows/       # GitHub Actions for deployment
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites

- Azure subscription
- GitHub account
- Node.js 18+ (for local development)
- Azure CLI installed

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd ddbm
npm install
```

### 2. Azure AD External ID Setup

1. **Create External ID Tenant**
   - Go to [Azure Portal](https://portal.azure.com)
   - Create new Azure AD External ID tenant: `zimaxai.onmicrosoft.com`

2. **Create App Registration**
   - Name: "DDBM Application"
   - Redirect URI: `https://ddbm.us/.auth/login/aad/callback`
   - Enable ID tokens in Authentication settings

3. **Configure API Permissions**
   - Microsoft Graph: `User.Read` (Delegated)
   - Microsoft Graph: `Mail.Send` (Application)
   - Microsoft Graph: `User.Read.All` (Application)
   - Grant admin consent for all permissions

4. **Create Client Secret**
   - Generate a new client secret
   - Copy the secret value for environment variables

### 3. Azure Resources Deployment

```bash
# Login to Azure
az login

# Create resource group
az group create --name ddbm-rg --location "East US"

# Create Static Web App
az staticwebapp create \
  --name ddbm-static-app \
  --resource-group ddbm-rg \
  --source https://github.com/your-username/ddbm \
  --location "East US" \
  --branch main \
  --login-with-github

# Create Storage Account for Functions
az storage account create \
  --name ddbmstorageaccount \
  --location "East US" \
  --resource-group ddbm-rg \
  --sku Standard_LRS

# Create Function App
az functionapp create \
  --resource-group ddbm-rg \
  --consumption-plan-location "East US" \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --name ddbm-api-functions \
  --storage-account ddbmstorageaccount

# Create Key Vault (optional, for enterprise setups)
az keyvault create \
  --name ddbm-keyvault \
  --resource-group ddbm-rg \
  --location "East US" \
  --sku standard \
  --enable-rbac-authorization true

# Grant Function App access to Key Vault
az functionapp identity assign \
  --name ddbm-api-functions \
  --resource-group ddbm-rg

# Get the Function App's managed identity
FUNCTION_APP_PRINCIPAL_ID=$(az functionapp identity show \
  --name ddbm-api-functions \
  --resource-group ddbm-rg \
  --query principalId --output tsv)

# Grant Key Vault access to Function App
az keyvault set-policy \
  --name ddbm-keyvault \
  --object-id $FUNCTION_APP_PRINCIPAL_ID \
  --secret-permissions get list
```

### 4. Configure Environment Variables

#### Option A: Direct Configuration (Development)
Set these in your Static Web App configuration:

```bash
az staticwebapp appsettings set \
  --name ddbm-static-app \
  --setting-names \
    AZURE_CLIENT_ID="your-client-id" \
    AZURE_CLIENT_SECRET="your-client-secret" \
    AZURE_TENANT_ID="zimaxai.onmicrosoft.com" \
    JWT_SECRET="your-strong-jwt-secret" \
    SERVICE_ACCOUNT_EMAIL="noreply@ddbm.us"
```

#### Option B: Key Vault Integration (Enterprise)
Use the automated setup scripts:

**Linux/macOS:**
```bash
# Make script executable
chmod +x scripts/setup-keyvault.sh

# Run the setup script
./scripts/setup-keyvault.sh
```

**Windows PowerShell:**
```powershell
# Run the setup script
.\scripts\setup-keyvault.ps1
```

**Manual Setup:**
```bash
# Generate a strong JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Store secrets in Key Vault
az keyvault secret set \
  --vault-name "ddbm-keyvault" \
  --name "jwt-secret-prod" \
  --value "$JWT_SECRET"

az keyvault secret set \
  --vault-name "ddbm-keyvault" \
  --name "azure-client-secret" \
  --value "your-client-secret"

# Configure Function App to use Key Vault references
az functionapp config appsettings set \
  --name ddbm-api-functions \
  --resource-group ddbm-rg \
  --settings \
    AZURE_CLIENT_ID="your-client-id" \
    AZURE_TENANT_ID="zimaxai.onmicrosoft.com" \
    SERVICE_ACCOUNT_EMAIL="noreply@ddbm.us" \
    JWT_SECRET="@Microsoft.KeyVault(SecretUri=https://ddbm-keyvault.vault.azure.net/secrets/jwt-secret-prod/)" \
    AZURE_CLIENT_SECRET="@Microsoft.KeyVault(SecretUri=https://ddbm-keyvault.vault.azure.net/secrets/azure-client-secret/)"
```

### 5. Custom Domain Setup

1. Go to your Static Web App in Azure Portal
2. Navigate to "Custom domains"
3. Add domain: `ddbm.us`
4. Configure DNS records:
   ```
   CNAME: www -> your-static-app.azurestaticapps.net
   CNAME: @ -> your-static-app.azurestaticapps.net
   ```

## 🔐 Authentication Flow

### Email/Password Login
1. User enters email/password on login page
2. Frontend calls `/api/auth/login`
3. Azure Function authenticates with Azure AD External ID using ROPC flow
4. On success, JWT token is created and set as HTTP-only cookie
5. User is redirected to dashboard

### Microsoft SSO Login
1. User clicks "Continue with Microsoft"
2. Redirected to `/.auth/login/aad`
3. Azure Static Web Apps handles OAuth flow with External ID
4. User is redirected to dashboard

### Password Reset
1. User enters email and clicks "Forgot password"
2. Frontend calls `/api/auth/reset-password`
3. Azure Function looks up user in Azure AD
4. Password reset email is sent via Microsoft Graph API
5. User follows link to reset password in Azure AD

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- Azure Functions Core Tools v4
- Azure Static Web Apps CLI

### Setup
```bash
# Install Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Install Azure Functions Core Tools
npm install -g azure-functions-core-tools@4 --unsafe-perm true

# Start local development
swa start . --api-location api
```

The app will be available at `http://localhost:4280`

### Environment Variables for Local Development
Create a `local.settings.json` file in the `api` folder:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_CLIENT_ID": "your-client-id",
    "AZURE_CLIENT_SECRET": "your-client-secret",
    "AZURE_TENANT_ID": "zimaxai.onmicrosoft.com",
    "JWT_SECRET": "your-jwt-secret",
    "SERVICE_ACCOUNT_EMAIL": "noreply@ddbm.us"
  }
}
```

## 🔧 Configuration Files

### staticwebapp.config.json
Configures Azure Static Web Apps routing, authentication, and security headers.

### API Functions
- **login.js**: Handles email/password authentication using MSAL ROPC flow
- **reset-password.js**: Manages password reset emails via Microsoft Graph API

## 🚦 Deployment

The application is automatically deployed to Azure Static Web Apps via GitHub Actions when changes are pushed to the main branch.

### Manual Deployment
```bash
# Deploy to Azure Static Web Apps
az staticwebapp deploy \
  --source . \
  --name ddbm-static-app \
  --resource-group ddbm-rg
```

## 🔒 Security Features

- HTTP-only cookies for session management
- CORS protection
- Content Security Policy headers
- XSS protection
- CSRF protection via SameSite cookies
- Secure authentication with Azure AD External ID
- Azure Key Vault integration for secret management (enterprise)
- Managed identity for secure access to Key Vault

## 🔐 Secret Management

### Development Environment
- Use environment variables or local.settings.json
- Store secrets in Azure App Service Configuration

### Production Environment (Enterprise)
- Use Azure Key Vault for all sensitive secrets
- Leverage managed identity for secure access
- Implement secret rotation policies
- Monitor secret access with Azure Key Vault logs

### Key Vault Best Practices
1. **Access Control**: Use RBAC instead of access policies
2. **Secret Rotation**: Implement automated secret rotation
3. **Monitoring**: Enable diagnostic logging
4. **Backup**: Configure soft delete and backup
5. **Network Security**: Use private endpoints for Key Vault

### Automated Setup Scripts
The project includes automated scripts for Key Vault setup:

- **`scripts/setup-keyvault.sh`**: Bash script for Linux/macOS
- **`scripts/setup-keyvault.ps1`**: PowerShell script for Windows

These scripts automate:
- Key Vault creation with security best practices
- Managed identity setup for Function App
- Secret generation and storage
- Function App configuration with Key Vault references

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support and questions, please contact the DDBM team or create an issue in this repository.