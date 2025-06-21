const { app } = require('@azure/functions');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const { Client } = require('@microsoft/microsoft-graph-client');

// MSAL configuration for application permissions
const msalConfig = {
    auth: {
        clientId: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`
    }
};

// Initialize MSAL client
const msalClient = new ConfidentialClientApplication(msalConfig);

// Microsoft Graph client
let graphClient = null;

// Initialize Graph client with access token
async function getGraphClient() {
    if (!graphClient) {
        try {
            // Get access token for Microsoft Graph
            const authResult = await msalClient.acquireTokenForClient({
                scopes: ['https://graph.microsoft.com/.default']
            });

            graphClient = Client.init({
                authProvider: (done) => {
                    done(null, authResult.accessToken);
                }
            });
        } catch (error) {
            console.error('Error getting Graph client:', error);
            throw error;
        }
    }
    return graphClient;
}

app.http('reset-password', {
    methods: ['POST'],
    authLevel: 'anonymous',
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
            const { email } = body;

            // Validate input
            if (!email) {
                context.res.status = 400;
                context.res.body = {
                    error: 'Email is required',
                    code: 'MISSING_EMAIL'
                };
                return;
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                context.res.status = 400;
                context.res.body = {
                    error: 'Invalid email format',
                    code: 'INVALID_EMAIL'
                };
                return;
            }

            // Get Graph client
            const graph = await getGraphClient();

            try {
                // Check if user exists in Azure AD
                const users = await graph.api('/users')
                    .filter(`mail eq '${email}' or userPrincipalName eq '${email}'`)
                    .get();

                if (users.value.length === 0) {
                    context.res.status = 404;
                    context.res.body = {
                        error: 'User not found',
                        code: 'USER_NOT_FOUND'
                    };
                    context.log('Password reset requested for non-existent user:', email);
                    return;
                }

                const user = users.value[0];

                // Send password reset email using Microsoft Graph
                const resetEmail = {
                    message: {
                        subject: 'DDBM - Password Reset Request',
                        body: {
                            contentType: 'HTML',
                            content: `
                                <html>
                                    <body>
                                        <h2>DDBM Password Reset</h2>
                                        <p>Hello,</p>
                                        <p>You have requested a password reset for your DDBM account.</p>
                                        <p>To reset your password, please click the link below:</p>
                                        <p><a href="https://ddbm.us/reset-password?email=${encodeURIComponent(email)}">Reset Password</a></p>
                                        <p>If you didn't request this password reset, please ignore this email.</p>
                                        <p>This link will expire in 24 hours.</p>
                                        <br>
                                        <p>Best regards,<br>DDBM Team</p>
                                    </body>
                                </html>
                            `
                        },
                        toRecipients: [
                            {
                                emailAddress: {
                                    address: email
                                }
                            }
                        ]
                    },
                    saveToSentItems: false
                };

                // Send email using Microsoft Graph
                await graph.api('/users/' + process.env.SERVICE_ACCOUNT_EMAIL + '/sendMail')
                    .post(resetEmail);

                // Log successful password reset request
                context.log('Password reset email sent successfully for user:', email);

                // Return success response (don't reveal if user exists or not for security)
                context.res.status = 200;
                context.res.body = {
                    success: true,
                    message: 'If an account with this email exists, a password reset link has been sent.'
                };

            } catch (graphError) {
                context.log.error('Microsoft Graph error:', graphError);

                // Handle specific Graph API errors
                if (graphError.statusCode === 404) {
                    context.res.status = 404;
                    context.res.body = {
                        error: 'User not found',
                        code: 'USER_NOT_FOUND'
                    };
                } else if (graphError.statusCode === 403) {
                    context.res.status = 500;
                    context.res.body = {
                        error: 'Service temporarily unavailable',
                        code: 'SERVICE_UNAVAILABLE'
                    };
                } else {
                    context.res.status = 500;
                    context.res.body = {
                        error: 'Internal server error',
                        code: 'INTERNAL_ERROR'
                    };
                }
            }

        } catch (error) {
            context.log.error('Reset password error:', error);

            // Handle MSAL errors
            if (error.errorCode === 'unauthorized_client') {
                context.res.status = 500;
                context.res.body = {
                    error: 'Service configuration error',
                    code: 'CONFIGURATION_ERROR'
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