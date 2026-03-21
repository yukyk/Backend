const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'd6d43a64dce88b8870a88bacedb429f6';

module.exports = function (req, res, next) {
  console.log(`🔍 authJwt called for ${req.method} ${req.path}`);
  console.log('📋 All headers:', Object.keys(req.headers));
  
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  console.log('🔑 Raw auth header:', authHeader);
  
  if (!authHeader) {
    console.log('🔴 NO Authorization header missing');
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  const parts = authHeader.split(' ');
  console.log('📦 Header parts:', parts);
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    console.log('🔴 Invalid authorization format:', authHeader);
    return res.status(401).json({ error: 'Invalid authorization format' });
  }

  const token = parts[1];
  console.log('🔑 Token length:', token ? token.length : 'NO TOKEN', 'Preview:', token?.substring(0,20) + '...');
  
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token DECODED payload:', payload);
    // Attach user info to req.user
    req.user = { userId: payload.userId, isPremium: payload.isPremium || false };
    console.log(`✅ Token verified → SETTING req.user =`, req.user);
    console.log(`📍 Middleware done for ${req.method} ${req.path} → userId: ${req.user.userId}`);
    return next();
  } catch (err) {
    console.log('🔴 Token verification FAILED:', err.name, err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
