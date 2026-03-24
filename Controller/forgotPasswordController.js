const User = require("../Models/signupModel");
const jwt = require("jsonwebtoken");
const { sendResetEmail } = require("../services/emailService");
const ForgotPassword = require("../Models/forgotpassword");
const sequelize = require("../Utils/util");

const JWT_SECRET = process.env.JWT_SECRET || 'd6d43a64dce88b8870a88bacedb429f6';
const RESET_REQUEST_COOLDOWN = 5 * 60 * 1000; // 5 minutes cooldown between requests

// Helper function to generate reset token
function generateResetToken(userId) {
  return jwt.sign(
    { userId: userId, type: 'reset' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Helper function to check rate limit
async function checkRateLimit(userId) {
  const recentRequest = await ForgotPassword.findOne({
    where: {
      userId: userId,
      isActive: true,
      expiresAt: {
        [sequelize.Sequelize.Op.gt]: new Date()
      }
    },
    order: [['createdAt', 'DESC']]
  });

  if (recentRequest) {
    const timeSinceLastRequest = Date.now() - new Date(recentRequest.createdAt).getTime();
    if (timeSinceLastRequest < RESET_REQUEST_COOLDOWN) {
      const remainingMinutes = Math.ceil((RESET_REQUEST_COOLDOWN - timeSinceLastRequest) / 60000);
      return { 
        allowed: false, 
        remainingMinutes,
        existingRequest: recentRequest 
      };
    }
  }
  return { allowed: true };
}

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const t = await sequelize.transaction();

  try {
    console.log('🔑 Forgot password request for:', email);

    if (!email) {
      await t.rollback();
      return res.status(400).json({ message: "Email required" });
    }

    const user = await User.findOne({ where: { email }, transaction: t });

    if (!user) {
      await t.rollback();
      // Don't reveal if email exists (security)
      return res.status(200).json({ message: "If email exists, reset link sent (check spam)." });
    }

    // Check rate limit
    const rateLimitCheck = await checkRateLimit(user.id);
    
    if (!rateLimitCheck.allowed) {
      await t.rollback();
      return res.status(429).json({ 
        message: `Please wait ${rateLimitCheck.remainingMinutes} minute(s) before requesting another reset.`,
        canResend: true,
        remainingMinutes: rateLimitCheck.remainingMinutes
      });
    }

    // Invalidate all previous active reset requests for this user
    await ForgotPassword.update(
      { isActive: false },
      { 
        where: { 
          userId: user.id, 
          isActive: true 
        },
        transaction: t 
      }
    );

    // Generate new reset token (1h expiry)
    const resetToken = generateResetToken(user.id);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Create new reset request record
    await ForgotPassword.create({
      userId: user.id,
      resetToken: resetToken,
      isActive: true,
      expiresAt: expiresAt
    }, { transaction: t });

    await sendResetEmail(email, resetToken);

    await t.commit();
    res.status(200).json({ message: "Password reset email sent. Check inbox/spam." });

  } catch (error) {
    await t.rollback();
    console.error('❌ Forgot pw error:', error);
    res.status(500).json({ message: "Server error, try again." });
  }
};

// New endpoint to resend the most recent valid reset email
exports.resendResetEmail = async (req, res) => {
  const { email } = req.body;
  const t = await sequelize.transaction();

  try {
    console.log('📧 Resend reset email request for:', email);

    if (!email) {
      await t.rollback();
      return res.status(400).json({ message: "Email required" });
    }

    const user = await User.findOne({ where: { email }, transaction: t });

    if (!user) {
      await t.rollback();
      return res.status(200).json({ message: "If email exists, reset link sent (check spam)." });
    }

    // Find the most recent active reset request
    const existingRequest = await ForgotPassword.findOne({
      where: {
        userId: user.id,
        isActive: true,
        expiresAt: {
          [sequelize.Sequelize.Op.gt]: new Date()
        }
      },
      order: [['createdAt', 'DESC']],
      transaction: t
    });

    if (!existingRequest) {
      await t.rollback();
      // No active request found, user should request a new one
      return res.status(404).json({ 
        message: "No active reset request found. Please request a new password reset.",
        needsNewRequest: true
      });
    }

    // Check if the token is still valid
    try {
      const decoded = jwt.verify(existingRequest.resetToken, JWT_SECRET);
      
      // Token is still valid, resend the email
      await sendResetEmail(email, existingRequest.resetToken);
      
      await t.commit();
      res.status(200).json({ 
        message: "Reset email resent. Check inbox/spam.",
        expiresIn: Math.ceil((new Date(existingRequest.expiresAt).getTime() - Date.now()) / 60000) + " minutes"
      });

    } catch (jwtError) {
      // Token has expired, invalidate it
      await ForgotPassword.update(
        { isActive: false },
        { where: { id: existingRequest.id }, transaction: t }
      );
      
      await t.commit();
      return res.status(410).json({ 
        message: "Previous reset link has expired. A new one will be sent.",
        needsNewRequest: true
      });
    }

  } catch (error) {
    await t.rollback();
    console.error('❌ Resend email error:', error);
    res.status(500).json({ message: "Server error, try again." });
  }
};

// Reset password using token from email
exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  const t = await sequelize.transaction();

  try {
    console.log('🔑 Reset password request received');

    if (!token || !newPassword) {
      await t.rollback();
      return res.status(400).json({ message: "Token and new password are required" });
    }

    // Validate token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ Token decoded:', { userId: decoded.userId, type: decoded.type });
    } catch (jwtError) {
      await t.rollback();
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(410).json({ message: "Reset link has expired. Please request a new one." });
      }
      return res.status(400).json({ message: "Invalid reset link." });
    }

    if (decoded.type !== 'reset') {
      await t.rollback();
      return res.status(400).json({ message: "Invalid token type." });
    }

    // Find the reset request record
    const resetRequest = await ForgotPassword.findOne({
      where: {
        userId: decoded.userId,
        resetToken: token,
        isActive: true,
        expiresAt: {
          [sequelize.Sequelize.Op.gt]: new Date()
        }
      },
      transaction: t
    });

    if (!resetRequest) {
      await t.rollback();
      return res.status(404).json({ 
        message: "Reset link not found or expired. Please request a new password reset." 
      });
    }

    // Find the user
    const user = await User.findOne({ 
      where: { id: decoded.userId }, 
      transaction: t 
    });

    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: "User not found." });
    }

    // Update password
    user.password = newPassword;
    await user.save({ transaction: t });

    // Mark reset request as used and inactive
    resetRequest.isActive = false;
    resetRequest.usedAt = new Date();
    await resetRequest.save({ transaction: t });

    await t.commit();
    console.log('✅ Password reset successful for user:', user.email);
    res.status(200).json({ message: "Password reset successful. You can now login with your new password." });

  } catch (error) {
    await t.rollback();
    console.error('❌ Reset password error:', error);
    res.status(500).json({ message: "Server error, try again." });
  }
};

