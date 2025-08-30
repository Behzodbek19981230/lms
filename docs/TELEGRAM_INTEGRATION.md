# Telegram Bot Integration Guide

This document explains how to set up and use the Telegram bot integration for Universal LMS.

## 🚀 Quick Setup

### 1. Create a Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow the instructions to create your bot
4. Save the bot token (format: `123456789:ABCdef...`)

### 2. Configure Environment Variables

Add these variables to your `.env` file:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/telegram/webhook

# Optional: For local development
TELEGRAM_WEBHOOK_URL=https://your-ngrok-url.ngrok.io/telegram/webhook
```

### 3. Run Setup Script

```bash
chmod +x scripts/setup-telegram-bot.sh
./scripts/setup-telegram-bot.sh
```

### 4. Start Your Backend Server

```bash
npm run start:dev
```

## 👥 User Workflow

### For Students

1. **Connect Account**:
   - Visit `/account/telegram-user` in the LMS
   - Click "Connect to Telegram"
   - Open Telegram and send `/start` to the bot
   - Wait for teacher to link the account

2. **Join Channels**:
   - After account linking, return to LMS dashboard
   - Click "Join Channel" buttons for your classes
   - Join the channels in Telegram

3. **Answer Tests**:
   - Receive test notifications in channels
   - Answer using format: `#T123Q1 A`
   - Get immediate feedback
   - View final results when published

### For Teachers/Admins

1. **Register Channels**:
   - Visit `/account/telegram` in the LMS
   - Register your Telegram channels/groups
   - Generate invite links for students

2. **Link Student Accounts**:
   - Students must send `/start` to bot first
   - Use "Link Telegram Users" section
   - Select LMS user and Telegram user
   - Click "Link Users"

3. **Send Tests**:
   - Use "Send Test to Channel" section
   - Select test and channel
   - Add custom message if needed
   - Test is automatically posted with questions

4. **Publish Results**:
   - After students answer, publish results
   - Click "Publish Results" for specific tests
   - Results are formatted and sent to channel

## 🤖 Bot Commands

- `/start` - Register with the bot
- `/help` - Get help and instructions
- `/status` - Check registration status (planned)

## 📝 Answer Format

Students answer tests using this format:
```
#T123Q1 A
#T123Q2 B
#T123Q3 C
```

Where:
- `T123` = Test ID (shown in channel)
- `Q1` = Question number
- `A` = Answer (A, B, C, D, or text)

## 🔧 API Endpoints

### User Endpoints (Authenticated)
- `GET /telegram/user-status` - Get user's Telegram status
- `POST /telegram/register-user` - Register user to bot

### Admin Endpoints (Teacher+)
- `POST /telegram/chats` - Register new chat/channel
- `POST /telegram/link-telegram-user` - Link Telegram user to LMS user
- `GET /telegram/unlinked-users` - Get unlinked Telegram users
- `POST /telegram/generate-invite/{channelId}` - Generate invite link
- `POST /telegram/send-test` - Send test to channel
- `POST /telegram/publish-results/{testId}/{channelId}` - Publish results

### Webhook Endpoints
- `POST /telegram/webhook` - Receive Telegram updates

## 🚨 Troubleshooting

### Bot Not Responding
1. Check `TELEGRAM_BOT_TOKEN` in environment
2. Verify webhook is set correctly
3. Check server logs for webhook events
4. Ensure bot is not blocked by user

### Webhook Issues
1. URL must be HTTPS (use ngrok for local development)
2. Check firewall/security groups
3. Verify webhook URL is accessible
4. Check server logs for incoming requests

### User Linking Problems
1. Ensure user sent `/start` to bot first
2. Check "Unlinked Users" list in admin panel
3. Verify correct LMS user is selected
4. Check server logs for linking errors

### Channel Registration Issues
1. Add bot as admin to channel with following permissions:
   - Send messages
   - Delete messages
   - Invite users via link
2. Use correct chat ID format:
   - Channels: `-1001234567890` or `@channelname`
   - Groups: `-1234567890`
   - Private: User's Telegram ID

## 📱 Development Setup

### Local Development with ngrok

1. Install ngrok: https://ngrok.com/
2. Expose your local server:
   ```bash
   ngrok http 3001
   ```
3. Update webhook URL in `.env`:
   ```env
   TELEGRAM_WEBHOOK_URL=https://abc123.ngrok.io/telegram/webhook
   ```
4. Run setup script to update webhook

### Testing

1. Create test bot with BotFather
2. Use test channels/groups
3. Test all user workflows
4. Check database for proper data storage
5. Verify webhook events in server logs

## 🔐 Security Considerations

1. **Bot Token Security**:
   - Never commit bot token to version control
   - Use environment variables
   - Rotate token if compromised

2. **Webhook Security**:
   - Use HTTPS only
   - Implement IP whitelisting if possible
   - Validate incoming webhook data

3. **User Data**:
   - Store minimal Telegram user data
   - Respect user privacy settings
   - Implement data deletion on user request

## 📊 Monitoring

Monitor these metrics:
- Webhook response time
- Failed webhook deliveries
- User registration success rate
- Answer submission accuracy
- Channel activity levels

Log important events:
- User registrations
- Account linking
- Test submissions
- Answer validations
- Error conditions

## 🔄 Maintenance

Regular tasks:
- Clean up old unlinked users
- Archive inactive channels
- Update bot commands as needed
- Monitor webhook performance
- Review error logs

## 📚 Additional Resources

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [BotFather Commands](https://core.telegram.org/bots#6-botfather)
- [Webhook Guide](https://core.telegram.org/bots/api#setwebhook)