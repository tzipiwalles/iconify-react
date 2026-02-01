# Asset-Bridge - Data Flow Diagrams

**Version:** 1.0  
**Last Updated:** February 2026

---

## 1. Core Data Flows

### 1.1 Image Upload & Processing Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        IMAGE UPLOAD & PROCESSING                              │
└──────────────────────────────────────────────────────────────────────────────┘

User                Browser                   API                   Supabase
 │                    │                        │                       │
 │  Select File       │                        │                       │
 ├───────────────────►│                        │                       │
 │                    │                        │                       │
 │  Configure Options │                        │                       │
 │  (Mode, BG Remove) │                        │                       │
 ├───────────────────►│                        │                       │
 │                    │                        │                       │
 │  Click Generate    │                        │                       │
 ├───────────────────►│                        │                       │
 │                    │  POST /api/process     │                       │
 │                    │  FormData: file, mode  │                       │
 │                    ├───────────────────────►│                       │
 │                    │                        │                       │
 │                    │                        │ ┌─────────────────┐   │
 │                    │                        │ │ 1. Validate     │   │
 │                    │                        │ │    - File type  │   │
 │                    │                        │ │    - File size  │   │
 │                    │                        │ │    - Rate limit │   │
 │                    │                        │ └────────┬────────┘   │
 │                    │                        │          │            │
 │                    │                        │ ┌────────▼────────┐   │
 │                    │                        │ │ 2. Process      │   │
 │                    │                        │ │    - Sharp      │   │
 │                    │                        │ │    - Potrace    │   │
 │                    │                        │ │    - SVGO       │   │
 │                    │                        │ └────────┬────────┘   │
 │                    │                        │          │            │
 │                    │                        │ ┌────────▼────────┐   │
 │                    │                        │ │ 3. Generate     │   │
 │                    │                        │ │    - SVG code   │   │
 │                    │                        │ │    - React comp │   │
 │                    │                        │ └────────┬────────┘   │
 │                    │                        │          │            │
 │                    │                        │  Upload SVG          │
 │                    │                        ├──────────────────────►│
 │                    │                        │                       │
 │                    │                        │  Return public URL    │
 │                    │                        │◄──────────────────────┤
 │                    │                        │                       │
 │                    │                        │  Insert asset record  │
 │                    │                        ├──────────────────────►│
 │                    │                        │                       │
 │                    │  Response: {           │                       │
 │                    │    componentName,      │                       │
 │                    │    optimizedSvg,       │                       │
 │                    │    reactComponent,     │                       │
 │                    │    publicUrl,          │                       │
 │                    │    detectedColors,     │                       │
 │                    │    assetId             │                       │
 │                    │  }                     │                       │
 │                    │◄───────────────────────┤                       │
 │                    │                        │                       │
 │  Show Results      │                        │                       │
 │◄───────────────────┤                        │                       │
