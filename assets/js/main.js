/* ==========================================================================
   Midwest Identity Services: main.js
   Lightweight, dependency-free interactions.
   ========================================================================== */

/* --------------------------------------------------------------------------
   FORM CONFIGURATION
   The quote form posts to mail/send.php, which emails the request through
   Gmail SMTP with PHPMailer (settings in mail/config.php). That needs the
   site to be on a web host with PHP; opened straight from a folder on a
   computer, the form checks the fields but cannot send, and says so.
   `endpoint` is relative to the site root, or can be a full https:// URL.
   -------------------------------------------------------------------------- */
const FORM_CONFIG = {
  endpoint: 'mail/send.php',
  method: 'POST',
  fallbackPhone: '(816) 442-0295',
  fallbackTel: '+18164420295',
};

// main.js lives at assets/js/, so the site root is two folders up from it.
const SITE_ROOT = (() => {
  const src = document.currentScript && document.currentScript.src;
  return src ? new URL('../../', src).href : new URL('/', window.location.href).href;
})();

(function () {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');

  /* ---------------- Pages opened directly from disk (file://) ----------------
     Folder links such as "resources/" only open index.html on a web server.
     When a page is opened straight from the file system, point them at index.html. */
  if (window.location.protocol === 'file:') {
    document.querySelectorAll('a[href]').forEach((link) => {
      const href = link.getAttribute('href');
      if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(href)) return;
      const parts = href.match(/^([^?#]*)(.*)$/);
      if (parts && parts[1].endsWith('/')) link.setAttribute('href', `${parts[1]}index.html${parts[2]}`);
    });
  }

  const header = document.querySelector('[data-header]');
  const mqMobile = window.matchMedia('(max-width: 960px)');

  /* ---------------- Header: compact on scroll ---------------- */
  if (header) {
    let ticking = false;
    const update = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    };
    update();
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  }

  /* ---------------- Desktop dropdown navigation ---------------- */
  const navItems = Array.from(document.querySelectorAll('.nav__item.has-panel'));

  const closeNavItem = (item) => {
    item.classList.remove('is-open');
    const trigger = item.querySelector('.nav__trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  };
  const closeAllNav = (except) => navItems.forEach((item) => { if (item !== except) closeNavItem(item); });

  navItems.forEach((item) => {
    const trigger = item.querySelector('.nav__trigger');
    if (!trigger) return;

    trigger.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      closeAllNav(item);
      item.classList.toggle('is-open', open);
      trigger.setAttribute('aria-expanded', String(open));
    });

    // Keep aria-expanded in sync with hover-open panels on pointer devices
    item.addEventListener('mouseenter', () => { if (!mqMobile.matches) trigger.setAttribute('aria-expanded', 'true'); });
    item.addEventListener('mouseleave', () => {
      if (!item.classList.contains('is-open')) trigger.setAttribute('aria-expanded', 'false');
    });

    item.addEventListener('focusout', (e) => {
      if (!item.contains(e.relatedTarget)) closeNavItem(item);
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && item.classList.contains('is-open')) {
        closeNavItem(item);
        trigger.focus();
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav__item.has-panel')) closeAllNav();
  });

  /* ---------------- Mobile navigation ---------------- */
  const toggle = document.querySelector('[data-menu-toggle]');
  const mobileNav = document.getElementById('mobile-nav');

  if (toggle && mobileNav) {
    let lastFocus = null;

    const focusables = () => [toggle, ...mobileNav.querySelectorAll('a[href], button:not([disabled])')]
      .filter((el) => el.offsetParent !== null || el === toggle);

    const openMenu = () => {
      lastFocus = document.activeElement;
      mobileNav.hidden = false;
      // allow the browser to paint before animating
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => mobileNav.classList.add('is-open')));
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
      document.body.classList.add('is-locked');
      header && header.classList.add('is-scrolled');
      const first = mobileNav.querySelector('a, button');
      first && first.focus({ preventScroll: true });
    };

    const closeMenu = (restoreFocus = true) => {
      mobileNav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      document.body.classList.remove('is-locked');
      header && header.classList.toggle('is-scrolled', window.scrollY > 8);
      window.setTimeout(() => { if (toggle.getAttribute('aria-expanded') === 'false') mobileNav.hidden = true; }, 260);
      if (restoreFocus) (lastFocus && lastFocus.focus ? lastFocus : toggle).focus({ preventScroll: true });
    };

    toggle.addEventListener('click', () => {
      toggle.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
    });

    document.addEventListener('keydown', (e) => {
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      if (e.key === 'Escape') {
        closeMenu();
        return;
      }
      if (e.key === 'Tab') {
        const items = focusables();
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    mobileNav.addEventListener('click', (e) => {
      if (e.target.closest('a[href]')) closeMenu(false);
    });

    mqMobile.addEventListener('change', (e) => {
      if (!e.matches && toggle.getAttribute('aria-expanded') === 'true') closeMenu(false);
    });

    // Accordion groups inside the mobile menu
    mobileNav.querySelectorAll('.m-group__trigger').forEach((btn) => {
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(open));
        if (panel) panel.hidden = !open;
      });
    });
  }

  /* ---------------- Reveal on scroll ---------------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (revealEls.length) {
    if (!('IntersectionObserver' in window) || reduceMotion) {
      revealEls.forEach((el) => el.classList.add('is-visible'));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      revealEls.forEach((el) => io.observe(el));
    }
  }

  /* ---------------- Footer year ---------------- */
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  /* ---------------- Quote form ---------------- */
  const form = document.querySelector('[data-quote-form]');
  if (!form) return;

  const status = form.querySelector('[data-form-status]');
  const submitBtn = form.querySelector('[type="submit"]');
  let attempted = false;

  // Pre-select service from ?service= query parameter
  const params = new URLSearchParams(window.location.search);
  const serviceParam = params.get('service');
  const serviceSelect = form.querySelector('#service');
  if (serviceParam && serviceSelect) {
    const match = Array.from(serviceSelect.options).find((o) => o.dataset.key === serviceParam);
    if (match) match.selected = true;
  }

  const messages = {
    valueMissing: 'This field is required.',
    email: 'Enter a valid email address, like name@company.com.',
    tel: 'Enter a valid phone number with at least 10 digits.',
  };

  const validateField = (input) => {
    const field = input.closest('.field');
    if (!field) return true;
    const errorEl = field.querySelector('.field__error span');
    let message = '';
    const value = input.value.trim();

    if (input.required && !value) {
      message = messages.valueMissing;
    } else if (value && input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      message = messages.email;
    } else if (value && input.type === 'tel' && value.replace(/\D/g, '').length < 10) {
      message = messages.tel;
    }

    const invalid = Boolean(message);
    field.classList.toggle('is-invalid', invalid);
    input.setAttribute('aria-invalid', String(invalid));
    if (errorEl) errorEl.textContent = message;
    return !invalid;
  };

  const inputs = Array.from(form.querySelectorAll('.field__input'));
  inputs.forEach((input) => {
    input.addEventListener('blur', () => { if (attempted || input.value) validateField(input); });
    input.addEventListener('input', () => { if (input.closest('.field').classList.contains('is-invalid')) validateField(input); });
  });

  const showStatus = (type, html) => {
    if (!status) return;
    status.className = `form__status form__status--${type} is-visible`;
    status.innerHTML = html;
    status.focus({ preventScroll: false });
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    attempted = true;

    const results = inputs.map(validateField);
    if (results.includes(false)) {
      const firstInvalid = inputs[results.indexOf(false)];
      showStatus('error', 'Please review the highlighted fields and try again.');
      firstInvalid.focus();
      return;
    }

    // Honeypot: silently ignore bot submissions
    const hp = form.querySelector('[name="company_website"]');
    if (hp && hp.value) {
      showStatus('success', 'Thank you. Your request has been received.');
      form.reset();
      return;
    }

    const callUs = `<a href="tel:${FORM_CONFIG.fallbackTel}">${FORM_CONFIG.fallbackPhone}</a>`;

    if (!FORM_CONFIG.endpoint) {
      showStatus('info', `<strong>Form check complete: not sent.</strong> This form is not connected yet. Please call ${callUs} to discuss your request.`);
      return;
    }

    // Opened from a folder on a computer: PHP cannot run, so do not pretend to send.
    if (window.location.protocol === 'file:') {
      showStatus(
        'info',
        '<strong>Everything looks good, but the request was not sent.</strong> ' +
        'This copy of the website is being viewed from a folder on this computer, so the form cannot send email. ' +
        `Once the site is on its web host it sends normally. Until then, please call ${callUs}.`
      );
      return;
    }

    const fieldLabels = {
      name: 'your name', company: 'your organization', email: 'your email', phone: 'your phone number',
      service: 'the service', people: 'how many people', location: 'the location',
    };

    submitBtn.disabled = true;
    const originalLabel = submitBtn.innerHTML;
    submitBtn.textContent = 'Sending…';
    try {
      const body = new FormData(form);
      body.append('page', window.location.href);
      const response = await fetch(new URL(FORM_CONFIG.endpoint, SITE_ROOT).href, {
        method: FORM_CONFIG.method,
        body,
        headers: { Accept: 'application/json' },
      });
      let result = null;
      try { result = await response.json(); } catch (parseError) { result = null; }

      if (response.ok && result && result.ok) {
        form.reset();
        attempted = false;
        showStatus('success', '<strong>Thank you. Your request has been sent.</strong> A member of our team will contact you to discuss next steps.');
        return;
      }

      if (response.status === 422 && result && result.fields) {
        // The server disagreed with a field: point the visitor at it.
        const names = Object.keys(result.fields);
        names.forEach((name) => {
          const input = form.querySelector(`[name="${name}"]`);
          const field = input && input.closest('.field');
          if (!field) return;
          field.classList.add('is-invalid');
          input.setAttribute('aria-invalid', 'true');
          const errorEl = field.querySelector('.field__error span');
          if (errorEl) errorEl.textContent = result.fields[name] === 'required' ? messages.valueMissing : 'Please check this entry.';
        });
        showStatus('error', `Please check ${names.map((n) => fieldLabels[n] || n).join(', ')} and try again.`);
        const first = form.querySelector(`[name="${names[0]}"]`);
        if (first) first.focus();
        return;
      }

      if (response.status === 429) {
        showStatus('error', `We have received several requests from this connection in a short time. Please wait a few minutes and try again, or call ${callUs}.`);
        return;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      showStatus('error', `We couldn’t send your request. Please try again or call ${callUs}.`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalLabel;
    }
  });
})();

/* ==========================================================================
   Interaction layer
   Hero entrance, staggered reveals, scroll progress, scroll spy, smooth FAQ,
   back to top. Self-contained: nothing here is required for the page to work,
   and all of it stands down when the visitor prefers reduced motion.
   ========================================================================== */
(function () {
  'use strict';

  let progressBar = null;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('[data-header]');

  /* ---------------- Hero: background motif ---------------- */
  const hero = document.querySelector('.hero, .page-hero, .article-hero, [data-hero-block]');

  const buildMotif = () => {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'hero__motif');
    svg.setAttribute('viewBox', '0 0 400 500');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const cx = 200;
    const cy = 250;
    // Concentric open arcs: a fingerprint read at a very large scale.
    for (let i = 0; i < 9; i += 1) {
      const rx = 30 + i * 19;
      const ry = rx * 1.3;
      const a = (deg) => [cx + rx * Math.cos((deg * Math.PI) / 180), cy + ry * Math.sin((deg * Math.PI) / 180)];
      const start = a(148 + (i % 2) * 6);
      const end = a(32 - (i % 2) * 6);
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', `M${start[0].toFixed(1)} ${start[1].toFixed(1)} A${rx} ${ry} 0 1 1 ${end[0].toFixed(1)} ${end[1].toFixed(1)}`);
      p.setAttribute('pathLength', '100');
      p.setAttribute('stroke', 'currentColor');
      p.setAttribute('stroke-width', '1.4');
      p.setAttribute('stroke-linecap', 'round');
      p.style.setProperty('--i', String(i));
      svg.appendChild(p);
    }
    return svg;
  };

  if (hero && !hero.querySelector('.hero__bg')) {
    const bg = document.createElement('div');
    bg.className = 'hero__bg';
    bg.setAttribute('aria-hidden', 'true');
    const wash = document.createElement('span');
    wash.className = 'hero__wash';
    bg.appendChild(wash);
    bg.appendChild(buildMotif());
    hero.insertBefore(bg, hero.firstChild);
  }

  /* ---------------- Hero: staggered entrance ---------------- */
  if (hero) {
    const parts = hero.querySelectorAll(
      '.hero__content > *, .hero__visual, .hero__facts > li,'
      + '.page-hero__grid > *:first-child > *, .page-hero__grid > *:first-child ~ *,'
      + '.article-hero > .container > *, .quote-aside > *'
    );
    parts.forEach((el, i) => {
      el.setAttribute('data-hero', '');
      el.style.setProperty('--d', String(i));
    });

    /* Headline reveals word by word. Text nodes are split in place so any
       inline markup inside the heading (links, the accent phrase) survives. */
    const h1 = hero.querySelector('h1');
    if (h1 && !reduce) {
      let w = 0;
      const split = (node) => {
        Array.prototype.slice.call(node.childNodes).forEach((n) => {
          if (n.nodeType === 3) {
            const frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) {
                frag.appendChild(document.createTextNode(part));
                return;
              }
              const outer = document.createElement('span');
              outer.className = 'hw';
              const inner = document.createElement('span');
              inner.className = 'hw__i';
              inner.textContent = part;
              inner.style.setProperty('--w', String(w));
              w += 1;
              outer.appendChild(inner);
              frag.appendChild(outer);
            });
            n.parentNode.replaceChild(frag, n);
          } else if (n.nodeType === 1) {
            split(n);
          }
        });
      };
      split(h1);
      h1.classList.add('hero-split');
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => hero.classList.add('is-in'));
    });
  }

  /* ---------------- Staggered reveals further down the page ---------------- */
  const groupSelector = [
    '.hero__facts', '.industry-grid', '.process', '.kv', '.resource-list',
    '.location-links', '.faq__list', '.pair', '.usecase-layout', '.card-grid',
    '.guide-list', '.compare', '.stat-row', '.step-list',
  ].join(',');

  const groups = Array.prototype.filter.call(
    document.querySelectorAll(groupSelector),
    (g) => !hero || !hero.contains(g)
  );

  groups.forEach((g) => {
    Array.prototype.forEach.call(g.children, (c, i) => c.style.setProperty('--d', String(i)));
    g.classList.add('stagger');
  });

  const showAll = () => groups.forEach((g) => g.classList.add('is-shown'));

  if (reduce || !('IntersectionObserver' in window)) {
    showAll();
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-shown');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    groups.forEach((g) => io.observe(g));
    // Safety net: never leave content hidden if an observer never fires.
    window.setTimeout(showAll, 4000);
  }

  /* ---------------- Reveal backstop ----------------
     IntersectionObserver can skip an element that is only briefly on screen,
     for instance when someone jumps down the page with End or an anchor link.
     This sweep runs on scroll and reveals anything that is actually in view,
     so no block can be left invisible. */
  let pending = [].concat(
    Array.prototype.slice.call(document.querySelectorAll('[data-reveal]')),
    groups
  );

  const sweep = () => {
    if (!pending.length) return;
    const limit = window.innerHeight * 0.95;
    pending = pending.filter((el) => {
      const r = el.getBoundingClientRect();
      // Still below the fold: keep waiting. Anything in view or already
      // scrolled past is revealed.
      if (r.top > limit) return true;
      if (el.hasAttribute('data-reveal')) el.classList.add('is-visible');
      if (el.classList.contains('stagger')) el.classList.add('is-shown');
      return false;
    });
  };

  /* ---------------- Scroll progress ---------------- */
  if (!reduce) {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    progressBar = bar;
  }

  /* ---------------- Back to top ---------------- */
  const toTop = document.createElement('button');
  toTop.type = 'button';
  toTop.className = 'to-top';
  toTop.setAttribute('aria-label', 'Back to top');
  toTop.innerHTML = '<svg class="icon" aria-hidden="true" style="transform:rotate(-90deg)"><use href="#i-arrow"/></svg>';
  toTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    const skip = document.querySelector('.skip-link');
    if (skip) skip.focus({ preventScroll: true });
  });
  document.body.appendChild(toTop);

  /* ---------------- Anchor bar: mark the section you are reading --------- */
  const spyLinks = Array.prototype.slice.call(document.querySelectorAll('.anchor-bar a[href^="#"]'));
  const spyTargets = spyLinks
    .map((a) => ({ link: a, el: document.getElementById(a.getAttribute('href').slice(1)) }))
    .filter((t) => t.el);

  /* ---------------- One scroll handler for all of the above -------------- */
  let ticking = false;
  const onScroll = () => {
    sweep();

    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;

    if (progressBar) {
      progressBar.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
    }

    toTop.classList.toggle('is-on', y > window.innerHeight * 0.9);

    if (spyTargets.length) {
      const line = y + (header ? header.offsetHeight : 0) + 120;
      let current = null;
      spyTargets.forEach((t) => {
        if (t.el.getBoundingClientRect().top + y <= line) current = t;
      });
      spyTargets.forEach((t) => t.link.classList.toggle('is-current', t === current));
    }

    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
  onScroll();

  /* ---------------- FAQ: animate the disclosure open and closed ---------- */
  if (!reduce) {
    document.querySelectorAll('details.faq__item').forEach((item) => {
      const panel = item.querySelector('.faq__a');
      const summary = item.querySelector('summary');
      if (!panel || !summary) return;
      let busy = false;

      const settle = () => {
        panel.style.height = '';
        busy = false;
      };

      summary.addEventListener('click', (e) => {
        if (busy) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        busy = true;

        if (item.open) {
          panel.style.height = `${panel.scrollHeight}px`;
          window.requestAnimationFrame(() => {
            panel.style.height = '0px';
          });
          window.setTimeout(() => {
            item.open = false;
            settle();
          }, 340);
        } else {
          item.open = true;
          panel.style.height = '0px';
          window.requestAnimationFrame(() => {
            panel.style.height = `${panel.scrollHeight}px`;
          });
          window.setTimeout(settle, 340);
        }
      });
    });
  }

  /* ---------------- Closing CTA: light follows the pointer --------------- */
  if (!reduce && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.cta-band').forEach((band) => {
      band.addEventListener('pointermove', (e) => {
        const r = band.getBoundingClientRect();
        band.style.setProperty('--mx', `${e.clientX - r.left}px`);
        band.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }
})();

/* ==========================================================================
   V3 interaction: pointer light on cards, magnetic buttons, hero depth,
   image tilt, and reveal clean-up. Pointer effects only run on devices with
   a real hover pointer, and nothing runs under prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------------- Reveal clean-up ----------------
     Reveal rules set opacity, transform and transition on an element until it
     has appeared. Once the entrance has played, those rules are removed so a
     card's own hover transitions take over cleanly. */
  const settle = (el, attr, classes, wait) => {
    window.setTimeout(() => {
      if (attr) el.removeAttribute(attr);
      classes.forEach((c) => el.classList.remove(c));
    }, wait);
  };

  const watch = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      const el = m.target;
      if (el.hasAttribute('data-reveal') && el.classList.contains('is-visible') && !el.dataset.settledReveal) {
        el.dataset.settledReveal = '1';
        settle(el, 'data-reveal', ['is-visible'], 1700);
      }
      if (el.classList.contains('stagger') && el.classList.contains('is-shown') && !el.dataset.settledStagger) {
        el.dataset.settledStagger = '1';
        settle(el, null, ['stagger', 'is-shown'], el.children.length * 70 + 1000);
      }
      if (el.matches('.hero, .page-hero, .article-hero, [data-hero-block]') && el.classList.contains('is-in') && !el.dataset.settledHero) {
        el.dataset.settledHero = '1';
        window.setTimeout(() => {
          el.querySelectorAll('[data-hero]').forEach((n) => n.removeAttribute('data-hero'));
        }, 2600);
      }
    });
  });
  document.querySelectorAll('[data-reveal], .stagger, .hero, .page-hero, .article-hero, [data-hero-block]').forEach((el) => {
    watch.observe(el, { attributes: true, attributeFilter: ['class'] });
    // Anything already revealed before this script ran.
    if (el.classList.contains('is-visible') || el.classList.contains('is-shown') || el.classList.contains('is-in')) {
      el.setAttribute('class', el.getAttribute('class'));
    }
  });

  if (reduce || !finePointer) return;

  /* ---------------- Light that follows the pointer across a card ---------- */
  document.querySelectorAll('.i-card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      card.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    });
  });

  /* ---------------- Magnetic primary buttons ---------------- */
  document.querySelectorAll('.btn--primary').forEach((btn) => {
    btn.style.transition = `${getComputedStyle(btn).transition}, translate 260ms cubic-bezier(0.22, 0.61, 0.36, 1)`;
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      btn.style.translate = `${(x * 5).toFixed(1)}px ${(y * 4).toFixed(1)}px`;
    });
    btn.addEventListener('pointerleave', () => { btn.style.translate = ''; });
  });

  /* ---------------- Hero: the two frames drift at different depths ------- */
  const heroSection = document.querySelector('.hero');
  const mainShot = document.querySelector('.hero__shot--main');
  const insetShot = document.querySelector('.hero__shot--inset');
  if (heroSection && mainShot && insetShot) {
    let raf = 0;
    heroSection.addEventListener('pointermove', (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = heroSection.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        mainShot.style.translate = `${(-x * 10).toFixed(1)}px ${(-y * 10).toFixed(1)}px`;
        insetShot.style.translate = `${(x * 22).toFixed(1)}px ${(y * 18).toFixed(1)}px`;
      });
    });
    heroSection.addEventListener('pointerleave', () => {
      cancelAnimationFrame(raf);
      mainShot.style.translate = '';
      insetShot.style.translate = '';
    });
  }

  /* ---------------- Tilt: images marked data-tilt lean toward the pointer - */
  document.querySelectorAll('[data-tilt]').forEach((el) => {
    const host = el.parentElement;
    host.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      const rx = -y * 9;
      const ry = x * 11;
      const angle = Math.sqrt(rx * rx + ry * ry);
      el.classList.add('is-tilting');
      el.style.rotate = angle < 0.05 ? '' : `${rx.toFixed(3)} ${ry.toFixed(3)} 0 ${angle.toFixed(2)}deg`;
    });
    host.addEventListener('pointerleave', () => {
      el.classList.remove('is-tilting');
      el.style.rotate = '';
    });
  });
})();

