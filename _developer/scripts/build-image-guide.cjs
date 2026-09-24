/**
 * Writes "_developer/IMAGE REPLACEMENT GUIDE.txt" for the client.
 *
 *   npm run guide        (from the _developer folder)
 *
 * Every photo on the site is a temporary stock image. This guide lists each
 * one: the file to drop into image-sources/, the shape it is cropped to, and
 * the pages it actually appears on (scanned from the "IMAGE SLOT:" comments in
 * the HTML, so it cannot drift out of date).
 */
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..', '..');
const DEV = path.resolve(__dirname, '..');
const SKIP = new Set(['_developer', 'assets', 'node_modules']);

const config = JSON.parse(fs.readFileSync(path.join(DEV, 'images.config.json'), 'utf8'));

/* --- where is each slot used? -------------------------------------------- */
const usage = new Map();
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP.has(entry.name)) walk(path.join(dir, entry.name));
      continue;
    }
    if (!entry.name.endsWith('.html')) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(SITE, full).split(path.sep).join('/');
    const page = rel === '404.html' ? '404.html' : `/${rel.replace(/index\.html$/, '')}`;
    const html = fs.readFileSync(full, 'utf8');
    for (const m of html.matchAll(/IMAGE SLOT: ([a-z0-9-]+)/g)) {
      if (!usage.has(m[1])) usage.set(m[1], new Set());
      usage.get(m[1]).add(page);
    }
  }
})(SITE);

/* --- render -------------------------------------------------------------- */
const SHAPES = {
  '3:2': 'landscape (wider than tall)',
  '4:5': 'portrait (taller than wide)',
  '16:9': 'wide banner',
  '1:1': 'square',
};

const wrap = (text, width, indent) => {
  const out = [];
  let line = '';
  for (const word of text.split(' ')) {
    if ((`${line} ${word}`).trim().length > width) { out.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(line);
  return out.map((l, i) => (i ? indent + l : l)).join('\n');
};

const lines = [];
const say = (s = '') => lines.push(s);

say('MIDWEST IDENTITY SERVICES WEBSITE');
say('Image replacement guide');
say('='.repeat(60));
say();
say(wrap('Every photo on the website is a temporary stock image, chosen to show '
  + 'the right subject at the right shape. Replace them with your own photos '
  + 'whenever you are ready: no page needs to be edited.', 76, ''));
say();
say('HOW TO REPLACE A PHOTO');
say('-'.repeat(22));
say();
say('  1. Pick the photo below that you want to change.');
say('  2. Save your new picture using EXACTLY the file name shown as');
say('     "Replace the file". Keep the same file extension (.jpg or .png).');
say('  3. Put it into the folder:  _developer/image-sources/');
say('     (overwrite the file that is already there)');
say('  4. Ask your developer to run:  npm run images');
say();
say(`  ${wrap('That one command re-cuts your picture into every size the website '
  + 'needs and updates all the pages that use it.', 74, '  ')}`);
say();
say('A few tips');
say('-'.repeat(10));
say();
say(wrap('- Send the largest version you have. Big pictures can be made '
  + 'smaller without losing quality; small ones cannot be made larger.', 76, '  '));
say(wrap('- Match the shape shown for each photo. A portrait photo put in a '
  + 'landscape slot will be cropped at the top and bottom.', 76, '  '));
say(wrap('- Keep the important part of the picture near the middle, so it '
  + 'survives cropping on phones.', 76, '  '));
say(wrap('- Do not use pictures of an FBI seal, badge or government logo. '
  + 'They suggest an official affiliation the business does not have.', 76, '  '));
say(wrap('- Make sure you have permission to use every photo of a real person '
  + 'or a real workplace.', 76, '  '));
say();
say();

const photos = config.photos || [];
const placed = photos.filter((p) => usage.has(p.name));
const spare = photos.filter((p) => !usage.has(p.name));

const block = (p, n) => {
  const pages = [...(usage.get(p.name) || [])].sort();
  say(`${n}. ${p.name.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())}`);
  say(`   Replace the file:  _developer/image-sources/${p.source}`);
  say(`   Shape needed:      ${p.aspect}  ${SHAPES[p.aspect] || ''}`);
  say(`   Smallest useful:   ${Math.max(...p.widths)} pixels wide`);
  if (pages.length) {
    say(`   Appears on:        ${wrap(pages.join(', '), 55, ' '.repeat(22))}`);
  }
  if (p.usedOn) say(`   Purpose:           ${wrap(p.usedOn, 55, ' '.repeat(22))}`);
  say();
};

say('THE PHOTOS ON THE WEBSITE');
say('='.repeat(60));
say();
placed.forEach((p, i) => block(p, i + 1));

if (spare.length) {
  say();
  say('PREPARED BUT NOT CURRENTLY ON A PAGE');
  say('='.repeat(60));
  say();
  say(wrap('These are ready to use if a page needs them later. Nothing breaks '
    + 'if they are left alone.', 76, ''));
  say();
  spare.forEach((p, i) => block(p, i + 1));
}

say();
say('LOGO AND FAVICON');
say('='.repeat(60));
say();
say(wrap('The logo and the small icon in the browser tab live in '
  + 'assets/images/brand/. To change them, send your developer the logo as an '
  + 'SVG file if you have one, or as a large PNG with a transparent '
  + 'background.', 76, ''));
say();
say('SOCIAL SHARING PICTURE');
say('='.repeat(60));
say();
say(wrap('assets/images/social/og-image.jpg is the picture that appears when '
  + 'someone shares a link to the site on Facebook, LinkedIn, WhatsApp or in '
  + 'a text message. It is generated from the "digital fingerprint" photo '
  + 'above, so replacing that photo replaces this one too.', 76, ''));
say();

const out = path.join(DEV, 'IMAGE REPLACEMENT GUIDE.txt');
fs.writeFileSync(out, `${lines.join('\n').replace(/\n{4,}/g, '\n\n\n')}\n`);
console.log(`IMAGE REPLACEMENT GUIDE.txt written: ${placed.length} photos placed, ${spare.length} spare.`);
