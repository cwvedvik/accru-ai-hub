# Accru AI Hub — User Experience & Interface Specification

**Version:** 0.3 (draft for review)
**Owner:** Head of AI, Accru Partners Group
**Companion:** `accru-ai-hub-technical-architecture.md`
**Date:** 9 July 2026 (v0.3 design-system pass — see Changelog, §15)

---

## 1. Who this is for

Not developers. An accountant in Bergen, an auditor in Malmö, a payroll specialist in Aarhus, a partner in Manchester. Median technical confidence: low. Median available attention: four minutes between client calls. Median prior experience with internal tool catalogues: they were bad and nobody used them.

Design consequences:

- **Zero-friction entry.** One button to log in. No account creation. No password.
- **Something useful on the first screen.** If the Home page requires a search to be useful, it has failed.
- **The catalogue must never look empty or dead.** Curation, health badges, and recency labels do this work.
- **Every asset answers "what does this do for me, in my country, this week?"** in one sentence, before anything else.

The design north star: *it should feel like an app store made by people who understand accounting*, not like an internal SharePoint page with a new logo.

---

## 2. Design system

### 2.1 Foundation

Accru brand, applied to a product surface rather than a document.

| Token | Value | Use |
|-------|-------|-----|
| `--canvas` | `#e8e4db` | Page background. Cream, never white. |
| `--surface` | `#ffffff` | Cards, panels, modals sitting on canvas |
| `--surface-sunken` | `#dfdad0` | Input fields, code blocks, inactive tabs, static placeholders |
| `--brand-red` | `#722322` | Headings, primary nav active state, header bars, destructive-adjacent emphasis |
| `--brand-orange` | `#dc6834` | Bright display orange. **Decorative / large only** — see contrast rule below |
| `--action` | `#b8501c` | Button fills, links, active filters, progress, small UI. **The accessible orange.** |
| `--action-hover` | `#a2461a` | Hover on action elements |
| `--action-press` | `#8c3d16` | Pressed/active on action elements |
| `--ink` | `#2b2523` | Body text |
| `--ink-muted` | `#6f6659` | Captions, metadata, timestamps |
| `--rule` | `#d5cfc2` | Borders, dividers, table lines |
| `--tint-red` | `#a04a3a` | Chart series, hover on red |
| `--tint-orange` | `#e89468` | Chart series, subtle fills |

Orange and deep red carry equal weight. Orange owns *action* (buttons, links, active state); deep red owns *structure* (headings, headers, nav). Neither is decoration.

**The one accessibility rule that governs the palette (WCAG 2.2 AA, non-negotiable, §12):** bright `--brand-orange #dc6834` gives only ~3.4:1 as text or a white-on-orange fill and ~2.7:1 as a thin ring — it *fails* AA at UI sizes. So it is split in two:

- **`--action #b8501c`** is used for everything functional: button fills (white text passes AA), text links (add an underline so colour is not the only signal), active filter chips, progress, focus-ring colour, small icons.
- **`--brand-orange #dc6834`** is permitted only for: display text ≥24px, decorative/large icons, chart series fills, and the soft outer glow of the focus ring. Never as body-size text or a small control on its own.

Deep red `--brand-red` remains valid for structural text on cream (≈7:1).

Semantic colours are derived, not imported from a generic palette — a stock Bootstrap green would break the warmth of the surface:

- Success / approved: `#3d6b4a` on `#e6ece6`
- Warning / degraded: `#8a6a1f` on `#f0e9d6`
- Danger / rejected: `#8f2f2b` on `#f2e2e0` (distinct from `--brand-red` by lightness; never use brand red for errors)
- Info / new: `--action` at 12% on cream

### 2.2 Typography

- **Headings:** Gelasio (fallback Georgia). Deep red or ink.
- **Body & UI:** Raleway (fallback Calibri, Arial). Ink.
- **Monospace:** JetBrains Mono, for prompt text and agent configs only.

Serif headings on a cream canvas is the whole brand argument. It reads as editorial and considered, which is exactly the tone an accounting group wants around AI. Resist the pull toward a generic sans-everything SaaS look.

**Type-role map** (rem, 16px base). Every size has one job so the developer never guesses:

| rem / px | Role | Font · weight | Leading · tracking |
|----------|------|---------------|--------------------|
| 2.25 / 36 | Page hero, sign-in "AI Hub" | Gelasio · 600 · brand-red | 1.15 · −0.01em |
| 1.75 / 28 | Screen title (Home greeting, asset title) | Gelasio · 600 | 1.2 · −0.01em |
| 1.375 / 22 | Section / row title ("Recommended for you") | Gelasio · 600 | 1.25 · −0.005em |
| 1.125 / 18 | Card title | Gelasio · 600 | 1.3 · normal |
| 1 / 16 | Body & UI base | Raleway · 400/500 | 1.5 · normal |
| 0.875 / 14 | Secondary text, metadata | Raleway · 400 | 1.45 · normal |
| 0.75 / 12 | Caption, KindBadge (uppercase) | Raleway · 600 | 1.3 · +0.04em |

**Serif-floor rule.** Gelasio is used only at **≥18px** and only for titles/headings. It is *never* used for numbers, table cells, form inputs, badges, or any text below 18px — those are Raleway. This protects legibility for low-confidence readers while keeping the editorial voice where it earns its place.

**Tabular figures are mandatory for an accounting audience.** Every number that sits in a column, metric, rating, price, count, date, or table uses `font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1;` so digits align and don't jitter as values update.

**Measure.** Body copy is capped at ~68ch; the asset-detail description column is capped at 640px. Long unmeasured lines are the fastest way to make a considered page feel like a document dump.

### 2.3 Form

