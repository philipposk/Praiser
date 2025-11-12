# Fix Vercel Git Connection

## Don't Create a Hook Yet

A deploy hook won't fix the issue - it would just trigger another deployment from the same wrong commit.

## What You Need to Do

### Step 1: Check Current Git Connection

On the Git settings page you're viewing:
- Look for a section showing the connected repository
- It should show: `philipposk/Praiser`
- Branch: `main`

**If you see a "Disconnect" button:**
- Click it to disconnect
- Then reconnect to force Vercel to use the latest commit

**If you DON'T see connection info:**
- The repository might not be properly connected
- You need to connect it

### Step 2: Set Root Directory (MOST IMPORTANT!)

1. **Go to:** Settings → **Build and Deployment** (in the left sidebar)
2. **Find "Root Directory"**
3. **Set it to:** `praiser` (all lowercase)
4. **Click "Save"**

### Step 3: Check if Repository is Connected

**If you see the repository connected:**
- The issue is Vercel is cached on old commit
- Try disconnecting and reconnecting

**If you DON'T see it connected:**
- Click "Connect Git Repository"
- Select `philipposk/Praiser`
- Branch: `main`
- Connect

## About Deploy Hooks

**Deploy hooks are useful for:**
- Manually triggering deployments
- CI/CD integrations
- Webhook triggers

**But they WON'T fix:**
- Wrong commit being used
- Root Directory issues
- Build configuration problems

## What to Do Now

1. **First:** Go to **Build and Deployment** → Set Root Directory to `praiser`
2. **Then:** Check if Git is connected correctly
3. **If needed:** Disconnect and reconnect Git
4. **Finally:** A new deployment should trigger automatically

## After Fixing

Once Root Directory is set to `praiser` and Git is connected correctly:
- Vercel will use the latest commit
- It will find `praiser/package.json`
- Build will succeed
- Site will work!

**Skip the deploy hook for now** - fix the Root Directory and Git connection first.

