const { app } = require('@azure/functions');

app.http('test-v4', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('Test v4 function called');
        
        return {
            status: 200,
            body: {
                message: "Test v4 function is working!",
                timestamp: new Date().toISOString(),
                method: request.method,
                url: request.url
            },
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
}); 