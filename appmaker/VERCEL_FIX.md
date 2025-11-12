# Fixing 404 Error on Vercel

## The Problem
Your deployment shows "Ready" but displays a 404 error. This usually means:
1. Build succeeded but the app structure isn't correct
2. Missing environment variables
3. Root route not found

## Quick Fixes

### 1. Check Build Logs
In Vercel deployment page:
- Click on **"Build Logs"** section (expand it)
- Look for any errors or warnings
- Check if the build completed successfully

### 2. Verify Your App Structure
Make sure you have:
- ✅ `appmaker/src/app/page.tsx` (root page)
- ✅ `appmaker/src/app/layout.tsx` (root layout)
- ✅ `appmaker/package.json` with correct scripts

### 3. Check Environment Variables
Go to Vercel → Your Project → **Settings** → **Environment Variables**

Make sure you have:
- ✅ `GROQ_API_KEY` (required for AI)
- ✅ `BLOB_READ_WRITE_TOKEN` (required for file uploads)

**If missing, add them:**
1. Click "Add New"
2. Add `GROQ_API_KEY` with your Groq API key
3. Add `BLOB_READ_WRITE_TOKEN` with your Vercel Blob token
4. Make sure they're enabled for "Production", "Preview", and "Development"
5. **Redeploy** after adding variables

### 4. Check Project Settings
Go to Vercel → Your Project → **Settings** → **General**

**Root Directory:**
- If your Next.js app is in the `appmaker` folder, set:
  - **Root Directory:** `appmaker`
- If it's in the root, leave it blank

**Build Command:**
- Should be: `npm run build` or `pnpm build`
- Vercel usually detects this automatically

**Output Directory:**
- Leave blank (Vercel handles this for Next.js)

### 5. Clean Up Domains

**Keep:**
- ✅ `praiser.6x7.gr` (your custom domain)
- ✅ `praiserai-filippos-projects-06f05211.vercel.app` (main Vercel URL)

**Remove (optional):**
- ❌ `mike-s-nine.vercel.app` (old/random domain)
- ❌ Preview URLs (auto-generated, can be removed)

**To remove domains:**
1. Go to **Settings** → **Domains**
2. Click the three dots (⋯) next to unwanted domains
3. Click "Remove"

### 6. Redeploy

After fixing issues:
1. Go to **Deployments** tab
2. Click the three dots (⋯) on the latest deployment
3. Click **"Redeploy"**
4. Or push a new commit to trigger redeploy

## Common Issues

### Issue: "404 NOT_FOUND" in preview
**Solution:** 
- Check if `src/app/page.tsx` exists
- Check Build Logs for errors
- Make sure environment variables are set
- Try clicking "Visit" button (not preview)

### Issue: Build succeeds but site shows 404
**Solution:**
- Check Root Directory setting (should be `appmaker` if app is in that folder)
- Verify `package.json` has correct build script
- Check that `src/app/page.tsx` exists and exports a default component

### Issue: Environment variables not working
**Solution:**
- Make sure variables are added for "Production" environment
- Redeploy after adding variables
- Check variable names match exactly (case-sensitive)

## Verify Your Setup

1. ✅ **Root Directory:** `appmaker` (if your Next.js app is in appmaker folder)
2. ✅ **Build Command:** `npm run build` or `pnpm build`
3. ✅ **Environment Variables:** `GROQ_API_KEY` and `BLOB_READ_WRITE_TOKEN` set
4. ✅ **File Structure:** `appmaker/src/app/page.tsx` exists
5. ✅ **Domains:** Only keep what you need

## After Fixing

1. **Redeploy** your project
2. **Wait** for build to complete
3. **Check** Build Logs for any errors
4. **Visit** your site at `praiser.6x7.gr` or the Vercel URL
5. **Test** that the page loads (not 404)

## Still Not Working?

1. **Check Build Logs** - Look for specific errors
2. **Check Runtime Logs** - Look for runtime errors
3. **Verify file structure** - Make sure all files are committed to GitHub
4. **Contact Vercel support** - They can help debug deployment issues

