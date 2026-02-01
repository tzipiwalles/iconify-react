# Asset-Bridge - Architecture Documentation

**Version:** 1.0  
**Last Updated:** February 2026

---

## 1. System Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  Landing    │  │   Create    │  │  My Assets  │  │   Admin     │    │
│  │   Page      │  │    Page     │  │    Page     │  │  Dashboard  │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS APP ROUTER                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                        API Routes (/api)                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │   │
│  │  │ /process │  │ /assets  │  │  /admin  │  │/feedback │        │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Server Components & Actions                    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
            │  Supabase   │  │  Supabase   │  │  remove.bg  │
            │  Database   │  │  Storage    │  │    API      │
            │  (Postgres) │  │   (CDN)     │  │  (External) │
            └─────────────┘  └─────────────┘  └─────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend** | Next.js | 14.2.x | React framework with App Router |
| **UI Components** | shadcn/ui | Latest | Radix UI primitives + Tailwind |
| **Styling** | Tailwind CSS | 3.4.x | Utility-first CSS |
| **Language** | TypeScript | 5.x | Type safety |
| **Auth** | Supabase Auth | 2.91.x | OAuth providers |
| **Database** | Supabase (PostgreSQL) | - | Relational data |
| **Storage** | Supabase Storage | - | CDN-backed file storage |
| **Image Processing** | Sharp | 0.34.x | Resize, format conversion |
| **Vectorization** | Potrace | 2.1.x | Bitmap to SVG |
| **SVG Optimization** | SVGO | 4.x | Minification, cleanup |
| **Hosting** | Vercel | - | Serverless deployment |
| **Analytics** | Vercel Analytics | 1.6.x | Performance metrics |

---

## 2. Directory Structure

```
Asset-Bridge/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API Routes
│   │   │   ├── process/          # Image processing endpoint
│   │   │   ├── assets/           # Asset CRUD operations
│   │   │   ├── admin/            # Admin-only endpoints
│   │   │   ├── feedback/         # User feedback
│   │   │   ├── stats/            # Public statistics
│   │   │   ├── tools/            # Tool compatibility voting
│   │   │   ├── track/            # Event tracking
│   │   │   └── user/             # User profile & API keys
│   │   ├── auth/                 # Auth callback routes
│   │   ├── admin/                # Admin dashboard page
│   │   ├── create/               # Asset creation page
│   │   ├── debug/                # Debug/testing page
│   │   ├── my-assets/            # User's asset library
│   │   ├── profile/              # User profile page
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Landing page
│   │   └── globals.css           # Global styles
│   │
│   ├── components/               # React components
│   │   ├── ui/                   # shadcn/ui primitives
│   │   ├── auth-modal.tsx        # Authentication modal
│   │   ├── color-editor.tsx      # Brand color editing
│   │   ├── feedback-modal.tsx    # Feedback submission
│   │   ├── results-panel.tsx     # Conversion results display
│   │   ├── settings-panel.tsx    # Conversion settings
│   │   ├── share-modal.tsx       # Share & embed options
│   │   ├── site-header.tsx       # Navigation header
│   │   ├── tool-compatibility.tsx # AI tool compatibility
│   │   ├── upload-zone.tsx       # Drag & drop upload
│   │   └── user-menu.tsx         # User dropdown menu
│   │
│   ├── contexts/                 # React contexts
│   │   └── auth-context.tsx      # Authentication state
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── use-conversion-count.ts
│   │   ├── use-mobile.jsx
│   │   ├── use-saved-asset.ts
│   │   └── use-stats.ts
│   │
│   ├── lib/                      # Utilities & clients
│   │   ├── supabase/
│   │   │   ├── client.ts         # Browser Supabase client
│   │   │   └── server.ts         # Server Supabase client
│   │   ├── admin.ts              # Admin permission check
│   │   ├── api-usage.ts          # API tracking
│   │   ├── track-event.ts        # Event analytics
│   │   └── utils.ts              # Common utilities (cn)
│   │
│   ├── types/                    # TypeScript definitions
│   │   └── potrace.d.ts          # Potrace types
│   │
│   └── utils/                    # Additional utilities
│       └── index.ts
│
├── supabase/                     # Database schema
│   ├── schema.sql                # Main schema
│   └── migrations/               # SQL migrations
│
├── public/                       # Static assets
│   └── showcase/                 # Marketing images
│
├── docs/                         # Documentation
│   ├── PRD.md                    # Product requirements
│   └── ARCHITECTURE.md           # This file
│
└── Configuration files
    ├── next.config.mjs
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── vercel.json
```

