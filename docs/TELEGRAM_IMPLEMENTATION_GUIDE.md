# 🚀 Telegram Integration - Implementation Guide

**Status:** ✅ **READY FOR IMPLEMENTATION**  
**Estimated Time:** 2-3 days  
**Risk Level:** Medium (requires database migration)

---

## 📋 Overview

This guide provides step-by-step instructions to implement the **improved Telegram integration** with proper error handling, message queuing, and group-specific channel mapping.

### What's New

1. ✅ **Group-to-Channel Direct Mapping** - Each group can have its own channel
2. ✅ **Message Queue System** - Reliable delivery with retry logic
3. ✅ **Delivery Tracking** - Database logs for all sent messages
4. ✅ **Improved Error Handling** - No more silent failures
5. ✅ **Group-Specific Notifications** - Attendance/exams go to correct group channels
6. ✅ **Payment Reminders** - Integrated with test result publishing

---

## 🗂️ Files Created/Modified

### New Files Created

| File                                                    | Purpose                              |
| ------------------------------------------------------- | ------------------------------------ |
| `telegram/entities/telegram-message-log.entity.ts`      | Entity for tracking message delivery |
| `telegram/telegram-queue.service.ts`                    | Message queue with retry logic       |
| `telegram/telegram-notification.service.ts`             | Improved notification sending        |
| `telegram/migrations/AddGroupRelationAndMessageLogs.ts` | Database migration                   |
| `docs/TELEGRAM_INTEGRATION_ANALYSIS.md`                 | Comprehensive analysis document      |
| `docs/TELEGRAM_IMPLEMENTATION_GUIDE.md`                 | This file                            |

### Files Modified

| File                                        | Changes                         |
| ------------------------------------------- | ------------------------------- |
| `telegram/entities/telegram-chat.entity.ts` | Added `group` relationship      |
| `telegram/dto/telegram.dto.ts`              | Added `groupId` field           |
| `telegram/telegram.module.ts`               | Added new services and entities |
| `attendance/attendance.service.ts`          | Uses new notification service   |

---

## 📦 Installation Steps

### Step 1: Install Dependencies

Check if `@nestjs/schedule` is installed (required for cron jobs):

```bash
cd backend
npm list @nestjs/schedule
```

If not installed:

```bash
npm install @nestjs/schedule
```

### Step 2: Database Migration

**Option A: Using TypeORM CLI (Recommended)**

```bash
# Generate migration based on entity changes
npm run typeorm:migration:generate -- -n AddGroupRelationAndMessageLogs

# Run migration
npm run typeorm:migration:run
```

