#!/usr/bin/env node

const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const channelUsername = '@lmstest1230';

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found in environment variables');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: false });

async function main() {
  try {
    console.log('🤖 Connecting to Telegram Bot...');
    
    // Test bot connection
    const botInfo = await bot.getMe();
    console.log(`✅ Bot connected: @${botInfo.username} (ID: ${botInfo.id})`);
    
    // Check channel status
    console.log(`\n🔍 Checking channel status for: ${channelUsername}`);
    
    try {
      // Get channel info
      const chatInfo = await bot.getChat(channelUsername);
      console.log(`📢 Channel found:`);
      console.log(`   • Title: ${chatInfo.title}`);
      console.log(`   • Type: ${chatInfo.type}`);
      console.log(`   • ID: ${chatInfo.id}`);
      console.log(`   • Username: @${chatInfo.username || 'no_username'}`);
      console.log(`   • Description: ${chatInfo.description || 'no_description'}`);
      
      // Check bot membership status
      try {
        const chatMember = await bot.getChatMember(chatInfo.id, botInfo.id);
        console.log(`\n👤 Bot status in channel:`);
        console.log(`   • Status: ${chatMember.status}`);
        console.log(`   • Can post messages: ${chatMember.can_post_messages || 'N/A'}`);
        console.log(`   • Can edit messages: ${chatMember.can_edit_messages || 'N/A'}`);
        console.log(`   • Can delete messages: ${chatMember.can_delete_messages || 'N/A'}`);
        console.log(`   • Can invite users: ${chatMember.can_invite_users || 'N/A'}`);
        
        if (['administrator', 'creator'].includes(chatMember.status)) {
          console.log('✅ Bot has admin privileges');
          
          // Try to generate invite link
          try {
            const inviteLink = await bot.exportChatInviteLink(chatInfo.id);
            console.log(`\n🔗 Generated invite link: ${inviteLink}`);
          } catch (inviteError) {
            console.log(`\n❌ Failed to generate invite link: ${inviteError.message}`);
          }
          
          // Test sending a message
          try {
            const testMessage = '🧪 Test message from Universal LMS Bot - channel connected successfully!';
            await bot.sendMessage(chatInfo.id, testMessage);
            console.log('✅ Test message sent successfully');
          } catch (sendError) {
            console.log(`❌ Failed to send test message: ${sendError.message}`);
          }
          
        } else {
          console.log('⚠️ Bot is not an admin. Please add bot as admin with the following permissions:');
          console.log('   • Post messages');
          console.log('   • Edit messages');
          console.log('   • Delete messages');
          console.log('   • Invite users via link');
        }
        
      } catch (memberError) {
        console.log(`❌ Bot is not a member of the channel: ${memberError.message}`);
        console.log('Please add the bot to the channel first:');
        console.log(`   1. Go to ${channelUsername}`);
        console.log(`   2. Add @${botInfo.username} as administrator`);
        console.log('   3. Grant required permissions');
      }
      
    } catch (chatError) {
      console.log(`❌ Channel not found or not accessible: ${chatError.message}`);
      console.log('Possible issues:');
      console.log('   • Channel username might be incorrect');
      console.log('   • Channel might be private');
      console.log('   • Bot needs to be added to the channel first');
    }
    
    // Provide setup instructions
    console.log('\n📋 Setup Instructions:');
    console.log(`1. Make sure the channel ${channelUsername} exists`);
    console.log(`2. Add @${botInfo.username} to the channel as administrator`);
    console.log('3. Grant the following permissions:');
    console.log('   • Post messages ✅');
    console.log('   • Edit messages ✅');
    console.log('   • Delete messages ✅');
    console.log('   • Invite users via link ✅');
    console.log('4. Run this script again to verify setup');
    
    console.log('\n🔧 Database Registration Command:');
    console.log('After fixing permissions, register the channel in your database using:');
    console.log(`POST /telegram/chats with data:`);
    console.log(JSON.stringify({
      chatId: channelUsername,
      type: 'channel',
      title: 'Test Channel',
      username: channelUsername,
      // Add your center and subject IDs here
    }, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
