# Database Migration Notes for Telegram Integration

## New Tables Added

### telegram_chats
- Stores Telegram chat/channel information
- Links Telegram accounts to system users
- Tracks chat types (channel, private, group) and status

### telegram_answers  
- Stores student answers submitted via Telegram
- Tracks checking status and results
- Links answers to tests and students

## Migration Commands

After setting up the environment variables, run:

```bash
cd backend
npm run migration:generate
npm run migration:run
```

## Required Environment Variables

Add to your `.env` file:
```env
TELEGRAM_BOT_TOKEN=your-telegram-bot-token-here
TELEGRAM_WEBHOOK_URL=https://your-domain.com/telegram/webhook
```

## Post-Migration Setup

1. Create your Telegram bot via @BotFather
2. Set the webhook URL (for production)
3. Register channels/groups via the admin interface
4. Link students to their Telegram accounts

The system will automatically create the necessary database tables and relationships.