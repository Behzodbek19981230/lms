#!/bin/bash

# Telegram Bot Setup Script for Universal LMS
# This script helps you set up the Telegram bot webhook

echo "🤖 Universal LMS Telegram Bot Setup"
echo "======================================"

# Check if environment variables are set
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ TELEGRAM_BOT_TOKEN is not set in environment variables"
    echo "Please add it to your .env file:"
    echo "TELEGRAM_BOT_TOKEN=your_bot_token_here"
    exit 1
fi

if [ -z "$TELEGRAM_WEBHOOK_URL" ]; then
    echo "❌ TELEGRAM_WEBHOOK_URL is not set in environment variables"
    echo "Please add it to your .env file:"
    echo "TELEGRAM_WEBHOOK_URL=https://yourdomain.com/telegram/webhook"
    exit 1
fi

echo "✅ Environment variables found"

# Set webhook URL
echo "🔧 Setting up webhook..."
WEBHOOK_RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"${TELEGRAM_WEBHOOK_URL}\"}")

echo "📡 Webhook response: $WEBHOOK_RESPONSE"

# Check if webhook was set successfully
if echo "$WEBHOOK_RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Webhook set successfully!"
else
    echo "❌ Failed to set webhook"
    echo "Response: $WEBHOOK_RESPONSE"
    exit 1
fi

# Get webhook info
echo "🔍 Getting webhook info..."
WEBHOOK_INFO=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo")
echo "📋 Webhook info: $WEBHOOK_INFO"

# Set bot commands
echo "🎯 Setting bot commands..."
COMMANDS='[
    {"command": "start", "description": "Register with the bot"},
    {"command": "help", "description": "Get help and instructions"},
    {"command": "status", "description": "Check your registration status"}
]'

COMMANDS_RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyCommands" \
    -H "Content-Type: application/json" \
    -d "{\"commands\":$COMMANDS}")

if echo "$COMMANDS_RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Bot commands set successfully!"
else
    echo "⚠️  Failed to set bot commands (non-critical)"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Start your backend server"
echo "2. Test the webhook by sending /start to your bot"
echo "3. Check the server logs for webhook events"
echo "4. Have teachers register channels using the admin panel"
echo ""
echo "🔗 Bot link: https://t.me/$(curl -s https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe | grep -o '"username":"[^"]*"' | cut -d'"' -f4)"