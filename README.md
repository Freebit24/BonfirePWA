# Bonfire PWA

Bonfire is a location-first social platform for discovering, creating, and joining real-world events. This repository contains the Next.js PWA that powers the discovery map, event details, authentication, organizer flows, and supporting UI.

## Product Direction

Bonfire is built around a few core principles:

- Location over followers
- Intent over passive scrolling
- Open by default
- Minimal friction to join or host
- Real-world outcomes over in-app engagement

The app centers on three connected concepts:

- Users join communities and attend events.
- Communities provide recurring retention and optional ownership.
- Events are time-bound, geo-aware, and easy to browse on a map.

## Tech Stack

- Next.js App Router
- React 18
- TypeScript
- Tailwind CSS
- Zustand for client state
- Supabase for auth and data access
- Leaflet and clustering for map-based discovery
- Netlify deployment support

## Getting Started

1. Install dependencies.

   ```bash
   npm install
   ```

2. Create a local environment file from the template below.

3. Run the development server.

   ```bash
   npm run dev
   ```

4. Open the app in your browser and sign in with Supabase-authenticated credentials.

## Environment Variables

Copy the values below into `.env.local` before running the app:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_KEY=
AZURE_OPENAI_DEPLOYMENT_ID=
```

- **`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Supabase project URL and anon key used for client auth and requests.
- **`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`**: Optional — used for embedded Google Maps preview on event detail pages.
- **`SUPABASE_SERVICE_ROLE_KEY`**: Required for certain server-side operations and migrations. Keep secret and never expose to the client.
- **Azure OpenAI keys** (`AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_KEY`, `AZURE_OPENAI_DEPLOYMENT_ID`): Used by the AI event generation API. These are server-side credentials — do not expose in the browser.

## Available Scripts

- `npm run dev` - start the development server
- `npm run build` - create a production build
- `npm run start` - run the production server
- `npm run lint` - run Next.js linting

## Project Structure

- `app/` - routes, layouts, and page-level UI
- `components/` - reusable UI, map, and layout components
- `store/` - Zustand state for auth and events
- `utils/` - Supabase client and shared helpers
- `types/` - shared TypeScript types
- `public/` - static assets, including Leaflet and Lottie files

## Domain Model

The product context for this repo is based on:

- User
- Community
- Event
- CommunityMembership
- EventAttendance

That model supports nearby discovery, recurring community participation, and event attendance workflows.

## Notes

- Supabase auth is initialized on app load.
- The home experience is map-first and location-aware.
- Event pages include map-centric details and check-in flows.

## Key Features (recent)

- AI-powered event generator: create event drafts using natural language prompts via the `/api/ai` endpoint and the `components/organizer/ai-event-generator` UI.
- Organizer improvements: organizer profile modal, private event controls and invite flow enhancements for private events.
- Calendar view and map side menu: new calendar page and a contextual map side menu for improved discovery.
- PWA and manifest updates: site.webmanifest added and PWA metadata wired into the app layout for offline and installable behavior.
- Landing and legal pages: merged marketing landing into the main app with footer links and legal pages (privacy, terms).
- Mobile & UI improvements: responsive fixes, updated icons, social sharing icons, and event details mobile layout fixes.

## Changelog

- 0.1.0 (Initial)
  - Initial project scaffold and core features: map discovery, event pages, auth, and organizer flows.

- Unreleased / 2026-06-02
  - AI event creation feature: natural-language event generation and server-side API integration.
  - Added calendar page and map side menu for improved discovery.
  - Organizer UI: profile modal, private-event controls, invite flow fixes, and attendee count bug fixes.
  - Landing page merged with the app, added legal pages, and Google site verification meta tag.
  - PWA manifest and icon updates; improved mobile responsiveness and multiple UI fixes.
  - `.env.example` updated with Azure OpenAI and Supabase service role vars.

## Changelog

- 0.1.0 (2026-06-03)
  - Initial project scaffold and core features: map discovery, event pages, auth, and organizer flows.
