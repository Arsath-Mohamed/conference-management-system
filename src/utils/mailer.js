const nodemailer = require("nodemailer");

/**
 * Mailer Utility
 * Configuration for Mailtrap or Gmail SMTP
 */
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "sandbox.smtp.mailtrap.io",
  port: process.env.EMAIL_PORT || 2525,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send an email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body (optional)
 */
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: '"Conference System" <noreply@cms.com>',
      to,
      subject,
      text,
      html
    });
    console.log(`[MAILER] Sent to: ${to} | Subject: ${subject}`);
    console.log(`[MAILER] Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    // Don't throw error to avoid breaking the core workflow if email fails
    return null;
  }
};

module.exports = { sendEmail };
