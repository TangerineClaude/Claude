# Kooperkai Aquatics Website

Premium freshwater fish and aquarium supplies e-commerce website built with Hono, TypeScript, and Cloudflare Pages.

## Features

- 🐠 **Product Catalog** - Browse fish with detailed care information
- 📊 **Google Sheets CMS** - Update products by editing a spreadsheet (no code required!)
- 💳 **Integrated Payments** - Square and PayPal checkout
- 📱 **Fully Responsive** - Beautiful design on all devices
- ⚡ **Lightning Fast** - Powered by Cloudflare Pages
- 🔄 **Auto-Sync** - Products update automatically every 10 minutes
- 📦 **Volume Pricing** - Automatic bulk discounts

## Technology Stack

- **Framework**: Hono (lightweight web framework)
- **Language**: TypeScript
- **Styling**: Custom CSS with design tokens
- **Hosting**: Cloudflare Pages
- **CMS**: Google Sheets
- **Payments**: Square & PayPal

## Project Structure

```
webapp/
├── src/
│   ├── index.tsx           # Main app with all routes
│   ├── renderer.tsx        # Layout component (nav, footer)
│   └── sync-products.ts    # Google Sheets sync script
├── public/
│   └── static/
│       ├── css/
│       │   └── style.css   # Design system
│       ├── js/
│       │   └── app.js      # Frontend JavaScript
│       └── products/       # Product images
├── data/
│   └── products.json       # Product data (synced from Sheets)
├── docs/
│   ├── google-sheets-template.csv
│   └── SETUP.md           # Detailed setup instructions
├── package.json
├── tsconfig.json
├── vite.config.ts
└── wrangler.jsonc         # Cloudflare config
```

## Quick Start

### Prerequisites

- Node.js 18+ installed
- Cloudflare account (free tier works)
- Google Cloud account (free tier works)
- Square or PayPal account for payments

### Installation

1. **Install dependencies**:
   ```bash
   cd webapp
   npm install
   ```

2. **Set up environment variables** (see SETUP.md for details):
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Run locally**:
   ```bash
   npm run dev
   ```
   Open http://localhost:5173

4. **Build for production**:
   ```bash
   npm run build
   ```

5. **Deploy to Cloudflare Pages**:
   ```bash
   npm run deploy
   ```

## Google Sheets Setup (Non-Technical Owner Guide)

### One-Time Setup

1. **Import the template**:
   - Open Google Sheets
   - File → Import → Upload → Select `docs/google-sheets-template.csv`
   - Name it "Kooperkai Products"

2. **Share with the service account**:
   - Click "Share" in the top-right
   - Paste the service account email (from setup)
   - Give "Viewer" access
   - Click "Send"

3. **Get the Sheet ID**:
   - Copy the URL of your Google Sheet
   - Extract the ID: `https://docs.google.com/spreadsheets/d/{THIS_IS_THE_ID}/edit`
   - Save this ID for configuration

### Daily Use (Owner-Friendly)

**To add a new fish**:
1. Open your Google Sheet
2. Add a new row with the fish details
3. Wait 10 minutes - the website updates automatically!

**To update stock**:
1. Find the fish in your spreadsheet
2. Change the "Stock" number
3. Save - updates automatically

**To change prices**:
1. Edit the "Price" column
2. For volume discounts, edit the "VolumePrice" column
   - Format: `{"qty2":13.50,"qty3":12.75,"qty4":12.00}`
3. Save - updates automatically

**To remove a fish**:
1. Delete the entire row (or set Stock to 0)
2. Save

### Column Definitions

| Column | Description | Example |
|--------|-------------|---------|
| Name | Fish common name | `Electric Blue Acara` |
| Scientific | Scientific name | `Andinoacara pulcher` |
| Size | Size range | `2-3"` |
| Price | Single fish price | `15.00` |
| VolumePrice | Bulk pricing (JSON) | `{"qty2":13.50,"qty3":12.75,"qty4":12.00}` |
| Stock | Quantity available | `10` |
| Category | Product category | `Cichlids` |
| Image | Main image path | `/static/products/fish-1.jpg` |
| Images | All images (comma-separated) | `/static/products/fish-1.jpg,/static/products/fish-2.jpg` |
| Description | Product description | `Peaceful cichlid...` |
| CareLevel | Difficulty level | `Beginner` / `Intermediate` / `Expert` |
| TempRange | Temperature range | `72-82°F` |
| pHRange | pH range | `6.0-8.0` |
| MinTank | Minimum tank size | `30 gallons` |
| Temperament | Behavior | `Peaceful` / `Semi-Aggressive` |
| Diet | Feeding habits | `Omnivore` / `Herbivore` / `Carnivore` |

## Payment Integration

### Square Setup

1. Create a Square account at https://squareup.com
2. Navigate to Online Checkout
3. Create checkout links for each product
4. Update the links in `src/index.tsx` (search for `square.link`)

### PayPal Setup

1. Create a PayPal Business account
2. Get your Client ID from https://developer.paypal.com
3. Replace `YOUR_PAYPAL_CLIENT_ID` in `src/index.tsx`

## Managing Images

### Uploading Product Photos

1. Place images in `public/static/products/`
2. Name them descriptively: `electric-blue-acara-1.jpg`
3. Update the Google Sheet with the path: `/static/products/electric-blue-acara-1.jpg`
4. For multiple images, list all paths separated by commas

### Logo

- Replace `public/static/logo.png` with your Kooperkai Aquatics logo
- Recommended size: 200x200px or larger
- Format: PNG with transparent background preferred

## Manual Product Sync

To manually sync products from Google Sheets (instead of waiting for the cron):

```bash
npm run sync-products
```

This is useful for testing or immediate updates.

## Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Sync products manually
npm run sync-products

# Watch mode for sync (dev only)
npm run sync-products:watch

# Deploy to Cloudflare
npm run deploy
```

## Environment Variables

Set these in the Cloudflare Pages dashboard (Settings → Environment Variables):

- `GOOGLE_SERVICE_ACCOUNT_EMAIL` - Service account email
- `GOOGLE_PRIVATE_KEY` - Service account private key
- `GOOGLE_SHEET_ID` - Your Google Sheet ID

For local development, create a `.env` file (see `.env.example`).

## Support

### Common Issues

**Products not updating?**
- Check that the Google Sheet is shared with the service account
- Verify the Sheet ID is correct
- Check Cloudflare Workers logs for errors

**Images not loading?**
- Ensure images are in `public/static/products/`
- Verify the path in Google Sheets matches the file location
- Rebuild and redeploy

**Payments not working?**
- Verify Square/PayPal credentials are correct
- Check that you're using production keys (not sandbox)
- Test with a small amount first

### Getting Help

- 📧 Contact: Check the contact page on the website
- 📝 Issues: Create an issue in this repository
- 📚 Docs: See `docs/SETUP.md` for detailed instructions

## License

Proprietary - All rights reserved by Kooperkai Aquatics

## Credits

Built with ❤️ for Kooperkai Aquatics
