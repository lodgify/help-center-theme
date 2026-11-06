/*
 * Lodgify Help Center theme: behaviour.
 * Plain JS, no dependencies. Every feature degrades gracefully if it fails.
 */
(function () {
  'use strict';

  var doc = document;
  var locale = (doc.documentElement.lang || 'en-us').toLowerCase();

  function qs(sel, root) { return (root || doc).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  function icon(name, cls) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = doc.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'hc-icon ' + (cls || ''));
    svg.setAttribute('aria-hidden', 'true');
    var use = doc.createElementNS(ns, 'use');
    use.setAttribute('href', '#icon-' + name);
    svg.appendChild(use);
    return svg;
  }
  function getJSON(path) {
    return fetch('/api/v2/help_center/' + locale + path, { headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function stripHtml(html) {
    var d = doc.createElement('div');
    d.innerHTML = html || '';
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  }

  /* ---------- Footer year ---------- */
  qsa('[data-year]').forEach(function (n) { n.textContent = new Date().getFullYear(); });

  /* ---------- Language dropdown: close on outside click / Escape ---------- */
  doc.addEventListener('click', function (e) {
    qsa('details.hc-lang[open]').forEach(function (d) { if (!d.contains(e.target)) d.removeAttribute('open'); });
  });
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') qsa('details.hc-lang[open]').forEach(function (d) { d.removeAttribute('open'); });
  });

  /* ---------- Mobile menu ---------- */
  var menu = qs('#hc-menu');
  var opener = qs('[data-open-menu]:not([data-open-menu="search"])');
  var lastFocus = null;

  function openMenu(focusSearch) {
    if (!menu) return;
    lastFocus = doc.activeElement;
    menu.hidden = false;
    doc.body.classList.add('hc-menu-open');
    if (opener) opener.setAttribute('aria-expanded', 'true');
    var target = focusSearch ? qs('input[type="search"]', menu) : qs('[data-close-menu]', menu);
    if (target) target.focus();
  }
  function closeMenu() {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    doc.body.classList.remove('hc-menu-open');
    if (opener) opener.setAttribute('aria-expanded', 'false');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  qsa('[data-open-menu]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      openMenu(b.getAttribute('data-open-menu') === 'search');
    });
  });
  qsa('[data-close-menu]').forEach(function (b) { b.addEventListener('click', closeMenu); });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', function () { if (window.innerWidth > 900) closeMenu(); });

  /* ---------- Category icons ---------- */
  // Fill in ids here to pin an icon to a category: { 360001234567: 'sync' }.
  var ICON_BY_ID = {};
  // Otherwise the icon is picked from words in the category name.
  var ICON_BY_WORD = [
    [/getting started|start|onboard/i, 'rocket'],
    [/rental|propert|listing/i, 'rentals'],
    [/website|site builder|builder/i, 'website-builder'],
    [/payment|polic|billing|tax|fee/i, 'credit-card'],
    [/calendar|availab/i, 'calendar'],
    [/sync|channel|airbnb|booking|vrbo|ical/i, 'sync'],
    [/reserv|booking system|quote/i, 'reservation'],
    [/tool|automat|inbox|report|setting/i, 'wrench'],
    [/account|subscription|user/i, 'user-circle'],
    [/mobile|app/i, 'mobile-android'],
    [/market|integrat|add-?on/i, 'store'],
    [/use case|scenario/i, 'lightbulb']
  ];
  function iconFor(id, name) {
    if (ICON_BY_ID[id]) return ICON_BY_ID[id];
    for (var i = 0; i < ICON_BY_WORD.length; i++) if (ICON_BY_WORD[i][0].test(name || '')) return ICON_BY_WORD[i][1];
    return 'book';
  }
  function setIcon(svg, name) {
    var use = svg && svg.querySelector('use');
    if (use) use.setAttribute('href', '#icon-' + name);
  }
  qsa('[data-cat-id]').forEach(function (n) {
    setIcon(qs('svg', n), iconFor(n.getAttribute('data-cat-id'), n.getAttribute('data-cat-name')));
  });

  /* ---------- Section cards: sub-sections and counts ----------
   * Zendesk doesn't give sub-sections of a card in the template,
   * so they're loaded here and added at the top of each card. */
  function updateCard(card) {
  /* ---------- Section cards: count sub-sections and articles ---------- */
  qsa('.hc-section-card').forEach(function (card) {
    var tag = qs('[data-count]', card);
    var articles = parseInt(tag ? tag.getAttribute('data-count') : '0', 10) || 0;
    var subs = qsa('.hc-section-card__list a.is-section', card).length;
    var parts = [];
    if (subs) parts.push(subs + (subs === 1 ? ' section' : ' sections'));
    if (articles) parts.push(articles + (articles === 1 ? ' article' : ' articles'));
    if (tag) {
      tag.hidden = !parts.length;
      if (parts.length) tag.textContent = parts.join(' \u00b7 ');
    }
    var more = qs('[data-see-all]', card);
    if (more && !articles) more.firstChild.textContent = 'Open section ';
    if (more && articles === 1) more.firstChild.textContent = 'See 1 article ';
  }
  var sectionCards = qsa('.hc-section-card[data-section-id]');
  if (sectionCards.length) {
    sectionCards.forEach(updateCard);
    var catNode = qs('[data-current-category]');
    var secNode = qs('[data-current-section]');
    var catIdPromise = catNode
      ? Promise.resolve(catNode.getAttribute('data-current-category'))
      : secNode
        ? getJSON('/sections/' + secNode.getAttribute('data-current-section') + '.json').then(function (s) { return s.section.category_id; })
        : null;
    if (catIdPromise) {
      catIdPromise.then(function (catId) {
        return getJSON('/categories/' + catId + '/sections.json?per_page=100');
      }).then(function (data) {
        var byParent = {};
        (data.sections || []).forEach(function (s) {
          if (!s.parent_section_id) return;
          (byParent[s.parent_section_id] = byParent[s.parent_section_id] || []).push(s);
        });
        sectionCards.forEach(function (card) {
          var children = byParent[card.getAttribute('data-section-id')] || [];
          if (!children.length) return;
          var list = qs('.hc-section-card__list', card);
          if (!list) {
            list = el('ul', 'hc-section-card__list');
            var head = qs('.hc-section-card__head', card);
            head.parentNode.insertBefore(list, head.nextSibling);
          }
          var first = list.firstChild;
          children.forEach(function (s) {
            var li = el('li');
            var a = el('a', 'is-section');
            a.href = s.html_url;
            a.appendChild(icon('folder', 'hc-icon--sm hc-section-card__folder'));
            a.appendChild(el('span', '', s.name));
            a.appendChild(icon('angle-right', 'hc-icon--sm'));
            li.appendChild(a);
            list.insertBefore(li, first);
          });
          updateCard(card);
        });
      }).catch(function () { /* sub-sections are optional */ });
    }
  }
      if (parts.length) tag.textContent = parts.join(' \u00b7 ');
      else tag.remove();
    }
    var more = qs('[data-see-all]', card);
    if (more && !articles) more.firstChild.textContent = 'Open section ';
    var list = qs('.hc-section-card__list', card);
    if (list && !qs('li', list)) list.remove();
  });

  /* ---------- Home: popular search shortcuts ---------- */
  var popular = qs('[data-popular]');
  if (popular) {
    popular.getAttribute('data-popular').split(',').forEach(function (term) {
      term = term.trim();
      if (!term) return;
      var a = el('a', '', term);
      a.href = '/hc/' + locale + '/search?query=' + encodeURIComponent(term);
      popular.appendChild(a);
    });
    if (popular.children.length < 2) popular.remove();
  }

  /* ---------- Category page: knowledge base side nav ---------- */
  var catNav = qs('[data-categories-nav]');
  if (catNav) {
    var currentCat = String(catNav.getAttribute('data-current-category'));
    getJSON('/categories.json?per_page=100').then(function (data) {
      var list = qs('[data-categories-list]', catNav);
      (data.categories || []).forEach(function (c) {
        var li = el('li');
        var a = el('a', 'hc-sidenav__link' + (String(c.id) === currentCat ? ' is-current' : ''));
        a.href = c.html_url;
        if (String(c.id) === currentCat) a.setAttribute('aria-current', 'page');
        a.appendChild(icon(iconFor(c.id, c.name)));
        a.appendChild(el('span', '', c.name));
        a.firstChild.style.marginRight = '12px';
        a.style.justifyContent = 'flex-start';
        li.appendChild(a);
        list.appendChild(li);
      });
    }).catch(function () { catNav.hidden = true; });
  }

  /* ---------- Section page: sibling sections + article excerpts ---------- */
  var secNav = qs('[data-sections-nav]');
  if (secNav) {
    var currentSec = String(secNav.getAttribute('data-current-section'));
    var parentSec = null;
    getJSON('/sections/' + currentSec + '.json').then(function (s) {
      var catId = s.section.category_id;
      parentSec = s.section.parent_section_id ? String(s.section.parent_section_id) : null;
      return Promise.all([
        getJSON('/categories/' + catId + '.json'),
        getJSON('/categories/' + catId + '/sections.json?per_page=100')
      ]);
    }).then(function (res) {
      var cat = res[0].category;
      var all = res[1].sections || [];
      // Only show sections at the same level as this one:
      // top-level sections on a section page, sibling sub-sections on a sub-section page.
      var siblings = all.filter(function (s) {
        var p = s.parent_section_id ? String(s.parent_section_id) : null;
        return p === parentSec;
      });
      var parent = null;
      all.forEach(function (s) { if (String(s.id) === parentSec) parent = s; });
      var title = qs('[data-sections-title]', secNav);
      if (title) title.textContent = parent ? parent.name : cat.name;
      var list = qs('[data-sections-list]', secNav);
      siblings.forEach(function (s) {
        var li = el('li');
        var a = el('a', 'hc-sidenav__link' + (String(s.id) === currentSec ? ' is-current' : ''));
        a.href = s.html_url;
        if (String(s.id) === currentSec) a.setAttribute('aria-current', 'page');
        a.appendChild(el('span', '', s.name));
        li.appendChild(a);
        list.appendChild(li);
      });
      var back = el('a', 'hc-more hc-more--side');
      back.href = parent ? parent.html_url : cat.html_url;
      back.appendChild(icon('arrow-left', 'hc-icon--sm'));
      back.appendChild(doc.createTextNode(' Back to ' + (parent ? parent.name : cat.name)));
      secNav.appendChild(back);
    }).catch(function () { secNav.hidden = true; });
  }

  var secArticles = qs('[data-section-articles]');
  if (secArticles) {
    // Tags from the title, so editors do not need a separate field.
    qsa('[data-title]', secArticles).forEach(function (t) {
      var txt = t.textContent;
      var holder = t.parentNode;
      if (/\(?\bbeta\b\)?/i.test(txt)) {
        t.textContent = txt.replace(/\s*\(?\bbeta\b\)?/i, '').trim();
        holder.appendChild(el('span', 'hc-tag hc-tag--upgrade', 'Beta'));
      }
      if (/^\s*\(\s*legacy[^)]*\)\s*-?\s*/i.test(txt)) {
        t.textContent = txt.replace(/^\s*\(\s*legacy[^)]*\)\s*-?\s*/i, '').trim() || txt;
        holder.appendChild(el('span', 'hc-tag hc-tag--disabled', 'Legacy'));
      }
    });
    var sid = secArticles.getAttribute('data-section-id');
    getJSON('/sections/' + sid + '/articles.json?per_page=100&sort_by=position').then(function (data) {
      var byId = {};
      (data.articles || []).forEach(function (a) { byId[a.id] = a; });
      qsa('[data-article-id]', secArticles).forEach(function (row) {
        var a = byId[row.getAttribute('data-article-id')];
        if (!a) return;
        var ex = qs('[data-excerpt]', row);
        var text = stripHtml(a.body);
        if (ex && text) ex.textContent = text.length > 170 ? text.slice(0, 167).replace(/\s+\S*$/, '') + '...' : text;
        var up = qs('[data-updated]', row);
        if (up && a.edited_at) {
          up.textContent = 'Updated ' + new Date(a.edited_at).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
        }
      });
    }).catch(function () { /* excerpts are optional */ });
  }

  /* ---------- Article ---------- */
  var body = qs('#hc-article-body');
  if (body) {
    // Wrap tables so wide ones scroll inside a box.
    qsa('table', body).forEach(function (t) {
      if (t.parentNode.classList.contains('hc-table-wrap')) return;
      var w = el('div', 'hc-table-wrap');
      t.parentNode.insertBefore(w, t);
      w.appendChild(t);
    });

    // Table of contents from h2/h3.
    var heads = qsa('h2, h3', body);
    var toc = qs('[data-toc]');
    var tocList = qs('[data-toc-list]');
    if (toc && tocList && heads.length > 1) {
      var used = {};
      var links = [];
      heads.forEach(function (h, i) {
        var text = h.textContent.trim();
        if (!text) return;
        if (!h.id) {
          var base = text.toLowerCase().replace(/[^\wÀ-ɏ]+/g, '-').replace(/^-+|-+$/g, '') || 'section-' + i;
          var id = base, n = 2;
          while (used[id] || doc.getElementById(id)) id = base + '-' + n++;
          h.id = id;
        }
        used[h.id] = true;
        var li = el('li', h.tagName === 'H3' ? 'is-sub' : '');
        var a = el('a', '', text);
        a.href = '#' + h.id;
        li.appendChild(a);
        tocList.appendChild(li);
        links.push({ a: a, h: h });
      });
      toc.hidden = false;

      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            links.forEach(function (l) { l.a.classList.toggle('is-active', l.h === en.target); });
          });
        }, { rootMargin: '0px 0px -70% 0px' });
        links.forEach(function (l) { io.observe(l.h); });
      }
    }

    // Open external links in the same tab but safely.
    qsa('a[href^="http"]', body).forEach(function (a) {
      if (a.hostname !== location.hostname) a.setAttribute('rel', 'noopener');
    });
  }

  // Keep "More in this section" short.
  var related = qs('[data-related]');
  if (related) qsa('li', related).slice(4).forEach(function (li) { li.remove(); });

  var copyBtn = qs('[data-copy-link]');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var label = qs('[data-copy-label]', copyBtn);
      var done = function () {
        if (!label) return;
        var old = label.textContent;
        label.textContent = 'Copied';
        setTimeout(function () { label.textContent = old; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(location.href.split('#')[0]).then(done);
      } else {
        var ta = el('textarea');
        ta.value = location.href.split('#')[0];
        doc.body.appendChild(ta);
        ta.select();
        try { doc.execCommand('copy'); done(); } catch (err) { /* ignore */ }
        ta.remove();
      }
    });
  }
  var printBtn = qs('[data-print]');
  if (printBtn) printBtn.addEventListener('click', function () { window.print(); });
})();

