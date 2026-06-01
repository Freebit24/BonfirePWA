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
```

The Google Maps key is only required for the embedded map preview on event detail pages.

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
