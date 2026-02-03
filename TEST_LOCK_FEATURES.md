# Test Lock & Publish Features

This document describes the new test locking and publishing features added to the Exam-Axis backend.

## Features Added

### 1. Test Model Extensions

New fields added to the `Test` model:

- `isLocked` (Boolean): Controls whether the test is locked/unlocked
- `publishAt` (DateTime): Optional publish date for the test
- `publishMessage` (Text): Custom message to show when test is locked

### 2. Admin APIs

#### Enhanced Test Management

- **GET /api/admin/tests** - Now supports:
  - `?search=` - Search by testId, title, or description
  - `?isLocked=true/false` - Filter by lock status
  - Existing filters: `examType`, `subject`, `isActive`

- **PUT /api/admin/tests/:id** - Now supports updating:
  - `isLocked` (boolean)
  - `publishAt` (ISO date string or null)
  - `publishMessage` (string or null)

#### New Bulk Operations

- **POST /api/admin/tests/bulk-lock** - Lock/unlock multiple tests
  ```json
  {
    "examType": "CGL" | null,
    "subject": "Maths" | null, 
    "locked": true | false
  }
  ```

- **PUT /api/admin/tests/:id/toggle-lock** - Toggle lock status of single test

### 3. Public APIs Updated

- **GET /api/public/tests** - Now includes lock information
- **GET /api/public/tests/:testId** - Now includes lock information

Response now includes:
```json
{
  "testId": "ssc_cgl_12_sep_s1",
  "title": "Shift 1",
  "isLocked": true,
  "publishAt": "2025-10-05T00:00:00.000Z",
  "publishMessage": "Test will be published on 5 Oct at 10:00 AM"
}
```

## Database Migration

Run the migration to add new fields:

```bash
node scripts/migrate-test-fields.js
```

Or manually apply the SQL:

```sql
ALTER TABLE tests ADD COLUMN is_locked BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE tests ADD COLUMN publish_at TIMESTAMP NULL;
ALTER TABLE tests ADD COLUMN publish_message TEXT NULL;
```

## Frontend Integration

### Admin Panel Usage

1. **Lock/Unlock All Tests:**
   ```javascript
   fetch('/api/admin/tests/bulk-lock', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ locked: true }) // Lock all
   });
   ```

2. **Lock by Exam Type:**
   ```javascript
   fetch('/api/admin/tests/bulk-lock', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ examType: 'CGL', locked: false })
   });
   ```

3. **Update Single Test:**
   ```javascript
   fetch('/api/admin/tests/123', {
     method: 'PUT',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       isLocked: true,
       publishAt: '2025-10-05T00:00:00.000Z',
       publishMessage: 'Test will be published on 5 Oct'
     })
   });
   ```

### User-Facing Cards

When fetching tests from `/api/public/tests`, check the lock status:

```javascript
function generateTestCard(test) {
  if (test.isLocked && test.publishMessage) {
    return `
      <div class="test-card locked">
        <h3>${test.title}</h3>
        <div class="availability-label">${test.publishMessage}</div>
        <button disabled>Locked</button>
      </div>
    `;
  } else {
    return `
      <div class="test-card">
        <h3>${test.title}</h3>
        <button onclick="startTest('${test.testId}')">Start Test</button>
      </div>
    `;
  }
}
```

## Payment Screenshot Fix

Fixed the payment screenshot loading issue by:

1. Converting upload middleware from ES modules to CommonJS
2. Ensuring proper file serving route exists at `/api/uploads/payments/:filename`
3. Added proper MIME type handling for images

## API Examples

### Search Tests
```bash
GET /api/admin/tests?search=maths&examType=CGL&isLocked=false
```

### Bulk Lock by Subject
```bash
POST /api/admin/tests/bulk-lock
{
  "subject": "Maths",
  "locked": true
}
```

### Update Test with Publish Info
```bash
PUT /api/admin/tests/123
{
  "isLocked": true,
  "publishAt": "2025-10-05T00:00:00.000Z",
  "publishMessage": "Test will be published on 5 Oct at 10:00 AM"
}
```

## Security Notes

- All admin endpoints require authentication and admin privileges
- Lock status is enforced on frontend (backend provides data)
- Publish dates are for display only - actual availability controlled by `isLocked` flag
- Payment screenshots are served with proper filename validation to prevent path traversal

## Testing

Use the provided seeder to create example data:

```bash
node -e "require('./seeders/test-lock-examples').up()"
```

This will create example locked/unlocked tests with publish messages for testing.
