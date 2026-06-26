import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
  });

  const mailOptions = {
    from: `"Tribe App" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  };

  await transporter.sendMail(mailOptions);
  console.log(`✅ Email sent to ${to}`);
};

export const sendPasswordResetEmail = async (email, otp) => {
  // Log OTP to console as backup
  console.log('\n🔑 ═══════════════════════════════════════');
  console.log(`   PASSWORD RESET OTP for ${email}`);
  console.log(`   Code: ${otp}`);
  console.log('   Expires in 10 minutes');
  console.log('═══════════════════════════════════════════\n');

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border-radius: 16px; overflow: hidden;">
      <div style="padding: 40px 32px; text-align: center;">
        <div style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 12px; border-radius: 12px; margin-bottom: 24px;">
          <span style="font-size: 28px;">⚡</span>
        </div>
        <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px;">Tribe</h1>
        <p style="color: #94a3b8; font-size: 14px; margin: 0 0 32px;">Password Reset Request</p>
        
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #cbd5e1; font-size: 14px; margin: 0 0 16px;">Use this code to reset your password:</p>
          <div style="background: rgba(99, 102, 241, 0.15); border: 2px dashed rgba(99, 102, 241, 0.4); border-radius: 12px; padding: 16px;">
            <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #818cf8; font-family: 'Courier New', monospace;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 12px; margin: 16px 0 0;">This code expires in <strong style="color: #f59e0b;">10 minutes</strong></p>
        </div>
        
        <p style="color: #64748b; font-size: 12px; margin: 0;">If you didn't request this, you can safely ignore this email.</p>
      </div>
      <div style="background: rgba(0,0,0,0.2); padding: 16px; text-align: center;">
        <p style="color: #475569; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} Tribe — Connect with your community</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: '🔑 Tribe — Password Reset Code',
    html
  });
};

export const sendEmailVerification = async (email, otp) => {
  // Log OTP to console as backup
  console.log('\n✉️ ═══════════════════════════════════════');
  console.log(`   EMAIL VERIFICATION OTP for ${email}`);
  console.log(`   Code: ${otp}`);
  console.log('   Expires in 10 minutes');
  console.log('═══════════════════════════════════════════\n');

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border-radius: 16px; overflow: hidden;">
      <div style="padding: 40px 32px; text-align: center;">
        <div style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); padding: 12px; border-radius: 12px; margin-bottom: 24px;">
          <span style="font-size: 28px;">✉️</span>
        </div>
        <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px;">Welcome to Tribe!</h1>
        <p style="color: #94a3b8; font-size: 14px; margin: 0 0 32px;">Verify your email address to continue</p>
        
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #cbd5e1; font-size: 14px; margin: 0 0 16px;">Your verification code is:</p>
          <div style="background: rgba(16, 185, 129, 0.15); border: 2px dashed rgba(16, 185, 129, 0.4); border-radius: 12px; padding: 16px;">
            <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #34d399; font-family: 'Courier New', monospace;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 12px; margin: 16px 0 0;">This code expires in <strong style="color: #f59e0b;">10 minutes</strong></p>
        </div>
      </div>
      <div style="background: rgba(0,0,0,0.2); padding: 16px; text-align: center;">
        <p style="color: #475569; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} Tribe — Connect with your community</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: '✉️ Tribe — Verify Your Email',
    html
  });
};

export default sendEmail;
