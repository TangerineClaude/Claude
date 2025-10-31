# Kooperkai Aquatics - Complete Setup Guide

This guide walks you through setting up the entire website from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Google Cloud Setup](#google-cloud-setup)
3. [Local Development Setup](#local-development-setup)
4. [Cloudflare Pages Setup](#cloudflare-pages-setup)
5. [Payment Integration](#payment-integration)
6. [Google Sheets Setup](#google-sheets-setup)
7. [Deployment](#deployment)
8. [Ongoing Management](#ongoing-management)

---

## Prerequisites

### Required Accounts (All Free Tiers Available)

- [ ] GitHub account
- [ ] Google Cloud account
- [ ] Cloudflare account
- [ ] Square account (for payments)
- [ ] PayPal Business account (for payments)

### Required Software

- [ ] Node.js 18+ ([Download](https://nodejs.org))
- [ ] Git ([Download](https://git-scm.com))
- [ ] Code editor (VS Code recommended)

---

## Google Cloud Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Name it "Kooperkai Aquatics"
4. Click "Create"

### Step 2: Enable Google Sheets API

1. In the Google Cloud Console, open the navigation menu (☰)
2. Go to "APIs & Services" → "Library"
3. Search for "Google Sheets API"
4. Click on it and click "Enable"

### Step 3: Create a Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Fill in:
   - **Name**: `kooperkai-sheets-sync`
   - **Description**: `Service account for syncing products from Google Sheets`
4. Click "Create and Continue"
5. Skip the optional steps (click "Continue" then "Done")

### Step 4: Get Service Account Credentials

1. Click on the service account you just created
2. Go to the "Keys" tab
3. Click "Add Key" → "Create new key"
4. Choose "JSON" format
5. Click "Create" - a JSON file will download
6. **IMPORTANT**: Save this file securely! You'll need it later

### Step 5: Extract Credentials

Open the downloaded JSON file. You'll need these values:
- `client_email` → This is your `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → This is your `GOOGLE_PRIVATE_KEY`

---

## Local Development Setup

### Step 1: Clone the Repository

```bash
cd webapp
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Create Environment File

Create a `.env` file in the `webapp` directory:

```bash
# .env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your-google-sheet-id-here
```

**Important**:
- Keep the quotes around `GOOGLE_PRIVATE_KEY`
- Keep the `\n` newline characters as-is
- The `GOOGLE_SHEET_ID` is from the URL: `https://docs.google.com/spreadsheets/d/{THIS_PART}/edit`

### Step 4: Test Locally

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Google Sheets Setup

### Step 1: Create Your Product Sheet

1. Open [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "Kooperkai Products"
4. Go to File → Import → Upload
5. Select `docs/google-sheets-template.csv`
6. Click "Import data"

### Step 2: Rename the Sheet Tab

1. Make sure the sheet tab at the bottom is named exactly "Products"
2. If not, double-click it and rename it

### Step 3: Share with Service Account

1. Click the "Share" button (top-right)
2. Paste your service account email (from the JSON file: `client_email`)
3. Set permission to "Viewer"
4. Uncheck "Notify people"
5. Click "Share"

### Step 4: Get Sheet ID

1. Copy the URL of your Google Sheet
2. Extract the ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/1ABC123xyz-EXAMPLE-ID/edit
                                           ^^^^^^^^^^^^^^^^
                                           This is your Sheet ID
   ```
3. Add this to your `.env` file as `GOOGLE_SHEET_ID`

### Step 5: Test the Sync

```bash
npm run sync-products
```

You should see:
```
✓ Authentication configured
✓ Loaded sheet: "Kooperkai Products"
✓ Found 1 product rows
✅ Successfully synced 1 products to data/products.json
```

---

## Cloudflare Pages Setup

### Step 1: Create Cloudflare Account

1. Go to [Cloudflare](https://www.cloudflare.com)
2. Sign up for a free account
3. Verify your email

### Step 2: Connect GitHub

1. In Cloudflare Dashboard, go to "Workers & Pages"
2. Click "Create application"
3. Go to "Pages" tab
4. Click "Connect to Git"
5. Authorize Cloudflare to access your GitHub
6. Select your repository

### Step 3: Configure Build Settings

- **Framework preset**: None
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `webapp`

Click "Save and Deploy"

### Step 4: Add Environment Variables

1. Go to your Pages project → Settings → Environment variables
2. Click "Add variable" for each:

```
GOOGLE_SERVICE_ACCOUNT_EMAIL = your-email@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY = -----BEGIN PRIVATE KEY-----\nYour\nKey\nHere\n-----END PRIVATE KEY-----\n
GOOGLE_SHEET_ID = your-sheet-id-here
```

**Important**:
- Set these for "Production" and "Preview" environments
- For `GOOGLE_PRIVATE_KEY`, you may need to format it on one line with `\n` for newlines

### Step 5: Enable Cron Triggers

1. In your Cloudflare dashboard, go to Workers & Pages
2. Select your project
3. Go to Settings → Functions
4. Verify that `wrangler.jsonc` is configured with cron triggers
5. The sync will run automatically every 10 minutes

---

## Payment Integration

### Square Setup

1. **Create Square Account**:
   - Go to [squareup.com](https://squareup.com)
   - Sign up for a free account
   - Complete business verification

2. **Enable Online Checkout**:
   - Go to Square Dashboard
   - Navigate to "Online" → "Checkout"
   - Create checkout links for your products

3. **Get Checkout Links**:
   - For each product, create a custom checkout link
   - Copy the link (format: `https://checkout.square.site/merchant/...`)

4. **Update Website**:
   - Edit `src/index.tsx`
   - Find the Square button (search for `square.link`)
   - Replace with your actual checkout link

**Option**: You can make Square links dynamic by creating a custom item in Square for each product and using the product ID.

### PayPal Setup

1. **Create PayPal Business Account**:
   - Go to [PayPal Business](https://www.paypal.com/business)
   - Sign up for a business account

2. **Get API Credentials**:
   - Log in to [PayPal Developer](https://developer.paypal.com)
   - Go to "My Apps & Credentials"
   - Under "REST API apps", click "Create App"
   - Name it "Kooperkai Aquatics"
   - Copy the "Client ID"

3. **Update Website**:
   - Edit `src/index.tsx`
   - Find `YOUR_PAYPAL_CLIENT_ID`
   - Replace with your actual Client ID

4. **Switch to Production**:
   - Once tested, switch from Sandbox to Live in PayPal Developer
   - Update the Client ID to your production one

---

## Deployment

### First Deployment

```bash
# Build the project
npm run build

# Deploy to Cloudflare
npm run deploy
```

OR push to GitHub and Cloudflare will auto-deploy.

### Custom Domain (Optional)

1. In Cloudflare Pages, go to your project
2. Click "Custom domains"
3. Click "Set up a custom domain"
4. Follow the instructions to add your domain
5. Cloudflare will automatically provision SSL

Recommended domain: `kooperkaiaquatics.com`

---

## Ongoing Management

### For Non-Technical Owner

**Daily Tasks**:
- Edit Google Sheet to update products/stock/prices
- Changes appear on website within 10 minutes automatically
- No code changes needed!

**Weekly Tasks**:
- Check Cloudflare Analytics to see traffic
- Review orders in Square/PayPal dashboard

### For Developers

**Updating Content**:
- Policy pages: Edit `src/index.tsx` (search for the route)
- Design/styling: Edit `public/static/css/style.css`
- Add features: Edit `src/index.tsx` and test locally

**Deploy Changes**:
```bash
git add .
git commit -m "Description of changes"
git push
```

Cloudflare auto-deploys on push to main branch.

**Manual Product Sync**:
```bash
npm run sync-products
```

**Check Logs**:
- Go to Cloudflare Dashboard → Workers & Pages → Your Project → Logs
- Monitor cron job execution and errors

---

## Troubleshooting

### Products Not Syncing

**Check 1**: Service account has access
```bash
# Verify in Google Sheet that service account email is listed in "Share"
```

**Check 2**: Environment variables are set
```bash
# In Cloudflare dashboard, verify all 3 variables are present
```

**Check 3**: Sheet name is correct
```bash
# The tab must be named exactly "Products" (case-sensitive)
```

**Check 4**: Test manually
```bash
npm run sync-products
# Check the output for specific error messages
```

### Images Not Loading

**Check 1**: File paths
- Images must be in `public/static/products/`
- Paths in Google Sheet must start with `/static/products/`

**Check 2**: Rebuild
```bash
npm run build
npm run deploy
```

### Payments Not Working

**Square**:
- Verify you're using production links (not sandbox)
- Check that items exist in Square dashboard

**PayPal**:
- Verify Client ID is correct
- Ensure you switched from Sandbox to Live mode

### Build Errors

**Clear and reinstall**:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Check Node version**:
```bash
node --version  # Should be 18 or higher
```

---

## Security Checklist

- [ ] Never commit `.env` file to Git
- [ ] Keep Google service account JSON file secure
- [ ] Set Google Sheet to "Viewer" only for service account
- [ ] Use Cloudflare's encrypted environment variables
- [ ] Enable Cloudflare firewall rules if needed
- [ ] Keep dependencies updated (`npm audit`)

---

## Maintenance

### Weekly
- [ ] Check Cloudflare Analytics
- [ ] Review product stock levels
- [ ] Check for orders in payment platforms

### Monthly
- [ ] Update npm dependencies: `npm update`
- [ ] Review and respond to customer inquiries
- [ ] Backup Google Sheet (File → Download → CSV)

### As Needed
- [ ] Add new products via Google Sheet
- [ ] Upload new product photos
- [ ] Update policies/content in code

---

## Support

If you encounter issues:

1. Check this guide first
2. Review Cloudflare logs for errors
3. Test locally with `npm run dev`
4. Check the README.md for common solutions
5. Contact the developer who set this up

---

## Next Steps

1. ✅ Complete all setup sections above
2. ✅ Test locally thoroughly
3. ✅ Deploy to Cloudflare
4. ✅ Add your real products to Google Sheet
5. ✅ Upload product photos
6. ✅ Test payments end-to-end
7. ✅ Set up custom domain
8. ✅ Announce your new website!

---

**Congratulations!** 🎉

Your Kooperkai Aquatics website is now live and ready to sell fish!