/* ==========================================================================
   Hero stage: pick who needs fingerprinting and the image, details and the
   quote link switch to match. It keeps sliding through the views on its own;
   picking a view jumps to it and restarts the timer. It holds only while
   someone is moving through the tabs with the keyboard or the hero is off
   screen, and never auto-plays under prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  const stage = document.querySelector('[data-hero-stage]');
  const tabs = Array.prototype.slice.call(document.querySelectorAll('.hero-tab'));
  if (!stage || !tabs.length) return;

  const hero = stage.closest('.hero');
  const frame = stage.querySelector('.hero-stage__frame');
  const cards = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  const layers = tabs.map((t) => stage.querySelector(`[data-layer="${t.id.replace('hero-tab-', '')}"]`));
  const counter = stage.querySelector('[data-hero-count]');
  const bars = Array.prototype.slice.call(stage.querySelectorAll('.hero-stage__bars i'));
  const row = tabs[0].parentElement;
  let rowTouchedAt = 0;
  const cta = hero.querySelector('[data-hero-cta]');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const DURATION = 6500;

  let index = 0;
  let auto = !reduce;
  let visible = true;
  let elapsed = 0;
  let last = 0;

  const scan = () => {
    if (reduce) return;
    stage.classList.remove('is-scanning');
    void stage.offsetWidth; // restart the sweep
    stage.classList.add('is-scanning');
  };
  stage.addEventListener('animationend', (e) => {
    if (e.animationName === 'stage-scan') stage.classList.remove('is-scanning');
  });

  const select = (next, opts) => {
    const o = opts || {};
    index = (next + tabs.length) % tabs.length;

    tabs.forEach((tab, n) => {
      const on = n === index;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      tab.style.setProperty('--p', '0');
    });
    cards.forEach((card, n) => {
      const on = n === index;
      card.classList.toggle('is-active', on);
      if (on) card.removeAttribute('inert'); else card.setAttribute('inert', '');
    });
    layers.forEach((layer, n) => {
      if (!layer) return;
      const on = n === index;
      layer.classList.toggle('is-active', on);
      if (on) layer.removeAttribute('aria-hidden'); else layer.setAttribute('aria-hidden', 'true');
    });

    if (counter) counter.textContent = String(index + 1).padStart(2, '0');
    bars.forEach((bar, n) => bar.style.setProperty('--p', n < index || (reduce && n === index) ? '1' : '0'));

    // On phones the chips scroll sideways: keep the active one in view, unless
    // the visitor has just been swiping the row themselves.
    if (row.scrollWidth > row.clientWidth + 2 && Date.now() - rowTouchedAt > 2500) {
      const pad = parseFloat(getComputedStyle(row).paddingLeft) || 0;
      const delta = tabs[index].getBoundingClientRect().left - row.getBoundingClientRect().left - pad;
      row.scrollTo({ left: row.scrollLeft + delta, behavior: reduce ? 'auto' : 'smooth' });
    }
    if (cta) {
      const href = cta.getAttribute('href');
      cta.setAttribute('href', href.replace(/service=[^&#]*/, `service=${tabs[index].dataset.service}`));
    }
    if (o.focus) tabs[index].focus();
    elapsed = 0;
    scan();
  };

  /* ---- Choosing a view ---- */
  tabs.forEach((tab, n) => {
    tab.addEventListener('click', () => select(n, { user: true }));
    tab.addEventListener('keydown', (e) => {
      const keys = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      select(keys[e.key], { user: true, focus: true });
    });
  });

  /* ---- Auto-play ---- */
  // Hold while a keyboard user is on a tab, so the view does not change under them.
  const keyboardOnTabs = () => {
    const el = document.activeElement;
    return !!el && el.classList.contains('hero-tab') && el.matches(':focus-visible');
  };

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }, { threshold: 0.25 }).observe(hero);
  }

  const tick = (now) => {
    const dt = last ? Math.min(now - last, 100) : 0;
    last = now;
    if (!auto) {
      tabs.forEach((t) => t.style.removeProperty('--p'));
      return;
    }
    if (!keyboardOnTabs() && visible && !document.hidden) {
      elapsed += dt;
      const progress = Math.min(elapsed / DURATION, 1).toFixed(4);
      tabs[index].style.setProperty('--p', progress);
      if (bars[index]) bars[index].style.setProperty('--p', progress);
      if (elapsed >= DURATION) select(index + 1);
    }
    window.requestAnimationFrame(tick);
  };

  // First sweep once the hero has finished arriving, then start the clock.
  window.setTimeout(() => {
    scan();
    if (auto) window.requestAnimationFrame(tick);
  }, reduce ? 0 : 1100);

  /* ---- Phones: swipe the image to change slide ---- */
  if (frame) {
    let startX = 0;
    let startY = 0;
    let tracking = false;
    frame.addEventListener('touchstart', (e) => {
      tracking = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    frame.addEventListener('touchend', (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) select(index + (dx < 0 ? 1 : -1), { user: true });
    }, { passive: true });
  }

  /* ---- Chip row: fade the edge only while there is more to scroll to ---- */
  const markRowEnd = () => row.classList.toggle('is-end', row.scrollLeft + row.clientWidth >= row.scrollWidth - 4);
  row.addEventListener('scroll', markRowEnd, { passive: true });
  row.addEventListener('touchstart', () => { rowTouchedAt = Date.now(); }, { passive: true });
  window.addEventListener('resize', markRowEnd);
  markRowEnd();

  /* ---- Pointer: the frame leans toward the cursor and a light follows it ---- */
  if (!reduce && finePointer && frame) {
    stage.addEventListener('pointermove', (e) => {
      const r = frame.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      frame.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
      frame.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
      const rx = -(y - 0.5) * 7;
      const ry = (x - 0.5) * 9;
      const angle = Math.sqrt(rx * rx + ry * ry);
      frame.classList.add('is-tilting');
      frame.style.rotate = angle < 0.05 ? '' : `${rx.toFixed(3)} ${ry.toFixed(3)} 0 ${angle.toFixed(2)}deg`;
    });
    stage.addEventListener('pointerleave', () => {
      frame.classList.remove('is-tilting');
      frame.style.rotate = '';
    });
  }
})();

