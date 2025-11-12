# How to Select "main" Branch in Vercel

## When Reconnecting Git Repository

### Step-by-Step:

1. **Click "Connect Git Repository"**
   - This opens a modal/popup

2. **Select Repository:**
   - You'll see a list of your repositories
   - Click on **`philipposk/Praiser`**

3. **Select Branch:**
   - After selecting the repository, you'll see a **branch selector**
   - It might be:
     - A dropdown menu
     - A text field with a dropdown arrow
     - A list of branches
   
4. **Choose "main":**
   - Click the branch selector
   - Look for **`main`** in the list
   - Click on **`main`**

5. **Click "Connect" or "Deploy"**
   - The button at the bottom of the modal

## What It Looks Like

The interface typically shows:
```
┌─────────────────────────────┐
│ Connect Git Repository      │
├─────────────────────────────┤
│ Repository:                 │
│ [philipposk/Praiser ▼]      │
│                             │
│ Branch:                     │
│ [main ▼]                    │  ← Click here to see branches
│                             │
│ Root Directory:             │
│ [praiser]                   │  ← Set this too!
│                             │
│        [Connect]            │
└─────────────────────────────┘
```

## If You Don't See Branch Selector

Sometimes Vercel auto-detects the default branch. If you don't see a branch selector:
- The default branch is usually `main`
- It should work automatically
- But you can verify after connecting in Settings → Git

## Important: Set Root Directory Too!

While connecting, you might also see:
- **Root Directory** field
- Set it to: `praiser` (all lowercase)

If you don't see it during connection:
- Set it after connecting in: Settings → Build and Deployment

## Quick Summary

1. Click "Connect Git Repository"
2. Select `philipposk/Praiser`
3. **Click branch dropdown** → Select `main`
4. Set Root Directory to `praiser` (if shown)
5. Click "Connect"

That's it! 🎯

