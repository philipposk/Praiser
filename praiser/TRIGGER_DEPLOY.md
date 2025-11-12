# How to Trigger a New Vercel Deployment

## Option 1: Manual Redeploy (Fastest)

1. Go to **Vercel Dashboard** → Your Project
2. Click **Deployments** tab
3. Find the **latest deployment** (should be `07694aa` or newer)
4. Click the **"..."** (three dots) menu on the right
5. Click **Redeploy**
6. Confirm the redeploy
7. Watch the build logs - it should now show `┌ ○ /` in the route list

## Option 2: Push Empty Commit (Alternative)

If manual redeploy doesn't work, we can push an empty commit to trigger a new build.

## Option 3: Make a Small Change

We can make a tiny change to a file and push it to trigger deployment.

## After Deployment

Check the build logs to verify:
- The route list should show `┌ ○ /` at the top
- Build should complete successfully
- Site should work at `praiser.6x7.gr`

