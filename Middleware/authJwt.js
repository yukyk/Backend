const jwt = require('jsonwebtoken');
const Signup = require('../Models/signupModel');

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = async function (req, res, next) {
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
    const user = await Signup.findById(payload.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const isPremiumFromToken = Boolean(payload.isPremium || payload.premiumTier > 0);
    const isPremium = Boolean(user.isPremium || isPremiumFromToken);
    const premiumTier = user.premiumTier || payload.premiumTier || 0;

    req.user = {
      userId: user._id.toString(),
      isPremium,
      premiumTier
    };

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
