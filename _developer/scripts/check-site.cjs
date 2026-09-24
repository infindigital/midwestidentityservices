/**
 * Site check: Midwest Identity Services
 * ------------------------------------------------------------
 * Run from the _developer folder:   npm run check
 *
 * Reports, per page:
 *   - internal links that point at a file or folder that does not exist
 *   - images and stylesheets whose file is missing
 *   - icons used with <use href="#i-..."> that are not in the page's sprite
 *   - JSON-LD blocks that do not parse
 *   - missing title, meta description, canonical or H1, and duplicate H1s
 *   - canonical URLs that do not match the page's own path
 */
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..', '..');
const SKIP_DIRS = new Set(['_developer', 'node_modules', '.git', '.vscode', 'mail']);
const ORIGIN = 'https://midwestidentityservices.com';

const pages = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) pages.push(full);
  }
})(SITE);

let problems = 0;
const report = (rel, kind, detail) => {
  problems += 1;
  console.log(`  ${kind.padEnd(16)} ${rel}: ${detail}`);
};

const seenCanonical = new Map();

for (const file of pages.sort()) {
  const rel = path.relative(SITE, file).split(path.sep).join('/');
  const html = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);

  // ---- head essentials ----
  if (!/<title>[^<]+<\/title>/i.test(html)) report(rel, 'no-title', 'missing <title>');
  if (!/<meta\s+name="description"\s+content="[^"]+"/i.test(html)) report(rel, 'no-description', 'missing meta description');

  const h1s = html.match(/<h1\b/gi) || [];
  if (h1s.length === 0) report(rel, 'no-h1', 'page has no H1');
  if (h1s.length > 1) report(rel, 'many-h1', `${h1s.length} H1 elements`);

  const canonical = (html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i) || [])[1];
  const noindex = /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html);
  if (!canonical && rel !== '404.html') {
    report(rel, 'no-canonical', 'missing canonical');
  } else if (canonical) {
    const expected = `${ORIGIN}/${rel.replace(/index\.html$/, '').replace(/\.html$/, '')}`;
    if (canonical !== expected) report(rel, 'canonical', `points at ${canonical}, expected ${expected}`);
    if (seenCanonical.has(canonical) && !noindex) {
      report(rel, 'dup-canonical', `same canonical as ${seenCanonical.get(canonical)}`);
    }
    seenCanonical.set(canonical, rel);
  }

  // ---- icons ----
  const defined = new Set((html.match(/<symbol\s+id="([^"]+)"/g) || []).map((m) => m.match(/id="([^"]+)"/)[1]));
  const used = new Set((html.match(/<use\s+href="#([^"]+)"/g) || []).map((m) => m.match(/#([^"]+)"/)[1]));
  for (const id of used) {
    if (!defined.has(id)) report(rel, 'missing-icon', `#${id}`);
  }

  // ---- JSON-LD ----
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1]);
    } catch (err) {
      report(rel, 'bad-json-ld', err.message);
    }
  }

  // ---- local targets ----
  const targets = [
    ...(html.match(/\shref="([^"#][^"]*)"/g) || []),
    ...(html.match(/\ssrc="([^"]+)"/g) || []),
    ...(html.match(/\ssrcset="([^"]+)"/g) || []).flatMap((s) => {
      const list = s.match(/srcset="([^"]+)"/)[1].split(',').map((p) => p.trim().split(/\s+/)[0]);
      return list.map((u) => ` src="${u}"`);
    }),
  ].map((s) => s.match(/="([^"]+)"/)[1]);

  for (const raw of new Set(targets)) {
    if (/^(https?:|mailto:|tel:|data:|#|\/\/)/i.test(raw)) continue;
    const clean = raw.split('#')[0].split('?')[0];
    if (!clean) continue;
    const target = path.resolve(dir, clean);
    const candidates = clean.endsWith('/') || !path.extname(clean)
      ? [path.join(target, 'index.html'), target]
      : [target];
    if (!candidates.some((c) => fs.existsSync(c))) report(rel, 'broken-link', raw);
  }
}

console.log(`\nChecked ${pages.length} page${pages.length === 1 ? '' : 's'}.`);
console.log(problems ? `${problems} problem${problems === 1 ? '' : 's'} found.` : 'No problems found.');
process.exitCode = problems ? 1 : 0;
