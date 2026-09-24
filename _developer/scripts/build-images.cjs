/**
 * Image pipeline: Midwest Identity Services
 * ------------------------------------------------------------
 * Reads _developer/images.config.json and generates web-ready files:
 *
 *   _developer/image-sources/<file>  →  assets/images/photos/<name>-<width>.webp
 *                                       assets/images/photos/<name>-<width>.jpg
 *                                       assets/images/photos/<name>.jpg  (largest size, only when "fullSize": true)
 *   logo                             →  assets/images/brand/logo-white.png, logo-ink.png
 *   social preview                   →  assets/images/social/og-image.jpg
 *
 * To replace a photo:
 *   1. Put the new file in _developer/image-sources/ using the same filename
 *      listed in images.config.json (or edit the "source" value).
 *   2. From the _developer folder run:
 *        npm install      (first time only)
 *        npm run images
 *   The HTML does not need to change.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DEV = path.resolve(__dirname, '..');
const SITE = path.resolve(DEV, '..');
const SRC = path.join(DEV, 'image-sources');
const IMAGES = path.join(SITE, 'assets', 'images');
const PHOTOS = path.join(IMAGES, 'photos');
const BRAND = path.join(IMAGES, 'brand');
const SOCIAL = path.join(IMAGES, 'social');
const config = JSON.parse(fs.readFileSync(path.join(DEV, 'images.config.json'), 'utf8'));

const ratio = (r) => {
  if (!r) return null;
  const [w, h] = r.split(':').map(Number);
  return h / w;
};

async function buildPhoto(item) {
  const input = path.join(SRC, item.source);
  if (!fs.existsSync(input)) {
    console.warn(`  ! missing source for "${item.name}": ${item.source}`);
    return;
  }
  fs.mkdirSync(PHOTOS, { recursive: true });
  const r = ratio(item.aspect);
  const widths = [...item.widths].sort((a, b) => a - b);

  for (const w of widths) {
    const h = r ? Math.round(w * r) : null;
    const base = sharp(input).rotate().resize({
      width: w,
      height: h || undefined,
      fit: 'cover',
      position: item.position || 'attention',
      withoutEnlargement: false,
    });
    await base.clone().webp({ quality: item.quality || 76, effort: 5 }).toFile(path.join(PHOTOS, `${item.name}-${w}.webp`));
    await base.clone().jpeg({ quality: item.quality || 78, mozjpeg: true, progressive: true }).toFile(path.join(PHOTOS, `${item.name}-${w}.jpg`));
  }
  // Only photos flagged "fullSize" get an unnumbered copy. It exists for
  // og:image and schema tags, which need one fixed URL, so generating it
  // for every photo just left files nothing linked to.
  if (item.fullSize) {
    const largest = widths[widths.length - 1];
    fs.copyFileSync(path.join(PHOTOS, `${item.name}-${largest}.jpg`), path.join(PHOTOS, `${item.name}.jpg`));
  }
  console.log(`  ✓ ${item.name} (${widths.join(', ')}w${item.aspect ? `, ${item.aspect}` : ''})`);
}

async function buildLogos(brand) {
  const input = path.join(SRC, brand.source);
  if (!fs.existsSync(input)) {
    console.warn('  ! logo source missing, so the header and footer will show a broken image until it is added.');
    return;
  }
  fs.mkdirSync(BRAND, { recursive: true });

  const white = sharp(input).trim({ threshold: 1 }).resize({ width: brand.width });
  await white.clone().png({ compressionLevel: 9 }).toFile(path.join(BRAND, 'logo-white.png'));

  // Ink version: keep the alpha mask of the white logo, fill with the brand ink colour.
  const { data: alpha, info } = await white.clone().ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  await sharp({ create: { width: info.width, height: info.height, channels: 3, background: brand.inkColor } })
    .joinChannel(alpha, { raw: { width: info.width, height: info.height, channels: 1 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(BRAND, 'logo-ink.png'));
  console.log(`  ✓ brand/logo-white.png + brand/logo-ink.png (${info.width}×${info.height})`);
  return info;
}

async function buildOgImage(og) {
  const bg = path.join(SRC, og.background);
  const logo = path.join(BRAND, 'logo-white.png');
  if (!fs.existsSync(bg) || !fs.existsSync(logo)) return;
  fs.mkdirSync(SOCIAL, { recursive: true });
  const W = 1200, H = 630;
  const shade = Buffer.from(
    `<svg width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#0B1120" stop-opacity=".96"/><stop offset=".55" stop-color="#0B1120" stop-opacity=".82"/><stop offset="1" stop-color="#0B1120" stop-opacity=".35"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><rect x="72" y="${H - 96}" width="64" height="3" fill="#6FD6AE"/></svg>`
  );
  const logoBuf = await sharp(logo).resize({ width: 420 }).toBuffer();
  await sharp(bg)
    .resize(W, H, { fit: 'cover', position: 'centre' })
    .composite([{ input: shade }, { input: logoBuf, left: 72, top: 220 }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(SOCIAL, 'og-image.jpg'));
  console.log('  ✓ social/og-image.jpg (1200×630)');
}

(async () => {
  console.log('Building images…');
  await buildLogos(config.brand);
  for (const item of config.photos) await buildPhoto(item);
  if (config.og) await buildOgImage(config.og);
  console.log('Done.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
