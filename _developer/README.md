# Midwest Identity Services: main website (developer notes)

A static HTML, CSS and JavaScript rebuild of the main website at
https://midwestidentityservices.com/. It carries the content of the existing
WordPress site over to the design system used by the organizations subdomain
site, page for page and URL for URL.

80 pages (78 indexable), no build step required to view them. Only images, layout partials and
the sitemap are generated.

---

## 1. Folder structure

```
Midwest Main/
├── START HERE - How to open the website.txt   Plain-language guide for the client
├── index.html                                 Homepage
├── 404.html                                   Sets <base href="/"> so it works at any URL
├── robots.txt
├── sitemap.xml                                Generated
│
├── individual-fingerprinting/                 Individuals hub
│   live-scan-fingerprinting/
│   fd-258-ink-card-fingerprinting/
│   atf-fingerprinting/   atf-efile-fingerprinting/
│   finra-fingerprinting/   nics-appeal-fingerprinting/
│   fbi-background-checks-apostille/   mobile-fingerprinting/
│
├── business-solutions/                        Business hub
│   corporate-fingerprinting/   group-fingerprinting/
│   vendor-credentialing/   vendor-contractor-background-screening/
│   alarm-security-group-fingerprinting/   usps-contractor-fingerprinting/
│
├── drug-testing/                              Drug & DOT testing hub
│   5-panel-drug-testing/  9-panel-drug-testing/  10-panel-drug-testing/
│   dot-drug-and-alcohol/  dot-5-panel-testing/  dot-post-accident-testing/
│
├── location/                                  Locations hub
│   fingerprinting-kansas-city-mo/   fingerprinting-kansas-city-ks/
│   fingerprinting-independence-mo/  fingerprinting-lees-summit-mo/
│   fingerprinting-blue-springs-mo/  fingerprinting-liberty-mo/
│   fingerprinting-olathe-ks/        overland-park-ks/
│   fbi-background-check-raytown-mo/
│
├── blogs/                                     Blog hub + 7 posts (top level, as on WordPress)
├── fingerprint-methods/  drug-testing-basics/  purpose-of-dot/     Reference guides
├── florida-live-scan/  st-louis-fdle/  columbia-fdle/              Out-of-state Live Scan
├── about-us/  contact-us/  spanish/  privacy-and-data-handling-policy/
│
│   Added for the September 2026 strategy brief:
├── multi-state-fingerprinting/                Signature service: one capture, multiple cards
├── fingerprinting-requirements/               Fingerprinting Requirements Center (hub)
├── healthcare-fingerprinting/  nursing-student-fingerprinting/   Industry pages
├── which-fingerprint-cards-do-i-need-for-multiple-states/        Customer-question articles
│   do-i-need-to-be-fingerprinted-again-for-every-fd-258-card/
│   mobile-fbi-identity-history-summary-for-executives/
│   atf-eform-fingerprints-eft-file-or-fingerprint-cards/
├── corporate/example-company/                 Private employee booking page TEMPLATE (noindex)
│
│   Added for the October 2026 "new pages and near me" brief:
├── immigration-fingerprinting/  security-clearance-fingerprinting/        Service pages
├── kansas-board-of-nursing-fingerprinting/  kansas-real-estate-license-fingerprinting/
│   missouri-real-estate-license-fingerprinting/  insurance-license-fingerprinting/
│   teacher-substitute-fingerprinting/  nmls-fingerprinting/
│   home-health-caregiver-fingerprinting/                                   Licensing pages
├── location/fingerprinting-{lenexa,shawnee,leawood,prairie-village,lawrence}-ks/
│   location/fingerprinting-{gladstone,grandview,belton,raymore}-mo/       City pages
│
├── mail/                                      Contact form email (PHP): send.php, config.php, PHPMailer
│
├── assets/                                    Everything the pages load
│   ├── css/      style.css, responsive.css
│   ├── js/       main.js
│   ├── fonts/    Inter, Schibsted Grotesk (self-hosted, variable)
│   └── images/
│       ├── brand/   Logos and favicon
│       ├── photos/  Optimized responsive photos (generated)
│       └── social/  og-image.jpg for link previews (generated)
│
└── _developer/                                Not part of the published website
    ├── README.md                    This file
    ├── IMAGE REPLACEMENT GUIDE.txt  Generated: every photo and where it appears
    ├── package.json
    ├── images.config.json           Image registry
    ├── image-sources/               Original full-size images (build inputs)
    └── scripts/
        ├── partials/header.html, footer.html
        ├── sync-layout.cjs
        ├── build-images.cjs
        ├── build-sitemap.cjs
        ├── build-image-guide.cjs
        └── check-site.cjs
```