---

## 3. Database Schema

### 3.1 Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────┐
│    organizations    │       │    auth.users       │
├─────────────────────┤       │   (Supabase Auth)   │
│ id (PK)             │       ├─────────────────────┤
│ name                │       │ id (PK)             │
│ slug (unique)       │       │ email               │
│ created_at          │       │ raw_user_meta_data  │
│ updated_at          │       └──────────┬──────────┘
└─────────────────────┘                  │
          ▲                              │ 1:1
          │ FK                           ▼
          │                ┌─────────────────────┐
          │                │      profiles       │
          │                ├─────────────────────┤
          └────────────────│ id (PK, FK)         │
                           │ email               │
                           │ full_name           │
                           │ avatar_url          │
                           │ organization_id(FK) │
                           │ api_key (unique)    │
                           │ created_at          │
                           │ updated_at          │
                           └──────────┬──────────┘
                                      │ 1:N
                                      ▼
                           ┌─────────────────────┐
                           │       assets        │
                           ├─────────────────────┤
                           │ id (PK)             │
                           │ user_id (FK)        │
                           │ original_filename   │
                           │ original_url        │
                           │ original_size_bytes │
                           │ mode (icon/logo)    │
                           │ component_name      │
                           │ remove_background   │
                           │ svg_url             │
                           │ react_component     │
                           │ detected_colors     │ (JSONB)
                           │ additional_colors   │ (JSONB)
                           │ visibility          │
                           │ created_at          │
                           │ updated_at          │
                           └─────────────────────┘
```

### 3.2 Table Definitions

#### `profiles`
Extends Supabase auth.users with application-specific data.

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  organization_id UUID REFERENCES public.organizations(id),
  api_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `assets`
Core table storing all converted assets.

```sql
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  original_filename TEXT NOT NULL,
  original_url TEXT NOT NULL,
  original_size_bytes INTEGER,
  mode TEXT NOT NULL CHECK (mode IN ('icon', 'logo')),
  component_name TEXT NOT NULL,
  remove_background BOOLEAN DEFAULT false,
  svg_url TEXT,
  react_component TEXT,
  detected_colors JSONB DEFAULT '[]',
  additional_colors JSONB DEFAULT '[]',
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'organization', 'public')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 Row Level Security (RLS)

```sql
-- Users can only see their own assets
CREATE POLICY "Users can view own assets"
  ON public.assets FOR SELECT
  USING (user_id = auth.uid());

-- Anyone can view public assets
CREATE POLICY "Users can view public assets"
  ON public.assets FOR SELECT
  USING (visibility = 'public');

-- Users can only modify their own assets
CREATE POLICY "Users can update own assets"
  ON public.assets FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own assets"
  ON public.assets FOR DELETE
  USING (user_id = auth.uid());
```

---

## 4. API Architecture

### 4.1 Processing Pipeline (`/api/process`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Image Processing Pipeline                         │
└─────────────────────────────────────────────────────────────────────────┘

[Upload File]
      │
      ▼