// Verify token validity (for loading the reset page)
exports.verifyResetToken = async (req, res) => {
  const { token } = req.query;

  try {
    if (!token) {
      return res.status(400).json({ valid: false, message: "Token is required" });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(410).json({ valid: false, message: "Reset link has expired. Please request a new one." });
      }
      return res.status(400).json({ valid: false, message: "Invalid reset link." });
    }

    if (decoded.type !== 'reset') {
      return res.status(400).json({ valid: false, message: "Invalid token type." });
    }

    // Check if reset request exists and is active
    const resetRequest = await ForgotPassword.findOne({
      where: {
        userId: decoded.userId,
        resetToken: token,
        isActive: true,
        expiresAt: {
          [sequelize.Sequelize.Op.gt]: new Date()
        }
      }
    });

    if (!resetRequest) {
      return res.status(404).json({ 
        valid: false, 
        message: "Reset link not found or expired. Please request a new password reset." 
      });
    }

    const expiresIn = Math.ceil((new Date(resetRequest.expiresAt).getTime() - Date.now()) / 60000);
    res.status(200).json({ 
      valid: true, 
      message: "Token is valid",
      expiresIn: expiresIn + " minutes"
    });

  } catch (error) {
    console.error('❌ Verify token error:', error);
    res.status(500).json({ valid: false, message: "Server error" });
  }
};