- **Radius:** 8px cards, 6px buttons and inputs, 4px badges. Nothing fully rounded.
- **Borders:** 1px `--rule` on every card. On cream, shadow alone is not enough separation — the border stays even at rest and on hover.
- **Density:** comfortable. This is a browse tool, not a trading terminal.

**Elevation tiers** (was "one level only" — a considered UI needs a small, disciplined ladder). Cards are grounded; they lift, they never float away:

| Token | Shadow | Use |
|-------|--------|-----|
| `--e0` | none | Rest state flat on canvas |
| `--e1` | `0 1px 2px rgba(43,37,35,.06), 0 4px 12px rgba(43,37,35,.04)` | Cards at rest |
| `--e2` | `0 2px 4px rgba(43,37,35,.08), 0 8px 24px rgba(43,37,35,.06)` | Card hover, popovers, the scope dropdown |
| `--e3` | `0 8px 16px rgba(43,37,35,.10), 0 24px 48px rgba(43,37,35,.10)` | Modals, command palette |
| `--scrim` | `rgba(43,37,35,.32)` | Behind modals / bottom sheets |

Card hover is a lift of **at most `translateY(-2px)` + `--e2`** — perceptible, still grounded.

**Focus (WCAG 2.2 AA — the ring must itself pass 3:1).** A single thin orange ring fails; use a two-tone ring on `:focus-visible` only:

```css
:focus-visible { outline: none;
  box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--action); }
```

The inner surface-coloured band separates the ring from the control; the outer `--action` band carries the contrast. Visible on every interactive element.

**Motion system.** Restrained, named, and honest — modern does not mean busy:

```css
--dur-fast: 120ms;  --dur-base: 180ms;  --dur-slow: 240ms;
--ease-out: cubic-bezier(.2, 0, 0, 1);
--ease-in-out: cubic-bezier(.4, 0, .2, 1);
```

- **Animate:** hover elevation/colour (`--dur-fast`); dropdown / scope panel / bottom-sheet open (`--dur-base`, `--ease-out`, 4–8px rise + fade); modal & command palette (`--dur-slow`); filter chip add/remove (`--dur-fast` fade); content fade-in when data arrives (`--dur-base`).
- **Never:** looping animation, parallax, attention-seeking bounce, anything that moves without a user action.
- `@media (prefers-reduced-motion: reduce)` → transitions become opacity-only, transforms disabled, durations ~0.

**Static loading placeholder (no shimmer, by rule).** While data loads, render the final layout with solid `--surface-sunken` blocks at the real dimensions (card outlines, text-line bars). No pulse, no sweep. When content arrives it does a single `--dur-base` fade-in. Motion-as-loading-decoration is exactly the SaaS tell we are avoiding.

### 2.4 Components to own

Build these; import nothing else visual. Each ships with its full state set — `rest · hover · focus-visible · active/selected · disabled` — plus the noted specials. Premium feel lives in these details.

- **`AssetCard`** — rest `--e1` + 1px rule; hover `--e2` + `translateY(-2px)` + title underline; focus-visible two-tone ring on the whole card; `degraded` state at ~60% opacity with amber `HealthBadge` and a sink in rank; loading = static placeholder. Padding `--space-5` (24px).
- **`KindBadge`** — 0.75rem uppercase Raleway 600, 4px radius, per-kind tint fill (app/agent/skill/prompt/training), never brand-red text on tint.
- **`CountryChip`** — 16px `flag-icon` + 2-letter code, `--surface-sunken` fill; label form "Made in NO".
- **`HealthBadge`** — 8px dot + label; `healthy #3d6b4a` · `degraded #8a6a1f` · `down #8f2f2b`. Dot + text, never colour alone.
- **`FacetFilter`** — checkbox rows, count right-aligned tabular; selected → `--action` label + check; group collapse chevron; keyboard focus per row.
- **`SearchBar` / command palette** — 44px tall, leading search icon, trailing `⌘K` hint chip; results grouped (assets/categories/people/actions); active result = `--action` 2px left border + `--surface-sunken` bg; persistent "Search all countries" footer; palette on `--e3`.
- **`ReviewScorecard`** — 1–5 segmented control per criterion (value) or pass/conditional/fail pills (compliance); mandatory comment textarea with live counter; the other dimension shown read-only.
- **`StepWizard`** — numbered steps with progress dots; current = `--action`, completed = check; "Saved" draft indicator; sticky footer Back/Next; live asset-card preview panel where specced.
- **`EmptyState`** — never blank: a single quiet Phosphor icon, a headline, the widening counts, and two actions (discover / submit). This is a designed screen, not a fallback.
- **`DataPanel`** (Data & compliance) — key/value rows, 1px `--rule` between rows, label `--ink-muted` / value `--ink` tabular; prints cleanly (§12).
- **`Rating`** — Phosphor `star-fill`, count in tabular parens; read-only on cards, one-tap where interactive.
- **`ValueReportButton`** — pill; one-tap `Yes` reveals 3 inline chips (`~5 min` / `~20 min` / `an hour+`); disabled once answered this week.

### 2.5 Spacing, grid, and layout

**4px spacing scale.** One ramp, used everywhere — no arbitrary margins:

```
--space-1: 4    --space-2: 8    --space-3: 12   --space-4: 16
--space-5: 24   --space-6: 32   --space-7: 48   --space-8: 64   --space-9: 80
```

Defaults: card padding `--space-5` (24) · gap between cards `--space-5` · gap between Home rows `--space-6`/`--space-7` · chip/inline gap `--space-2` · page side padding `--space-5` desktop, `--space-4` (16) mobile.

**Grid.** 1280px max content width, centred; 12 columns, 24px gutters. Breakpoints: `600 / 900 / 1120 / 1280`.

