# DDBM - Intelligent Data Platform

A modern data platform with Azure AD External ID (CIAM) authentication, built on Azure Static Web Apps and Azure Functions.

## 🏗️ Architecture

- **Frontend**: Static HTML/CSS/JavaScript hosted on Azure Static Web Apps
- **Authentication**: Azure AD External ID (CIAM) with email/password
- **API**: Azure Functions (Node.js) for custom authentication logic
- **Domain**: ddbm.us with custom SSL certificate

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
```

### 4. Configure Environment Variables

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

### 5. Custom Domain Setup

1. Go to your Static Web App in Azure Portal
2. Navigate to "Custom domains"
3. Add domain: `ddbm.us`
4. Configure DNS records:
   ```
   CNAME: www -> your-static-app.azurestaticapps.net
   CNAME: @ -> your-static-app.azurestaticapps.net
   ```

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
├── staticwebapp.config.json # Static Web App routing & auth
├── .github/workflows/       # GitHub Actions for deployment
└── README.md               # This file
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

### Automatic Deployment
1. Push code to main branch
2. GitHub Actions automatically deploys to Azure Static Web Apps
3. Functions are deployed as part of the Static Web App

### Manual Deployment
```bash
# Deploy Static Web App
az staticwebapp deploy --name ddbm-static-app --source .

# Deploy Functions separately if needed
cd api
func azure functionapp publish ddbm-api-functions
```

## 🔒 Security Features

- **HTTPS Only**: All traffic encrypted with TLS
- **HTTP-Only Cookies**: JWT tokens stored securely
- **CSP Headers**: Content Security Policy prevents XSS
- **CORS Protection**: Restricted cross-origin requests
- **Input Validation**: Email format and required field validation
- **Rate Limiting**: Azure Functions built-in throttling

## 📊 Monitoring

### Azure Application Insights
Monitor your application performance and errors:

1. Enable Application Insights in your Function App
2. View logs and metrics in Azure Portal
3. Set up alerts for errors and performance issues

### Log Queries
```kusto
// Function app errors
traces
| where severityLevel >= 3
| order by timestamp desc

// Authentication attempts
requests
| where url contains "auth"
| summarize count() by resultCode, bin(timestamp, 1h)
```

## 🧪 Testing

### Local Testing
```bash
# Test authentication endpoint
curl -X POST http://localhost:7071/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test password reset
curl -X POST http://localhost:7071/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Production Testing
```bash
# Test production endpoints
curl -X POST https://ddbm.us/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check `staticwebapp.config.json` routing configuration
   - Verify API endpoints are correctly configured

2. **Authentication Failures**
   - Verify Azure AD app registration settings
   - Check client ID and secret in environment variables
   - Ensure proper API permissions are granted

3. **Email Not Sending**
   - Verify Microsoft Graph API permissions
   - Check service account email configuration
   - Review Function App logs for errors

4. **Custom Domain Issues**
   - Verify DNS records are correctly configured
   - Wait for DNS propagation (up to 48 hours)
   - Check SSL certificate status in Azure Portal

### Debug Mode
Enable debug logging by setting `DEBUG=true` in your Function App settings.

## 📚 Additional Resources

- [Azure Static Web Apps Documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [Azure AD External ID Documentation](https://docs.microsoft.com/en-us/azure/active-directory-b2c/)
- [Azure Functions Documentation](https://docs.microsoft.com/en-us/azure/azure-functions/)
- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in this repository
- Contact: support@ddbm.us
- Documentation: https://docs.ddbm.us