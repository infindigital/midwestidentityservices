/**
 * Layout sync: Midwest Identity Services
 * ------------------------------------------------------------
 * Injects the shared header (icon sprite, desktop nav, mobile nav) and
 * footer into every HTML page, so navigation stays identical site-wide.
 *
 *   Edit:  _developer/scripts/partials/header.html
 *          _developer/scripts/partials/footer.html
 *   Run:   npm run layout   (from the _developer folder)
 *
 * Tokens used in the partials:
 *   {{ROOT}}            relative path to the site root ("", "../" or "../../")
 *   {{HOME}}            link to the homepage
 *   {{CURRENT:name}}    " is-current" on the desktop trigger for the active section
 *   {{OPEN:name}}       "true" when the mobile group for the active section starts expanded
 *   {{HIDDEN:name}}     " hidden" unless the mobile group is the active section
 * Links that point to the current page automatically receive aria-current="page".
 */
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..', '..');
const PARTIALS = path.join(__dirname, 'partials');
const SKIP = new Set(['node_modules', 'assets', '_developer', '.git', '.vscode']);

const MARKS = {
  header: ['<!-- LAYOUT:HEADER -->', '<!-- /LAYOUT:HEADER -->'],
  footer: ['<!-- LAYOUT:FOOTER -->', '<!-- /LAYOUT:FOOTER -->'],
};
const NOTE = '<!-- Generated from _developer/scripts/partials. Edit the partial, then run: npm run layout -->';

const templates = {
  header: fs.readFileSync(path.join(PARTIALS, 'header.html'), 'utf8'),
  footer: fs.readFileSync(path.join(PARTIALS, 'footer.html'), 'utf8'),
};

function findPages(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) findPages(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

function pageInfo(file) {
  const rel = path.relative(SITE, file).split(path.sep).join('/');
  // 404.html sits at the root and sets <base href="/"> itself when served, so relative paths work everywhere.
  if (rel === '404.html') return { rel, page: null, root: '', home: './' };
  const page = rel.replace(/index\.html$/, '');
  const depth = page.split('/').filter(Boolean).length;
  const root = '../'.repeat(depth);
  return { rel, page, root, home: depth ? root : './' };
}

const SECTIONS = {
  individuals: [
    'individual-fingerprinting/', 'live-scan-fingerprinting/', 'fd-258-ink-card-fingerprinting/',
    'atf-fingerprinting/', 'finra-fingerprinting/', 'fbi-background-checks-apostille/',
    'nics-appeal-fingerprinting/', 'mobile-fingerprinting/',
  ],
  business: [
    'business-solutions/', 'corporate-fingerprinting/', 'group-fingerprinting/',
    'vendor-credentialing/', 'vendor-contractor-background-screening/',
    'alarm-security-group-fingerprinting/', 'usps-contractor-fingerprinting/',
  ],
  testing: [
    'drug-testing/', '5-panel-drug-testing/', '9-panel-drug-testing/', '10-panel-drug-testing/',
    'dot-drug-and-alcohol/', 'dot-5-panel-testing/', 'dot-post-accident-testing/', 'purpose-of-dot/',
  ],
  resources: [
    'fingerprint-methods/', 'drug-testing-basics/', 'florida-live-scan/', 'st-louis-fdle/',
    'columbia-fdle/', 'atf-efile-fingerprinting/', 'blogs/',
    'how-long-do-fbi-background-check-results-take/', 'what-is-an-ori-number/',
    'live-scan-vs-ink-card/', 'fingerprint-rejection-causes/',
    'what-is-live-scan-fingerprinting-and-where-to-get-it-done-in-kansas-city/',
    'secure-your-future-locate-certified-fingerprinting-services-in-kansas-city/',
    'kansas-citys-premier-fingerprinting-services/',
  ],
};

function sectionOf(page) {
  if (page == null) return null;
  for (const [name, pages] of Object.entries(SECTIONS)) {
    if (pages.includes(page)) return name;
  }
  return null;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function render(tpl, info) {
  const section = sectionOf(info.page);
  let html = tpl
    .split('{{ROOT}}').join(info.root)
    .split('{{HOME}}').join(info.home)
    .replace(/\{\{CURRENT:(\w+)\}\}/g, (_, s) => (s === section ? ' is-current' : ''))
    .replace(/\{\{OPEN:(\w+)\}\}/g, (_, s) => (s === section ? 'true' : 'false'))
    .replace(/\{\{HIDDEN:(\w+)\}\}/g, (_, s) => (s === section ? '' : ' hidden'));

  if (info.page != null) {
    const self = info.page === '' ? './' : info.root + info.page;
    html = html.replace(new RegExp(`(<a\\b[^>]*?\\shref="${escapeRe(self)}")`, 'g'), '$1 aria-current="page"');
  }
  return html.trimEnd();
}

function block(kind, content) {
  const [start, end] = MARKS[kind];
  return `${start}\n  ${NOTE}\n${content}\n  ${end}`;
}

function inject(html, kind, content) {
  const [start, end] = MARKS[kind];
  const i = html.indexOf(start);
  const j = html.indexOf(end);
  if (i !== -1 && j !== -1) {
    return html.slice(0, i) + block(kind, content) + html.slice(j + end.length);
  }
  // First run on a page without markers: replace the legacy inline layout.
  if (kind === 'header') {
    const a = html.indexOf('<a class="skip-link"');
    const b = html.indexOf('<main id="main">');
    if (a === -1 || b === -1) throw new Error('header boundaries not found');
    return `${html.slice(0, a)}${block(kind, content)}\n\n  ${html.slice(b)}`;
  }
  const a = html.indexOf('</main>');
  const b = html.indexOf('</body>');
  if (a === -1 || b === -1) throw new Error('footer boundaries not found');
  return `${html.slice(0, a + '</main>'.length)}\n\n  ${block(kind, content)}\n${html.slice(b)}`;
}

let changed = 0;
for (const file of findPages(SITE)) {
  const info = pageInfo(file);
  const before = fs.readFileSync(file, 'utf8');
  try {
    let after = inject(before, 'header', render(templates.header, info));
    after = inject(after, 'footer', render(templates.footer, info));
    if (after !== before) {
      fs.writeFileSync(file, after);
      changed++;
      console.log(`  updated ${info.rel}`);
    }
  } catch (err) {
    console.warn(`  ! skipped ${info.rel}: ${err.message}`);
  }
}
console.log(`Layout sync complete (${changed} file${changed === 1 ? '' : 's'} changed).`);
