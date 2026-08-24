const http = require('http');

const data = JSON.stringify({ email: 'sorathiyadhruvin2005@gmail.com' });

const req = http.request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/forgot-password',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
        // Not passing admin token, but we'll see what it returns
    }
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
