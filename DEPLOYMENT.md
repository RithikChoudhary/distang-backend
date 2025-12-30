# Deployment Guide for Codex Backend

## Environment Variables for Railway/Production

Set these environment variables in your Railway dashboard:

```
PORT=3000
NODE_ENV=production
MONGODB_URI=mongodb+srv://admin:admin@examfit.oshk5.mongodb.net/codex_couples
JWT_SECRET=codex-couples-super-secret-jwt-key-2024
JWT_EXPIRES_IN=30d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
EMAIL_FROM=Codex Couples <noreply@codexcouples.com>
CORS_ORIGINS=*
```

## MongoDB Collections (Auto-created)

The following collections will be automatically created by Mongoose:
- `users` - User accounts
- `couples` - Partner relationships
- `consents` - Privacy consent settings
- `memories` - Shared photos/memories
- `messages` - Chat messages
- `streaks` - Daily streak photos
- `importantdates` - Calendar events
- `locationshares` - Location data
- `buzzes` - Walkie-talkie buzzes
- `voicemessages` - Voice messages
- `callstatuses` - On-call status
- `otps` - One-time passwords
- `questions` - Question prompts
- `questionanswers` - Question answers

## Deployment Steps

1. Push code to GitHub
2. Connect Railway to your GitHub repo
3. Add environment variables
4. Deploy!

Railway URL will be: https://your-app-name.up.railway.app

