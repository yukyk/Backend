require('dotenv').config();
const SibApiV3Sdk = require('sib-api-v3-sdk');
const nodemailer = require('nodemailer');

// Initialize Sendinblue client only when API key is present
let sendinblueInstance = null;
if (process.env.API_KEY) {
  try {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKeyAuth = defaultClient.authentications['api-key'];
    apiKeyAuth.apiKey = process.env.API_KEY;
    sendinblueInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  } catch (err) {
    console.warn('⚠️ Could not initialize Sendinblue client:', err.message);
  }
}

async function sendResetEmail(toEmail, requestId) {
  const sender = {
    name: 'Advance Expense Tracker',
    email: process.env.FROM_EMAIL || 'no-reply@advance-expense.local'
  };

  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const resetUrl = `${baseUrl}/password/resetpassword/${requestId}`;

  const html = `<html><body><h1>Reset Your Password</h1><p>Click below:</p><a href="${resetUrl}">Reset Password</a></body></html>`;
  const text = `Reset Password: ${resetUrl}`;

  console.log('🔍 [DIAGNOSTIC] starting sendResetEmail...');
  console.log('🔍 [DIAGNOSTIC] sendinblueInstance active:', !!sendinblueInstance);
  console.log('🔍 [DIAGNOSTIC] SMTP_HOST present:', !!process.env.SMTP_HOST);

  // 1) Try Sendinblue / Brevo API
  if (sendinblueInstance) {
    try {
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.sender = sender;
      sendSmtpEmail.to = [{ email: toEmail }];
      sendSmtpEmail.subject = 'Password Reset - Advance Expense Tracker';
      sendSmtpEmail.htmlContent = html;
      sendSmtpEmail.textContent = text;

      const response = await sendinblueInstance.sendTransacEmail(sendSmtpEmail);
      console.log('✅ Sendinblue email sent to ' + toEmail);
      return response;
    } catch (error) {
      console.error('❌ Sendinblue API Error:', error?.response?.body || error.message);
    }
  }

  // 2) Fallback to SMTP via nodemailer
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      console.log(`🔌 Attempting SMTP connection to ${process.env.SMTP_HOST}...`);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: (process.env.SMTP_SECURE === 'true'),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      const info = await transporter.sendMail({
        from: `${sender.name} <${sender.email}>`,
        to: toEmail,
        subject: 'Password Reset - Advance Expense Tracker',
        html,
        text
      });

      console.log('✅ SMTP email sent to', toEmail, 'messageId=', info.messageId);
      return info;
    } catch (smtpErr) {
      console.error('❌ SMTP Error details:', smtpErr);
    }
  }

  console.warn('⚠️ Both email methods failed or were unconfigured.');
  return null;
}

module.exports = { sendResetEmail };