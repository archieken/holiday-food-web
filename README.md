# Holiday Food Web

Nuxt 3 frontend for **Tavira Recipe Maker** — plan a Portugal holiday's meals day by day, browse and import recipes, and share a combined shopping list.

Talks to the [holiday-food-api](../holiday-food-api) Spring Boot backend through this app's own `/api/*` server routes (a thin proxy layer, so the browser never calls the backend or holds its secrets directly).

## Tech stack

- Nuxt 3 / Vue 3
- Google Identity Services — "Sign in with Google" button, admin-only actions

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

Without `NUXT_PUBLIC_GOOGLE_CLIENT_ID`, the sign-in button reports that sign-in isn't configured; everything else still works.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Production build |
| `npm run generate` | Static site generation |
| `npm run preview` | Preview a production build locally |

## Pages

- `/` — trip planner: pick days/servings per meal, generate an itinerary, manage extra recipes, open the shopping list
- `/recipes` — browse, filter and like the recipe catalogue; print a recipe PDF; admins can delete
- `/recipes/[id]` — recipe detail, comments, printable PDF
- `/import-recipe` — AI-assisted recipe import from a name or URL, with a review step before saving
- `/shopping-list/[id]` — shareable, pollable checklist (no sign-in required)

## Project structure

```
pages/            Route components (see above)
components/       Shared UI (GoogleSignInButton)
composables/      useAuth (sign-in state), useItineraryPlanner (trip-planning state)
server/api/       Server routes that proxy to holiday-food-api, attaching auth headers
shared/types/     Types shared between client and server routes
app.vue           Top-level layout: nav, sign-in state, page outlet
```