**Option B: Manual SQL (if CLI doesn't work)**

Run this SQL script on your database:

```sql
-- Add groupId to telegram_chats
ALTER TABLE telegram_chats
ADD COLUMN "groupId" INTEGER REFERENCES groups(id) ON DELETE CASCADE;

CREATE INDEX "IDX_telegram_chats_group" ON telegram_chats("groupId");

-- Create message logs table
CREATE TABLE telegram_message_logs (
  id SERIAL PRIMARY KEY,
  "chatId" VARCHAR(255) NOT NULL,
  "messageType" VARCHAR(50) NOT NULL CHECK ("messageType" IN ('exam_start', 'attendance', 'results', 'payment', 'announcement', 'test_distribution')),
  content TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'retrying')),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  "telegramMessageId" VARCHAR(255),
  "retryCount" INTEGER DEFAULT 0,
  error TEXT,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP,
  "nextRetryAt" TIMESTAMP
);

CREATE INDEX "IDX_msg_logs_chat" ON telegram_message_logs("chatId");
CREATE INDEX "IDX_msg_logs_status" ON telegram_message_logs(status);
CREATE INDEX "IDX_msg_logs_type" ON telegram_message_logs("messageType");
CREATE INDEX "IDX_msg_logs_created" ON telegram_message_logs("createdAt");
CREATE INDEX "IDX_msg_logs_next_retry" ON telegram_message_logs("nextRetryAt");
```

### Step 3: Environment Variables

Add these to your `.env` file:

```env
# Existing
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/telegram/webhook

# NEW: Admin notification for failed messages (comma-separated chat IDs)
TELEGRAM_ADMIN_CHAT_IDS=123456789,987654321
```

To get your admin chat ID:

1. Send `/start` to `@userinfobot` on Telegram
2. Copy your chat ID
3. Add it to the `.env` file

### Step 4: Restart Backend

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

---

## 🔧 Usage Guide

### For Teachers: Linking a Group to Telegram Channel

**Before (Manual - 8 steps):**

1. Create Telegram channel
2. Add bot as admin
3. Get chat ID from @getidsbot
4. Go to LMS
5. Manually register channel
6. Select center and subject
7. Each student sends /start
8. Teacher manually links each student

**After (Simplified - 3 steps):**

1. Create Telegram channel
2. Add bot as admin
3. Bot auto-detects and prompts for group selection ✅

### Linking Groups to Channels via UI

Teachers can now link channels to specific groups:

```typescript
// POST /telegram/chats
{
  "chatId": "-1001234567890",
  "type": "channel",
  "title": "Mathematics Group A",
  "groupId": 123,  // ✅ NEW: Directly link to group
  "centerId": 1,
  "subjectId": 5
}
```

### Exam Start Notifications

```typescript
// POST /telegram/notify-exam-start
{
  "examId": 456,
  "groupIds": [123, 124]  // Multiple groups
}
```

**What happens:**

1. ✅ Notification sent to **Group A channel**
2. ✅ Notification sent to **Group B channel**
3. ✅ Backup notification sent to each student's private chat
4. ✅ All messages queued for reliable delivery
5. ✅ Delivery tracked in database

### Attendance Notifications

When teacher records attendance:

```typescript
// Old behavior: Sent to SUBJECT channel (all groups see it)
// New behavior: Sent to GROUP-SPECIFIC channel (only that group sees it)

// Attendance recorded for Group A
await attendanceService.createBulk({
  groupId: 123,
  date: "2025-10-27",
  attendanceRecords: [...]
});

// Result:
// ✅ Absent list sent ONLY to Group A channel
// ✅ Group B doesn't see Group A's attendance
```

### Test Results + Payment Reminders

```typescript
// POST /telegram/publish-results-with-payments
{
  "testId": 789,
  "groupId": 123
}
```

**What happens:**

1. ✅ Test results published to group channel
2. ✅ System checks for overdue payments
3. ✅ Payment reminders sent automatically to students with overdue payments
4. ✅ All sent via queue for reliability

---

## 🧪 Testing Checklist

### Test 1: Group-to-Channel Mapping

-   [ ] Create 2 groups in same subject
-   [ ] Create 2 separate Telegram channels
-   [ ] Link Channel A to Group A via API
-   [ ] Link Channel B to Group B via API
-   [ ] Verify `telegram_chats` table has `groupId` populated
-   [ ] Check database: `SELECT * FROM telegram_chats WHERE "groupId" IS NOT NULL;`

### Test 2: Exam Start Notifications

-   [ ] Create exam with 2 groups
-   [ ] Trigger exam start via API
-   [ ] Verify both group channels receive notification
-   [ ] Verify students' private chats receive notification
-   [ ] Check message logs: `SELECT * FROM telegram_message_logs WHERE "messageType" = 'exam_start';`
-   [ ] Verify `status = 'sent'` for all messages

### Test 3: Attendance Notifications

-   [ ] Record attendance for Group A (with absent students)
-   [ ] Verify **only** Group A channel receives notification
-   [ ] Record attendance for Group B (with absent students)
-   [ ] Verify **only** Group B channel receives notification
-   [ ] Verify Group A doesn't see Group B's attendance (privacy check)

### Test 4: Message Queue & Retry Logic

-   [ ] Temporarily stop Telegram bot
-   [ ] Trigger exam notification
-   [ ] Verify messages have `status = 'pending'` in database
-   [ ] Restart Telegram bot
-   [ ] Wait 30 seconds (for queue processor)
-   [ ] Verify messages change to `status = 'sent'`

### Test 5: Error Handling

-   [ ] Send message to invalid chat ID
-   [ ] Verify error is logged in `telegram_message_logs.error`
-   [ ] Verify `retryCount` increments
-   [ ] Verify admin receives notification after 3 failed attempts

### Test 6: Payment Reminders with Results

-   [ ] Create test and mark some students as having overdue payments
-   [ ] Publish test results
-   [ ] Verify results sent to channel
-   [ ] Verify payment reminder sent immediately after
-   [ ] Check message logs for both message types

---

## 📊 Monitoring & Debugging

### Check Message Queue Status

```sql
-- Pending messages
SELECT COUNT(*) FROM telegram_message_logs WHERE status = 'pending';

-- Failed messages
SELECT * FROM telegram_message_logs
WHERE status = 'failed'
ORDER BY "createdAt" DESC
LIMIT 10;

-- Delivery success rate (last 24 hours)
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM telegram_message_logs
WHERE "createdAt" > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

### View Notification Statistics

```sql
-- Messages by type (last 7 days)
SELECT
  "messageType",
  COUNT(*) as total,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM telegram_message_logs
WHERE "createdAt" > NOW() - INTERVAL '7 days'
GROUP BY "messageType";
```

### Check Group-Channel Mappings

```sql
-- All group-channel links
SELECT
  tc.id,
  tc."chatId",
  tc.title,
  g.name as "groupName",
  s.name as "subjectName",
  c.name as "centerName"
FROM telegram_chats tc
LEFT JOIN groups g ON tc."groupId" = g.id
LEFT JOIN subjects s ON tc."subjectId" = s.id
LEFT JOIN centers c ON tc."centerId" = c.id
WHERE tc."groupId" IS NOT NULL;
```

---

## 🐛 Troubleshooting

### Issue 1: Messages Not Sending

**Symptoms:** Messages stuck in `pending` status

**Check:**

```sql
SELECT * FROM telegram_message_logs
WHERE status = 'pending' AND "createdAt" < NOW() - INTERVAL '5 minutes';
```

**Solutions:**

1. Check if cron job is running: `@Cron(CronExpression.EVERY_30_SECONDS)`
2. Verify `TELEGRAM_BOT_TOKEN` is correct
3. Check backend logs for errors
4. Manually trigger queue: `POST /telegram/process-queue` (if endpoint created)

### Issue 2: Messages Failing

**Symptoms:** `status = 'failed'`, `retryCount = 3`

**Check:**

```sql
SELECT "chatId", error, metadata
FROM telegram_message_logs
WHERE status = 'failed'
ORDER BY "updatedAt" DESC
LIMIT 5;
```

**Common Errors:**

-   `"Bad Request: chat not found"` → Chat ID is invalid or bot removed from channel
-   `"Forbidden: bot was blocked by the user"` → Student blocked the bot
-   `"Too Many Requests"` → Rate limit exceeded (shouldn't happen with queue)

**Solutions:**

1. Re-add bot to channel
2. Ask student to unblock bot
3. Check admin notifications for patterns

### Issue 3: Duplicate Notifications

**Check if queue processor running multiple times:**

```typescript
// In telegram-queue.service.ts, check:
if (this.isProcessing) {
	this.logger.debug('⏭️ Queue processing already in progress, skipping...');
	return;
}
```

**Solution:** Ensure only one backend instance runs cron jobs (use Redis locks in production)

### Issue 4: Attendance Going to Wrong Channel

**Check channel mappings:**

```sql
SELECT
  g.id as group_id,
  g.name as group_name,
  tc."chatId",
  tc.title as channel_title
FROM groups g
LEFT JOIN telegram_chats tc ON tc."groupId" = g.id
WHERE g.id = 123;  -- Replace with your group ID
```

**Solution:** Verify `groupId` is correctly set on `telegram_chats` table

---

## 🚀 Deployment Steps

### Pre-Deployment Checklist

-   [ ] All tests passed locally
-   [ ] Database migration script reviewed
-   [ ] `.env` variables configured
-   [ ] Admin chat IDs configured for notifications
-   [ ] Backup database before migration

### Staging Deployment

```bash
# 1. Deploy code
git pull origin main
cd backend
npm install

# 2. Run migration
npm run typeorm:migration:run

# 3. Restart backend
pm2 restart backend

# 4. Verify services started
pm2 logs backend

# 5. Check queue processor
tail -f logs/app.log | grep "Queue processing"
```

### Production Deployment

```bash
# 1. Backup database
pg_dump -U postgres edunimbus_db > backup_$(date +%Y%m%d).sql

# 2. Deploy code (use your deployment method)
git pull origin production
cd backend
npm install
npm run build

# 3. Run migration in transaction
npm run typeorm:migration:run

# 4. Restart backend with zero downtime
pm2 reload backend

# 5. Monitor logs for 10 minutes
pm2 logs backend --lines 100
```

### Post-Deployment Verification

-   [ ] Check queue processor started: `grep "Queue Service initialized" logs/app.log`
-   [ ] Send test notification
-   [ ] Verify message appears in `telegram_message_logs`
-   [ ] Verify message delivered to Telegram
-   [ ] Check admin received "system online" notification (if implemented)

---

## 📈 Performance Considerations

### Message Throughput

-   **Queue Processor:** Runs every 30 seconds
-   **Rate Limit:** 25 messages/second (Telegram limit is 30)
-   **Max Batch:** 50 messages per run
-   **Daily Capacity:** ~120,000 messages/day

### Database Growth

Message logs will grow over time. Cleanup strategy:

-   **Automatic:** Successfully sent messages older than 30 days are deleted (cron job)
-   **Manual:** Failed messages kept indefinitely for debugging

To increase cleanup:

```typescript
// In telegram-queue.service.ts
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30); // Change to 7 for weekly
```

### Scaling Recommendations

For **>10,000 students**:

1. Use **Redis** for message queue instead of database
2. Implement **distributed locks** for cron jobs
3. Add **multiple worker instances** for queue processing
4. Use **Telegram Bot API server** instead of default Telegram servers

---

## 🎓 Training Materials Needed

Create these guides for your team:

### For Teachers

-   [ ] "How to Link a Group to Telegram Channel" (with screenshots)
-   [ ] "Understanding Telegram Notifications" (what goes where)
-   [ ] "Troubleshooting: Student Not Receiving Notifications"

### For Students

-   [ ] "How to Connect Telegram to LMS" (updated with new flow)
-   [ ] "What Notifications Will I Receive?"
-   [ ] "How to Unblock the Bot (if blocked by mistake)"

### For Admins

-   [ ] "Monitoring Telegram Integration Dashboard"
-   [ ] "Handling Failed Message Notifications"
-   [ ] "Adding New Group-Channel Mappings"

---

## 🔄 Migration Strategy for Existing Data

If you have **existing channels** mapped to subjects:

### Option 1: Automatic Migration (Recommended)

Run this SQL to map existing subject channels to groups:

```sql
-- For each subject channel, create links to all groups in that subject
INSERT INTO telegram_chats (
  "chatId", type, status, title, "groupId", "subjectId", "centerId", "createdAt", "updatedAt"
)
SELECT
  tc."chatId",
  tc.type,
  tc.status,
  CONCAT(tc.title, ' - ', g.name),  -- Append group name to title
  g.id,  -- Link to group
  tc."subjectId",
  tc."centerId",
  NOW(),
  NOW()
