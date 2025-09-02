-- Database Migration Script: Replace email with username
-- This script renames the email column to username in the users table
-- and updates related indexes and constraints

-- Step 1: Start transaction to ensure atomicity
BEGIN TRANSACTION;

-- Step 2: Add username column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255);

-- Step 3: Copy email data to username (if email column still exists)
DO $$
BEGIN
    -- Check if email column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email'
    ) THEN
        -- Copy data from email to username
        UPDATE users SET username = email WHERE username IS NULL;
        
        -- Make username NOT NULL after copying data
        ALTER TABLE users ALTER COLUMN username SET NOT NULL;
        
        -- Add unique constraint to username
        ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
        
        -- Drop email column and its constraints
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_unique;
        ALTER TABLE users DROP COLUMN email;
        
        RAISE NOTICE 'Successfully migrated email to username column';
    ELSE
        -- If email column doesn't exist, just ensure username is properly configured
        ALTER TABLE users ALTER COLUMN username SET NOT NULL;
        ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_username_unique UNIQUE (username);
        RAISE NOTICE 'Username column already exists and is properly configured';
    END IF;
END $$;

-- Step 4: Update indexes
-- Drop old email index if it exists
DROP INDEX IF EXISTS idx_users_email;

-- Create username index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Step 5: Update any foreign key references or related tables if needed
-- Note: Check for any tables that might reference users by email
-- These would need to be updated as well

-- Step 6: Verify the changes
DO $$
DECLARE
    username_count INTEGER;
    unique_count INTEGER;
BEGIN
    -- Check that all users have usernames
    SELECT COUNT(*) INTO username_count FROM users WHERE username IS NOT NULL;
    SELECT COUNT(DISTINCT username) INTO unique_count FROM users;
    
    IF username_count = unique_count THEN
        RAISE NOTICE 'Migration verification successful: % users with unique usernames', username_count;
    ELSE
        RAISE EXCEPTION 'Migration verification failed: username count % != unique count %', username_count, unique_count;
    END IF;
END $$;

-- Commit the transaction
COMMIT;

-- Final verification query
SELECT 
    'users' as table_name,
    COUNT(*) as total_users,
    COUNT(DISTINCT username) as unique_usernames,
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT username) THEN 'PASS'
        ELSE 'FAIL'
    END as verification_status
FROM users;

-- Show table structure after migration
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
