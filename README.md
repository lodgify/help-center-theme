# Lodgify Help Center theme

Custom Zendesk Guide theme for the Lodgify Help Center (help.lodgify.com), built on Templating API v4. It uses the Lodgify brand: RL Aqva for headings, Inter for body text, black and brand yellow.

## Files

| File | What it does |
|---|---|
| `manifest.json` | Theme name, API version and the settings shown in Guide (Customize design > Settings). |
| `style.css` | All styles. Colors, radii and type sizes are CSS variables at the top. |
| `script.js` | All behavior: mobile menu, category icons, side menus, article table of contents, the sign-in help form. |
| `templates/document_head.hbs` | Fonts, Google tag, article redirects and the request page redirect. |
| `templates/header.hbs` | Header, mobile menu and the SVG icon sprite (`#icon-...`). |
| `templates/footer.hbs` | Footer. |
| `templates/home_page.hbs` | Home page. |
| `templates/category_page.hbs` | Category page: section cards. |
| `templates/section_page.hbs` | Section page: sub-section cards and/or the article list. |
| `templates/article_page.hbs` | Article page. The author always shows as "Lodgify Resources Team". |
| `templates/search_results.hbs` | Search results. |
| `templates/new_request_page.hbs` | Sign-in help form. |
| `templates/request_page.hbs` | "We got your request" page after sending the form. |
| `templates/requests_page.hbs` | "We reply to requests by email" page. |
| `templates/error_page.hbs` | Page not found. |
| Other templates | Community, approvals, subscriptions and similar pages aren't used. They show a "This page isn't available" message. Zendesk requires them to exist. |
| `assets/` | RL Aqva font files. |

## Theme settings

Set these in Guide > Customize design > (this theme) > Settings.

**Links**: Use cases, Lodgify Academy, Contact us, System status. An empty link hides that item. "Contact us" must point to the Contact us article.

**Footer**: website, blog, announcements and legal links.

**Sign-in help form**: form ID, field IDs, ticket subject and sign-in page URL (see below).

Manifest limits: setting descriptions must be 80 characters or less, or the import fails.

## Home page texts (dynamic content)

These texts come from dynamic content (Admin Center > Workspaces > Dynamic content), so they're translated:

| Text | Dynamic content |
|---|---|
| Hero heading | `hc_hero_title` |
| Tagline | `hero_tagline` |
| Subtitle | `hc_hero_subtitle` |
| Search placeholder (all search boxes) | `search_placeholder` |
| Popular searches (comma-separated, empty hides them) | `popular_searches` |

## Sign-in help form

The Help Center has one request form, only for people who can't sign in to Lodgify. It isn't linked anywhere in the Help Center. Link to it from the Lodgify sign-in page:

```
https://help.lodgify.com/hc/requests/new?ticket_form_id=31626658381340
```

Without that form ID, `/requests/new` redirects to the Contact us article (see `document_head.hbs`).

**Zendesk setup**

| Field | ID | Required | Title / hint (dynamic content) |
|---|---|---|---|
| Ticket form | 31626658381340 | | |
| Issue type (drop-down) | 31607584352412 | Yes | `{{dc.issuetype}}` |
| Requester email (contact form) | 4416158085650 | Yes | `{{dc.cfownersemails}}` / `{{dc.requestemail}}` |
| Requester phone number | 31606911818652 | Yes | `{{dc.phonenumber}}` / `{{dc.requestphone}}` |
| User ID (contact form) | 31607073250076 | No | `{{dc.cfuserid}}` / `{{dc.requestuserid}}` |
| Subject, Description | system fields | | Must be on the form. The theme hides and fills them. |

- Issue type options: `{{dc.cfforgotpassword}}` (tag `password_help`) and `{{dc.cf2fa}}` (tag `2fa_help`).
- The text under each issue card comes from `{{dc.cfforgotpassword_hint}}` and `{{dc.cf2fa_hint}}`, matched by tag in `new_request_page.hbs`. If you change a tag, change it there too.
- The theme settings hold the form ID and the issue, email and phone field IDs. Update them there if a field or form is replaced.

**How the form works** (`script.js`, "Sign-in help request form")
- Issue type shows as two clickable cards instead of a drop-down.
- Subject is filled as "<Ticket subject setting>: <chosen issue>".
- Description is filled with a summary of every field.
- For signed-out users, the email field is also sent as the requester email, so only one email field shows.
- Required fields are checked before sending.

## Redirects (`document_head.hbs`)

- **Article redirects**: a list of `"old article ID": "new article ID"` pairs. To add one, add a line to the list. Chains (A to B to C) go straight to the last article, and the visitor's language is kept.
- **Request page**: `/requests/new` without the sign-in form ID goes to the Contact us link from the theme settings.

## Google Analytics

The Google tag (G-CSHZ4R4P4Z) is in `document_head.hbs`.

## Icons

Icons are SVG symbols in `templates/header.hbs` (from Lodgify's Garden design system) and are used as `<svg><use href="#icon-name"/></svg>`. To add one, paste a new `<symbol id="icon-name" viewBox="0 0 24 24">...</symbol>` inside the sprite.

## Publishing changes

1. Push changes to this repo.
2. In Guide > Customize design, update the theme from GitHub (or import it again).
3. Check the theme settings, then preview before publishing.

## Testing checklist

- Home, a category, a section with sub-sections, a sub-section, an article and search results.
- Mobile view and the mobile menu.
- An old article link from the redirect list.
- `/hc/en-us/requests/new` goes to Contact us.
- The sign-in form link shows the form. Send a test while signed out and check the ticket's subject, description, tags and requester.