**Card grid.** `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-5);` — which naturally yields the Home row counts: 4 cards ≥1120px, 3 at 900–1120, 2 at 600–900, 1 below. Browse is a fixed 240px left rail + the fluid card grid beside it.

### 2.6 Iconography

- **Icon set: Phosphor Icons** (regular weight) — its warm, slightly rounded geometric line matches the editorial-but-friendly brand better than a hard system set. 20px default, 16px inline with text, 24px in the nav rail. Never mix sets.
- **No emoji as UI.** Replace the mock-ups' `▣ ★ ● ⚑` with Phosphor `square`/`star-fill`/`circle`(health dot)/`flag`. Replace 🇳🇴-style emoji flags with the **flag-icons** library (crisp SVG) inside `CountryChip`, or a 2-letter country pill where a flag is too heavy.
- Icons are decorative-adjacent: always paired with a text label for anything actionable (accessibility + low-confidence users).

---

## 3. Sign-in

### 3.1 The screen

Full-bleed cream. Accru logo top-left with clear space. Centred card, max 420px, white, one rule border.

```
                    accru partners

                    ┌─────────────────────────────────┐
                    │                                 │
                    │   AI Hub                        │   Gelasio, 2.25rem, deep red
                    │                                 │
                    │   The group's apps, agents,     │   Raleway, ink-muted
                    │   skills and prompts —          │
                    │   in one place.                 │
                    │                                 │
                    │   ┌───────────────────────────┐ │
                    │   │  Continue with Accru      │ │   orange, full width, 48px
                    │   └───────────────────────────┘ │
                    │                                 │
                    │   Use your normal work login.   │   0.875rem, muted
                    │                                 │
                    └─────────────────────────────────┘

              Trouble signing in? Contact your firm's IT.
```

One button. It initiates Entra OIDC. There is no email field, no password field, no "sign up", no SSO-vs-password toggle. A user from a UK member firm and a user from the Norwegian holding company see the identical screen; tenant resolution happens inside Entra.

**Failure states get real copy, not error codes.** "Your account isn't in the Accru directory yet. Your firm's AI Responsible can add you — we've noted your attempt." with a `mailto:` prefilled. The `#EXT#` UPN failure mode (see architecture §8.1) must never surface as a raw error; it resolves silently on `oid`.

### 3.2 First run — onboarding

Three steps, skippable, ~40 seconds. Progress dots, not a bar. Everything asked here feeds the ranking function; nothing is asked twice.

**Step 1 — Confirm.** Pre-filled from Entra, read-only, with a "not right?" link.
> *You're Sarah Whitfield at Accru Manchester, United Kingdom.*

Showing this rather than asking it does two things: it demonstrates the Hub already knows her, and it surfaces bad group mappings on day one.

**Step 2 — What's your work?**
Job family: six large tappable cards (Accountant · Auditor · Payroll · Advisory · Partner / Leadership · Support & operations). Single select.
Then: *Which systems do you work in?* — chips, multi-select, ordered by what's common in her country. Xero and Sage float to the top for a UK user; Tripletex and PowerOffice for a Norwegian.

**Step 3 — What eats your week?**
Six to eight task chips, multi-select, plain language: *Chasing documents from clients · Bank reconciliation · Preparing year-end · Payroll runs · Writing client emails · VAT returns · Building reports.*

Then straight into Home — no confirmation screen, no "you're all set!" interstitial. She lands on a Home page already shaped by three answers.

**Skip behaviour:** skipping is allowed and non-punitive. Home falls back to country + editorial curation. A single dismissible prompt returns after the third session.

---

## 4. Information architecture

```
Home  (For you)
Browse  ──> Apps · Agents · Skills · Prompts        [faceted]
Training  ──> Courses · Labs · My certification
Submit  ──> wizard
My work  ──> My submissions · My assets · Saved
Review   [reviewers only]  ──> Queue · Decided · Overdue
Admin    [admins only]  ──> Taxonomy · Assets · People · Analytics · Health · Config
Profile  ──> Preferences · Certification · Sign out
```

**Shell:** persistent left rail (72px collapsed / 240px expanded, deep red active indicator), top bar with global search and account menu, and — below it — the **scope bar**. Content max-width 1280px, centred. No right sidebar; it becomes a dumping ground.

**Global search** (`⌘K` / `Ctrl+K`) opens a command palette over any screen: assets, categories, people, actions ("submit an app"). It searches *within the current scope* by default, with a persistent `Search all countries instead →` line at the bottom of the results. It should be the fastest path to anything, and power users should learn it within a week.

**Search understands meaning and crosses languages.** A UK user typing "bank reconciliation" also surfaces an excellent Norwegian-described tool titled *"Bankavstemming"* — because search matches meaning, not just English words (architecture §7.3). It also tolerates typos and finds accounting system names exactly (Tripletex, Fortnox, Xero). If the semantic layer is momentarily busy, search silently falls back to fast keyword matching rather than failing — the user simply sees a slightly simpler ranking, never an error.

### 4.1 The scope bar

Country and category are not filters buried in Browse. They are how an accounting group thinks, so they live in the shell, on every screen, always visible.

```
┌──────────────────────────────────────────────────────────────────┐
│  accru  AI Hub          [ Search…  ⌘K ]              Sarah W. ▾  │
├──────────────────────────────────────────────────────────────────┤
│  Country: [ All countries ▾ ]     Category: [ All ▾ ]   ✕ Clear  │
│           ├ All countries   ✓          ├ All                     │
│           ├ Made in the UK             ├ Accounting        (34)  │
│           ├ Made in Norway             ├ Auditing          (19)  │
│           ├ Made in Sweden             ├ Payroll            (0)  │
│           └ Made in Denmark            ├ VAT / MVA          (7)  │
│                                        ├ Year-end          (12)  │
│                                        ├ Client comms      (23)  │
│                                        └ …                       │
├──────────────────────────────────────────────────────────────────┤
│  Home · Browse · Training — every surface renders inside scope    │
└──────────────────────────────────────────────────────────────────┘
```

