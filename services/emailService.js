const SibApiV3Sdk = require('sib-api-v3-sdk');
require('dotenv').config();

var defaultClient = SibApiV3Sdk.ApiClient.instance;

var apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.API_KEY;

var apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

async function sendResetEmail(toEmail, requestId) {
  const sender = {
    name: 'Advance Expense Tracker',
    email: 'yusufkhambaty1@gmail.com'
  };

  const receivers = [
    {
      email: toEmail
    }
  ];

  // Use UUID-based reset URL
  const resetUrl = `${process.env.BASE_URL}/password/resetpassword/${requestId}`;

  const sendSmtpEmail = {
    sender,
    to: receivers,
    subject: 'Password Reset - Advance Expense Tracker',
    htmlContent: `
      <html>
      <body>
        <h1>Reset Your Password</h1>
        <p>Hello,</p>
        <p>You requested a password reset for your Advance Expense Tracker account.</p>
        <p>Click the button below to reset your password:</p>
        <p style="margin: 30px 0;">
          <a href="${resetUrl}" style="background: #635BFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset Password</a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p style="color: #888; font-size: 12px; margin-top: 30px;">This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.</p>
      </body>
      </html>
    `,
    textContent: `Reset Password: ${resetUrl}\n\nThis link will expire in 1 hour.`
  };

  try {
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Email sent to ' + toEmail);
    return response;
  } catch (error) {
    console.error('❌ Email error for ' + toEmail + ':', error.response ? error.response.body : error.message);
    // Don't throw - we still created the request even if email fails
    console.log('📧 Reset URL (in case email fails):', resetUrl);
    return null;
  }
}

module.exports = { sendResetEmail };
