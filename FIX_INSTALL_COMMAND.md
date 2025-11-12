# Fix: Install Command Still References "appmaker"

## ✅ Good News!

Vercel is now using the **correct commit** (`cdc6b0a`)! 🎉

## ❌ New Problem

The build is failing because Vercel has a **custom Install Command** that still references the old `appmaker` folder:

```
Error: Command "cd appmaker && npm install" exited with 1
sh: line 1: cd: appmaker: No such file or directory
```

## Solution: Update Install Command in Vercel

### Step 1: Go to Build Settings

1. **In Vercel:**
   - Go to **Settings** → **Build and Deployment**

### Step 2: Find Install Command

Look for:
- **"Install Command"** field
- It probably says: `cd appmaker && npm install` (or similar)

### Step 3: Fix It

**Option A: Remove the Custom Command (RECOMMENDED)**

If you've set **Root Directory to `praiser`**, you don't need a custom install command:
- **Clear/Delete** the Install Command field
- Leave it **empty**
- Vercel will automatically run `npm install` (or `pnpm install`) in the `praiser` folder

**Option B: Update to Use `praiser`**

If you want to keep a custom command:
- Change: `cd appmaker && npm install`
- To: `cd praiser && npm install`

**But Option A is better** - if Root Directory is set, you don't need `cd` at all!

### Step 4: Also Check Build Command

While you're there, check **"Build Command"**:
- If it says `cd appmaker && npm run build`, change it to just `npm run build` (or clear it)
- With Root Directory set, Vercel handles the path automatically

### Step 5: Save and Redeploy

1. **Click "Save"**
2. **Go to Deployments**
3. **Click "Redeploy"** on the latest deployment (or wait for auto-redeploy)

## What Should Happen

After fixing the Install Command:
- ✅ Vercel uses commit `cdc6b0a` (already working!)
- ✅ Root Directory is `praiser` (should be set)
- ✅ Install Command runs in `praiser` folder (or auto-detected)
- ✅ Build succeeds
- ✅ Site works!

## Quick Checklist

- [ ] Settings → Build and Deployment
- [ ] **Root Directory:** `praiser` ✅
- [ ] **Install Command:** Empty (or `cd praiser && npm install`)
- [ ] **Build Command:** Empty (or `npm run build`)
- [ ] Save
- [ ] Redeploy

The commit issue is fixed - now just update the Install Command! 🎯

