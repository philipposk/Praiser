# Vercel Branch Selection - Understanding the UI

## Your Repository Structure

Based on the GitHub URL `https://github.com/philipposk/Praiser/tree/main/praiser`:
- ✅ Repository: `philipposk/Praiser`
- ✅ Branch: `main` (this is the default branch)
- ✅ Folder: `praiser` (this is what Root Directory should be)

## Why You Might Not See "main" to Select

### Option 1: Vercel Auto-Selects Default Branch

When you connect a repository, Vercel often:
- **Automatically selects the default branch** (`main`)
- **Doesn't show a branch selector** if it's the default
- **Just shows the repository name**

**This is normal!** If you don't see a branch selector, it's probably using `main` automatically.

### Option 2: Branch Selector is Hidden

Sometimes the branch selector:
- Appears **after** you select the repository
- Is in a **different part of the modal**
- Shows as a **small dropdown** next to the repository name

### Option 3: Check After Connecting

Even if you don't see it during connection:
1. **Connect the repository** (even without seeing branch selector)
2. **Go to:** Settings → Git
3. **Check what branch is shown** - it should say `main`

## What to Do

### Step 1: Connect Repository

1. Click "Connect Git Repository"
2. Select `philipposk/Praiser`
3. **If you see a branch selector:** Choose `main`
4. **If you DON'T see one:** That's okay - proceed anyway (it's probably auto-selecting `main`)

### Step 2: Set Root Directory (MOST IMPORTANT!)

**This is the critical part:**

1. **During connection:** If you see "Root Directory" field, set it to `praiser`
2. **After connection:** Go to Settings → Build and Deployment → Root Directory → Set to `praiser`

### Step 3: Verify

After connecting:
1. **Settings → Git**
2. **Check:** Should show `philipposk/Praiser` and branch `main`
3. **Settings → Build and Deployment**
4. **Check:** Root Directory should be `praiser`

## The Real Issue

The branch selection is less critical - **the Root Directory is what matters!**

Even if Vercel uses `main` automatically (which it should), you **MUST** set:
- **Root Directory:** `praiser`

Without this, Vercel won't find your `package.json` and will give a 404.

## Quick Action Plan

1. **Connect repository** (don't worry if you don't see branch selector)
2. **Set Root Directory to `praiser`** (this is the critical step!)
3. **Check Settings → Git** to verify branch is `main`
4. **Deploy and check build logs**

The branch is probably fine - **focus on setting Root Directory to `praiser`!** 🎯

