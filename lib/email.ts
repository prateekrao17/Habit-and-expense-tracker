import { Resend } from 'resend'

// Add fallback for missing API key
const resendKey = process.env.RESEND_API_KEY || 'dummy_key'
const resend = process.env.RESEND_API_KEY ? new Resend(resendKey) : null

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function sendOTP(email: string, otp: string, purpose: 'signup' | 'login' | 'password_reset') {
  // If no Resend API key, log OTP to console (dev only)
  if (!resend) {
    console.log('\n')
    console.log('╔════════════════════════════════════════════════╗')
    console.log('║  📧 EMAIL SIMULATION (No Resend API Key)      ║')
    console.log('╚════════════════════════════════════════════════╝')
    console.log(`📧 To: ${email}`)
    console.log(`🎯 Purpose: ${purpose}`)
    console.log(`✨ OTP CODE: ${otp}`)
    console.log('⏱️  Valid for: 10 minutes')
    console.log('╔════════════════════════════════════════════════╗')
    console.log('\n')
    return true
  }

  const subjects = {
    signup: 'Verify Your Email - Life Tracker',
    login: 'Login Verification Code - Life Tracker',
    password_reset: 'Reset Your Password - Life Tracker'
  }

  const titles = {
    signup: 'Welcome to Life Tracker!',
    login: 'Login Verification',
    password_reset: 'Password Reset'
  }

  const messages = {
    signup: 'Thank you for signing up. Please verify your email to continue.',
    login: 'Someone is trying to login to your account. Use this code to continue.',
    password_reset: 'You requested to reset your password. Use this code to proceed.'
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0; }
          .content { background: #f9fafb; padding: 40px 30px; border-radius: 0 0 12px 12px; }
          .otp-box { background: white; padding: 30px; text-align: center; border-radius: 12px; margin: 20px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .otp { font-size: 36px; font-weight: bold; color: #3b82f6; letter-spacing: 8px; margin: 10px 0; }
          .warning { color: #ef4444; font-size: 14px; margin-top: 20px; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0; font-size: 28px;">🎯 Life Tracker</h1>
          </div>
          <div class="content">
            <h2 style="color: #111827; margin-top: 0;">${titles[purpose]}</h2>
            <p style="color: #4b5563;">${messages[purpose]}</p>
            
            <div class="otp-box">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Your verification code is:</p>
              <div class="otp">${otp}</div>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Valid for 10 minutes</p>
            </div>

            <p style="color: #4b5563;">If you didn't request this code, please ignore this email.</p>
            
            <div class="warning">
              ⚠️ Never share this code with anyone. We'll never ask for it.
            </div>
          </div>
          <div class="footer">
            <p>© 2026 Life Tracker. All rights reserved.</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
    </html>
  `

  try {
    await resend!.emails.send({
      from: 'Life Tracker <onboarding@resend.dev>',
      to: email,
      subject: subjects[purpose],
      html,
    })
    return true
  } catch (error) {
    console.error('Email send error:', error)
    return false
  }
}