```

### 1.2 Authentication Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        OAUTH AUTHENTICATION FLOW                              │
└──────────────────────────────────────────────────────────────────────────────┘

User              Browser             Next.js            Supabase          OAuth Provider
 │                  │                   │                   │                   │
 │ Click Sign In    │                   │                   │                   │
 ├─────────────────►│                   │                   │                   │
 │                  │ Open AuthModal    │                   │                   │
 │                  ├──────────────────►│                   │                   │
 │                  │                   │                   │                   │
 │ Select Google    │                   │                   │                   │
 ├─────────────────►│                   │                   │                   │
 │                  │ signInWithOAuth   │                   │                   │
 │                  ├──────────────────►│                   │                   │
 │                  │                   │ Get Auth URL      │                   │
 │                  │                   ├──────────────────►│                   │
 │                  │                   │                   │                   │
 │                  │                   │◄──────────────────┤                   │
 │                  │ Redirect to OAuth │                   │                   │
 │◄─────────────────┼───────────────────┼───────────────────┼──────────────────►│
 │                  │                   │                   │                   │
 │ Enter Credentials│                   │                   │                   │
 ├──────────────────┼───────────────────┼───────────────────┼──────────────────►│
 │                  │                   │                   │                   │
 │ Redirect + Code  │                   │                   │                   │
 │◄─────────────────┼───────────────────┼───────────────────┼──────────────────┤
 │                  │                   │                   │                   │
 │ /auth/callback   │                   │                   │                   │
 ├─────────────────►│                   │                   │                   │
 │                  │ Exchange code     │                   │                   │
 │                  ├──────────────────►│                   │                   │
 │                  │                   │ exchangeCodeForSession               │
 │                  │                   ├──────────────────►│                   │
 │                  │                   │                   │                   │
 │                  │                   │ ┌───────────────┐ │                   │
 │                  │                   │ │ Trigger:      │ │                   │
 │                  │                   │ │ handle_new_   │ │                   │
 │                  │                   │ │ user()        │ │                   │
 │                  │                   │ │ → Create      │ │                   │
 │                  │                   │ │   profile     │ │                   │
 │                  │                   │ └───────────────┘ │                   │
 │                  │                   │                   │                   │
 │                  │                   │ Return session    │                   │
 │                  │                   │◄──────────────────┤                   │
 │                  │ Set cookies       │                   │                   │
 │                  │◄──────────────────┤                   │                   │
 │                  │                   │                   │                   │
 │ Redirect to /    │                   │                   │                   │
 │◄─────────────────┤                   │                   │                   │
 │                  │                   │                   │                   │
 │                  │ AuthContext       │                   │                   │
 │                  │ onAuthStateChange │                   │                   │
 │                  ├──────────────────►│                   │                   │
 │                  │                   │                   │                   │
 │ User logged in!  │                   │                   │                   │
 │◄─────────────────┤                   │                   │                   │
```

### 1.3 Asset Retrieval Flow (API Access)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        PUBLIC ASSET RETRIEVAL                                 │
└──────────────────────────────────────────────────────────────────────────────┘

External App         Asset-Bridge API         Supabase DB         Supabase Storage
     │                     │                      │                      │
     │ GET /api/assets/{name}/svg                 │                      │
     ├────────────────────►│                      │                      │
     │                     │                      │                      │
     │                     │ Query: SELECT *      │                      │
     │                     │ WHERE component_name │                      │
     │                     │ AND visibility='public'                     │
     │                     ├─────────────────────►│                      │
     │                     │                      │                      │
     │                     │ Asset record         │                      │
     │                     │◄─────────────────────┤                      │
     │                     │                      │                      │
     │                     │ Redirect to svg_url  │                      │
     │                     ├──────────────────────┼─────────────────────►│
     │                     │                      │                      │
     │                     │                      │      SVG Content     │
     │◄────────────────────┼──────────────────────┼──────────────────────┤
     │                     │                      │                      │


┌──────────────────────────────────────────────────────────────────────────────┐
│                        ASSET METADATA RETRIEVAL                               │
└──────────────────────────────────────────────────────────────────────────────┘

External App         Asset-Bridge API         Supabase DB
     │                     │                      │
     │ GET /api/assets/{name}                     │
     ├────────────────────►│                      │
     │                     │                      │
     │                     │ Query asset by name  │
     │                     ├─────────────────────►│
     │                     │                      │
     │                     │ Asset record         │
     │                     │◄─────────────────────┤
     │                     │                      │
     │ {                   │                      │
     │   success: true,    │                      │
     │   data: {           │                      │
     │     componentName,  │                      │
     │     svgUrl,         │                      │
     │     reactComponent, │                      │
     │     detectedColors, │                      │
     │     mode,           │                      │
     │     visibility      │                      │
     │   }                 │                      │
     │ }                   │                      │
     │◄────────────────────┤                      │
