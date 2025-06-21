const { app } = require('@azure/functions');
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

app.http('login', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'login',
    handler: async (request, context) => {
        try {
            // Enable CORS
            context.res.setHeader('Access-Control-Allow-Origin', '*');
            context.res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            context.res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            // Handle preflight requests
            if (request.method === 'OPTIONS') {
                context.res.status = 200;
                return;
            }

            // Parse request body
            const body = await request.json();
            const { email, password } = body;

            // Validate input
            if (!email || !password) {
                context.res.status = 400;
                context.res.body = {
                    error: 'Email and password are required',
                    code: 'MISSING_CREDENTIALS'
                };
                return;
            }

            // Authenticate with Azure AD External ID using ROPC flow
            const authResult = await msalClient.acquireTokenByUsernamePassword({
                scopes: ['User.Read'],
                username: email,
                password: password
            });

            if (authResult && authResult.account) {
                // Create JWT token for session management
                const tokenPayload = {
                    userId: authResult.account.username,
                    name: authResult.account.name,
                    email: authResult.account.username,
                    sub: authResult.account.homeAccountId,
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
                };

                const sessionToken = jwt.sign(tokenPayload, JWT_SECRET, { algorithm: 'HS256' });

                // Set HTTP-only cookie with session token
                context.res.setHeader('Set-Cookie', `ddbm_session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`);

                // Return success response
                context.res.status = 200;
                context.res.body = {
                    success: true,
                    user: {
                        id: authResult.account.homeAccountId,
                        email: authResult.account.username,
                        name: authResult.account.name
                    },
                    message: 'Authentication successful'
                };

                context.log('Login successful for user:', email);
            } else {
                // Authentication failed
                context.res.status = 401;
                context.res.body = {
                    error: 'Invalid email or password',
                    code: 'INVALID_CREDENTIALS'
                };
                context.log('Login failed for user:', email);
            }

        } catch (error) {
            context.log.error('Login error:', error);

            // Handle specific MSAL errors
            if (error.errorCode === 'invalid_grant') {
                context.res.status = 401;
                context.res.body = {
                    error: 'Invalid email or password',
                    code: 'INVALID_CREDENTIALS'
                };
            } else if (error.errorCode === 'user_not_found') {
                context.res.status = 404;
                context.res.body = {
                    error: 'User not found',
                    code: 'USER_NOT_FOUND'
                };
            } else {
                context.res.status = 500;
                context.res.body = {
                    error: 'Internal server error',
                    code: 'INTERNAL_ERROR'
                };
            }
        }
    }
}); 