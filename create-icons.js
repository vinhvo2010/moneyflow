// Simple Node.js script to create placeholder icons
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a basic SVG for the icon
const createSvgIcon = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#1e88e5"/>
  <text x="50%" y="50%" font-family="Arial" font-size="${size/4}px" fill="white" text-anchor="middle" dominant-baseline="middle">MF</text>
  <path d="M${size*0.2},${size*0.6} L${size*0.4},${size*0.8} L${size*0.8},${size*0.3}" stroke="white" stroke-width="${size/20}" fill="none"/>
</svg>`;

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Ensure the icons directory exists
const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create each icon
sizes.forEach(size => {
  const iconPath = path.join(iconsDir, `icon-${size}x${size}.png`);
  // For simplicity, we're just writing SVG files with .png extension
  // In a real app, you'd convert SVG to PNG using a library
  fs.writeFileSync(iconPath, createSvgIcon(size));
  console.log(`Created placeholder icon: ${iconPath}`);
});

// Create apple-touch-icon
fs.writeFileSync(
  path.join(__dirname, 'public', 'apple-touch-icon.png'), 
  createSvgIcon(192)
);
console.log('Created apple-touch-icon.png');

// Create robots.txt
fs.writeFileSync(
  path.join(__dirname, 'public', 'robots.txt'),
  'User-agent: *\nAllow: /'
);
console.log('Created robots.txt');

console.log('All placeholder icons created successfully!');