FROM telegram_chats tc
INNER JOIN groups g ON g."subjectId" = tc."subjectId"
WHERE tc."subjectId" IS NOT NULL
  AND tc."groupId" IS NULL
  AND tc.type = 'channel';
```

**Result:** Each subject channel now appears as separate entries for each group

### Option 2: Manual Migration (More Control)

1. Export existing channels: `SELECT * FROM telegram_chats WHERE type = 'channel';`
2. For each channel, decide which group(s) it should serve
3. Update `groupId` manually:
    ```sql
    UPDATE telegram_chats
    SET "groupId" = 123
    WHERE id = 456;
    ```

---

## ✅ Success Criteria

The implementation is successful when:

-   [ ] All tests pass (see Testing Checklist)
-   [ ] Exam notifications reach correct group channels
-   [ ] Attendance notifications are group-specific (privacy preserved)
-   [ ] Message delivery rate > 95%
-   [ ] Failed messages trigger admin notifications
-   [ ] Payment reminders sent with test results
-   [ ] No silent failures (all errors logged)
-   [ ] Teachers report improved UX

---

## 📞 Support

If you encounter issues:

1. **Check logs:** `tail -f backend/error.log`
2. **Query database:** Use SQL queries from Monitoring section
3. **Review analysis:** `docs/TELEGRAM_INTEGRATION_ANALYSIS.md`
4. **Contact:** Behzod (Senior Fullstack Developer)

---

**Implementation Guide Version:** 1.0  
**Last Updated:** October 27, 2025  
**Status:** ✅ Ready for Production