/* ==========================================================================
   Main site additions
   ========================================================================== */

/* ---------------- Stats: figures count up once, on arrival ----------------
   Markup: <span class="stat__num" data-count="152" data-suffix="+">152+</span>
   The final value stays in the HTML, so the figure is correct with JS off. */
(function () {
  'use strict';

  const nums = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
  if (!nums.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;

  const run = (el) => {
    const target = parseFloat(el.dataset.count);
    if (!isFinite(target)) return;
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const decimals = (el.dataset.count.split('.')[1] || '').length;
    const DURATION = 1400;
    let start = 0;

    const step = (now) => {
      if (!start) start = now;
      const t = Math.min((now - start) / DURATION, 1);
      // Ease out, so the figure settles rather than stopping dead.
      const value = target * (1 - Math.pow(1 - t, 3));
      el.textContent = prefix + value.toFixed(decimals) + suffix;
      if (t < 1) window.requestAnimationFrame(step);
      else window.clearTimeout(settle);
    };
    el.textContent = prefix + (0).toFixed(decimals) + suffix;
    // If the frames never arrive - a backgrounded tab, a stalled renderer -
    // the figure must still end up correct rather than stranded at zero.
    const settle = window.setTimeout(() => {
      el.textContent = prefix + target.toFixed(decimals) + suffix;
    }, DURATION + 500);
    window.requestAnimationFrame(step);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      io.unobserve(entry.target);
      run(entry.target);
    });
  }, { threshold: 0.4 });
  nums.forEach((el) => io.observe(el));
})();

