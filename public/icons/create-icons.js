import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define icon sizes
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create SVG content for a simple placeholder icon
// This creates a simple gradient background with "MF" text in the center
function createSvgIcon(size) {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
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
}

// Ensure the icons directory exists
const iconsDir = __dirname;

// Create icons for each size
sizes.forEach(size => {
  const svgContent = createSvgIcon(size);
  const filePath = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(filePath, svgContent);
  console.log(`Created icon: ${filePath}`);
});

console.log('All icons created successfully!');
