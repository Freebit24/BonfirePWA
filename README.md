# Bonfire 🔥

**AI-Powered Community & Event Discovery Platform**

Version: 0.1.0 — 2026-06-03

Bonfire is a location-first platform that helps people discover, create, and join real-world events through communities. It replaces fragmented event discovery across messaging apps, social media, and offline channels with a unified experience designed for real-world coordination.

<p align="center">
  <img src="./screenshots/hero-desktop-discover.png" alt="Bonfire hero screenshot" style="width:100%;max-width:1200px;height:auto;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,0.12);" />
</p>

<p align="center">
  <a href="https://bonfire-web.netlify.app/">Live Demo</a> ·
  <a href="https://drive.google.com/file/d/132wKiDGCnPW9IJ_7oO6qSFyvqcjJatBh/view?usp=sharing">Full Product Walkthrough</a>
</p>

---

## Overview

Traditional event discovery is fragmented.

Events are often buried inside WhatsApp groups, Instagram stories, Discord servers, posters, and word-of-mouth networks. As a result, people miss opportunities to connect with nearby communities and attend events they care about.

Bonfire solves this by providing:

- 📍 Location-based event discovery
- 🤖 AI-assisted event creation
- 👥 Community-driven engagement
- ⚡ Real-time event participation
- 📱 Mobile-first Progressive Web App experience

The platform is designed around one core idea:

> Location should matter more than follower count.

---

## Screenshots

### AI Event Creation

<p align="center">
  <a href="./screenshots/ai-event-creation.gif" target="_blank" rel="noopener">
    <img src="./screenshots/ai-event-creation.gif" alt="AI event creation demo" width="280" />
  </a>
</p>

*Generate complete event details from natural language prompts in a few seconds. (Click to open full animation)*

### Visual Gallery

<table>
  <tr>
    <td align="center">
      <a href="./screenshots/community-discovery.jpeg" target="_blank" rel="noopener">
        <img src="./screenshots/community-discovery.jpeg" alt="Community Discovery" width="240" />
      </a>
      <br />Community Discovery
    </td>
    <td align="center">
      <a href="./screenshots/community-page.jpeg" target="_blank" rel="noopener">
        <img src="./screenshots/community-page.jpeg" alt="Community Page" width="240" />
      </a>
      <br />Community Page
    </td>
    <td align="center">
      <a href="./screenshots/event-details.jpeg" target="_blank" rel="noopener">
        <img src="./screenshots/event-details.jpeg" alt="Event Details" width="240" />
      </a>
      <br />Event Details
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="./screenshots/mobile-discover-list.jpeg" target="_blank" rel="noopener">
        <img src="./screenshots/mobile-discover-list.jpeg" alt="Mobile List View" width="240" />
      </a>
      <br />Mobile - List View
    </td>
    <td align="center">
      <a href="./screenshots/mobile-discover-map.jpeg" target="_blank" rel="noopener">
        <img src="./screenshots/mobile-discover-map.jpeg" alt="Mobile Map View" width="240" />
      </a>
      <br />Mobile - Map View
    </td>
    <td align="center">
      <em>Open the full screenshots above for the complete experience.</em>
    </td>
  </tr>
</table>

### Communities

Browse and discover communities (see the Visual Gallery above for screenshots).

- **Community Discovery:** Browse and discover communities nearby.
- **Community Page:** Engage with members and host events within community pages.

### Event Experience

Event details, attendance, location, and participation are presented in a single clear view — see the Visual Gallery for an expanded screenshot.

### Mobile Experience

Bonfire supports multiple discovery modes optimized for mobile users — see the Visual Gallery for mobile screenshots.

- **List View:** Compact event list optimized for quick browsing on small screens.
- **Map View:** Interactive map with clustered event markers for spatial discovery.

---

## Key Features

### AI-Powered Event Creation

Create events using natural language prompts. Users can describe an event in plain English, and Bonfire automatically generates event details to reduce setup friction (see `components/organizer/ai-event-generator` and the `/api/ai` endpoint).

---

### Location-Based Discovery

Discover events happening nearby through geospatial search.

- Radius-based querying
- Nearby event recommendations
- Location-aware event browsing

---

### Community System

