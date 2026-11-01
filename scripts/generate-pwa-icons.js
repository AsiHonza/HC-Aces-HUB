const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicDir = path.join(__dirname, '..', 'public');
const appDir = path.join(__dirname, '..', 'src', 'app');
const acesLogoPath = path.join(publicDir, 'teams', 'aces.png');

if (!fs.existsSync(acesLogoPath)) {
  console.error('Error: aces.png not found at', acesLogoPath);
  process.exit(1);
}

// Helper to composite a resized logo on a solid background
async function createIconWithBg({
  logoBuffer,
  canvasSize,
  logoWidth,
  logoHeight,
  bg = { r: 10, g: 10, b: 10, alpha: 1 }
}) {
  const resizedLogo = await sharp(logoBuffer)
    .resize(logoWidth, logoHeight, { fit: 'contain' })
    .toBuffer();

  const top = Math.round((canvasSize - logoHeight) / 2);
  const left = Math.round((canvasSize - logoWidth) / 2);

  return sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: bg
    }
  })
    .composite([
      {
        input: resizedLogo,
        top,
        left
      }
    ])
    .png();
}

async function generate() {
  console.log('Generating official HC Aces PWA & mobile app icons...');

  // 1. Tightly crop the Aces logo wordmark from public/teams/aces.png
  // Logo bounds: left: 30, top: 87, width: 248, height: 152
  const cropLeft = 30;
  const cropTop = 87;
  const cropWidth = 248;
  const cropHeight = 152;
  const aspect = cropWidth / cropHeight; // ~1.6316

  const croppedLogo = await sharp(acesLogoPath)
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .toBuffer();

  // 2. Standard icons (purpose: any)
  // 512x512 (logo width ~380px)
  const logoW512 = 380;
  const logoH512 = Math.round(logoW512 / aspect);
  await (await createIconWithBg({
    logoBuffer: croppedLogo,
    canvasSize: 512,
    logoWidth: logoW512,
    logoHeight: logoH512
  })).toFile(path.join(publicDir, 'icon-512.png'));
  console.log('✓ icon-512.png (512x512, purpose: any)');

  // 192x192 (logo width ~142px)
  const logoW192 = 142;
  const logoH192 = Math.round(logoW192 / aspect);
  await (await createIconWithBg({
    logoBuffer: croppedLogo,
    canvasSize: 192,
    logoWidth: logoW192,
    logoHeight: logoH192
  })).toFile(path.join(publicDir, 'icon-192.png'));
  console.log('✓ icon-192.png (192x192, purpose: any)');

  // 3. Maskable icons (purpose: maskable)
  // Safe zone diameter is 80% of canvas (radius = 0.4 * canvasSize).
  // For 512x512: radius = 204.8px.
  // With logo width 340px, height 208px: half-diagonal is sqrt(170^2 + 104^2) = 199.3px < 204.8px.
  // This guarantees 0% clipping on Samsung One UI squircles and Pixel circles!
  const maskableW512 = 340;
  const maskableH512 = Math.round(maskableW512 / aspect);
  await (await createIconWithBg({
    logoBuffer: croppedLogo,
    canvasSize: 512,
    logoWidth: maskableW512,
    logoHeight: maskableH512
  })).toFile(path.join(publicDir, 'icon-maskable-512.png'));
  console.log('✓ icon-maskable-512.png (512x512, purpose: maskable - Android Adaptive Icon)');

  // 192x192 maskable
  const maskableW192 = 128;
  const maskableH192 = Math.round(maskableW192 / aspect);
  await (await createIconWithBg({
    logoBuffer: croppedLogo,
    canvasSize: 192,
    logoWidth: maskableW192,
    logoHeight: maskableH192
  })).toFile(path.join(publicDir, 'icon-maskable-192.png'));
  console.log('✓ icon-maskable-192.png (192x192, purpose: maskable)');

  // 4. Apple Touch Icon (180x180)
  const appleW = 136;
  const appleH = Math.round(appleW / aspect);
  await (await createIconWithBg({
    logoBuffer: croppedLogo,
    canvasSize: 180,
    logoWidth: appleW,
    logoHeight: appleH
  })).toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png (180x180, iOS Safari Home Screen)');

  // 5. Android Notification Status Bar Badge (72x72)
  // Android status bar notifications require monochrome white on transparent background
  const { data, info } = await sharp(acesLogoPath)
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const badgeRaw = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const brightness = Math.max(r, g, b);
    if (brightness > 20) {
      badgeRaw[i] = 255;
      badgeRaw[i + 1] = 255;
      badgeRaw[i + 2] = 255;
      badgeRaw[i + 3] = Math.min(255, brightness * 2);
    } else {
      badgeRaw[i] = 0;
      badgeRaw[i + 1] = 0;
      badgeRaw[i + 2] = 0;
      badgeRaw[i + 3] = 0;
    }
  }

  const badgeW = 54;
  const badgeH = Math.round(badgeW / aspect);
  const badgeTopPad = Math.round((72 - badgeH) / 2);
  const badgeBottomPad = 72 - badgeH - badgeTopPad;
  const badgeLeftPad = Math.round((72 - badgeW) / 2);
  const badgeRightPad = 72 - badgeW - badgeLeftPad;

  await sharp(badgeRaw, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize(badgeW, badgeH, { fit: 'contain' })
    .extend({
      top: badgeTopPad,
      bottom: badgeBottomPad,
      left: badgeLeftPad,
      right: badgeRightPad,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(path.join(publicDir, 'badge-72.png'));
  console.log('✓ badge-72.png (72x72, monochrome transparent notification badge)');

  // 6. Favicon (ICO format with 32x32 PNG payload)
  const icoPng = await (await createIconWithBg({
    logoBuffer: croppedLogo,
    canvasSize: 32,
    logoWidth: 26,
    logoHeight: Math.round(26 / aspect)
  })).toBuffer();

  const icoHeader = Buffer.alloc(22);
  icoHeader.writeUInt16LE(0, 0); // reserved
  icoHeader.writeUInt16LE(1, 2); // ICO type
  icoHeader.writeUInt16LE(1, 4); // 1 image
  icoHeader.writeUInt8(32, 6);   // width
  icoHeader.writeUInt8(32, 7);   // height
  icoHeader.writeUInt8(0, 8);    // colors
  icoHeader.writeUInt8(0, 9);    // reserved
  icoHeader.writeUInt16LE(1, 10); // planes
  icoHeader.writeUInt16LE(32, 12); // bpp
  icoHeader.writeUInt32LE(icoPng.length, 14); // data size
  icoHeader.writeUInt32LE(22, 18); // offset

  const icoBuffer = Buffer.concat([icoHeader, icoPng]);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('✓ favicon.ico in src/app/ and public/');

  console.log('\nAll official HC Aces icons generated successfully!');
}

generate().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
