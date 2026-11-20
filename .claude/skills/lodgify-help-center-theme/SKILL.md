---
name: "lodgify-help-center-theme"
description: "Use when changing the Lodgify Help Center Zendesk theme (help.lodgify.com): templates, styles, labels, translations, dynamic content, or a GitHub PR for the theme repo."
---

# Lodgify Help Center theme

You maintain the custom Zendesk Guide theme for help.lodgify.com. A typical change touches four things, in this order:

1. The text (English source, style guide).
2. The translations (Lokalise first, then the KB glossary).
3. The dynamic content items in Zendesk.
4. The theme code, delivered as a GitHub pull request.

Design follows the Lodgify Garden design system.

Ask before anything that writes outside the repo (Zendesk, Lokalise). Show what you'll create, then wait for a yes.

## The theme

- **Repo:** the Help Center theme repo in the Lodgify GitHub org. The base branch is `master`. Zendesk imports the theme from GitHub (Guide > Customize design > Update from GitHub).
- **Engine:** Zendesk Templating API v4 (Curlybars).

| File | What it holds |
|---|---|
| `manifest.json` | Name, version and the settings shown in Guide |
| `style.css` | All styles. Garden tokens are CSS variables at the top. |
| `script.js` | All behavior: menus, side navigation, sub-section cards, table of contents, article feedback, sign-in help form |
| `templates/*.hbs` | One file per page type, plus `header.hbs` (with the SVG icon sprite), `footer.hbs` and `document_head.hbs` (fonts, Google tag, redirects) |
| `assets/` | Fonts and favicon |
| `README.md` | Team docs. Update it when behavior or settings change. |

### Rules that break the import if ignored

- **Version:** bump `version` in `manifest.json` (semver) in every PR. Zendesk refuses an update with the same or a lower version.
- **Setting limits:** setting `description` must be 80 characters or less. `identifier` must be 30 or less, and `label` 40 or less.
- **Template data:** only use properties that exist for that template in the v4 docs. Curlybars validates them on import. For example, `section.sections` exists on the section page, but `sections` inside a card object does not. Load anything else with the Help Center API from `script.js`.
- **Settings are literal text:** `{{dc.x}}` doesn't render inside a theme setting. Use `{{dc 'key'}}` in templates instead.
- **Line endings:** keep the line endings each file already has (most are CRLF).

### Things Zendesk doesn't give the theme

- **Sub-sections inside cards:** `script.js` loads them from `/api/v2/help_center/{locale}/categories/{id}/sections.json` and uses `parent_section_id`.
- **The new request form (v4):** the theme builds it from `{{json new_request_form}}`. The CSRF token comes from `/api/v2/help_center/sessions.json`.

### Fixed decisions (don't change unless asked)

- **Article author:** always shows as "Lodgify Resources Team" (`{{dc 'hcresourcesteam'}}`).
- **Request forms:** the only one is the sign-in help form. `/requests/new` without its `ticket_form_id` redirects to the Contact us article. All "Contact us" links use `settings.contact_url`.
- **Article feedback:** after a vote, Yes asks for an optional comment. No asks for reasons, then an optional comment. Results go to the KB feedback Google Sheet with the fields `title`, `language`, `feedback`, `feedbackType`, `reason`, `selectedFeedback`, `deviceType` and `category`. Don't change the endpoint or the field names, or the sheet stops filling.
- **Use cases:** it has its own home card, and is hidden from the topics grid.

## 1. Write the English text

Read the KB Style Guide in Notion before writing any visible text: https://app.notion.com/p/lodgify/KB-Style-Guide-3d7f0614e38281a1953ceafc9ae548b8

The main points:

- **Product terms:** use the words the product uses: "rental", not "property"; "reservation", not "booking". Check the glossary for anything else.
- **Voice:** direct "you". Short and plain.
- **Punctuation:** no em dashes in any language.
- **Glossary words with a set meaning:** don't use one for something else. For example, "Guides" is a product feature, so don't use it to mean articles.
- **Format rules:** follow the style guide's rules for titles, capitalization and callouts.

## 2. Get the translations

The Help Center languages are `en-us` (default), `fr`, `es`, `it`, `de` and `pt`. Confirm them with `GET https://help.lodgify.com/api/v2/help_center/locales.json`.

For each string:

1. **Lokalise first.** If the Lokalise MCP or API is available, search the Lodgify project for the English source text, or for the product label you're referring to. If a key matches, reuse its translations as they are, so the Help Center matches the app. Note the key name next to the item.
2. **Otherwise, translate with the KB glossary.** The full prompts per language are in the style guide, section "Translations and glossaries".
   - **Registers:** French uses vous; Spanish (Spain) uses tú, never usted; German uses Sie, but natural; Italian is direct; Portuguese (Portugal) is formal, never tu, with pt-PT spelling.
   - **Capitalization after a colon:** German capitalizes the sentence after a colon; Spanish, French, Italian and Portuguese keep it lowercase.
   - **Typography:** French puts a space before `:`, `?` and `!`.
   - **Glossary terms override everything.** For example, Pricing is "Tarifs" in French, never "Prix".
