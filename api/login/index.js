module.exports = async function (context, req) {
    try {
        // Initialize response object if not already set
        if (!context.res) {
            context.res = {};
        }
        
        // Initialize headers if not already set
        if (!context.res.headers) {
            context.res.headers = {};
        }

        // Enable CORS
        context.res.headers['Access-Control-Allow-Origin'] = '*';
        context.res.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
        context.res.headers['Access-Control-Allow-Headers'] = 'Content-Type';

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

        // Return a simple test response
        context.res.status = 200;
        context.res.body = {
            success: true,
            message: 'Login function is working!',
            receivedEmail: email,
            timestamp: new Date().toISOString()
        };

        context.log('Login function completed successfully');

    } catch (error) {
        context.log.error('Login function error:', error);
        
        // Ensure response object exists for error handling
        if (!context.res) {
            context.res = {};
        }
        
        context.res.status = 500;
        context.res.body = {
            error: 'Internal server error',
            code: 'INTERNAL_ERROR',
            details: error.message
        };
    }
}; 