**Two controls, both single-select.** Multi-select at this level produces states nobody can reason about and URLs nobody can share. Kind, system, task, language and certification remain multi-select facets in the Browse rail, applied underneath the scope.

**Country is simply the origin — five options, nothing more.** `All countries` (the default) plus one entry per country: `Made in the UK`, `Made in Norway`, `Made in Sweden`, `Made in Denmark`. Every asset was built in exactly one country (architecture §4.3), so choosing a country shows what that country made; choosing `All countries` shows everything, each card labelled with its origin. There is no "works here / applies to me" grading and no per-country checkbox — a checkbox would imply exclusion, which is the mental model we are trying not to build, and the graded version tested as over-complicated. Sorted by country. That is the whole model.

**Counts are always shown, including zeros.** A category with `(0)` in the current country renders greyed but *present*, and clicking it does not produce a dead end — it produces the widening prompt (§6). Hiding empty categories hides the group's build backlog from the very people who could fill it.

**Scope lives in the URL.**

```
/home?c=all&cat=all                        (the default view)
/home?c=SE&cat=audit
/browse?c=UK&cat=payroll&kind=app&system=xero
```

A Country AI Lead pastes `?c=SE&cat=payroll` into Teams and her colleague lands on exactly that view. Back button works. Bookmarks work. The last-used scope persists to the profile and is restored on the next sign-in; the first-ever scope is `All countries × All` for everyone.

**Scope is a lens, never a wall.** It changes what is shown and in what order. It never changes what she is permitted to see — permissions are enforced independently, and `All countries` reveals nothing she couldn't already reach.

**Mobile:** the two controls collapse into a single `All · All ▾` chip (showing the current selection, e.g. `Norway · Payroll ▾`) that opens a bottom sheet. It stays pinned to the header. It does not scroll away.

---

## 5. Home — "For you"

The most important screen in the product. Its job is to make an accountant who came for one thing discover a second thing.

**Home is a scoped view, not a fixed page.** Every row re-renders against the scope bar. At the default (`All countries × All`) she sees the layout below. Set the bar to `Made in Sweden × Auditing` and the same rows reshape: *Most used in Swedish auditing · New in Swedish auditing this month · Worth stealing from the other countries*. One page, one set of row definitions, filtered by scope. This is the single highest-leverage consequence of promoting scope into the shell — the group's most-visited screen becomes a browsing instrument rather than a static homepage.