3. Never invent product names or translate brand names (Lodgify, Lodgify Academy).

## 3. Create dynamic content in Zendesk

Visible text in templates is `{{dc 'key'}}`, never hardcoded English. Zendesk's built-in `{{t '...'}}` is fine for standard labels it already translates.

**Naming:** title the item in lowercase snake case with the `hc_` prefix, such as `hc_popular_articles`. Zendesk builds the placeholder from the title (`{{dc.hc_popular_articles}}`). Older items without underscores (`hccontactus`, `hcquickguidestitle`, `kb_-_was_this_helpful`…) already exist. Reuse them rather than creating duplicates.

**Before creating anything:**

1. List the existing items with `GET /api/v2/dynamic_content/items.json`, following `next_page` through every page. Reuse an item if its placeholder or English text already matches.
2. Show the user a table: title, placeholder, where it shows, and the six languages. Wait for approval.

**Creating:** use the Zendesk API with the user's credentials from environment variables (`ZENDESK_SUBDOMAIN`, `ZENDESK_EMAIL`, `ZENDESK_API_TOKEN`). Never print or commit them.

1. Get locale IDs from `GET /api/v2/locales.json`.
2. Create each item with `POST /api/v2/dynamic_content/items.json`. Set `name` to the title and `default_locale_id` to English. Its `variants` list holds the English variant with `"default": true`.
3. Add the other languages with `POST /api/v2/dynamic_content/items/{id}/variants/create_many.json`.
4. Read every item back and check the placeholder and the six variants.

If there are no credentials, give the user the same table as a spreadsheet (`.xlsx`) to create by hand, and stop there.

**Order matters.** Create the dynamic content before the theme change that uses it is imported. A template that references a missing item shows a blank or broken label on the live site.

**Text in `script.js`:** JavaScript can't call `{{dc}}`. Render the translated text into a `data-` attribute in the template, such as `data-label-sending="{{dc 'hc_form_sending'}}"`, and read it in the script. Keep an English fallback.

## 4. Design with Garden

All visual changes use the Lodgify Garden design system.

- **Source:** if the Garden Design System is available as a claude.ai artifact or design system, read it first. Otherwise, the tokens at the top of `style.css` are the source of truth.
- **Tokens:** use the existing CSS variables for color, spacing, radius and type (`--fs-*`, `--lh-*`, `--radius-*`, `--bg-*`, `--fg-*`, `--border*`). Don't hardcode hex values or pixel sizes that have a token.
- **Fonts:** RL Aqva for headings, Inter for body text. Black and brand yellow are the main colors.
- **Components:** reuse the existing component classes (`hc-btn`, `hc-card-lg`, `hc-tag`, `hc-input`, `hc-field`, `hc-section-card`…) before adding new ones. Prefix new classes with `hc-`.
- **Icons:** Garden icons live as `<symbol id="icon-name">` in the sprite in `templates/header.hbs` and are used as `<svg><use href="#icon-name"/></svg>`. Add missing Garden icons to the sprite. Don't load an icon library.
- **Responsive:** check every change at phone width (375px) and desktop. Keep keyboard focus states and `aria-` labels.
- **Article components:** the article body uses components from the style guide (callouts, accordions, Beta, Premium and Resources boxes, `data-chatbot` attributes). Keep their class names working. Never remove a span inside a `<summary>`.

## 5. Ship through GitHub

1. Start from an up-to-date `master` and create a branch named for the change, such as `theme/translate-labels`.
2. Make the change. Bump `version` in `manifest.json` (patch for fixes, minor for features). Update `README.md` if settings, dynamic content or behavior changed.
3. **Test before committing:**
   - Render the changed templates with stubbed data in Playwright and check desktop and mobile.
   - Run `node --check script.js`.
   - Validate `manifest.json` (valid JSON, setting limits).
   - Grep the templates for hardcoded English text that should be `{{dc}}`.
4. Commit with a clear message, push, and open a PR into `master`. In the PR description, include:
   - what changed and why
   - the new version number
   - the dynamic content items it depends on, and whether they already exist in Zendesk
   - the pages to check in the theme preview
5. Don't merge, and don't publish the theme in Zendesk. The user imports it from GitHub, previews it, then publishes it herself.

## Don't

- Write to Zendesk or Lokalise without approval for that specific change.
- Hardcode visible English text in templates or scripts.
- Change redirects, the Google tag (G-CSHZ4R4P4Z), the sign-in form IDs or the feedback sheet endpoint unless asked.
- Reuse a version number.