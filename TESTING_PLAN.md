# Telegram Integration Testing Plan

## Overview

This document outlines the testing plan for the Telegram integration fixes to ensure students can properly connect and join channels.

## Test Cases

### 1. Student Authentication Flow

**Objective**: Verify that students can properly authenticate with Telegram

**Steps**:

1. Create a test student user in the system
2. Have the student connect their Telegram account via the widget
3. Verify that the student's Telegram information is correctly stored
4. Check that the student's role is properly identified

**Expected Results**:

-   Student's Telegram account is linked to their LMS account
-   Student's role is correctly identified as "student"
-   Student's center information is properly associated

### 2. Channel Invitation System

**Objective**: Verify that students receive appropriate channel invitations based on their role and groups

**Steps**:

1. Create test channels for different groups and subjects
2. Assign the test student to specific groups
3. Have the student connect their Telegram account
4. Check that the student receives invitations to the correct channels

**Expected Results**:

-   Student receives invitations to channels associated with their groups
-   Student receives invitations to channels associated with their subjects
-   Student receives invitations to center-wide channels as a fallback
-   Channel invitations include proper context information (group/subject/center names)

### 3. Welcome Message with Role Information

**Objective**: Verify that students receive a welcome message with their role information

**Steps**:

1. Have a student connect their Telegram account
2. Check the welcome message sent to the student

**Expected Results**:

-   Welcome message includes the student's role ("🎓 Talaba")
-   Welcome message lists available channels with proper context
-   Welcome message includes instructions for joining channels

### 4. Status Tracking

**Objective**: Verify that user activity is properly tracked

**Steps**:

1. Have a student send a message to the bot
2. Check that the user's last activity timestamp is updated

**Expected Results**:

-   User's lastActivity timestamp is updated when they interact with the bot
-   User's activity is properly tracked in the system

### 5. Teacher/Admin Authentication Flow

**Objective**: Verify that teachers and admins also work correctly

**Steps**:

1. Create test teacher and admin users
2. Have them connect their Telegram accounts
3. Verify they receive appropriate channel invitations

**Expected Results**:

-   Teachers and admins receive invitations to center-wide channels
-   Their roles are properly identified in welcome messages
-   They can access appropriate functionality based on their roles

## Test Environment Setup

1. Set up a test center with multiple groups and subjects
2. Create test channels for different groups and subjects
3. Create test users with different roles (student, teacher, admin)
4. Configure the Telegram bot with proper permissions

## Test Execution

### Test 1: Student Authentication Flow

-   [ ] Create test student user
-   [ ] Connect Telegram account via widget
-   [ ] Verify Telegram information stored correctly
-   [ ] Verify student role identified correctly

### Test 2: Channel Invitation System

-   [ ] Create test channels for groups/subjects
-   [ ] Assign student to groups
-   [ ] Connect student's Telegram account
-   [ ] Verify correct channel invitations received

### Test 3: Welcome Message with Role Information

-   [ ] Connect student's Telegram account
-   [ ] Verify welcome message includes role information
-   [ ] Verify channel invitations with context

### Test 4: Status Tracking

-   [ ] Have student send message to bot
-   [ ] Verify lastActivity timestamp updated

### Test 5: Teacher/Admin Authentication Flow

-   [ ] Create test teacher/admin users
-   [ ] Connect their Telegram accounts
-   [ ] Verify appropriate channel invitations
-   [ ] Verify role information in welcome messages

## Expected Outcomes

After implementing these fixes, the Telegram integration should work as follows:

1. **Students**:

    - Can connect their Telegram accounts
    - Receive invitations to channels based on their groups and subjects
    - See their role information in welcome messages
    - Have their activity properly tracked

2. **Teachers/Admins**:

    - Can connect their Telegram accounts
    - Receive invitations to center-wide channels
    - See their role information in welcome messages
    - Have their activity properly tracked

3. **Channel Management**:
    - Channels are properly associated with groups, subjects, and centers
    - Invitations include proper context information
    - Students can easily join relevant channels