**Folder names are the live URLs.** They were taken from the WordPress site
exactly, so every existing address, inbound link and ranking is preserved. Do
not rename a folder without adding a 301 redirect.

The blog posts sit at the top level (`/what-is-an-ori-number/`, not
`/blogs/what-is-an-ori-number/`) because that is where WordPress published them.

---

## 2. Viewing the site

- **Double-click `index.html`.** Every page and link works straight from the
  folder. `assets/js/main.js` rewrites folder links to `index.html` when pages
  are opened from disk.
- **Or use a local server:** in VS Code, right-click `index.html` and choose
  **Open with Live Server**, or run `npx serve .` in the site folder. A server
  is needed to test the contact form, which requires PHP.

---

## 3. Developer commands

Run these from the `_developer` folder:

```
cd _developer
npm install        (first time only)

npm run layout     rebuilds header, navigation and footer on every page
npm run images     rebuilds optimized photos, logos and the social preview image
npm run sitemap    regenerates sitemap.xml from the pages that exist
npm run guide      regenerates IMAGE REPLACEMENT GUIDE.txt
npm run check      audits every page (run this before handing anything over)
```

### npm run check

The audit that matters. It reports broken internal links, `<use href="#i-...">`
references to icons that are not in the sprite, invalid JSON-LD, missing or
duplicate `<h1>`, and missing title, description or canonical tags. **It should
print "No problems found."** Run it after any edit.

### Header, navigation and footer

Edit `_developer/scripts/partials/header.html` or `footer.html`, then run
`npm run layout`. Never edit them inside an individual page: the script
overwrites everything between the `LAYOUT:HEADER` and `LAYOUT:FOOTER` markers.

It also fixes relative paths for each folder depth, marks the current page with
`aria-current="page"`, and opens the right navigation group. The tokens
available in the partials are documented at the top of `sync-layout.cjs`.

Which nav group highlights on which page is set by the `SECTIONS` map in
`sync-layout.cjs`. **Add new pages to that map**, or their nav item will not
highlight.

### The icon sprite

All 56 icons are inline `<symbol>` elements at the top of
`partials/header.html`, referenced as `<use href="#i-name"/>`. To add one, add
a `<symbol id="i-name" viewBox="0 0 24 24">` there and run `npm run layout`.
`npm run check` will catch any page referencing an icon that does not exist.

### The testimonial carousel

Markup is just a rail wrapping a track of cards:

```html
<div class="reviews__rail" data-reviews-prev="..." data-reviews-next="..." data-reviews-go="...">
  <div class="reviews__window">
    <div class="review-scroll">
      <figure class="review-card i-card"> ... </figure>
    </div>
  </div>
</div>
```

`main.js` adds the arrows, the dots, drag-to-scroll, arrow-key support and the
edge fades, and sets `is-ready` on the rail. Nothing is hard-coded per page, so
adding or removing a card needs no other change. The optional `data-reviews-*`
attributes translate the control labels (the Spanish page sets them); leave
them off for English.

Dots are **one per screenful, not one per card**. With roughly three cards
visible at desktop width, a dot per card left the last two permanently unlit,
because those cards can never sit at the left edge. The dots re-count
themselves when the viewport changes.

If the cards already fit, the rail stays a plain scrolling region: no controls,
no tab stop and no scroll-region role.

Two things to leave alone:

- `.review-card` sets `margin: 0`. A `<figure>` carries a UA margin of
  `1em 40px`, which otherwise makes every card 80px narrower than its grid
  column and stops the rail resting on a snap point.
- `.rating-card p.rating-card__score` needs that element qualifier. Plain
  `.rating-card__score` loses to `.rating-card p`, which drops the headline
  figure to body size in muted grey.

Neither the score nor the review total animates. A rating that counts up from
zero reads as a bad rating in mid-flight, and "Based on 0 Google reviews" is
worse than no animation at all.

### Creating a new page

