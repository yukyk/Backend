const User = require("../Models/signupModel");
const ForgotPasswordRequests = require("../Models/forgotPasswordRequests");
const sequelize = require("../Utils/util");
const bcrypt = require("bcrypt");

const RESET_REQUEST_COOLDOWN = 5 * 60 * 1000; // 5 minutes cooldown between requests
const RESET_LINK_EXPIRY = 1 * 60 * 60 * 1000; // 1 hour expiry

// Request password reset
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const t = await sequelize.transaction();

  try {

    if (!email) {
      await t.rollback();
      return res.status(400).json({ message: "Email required" });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      await t.rollback();
      // Don't reveal if email exists (security)
      return res.status(200).json({ message: "If email exists, reset link sent (check spam)." });
    }

    // Check rate limit - find recent active request
    const recentRequest = await ForgotPasswordRequests.findOne({
      where: {
        userId: user.id,
        isActive: true,
        expiresAt: {
          [sequelize.Sequelize.Op.gt]: new Date()
        }
      }
    });

    if (recentRequest) {
      const timeSinceLastRequest = Date.now() - new Date(recentRequest.createdAt).getTime();
      if (timeSinceLastRequest < RESET_REQUEST_COOLDOWN) {
        const remainingMinutes = Math.ceil((RESET_REQUEST_COOLDOWN - timeSinceLastRequest) / 60000);
        await t.rollback();
        return res.status(429).json({ 
          message: `Please wait ${remainingMinutes} minute(s) before requesting another reset.`,
          canResend: true,
          remainingMinutes
        });
      }
      // Mark old request as inactive
      recentRequest.isActive = false;
      await recentRequest.save({ transaction: t });
    }

    // Create new forgot password request with UUID
    const expiresAt = new Date(Date.now() + RESET_LINK_EXPIRY);
    const resetRequest = await ForgotPasswordRequests.create({
      userId: user.id,
      isActive: true,
      expiresAt: expiresAt
    }, { transaction: t });

    await t.commit();

    // Log the reset URL (since email might not work)
    const resetUrl = `${process.env.BASE_URL}/password/resetpassword/${resetRequest.id}`;

    // Try to send email, but don't fail if it doesn't work
    try {
      const { sendResetEmail } = require("../services/emailService");
      await sendResetEmail(email, resetRequest.id);
    } catch (emailError) {
      console.log('⚠️ Email could not be sent, but request was created');
      console.log('📧 Reset URL:', resetUrl);
    }

    res.status(200).json({ 
      message: "Password reset email sent. Check inbox/spam.",
      resetUrl: resetUrl // For development purposes
    });

  } catch (error) {
    await t.rollback();
    console.error('❌ Forgot pw error:', error);
    res.status(500).json({ message: "Server error, try again." });
  }
};

// Verify reset request and show password reset form
exports.verifyResetRequest = async (req, res) => {
  const { id } = req.params;

  try {
    console.log('🔑 Verifying reset request:', id);

    if (!id) {
      return res.status(400).json({ valid: false, message: "Request ID is required" });
    }

    // Find the reset request
    const resetRequest = await ForgotPasswordRequests.findOne({
      where: { id: id }
    });

    if (!resetRequest) {
      console.log('❌ Reset request not found');
      return res.status(404).json({ 
        valid: false, 
        message: "Reset link not found. Please request a new password reset." 
      });
    }

    if (!resetRequest.isActive) {
      console.log('❌ Reset request is inactive');
      return res.status(400).json({ 
        valid: false, 
        message: "This reset link has already been used. Please request a new password reset." 
      });
    }

    if (new Date() > new Date(resetRequest.expiresAt)) {
      console.log('❌ Reset request expired');
      return res.status(410).json({ 
        valid: false, 
        message: "Reset link has expired. Please request a new password reset." 
      });
    }

    // Get user info
    const user = await User.findOne({
      where: { id: resetRequest.userId },
      attributes: ['id', 'email', 'name']
    });

    if (!user) {
      return res.status(404).json({ 
        valid: false, 
        message: "User not found." 
      });
    }

    const expiresIn = Math.ceil((new Date(resetRequest.expiresAt).getTime() - Date.now()) / 60000);
    
    console.log('✅ Reset request verified for user:', user.email);
    res.status(200).json({ 
      valid: true, 
      message: "Reset request is valid",
      userEmail: user.email,
      expiresIn: expiresIn + " minutes"
    });

  } catch (error) {
    console.error('❌ Verify request error:', error);
    res.status(500).json({ valid: false, message: "Server error" });
  }
};

// Reset password using the request ID
exports.resetPassword = async (req, res) => {
  const { id, newPassword } = req.body;
  const t = await sequelize.transaction();

  try {
    console.log('🔑 Reset password request for ID:', id);

    if (!id || !newPassword) {
      await t.rollback();
      return res.status(400).json({ message: "Request ID and new password are required" });
    }

    // Find the reset request
    const resetRequest = await ForgotPasswordRequests.findOne({
      where: { id: id },
      transaction: t
    });

    if (!resetRequest) {
      await t.rollback();
      return res.status(404).json({ 
        message: "Reset link not found. Please request a new password reset." 
      });
    }

    if (!resetRequest.isActive) {
      await t.rollback();
      return res.status(400).json({ 
        message: "This reset link has already been used. Please request a new password reset." 
      });
    }

    if (new Date() > new Date(resetRequest.expiresAt)) {
      await t.rollback();
      return res.status(410).json({ 
        message: "Reset link has expired. Please request a new password reset." 
      });
    }

    // Find the user
    const user = await User.findOne({ 
      where: { id: resetRequest.userId }, 
      transaction: t 
    });

    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: "User not found." });
    }

    // Hash the new password before saving
    const saltrounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltrounds);
    user.password = hashedPassword;
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

// Resend reset email
exports.resendResetEmail = async (req, res) => {
  const { email } = req.body;

  try {
    console.log('📧 Resend reset email request for:', email);

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(200).json({ message: "If email exists, reset link sent (check spam)." });
    }

    // Find active reset request
    const resetRequest = await ForgotPasswordRequests.findOne({
      where: {
        userId: user.id,
        isActive: true,
        expiresAt: {
          [sequelize.Sequelize.Op.gt]: new Date()
        }
      }
    });

    if (!resetRequest) {
      return res.status(404).json({ 
        message: "No active reset request found. Please request a new password reset.",
        needsNewRequest: true
      });
    }

    // Try to send email
    try {
      const { sendResetEmail } = require("../services/emailService");
      await sendResetEmail(email, resetRequest.id);
    } catch (emailError) {
      console.log('⚠️ Email could not be sent, but request exists');
    }

    const expiresIn = Math.ceil((new Date(resetRequest.expiresAt).getTime() - Date.now()) / 60000);
    res.status(200).json({ 
      message: "Reset email resent. Check inbox/spam.",
      resetUrl: `${process.env.BASE_URL}/password/resetpassword/${resetRequest.id}`,
      expiresIn: expiresIn + " minutes"
    });

  } catch (error) {
    console.error('❌ Resend email error:', error);
    res.status(500).json({ message: "Server error, try again." });
  }
};