```

---

## 2. Component Data Flow

### 2.1 Create Page Component Tree

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        CREATE PAGE COMPONENT TREE                             │
└──────────────────────────────────────────────────────────────────────────────┘

CreatePage (page.tsx)
│
├── State:
│   ├── selectedFile: File | null
│   ├── mode: "icon" | "logo"
│   ├── removeBackground: boolean
│   ├── componentName: string
│   ├── isProcessing: boolean
│   ├── result: ProcessedResult | null
│   └── error: string | null
│
├── SiteHeader
│   └── Props: showBackButton, title, subtitle, onLoginClick
│
├── UploadZone
│   ├── Props: onFileSelect, selectedFile, onClear, isProcessing
│   └── Events:
│       ├── onDrop → handleFileSelect(file)
│       └── onClear → handleClear()
│
├── SettingsPanel
│   ├── Props: mode, onModeChange, removeBackground, 
│   │          onRemoveBackgroundChange, componentName, onComponentNameChange
│   └── Events:
│       ├── onModeChange → setMode(newMode)
│       ├── onRemoveBackgroundChange → setRemoveBackground(value)
│       └── onComponentNameChange → setComponentName(value)
│
├── GenerateButton
│   └── onClick → handleProcess()
│       └── POST /api/process → setResult(response.data)
│
├── ResultsPanel (if result)
│   ├── Props: result, onLoginClick
│   └── Displays:
│       ├── SVG Preview (from result.optimizedSvg)
│       ├── Component Name
│       ├── Detected Colors
│       ├── Copy Code buttons
│       └── Share modal trigger
│
└── AuthModal
    └── Props: isOpen, onClose
```

### 2.2 State Management Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        STATE MANAGEMENT                                       │
└──────────────────────────────────────────────────────────────────────────────┘

                         AuthContext (Global)
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   Landing Page          Create Page          My Assets Page
        │                     │                     │
   Local State:          Local State:          Local State:
   ├─ publicAssets       ├─ selectedFile       ├─ assets
   ├─ loadingAssets      ├─ mode               ├─ loading
   ├─ shareAsset         ├─ removeBackground   ├─ editingId
   └─ lightboxImage      ├─ componentName      ├─ shareAsset
                         ├─ isProcessing       └─ menuOpenId
                         ├─ result
                         └─ error


Data Flow:

[User Action] → [Local State Update] → [API Call (if needed)] → [State Update]

