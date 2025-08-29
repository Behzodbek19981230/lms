# Test Management System

## Overview

This system allows teachers to manage tests by subject, edit existing tests, and manage questions within tests.

## Features

### 1. Subject-Based Test Viewing

-   **Location**: Teacher Dashboard → Click on any subject card
-   **Route**: `/account/subject/:subjectId/tests`
-   **Functionality**:
    -   View all tests for a specific subject
    -   See test details (title, description, type, status, duration, questions count)
    -   Quick access to edit tests and manage questions

### 2. Test Management

-   **Edit Test Properties**: Click the edit button on any test card
    -   Modify title, description, type, duration
    -   Toggle shuffle questions and show results options
-   **Delete Tests**: Remove tests (only draft tests can be deleted)
-   **Test Status**: View test status (Draft, Published, Archived)

### 3. Question Management

-   **Location**: Test card → Click "Savollar" button
-   **Route**: `/account/test/:testId/questions`
-   **Functionality**:
    -   Add new questions with multiple choice, single choice, open-ended, or true/false types
    -   Edit existing questions
    -   Delete questions
    -   Set points for each question
    -   Configure answer options and correct answers

## User Flow

### For Teachers:

1. **Login** to Teacher Dashboard
2. **View Subjects** - See all assigned subjects with test counts
3. **Click Subject** - Navigate to subject-specific test list
4. **Manage Tests** - Edit test properties or delete tests
5. **Manage Questions** - Click "Savollar" to add/edit/remove questions
6. **Create New Tests** - Use "Yangi test yaratish" button

### Test Types Supported:

-   **Multiple Choice**: Questions with multiple correct answers
-   **Single Choice**: Questions with one correct answer
-   **Open Ended**: Free-text response questions
-   **True/False**: Binary choice questions

## Technical Implementation

### Frontend Components:

-   `SubjectTests.tsx` - Displays tests for a specific subject
-   `TestQuestions.tsx` - Manages questions within a test
-   Updated `TeacherDashboard.tsx` - Shows clickable subject cards

### Backend Endpoints Used:

-   `GET /subjects/:id` - Get subject details
-   `GET /tests?subjectid=:id` - Get tests for a subject
-   `GET /tests/:id` - Get specific test details
-   `PATCH /tests/:id` - Update test properties
-   `DELETE /tests/:id` - Delete a test
-   `GET /questions?testId=:id` - Get questions for a test
-   `POST /questions` - Create new question
-   `PATCH /questions/:id` - Update question
-   `DELETE /questions/:id` - Delete question

### Data Types:

-   `Test` - Test entity with properties like title, description, type, status
-   `Question` - Question entity with text, type, points, options
-   `Subject` - Subject entity with name, category, test count

## Usage Examples

### Adding a Question:

1. Navigate to test questions page
2. Click "Savol qo'shish"
3. Enter question text
4. Select question type
5. Set points value
6. Add answer options (if applicable)
7. Select correct answer
8. Click "Qo'shish"

### Editing a Test:

1. Click edit button on test card
2. Modify desired fields
3. Click "Saqlash"

### Deleting a Question:

1. Click delete button on question
2. Confirm deletion

## Security Features

-   Teachers can only access their own tests and questions
-   Subject access is restricted to teacher's assigned subjects
-   Only draft tests can be deleted
-   All operations require authentication

## Future Enhancements

-   Bulk question import/export
-   Question templates
-   Advanced question types (matching, ordering)
-   Question bank management
-   Test preview functionality
-   Student response analytics
