#!/usr/bin/env node

/**
 * Kooperkai Aquatics - Google Sheets Product Sync
 *
 * This script syncs product data from Google Sheets to products.json
 * Run manually: npm run sync-products
 * Runs automatically: Every 10 minutes via Cloudflare Worker cron
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a Google Cloud project
 * 2. Enable Google Sheets API
 * 3. Create a Service Account and download JSON key
 * 4. Share your Google Sheet with the service account email
 * 5. Set environment variables in Cloudflare dashboard or .env file
 */

import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import * as fs from 'fs/promises';
import * as path from 'path';

interface Product {
  id: string;
  name: string;
  scientific: string;
  size: string;
  price: number;
  priceVolume?: {
    qty2: number;
    qty3: number;
    qty4: number;
  };
  stock: number;
  category: string;
  image: string;
  images?: string[];
  description: string;
  careLevel: string;
  tempRange: string;
  phRange: string;
  tankSize: string;
  temperament: string;
  diet: string;
}

/**
 * Sync products from Google Sheets to JSON file
 */
async function syncFromGoogleSheets(): Promise<Product[]> {
  try {
    console.log('🔄 Starting product sync from Google Sheets...')

    // Validate environment variables
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const privateKey = process.env.GOOGLE_PRIVATE_KEY
    const sheetId = process.env.GOOGLE_SHEET_ID

    if (!serviceAccountEmail || !privateKey || !sheetId) {
      throw new Error(
        'Missing required environment variables:\n' +
        '  - GOOGLE_SERVICE_ACCOUNT_EMAIL\n' +
        '  - GOOGLE_PRIVATE_KEY\n' +
        '  - GOOGLE_SHEET_ID\n' +
        'Please set these in your Cloudflare dashboard or .env file'
      )
    }

    // Initialize authentication
    const serviceAccountAuth = new JWT({
      email: serviceAccountEmail,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })

    console.log('✓ Authentication configured')

    // Load the spreadsheet
    const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth)
    await doc.loadInfo()
    console.log(`✓ Loaded sheet: "${doc.title}"`)

    // Get the Products sheet
    const sheet = doc.sheetsByTitle['Products']
    if (!sheet) {
      throw new Error(
        'Could not find "Products" sheet. Please ensure your Google Sheet has a tab named "Products"'
      )
    }

    const rows = await sheet.getRows()
    console.log(`✓ Found ${rows.length} product rows`)

    // Transform rows to product objects
    const products: Product[] = rows
      .filter((row) => row.get('Name')) // Skip empty rows
      .map((row, index) => {
        try {
          // Parse volume pricing JSON if provided
          let priceVolume = undefined
          const volumePriceStr = row.get('VolumePrice')
          if (volumePriceStr && volumePriceStr.trim()) {
            try {
              priceVolume = JSON.parse(volumePriceStr)
            } catch (e) {
              console.warn(`⚠️  Invalid VolumePrice JSON for row ${index + 2}: ${volumePriceStr}`)
            }
          }

          // Parse images array
          let images = [row.get('Image') || '/static/products/placeholder.jpg']
          const imagesStr = row.get('Images')
          if (imagesStr && imagesStr.trim()) {
            images = imagesStr.split(',').map((s: string) => s.trim())
          }

          return {
            id: `product-${index + 1}`,
            name: row.get('Name') || '',
            scientific: row.get('Scientific') || '',
            size: row.get('Size') || '',
            price: parseFloat(row.get('Price') || '0'),
            priceVolume,
            stock: parseInt(row.get('Stock') || '0', 10),
            category: row.get('Category') || 'Cichlids',
            image: row.get('Image') || '/static/products/placeholder.jpg',
            images,
            description: row.get('Description') || '',
            careLevel: row.get('CareLevel') || 'Beginner',
            tempRange: row.get('TempRange') || '72-78°F',
            phRange: row.get('pHRange') || '6.5-7.5',
            tankSize: row.get('MinTank') || '20 gallons',
            temperament: row.get('Temperament') || 'Peaceful',
            diet: row.get('Diet') || 'Omnivore',
          }
        } catch (error) {
          console.error(`❌ Error parsing row ${index + 2}:`, error)
          throw error
        }
      })

    // Write to JSON file
    const dataDir = path.join(process.cwd(), 'data')
    const outputPath = path.join(dataDir, 'products.json')

    // Ensure data directory exists
    await fs.mkdir(dataDir, { recursive: true })

    // Write the file
    await fs.writeFile(
      outputPath,
      JSON.stringify(products, null, 2),
      'utf-8'
    )

    console.log(`✅ Successfully synced ${products.length} products to ${outputPath}`)

    // Log product summary
    const categories = [...new Set(products.map(p => p.category))]
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0)
    console.log(`📊 Categories: ${categories.join(', ')}`)
    console.log(`📦 Total stock: ${totalStock} fish`)

    return products
  } catch (error) {
    console.error('❌ Error syncing from Google Sheets:', error)
    throw error
  }
}

/**
 * Cloudflare Worker scheduled handler
 * This runs automatically every 10 minutes via cron
 */
export async function scheduled(
  event: ScheduledEvent,
  env: any,
  ctx: ExecutionContext
): Promise<void> {
  try {
    console.log('⏰ Cron job triggered:', new Date().toISOString())

    // Set environment variables from env
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    process.env.GOOGLE_PRIVATE_KEY = env.GOOGLE_PRIVATE_KEY
    process.env.GOOGLE_SHEET_ID = env.GOOGLE_SHEET_ID

    await syncFromGoogleSheets()
  } catch (error) {
    console.error('Cron job failed:', error)
  }
}

// Run immediately if executed directly (for manual syncs)
if (import.meta.url === `file://${process.argv[1]}`) {
  syncFromGoogleSheets()
    .then(() => {
      console.log('✨ Sync complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Sync failed:', error)
      process.exit(1)
    })
}

export { syncFromGoogleSheets }