Example - Generate Asset:
1. User clicks "Generate"
2. setIsProcessing(true)
3. POST /api/process with FormData
4. API returns result
5. setResult(response.data)
6. setIsProcessing(false)
7. Component re-renders with results
```

---

## 3. Database Operations

### 3.1 Asset CRUD Operations

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        ASSET CRUD OPERATIONS                                  │
└──────────────────────────────────────────────────────────────────────────────┘

CREATE:
┌─────────────────────────────────────────────────────────────────────────────┐
│ /api/process (POST)                                                          │
│                                                                              │
│ 1. Upload original file to storage:                                          │
│    originals/{user_id}/{component_name}_original_{timestamp}.{ext}          │
│                                                                              │
│ 2. Upload processed SVG to storage:                                          │
│    svgs/{component_name}-{timestamp}.svg                                     │
│                                                                              │
│ 3. Insert asset record:                                                      │
│    INSERT INTO assets (                                                      │
│      user_id, original_filename, original_url, original_size_bytes,         │
│      mode, component_name, remove_background, svg_url, react_component,     │
│      detected_colors, visibility                                             │
│    ) VALUES (...)                                                            │
└─────────────────────────────────────────────────────────────────────────────┘

READ:
┌─────────────────────────────────────────────────────────────────────────────┐
│ /api/assets (GET) - List user's assets                                       │
│ SELECT * FROM assets WHERE user_id = auth.uid() ORDER BY created_at DESC    │
│                                                                              │
│ /api/assets/{name} (GET) - Get single asset                                  │
│ SELECT * FROM assets WHERE component_name = $1 AND visibility = 'public'    │
│                                                                              │
│ /api/assets/public (GET) - List public assets                                │
│ SELECT * FROM assets WHERE visibility = 'public' ORDER BY created_at DESC   │
└─────────────────────────────────────────────────────────────────────────────┘

UPDATE:
┌─────────────────────────────────────────────────────────────────────────────┐
│ /api/assets/{name}/rename (PATCH)                                            │
│ UPDATE assets SET component_name = $new_name WHERE component_name = $old    │
│                                                                              │
│ /api/assets/{name}/colors (PATCH)                                            │
│ 1. Update colors in DB                                                       │
│ 2. Re-generate SVG with new colors                                           │
│ 3. Upload new SVG to storage                                                 │
│ 4. Update svg_url in record                                                  │
│                                                                              │
│ /api/assets/{name}/visibility (PATCH)                                        │
│ UPDATE assets SET visibility = $new_visibility WHERE component_name = $name │
└─────────────────────────────────────────────────────────────────────────────┘

DELETE:
┌─────────────────────────────────────────────────────────────────────────────┐
│ /api/assets/{name} (DELETE)                                                  │
│ 1. Verify ownership (user_id = auth.uid())                                   │
│ 2. Delete from storage (optional - may leave orphaned files)                 │
│ 3. DELETE FROM assets WHERE id = $id                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 RLS Policy Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        ROW LEVEL SECURITY (RLS)                               │
└──────────────────────────────────────────────────────────────────────────────┘

Request comes in:
        │
        ▼
┌───────────────────┐
│ Extract JWT from  │
│ Authorization     │
│ header / cookie   │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Supabase sets     │
│ auth.uid() from   │
│ JWT claims        │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Query executes    │
│ with RLS policies │
└────────┬──────────┘
         │
         ├─── SELECT on assets ───┬─── Policy: user_id = auth.uid() ──► ✓ Own assets
         │                        │
         │                        └─── Policy: visibility = 'public' ──► ✓ Public assets
         │
         ├─── INSERT on assets ───────── Policy: user_id = auth.uid() ──► ✓ Can insert
         │
         ├─── UPDATE on assets ───────── Policy: user_id = auth.uid() ──► ✓ Own only
         │
         └─── DELETE on assets ───────── Policy: user_id = auth.uid() ──► ✓ Own only
```

---

## 4. Event Tracking Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        EVENT TRACKING                                         │
└──────────────────────────────────────────────────────────────────────────────┘

Client                  trackEvent()               API                  Database
  │                         │                       │                       │
  │ User action             │                       │                       │
  │ (e.g., generate click)  │                       │                       │
  ├────────────────────────►│                       │                       │
  │                         │                       │                       │
  │                         │ POST /api/track       │                       │
  │                         │ {                     │                       │
  │                         │   eventName,          │                       │
  │                         │   eventData,          │                       │
  │                         │   sessionId           │                       │
  │                         │ }                     │                       │
  │                         ├──────────────────────►│                       │
  │                         │                       │                       │
  │                         │                       │ INSERT INTO events    │
  │                         │                       │ (event_name,          │
  │                         │                       │  event_data,          │
  │                         │                       │  user_id,             │
  │                         │                       │  session_id,          │
  │                         │                       │  created_at)          │
  │                         │                       ├──────────────────────►│
  │                         │                       │                       │
  │                         │ { success: true }     │                       │
  │                         │◄──────────────────────┤                       │
  │                         │                       │                       │
  │ Continue flow           │                       │                       │
  │◄────────────────────────┤                       │                       │


Tracked Events:
┌─────────────────────┬─────────────────────────────────────────────────────┐
│ Event Name          │ Event Data                                          │
├─────────────────────┼─────────────────────────────────────────────────────┤
│ generate_click      │ { mode, hasFile }                                   │
│ generate_success    │ { mode, fileSize, fileType, componentName }         │
│ generate_error      │ { mode, error, fileType }                           │
│ copy_code           │ { type: 'svg' | 'react' | 'url' }                   │
│ share_asset         │ { assetId, componentName }                          │
│ login_click         │ { provider }                                        │
│ signup_complete     │ { provider }                                        │
└─────────────────────┴─────────────────────────────────────────────────────┘
```

---

*Data Flow Documentation v1.0*  
*Maintained by: Asset-Bridge Engineering Team*