Copy an existing page at the same folder depth, keep the empty layout markers,
change the `<head>` and the content inside `<main>`, add the folder to the
`SECTIONS` map if it belongs in a nav group, then run `npm run layout`,
`npm run sitemap` and `npm run check`.

### Replacing an image

All photos are temporary stock images. Put the replacement in
`_developer/image-sources/` under the same filename listed in
`images.config.json`, then run `npm run images`. Search the HTML for
`IMAGE SLOT:` to find where each one appears, or read
`IMAGE REPLACEMENT GUIDE.txt` (generated by `npm run guide`).

---

## 4. Content provenance

Every page was written from the live WordPress site's own wording, not
paraphrased. The extracted plain text for each page was used as the source of
truth while building. Where the live site's own pages disagreed with each other,
the conflict is listed in section 7 below and must be settled with the client.

Generated rather than hand-written, because they are structurally identical:

- the 9 location pages
- the 7 blog posts
- `columbia-fdle/` (from the St. Louis page)
- `privacy-and-data-handling-policy/`

Those generator scripts are not part of the deliverable. The HTML they produced
is now the source; edit the HTML.

---

## 5. Bookings and the contact form

**Bookings stay on WordPress.** Every "Book an Appointment" button, in the
header, footer, mobile menu, hero and page CTAs, links to
https://midwestidentityservices.com/book-an-appointment/ as an absolute URL.
That page is not part of this rebuild and is intended to keep working as it
does today. If the WordPress site is retired, these links must be repointed.

**The contact form** on `contact-us/` posts to `mail/send.php`, which validates
server-side and sends with PHPMailer over Gmail SMTP.

| Role | Address | Password needed? |
|---|---|---|
| Sender (SMTP login and From) | `smtpinfin@gmail.com` | Yes: a Google **App Password** |
| Recipient | `moservices.midwest@gmail.com` | No |
| Reply-To | the visitor's email | No |

Required fields are name, email and service. Everything else is optional.

### Going live with the form

1. Host on **PHP 7.4+** with the `openssl` extension.
2. On the server, put the 16-character App Password for `smtpinfin@gmail.com`
   into `SMTP_PASS` in `mail/config.php`. Create it at myaccount.google.com →
   Security → 2-Step Verification → App passwords.
3. Submit a test and confirm it arrives. Check spam the first time and mark it
   "Not spam".
4. If the form is posted from a different domain than `mail/` is hosted on, set
   `ALLOW_ORIGIN` to that `https://` address. Otherwise leave it empty.

> **`mail/config.php` currently contains live SMTP credentials.** Remove or
> blank them before sending this folder to anyone who should not have them, and
> before committing it to a repository.

### Protections already in place

- Server-side validation of every field.
- Hidden spam-trap field: bots that fill it get a fake success, no email sent.
- Rate limit: 5 submissions per 15 minutes per IP.
- Cross-origin posts refused (403) unless listed in `ALLOW_ORIGIN`.
- Line breaks stripped from single-line fields (header injection), everything
  HTML-escaped in the email body.
- SMTP errors go to the PHP error log only, never to the visitor.
- `mail/.htaccess` blocks direct access to config and PHPMailer on Apache.

When the site is opened by double-clicking `index.html`, PHP cannot run. The
form validates, then tells the visitor it was not sent and shows the phone
number rather than pretending it worked.

---

## 6. SEO

Each page targets one primary topic; no primary keyword is the main target of
two pages. Every page carries a title, meta description, meta keywords,
canonical URL and Open Graph and Twitter card tags.

**Structured data** (all validated by `npm run check`):

| Page type | Schema |
|---|---|
| Homepage | Organization, LocalBusiness, WebSite, Service, FAQPage |
| Service pages | Service, BreadcrumbList, FAQPage |
| Hubs | CollectionPage with ItemList, BreadcrumbList |
| Location pages | Service with areaServed, BreadcrumbList |
| Blog hub | Blog, BreadcrumbList |
| Blog posts | BlogPosting, BreadcrumbList, FAQPage |
| Guides | Article, BreadcrumbList, FAQPage |
| About / Contact | AboutPage / ContactPage, BreadcrumbList |
| Spanish | WebPage, FAQPage, `inLanguage: es` |

`/spanish/` and `/` are cross-linked with `hreflang` (`es`, `en`, `x-default`).
It is a full Spanish translation of the homepage, as on WordPress; its links
point to the English service pages, because no Spanish sub-pages exist.