┌─────────────────┐
│ 1. Validation   │ ─ Check file type (PNG, JPG, SVG)
│                 │ ─ Check file size (< 4MB)
│                 │ ─ Rate limit check (5/day anonymous)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Pre-process  │ ─ Get metadata (dimensions, channels)
│    (Sharp)      │ ─ Check for transparency
│                 │ ─ Flatten if needed (Icon mode)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Background   │ ─ Logo mode: remove.bg API (with caching)
│    Removal      │ ─ Icon mode: Local algorithm
│   (Optional)    │ ─ Fallback: Local color-based removal
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Color        │ ─ K-means clustering (Logo mode only)
│    Detection    │ ─ Sample from center 60%
│                 │ ─ Extract up to 4 dominant colors
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Resize &     │ ─ Square to 512x512
│    Prepare      │ ─ Icon: Convert to silhouette
│                 │ ─ Logo: Preserve transparency
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6. Vectorize    │ ─ Icon: potrace.trace() - single color
│    (Potrace)    │ ─ Logo: colorSegmentToSvg() or posterize()
│                 │ ─ Create separate masks per color
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 7. Optimize     │ ─ SVGO processing
│    (SVGO)       │ ─ Remove dimensions, set viewBox
│                 │ ─ Icon: Convert to currentColor
│                 │ ─ Logo: Preserve colors
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 8. Post-process │ ─ Icon: Scale to 24x24 viewBox
│                 │ ─ Remove background paths
│                 │ ─ Apply brand colors
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 9. Generate     │ ─ Create React component code
│    Component    │ ─ JSX-compatible attributes
│                 │ ─ Props: size, className, ...props
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 10. Upload &    │ ─ Upload SVG to Supabase Storage
│     Save        │ ─ Save asset record to database
│                 │ ─ Return public URL
└─────────────────┘
```

### 4.2 Key Algorithms

#### Color Extraction (K-Means Clustering)
```typescript
function kMeansClustering(pixels, k): Color[] {
  // 1. K-means++ initialization for diverse starting points
  // 2. Assign pixels to nearest cluster
  // 3. Update cluster centers (20 iterations)
  // 4. Sort by saturation (most vibrant first)
  return centers
}
```

#### Color Segmentation for SVG
```typescript
async function colorSegmentToSvg(buffer, colors): string {
  // For each detected color:
  //   1. Create binary mask (color vs not-color)
  //   2. Trace mask with potrace
  //   3. Apply color fill to resulting paths
  // Combine all paths into single SVG
}
```

### 4.3 Caching Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Caching Architecture                             │
└─────────────────────────────────────────────────────────────────────────┘

remove.bg API Results:
  Location: .cache/rmbg/{md5_hash}.png
  Strategy: File-based, persists across deploys (local dev only)
  Purpose: Reduce API costs during development

Rate Limiting:
  Location: In-memory Map
  Strategy: IP-based, resets daily
  Structure: Map<IP, { count: number, date: string }>

Supabase Storage:
  Location: CDN-backed object storage
  Strategy: Permanent storage with public URLs
  Cache-Control: Handled by Supabase CDN
```

---

## 5. Authentication Flow

### 5.1 OAuth Flow (Google/GitHub)

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Browser │     │ Next.js │     │Supabase │     │Provider │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │
     │ Click Login   │               │               │
     ├──────────────►│               │               │
     │               │ signInWithOAuth               │
     │               ├──────────────►│               │
     │               │               │ Redirect to   │
     │◄──────────────┼───────────────┼──────────────►│
     │                               │               │
     │               OAuth Flow      │◄──────────────┤
     │◄──────────────────────────────┤               │
     │               │               │               │
     │ /auth/callback│               │               │
     ├──────────────►│ exchangeCodeForSession        │
     │               ├──────────────►│               │
     │               │               │ Create profile│
     │               │               │ (trigger)     │
     │◄──────────────┤               │               │
     │ Redirect home │               │               │
```

### 5.2 Session Management

```typescript
// AuthContext maintains session state
const AuthContext = createContext<{
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithGithub: () => Promise<void>
  signOut: () => Promise<void>
}>()

