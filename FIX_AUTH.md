# Fix Authentication Error - Step by Step

## The Problem
You're getting: `Permission denied` or `403 error`

This means the authentication token doesn't have permission to push to the Praiser repository.

## Solution 1: Use GitHub CLI (Easiest) ✅

### Step 1: Install GitHub CLI (if not installed)
```bash
brew install gh
```

### Step 2: Authenticate
```bash
gh auth login
```
- Choose: "GitHub.com"
- Choose: "HTTPS"
- Authenticate: "Login with a web browser"
- Follow the prompts

### Step 3: Push
```bash
cd /Users/phktistakis/Praiser
git push praise cursor/app-development-template-generator-5e02:main
```

---

## Solution 2: Create New Personal Access Token

### Step 1: Create Token
1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a name: "Praiser Push"
4. Select scopes:
   - ✅ **repo** (full control of private repositories)
   - ✅ **workflow** (optional, for GitHub Actions)
5. Click **"Generate token"**
6. **COPY THE TOKEN** (you won't see it again!)

### Step 2: Update Remote with Token
```bash
cd /Users/phktistakis/Praiser

# Replace YOUR_NEW_TOKEN with the token you just copied
git remote set-url praise https://YOUR_NEW_TOKEN@github.com/philipposk/Praiser.git
```

### Step 3: Push
```bash
git push praise cursor/app-development-template-generator-5e02:main
```

---

## Solution 3: Use SSH (If you have SSH keys)

### Step 1: Check if you have SSH keys
```bash
ls -la ~/.ssh/id_*.pub
```

If you see files, you have SSH keys.

### Step 2: Add SSH key to GitHub (if not already)
1. Copy your public key:
```bash
cat ~/.ssh/id_rsa.pub
# or
cat ~/.ssh/id_ed25519.pub
```

2. Go to: https://github.com/settings/keys
3. Click "New SSH key"
4. Paste your public key
5. Save

### Step 3: Update Remote to SSH
```bash
cd /Users/phktistakis/Praiser
git remote set-url praise git@github.com:philipposk/Praiser.git
```

### Step 4: Push
```bash
git push praise cursor/app-development-template-generator-5e02:main
```

---

## Quick Fix (Recommended)

**Use Solution 1 (GitHub CLI)** - it's the easiest:

```bash
# Install if needed
brew install gh

# Login
gh auth login

# Push
cd /Users/phktistakis/Praiser
git push praise cursor/app-development-template-generator-5e02:main
```

---

## Verify It Worked

After pushing successfully:
1. Go to: https://github.com/philipposk/Praiser
2. You should see the `praiser` folder with all your code
3. Check the commit history - you should see your commits

## Still Having Issues?

If none of these work:
1. Make sure you're logged into GitHub in your browser
2. Check that the repository `philipposk/Praiser` exists and you have write access
3. Try creating a new repository and pushing to that instead

