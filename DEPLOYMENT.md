# Deployment Guide for Vercel

## Pre-Deployment Checklist

✅ Build passes locally (`npm run build`)
✅ Documentation ingested (`data/documents.json` exists and is committed)
✅ Environment variables configured
✅ Node version specified in package.json

## Deploy to Vercel

### Option 1: Vercel Dashboard (Recommended)

1. **Go to** https://vercel.com/new

2. **Import Git Repository**
   - Select: `TrueContextian/TC-AiBot`
   - Framework: Next.js (auto-detected)

3. **Add Environment Variable**
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Deploy!**
   - Click "Deploy"
   - Wait 2-3 minutes for build to complete

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variable
vercel env add OPENAI_API_KEY

# Deploy to production
vercel --prod
```

## Common Deployment Issues

### Issue 1: Build Fails with "Cannot find module"

**Solution:** Make sure all dependencies are installed and `package-lock.json` is committed.

```bash
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "Update package-lock.json"
git push
```

### Issue 2: "OPENAI_API_KEY is not set"

**Solution:** Add the environment variable in Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add `OPENAI_API_KEY` with your actual key
3. Redeploy

### Issue 3: API Route Returns 500 Error

**Solution:** Check Vercel Function logs:
1. Go to Deployments → Click on latest deployment
2. Click "Functions" tab
3. View logs for `/api/chat`

Common causes:
- Missing or invalid OpenAI API key
- OpenAI API quota exceeded
- Model not available (gpt-4o requires Plus subscription)

### Issue 4: No Documentation Loaded

**Solution:** Verify `data/documents.json` is in the repository:

```bash
git ls-files data/documents.json
# Should output: data/documents.json
```

If not committed:
```bash
git add data/documents.json
git commit -m "Add ingested documentation"
git push
```

### Issue 5: Build Times Out

**Solution:** Vercel has a 45-minute build timeout on Pro plans, 15 minutes on Hobby.

The current build takes ~40 seconds, so this shouldn't be an issue.

## Verifying Deployment

After deployment, test your app:

1. **Visit your deployment URL** (provided by Vercel)
   - Example: `https://tc-aibot.vercel.app`

2. **Test the chat interface**
   - Ask: "What is TrueContext?"
   - Should receive a response within 5-10 seconds

3. **Check API endpoint**
   ```bash
   curl -X POST https://your-app.vercel.app/api/chat \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"Hello"}]}'
   ```

## Monitoring

- **Function Logs**: Vercel Dashboard → Project → Functions
- **Analytics**: Vercel Dashboard → Project → Analytics
- **Error Tracking**: Check Vercel deployment logs

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key (starts with `sk-`) |

## Performance

- **Cold Start**: ~2-3 seconds
- **Warm Response**: ~500ms-2s (depending on AI response)
- **Region**: `iad1` (US East) - configurable in `vercel.json`

## Troubleshooting

If deployment fails, check:

1. ✅ Build logs in Vercel dashboard
2. ✅ Function logs for API errors
3. ✅ Environment variables are set correctly
4. ✅ Latest code is pushed to GitHub

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **AI SDK Docs**: https://sdk.vercel.ai/docs