/* ---------------- Phones: the call / book bar ----------------
   It stays out of the way at the top of the page and slides in once the
   visitor has started reading, then hides again over the closing CTA so it
   never covers the buttons there. */
(function () {
  'use strict';

  if (!document.querySelector('.site-footer')) return;

  const bar = document.createElement('div');
  bar.className = 'action-bar';
  bar.innerHTML = '<a class="btn btn--ghost-dark" href="tel:+18164420295">'
    + '<svg class="icon" aria-hidden="true"><use href="#i-phone"/></svg>Call</a>'
    + '<a class="btn btn--primary" href="https://midwestidentityservices.com/book-an-appointment/">Book an Appointment</a>';
  document.body.appendChild(bar);

  const closing = document.querySelector('.cta-band');
  let ticking = false;

  const update = () => {
    ticking = false;
    const past = window.scrollY > window.innerHeight * 0.6;
    let overClosing = false;
    if (closing) {
      const r = closing.getBoundingClientRect();
      overClosing = r.top < window.innerHeight && r.bottom > 0;
    }
    bar.classList.toggle('is-on', past && !overClosing);
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
  update();
})();

/* ---------------- Testimonials: the review rail as a carousel ----------------
   Enhances every .reviews__rail that holds a .review-scroll:

     - previous / next arrows that move one card at a time and disable at the ends
     - dots that show position and jump to a card
     - click-and-drag (or swipe) to scroll, with the click suppressed afterwards
     - left / right arrow keys once the rail has focus
     - fade masks at whichever edge still has hidden cards

   The controls are built here rather than written into every page, so the
   markup stays the same on all of them. With JavaScript off, or when the cards
   already fit, the rail is left exactly as it is: a plain scrolling region. */
(function () {
  'use strict';

  const rails = Array.prototype.slice.call(document.querySelectorAll('.reviews__rail'));
  if (!rails.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  rails.forEach((rail) => {
    const track = rail.querySelector('.review-scroll');
    if (!track) return;

    const cards = Array.prototype.slice.call(track.children);
    if (cards.length < 2) return;

    const label = rail.dataset.reviewsLabel || 'reviews';
    const prevText = rail.dataset.reviewsPrev || 'Previous review';
    const nextText = rail.dataset.reviewsNext || 'Next review';
    const goText = rail.dataset.reviewsGo || 'Go to review page';

    /* ---- controls ---- */
    const controls = document.createElement('div');
    controls.className = 'reviews__controls';

    const dots = document.createElement('ul');
    dots.className = 'reviews__dots';
    let dotButtons = [];

    // How many screenfuls the rail holds. One dot per screenful keeps every dot
    // reachable: with a dot per card, the last cards can never sit at the left
    // edge, so their dots would never light up.
    const pageCount = () => {
      if (!track.clientWidth) return 1;
      return Math.max(1, Math.ceil((track.scrollWidth / track.clientWidth) - 0.02));
    };

    const buildDots = (total) => {
      dots.textContent = '';
      dotButtons = [];
      for (let i = 0; i < total; i += 1) {
        const page = i;
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'reviews__dot';
        b.setAttribute('aria-label', goText + ' ' + (page + 1) + ' of ' + total);
        b.addEventListener('click', () => {
          track.scrollTo({ left: page * track.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
        });
        li.appendChild(b);
        dots.appendChild(li);
        dotButtons.push(b);
      }
    };

    const arrows = document.createElement('div');
    arrows.className = 'reviews__arrows';
    const makeArrow = (dir, text) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'reviews__arrow reviews__arrow--' + dir;
      b.setAttribute('aria-label', text);
      b.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg>';
      arrows.appendChild(b);
      return b;
    };
    const prev = makeArrow('prev', prevText);
    const next = makeArrow('next', nextText);

    controls.appendChild(dots);
    controls.appendChild(arrows);
    rail.appendChild(controls);

    /* ---- moving ---- */
    // One step is one card plus the gap between cards.
    const stride = () => {
      const step = cards[1].offsetLeft - cards[0].offsetLeft;
      return step > 0 ? step : track.clientWidth;
    };
    const nudge = (sign) => {
      track.scrollBy({ left: sign * stride(), behavior: reduce ? 'auto' : 'smooth' });
    };
    prev.addEventListener('click', () => nudge(-1));
    next.addEventListener('click', () => nudge(1));

    track.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      nudge(e.key === 'ArrowRight' ? 1 : -1);
    });

    /* ---- state: which card, which edge ---- */
    const overflows = () => track.scrollWidth > track.clientWidth + 2;

    const sync = () => {
      const on = overflows();
      rail.classList.toggle('is-ready', on);
      track.classList.toggle('is-grabbable', on);
      // A rail whose cards all fit is not a scroll region, so it should not
      // announce itself as one or take a tab stop.
      if (on) {
        track.setAttribute('tabindex', '0');
        track.setAttribute('role', 'region');
        track.setAttribute('aria-label', 'Client ' + label + ', scrollable');
      } else {
        track.removeAttribute('tabindex');
        track.removeAttribute('role');
        track.removeAttribute('aria-label');
        return;
      }

      const max = track.scrollWidth - track.clientWidth;
      const x = track.scrollLeft;

      // The card nearest the left edge, used only to detect the start.
      let nearest = 0;
      let bestGap = Infinity;
      cards.forEach((card, n) => {
        const gap = Math.abs(card.offsetLeft - track.offsetLeft - x);
        if (gap < bestGap) { bestGap = gap; nearest = n; }
      });

      // Work out the ends from the card index as well as the pixel offset:
      // snap padding can leave a rail resting a few pixels short of zero.
      const atStart = nearest === 0 && x <= Math.max(2, cards[0].offsetLeft - track.offsetLeft + 2);
      const atEnd = x >= max - 2;
      rail.classList.toggle('is-start', atStart);
      rail.classList.toggle('is-end', atEnd);
      prev.disabled = atStart;
      next.disabled = atEnd;
      const pages = pageCount();
      if (dotButtons.length !== pages) buildDots(pages);
      // At the far end the last dot is always the active one, whatever the
      // rounding says, so the rail never ends on a half-lit control.
      const page = atEnd ? pages - 1 : Math.min(pages - 1, Math.round(x / track.clientWidth));
      dotButtons.forEach((b, n) => {
        if (n === page) b.setAttribute('aria-current', 'true');
        else b.removeAttribute('aria-current');
      });
    };

    // Live updates while scrolling are throttled to a frame, because sync()
    // reads offsetLeft and would otherwise force layout on every event. The
    // scrollend pass is unthrottled: it is the moment the arrow and dot states
    // have to be right, and it recovers the flag if a frame was ever dropped.
    let ticking = false;
    track.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => { ticking = false; sync(); });
    }, { passive: true });
    track.addEventListener('scrollend', () => { ticking = false; sync(); });

    /* ---- drag to scroll ---- */
    // Mouse and pen only: touch already scrolls the rail natively, and taking
    // that over would fight the browser's own momentum.
    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    let moved = 0;

    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' || e.button !== 0 || !overflows()) return;
      dragging = true;
      moved = 0;
      startX = e.clientX;
      startScroll = track.scrollLeft;
      track.classList.add('is-dragging');
      track.setPointerCapture(e.pointerId);
    });

    track.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      track.scrollLeft = startScroll - dx;
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('is-dragging');
      if (e && e.pointerId !== undefined && track.hasPointerCapture(e.pointerId)) {
        track.releasePointerCapture(e.pointerId);
      }
      // Settle on the nearest card, so the rail never rests mid-card.
      if (moved > 4) {
        let best = cards[0];
        let bestGap = Infinity;
        cards.forEach((card) => {
          const gap = Math.abs(card.offsetLeft - track.offsetLeft - track.scrollLeft);
          if (gap < bestGap) { bestGap = gap; best = card; }
        });
        track.scrollTo({ left: best.offsetLeft - track.offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
      }
    };
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);

    // A drag that finishes on a link must not also follow it.
    track.addEventListener('click', (e) => {
      if (moved > 4) { e.preventDefault(); e.stopPropagation(); moved = 0; }
    }, true);

    /* ---- keep up with resizes and late-loading fonts ---- */
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => sync()).observe(track);
    } else {
      window.addEventListener('resize', sync);
    }
    sync();
  });
})();

