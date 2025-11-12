# Push to GitHub - Step by Step Instructions

## Understanding Your Structure

Your git repository is at:
- **Repository root:** `/Users/phktistakis/Praiser/`
- **Your app folder:** `/Users/phktistakis/Praiser/praiser/` (renamed from appmaker)

The git repository contains the `praiser` folder, not the other way around.

## Quick Push Instructions

### Step 1: Open Terminal

Open Terminal on your Mac.

### Step 2: Navigate to Repository

```bash
cd /Users/phktistakis/Praiser
```

### Step 3: Check Status

```bash
git status
```

This shows what's changed and ready to push.

### Step 4: Add All Changes (if any)

If you see untracked or modified files:

```bash
git add .
```

### Step 5: Commit (if you have uncommitted changes)

```bash
git commit -m "Update: Push praiser app to GitHub"
```

### Step 6: Push to Praiser Repository

**Option A: Using GitHub CLI (Easiest)**

```bash
# First, authenticate if needed
gh auth login

# Then push
git push praise cursor/app-development-template-generator-5e02:main
```

**Option B: Using Personal Access Token**

1. Get a token:
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Give it `repo` permission
   - Copy the token

2. Push:
```bash
git push https://YOUR_TOKEN@github.com/philipposk/Praiser.git cursor/app-development-template-generator-5e02:main
```

**Option C: Using SSH (if you have SSH keys)**

```bash
git remote set-url praise git@github.com:philipposk/Praiser.git
git push praise cursor/app-development-template-generator-5e02:main
```

## Complete Command Sequence

Copy and paste these commands one by one:

```bash
# 1. Go to repository
cd /Users/phktistakis/Praiser

# 2. Check what needs to be pushed
git status

# 3. If you see changes, add them
git add .

# 4. Commit (if needed)
git commit -m "Push praiser app to GitHub"

# 5. Push to Praiser repo
# Choose one method below:

# Method 1: If you have GitHub CLI
gh auth login
git push praise cursor/app-development-template-generator-5e02:main

# Method 2: Using token (replace YOUR_TOKEN)
git push https://YOUR_TOKEN@github.com/philipposk/Praiser.git cursor/app-development-template-generator-5e02:main

# Method 3: Using SSH
git remote set-url praise git@github.com:philipposk/Praiser.git
git push praise cursor/app-development-template-generator-5e02:main
```

## Verify It Worked

After pushing, check:
- Go to: https://github.com/philipposk/Praiser
- You should see the `praiser` folder with all your code

## Troubleshooting

### "Permission denied" error
- Use GitHub CLI: `gh auth login`
- Or get a new personal access token

### "Repository not found" error
- Make sure the repo exists at: https://github.com/philipposk/Praiser
- Check you're using the correct repository name

### "Branch not found" error
- The branch `cursor/app-development-template-generator-5e02` should exist locally
- If not, check with: `git branch`

## After Successful Push

1. **Update Vercel:**
   - Settings → Git → Connect to `philipposk/Praiser`
   - Branch: `main`
   - **Root Directory:** `praiser` ⚠️ (important!)
   - Save and redeploy

2. **Your site should work!**

## Quick Reference

- **Repository:** `/Users/phktistakis/Praiser/`
- **App folder:** `praiser/`
- **GitHub repo:** `philipposk/Praiser`
- **Branch to push:** `cursor/app-development-template-generator-5e02` → `main`

