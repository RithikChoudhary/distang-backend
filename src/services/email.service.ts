import nodemailer from 'nodemailer';
import { config } from '../config/env';

/**
 * Email transporter (using Nodemailer)
 * In production, use a real email service like SendGrid, AWS SES, etc.
 */
const createTransporter = () => {
  // Check if SMTP is properly configured
  const smtpConfigured = process.env.SMTP_USER && process.env.SMTP_PASS;
  
  // For development or when SMTP is not configured, use console logging
  if (config.isDevelopment || !smtpConfigured) {
    return {
      sendMail: async (options: any) => {
        const otp = options.text?.match(/\d{6}/)?.[0] || 'N/A';
        console.log('\n');
        console.log('╔══════════════════════════════════════════════════╗');
        console.log('║            📧 EMAIL OTP (Console Mode)           ║');
        console.log('╠══════════════════════════════════════════════════╣');
        console.log(`║  To: ${options.to.padEnd(42)}║`);
        console.log(`║  Subject: ${options.subject?.slice(0, 38).padEnd(38)}║`);
        console.log('╠══════════════════════════════════════════════════╣');
        console.log('║                                                  ║');
        console.log(`║           OTP CODE:  ${otp}                      ║`);
        console.log('║                                                  ║');
        console.log('╚══════════════════════════════════════════════════╝');
        if (!smtpConfigured) {
          console.log('⚠️  SMTP not configured. Set SMTP_USER and SMTP_PASS env vars.');
        }
        console.log('\n');
        return { messageId: 'console-mode' };
      },
    };
  }

  // Production email configuration with SMTP
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const transporter = createTransporter();

/**
 * Send OTP email
 */
export const sendOTPEmail = async (
  email: string,
  otp: string,
  type: 'signup' | 'login' | 'reset'
): Promise<boolean> => {
  const subjects = {
    signup: '🔐 Verify your Codex account',
    login: '🔑 Your Codex login code',
    reset: '🔄 Reset your Codex password',
  };

  const messages = {
    signup: `Welcome to Codex! Your verification code is: ${otp}`,
    login: `Your login code is: ${otp}`,
    reset: `Your password reset code is: ${otp}`,
  };

  try {
    await transporter.sendMail({
      from: '"Codex Couples" <noreply@codex-couples.com>',
      to: email,
      subject: subjects[type],
      text: `${messages[type]}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #FF6B8A; text-align: center; font-size: 28px;">Codex</h1>
          <div style="background: linear-gradient(135deg, #FFE4EC 0%, #FFF5F7 100%); border-radius: 16px; padding: 24px; text-align: center;">
            <p style="color: #333; font-size: 16px; margin-bottom: 20px;">${messages[type].replace(otp, '')}</p>
            <div style="background: white; border-radius: 12px; padding: 16px; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #FF6B8A;">${otp}</span>
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">Code expires in 10 minutes</p>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
            If you didn't request this, please ignore this email.
          </p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};

export default { sendOTPEmail };