/* ==========================================================================
   Industries explorer (homepage): pick an industry and the panel beside it
   switches. It advances on its own, with a progress line under the active
   tab, and holds while the pointer is over it, while a keyboard user is on
   the tabs or while it is off screen. Never auto-plays under
   prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  const root = document.querySelector('[data-industries]');
  if (!root) return;
  const tabs = Array.prototype.slice.call(root.querySelectorAll('.ind-tab'));
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  const list = root.querySelector('.ind-tabs');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DURATION = 7000;

  let index = 0;
  let elapsed = 0;
  let last = 0;
  let visible = false;
  let hovering = false;

  const select = (next, focus) => {
    index = (next + tabs.length) % tabs.length;
    tabs.forEach((tab, n) => {
      const on = n === index;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      tab.style.setProperty('--p', '0');
    });
    panels.forEach((panel, n) => {
      const on = n === index;
      panel.classList.toggle('is-active', on);
      if (on) panel.removeAttribute('inert'); else panel.setAttribute('inert', '');
    });
    // Phones: the tabs are a sideways row, so keep the active chip in view.
    if (list.scrollWidth > list.clientWidth + 2) {
      const delta = tabs[index].getBoundingClientRect().left - list.getBoundingClientRect().left - 16;
      list.scrollTo({ left: list.scrollLeft + delta, behavior: reduce ? 'auto' : 'smooth' });
    }
    if (focus) tabs[index].focus();
    elapsed = 0;
  };

  tabs.forEach((tab, n) => {
    tab.addEventListener('click', () => select(n));
    tab.addEventListener('keydown', (e) => {
      const keys = { ArrowDown: index + 1, ArrowRight: index + 1, ArrowUp: index - 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      select(keys[e.key], true);
    });
  });

  if (reduce) return;

  root.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hovering = true; });
  root.addEventListener('pointerleave', () => { hovering = false; });
  const keyboardOnTabs = () => {
    const el = document.activeElement;
    return !!el && el.classList.contains('ind-tab') && el.matches(':focus-visible');
  };

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }, { threshold: 0.3 }).observe(root);
  } else {
    visible = true;
  }

  const tick = (now) => {
    const dt = last ? Math.min(now - last, 100) : 0;
    last = now;
    if (visible && !hovering && !document.hidden && !keyboardOnTabs()) {
      elapsed += dt;
      tabs[index].style.setProperty('--p', Math.min(elapsed / DURATION, 1).toFixed(4));
      if (elapsed >= DURATION) select(index + 1);
    }
    window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);
})();