```
┌──────────────────────────────────────────────────────────────────┐
│  Good morning, Sarah                        [ Search…    ⌘K ]    │
│  Accru Manchester · United Kingdom                                │
├──────────────────────────────────────────────────────────────────┤
│  Country: [ All countries ▾ ]     Category: [ All ▾ ]             │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Start here                                                       │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                     │
│  │ Foundation │ │ Prompt     │ │ Submit your│    ← dismissible,   │
│  │ course     │ │ basics     │ │ first idea │      once complete  │
│  │ 20 min     │ │ 5 min      │ │            │      never returns  │
│  └────────────┘ └────────────┘ └────────────┘                     │
│                                                                    │
│  Recommended for you                              See all →       │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                     │
│  │ App    │ │ Prompt │ │ Agent  │ │ Skill  │                      │
│  └────────┘ └────────┘ └────────┘ └────────┘                      │
│                                                                    │
│  Used most at Accru Manchester                    See all →       │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                      │
│                                                                    │
│  New this month                                   See all →       │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                      │
│                                                                    │
│  Worth stealing from across the group          [Made in NO/SE]    │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                      │
│  Built elsewhere, but the pattern transfers. Each card origin-tagged.│
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

Four notes on this layout, each load-bearing:

**"Used most at *your firm*"** converts better than any global ranking. Social proof from twelve colleagues beats social proof from two thousand strangers.

**The cross-country "worth stealing" row** is what makes the group a group. It is the visible expression of the open-by-default decision (architecture §4.3): on the default `All countries` view it is titled *"Worth stealing from across the group"* and each card is tagged with its origin; when a single country is selected it flips to *"Worth stealing from the other countries"* and shows the best of everywhere else. These rows are editorially curated, rotate monthly, and carry an honest origin label rather than being quietly hidden. The row title should be written by a human each month, not templated.

**"Start here"** disappears permanently once the user completes it. Nothing is more corrosive to an internal tool than an onboarding widget that outlives its usefulness.

**No hero banner.** No "Welcome to the AI Hub" marketing block. She has already logged in; she is not a prospect.

**Rows adapt to scope.** On the default `All countries` view, rows are group-wide and the cross-country row reads *"Worth stealing from across the group."* Select a single country (e.g. `Made in the UK`) and every row scopes to it, while the cross-country row flips to *"Worth stealing from the other countries."* When a category is selected, every row title takes the category and the "Start here" block swaps to the training path for that discipline. Row titles are templates with a hand-written override; the override is what the monthly curator edits.

---

## 6. Browse

Browse inherits the global scope (country × category) from the shell and adds a left rail (240px) of sub-facets beneath it. The rail never contains country or category — those live above, permanently.

- **Sub-facets:** Kind · System · Task · Language · Certification required. Multi-select, collapsed by default except Kind. From architecture §6.
- **Active sub-filters** render as removable orange chips above the grid, with result count. The scope is *not* repeated as a chip — it is visible two rows up, and duplicating it teaches people the two are the same thing when they are not.
- **Sort:** Relevance (default) · Most used · Newest · Highest rated.
- **Empty state — the important one.** Never "No results." Every list endpoint returns what a widened scope would reveal, so the empty state can be specific:

  > **Nothing in Payroll made in the UK yet.**
  > There are **12** payroll assets elsewhere in the group — 8 in Norway, 4 in Sweden. Most payroll logic is country-specific, but the patterns transfer.
  > `[ Show all countries ]`  `[ Submit the first UK one ]`

  Two buttons, both good outcomes: a discovery or a submission. This screen is where the cross-country compounding effect either happens or quietly doesn't. It deserves more design attention than the Home page.

- **Narrowing never dead-ends.** If sub-facets empty the grid, drop them one at a time in reverse order of selection and show *"No apps — showing prompts and skills too."* Silent, reversible, one line of explanation.

### 6.1 Asset card

```
┌───────────────────────────────────────────┐
│  ▣  APP                        ★ 4.6 (23) │   kind badge, deep red
│                                            │
│  Bank Reconciliation Assistant             │   Gelasio 1.125rem
│                                            │
│  Matches bank lines to ledger entries      │   2 lines, ink, truncate
│  and flags what it can't explain.          │
│                                            │
│  🇳🇴 Made in Norway   Bookkeeping          │   chips, ink-muted
│  Tripletex                                 │
│                                            │
│  ─────────────────────────────────────     │
│  By M. Ibrekk ⬥ · Accru Bergen             │   0.75rem muted; ⬥ = cert badge
│  340 uses · ● Healthy                       │
└───────────────────────────────────────────┘
```

Every element earns its place: kind (what am I looking at), rating with count (do people actually use it), title, plain-language summary (the single most important line — enforce a 120-char limit and reject the ones that say "leverages AI to optimise"), country + category + system, **author byline**, owner firm, adoption, health.

**The author byline is first-class, not a footnote.** Every asset shows *"By &lt;Author Name&gt;"* with the author's certification badge, on the card and the detail page (architecture §4.5). It credits the person who built the thing — the recognition that keeps 70 firms contributing — and it is distinct from the owning-firm line: authorship is permanent, ownership can be reassigned. A short cert badge (⬥) sits next to the name and links to the person's profile.

The health dot is not decorative. A `● Degraded` card is visibly muted and sinks in ranking. This is how the catalogue avoids becoming a graveyard of dead links, which is the fate of essentially every internal tool directory ever built.

---

## 7. Asset detail

```
┌────────────────────────────────────────────────────────────────┐
│  ← Apps / Bookkeeping                                           │
│                                                                 │
│  ▣ APP        Bank Reconciliation Assistant                     │
│               By Marte Ibrekk ⬥ · Accru Bergen · v2.1 · ● Healthy│
│                                                                 │
│  Matches bank lines to ledger entries and flags what it         │
│  can't explain.                                                 │
│                                                                 │
│  [  Open app  ]   [ ☆ Save ]  [ ⚑ Report an issue ]             │
│   orange, large                                                 │
├──────────────────────────┬──────────────────────────────────────┤
│                          │                                       │
│  What it does            │  ┌─ Data & compliance ────────────┐  │
│  Who it's for            │  │ Client data     Yes            │  │
│  How to use it (3 steps) │  │ Personal data   No             │  │
│  What it can't do        │  │ Model           Claude Sonnet  │  │
│                          │  │ Processed in    EU (Norway)    │  │
│  Screenshots / demo      │  │ Human review    Required       │  │
│                          │  │ Writes to       Nothing        │  │
│  Version history         │  │ Accountable     M. Ibrekk      │  │
│  ├ v2.1 · 12 Jun 2026    │  │                               │  │
│  └ v2.0 · 3 Mar 2026     │  │ Last reviewed   12 Jun 2026   │  │
│                          │  │ Next review due 12 Jun 2027   │  │
│                          │  └───────────────────────────────┘  │
│  Ratings & comments (23) │                                       │
│                          │  ┌─ Impact ──────────────────────┐   │
│  ┌ Did this save you    │  │ 340 uses · 41 people          │   │
│  │ time today?  [ Yes ] │  │ ~18 min saved per use          │   │
│  └──────────────────────┘  │ Used at 7 firms                │   │
│                          │  └───────────────────────────────┘   │
└──────────────────────────┴──────────────────────────────────────┘
```

**"What it can't do"** is a required field. Submitters hate writing it and it is the single highest-value paragraph on the page. It prevents the misuse that generates the compliance incidents.

**The Data & compliance panel is public.** Every user sees it. This is unusual — most platforms bury this in an admin view — and it is the correct choice for an accounting group. It normalises the questions, it makes the reviewers' work visible, and it means an auditor asking "what does this thing do with client data" gets an answer in three seconds rather than three emails.

**"Did this save you time today?"** appears on return visits only, once per asset per week. Yes → a 3-option chip (`~5 min` / `~20 min` / `an hour+`). This populates `value_reports` and drives the fourth stage of the measurement funnel. It must be one tap. Anything longer and the data never arrives. **This single tap is the group's primary AI-adoption reporting instrument** — it is what turns "people are using AI" from an assertion into a number the Head of AI can report per country, firm, asset, and author (§11, architecture §4.5/P6). Its one-tap design is therefore not just UX politeness; it is what makes group-wide adoption reporting possible at all.

**Recertification is surfaced, not hidden.** `Last reviewed` and `Next review due` both show permanently in the Data & compliance panel (architecture §5.5). An asset overdue for its 12-month review carries a quiet amber note; a `● Degraded` health signal muteds the whole page and the Open button warns.

**Launch behaviour by kind:** `app` → new tab. `prompt` → copy button + "Open in Claude" deep link. `skill` → download bundle + install instructions. `agent` → copy config + deploy guide. `training` → open in the training environment.

---

## 8. Submit

Anyone can submit. The gate is the control, not the button. The wizard's job is to make a good submission the path of least resistance.

Seven steps, saved as draft continuously, resumable. Estimated time shown honestly: **12–15 minutes**. Do not claim two.

| # | Step | What it asks | Design note |
|---|------|--------------|-------------|
| 1 | **What are you sharing?** | Kind: app / agent / skill / prompt | Five large cards with plain descriptions. Sets the entire downstream flow. |
| 2 | **The basics** | Title · one-sentence summary (120 char, live counter) · full description · what it can't do | Live preview of the asset card, updating as she types — the strongest quality intervention in the product. **AI-assisted, never AI-decided:** once she pastes a description, the wizard *suggests* a 120-char summary, a category, tags, and a first draft of the hated "what it can't do" paragraph (architecture §7.5 `Summarizer` port, async). Every suggestion is pre-filled text she edits or discards — a wrong-but-editable draft beats a blank field. As she types, a **"Looks similar to…" panel** shows the top-5 nearest existing assets (architecture §5.2 #7) so duplicates are caught before submission, not at review. |
| 3 | **Who it's for** | Category · country of origin · systems · tasks | Country of origin is pre-filled from her firm (architecture §4.3/§4.5) and rarely needs changing — one country, no per-country grading. She confirms category, systems and tasks, which feed ranking and discovery. |
| 4 | **Access** | Production URL · auth method · a live "Check now" button | The check runs the automated probes immediately and shows results inline: `✓ Reachable · ✓ Valid TLS · ✗ Anyone can open this without logging in`. Failing here in front of her, before a reviewer sees it, saves a week. |
| 5 | **Data & compliance** | The 9 questions (architecture §9.3) | Grouped, plain language, with a one-line "why we ask" under each. Question 7 (*what happens when it's wrong?*) is free text and cannot be skipped. A background scan (architecture §9.2b) checks her text and examples for likely PII and client names; findings show inline. A checksum-valid national ID (fødselsnummer, personnummer, CPR, NINo) is the one finding that **blocks** — she must remove it before continuing; everything else is an advisory flag the reviewer will see. |
| 6 | **Prove it & preserve it** | Screenshots or 60s demo · time-saved estimate (min/run × runs/week) · **export upload** | The export field is mandatory and its helper text says exactly why: *"Accru keeps its own copy so this survives any tool we stop using."* If the build tool can't export, she ticks a box that files an IP-risk flag requiring Head of AI sign-off. |
| 7 | **Review & submit** | Full preview · who reviews it · SLA | Names the two reviewers. Named humans, not "the review team." Accountability runs both directions. |

**You are the author, and it says so.** On publication the submitter becomes the permanent author of the asset (architecture §4.5): her name and certification badge appear on the card and detail page as *"By …"*, and it stays hers even if the asset is later reassigned to a new owner. Step 7 states this plainly — building something the group adopts is meant to be visibly credited, and that credit is part of the group's contribution reporting (§11).

**After submit:** a status page, not a dead end. Timeline view — `Submitted → Automated checks ✓ → Value review (Georgie Wilkinson) → Compliance review (pending)`. Email on each transition. Reviewers' comments appear inline and she can reply without leaving.

**Rejection is designed for.** Reason codes, a written comment, and a `Duplicate of →` link where relevant. A rejection screen that says only "Rejected" costs the group a builder.

---

## 9. Review queue

For AI Responsibles, Country AI Leads, Head of AI. A working tool, not a dashboard.

```
┌─────────────────────────────────────────────────────────────┐
│  Review queue                    3 waiting · 1 overdue ⚠    │
│  [ Mine ] [ My country ] [ All ]        Sort: Oldest first  │
├─────────────────────────────────────────────────────────────┤
│  ⚠  VAT Return Drafter          Accru Malmö · 6 days        │
│     Value: ✓ Approved (J. Debessay)  Compliance: pending    │
│                                                              │
│     Payroll Anomaly Agent        Accru Aarhus · 2 days       │
│     Value: pending                Compliance: pending        │
└─────────────────────────────────────────────────────────────┘
```

Opening a submission gives a split view: the submission on the left (exactly as a user would see the published asset), the scorecard on the right. Reviewers grade only their own dimension; the other dimension's status is visible but not editable. **Reviewer eligibility is enforced, not assumed** — a reviewer only sees the grade controls for a submission she is actually permitted to decide (architecture §5.3/§8.2), and she can never be the submitter or asset owner. **PII / client-name findings (architecture §9.2b) render as highlighted spans** directly in the left pane, so the compliance reviewer's eye goes straight to the risky text rather than hunting for it. Where the duplicate check (architecture §5.2 #7) flagged a near-match, a `Duplicate of →` link sits beside the scorecard, one click to compare.

**Decisions are three, not two:** Approve · Request changes · Reject. "Request changes" is the default affordance — visually equal to Approve — because it is the correct action most of the time and reviewers otherwise binary-sort into approve-everything or reject-everything.

Every decision requires a comment. The comment is published on the asset's version history and visible to all users. Reviewers who know their reasoning is public write better reasoning.

**Overdue** submissions (>5 business days) turn amber in the queue, appear in the Country AI Lead's Monday digest, and create a ClickUp task. Escalation is automatic and unembarrassing.

---

## 10. Training environment

The fifth shelf in the Hub, and the one that turns a catalogue into a capability programme. It maps directly to the certification tiers in the AI Operating Model: **Foundation · Builder · AI Responsible**.

### 10.1 Structure

```
Training
├── My path            progress ring, next lesson, certificate
├── Courses            Foundation (6 lessons) · Builder (8) · AI Responsible (5)
├── Labs               hands-on, sandboxed, graded
└── Sandbox            free-play prompting space, no consequences
```

**Lesson format.** Short. 4–8 minutes. Text and a 90-second video, then one interactive exercise. Never a 40-minute recorded webinar; the group has tried that and the completion rate is what it always is.

**Labs are the point.** A lab gives a real, redacted artefact — a messy bank statement, an ambiguous client email — and asks the learner to prompt her way to a correct output inside an embedded sandbox. Graded by rubric, with model-generated feedback and a worked example revealed afterwards. Completion of the Builder labs is what makes someone credible when they submit an app.

**Sandbox.** A persistent, no-stakes chat surface with a red banner: *"Sandbox — never paste client data here."* Its existence is what stops people practising in production.

**Certification is visible and social.** A tier badge appears next to a user's name on every asset they own and every review they write. It appears in the firm's directory. Country AI Leads see per-firm certification coverage in analytics. Make the badge worth having by making it slightly hard to get.

### 10.2 The link back to the catalogue

Assets can require a tier (`certification_required`). A Builder-tier asset shows an accountant without the tier a soft gate: *"This one assumes you've done Builder. You can still open it — or spend 40 minutes first."* Soft, not hard. Blocking access breeds workarounds; a nudge that names the gap converts.

---

## 11. Admin

Five surfaces, each with one job.

- **Taxonomy.** Approve proposed categories and systems, merge duplicates, edit localised names. The queue of proposed tags is the group's clearest early signal of what firms are actually building.
- **Assets.** Force-deprecate, revoke, reassign orphans, feature on Home. Every action logged and attributed.
- **People.** Role grants, firm mappings, the `#EXT#` fallback table, certification overrides.
- **Analytics.** The four-stage funnel per country, per firm, per asset, **per author**: *discovered → launched → adopted (3+ uses by one person) → value realised (a reported time saving)*. The value-realised stage is fed by the one-tap "Did this save you time?" report (§7) and is the group's headline AI-adoption number. Plus: submissions by firm, review latency by reviewer, catalogue health, certification coverage, and a **Contributions view** — who has authored what, per person / firm / country (architecture §4.5). Contributions are the recognition counterpart to usage: it should be easy to see, and celebrate, the people building the most-adopted assets, not only count the clicks. A light leaderboard (top contributors, most-adopted authors this quarter) belongs here.

