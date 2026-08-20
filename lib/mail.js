import nodemailer from 'nodemailer';

const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: smtpPort,
  secure: smtpPort === 465, // true for 465 (SSL), false for 587 (TLS/STARTTLS)
  auth: {
    user: process.env.SMTP_USERNAME || process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS,
  },
});

export async function sendEmail({ to, subject, text, html }) {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Mutants Academy'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email via SMTP:', error);
    return { success: false, error: error.message };
  }
}

// 1. Welcome Greeting Email
export async function sendWelcomeEmail(to, name, activationLink) {
  const subject = 'Welcome to Mutants Academy - Activate Your Athlete Portal!';
  
  const text = `Hi ${name},\n\nWelcome to Mutants Academy! Your athlete profile has been registered by the gym administration.\n\nTo access your billing cycles, notice board, and fighter directory, please activate your account and set up your password using the link below:\n\n${activationLink}\n\nTrain Hard,\nMutants Academy Team`;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; border-bottom: 2px solid #ef4444; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="color: #ef4444; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;">Mutants Academy</h1>
        <p style="margin: 5px 0 0 0; font-size: 12px; font-weight: bold; color: #64748b; letter-spacing: 0.5px;">ATHLETE REGISTRATION</p>
      </div>
      <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #334155;">
        Welcome to the team! Your athlete profile has been successfully registered by the administration at Mutants Academy.
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #334155;">
        We use an online portal to manage subscription packages, billing deadlines, sparring directory, and official notices.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${activationLink}" style="background-color: #ef4444; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.2); text-transform: uppercase; letter-spacing: 0.5px; display: inline-block;">Activate Athlete Account</a>
      </div>
      <p style="font-size: 13px; color: #64748b; line-height: 1.5; text-align: center;">
        If the button above does not work, copy and paste this URL into your browser:<br />
        <a href="${activationLink}" style="color: #ef4444; word-break: break-all;">${activationLink}</a>
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 35px 0 20px 0;" />
      <p style="font-size: 12px; text-align: center; color: #94a3b8; margin: 0;">
        Train Hard. Stay Mutant.<br />
        &copy; ${new Date().getFullYear()} Mutants Academy. All rights reserved.
      </p>
    </div>
  `;

  return sendWelcomeEmail.name ? sendEmail({ to, subject, text, html }) : null;
}

// 2. Billing Due Reminder Email
export async function sendPaymentReminderEmail(to, name, expiryDate, diffDays) {
  let subject = '';
  let headingText = '';
  let descriptionText = '';
  const dateFormatted = new Date(expiryDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (diffDays === 0) {
    subject = 'CRITICAL: Your Mutants Academy Package Expires Today!';
    headingText = 'Subscription Package Expires Today';
    descriptionText = `This is a reminder that your membership package at Mutants Academy expires **TODAY (${dateFormatted})**. Please renew your package to continue training without interruption.`;
  } else if (diffDays < 0) {
    subject = 'ALERT: Your Mutants Academy Package has Expired!';
    headingText = 'Subscription Package Expired';
    descriptionText = `Your membership package at Mutants Academy expired on **${dateFormatted}** (${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} ago). Please renew your package as soon as possible to reactivate your training status.`;
  } else {
    subject = `Billing Reminder: Your package expires in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    headingText = `Package Renewal Due in ${diffDays} Day${diffDays > 1 ? 's' : ''}`;
    descriptionText = `This is a friendly reminder that your membership package is scheduled to expire on **${dateFormatted}**. Please coordinate with your coach to renew your subscription.`;
  }

  const text = `Hi ${name},\n\n${headingText}\n\n${descriptionText.replace(/\*\*/g, '')}\n\nTo check your package details, log in to your portal here:\n${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login\n\nTrain Hard,\nMutants Academy Team`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; border-bottom: 2px solid #ef4444; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="color: #ef4444; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;">Mutants Academy</h1>
        <p style="margin: 5px 0 0 0; font-size: 12px; font-weight: bold; color: #e11d48; letter-spacing: 0.5px;">BILLING REMINDER</p>
      </div>
      <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
      <h3 style="color: #ef4444; font-size: 18px; margin-top: 25px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">${headingText}</h3>
      <p style="font-size: 15px; line-height: 1.6; color: #334155;">
        ${descriptionText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login" style="background-color: #ef4444; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.2); text-transform: uppercase; letter-spacing: 0.5px; display: inline-block;">Go to Athlete Portal</a>
      </div>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        If you have already paid or renewed, please disregard this email or check with your coach to ensure your renewal has been logged in the system.
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 35px 0 20px 0;" />
      <p style="font-size: 12px; text-align: center; color: #94a3b8; margin: 0;">
        Train Hard. Stay Mutant.<br />
        &copy; ${new Date().getFullYear()} Mutants Academy. All rights reserved.
      </p>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

// 3. Password Reset OTP Email
export async function sendOtpEmail(to, name, otpCode) {
  const subject = 'Mutants Academy Portal - Password Reset Code';
  const text = `Hi ${name},\n\nYou requested a password reset code for your Mutants Academy portal. Your verification OTP code is:\n\n${otpCode}\n\nThis code will expire in 15 minutes. If you did not request this, please ignore this email.\n\nTrain Hard,\nMutants Academy Team`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; border-bottom: 2px solid #ef4444; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="color: #ef4444; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;">Mutants Academy</h1>
        <p style="margin: 5px 0 0 0; font-size: 12px; font-weight: bold; color: #64748b; letter-spacing: 0.5px;">SECURITY VERIFICATION</p>
      </div>
      <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #334155;">
        You are receiving this email because a password reset request was initiated for your Mutants Academy account.
      </p>
      <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0;">
        <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Verification OTP Code</p>
        <span style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #ef4444; font-family: monospace;">${otpCode}</span>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #94a3b8;">Expires in 15 minutes</p>
      </div>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        If you did not request a password reset, please disregard this email. Your password will remain unchanged.
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 35px 0 20px 0;" />
      <p style="font-size: 12px; text-align: center; color: #94a3b8; margin: 0;">
        Train Hard. Stay Mutant.<br />
        &copy; ${new Date().getFullYear()} Mutants Academy. All rights reserved.
      </p>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}
