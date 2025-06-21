module.exports = async function (context, req) {
    context.log('Test function called');
    
    context.res = {
        status: 200,
        body: {
            message: "Test function is working!",
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.url
        },
        headers: {
            'Content-Type': 'application/json'
        }
    };
}; 