**Data-viz palette** (derived from the brand, not a generic chart theme):

- **Categorical** (distinct series), in order: `#722322 · #dc6834 · #3d6b4a · #6f6659 · #a04a3a · #e89468`. Bright `#dc6834` is allowed here — chart fills are decorative, not text.
- **Sequential** (one measure, low→high): a single ramp of orange tints from `#f0e0d4` to `#8c3d16`.
- **Funnel** (the four stages discovered→launched→adopted→value): deep-red→orange ramp `#722322 · #a04a3a · #dc6834 · #e89468`, left to right.
- **Country colours** are fixed and consistent across every chart (NO/SE/DK/UK each keep one hue) so the eye learns them.
- Never encode by colour alone — pair with direct labels or patterns (colour-blind safety). All axis numbers and data labels use tabular figures.
- **Health.** URL probe status across the catalogue. The one page a Platform Admin should be able to leave open on a second monitor.

The analytics page should be designed for a specific recurring moment: the Head of AI, on a Friday, assembling an EOW status update. It should be possible to answer *"what happened this week and where should we intervene"* in ninety seconds, with copyable numbers.

---

## 12. Cross-cutting behaviours

**Empty and cold states.** The catalogue launches near-empty. Every list has a designed empty state that names the gap and offers the submission path. Seed with 20 genuinely useful assets before a single user logs in — a hub with three items teaches everyone it isn't worth returning to.

