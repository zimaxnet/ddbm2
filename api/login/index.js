const { ConfidentialClientApplication } = require('@azure/msal-node');
const jwt = require('jsonwebtoken');

// MSAL configuration
const msalConfig = {
    auth: {
        clientId: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`
    }
};

// Initialize MSAL client
const msalClient = new ConfidentialClientApplication(msalConfig);

// JWT secret for creating session tokens
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = async function (context, req) {
    try {
        // Enable CORS
        context.res = {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        };

        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            context.res.status = 200;
            return;
        }

        // Log the request for debugging
        context.log('Login function called with method:', req.method);
        context.log('Request body:', req.body);

        // Parse request body
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            context.res.status = 400;
            context.res.body = {
                error: 'Email and password are required',
                code: 'MISSING_CREDENTIALS'
            };
            return;
        }

        // For now, just return a test response to verify the function is working
        context.res.status = 200;
        context.res.body = {
            success: true,
            message: 'Function is working - authentication not yet implemented',
            receivedEmail: email,
            environmentVariables: {
                hasClientId: !!process.env.AZURE_CLIENT_ID,
                hasClientSecret: !!process.env.AZURE_CLIENT_SECRET,
                hasTenantId: !!process.env.AZURE_TENANT_ID,
                hasJwtSecret: !!process.env.JWT_SECRET
            }
        };

        context.log('Login function completed successfully');

    } catch (error) {
        context.log.error('Login function error:', error);
        
        context.res.status = 500;
        context.res.body = {
            error: 'Internal server error',
            code: 'INTERNAL_ERROR',
            details: error.message
        };
    }
}; 