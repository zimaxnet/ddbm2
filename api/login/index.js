module.exports = async function (context, req) {
    try {
        context.log('Login function called');
        
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            context.res = {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            };
            return;
        }

        // Parse request body
        const { email, password } = req.body || {};

        // Validate input
        if (!email || !password) {
            context.res = {
                status: 400,
                body: {
                    error: 'Email and password are required',
                    code: 'MISSING_CREDENTIALS'
                },
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            };
            return;
        }

        // Return success response
        context.res = {
            status: 200,
            body: {
                success: true,
                message: 'Login function is working!',
                receivedEmail: email,
                timestamp: new Date().toISOString()
            },
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };

        context.log('Login function completed successfully');

    } catch (error) {
        context.log.error('Login function error:', error);
        
        context.res = {
            status: 500,
            body: {
                error: 'Internal server error',
                code: 'INTERNAL_ERROR',
                details: error.message
            },
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
    }
}; 