**Notifications.** Email for state transitions only (submitted, decided, degraded, orphaned). Weekly digest per role. In-app bell for everything else. No notification the user did not implicitly ask for by owning, submitting, or reviewing something.

**Language.** UI English at v1; category names, asset titles, and descriptions are per-language and shown in the user's own where available, with the original beneath. A Norwegian asset with only Norwegian description shows a `Norsk` chip and an on-demand translate button — do not auto-translate, and never silently.

**Mobile.** Read-only, done properly. Browse, search, asset detail, launch, and the *"did this save you time?"* tap. No submission wizard, no review queue on a phone — those are desk work and pretending otherwise produces bad submissions and lazy reviews.

**Accessibility.** WCAG 2.2 AA throughout, and it is a legal requirement in all four countries. The load-bearing rules: functional orange is `--action #b8501c` (bright `#dc6834` only ≥24px or decorative, §2.1); the focus ring is the two-tone `:focus-visible` treatment (§2.3), never a single thin orange line; body copy is always `--ink`; colour is never the only signal (health, ratings, charts all carry a label or icon); hit targets are ≥44×44px for a low-confidence, sometimes-touch audience; the command palette and the submission wizard are fully keyboard-operable (arrow/enter/esc, logical tab order, focus trapped in modals and returned on close).

**Trust is the product — small craft details that signal "considered":**

- **One date format everywhere:** `12 Jun 2026`. No `06/12` — it means two different days in the UK and Norway, and ambiguity is the opposite of trustworthy in an accounting tool. Render via `Intl.DateTimeFormat`.
- **One number format:** `Intl.NumberFormat` with the user's locale for grouping, tabular figures always (§2.2).
- **Print styles for the asset-detail page**, so the public Data & compliance panel (§7) prints to a clean one-pager an auditor can file — no nav, no chrome, rules and values intact.
- `:focus-visible`, not `:focus`, so the ring shows for keyboard users without haloing every mouse click.

---

## 13. What to build first

If only one thing ships: **the scope bar + Browse + Asset detail + the submission wizard, with fifteen real assets in it.**

The scope bar is not a Phase 2 polish item. It is the shell, it defines the URL contract, and retrofitting global scope into an app that started with local filter state is a rewrite, not a refactor. Build it in Phase 0.