// Session persistence via Supabase SSR
// Cookies managed automatically by @supabase/ssr
```

---

## 6. Deployment Architecture

### 6.1 Vercel Deployment

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Vercel Platform                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │ Edge Network    │    │ Serverless Fns  │    │ Static Assets   │     │
│  │ (CDN)           │    │ (Node.js 18+)   │    │ (ISR/SSG)       │     │
│  │                 │    │                 │    │                 │     │
│  │ • Route caching │    │ • API routes    │    │ • pages         │     │
│  │ • SSL/TLS       │    │ • 10s timeout   │    │ • public/       │     │
│  │ • Compression   │    │ • 50MB limit    │    │ • _next/static  │     │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
         ┌─────────────────┐             ┌─────────────────┐
         │    Supabase     │             │    External     │
         │    Platform     │             │    APIs         │
         │                 │             │                 │
         │ • PostgreSQL    │             │ • remove.bg     │
         │ • Auth          │             │ • (Future)      │
         │ • Storage       │             │                 │
         │ • Realtime      │             │                 │
         └─────────────────┘             └─────────────────┘
```

### 6.2 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side admin key |
| `REMOVE_BG_API_KEY` | No | remove.bg API key |

---

## 7. Security Considerations

### 7.1 Authentication & Authorization

| Layer | Implementation |
|-------|----------------|
| Auth | Supabase Auth with JWT tokens |
| Session | HTTP-only cookies via @supabase/ssr |
| API Auth | Bearer token from session |
| Admin Check | Email whitelist (`ADMIN_EMAILS`) |

### 7.2 Data Protection

| Concern | Mitigation |
|---------|------------|
| SQL Injection | Supabase client with parameterized queries |
| XSS | React's built-in escaping |
| CSRF | SameSite cookies |
| File Upload | Type & size validation, extension check |
| Rate Limiting | IP-based, 5 requests/day for anonymous |

### 7.3 Row Level Security

All database tables have RLS enabled with policies enforcing:
- Users can only access their own private data
- Public assets are readable by anyone
- Write operations require ownership
- Admin operations check email whitelist

---

## 8. Monitoring & Observability

### 8.1 Analytics

| Tool | Purpose |
|------|---------|
| Vercel Analytics | Core Web Vitals, page performance |
| Custom Events | `trackEvent()` for user actions |
| Admin Dashboard | Real-time stats via API |

### 8.2 Event Tracking

```typescript
// Tracked events
trackEvent("generate_success", {
  mode,
  fileSize,
  fileType,
  componentName
})

// Stored in database
INSERT INTO events (event_name, event_data, user_id, session_id, created_at)
```

### 8.3 Error Handling

```typescript
// API error response format
{
  success: false,
  error: "Human-readable message",
  details: "Technical details for debugging",
  errorType: "ERROR_CODE"  // For client-side handling
}
```

---

## 9. Performance Optimizations

### 9.1 Image Processing

| Optimization | Implementation |
|--------------|----------------|
| Early validation | Check file before processing |
| Parallel color extraction | Promise.all for masks |
| Streaming | Buffer processing, no temp files |
| Caching | remove.bg results cached locally |
| Timeout awareness | Log warnings at 8s+ |

### 9.2 Frontend

| Optimization | Implementation |
|--------------|----------------|
| Code splitting | Next.js automatic |
| Image optimization | next/image with lazy loading |
| CSS | Tailwind purge unused classes |
| Fonts | Local Geist fonts, font-display: swap |

---

## 10. Scalability Considerations

### Current Limits

| Resource | Current Limit | Scaling Path |
|----------|---------------|--------------|
| API requests | 5/day anonymous | Increase with auth |
| Processing time | 10s (Vercel) | Background jobs |
| Storage | Supabase free tier | Upgrade plan |
| Concurrent users | ~100 | Horizontal scaling |

### Future Scaling

1. **Background Processing**
   - Move to Vercel Edge Functions or dedicated workers
   - Queue-based processing for heavy operations

2. **Database Optimization**
   - Read replicas for gallery queries
   - Materialized views for statistics

3. **CDN Strategy**
   - Custom domain with CloudFlare
   - Asset versioning for cache invalidation

---

*Architecture Document v1.0*  
*Maintained by: Asset-Bridge Engineering Team*
