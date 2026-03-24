const SibApiV3Sdk = require('sib-api-v3-sdk');
require('dotenv').config();

var defaultClient = SibApiV3Sdk.ApiClient.instance;

var apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.API_KEY;

var apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

async function sendResetEmail(toEmail, resetToken) {
  const sender = {
    name: 'Advance Expense Tracker',
    // ✅ FIXED: Use Brevo-verified sender — NOT a Gmail address
    // Option A: use your Brevo subdomain email (see step below)
    // Option B: use your own domain email like noreply@yourdomain.com
    email: 'yusufkhambaty1@gmail.com' // 👈 CHANGE THIS
  };

  const receivers = [{ email: toEmail }];

  const sendSmtpEmail = {
    sender,
    to: receivers,
    subject: 'Password Reset - Advance Expense Tracker',
    htmlContent: `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #007bff;">Reset Your Password</h2>
          <p>Hello,</p>
          <p>We received a request to reset your password for your Advance Expense Tracker account.</p>
          <p>
            <a href="http://localhost:3000/reset-password?token=${resetToken}"
               style="background:#007bff; color:white; padding:12px 24px;
                      text-decoration:none; border-radius:5px; display:inline-block;">
              Reset Password
            </a>
          </p>
          <p>This link expires in <strong>1 hour</strong>.</p>
          <p>If you didn't request this, ignore this email.</p>
        </body>
      </html>
    `,
    textContent: `Reset your password here: http://localhost:3000/reset-password?token=${resetToken}`
  };

  try {
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Reset email sent to:', toEmail);
    return response;
  } catch (error) {
  console.error('❌ Full Brevo error:', JSON.stringify(error.response?.body, null, 2));
  console.error('❌ Status code:', error.status || error.response?.status);
  console.error('❌ Message:', error.message);
  throw error;
  }
}

module.exports = { sendResetEmail };