# Microsoft Teams Integration Guide

This guide explains how to embed the TrueContext AI Bot into Microsoft Teams.

## Prerequisites

1. ✅ App deployed to Vercel (or another hosting service)
2. ✅ Microsoft Teams admin access
3. ✅ Azure AD app registration (for SSO - optional)

## Quick Setup

### Step 1: Update manifest.json

Edit `teams/manifest.json` and replace the following placeholders:

- `YOUR_APP_ID_HERE` → Generate a new GUID at https://www.guidgenerator.com/
- `YOUR_DEPLOYMENT_URL` → Your Vercel deployment URL (e.g., `tc-aibot.vercel.app`)
- `YOUR_AAD_APP_ID_HERE` → Your Azure AD App ID (optional, for SSO)

Example:
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "staticTabs": [{
    "contentUrl": "https://tc-aibot.vercel.app?teams=true"
  }],
  "validDomains": ["tc-aibot.vercel.app"]
}
```

### Step 2: Create App Icons

Create two PNG icons in the `teams/` folder:

- **color.png** - 192x192px color icon
- **outline.png** - 32x32px transparent outline icon

You can use these specifications:
- Color icon: Full color logo with transparent background
- Outline icon: White icon on transparent background

### Step 3: Create Teams App Package

```bash
cd teams
zip -r TrueContextAI.zip manifest.json color.png outline.png
```

This creates `TrueContextAI.zip` which is your Teams app package.

### Step 4: Upload to Teams

#### For Personal Use:
1. Open Microsoft Teams
2. Click **Apps** in the left sidebar
3. Click **Manage your apps** → **Upload an app**
4. Select **Upload a custom app**
5. Choose `TrueContextAI.zip`
6. Click **Add** to install

#### For Organization-wide Deployment:
1. Go to **Teams Admin Center** (https://admin.teams.microsoft.com)
2. Navigate to **Teams apps** → **Manage apps**
3. Click **Upload** → **Upload**
4. Select `TrueContextAI.zip`
5. Set app availability and permissions
6. Publish to organization

## Configuration

### Content Security Policy

Your deployment must allow being embedded in an iframe. Add to `next.config.ts`:

```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors teams.microsoft.com *.teams.microsoft.com *.skype.com"
          },
          {
            key: 'X-Frame-Options',
            value: 'ALLOW-FROM https://teams.microsoft.com'
          }
        ],
      },
    ];
  },
};
```

### Teams Context Detection

The app automatically detects when running in Teams via the `?teams=true` query parameter and adjusts styling accordingly.

## Testing

### Test in Teams
1. After installation, find "TrueContext AI" in your Teams apps
2. Click to open the app
3. The chat interface should load
4. Try asking: "What is TrueContext?"

### Test Iframe Locally
```html
<!-- test-teams-embed.html -->
<!DOCTYPE html>
<html>
<body>
  <iframe
    src="http://localhost:3000?teams=true"
    width="100%"
    height="600px"
    style="border: 1px solid #ccc;">
  </iframe>
</body>
</html>
```

## Troubleshooting

### Issue: App doesn't load in Teams

**Check:**
1. ✅ `validDomains` in manifest includes your deployment URL
2. ✅ Content Security Policy allows Teams iframes
3. ✅ HTTPS is enabled (Teams requires HTTPS)

### Issue: "This app can't be loaded"

**Solution:** Verify the `contentUrl` in manifest.json is accessible and returns a valid HTML page.

### Issue: App loads but looks wrong

**Solution:** The app should detect Teams context and adjust styling. Check browser console for errors.

### Issue: Can't upload app to Teams

**Common causes:**
- Manifest.json has invalid JSON
- Icons are missing or wrong size
- App ID is not a valid GUID
- Zip file structure is incorrect (files must be in root of zip)

## Features in Teams

- ✅ Works as a personal tab
- ✅ Works as a team tab
- ✅ Mobile-friendly (Teams mobile app)
- ✅ Dark theme support (follows Teams theme)
- ✅ Real-time AI responses
- ✅ Documentation search with 579 chunks

## Security Considerations

- App runs in an iframe within Teams
- No Teams SSO implemented (uses anonymous access)
- All API calls go through your Vercel deployment
- Anthropic API key is secure (server-side only)

## Optional: Add Teams SSO

To add Single Sign-On with Teams:

1. Register an Azure AD app
2. Configure app permissions
3. Update manifest with `webApplicationInfo`
4. Add Teams SDK to frontend
5. Validate tokens on backend

See: https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/authentication/tab-sso-overview

## Support

For Teams integration issues:
- Microsoft Teams Developer Docs: https://learn.microsoft.com/en-us/microsoftteams/platform/
- Teams App Validation: https://dev.teams.microsoft.com/validation

For app issues:
- Check Vercel deployment logs
- Check browser console for errors
- Verify API key is set correctly
