const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 512x512 SVG Master Emblem
const svg512 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#161e2e"/>
      <stop offset="100%" stop-color="#0a0d14"/>
    </radialGradient>
    <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff9d33"/>
      <stop offset="50%" stop-color="#ff7b00"/>
      <stop offset="100%" stop-color="#e65c00"/>
    </linearGradient>
    <linearGradient id="shieldBorder" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffaa44"/>
      <stop offset="100%" stop-color="#b34700"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#ff7700" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="512" height="512" rx="100" fill="url(#bgGrad)"/>
  
  <!-- Subtle Outer Accent Ring -->
  <rect x="16" y="16" width="480" height="480" rx="90" fill="none" stroke="#ff7700" stroke-opacity="0.15" stroke-width="2"/>

  <!-- Shield Base -->
  <path d="M 256 60 L 410 110 L 410 270 C 410 370 256 440 256 440 C 256 440 102 370 102 270 L 102 110 Z" 
        fill="#101520" stroke="url(#shieldBorder)" stroke-width="8" filter="url(#glow)" stroke-linejoin="round"/>

  <!-- Inner Shield Fill -->
  <path d="M 256 78 L 392 122 L 392 265 C 392 352 256 418 256 418 C 256 418 120 352 120 265 L 120 122 Z" 
        fill="#0d111a" stroke="#ff8000" stroke-opacity="0.3" stroke-width="2"/>

  <!-- Crossed Hockey Sticks -->
  <g stroke="#ffffff" stroke-width="12" stroke-linecap="round" opacity="0.9">
    <!-- Left stick -->
    <line x1="160" y1="140" x2="352" y2="340"/>
    <path d="M 352 340 L 382 356" stroke-width="14"/>
    <!-- Right stick -->
    <line x1="352" y1="140" x2="160" y2="340"/>
    <path d="M 160 340 L 130 356" stroke-width="14"/>
  </g>

  <!-- Center Ace Letter 'A' -->
  <text x="256" y="305" 
        font-family="'Arial Black', 'Space Grotesk', sans-serif" 
        font-size="190" 
        font-weight="900" 
        text-anchor="middle" 
        fill="url(#orangeGrad)" 
        stroke="#ffffff" 
        stroke-width="5"
        stroke-linejoin="round">A</text>

  <!-- Hockey Puck at Base -->
  <ellipse cx="256" cy="360" rx="42" ry="14" fill="#05070a" stroke="#ff7700" stroke-width="3"/>
  <ellipse cx="256" cy="356" rx="42" ry="14" fill="#1b2230"/>
  <text x="256" y="360" font-family="sans-serif" font-size="10" font-weight="bold" fill="#ff7700" text-anchor="middle" letter-spacing="1">ACES</text>

  <!-- Team Name Banner -->
  <rect x="156" y="90" width="200" height="34" rx="6" fill="#ff7700"/>
  <text x="256" y="114" 
        font-family="'Arial Black', 'Space Grotesk', sans-serif" 
        font-size="18" 
        font-weight="900" 
        letter-spacing="4" 
        fill="#0a0d14" 
        text-anchor="middle">HC ACES</text>
</svg>
`;

// Monochrome / Silhouette Badge (72x72) for Android Notification bar
const badgeSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" width="72" height="72">
  <path d="M 36 6 L 60 14 L 60 38 C 60 52 36 64 36 64 C 36 64 12 52 12 38 L 12 14 Z" 
        fill="none" stroke="#ffffff" stroke-width="4" stroke-linejoin="round"/>
  <text x="36" y="44" 
        font-family="'Arial Black', sans-serif" 
        font-size="30" 
        font-weight="900" 
        text-anchor="middle" 
        fill="#ffffff">A</text>
</svg>
`;

async function generate() {
  console.log('Generating PWA icons...');
  const svgBuffer = Buffer.from(svg512);

  // 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));

  // 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));

  // Maskable 512x512 (with padding for circle masks)
  await sharp(svgBuffer)
    .resize(410, 410)
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: '#0a0d14'
    })
    .png()
    .toFile(path.join(publicDir, 'icon-maskable-512.png'));

  // Maskable 192x192
  await sharp(svgBuffer)
    .resize(154, 154)
    .extend({
      top: 19,
      bottom: 19,
      left: 19,
      right: 19,
      background: '#0a0d14'
    })
    .png()
    .toFile(path.join(publicDir, 'icon-maskable-192.png'));

  // Android Status Bar Badge 72x72
  await sharp(Buffer.from(badgeSvg))
    .resize(72, 72)
    .png()
    .toFile(path.join(publicDir, 'badge-72.png'));

  console.log('Successfully generated all PWA icons in public/');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
