// Simple SVG icon generator for PWA
import { writeFileSync } from 'fs';
import { mkdirSync } from 'fs';

// Create public directory if it doesn't exist
try {
  mkdirSync('client/public', { recursive: true });
} catch (e) {}

const svg192 = `<svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" fill="#000000"/>
  <text x="50%" y="50%" font-family="monospace" font-size="120" fill="#00ff00" text-anchor="middle" dominant-baseline="middle">⚡</text>
</svg>`;

const svg512 = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#000000"/>
  <text x="50%" y="50%" font-family="monospace" font-size="320" fill="#00ff00" text-anchor="middle" dominant-baseline="middle">⚡</text>
</svg>`;

writeFileSync('client/public/icon-192.svg', svg192);
writeFileSync('client/public/icon-512.svg', svg512);

console.log('✅ PWA icons generated');
