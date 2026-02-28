import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendOTP(email: string, otp: string, purpose: 'signup' | 'password_reset') {
  const subject = purpose === 'signup' 
    ? 'Verify Your Email - Life Tracker'
    : 'Reset Your Password - Life Tracker'

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0a0a0a; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .otp { font-size: 32px; font-weight: bold; color: #3b82f6; text-align: center; padding: 20px; background: white; border-radius: 8px; letter-spacing: 8px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Life Tracker</h1>
          </div>
          <div class="content">
            <h2>${purpose === 'signup' ? 'Verify Your Email' : 'Reset Your Password'}</h2>
            <p>Your verification code is:</p>
            <div class="otp">${otp}</div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2026 Life Tracker. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `

  try {
    await resend.emails.send({
      from: 'Life Tracker <onboarding@resend.dev>',
      to: email,
      subject,
      html,
    })
    return true
  } catch (error) {
    console.error('Email send error:', error)
    return false
  }
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}
