module.exports = async function (context, req) {
    try {
        context.log('Test function called');
        
        context.res = {
            status: 200,
            body: {
                message: "Test function is working!",
                timestamp: new Date().toISOString()
            },
            headers: {
                'Content-Type': 'application/json'
            }
        };
    } catch (error) {
        context.log.error('Test function error:', error);
        context.res = {
            status: 500,
            body: {
                error: 'Test function failed',
                details: error.message
            }
        };
    }
}; 