Communities serve as persistent spaces where members can organize recurring events.

Features include:

- Community creation
- Member management
- Community-based event hosting
- Long-term engagement loops

---

### Event Management

Users can:

- Create events
- Join events
- Track attendance
- Manage event details
- View event information in real time

---

### Real-Time Updates

Bonfire supports:

- Live attendee counts
- Event updates
- Real-time synchronization across users

---

### Progressive Web App (PWA)

Mobile-first experience with:

- Installable application
- Fast loading
- Responsive design
- Native-like user experience

---

## Product Philosophy

Bonfire is built around a few simple principles:

### Location > Followers

Events should be discovered because they are relevant, not because users follow the organizer.

### Intent > Passive Scrolling

The platform prioritizes meaningful participation over endless content consumption.

### Communities Drive Retention

Events are temporary. Communities create long-term engagement.

### Real-World Outcomes Matter

Success is measured by people showing up and connecting in real life.

---

## Architecture

### Core Entities

```
User
 ├── Creates Events
 ├── Joins Communities
 └── Attends Events

Community
 ├── Hosts Events
 └── Manages Members

Event
 ├── Has Attendees
 └── Belongs to Community (optional)
```

---

## Tech Stack

### Frontend

- Next.js (App Router)
- React 18
- TypeScript
- Tailwind CSS

### Backend

- Supabase
- PostgreSQL
- Realtime Subscriptions

### Infrastructure

- Progressive Web App (PWA)
- Geospatial Search (Leaflet + clustering)
- Authentication & Authorization

### AI

- Azure OpenAI integration for AI-powered event generation workflows

---

## Environment Variables

Copy the values below into `.env.local` (use `.env.example` as a template). Keep server-side keys secret and never expose them to the browser.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_KEY=
AZURE_OPENAI_DEPLOYMENT_ID=
```

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase project URL and anon key used for client auth and requests.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Optional — used for embedded Google Maps preview on event detail pages.
- `SUPABASE_SERVICE_ROLE_KEY`: Required for certain server-side operations and migrations. Keep secret and never expose to the client.
- Azure OpenAI keys (`AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_KEY`, `AZURE_OPENAI_DEPLOYMENT_ID`): Used by the AI event generation API. These are server-side credentials — do not expose in the browser.

---

## Installation

1. Clone the repository and install dependencies:

```bash
git clone https://github.com/yourusername/bonfire.git
cd bonfire
npm install
```

2. Create `.env.local` from `.env.example` and fill in the values.

3. Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser. The app requires a Supabase project for auth/data; see `lib/supabase.ts` for the client setup.

---

## Database Design

Browse and discover communities. See the Visual Gallery above for screenshots.

```
Users
Communities
Community Memberships
Events
Event Attendees
```

Relationships:

```
User
 ├── joins Community
 ├── creates Event
 └── attends Event

Community
 └── hosts Events
```

---

## Scalability Considerations

- Geospatial indexing
- Efficient radius-based queries
- Pagination support
- Real-time subscriptions
- Community-centric architecture
- Extensible recommendation system

---

## Future Roadmap

- Personalized event recommendations
- Interest-based discovery
- Community feeds
- Event chat
- Trust & verification systems
- Community analytics
- Advanced moderation tools

---

## Changelog

- 0.1.0 (2026-06-03)
  - Initial project scaffold and core features: map discovery, event pages, auth, and organizer flows.

- Unreleased / 2026-06-02
  - AI event creation feature: natural-language event generation and server-side API integration.
  - Added calendar page and map side menu for improved discovery.
  - Organizer UI: profile modal, private-event controls, invite flow fixes, and attendee count bug fixes.
  - Landing page merged with the app, added legal pages, and Google site verification meta tag.
  - PWA manifest and icon updates; improved mobile responsiveness and multiple UI fixes.
  - `.env.example` updated with Azure OpenAI and Supabase service role vars.

---

## Why Bonfire?

Most platforms optimize for screen time. Bonfire optimizes for real-world interactions. The goal is simple:

**Help people discover communities, attend events, and build meaningful connections offline.**

---

## Author

**Abhay Pratap Choudhary**

IIT Roorkee

Building products at the intersection of AI, communities, and real-world experiences.