**Sitemap:** `sitemap.xml` is generated from the pages themselves. Run
`npm run sitemap` after adding or removing a page. It lists every page with a
canonical URL and no `noindex`, which is why `404.html` and the private `corporate/` pages are excluded.

`robots.txt` blocks `/_developer/` and `/mail/`. Better still, do not upload
`_developer/` to the live server at all.

**URL preservation is the whole SEO strategy here.** The folder names match the
WordPress URLs exactly, so no redirects are needed for any existing page.

---

## 7. Settle with the client before launch

### The live WordPress site contradicts itself. Pick one of each.

| Detail | Option A | Option B | Used in this build |
|---|---|---|---|
| Street address | Oak St, Kansas City, MO 64106 (footer, contact page) | **8101 E. Bannister Rd, Kansas City, MO 64134** (service pages) | **B** |
| Opening hours | Mon–Fri 9AM–5PM, Sat/Sun on call | **Mon–Fri 9AM–6PM, Sat 10AM–3PM** | **B** |
| Email | **moservices.midwest@gmail.com** (footer, homepage) | mwfingerprinting@gmail.com (contact, business pages) | **A** |

Address B was chosen because its postcode (64134) matches the one in the live
site's own schema markup, and because the privacy policy signed by the owner
gives the same address. Hours B is the more specific of the two. The email in
the footer appears on more pages.

These values appear in `partials/header.html` and `footer.html` (run
`npm run layout` after editing), in page CTA blocks, on `contact-us/`, and in
the LocalBusiness schema on the homepage and every location page. Grep for
`Bannister` and `moservices` to find them all.

### Also confirm

- **Reviews.** "5.0 from 150+ Google reviews" and the six quoted reviews were
  taken from the live site's Google widget. This build hardcodes them, so they
  will go stale. Confirm they may be used as static text.
- **Retention policy before advertising reprints.** The brief requires a written
  policy (consent, permitted use, access controls, secure storage, deletion at
  30 days, vendor/agency restrictions) before the 30-day reprint offer goes
  live. Section 8 of the privacy policy now states it; the business must also
  operate it (written consent form at the counter, deletion process).
- **Turnaround figures not in the brief.** FDLE "1-3 days", background-check
  packages "1-3 business days" (business-solutions) and drug tests "within
  1 minute up to 5 days" were kept from the live site. Confirm them.
- **ATF price.** $75 is applied to both EFT files and ATF FD-258 paper cards.
- **"One of the few Missouri-based providers"** for FDLE (St. Louis and Columbia
  pages) is an unverified comparative claim carried over from the live site.
- **Photos.** Every photo is a temporary stock image. See
  `IMAGE REPLACEMENT GUIDE.txt`.
- **FBI apostille page.** The live site's "FBI Fingerprinting by City/State"
  lists link to WordPress pages that do not exist. They are rendered here as
  plain text chips; only the 9 real location pages are linked. Decide whether
  those pages should be built or the lists trimmed.
- **October 2026 brief, to confirm:** whether the business's equipment is
  registered with DCSA SWFT (the security clearance page says FD-258 cards only);
  whether it is a Fieldprint location (the NMLS page says no); Kansas Insurance
  Department and KREC fees (the pages link to the agency rather than quote them);
  and the drive times on the new city pages, which are estimates.
- **Effective date on the privacy policy** reads "August 10, 2026", taken
  verbatim from the live site. A retention section was added in September 2026,
  so update the date and version when the client approves it.

---

## 8. September 2026 strategy brief: how it was implemented

Source: *Website Strategy & Developer Implementation Brief* (September 2026).

**Approved facts, used everywhere.** Proof figures are only: 150+ five-star
Google reviews, 5+ years serving Kansas City, Missouri + Kansas coverage,
individual / mobile / corporate service. Prices: FD-258 $45 (+$20 per card,
cards and envelope supplied), Multi-State Print-to-Card $60 (+$25 per printed
card), FBI Identity History Summary Electronic Submission $90, ATF/EFT $75.
FBI results: "often within 24-72 hours of electronic submission". Never
describe the business as FBI-authorized or as a channeler. ATF/EFT is live.
Always "when permitted by the receiving agency"; never guarantee acceptance.

