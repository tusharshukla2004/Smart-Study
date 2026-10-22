// ============================================
// Email Service (Nodemailer)
// ============================================

const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass }
  });

  return transporter;
};

/**
 * Send an email with graceful fallback if SMTP is unconfigured.
 * @param {object} options - { to, subject, html, text }
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const mailer = getTransporter();
  if (!mailer) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`ℹ️ [Email Skipped - SMTP Not Configured] To: ${to} | Subject: "${subject}"`);
    }
    return { success: false, skipped: true };
  }

  try {
    const from = process.env.EMAIL_FROM || '"Smart Study" <noreply@smartstudy.platform>';
    const info = await mailer.sendMail({
      from,
      to,
      subject,
      text: text || html.replace(/<[^>]+>/g, ''),
      html
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Email send failed to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * HTML Template for Session Reminder Email
 */
const getSessionReminderHtml = (session, recipientName) => {
  const timeStr = new Date(session.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = new Date(session.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0F0F1A; color: #F1F0FF; margin: 0; padding: 24px; }
      .container { max-width: 560px; margin: 0 auto; background: #1A1A2E; border: 1px solid rgba(108,99,255,0.3); border-radius: 16px; padding: 32px; }
      .logo { font-size: 20px; font-weight: bold; color: #6C63FF; margin-bottom: 24px; display: inline-block; }
      h1 { font-size: 22px; color: #FFFFFF; margin-bottom: 12px; }
      p { font-size: 15px; color: #8B8BAD; line-height: 1.6; }
      .card { background: #22223F; border-radius: 12px; padding: 20px; margin: 24px 0; border-left: 4px solid #6C63FF; }
      .card-item { margin-bottom: 8px; font-size: 14px; }
      .card-item strong { color: #F1F0FF; }
      .btn { display: inline-block; background: #6C63FF; color: #FFFFFF !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; }
      .footer { margin-top: 32px; font-size: 12px; color: #5A5A7A; text-align: center; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="logo">📚 Smart Study</div>
      <h1>Study Session Starting Soon!</h1>
      <p>Hi ${recipientName || 'there'}, your scheduled study session is starting in 15 minutes.</p>
      <div class="card">
        <div class="card-item"><strong>Title:</strong> ${session.title}</div>
        <div class="card-item"><strong>Subject:</strong> ${session.subject || 'General Study'}</div>
        <div class="card-item"><strong>Start Time:</strong> ${dateStr} at ${timeStr}</div>
        <div class="card-item"><strong>Duration:</strong> ${session.totalCycles} cycles (${session.focusMinutes}m focus / ${session.breakMinutes}m break)</div>
      </div>
      <a href="${appUrl}/sessions/${session._id}" class="btn">Join Session Room →</a>
      <div class="footer">Smart Study - AI-Powered Collaborative Learning</div>
    </div>
  </body>
  </html>
  `;
};

/**
 * HTML Template for Task Deadline Reminder Email
 */
const getTaskDeadlineHtml = (task, recipientName) => {
  const deadlineStr = new Date(task.deadline).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0F0F1A; color: #F1F0FF; margin: 0; padding: 24px; }
      .container { max-width: 560px; margin: 0 auto; background: #1A1A2E; border: 1px solid rgba(239,68,68,0.3); border-radius: 16px; padding: 32px; }
      .logo { font-size: 20px; font-weight: bold; color: #6C63FF; margin-bottom: 24px; display: inline-block; }
      h1 { font-size: 22px; color: #FFFFFF; margin-bottom: 12px; }
      p { font-size: 15px; color: #8B8BAD; line-height: 1.6; }
      .card { background: #22223F; border-radius: 12px; padding: 20px; margin: 24px 0; border-left: 4px solid #EF4444; }
      .card-item { margin-bottom: 8px; font-size: 14px; }
      .card-item strong { color: #F1F0FF; }
      .btn { display: inline-block; background: #6C63FF; color: #FFFFFF !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; }
      .footer { margin-top: 32px; font-size: 12px; color: #5A5A7A; text-align: center; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="logo">📚 Smart Study</div>
      <h1>Task Deadline Approaching ⏳</h1>
      <p>Hi ${recipientName || 'there'}, you have a task due within the next 24 hours.</p>
      <div class="card">
        <div class="card-item"><strong>Task:</strong> ${task.title}</div>
        <div class="card-item"><strong>Subject:</strong> ${task.subject || 'General'}</div>
        <div class="card-item"><strong>Deadline:</strong> ${deadlineStr}</div>
        <div class="card-item"><strong>Priority:</strong> ${task.priority.toUpperCase()}</div>
      </div>
      <a href="${appUrl}/tasks" class="btn">View & Complete Task →</a>
      <div class="footer">Smart Study - AI-Powered Collaborative Learning</div>
    </div>
  </body>
  </html>
  `;
};

module.exports = {
  sendEmail,
  getSessionReminderHtml,
  getTaskDeadlineHtml
};
