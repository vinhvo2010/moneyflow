import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import sharp from 'sharp';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define icon sizes
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create a simple PNG icon for each size
async function createPngIcon(size) {
  try {
    // Create a gradient background with text
    const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#4a00e0;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#8e2de2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}" 
        font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">MF</text>
    </svg>`;

    // Convert SVG to PNG
    const pngBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();

    // Save the PNG file
    const filePath = path.join(__dirname, `icon-${size}x${size}.png`);
    fs.writeFileSync(filePath, pngBuffer);
    console.log(`Created PNG icon: ${filePath}`);
  } catch (error) {
    console.error(`Error creating icon size ${size}:`, error);
  }
}

// Create all icons
async function createAllIcons() {
  for (const size of sizes) {
    await createPngIcon(size);
  }
  console.log('All PNG icons created successfully!');
}

createAllIcons();