**Navigation** follows the brief: Fingerprinting | FBI Background Checks |
Multi-State Licensing | Businesses & Groups | Drug Testing | Locations |
Resources | Book Now. The full labels do not fit beside the logo at the
1220px container, so on desktop the long words ("Background", "Licensing",
"es & Groups") sit in `.nav__long`, visually hidden but still part of the
button's accessible name. The mobile menu shows full labels and now takes over
at **1100px** (was 960px): `mqMobile` in main.js and the rules in
responsive.css must stay in step.

**Industry pages** reuse existing URLs where a page already targeted the
audience (FINRA, security/alarm, USPS/transportation, corporate, ATF) rather
than creating near-duplicate URLs from the brief's examples. Only healthcare
and nursing-student pages are new.

**Recurring CTA.** "Check My Requirements" links to
`contact-us/?service=requirements#contact`, which preselects the
"Help me identify my fingerprint requirement" option; such emails arrive with
the subject "Requirement review: ...". The option values in the form and the
`$services` whitelist in `mail/send.php` must match exactly (they did not
before this update, which rejected most submissions).

**Corporate booking pages.** Copy `corporate/example-company/` to
`corporate/<company-slug>/` and edit the values marked EDIT. Keep the
noindex tag; `npm run sitemap` leaves noindex pages out. There is deliberately
no `/corporate/` index page, so the list of clients is not discoverable.
Unlisted is not private: protect a folder with server-side authentication if
it carries client pricing or sensitive instructions.

**Locations** are organized as KC Metro / Missouri / Kansas on `location/`
(anchors `#kc-metro`, `#missouri`, `#kansas`). Cities without a real
page are listed without links, as "call to confirm". Do not mass-produce
city pages; each new one needs genuinely local content.

---

## 9. October 2026 brief: new pages and "near me" keywords

Source: *Website Update Brief: New Pages and "Near Me" Keywords* (September 30, 2026).

**New pages (18).** Two service pages, seven licensing pages and nine city pages.
They use the existing templates, with BreadcrumbList + Service + LocalBusiness +
FAQPage schema, their own title, H1, description and canonical. They are listed in
the `SECTIONS` map, the footer (new "Licensing by Profession" list and the
"Areas we serve" list) and the sitemap.

**Agency methods were researched before writing** (October 2026, official sources).
The pages state the limits honestly:

| Program | Method | What we can do |
|---|---|---|
| Kansas Board of Nursing | Mailed FD-258, ORI KS920150Z, waiver signed by the technician | Roll the card, sign the waiver |
| Kansas Real Estate Commission | Kansas Live Scan, or mailed FD-258 for applicants unable to Live Scan in Kansas | Card route only |
| Kansas Insurance Dept. (resident producers) | Kansas Live Scan or mailed FD-258 from any provider | Card route |
| KSDE teachers / substitutes | KSDE preformatted FD-258 by mail, or Kansas law-enforcement Live Scan | Card route |
| Missouri MREC, DESE, DCI bail bond, childcare | MACHS + IdentoGO. Card scan **only for non-Missouri residents** or those unable to visit IdentoGO | Cards for Kansas/out-of-state residents only |
| Missouri insurance producers | No fingerprint requirement found for standard resident producers | n/a |
| NMLS loan originators | Fieldprint (NMLS-approved vendor) only | Not offered; page explains |
| Home health / caregivers | MO Family Care Safety Registry and KS KDADS checks are name-based | FD-258 when an employer or other state asks |
| USCIS biometrics | USCIS Application Support Center only | Not offered; stated on every relevant page |
| Security clearance | DCSA via SWFT; FSO submits; hard cards must be converted | FD-258 cards for the FSO |

Existing pages that said FD-258 cards were completed "to USCIS standards" for
green card and citizenship applications (the nine original city pages, Live
Scan, Fingerprint Methods, the FBI page and one blog post) were corrected to
match.

**"Near me" phrasing** is in the title, one or two headings, the opening
paragraph and one new FAQ on the homepage, individual, mobile, FBI, business,
FD-258 and multi-state pages, and on all 18 city pages. The nine original city
pages had no FAQ, so each now has a two-question FAQ section with FAQPage schema.

**Multi-state page.** New "Out-of-State Fingerprint Cards in Kansas City" section,
"Out-of-State" in the title, and three new FAQs.

**After launch.** Resubmit `sitemap.xml` in Google Search Console and request
indexing for the 18 new URLs.
