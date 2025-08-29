#!/usr/bin/env node

/**
 * Telegram Webhook Setup Script for Universal-uz.uz LMS
 * 
 * This script sets up the webhook for your Telegram bot.
 * Usage: node setup-webhook.js <BOT_TOKEN>
 */

const https = require('https');

const WEBHOOK_URL = 'https://lms.api.universal-uz.uz/telegram/webhook';

function setupWebhook(botToken) {
  if (!botToken) {
    console.error('❌ Error: Bot token is required');
    console.log('Usage: node setup-webhook.js <BOT_TOKEN>');
    console.log('Example: node setup-webhook.js 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ');
    process.exit(1);
  }

  const url = `https://api.telegram.org/bot${botToken}/setWebhook`;
  const data = JSON.stringify({
    url: WEBHOOK_URL,
    drop_pending_updates: true, // Clear any pending updates
  });

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
    },
  };

  console.log('🔄 Setting up Telegram webhook...');
  console.log(`📡 Webhook URL: ${WEBHOOK_URL}`);
  console.log(`🤖 Bot Token: ${botToken.substring(0, 10)}...`);

  const req = https.request(url, options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      try {
        const result = JSON.parse(responseData);
        
        if (result.ok) {
          console.log('✅ Webhook setup successful!');
          console.log('📋 Response:', result.description || 'Webhook was set');
          console.log('\n🎉 Your Telegram bot is now ready to receive messages!');
          console.log('\n📚 Next steps:');
          console.log('1. Add your bot to Telegram channels as an admin');
          console.log('2. Register channels in your LMS admin panel');
          console.log('3. Start sending tests to students!');
        } else {
          console.error('❌ Webhook setup failed!');
          console.error('Error:', result.description);
          console.error('Full response:', result);
        }
      } catch (error) {
        console.error('❌ Failed to parse response:', error);
        console.error('Raw response:', responseData);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
  });

  req.write(data);
  req.end();
}

// Check webhook info
function checkWebhook(botToken) {
  const url = `https://api.telegram.org/bot${botToken}/getWebhookInfo`;

  console.log('🔍 Checking current webhook status...');

  https.get(url, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      try {
        const result = JSON.parse(responseData);
        
        if (result.ok) {
          const info = result.result;
          console.log('\n📊 Current Webhook Info:');
          console.log(`URL: ${info.url || 'Not set'}`);
          console.log(`Pending updates: ${info.pending_update_count || 0}`);
          console.log(`Max connections: ${info.max_connections || 'Not set'}`);
          console.log(`Last error: ${info.last_error_message || 'None'}`);
          
          if (info.url === WEBHOOK_URL) {
            console.log('✅ Webhook is correctly configured!');
          } else if (info.url) {
            console.log('⚠️  Webhook URL differs from expected');
            console.log(`Expected: ${WEBHOOK_URL}`);
            console.log(`Current:  ${info.url}`);
          } else {
            console.log('⚠️  No webhook is currently set');
          }
        } else {
          console.error('❌ Failed to get webhook info:', result.description);
        }
      } catch (error) {
        console.error('❌ Failed to parse response:', error);
      }
    });
  }).on('error', (error) => {
    console.error('❌ Request failed:', error.message);
  });
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];
const botToken = args[1] || args[0];

if (command === 'check' && args[1]) {
  checkWebhook(args[1]);
} else if (command === '--help' || command === '-h') {
  console.log('🤖 Telegram Webhook Setup for Universal-uz.uz LMS\n');
  console.log('Commands:');
  console.log('  node setup-webhook.js <BOT_TOKEN>     Set up webhook');
  console.log('  node setup-webhook.js check <TOKEN>   Check webhook status');
  console.log('  node setup-webhook.js --help          Show this help');
  console.log('\nExample:');
  console.log('  node setup-webhook.js 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ');
} else if (botToken && botToken.includes(':')) {
  setupWebhook(botToken);
} else {
  console.log('🤖 Telegram Webhook Setup for Universal-uz.uz LMS\n');
  console.log('❌ Please provide a valid bot token');
  console.log('Usage: node setup-webhook.js <BOT_TOKEN>');
  console.log('Example: node setup-webhook.js 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ');
  console.log('\nTo get your bot token:');
  console.log('1. Message @BotFather on Telegram');
  console.log('2. Use /newbot command');
  console.log('3. Follow the instructions');
  console.log('4. Copy the token provided');
}