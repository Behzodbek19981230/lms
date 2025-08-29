# Telegram Integration Setup Guide

This guide will help you set up the Telegram integration for the Learning Management System (LMS).

## Features

- **📤 Test Distribution**: Automatically send tests to Telegram channels when created
- **📝 Answer Submission**: Students can submit answers directly in Telegram chats
- **✅ Automatic Checking**: Answers are checked automatically and results sent back
- **📊 Results Publishing**: Test results are published to channels for teachers and parents

## Setup Instructions

### 1. Create a Telegram Bot

1. Message @BotFather on Telegram
2. Use `/newbot` command to create a new bot
3. Choose a name and username for your bot
4. Save the bot token provided by BotFather

### 2. Configure Environment Variables

Add these variables to your `.env` file:

```env
TELEGRAM_BOT_TOKEN=your-telegram-bot-token-here
TELEGRAM_WEBHOOK_URL=https://lms.api.universal-uz.uz/telegram/webhook
```

### 3. Set Up Webhook (Production)

For production deployment, set up a webhook to receive messages:

```bash
curl -F "url=https://lms.api.universal-uz.uz/telegram/webhook" \
     https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```

### 4. Create Channels and Groups

1. **Create Channels**: For each class/group, create a Telegram channel where tests and results will be posted
2. **Add Bot as Admin**: Add your bot as an administrator to all channels
3. **Get Channel IDs**: Use the `/start` command with your bot to get channel IDs

### 5. Link Users to Telegram

Students need to link their LMS accounts with their Telegram accounts:

1. Students message your bot with `/start`
2. Use the admin interface to link Telegram users to LMS users
3. Configure which channels belong to which groups/centers

## API Endpoints

### Send Test to Channel
```http
POST /telegram/send-test
{
  "testId": 123,
  "channelId": "@your_channel",
  "customMessage": "New test available!"
}
```

### Register Chat/Channel
```http
POST /telegram/chats
{
  "chatId": "@your_channel",
  "type": "channel",
  "title": "Math Class Channel"
}
```

### Get Test Statistics
```http
GET /telegram/statistics/123
```

## Usage Workflow

### For Teachers:
1. Create a test in the LMS
2. Test is automatically sent to configured Telegram channels
3. Monitor results in real-time via the API or dashboard

### For Students:
1. Receive test notification in Telegram channel
2. Answer questions using format: `#T123Q1 A` (Test 123, Question 1, Answer A)
3. Get immediate feedback on each answer
4. View final results when published to channel

### For Parents:
1. Join the class channel to see tests and results
2. Monitor their child's progress through result publications

## Answer Format

Students submit answers using this format:
- `#T123Q1 A` - Test 123, Question 1, Answer A
- `#T123Q2 B` - Test 123, Question 2, Answer B
- `#T123Q3 Programming` - Test 123, Question 3, Text answer

## Commands

### Bot Commands:
- `/start` - Register with the bot
- `/help` - Get help information

### Admin Commands (via API):
- Link users to Telegram accounts
- Configure channels for groups
- Publish results manually
- Get statistics

## Security Notes

- Bot tokens should be kept secure
- Use HTTPS for webhooks in production
- Validate all incoming webhook data
- Implement rate limiting for answer submissions

## Troubleshooting

### Common Issues:

1. **Bot not receiving messages**: Check webhook URL and SSL certificate
2. **Can't send to channel**: Ensure bot is admin of the channel
3. **Users not linked**: Students need to message bot first
4. **Answers not recognized**: Check answer format and test ID

### Debug Mode:

Enable debug logging by setting `NODE_ENV=development` to see detailed Telegram interaction logs.