/* ---------- Sign-in help request form (new_request_page.hbs) ----------
 * Builds the request form from Zendesk's new_request_form data.
 * - The Issue type field shows as clickable cards (real radio buttons).
 * - Subject and description are hidden and filled in automatically.
 * - For signed-out users, the custom email field also fills Zendesk's
 *   requester email, so only one email field shows.
 * Field IDs come from the theme settings (Sign-in help form).
 */
(function () {
  'use strict';

  var doc = document;
  var root = doc.querySelector('[data-request-form]');
  var data = window.HC_NEW_REQUEST_FORM;
  if (!root || !data) return;

  function attr(name) { return (root.getAttribute(name) || '').trim(); }
  var cfg = {
    formId: attr('data-form-id'),
    issueId: attr('data-issue-field'),
    emailId: attr('data-email-field'),
    phoneId: attr('data-phone-field'),
    prefix: attr('data-subject-prefix') || 'Sign-in help'
  };

  /* The page only opens with the sign-in help form ID in the link
     (see document_head.hbs); anything else goes to Contact us. */
  var formField = data.ticket_form_field;

  /* Hints and icons for the issue cards, keyed by option tag. */
  var optionInfo = {};
  Array.prototype.forEach.call(doc.querySelectorAll('[data-option-hints] [data-option]'), function (n) {
    optionInfo[n.getAttribute('data-option')] = {
      hint: (n.textContent || '').trim(),
      icon: n.getAttribute('data-icon') || ''
    };
  });

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  function icon(name, cls) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = doc.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'hc-icon ' + (cls || ''));
    svg.setAttribute('aria-hidden', 'true');
    var use = doc.createElementNS(ns, 'use');
    use.setAttribute('href', '#icon-' + name);
    svg.appendChild(use);
    return svg;
  }
  function hidden(name, value) {
    var i = doc.createElement('input');
    i.type = 'hidden';
    i.name = name;
    i.value = value == null ? '' : String(value);
    return i;
  }
  function is(field, id) { return id && String(field.id) === id; }

  var form = el('form', 'hc-form');
  form.action = data.action;
  form.method = data.http_method || 'post';
  form.setAttribute('accept-charset', data.accept_charset || 'UTF-8');
  form.noValidate = true;

  var alertBox = el('div', 'hc-alert');
  alertBox.setAttribute('role', 'alert');
  alertBox.hidden = !data.errors;
  if (data.errors) alertBox.textContent = data.errors;
  form.appendChild(alertBox);

  /* Hidden fields Zendesk expects. */
  if (formField && formField.name) {
    var formValue = formField.value || (formField.options && formField.options.length === 1 ? formField.options[0].value : '');
    form.appendChild(hidden(formField.name, formValue));
  }
  if (data.parent_id_field) form.appendChild(hidden(data.parent_id_field.name, data.parent_id_field.value));
  if (data.description_mimetype_field) form.appendChild(hidden(data.description_mimetype_field.name, 'text/plain'));
  (data.inline_attachments_fields || []).forEach(function (f) { form.appendChild(hidden(f.name, f.value)); });

  var controls = [];   // { field, kind, input(s), wrap, labelText }
  var subjectInput = null;
  var descriptionInput = null;
  var requesterEmailInput = null;
  var uid = 0;

  function addMessages(wrap, field, describedBy) {
    if (field.description) {
      var hint = el('p', 'hc-field__hint', field.description);
      hint.id = 'hc-f-hint-' + (++uid);
      wrap.appendChild(hint);
      describedBy.push(hint.id);
    }
    var err = el('p', 'hc-field__error');
    err.id = 'hc-f-err-' + (++uid);
    err.hidden = !field.error;
    if (field.error) err.textContent = field.error;
    wrap.appendChild(err);
    describedBy.push(err.id);
    return err;
  }

  function labelNode(text, required, forId, tag) {
    var l = el(tag || 'label', 'hc-field__label');
    if (forId) l.htmlFor = forId;
    l.appendChild(doc.createTextNode(text));
    if (!required) l.appendChild(el('span', 'hc-field__optional', ' (optional)'));
    return l;
  }

  /* Issue type: clickable cards. */
  function renderCards(field) {
    var wrap = el('fieldset', 'hc-field hc-choice');
    var legend = labelNode(field.label, field.required, null, 'legend');
    legend.className = 'hc-choice__legend';
    wrap.appendChild(legend);
    var describedBy = [];
    var err = addMessages(wrap, field, describedBy);
    wrap.setAttribute('aria-describedby', describedBy.join(' '));
    var list = el('div', 'hc-choice__list');
    var radios = [];
    (field.options || []).filter(function (o) { return o.value; }).forEach(function (o) {
      var info = optionInfo[o.value] || {};
      var card = el('label', 'hc-option');
      var input = doc.createElement('input');
      input.type = 'radio';
      input.className = 'hc-option__input';
      input.name = field.name;
      input.value = o.value;
      if (String(field.value) === String(o.value)) { input.checked = true; card.classList.add('is-selected'); }
      var body = el('span', 'hc-option__body');
      body.appendChild(el('span', 'hc-option__title', o.name));
      if (info.hint) body.appendChild(el('span', 'hc-option__text', info.hint));
      card.appendChild(input);
      card.appendChild(body);
      if (info.icon) card.appendChild(icon(info.icon, 'hc-icon--lg hc-option__icon'));
      list.appendChild(card);
      radios.push(input);
      input.addEventListener('change', function () {
        radios.forEach(function (r) { r.parentNode.classList.toggle('is-selected', r.checked); });
        clearError(ctrl);
      });
    });
    wrap.insertBefore(list, err);
    var ctrl = { field: field, kind: 'radio', inputs: radios, wrap: wrap, err: err, labelText: field.label };
    controls.push(ctrl);
    return wrap;
  }

  /* Any other field. */
  function renderField(field, opts) {
    opts = opts || {};
    var wrap = el('div', 'hc-field');
    var id = 'hc-f-' + field.id + '-' + (++uid);
    wrap.appendChild(labelNode(field.label, field.required, id));
    var input;
    var type = field.type;
    if (type === 'tagger') {
      input = el('select', 'hc-input hc-select');
      var empty = el('option', '', 'Select an option');
      empty.value = '';
      input.appendChild(empty);
      (field.options || []).forEach(function (o) {
        if (!o.value) return;
        var op = el('option', '', o.name);
        op.value = o.value;
        if (String(field.value) === String(o.value)) op.selected = true;
        input.appendChild(op);
      }); 
    } else if (type === 'textarea') {
      input = el('textarea', 'hc-input hc-textarea');
      input.rows = 4;
      input.value = field.value || '';
    } else if (type === 'checkbox') {
      wrap.className = 'hc-field hc-field--check';
      wrap.innerHTML = '';
      wrap.appendChild(hidden(field.name, '0'));
      input = doc.createElement('input');
      input.type = 'checkbox';
      input.value = '1';
      input.checked = field.value === true || field.value === '1';
      var cl = labelNode(field.label, true, id);
      input.id = id;
      input.name = field.name;
      wrap.appendChild(input);
      wrap.appendChild(cl);
      var cerr = addMessages(wrap, field, []);
      var cctrl = { field: field, kind: 'checkbox', input: input, wrap: wrap, err: cerr, labelText: field.label };
      controls.push(cctrl);
      return wrap;
    } else {
      input = doc.createElement('input');
      input.className = 'hc-input';
      input.type = opts.type || (type === 'date' ? 'date' : 'text');
      if (type === 'integer' || type === 'decimal') input.inputMode = type === 'integer' ? 'numeric' : 'decimal';
      if (opts.autocomplete) input.autocomplete = opts.autocomplete;
      if (opts.placeholder) input.placeholder = opts.placeholder;
      input.value = field.value == null ? '' : field.value;
    }
    input.id = id;
    input.name = field.name;
    if (field.required) input.setAttribute('aria-required', 'true');
    wrap.appendChild(input);
    var describedBy = [];
    var err = addMessages(wrap, field, describedBy);
    input.setAttribute('aria-describedby', describedBy.join(' '));
    if (field.error) { wrap.classList.add('is-invalid'); input.setAttribute('aria-invalid', 'true'); }
    var ctrl = { field: field, kind: opts.type === 'email' ? 'email' : 'value', input: input, wrap: wrap, err: err, labelText: field.label };
    controls.push(ctrl);
    input.addEventListener('input', function () { clearError(ctrl); });
    input.addEventListener('change', function () { clearError(ctrl); });
    return wrap;
  }

  var fields = el('div', 'hc-form__fields');
  form.appendChild(fields);

  /* Zendesk's own requester email (only for signed-out users). */
  var hasCustomEmail = cfg.emailId && (data.ticket_fields || []).some(function (f) { return is(f, cfg.emailId); });
  if (data.email_field) {
    if (hasCustomEmail) {
      requesterEmailInput = hidden(data.email_field.name, data.email_field.value);
      form.appendChild(requesterEmailInput);
    } else {
      fields.appendChild(renderField(data.email_field, { type: 'email', autocomplete: 'email', placeholder: 'name@example.com' }));
    }
  }

  (data.ticket_fields || []).forEach(function (field) {
    if (field.type === 'subject') {
      subjectInput = hidden(field.name, field.value);
      form.appendChild(subjectInput);
    } else if (field.type === 'description') {
      descriptionInput = hidden(field.name, field.value);
      form.appendChild(descriptionInput);
    } else if (is(field, cfg.issueId) && field.type === 'tagger') {
      fields.appendChild(renderCards(field));
    } else if (is(field, cfg.emailId)) {
      fields.appendChild(renderField(field, { type: 'email', autocomplete: 'email', placeholder: 'name@example.com' }));
    } else if (is(field, cfg.phoneId)) {
      fields.appendChild(renderField(field, { type: 'tel', autocomplete: 'tel', placeholder: '+34 600 000 000' }));
    } else {
      fields.appendChild(renderField(field));
    }
  });

  /* If the ticket form has no Subject field, still send a subject,
     so Zendesk doesn't use the start of the description instead. */
  if (!subjectInput) {
    subjectInput = hidden('request[subject]', '');
    form.appendChild(subjectInput);
  }

  var footer = el('div', 'hc-form__footer');
  footer.appendChild(el('p', 'hc-form__note', 'We’ll reply to the email address above.'));
  var submit = el('button', 'hc-btn hc-btn--primary hc-btn--lg', 'Send request');
  submit.type = 'submit';
  footer.appendChild(submit);
  form.appendChild(footer);

  root.innerHTML = '';
  root.appendChild(form);

  /* ---------- Validation ---------- */
  function valueOf(c) {
    if (c.kind === 'radio') {
      for (var i = 0; i < c.inputs.length; i++) if (c.inputs[i].checked) return c.inputs[i];
      return null;
    }
    if (c.kind === 'checkbox') return c.input.checked ? '1' : '';
    return (c.input.value || '').trim();
  }
  function showError(c, msg) {
    c.err.textContent = msg;
    c.err.hidden = false;
    c.wrap.classList.add('is-invalid');
    (c.inputs || [c.input]).forEach(function (i) { i.setAttribute('aria-invalid', 'true'); });
  }
  function clearError(c) {
    if (c.err.hidden) return;
    c.err.hidden = true;
    c.err.textContent = '';
    c.wrap.classList.remove('is-invalid');
    (c.inputs || [c.input]).forEach(function (i) { i.removeAttribute('aria-invalid'); });
  }
  function validate() {
    var first = null;
    controls.forEach(function (c) {
      var v = valueOf(c);
      var msg = '';
      if (c.field.required && !v) {
        msg = c.kind === 'radio' ? 'Choose what you need help with.' : 'Fill in this field.';
      } else if (c.kind === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        msg = 'Enter a valid email address, like name@example.com.';
      }
      if (msg) {
        showError(c, msg);
        if (!first) first = c.kind === 'radio' ? c.inputs[0] : c.input;
      } else {
        clearError(c);
      }
    });
    if (first) first.focus();
    return !first;
  }

  /* ---------- Submit ---------- */
  function summaryLines() {
    return controls.map(function (c) {
      var v = valueOf(c);
      if (c.kind === 'radio') v = v ? v.parentNode.querySelector('.hc-option__title').textContent : '';
      if (c.input && c.input.tagName === 'SELECT' && c.input.selectedIndex > 0) v = c.input.options[c.input.selectedIndex].text;
      return c.labelText + ': ' + (v || '-');
    });
  }

  var sending = false;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;
    alertBox.hidden = true;
    if (!validate()) return;

    var issue = null;
    controls.forEach(function (c) { if (c.kind === 'radio' && is(c.field, cfg.issueId)) issue = valueOf(c); });
    var issueName = issue ? issue.parentNode.querySelector('.hc-option__title').textContent : '';

    if (subjectInput && !subjectInput.value) subjectInput.value = cfg.prefix + (issueName ? ': ' + issueName : '');
    if (descriptionInput && !descriptionInput.value) {
      descriptionInput.value = ['Sent from the sign-in help form.', ''].concat(summaryLines()).join('\n');
    }
    if (requesterEmailInput) {
      controls.forEach(function (c) { if (is(c.field, cfg.emailId)) requesterEmailInput.value = valueOf(c); });
    }

    sending = true;
    submit.setAttribute('aria-disabled', 'true');
    submit.textContent = 'Sending…';

    fetch('/api/v2/help_center/sessions.json', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        form.appendChild(hidden('authenticity_token', j.current_session.csrf_token));
        HTMLFormElement.prototype.submit.call(form);
      })
      .catch(function () {
        sending = false;
        submit.removeAttribute('aria-disabled');
        submit.textContent = 'Send request';
        alertBox.textContent = 'We couldn’t send your request. Wait a moment and try again.';
        alertBox.hidden = false;
      });
  });
})();
