# Holiday Food Web

Nuxt 3 frontend for **Tavira Recipe Maker** — plan a Portugal holiday's meals day by day, browse and import recipes, and share a combined shopping list.

Talks to the [holiday-food-api](../holiday-food-api) Spring Boot backend through this app's own `/api/*` server routes (a thin proxy layer, so the browser never calls the backend or holds its secrets directly).

Live at **https://holiday-food-web.vercel.app** (auto-deploys from `main` via Vercel).

## Tech stack

- Nuxt 3 / Vue 3
- Sign-in via Google Identity Services ("Sign in with Google") **or** a regular email/password account (no OAuth required) — both produce the same session shape client-side
- Web Speech API for on-device Portuguese pronunciation of ingredient names (no backend involved)

## Requirements

- **Node 22** — this repo has an `.nvmrc` pinning it. Node 20.x lacks `require(esm)`, which breaks `nuxt dev`/`nuxt build` (`oxc-parser`/`oxc-walker` fail to resolve a parser implementation). If you have nvm's auto-switch hook set up in your shell, `cd`-ing into this directory switches automatically; otherwise run `nvm use` before anything else.

## Setup

1. Create a `.env` file in the project root:
   ```
   NUXT_API_BASE=http://localhost:8080
   NUXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Start the dev server:
   ```
   npm run dev
   ```
   The app runs on `http://localhost:3000` by default.

### Environment variables

| Variable | Scope | Purpose |
|---|---|---|
| `NUXT_API_BASE` | Server-only | Base URL of the `holiday-food-api` backend the server routes proxy to. Defaults to `http://localhost:8080` if unset. |
| `NUXT_PUBLIC_GOOGLE_CLIENT_ID` | Public (sent to browser) | Google OAuth client id for the sign-in button. Must match the backend's `GOOGLE_CLIENT_ID`. |

Without `NUXT_PUBLIC_GOOGLE_CLIENT_ID`, the Google sign-in button reports that sign-in isn't configured; email/password accounts and everything else still work.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Production build |
| `npm run generate` | Static site generation |
| `npm run preview` | Preview a production build locally |

## Pages

- `/` — trip planner: pick number of days and a trip-wide servings count (2/4/6 combo box), then override servings per individual meal; generate an itinerary, manage extra recipes; "Open shopping list" sits next to the trip title once an itinerary exists
- `/recipes` — browse, filter and like the recipe catalogue; print a recipe PDF; admins can delete; falls back to a placeholder image when a recipe has none
- `/recipes/[id]` — recipe detail, comments, printable PDF, placeholder image fallback; "Edit recipe" link shown to the recipe's author or an admin
- `/recipes/[id]/edit` — edit an existing recipe's fields (author or admin only)
- `/import-recipe` — AI-assisted recipe import from a name or URL, with a review step before saving
- `/shopping-list/[id]` — shareable, pollable checklist (no sign-in required); each ingredient has a 🔊 button that speaks its Portuguese name aloud

## Theming

All colors are driven by CSS custom properties defined once in `app.vue`'s `:root` (`--portugal-red`, `--portugal-green`, `--azulejo-blue`, `--azulejo-bg`, `--ink`, `--muted`, `--border`, `--surface`, `--bg`). The palette is anchored around the azulejo tile blue rather than the flag's red/green: a warm terracotta for primary actions/accents and a teal-leaning green for secondary ones, chosen so they sit comfortably next to the blue tile banner instead of clashing with it. When touching UI colors, change the variable, not individual component styles.

## Project structure

```
pages/            Route components (see above)
components/       Shared UI: GoogleSignInButton, EmailAuthForm (email/password sign-in & registration),
                  RecipeFieldsForm (shared recipe fields, used by import + edit)
composables/      useAuth (sign-in state, Google + email/password), useItineraryPlanner (trip-planning state)
server/api/       Server routes that proxy to holiday-food-api, attaching auth headers
                  (includes auth/register, auth/login, recipes/[id] PUT)
shared/types/     Types shared between client and server routes
public/images/    Static assets, incl. recipe-placeholder.svg
app.vue           Top-level layout: nav, sign-in state, theme variables, page outlet
```

## Deployment

- Hosted on **Vercel**, auto-deploying on every push to `main`.
- Repo is public on GitHub (`archieken/holiday-food-web`) — required on Vercel's Hobby plan when the pushing git identity doesn't match the connected Vercel account's GitHub identity; a private repo in that situation silently blocks git-triggered deploys ("commit author did not have contributing access"). Alternatives if this ever needs revisiting: upgrade to Vercel Pro, align commit authorship with the connected account, or deploy via a Vercel Deploy Hook instead of git integration.
- Set `NUXT_API_BASE` (pointed at the deployed backend) and `NUXT_PUBLIC_GOOGLE_CLIENT_ID` as Vercel project environment variables.
