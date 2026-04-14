const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = function (req, res, next) {
  
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid authorization format' });
  }

  const token = parts[1];
  
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Attach user info to req.user
    req.user = { 
      userId: payload.userId, 
      isPremium: payload.isPremium || false,
      premiumTier: payload.premiumTier || 0
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
