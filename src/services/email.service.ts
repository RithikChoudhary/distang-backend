import { Resend } from 'resend';
import { config } from '../config/env';

// Initialize Resend if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Send OTP email using Resend API or console fallback
 */
export const sendOTPEmail = async (
  email: string,
  otp: string,
  type: 'signup' | 'login' | 'reset'
): Promise<boolean> => {
  const subjects = {
    signup: '🔐 Verify your Distang account',
    login: '🔑 Your Distang login code',
    reset: '🔄 Reset your Distang password',
  };

  const messages = {
    signup: `Welcome to Distang! Your verification code is: ${otp}`,
    login: `Your login code is: ${otp}`,
    reset: `Your password reset code is: ${otp}`,
  };

  // If Resend is configured, use it
  if (resend) {
    try {
      const { error } = await resend.emails.send({
        from: 'Distang <onboarding@resend.dev>', // Use your verified domain later
        to: email,
        subject: subjects[type],
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #8B5CF6; text-align: center; font-size: 28px;">💕 Distang</h1>
            <div style="background: linear-gradient(135deg, #F3E8FF 0%, #FDF4FF 100%); border-radius: 16px; padding: 24px; text-align: center;">
              <p style="color: #333; font-size: 16px; margin-bottom: 20px;">${messages[type].replace(otp, '')}</p>
              <div style="background: white; border-radius: 12px; padding: 16px; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #8B5CF6;">${otp}</span>
              </div>
              <p style="color: #666; font-size: 14px; margin-top: 20px;">Code expires in 10 minutes</p>
            </div>
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
              If you didn't request this, please ignore this email.
            </p>
          </div>
        `,
      });

      if (error) {
        console.error('Resend error:', error);
        return false;
      }

      console.log(`✅ OTP email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Email send error:', error);
      return false;
    }
  }

  // Fallback: Log OTP to console (for development or when email not configured)
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║            📧 EMAIL OTP (Console Mode)           ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  To: ${email.padEnd(42)}║`);
  console.log(`║  Subject: ${subjects[type]?.slice(0, 38).padEnd(38)}║`);
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║                                                  ║');
  console.log(`║           OTP CODE:  ${otp}                      ║`);
  console.log('║                                                  ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('⚠️  Email not configured. Set RESEND_API_KEY env var.');
  console.log('\n');
  
  // Return true so the app still works (user can see OTP in logs)
  return true;
};

export default { sendOTPEmail };