The gate, the ranking, and the training environment are all valuable. None of them matters if an accountant in Manchester cannot open the Hub on a Tuesday, find one thing that saves her twenty minutes, and use it. Build that Tuesday, then build everything around it.

---

## 14. Open UX questions

1. **Does "Built in Norway — worth stealing" land, or does it read as condescending in the UK?** Test the copy with three people per country before launch. The idea is right; the wording may not be.
2. **Is the 12–15 minute submission wizard too long?** It is deliberately long — a low bar produces a catalogue nobody trusts. Watch the drop-off between steps 4 and 6. If step 6 (export upload) is where people quit, the fix is tooling, not shortening.
3. **Ratings: stars or "I used this and it worked"?** Stars invite comparison between an app and a prompt, which is meaningless. Consider a single boolean plus the value report. *Recommendation: ship stars, instrument them, be ready to remove.*
4. **Should the sandbox be built, or should it just be a link to Claude Enterprise?** Linking is cheaper and probably right for v1. Building it only becomes worthwhile once labs need automated grading against a controlled model.
5. **Who writes the monthly editorial rows on Home?** This is a real, recurring, uncommissioned job. It should belong to a named person before launch, not after.
6. **Default country selection — resolved.** The country control is now a simple single-select origin filter (`All countries · Made in NO/SE/DK/UK`), and the default is **All countries** for everyone — it maximises cross-country discovery while the catalogue is thin. Open sub-question: once each country has a healthy native catalogue, should returning users default to their own country instead of All? *Recommendation: keep All until a country crosses ~40 assets, then consider a per-user "open on my country" preference — but do not reintroduce the graded three-state model.*
7. **Do the top-level categories survive four jurisdictions?** "Auditing", "Payroll", "Accounting", "VAT / MVA" translate cleanly. "Year-end" does not map one-to-one onto *årsoppgjør*. Run the list past one practitioner per country before it is frozen — this vocabulary is in the URL and in every screen, and changing it later is expensive.
8. **How prominent should author recognition be?** Byline on every card and detail page is decided (architecture §4.5). Open: does a quarterly "top contributors" leaderboard (§11) motivate building or breed gaming? *Recommendation: ship the byline and a quiet contributions view; add a visible leaderboard only if contribution volume stalls.*
9. **AI authoring suggestions — how visible, how editable?** The wizard suggests summary/category/"can't do" (§8). Test that suggestions read as scaffolding she improves, not as a finished answer she rubber-stamps — the quality bar depends on her editing them. Translate-on-demand (§12) is display-only and its result is cached per asset+language, so it is paid for once; confirm the "never auto-translate silently" copy tests well.

---

## 15. Changelog

### v0.3 — 9 July 2026 (design-system elevation, for developer handoff)

Turns the design *language* into a buildable, high-end, on-brand design *system*, and fixes two WCAG 2.2 AA failures baked into v0.2's tokens. No product decisions changed; this is craft and rigor.

- **Accessibility P0 (§2.1, §2.3, §12).** Added `--action #b8501c` (+hover/press) for all functional orange; bright `#dc6834` restricted to ≥24px/decorative/chart use. Replaced the failing single orange focus ring with a two-tone `:focus-visible` ring. Resolved the "orange links vs <18px ban" contradiction (links use `--action` + underline).
- **Systemic rigor.** Added the 4px spacing scale + 12-col/1280px grid + card-grid rules (new §2.5); a full type-role map with serif-floor (Gelasio ≥18px only) and a tabular-figures mandate (§2.2); three elevation tiers `--e0`–`--e3` + scrim (§2.3); a named motion system with `prefers-reduced-motion` and the static (non-shimmer) loading placeholder (§2.3).
- **Iconography (new §2.6).** Phosphor Icons + flag-icons, replacing all emoji.
- **Components (§2.4).** Added full state/size/detail specs for all 12 owned components.
- **Analytics (§11).** Added a brand-derived data-viz palette (categorical/sequential/funnel/country).
- **Trust/craft (§12).** One date format (`12 Jun 2026`), `Intl` formatting, asset-detail print styles, `:focus-visible`, 44px hit targets.

### v0.2 — 9 July 2026 (UX pass, aligned to architecture v0.2)

Layout, tone, and flows from v0.1 are unchanged. This revision adds surfaces that the architecture review introduced and that the group requested.

- **Country control simplified (§4.1, §5, §6).** The three-state country control (Built for / Works in / All) is replaced by a single-select origin filter with five options — `All countries · Made in the UK · Made in Norway · Made in Sweden · Made in Denmark` — defaulting to All countries. Assets are sorted purely by the country that made them; the "worth stealing" cross-country row and origin-tagged cards carry the compounding effect.
- **Authorship (§6.1, §7, §8).** Every asset card and detail page now shows a first-class *"By &lt;Author Name&gt;"* byline with certification badge; the submit wizard credits the submitter as permanent author on publish.
- **Submit wizard (§8).** Step 2 gains AI-assisted (never AI-decided) suggestions for summary/category/tags/"can't do" and a live "Looks similar to…" duplicate panel; step 5 surfaces PII / client-name findings inline, with checksum-valid national IDs blocking.
- **Review queue (§9).** Reviewer eligibility enforced; PII findings shown as highlighted spans; `Duplicate of →` link from the dedup check.
- **Search (§4).** Cross-lingual meaning-based matching, typo tolerance, and silent lexical fallback described.
- **Asset detail (§7).** `Next review due` added; the one-tap value report reframed as the group's primary adoption-reporting instrument.
- **Admin analytics (§11).** Added a Contributions view and per-author funnel; optional top-contributors leaderboard.
- **Open questions (§14).** Added author-recognition prominence and AI-suggestion visibility.

### v0.1 — 9 July 2026

Initial draft for review.
