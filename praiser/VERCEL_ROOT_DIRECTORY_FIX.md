# Vercel Root Directory Fix

## Problem
The build output on Vercel is missing the root route `/`:
```
├ ○ /_not-found
├ ƒ /api/groq/praise
...
```

But local build shows:
```
┌ ○ /
├ ○ /_not-found
...
```

## Solution: Verify Root Directory

The Root Directory in Vercel **MUST** be set to `praiser` (exactly, lowercase).

### Steps to Fix:

1. **Go to Vercel Dashboard:**
   - Navigate to your project
   - Click **Settings** (gear icon)
   - Click **General** tab

2. **Find Root Directory:**
   - Scroll down to **Root Directory** section
   - It should say: `praiser`
   - If it's empty or different, click **Edit**
   - Type: `praiser` (lowercase, no quotes, no trailing slash)
   - Click **Save**

3. **Verify the Setting:**
   - After saving, it should show: `praiser`
   - This tells Vercel: "The Next.js app is in the `praiser/` subfolder"

4. **Trigger New Deployment:**
   - Go to **Deployments** tab
   - Click **"..."** on the latest deployment
   - Click **Redeploy**
   - OR push a new commit to trigger auto-deploy

5. **Check Build Output:**
   - After deployment, check the build logs
   - Look for the route list
   - It should now show: `┌ ○ /` at the top

## Why This Happens

If Root Directory is:
- **Empty**: Vercel looks for Next.js in the repo root (`/Praiser/`)
- **Wrong**: Vercel looks in the wrong folder
- **Correct (`praiser`)**: Vercel looks in `/Praiser/praiser/` where the app actually is

## File Structure

```
Praiser/                    ← Git repo root
  └── praiser/              ← Root Directory should point here
      ├── package.json      ← Next.js app starts here
      ├── next.config.ts
      └── src/
          └── app/
              ├── layout.tsx
              └── page.tsx   ← This creates the `/` route
```

## Still Not Working?

If the Root Directory is correct but `/` still doesn't appear:

1. **Clear Build Cache:**
   - Settings → General → Build Cache → Clear

2. **Check for Build Errors:**
   - Deployments → Latest → Build Logs
   - Look for any errors or warnings

3. **Verify Git Branch:**
   - Make sure Vercel is building from `main` branch
   - Settings → Git → Production Branch = `main`

