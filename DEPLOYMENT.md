# Deployment Instructions

## Setup Instructions

### 1. **Get Resend API Key**
- Go to [resend.com](https://resend.com)
- Sign up for a free account
- Create an API key (free tier provides 100 emails/day)
- Copy your RESEND_API_KEY

### 2. **Local Development Setup**
Create or update `.env.local` file with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
RESEND_API_KEY=your_resend_api_key
```

### 3. **Create Supabase Schema**
1. Go to your Supabase Project Dashboard
2. Navigate to SQL Editor
3. Copy the entire content from `supabase/SCHEMA_UPDATES.sql`
4. Paste and run the SQL script
5. Verify the new tables are created:
   - `otp_codes` table
   - `notes` table
   - Password_hash column added to users table

### 4. **Local Testing**
```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run development server
npm run dev
```
Test flows:
- ✓ Sign up with new email → receive OTP → verify
- ✓ Login with email + password
- ✓ Forgot password → OTP verification → reset
- ✓ Create note with title, content, reminder, tags
- ✓ Pin/delete notes
- ✓ Verify habits and expenses still work

### 5. **Deploy to Vercel**

1. Push code to GitHub:
```bash
git add .
git commit -m "Add Supabase auth with OTP and Notes feature"
git push
```

2. In Vercel Dashboard:
   - Go to Project Settings → Environment Variables
   - Add the following variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `RESEND_API_KEY`
   - Redeploy the project

3. Verify deployment by testing all features in production

## Features Added

### Authentication System
- Email-based signup with OTP verification
- Email + password login
- Password reset with OTP verification
- Session management with sessionStorage
- Automatic session restoration on page reload

### Notes Feature
- Create notes with title, content
- Optional reminder dates with datetime picker
- Tag support (comma-separated)
- Pin/unpin notes
- Delete notes
- Notes persist to Supabase database
- Notes sorted by pinned status, then creation date

### Existing Features (Maintained)
- Habit tracking (daily, monthly, yearly views)
- Expense tracking with categories
- Custom expense categories
- Habit completion streaks
- All data synced across sessions

## Important Notes

⚠️ **Security Note**: Current password hashing uses Base64 encoding (btoa/atob). For production, implement proper bcrypt hashing:
```bash
npm install bcrypt
npm install -D @types/bcrypt
```

Then update `lib/auth.ts` to use bcrypt instead of Base64.

## Troubleshooting

### OTP not received
- Verify RESEND_API_KEY is correct and set in environment
- Check email spam folder
- Verify sender domain permissions in Resend dashboard

### Database errors
- Ensure all SQL schema updates were run in Supabase
- Check RLS policies are created
- Verify user has correct permissions in Supabase

### Auth redirects to login
- Clear browser sessionStorage (dev tools → Application)
- Verify Supabase connection string is correct
- Check .env.local variables match your Supabase project

## Next Steps

1. Monitor email delivery in Resend dashboard
2. Implement proper password hashing (bcrypt) before full production
3. Add email confirmation for signup (optional)
4. Consider adding backup codes for account recovery
5. Implement reminder notifications for notes
