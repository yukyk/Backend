const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'd6d43a64dce88b8870a88bacedb429f6';

module.exports = function (req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) {
    console.log('🔴 Authorization header missing');
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    console.log('🔴 Invalid authorization format:', authHeader);
    return res.status(401).json({ error: 'Invalid authorization format' });
  }

  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Attach user info to req.user
    req.user = { userId: payload.userId, isPremium: payload.isPremium };
    console.log('✅ Token verified for user:', payload.userId, 'isPremium:', payload.isPremium);
    return next();
  } catch (err) {
    console.log('🔴 Token verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
