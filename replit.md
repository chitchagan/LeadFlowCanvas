# Lead Management System

## Overview
A role-based lead management web application for Admin and Support Assistant users. The system enables efficient management of marketing campaigns and leads, featuring role-based access control, lead assignment, and call tracking. It is a production-ready MVP, implemented as a Progressive Web App (PWA) with offline capabilities.

## User Preferences
I want to prioritize a clear and concise explanation style. I appreciate detailed explanations of complex topics but prefer brevity for straightforward concepts. I favor an iterative development approach where I can provide feedback at each stage. Please ask before making any major architectural changes or significant modifications to existing features. I prefer to use dark mode for development.

## System Architecture

### UI/UX Decisions
- **Inspiration**: Linear/Notion/HubSpot productivity apps.
- **Mode**: Dark mode primary.
- **Fonts**: Inter (UI), JetBrains Mono (metrics).
- **Color Scheme**: Defined in `design_guidelines.md`, with `#2B8CFF` as the primary blue.
- **Components**: Consistent spacing, elevation on hover, semantic tokens using Shadcn UI with Radix primitives.
- **PWA**: Features an install prompt, offline caching, network-first strategy for APIs, and cache-first for static assets. App runs in standalone mode with generated icons for various devices.

### Technical Implementations
- **Frontend**: React with TypeScript, Wouter for routing, TanStack Query for server state management, Tailwind CSS for styling.
- **Backend**: Express.js with TypeScript.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Username/password with scrypt hashing, Express sessions stored in PostgreSQL. Default credentials are `admin/admin123` and `support/support123`.
- **Storage**: Replit Object Storage for audio recordings.
- **Contact Integration**: Click-to-call and WhatsApp integration.
- **Voice Recording System**: Records audio via MediaRecorder API, stores in Replit Object Storage, with metadata in PostgreSQL.

### Feature Specifications
- **User Roles**:
    - **Admin**: Create/manage campaigns, add leads (manual/CSV), view/edit/delete leads (with assigned user info displayed), manage users, access dashboards, view all leads, create/edit/delete custom lead statuses.
    - **Support Assistant**: Dynamic search (by name/number), advanced filtering/sorting (campaign, location, role, status, time spent), lead assignment (self-assign, unassign, reassign), lead status updates (including custom statuses), view assigned leads, communication tools (call, WhatsApp, voice memos).
- **Lead Management**: New fields for `role`, `timeSpentOnWorkshop`, `location`. Admin campaign leads management with CRUD operations.
- **CSV Import**: Downloadable template, validation, and preview for bulk lead import.
- **Dynamic Status System**: Admins can create unlimited custom statuses with 8 color options. Default statuses (Not Picked, Call Back Later, Completed, Not Interested, Interested in Free Only, Interested in Recorded Course, In Progress) cannot be deleted. Custom statuses propagate instantly across all UI. New leads automatically get "Not Picked" status by default.
- **Lead Status Flow**: `Not Picked` (default) → `In Progress` → `Call Back Later` / `Not Interested` / `Interested in Free Only` / `Interested in Recorded Course` / `Completed` (or custom statuses).
- **API Endpoints**: Structured with public, authenticated (all roles), admin-only (including status management), and support assistant-specific routes.
- **PWA Features**: Manifest, service worker for offline support, app shortcuts for Dashboard and Support Dashboard.

### System Design Choices
- **Folder Structure**: `client/src/` for frontend, `server/` for backend, `shared/schema.ts` for database.
- **Database Schema**: `users`, `campaigns`, `leads`, `recordings`, `sessions`, `statuses` tables.
- **Authentication Flow**: Traditional username/password, role-based routing and API protection via middleware.
- **Environment Variables**: `DATABASE_URL`, `SESSION_SECRET`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR`.
- **Status Management**: Statuses stored in database with `isDefault` flag. Admin endpoints at `/api/admin/statuses` (CRUD), public endpoint at `/api/statuses` (read-only). Cache invalidation ensures instant propagation.

## External Dependencies
- **PostgreSQL**: Primary database for all application data.
- **Drizzle ORM**: Used for database interactions.
- **Replit Object Storage**: For storing audio recordings of calls.
- **Wouter**: Client-side routing library.
- **TanStack Query**: For managing server state in the frontend.
- **Shadcn UI / Radix**: UI component library.
- **Lucide React**: Icon library.

## Recent Changes
- **Support Assistant Status Filtering** (Latest): Support assistants can now filter leads by status in addition to existing filters (campaign, location, role). All 7 default statuses plus custom statuses appear in the status filter dropdown.
- **Status System Update**: Updated all default statuses to use proper capitalization (Not Picked, Call Back Later, Completed, Not Interested, In Progress) plus added two new default statuses (Interested in Free Only, Interested in Recorded Course) to match production database. New leads now automatically get "Not Picked" status by default. Fixed critical bug where default statuses weren't appearing in dropdowns. Enhanced status dropdown with proper loading states and fallback handling.
- **Dynamic Status Management**: Admins can now create unlimited custom lead statuses beyond the 5 defaults, with configurable colors (gray, blue, green, yellow, red, purple, pink, orange). Custom statuses automatically appear in all dropdowns across admin and support dashboards instantly without page reload.
- **Mobile Status Display**: Status now shows as badge + separate "Change status..." dropdown for better UX on mobile devices
- **Lead Details Dialog**: Added info icon (ℹ️) button to view comprehensive lead details including all fields, assignment info, callbacks, and timeline
- **Assigned User Display**: Admin can now see who each lead is assigned to (avatar + name on desktop, text on mobile)
- **Security Fix**: API responses sanitized to exclude password hashes (only safe user fields exposed)
- **Comment Counts**: Added display of total number of notes for each lead in brackets next to "View Notes" button
- **Optimized Backend**: Single SQL query for all comment counts using GROUP BY (scalable)
- **Real-time Updates**: Comment counts update immediately when adding/removing comments
- **Mobile Responsive**: Fixed horizontal overflow issues in admin dashboard
- **IST Timezone**: All schedule callback times now correctly display in Indian Standard Time