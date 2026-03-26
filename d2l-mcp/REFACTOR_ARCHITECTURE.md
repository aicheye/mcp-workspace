# Backend-First Architecture Refactor

## Principle
**Every button/action in the mobile app directly calls a backend endpoint. All business logic lives in the backend.**

## Current State Analysis

### ✅ Already Backend-Driven (No Changes Needed)

#### Dashboard Screen
- **Refresh (pull-to-refresh)**: `GET /api/dashboard` ✅
- **Logout button**: Now has `POST /api/auth/logout` ✅

#### Courses Screen
- **Refresh (pull-to-refresh)**: `GET /api/d2l/courses` ✅
- **Retry on error**: `GET /api/d2l/courses` ✅
- **Course card tap**: Navigation only (UI) ✅

#### Course Detail Screen
- **Refresh (pull-to-refresh)**: 
  - Announcements: `GET /api/d2l/courses/:courseId/announcements` ✅
  - Grades: `GET /api/d2l/courses/:courseId/grades` ✅
- **Tab switching**: UI-only state (no backend call needed) ✅
- **Retry on error**: Calls same endpoints ✅

#### Notes Screen
- **Refresh (pull-to-refresh)**: `GET /api/notes` ✅
- **Upload button**: Navigation to Upload screen ✅
- **Search input**: `GET /api/search?q=...` ✅
- **Clear search**: UI-only (no backend call needed) ✅

#### Search Screen
- **Search button**: `GET /api/search?q=...` ✅

#### Upload Screen
- **Upload & Process button**: 
  1. `POST /api/notes/presign-upload` ✅
  2. Upload to S3 (direct) ✅
  3. `POST /api/notes/process` ✅

#### Settings Screen
- **D2L Connect button**: Navigation to D2LConnect screen ✅
- **D2L Sync button**: `POST /api/d2l/sync` ✅
- **Piazza Connect button**: Navigation to PiazzaConnect screen ✅
- **Piazza Sync button**: `POST /api/piazza/sync` ✅
- **Piazza Disconnect button**: `DELETE /api/piazza/disconnect` ✅
- **Embed Missing Notes button**: `POST /api/notes/embed-missing` ✅
- **Logout button**: Now has `POST /api/auth/logout` ✅

#### Auth Screens
- **D2L WebView login**: `POST /api/d2l/connect-cookie` or `POST /api/d2l/token` ✅
- **Piazza WebView login**: `POST /api/piazza/connect-cookie` ✅

## Backend Endpoints Summary

### Notes
- `POST /api/notes/presign-upload` - Get S3 presigned URL
- `POST /api/notes/process` - Process uploaded PDF
- `GET /api/notes` - List notes
- `POST /api/notes/embed-missing` - Embed missing note sections

### Search
- `GET /api/search` - Semantic search across notes

### Dashboard
- `GET /api/dashboard` - Get dashboard data (recent notes, stats, usage)

### D2L
- `POST /api/d2l/connect-cookie` - Store D2L cookies (WebView)
- `POST /api/d2l/token` - Store D2L token (WebView)
- `POST /api/d2l/connect` - Store D2L credentials (legacy)
- `GET /api/d2l/status` - Get D2L connection status
- `POST /api/d2l/sync` - Sync all D2L data
- `GET /api/d2l/courses` - Get enrolled courses
- `GET /api/d2l/courses/:courseId/announcements` - Get announcements
- `GET /api/d2l/courses/:courseId/assignments` - Get assignments
- `GET /api/d2l/courses/:courseId/grades` - Get grades

### Piazza
- `POST /api/piazza/connect-cookie` - Store Piazza cookies (WebView)
- `POST /api/piazza/connect` - Store Piazza credentials (legacy)
- `GET /api/piazza/status` - Get Piazza connection status
- `POST /api/piazza/sync` - Sync all Piazza data
- `DELETE /api/piazza/disconnect` - Disconnect Piazza
- `POST /api/piazza/embed-missing` - Embed missing Piazza posts
- `GET /api/piazza/search` - Search Piazza posts

### Auth
- `POST /api/auth/logout` - Logout user (NEW)

### Push Notifications
- `POST /api/push/register` - Register device token
- `POST /api/push/sync` - Check for updates and notify

## Frontend Changes Needed (DO NOT IMPLEMENT YET)

### 1. Logout Flow
**Current**: Client-side only (clears token from storage)
**Should be**: Call `POST /api/auth/logout` then clear token

**File**: `study-mcp-app/src/context/AuthContext.tsx`
```typescript
// Add logout endpoint call before clearing token
const logout = async () => {
  try {
    await apiClient.post('/api/auth/logout');
  } catch (error) {
    console.error('Logout API call failed:', error);
  } finally {
    // Clear token and navigate regardless
    await SecureStore.deleteItemAsync('userToken');
    setUser(null);
    navigation.navigate('Login');
  }
};
```

### 2. Service Layer Simplification
All services should be thin wrappers that just call backend endpoints. No business logic.

**Current state**: Services already follow this pattern ✅
- `dashboardService.getDashboard()` → `GET /api/dashboard`
- `d2lService.syncAll()` → `POST /api/d2l/sync`
- `notesService.processNote()` → `POST /api/notes/process`
- etc.

### 3. Error Handling
All error handling should be consistent:
- Backend returns structured errors: `{ error: string, details?: string, suggestion?: string }`
- Frontend displays backend error messages directly
- No client-side error transformation (except for user-friendly formatting)

## Architecture Benefits

1. **Single Source of Truth**: All business logic in backend
2. **Consistency**: Same logic for web, mobile, CLI clients
3. **Easier Debugging**: Issues are in one place (backend)
4. **Better Testing**: Test backend logic independently
5. **Simpler Frontend**: Just UI + API calls
6. **Easier Updates**: Update backend, all clients benefit

## Verification Checklist

- [x] All data fetching goes through backend endpoints
- [x] All mutations (create/update/delete) go through backend endpoints
- [x] All business logic is in backend (no client-side processing)
- [x] Logout has backend endpoint
- [x] Error handling is consistent
- [x] Services are thin wrappers (no business logic)

## Notes

- **D2L Auth**: Working fine, do not touch ✅
- **Navigation**: UI-only, no backend calls needed ✅
- **Tab Switching**: UI-only state, no backend calls needed ✅
- **Pull-to-Refresh**: Already calls backend endpoints ✅
