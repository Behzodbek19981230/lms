# Telegram Bot Deployment Guide - Universal-uz.uz LMS

## Quick Setup for Your Domain

Your LMS is hosted at: `https://lms.api.universal-uz.uz/`
Your webhook endpoint will be: `https://lms.api.universal-uz.uz/telegram/webhook`

## Step-by-Step Setup

### 1. Create Telegram Bot

1. Open Telegram and message **@BotFather**
2. Send `/newbot` command
3. Choose a name for your bot (e.g., "Universal LMS Bot")
4. Choose a username (e.g., "universal_lms_bot")
5. Copy the bot token (format: `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`)

### 2. Configure Environment Variables

Create or update your `.env` file:

```env
# Add these lines to your .env file
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
TELEGRAM_WEBHOOK_URL=https://lms.api.universal-uz.uz/telegram/webhook
```

### 3. Deploy Backend Changes

Make sure your backend includes the Telegram module:

```bash
# Build and deploy your backend
cd backend
npm run build

# Restart your server
pm2 restart your-app-name
# OR
systemctl restart your-service
```

### 4. Set Up Webhook

Use our helper script:

```bash
# Navigate to telegram folder
cd backend/src/telegram

# Run webhook setup (replace with your actual bot token)
node setup-webhook.js 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
```

You should see:
```
✅ Webhook setup successful!
🎉 Your Telegram bot is now ready to receive messages!
```

### 5. Test the Setup

1. **Test webhook endpoint directly:**
   ```bash
   curl https://lms.api.universal-uz.uz/telegram/webhook
   ```

2. **Send a message to your bot:**
   - Find your bot on Telegram
   - Send `/start` command
   - Check your backend logs for webhook messages

3. **Check webhook status:**
   ```bash
   node setup-webhook.js check 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
   ```

### 6. Create Test Channels

1. **Create a Telegram channel** for your class/school
2. **Add your bot as admin** to the channel
3. **Get channel ID:**
   - Public channels: `@your_channel_name`
   - Private channels: Use bot to get numeric ID

### 7. Register Channels in LMS

1. Login to your LMS admin panel
2. Go to Telegram Management section
3. Register your channels:
   ```json
   {
     "chatId": "@universal_math_class",
     "type": "channel",
     "title": "Math Class - Universal School"
   }
   ```

## Testing the Complete Flow

### 1. Send a Test to Telegram

```bash
# Via API call
curl -X POST https://lms.api.universal-uz.uz/telegram/send-test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "testId": 1,
    "channelId": "@universal_math_class",
    "customMessage": "New Math Test Available!"
  }'
```

### 2. Student Answers via Telegram

Students can answer in the channel:
```
#T1Q1 A
#T1Q2 B
#T1Q3 C
```

### 3. View Results

Results will be automatically:
- Sent back to students individually
- Published to the channel as a summary

## Troubleshooting

### Common Issues:

1. **"Webhook setup failed"**
   - Check if your server is running
   - Verify SSL certificate is valid
   - Ensure port 443 is accessible

2. **"Bot not receiving messages"**
   - Verify webhook URL in browser
   - Check server logs for errors
   - Ensure bot has admin permissions in channels

3. **"Can't send to channel"**
   - Add bot as admin to the channel
   - Use correct channel ID format (@channel_name)

### Debug Commands:

```bash
# Check webhook status
curl https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo

# Remove webhook (for debugging)
curl -F "url=" https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook

# Test your endpoint
curl -X POST https://lms.api.universal-uz.uz/telegram/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## Security Notes

- Keep your bot token secure (never commit to git)
- Use HTTPS only (required by Telegram)
- Validate all incoming webhook data
- Implement rate limiting for answer submissions

## Support

If you encounter issues:
1. Check backend logs for errors
2. Verify webhook URL is accessible
3. Test bot token with Telegram API directly
4. Ensure proper SSL configuration

Your Telegram bot is now integrated with Universal-uz.uz LMS! 🚀