require('dotenv').config();
const jwt = require('jsonwebtoken');
const http = require('http');
const token = jwt.sign({ userId: '6a4975cd93d96112c2e65dae', isPremium: false, premiumTier: 0 }, process.env.JWT_SECRET, { expiresIn: '7d' });
const body = JSON.stringify({ amount: 100, premiumTier: 2 });
const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/payment/create-order',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token,
    'Content-Length': Buffer.byteLength(body)
  }
}, (res) => {
  let data = '';
  res.setEncoding('utf8');
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('status', res.statusCode);
    console.log(data);
  });
});
req.on('error', err => { console.error(err); process.exit(1); });
req.write(body);
req.end();
