# Settings Persistence System

## Overview

The Praiser app now uses a **server-side settings persistence** system that ensures all users (including those in incognito mode) see the same admin-configured settings.

## Architecture

### Settings Flow

```
Admin Panel → API (POST /api/settings) → Vercel Blob Storage
                                              ↓
User Opens App → API (GET /api/settings) → Load Settings
                                              ↓
                                        Apply to Store
```

### Key Components

1. **Vercel Blob Storage**: Server-side storage for settings
   - File: `settings.json` 
   - Persists across all sessions and browsers
   - Survives incognito mode closures

2. **Settings API** (`/api/settings/route.ts`):
   - **GET**: Returns settings from blob storage or defaults if none exist
   - **POST**: Saves settings to blob storage
   - Always returns complete settings (never null)

3. **App Store** (`app-store.ts`):
   - Loads settings from API on app startup
   - Saves settings to API when admin makes changes
   - Uses localStorage as a write-through cache only

4. **Admin Panel** (`admin-panel.tsx`):
   - Admin login required (username/password)
   - Immediately saves changes to API
   - Shows checkmarks when settings are saved

## Default Settings

When no custom settings exist in blob storage, the system returns these defaults:

```typescript
{
  personInfo: null,
  praiseBarVisible: true,
  praiseMode: "manual",
  manualPraiseVolume: 70,
  siteName: "Mike's Chatbot",
  siteSubtitle: "Powered by AI",
  chats: [],
}
```

## Settings Properties

| Property | Type | Description |
|----------|------|-------------|
| `personInfo` | `PersonInfo \| null` | Information about the person being praised |
| `praiseBarVisible` | `boolean` | Whether users can see/adjust the intensity bar |
| `praiseMode` | `PraiseMode` | Intensity mode: "manual", "auto-random", or "crescendo" |
| `manualPraiseVolume` | `number` | Locked intensity level (0-100) for manual mode |
| `siteName` | `string` | Site name shown in title and logo |
| `siteSubtitle` | `string` | Subtitle shown in empty chat state |
| `chats` | `Chat[]` | Chat history (currently per-user, not global) |

## How It Works

### 1. App Startup (All Users)

```typescript
// In page.tsx
useEffect(() => {
  loadStoredSettings(); // Loads from API
}, []);
```

The `loadStoredSettings()` function:
1. Calls `GET /api/settings`
2. API returns settings from blob or defaults
3. Updates Zustand store with settings
4. Caches settings to localStorage (optional, may fail in incognito)

### 2. Admin Changes Settings

```typescript
// In admin-panel.tsx
const handleSiteNameChange = (value: string) => {
  setSiteName(value);                    // Update Zustand store
  setTimeout(() => saveSettingsToServer(true), 100);  // Save to API immediately
};
```

The `saveSettingsToServer()` function:
1. Gets current state from Zustand store
2. Calls `POST /api/settings` with all settings
3. API saves to Vercel Blob Storage
4. Also updates localStorage (best effort)

### 3. User Reopens App (Including Incognito)

1. `loadStoredSettings()` runs again
2. API returns the admin's saved settings
3. User sees admin's configuration
4. Works even if localStorage was cleared (incognito)

## Incognito Mode Behavior

### Before This Fix
- Settings stored only in localStorage
- Incognito mode clears localStorage on close
- Users lost settings between sessions

### After This Fix
- Settings always loaded from API/Blob Storage
- localStorage is just a cache (optional)
- Incognito users see same settings as everyone else
- Settings persist across all sessions

## Admin Control

The admin can configure these settings for all users:

1. **Intensity Mode**:
   - Auto-Random: Changes randomly (0, 100, middle values)
   - Crescendo: Starts at 0, increases to 100
   - Manual: Fixed level set by admin

2. **Bar Visibility**:
   - Visible: Users can adjust intensity themselves
   - Hidden: Intensity locked at admin's setting

3. **Site Branding**:
   - Site Name: Shown in title and logo
   - Site Subtitle: Shown below name

4. **Person Info**:
   - Configure who is being praised

## Cache Strategy

The app uses a **write-through cache**:

1. **Source of Truth**: Vercel Blob Storage (via API)
2. **Cache**: localStorage (best effort)
3. **Read Path**: Always from API first
4. **Write Path**: Always to API, then cache to localStorage

This ensures:
- Consistency across all users
- Works in incognito mode
- Fast loads when cache is available
- Graceful fallback when cache fails

## Error Handling

- If blob storage is unavailable → Returns defaults
- If localStorage fails → Continues with API only
- If API fails → Returns defaults (from client-side fallback)

## Environment Setup

Required environment variable:
```bash
BLOB_READ_WRITE_TOKEN=<your-vercel-blob-token>
```

This is set in Vercel project settings and enables blob storage access.

## Testing

To test the persistence system:

1. **Normal Mode**: Change settings → Close browser → Reopen → Settings persist ✓
2. **Incognito Mode**: Change settings (as admin) → Close incognito → Reopen → Settings persist ✓
3. **Cross-Browser**: Change settings in Chrome → Open Firefox → Same settings ✓
4. **Multiple Users**: Admin changes settings → All users see new settings ✓

## Future Enhancements

Potential improvements:

1. **Per-User Settings**: Some settings could be user-specific (like language)
2. **Settings History**: Track changes over time
3. **Settings Backup**: Export/import functionality
4. **Real-time Sync**: WebSocket updates when admin changes settings
5. **Audit Log**: Track who changed what and when

