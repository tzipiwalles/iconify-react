# Asset-Bridge - Component Documentation

**Version:** 1.0  
**Last Updated:** February 2026

---

## 1. Component Overview

### 1.1 Component Categories

| Category | Components | Description |
|----------|------------|-------------|
| **Pages** | Landing, Create, My Assets, Admin, Profile | Full page views |
| **Layout** | SiteHeader, UserMenu | Navigation & layout |
| **Forms** | UploadZone, SettingsPanel | User input |
| **Display** | ResultsPanel, ToolCompatibility | Output & info |
| **Modals** | AuthModal, ShareModal, FeedbackModal, ColorEditor | Overlays |
| **UI Primitives** | Button, Input, Card, Tabs, Switch, Label | shadcn/ui base |

---

## 2. Page Components

### 2.1 Landing Page (`src/app/page.tsx`)

**Purpose:** Main entry point, public gallery, marketing content

**Key Features:**
- Hero section with CTA
- Public asset gallery
- Tool compatibility showcase
- Footer with stats

**State:**
```typescript
const [showAuthModal, setShowAuthModal] = useState(false)
const [showFeedbackModal, setShowFeedbackModal] = useState(false)
const [publicAssets, setPublicAssets] = useState<PublicAsset[]>([])
const [loadingAssets, setLoadingAssets] = useState(true)
const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(null)
const [shareAsset, setShareAsset] = useState<PublicAsset | null>(null)
```

**Data Flow:**
```
useEffect → fetch('/api/assets/public') → setPublicAssets()
```

---

### 2.2 Create Page (`src/app/create/page.tsx`)

**Purpose:** Main asset creation workflow

**Key Features:**
- Drag & drop upload
- Mode selection (Icon/Logo)
- Background removal toggle
- Component name input
- Process button
- Results display

**State:**
```typescript
const [selectedFile, setSelectedFile] = useState<File | null>(null)
const [mode, setMode] = useState<OutputMode>("icon")
const [removeBackground, setRemoveBackground] = useState(false)
const [componentName, setComponentName] = useState("")
const [isProcessing, setIsProcessing] = useState(false)
const [result, setResult] = useState<ProcessedResult | null>(null)
const [error, setError] = useState<string | null>(null)
const [warning, setWarning] = useState<string | null>(null)
```

**Data Flow:**
```
handleFileSelect() → setSelectedFile() → validation → setWarning()
handleProcess() → POST /api/process → setResult()
```

---

### 2.3 My Assets Page (`src/app/my-assets/page.tsx`)

**Purpose:** User's personal asset library management

**Key Features:**
- Asset grid display
- Rename assets
- Edit colors
- Toggle visibility
- Delete assets
- Share & embed

**State:**
```typescript
const [assets, setAssets] = useState<Asset[]>([])
const [loading, setLoading] = useState(true)
const [editingId, setEditingId] = useState<string | null>(null)
const [editingColorsAsset, setEditingColorsAsset] = useState<Asset | null>(null)
const [shareAsset, setShareAsset] = useState<Asset | null>(null)
const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
```

**Data Flow:**
```
useEffect → Supabase query (user's assets) → setAssets()
handleToggleVisibility() → PATCH /api/assets/{name}/visibility
handleSaveColors() → PATCH /api/assets/{name}/colors
```

---

### 2.4 Admin Page (`src/app/admin/page.tsx`)

**Purpose:** Admin dashboard for monitoring

**Key Features:**
- User statistics
- Asset counts
- Event tracking (generate clicks, success rate)
- API usage monitoring
- User feedback display
- User filtering for stats

**State:**
```typescript
const [data, setData] = useState<AdminData | null>(null)
const [feedback, setFeedback] = useState<Feedback[]>([])
const [apiUsage, setApiUsage] = useState<ApiUsageStats | null>(null)
const [eventStats, setEventStats] = useState<EventStats | null>(null)
const [excludedUserIds, setExcludedUserIds] = useState<Set<string>>(new Set())
```

**Access Control:**
```typescript
// Admin check in API routes
const ADMIN_EMAILS = ["tzipi.walles@gmail.com"]
const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email)
```

---

## 3. Feature Components

### 3.1 UploadZone (`src/components/upload-zone.tsx`)

**Purpose:** Drag & drop file upload interface

**Props:**
```typescript
interface UploadZoneProps {
  onFileSelect: (file: File) => void
  selectedFile: File | null
  onClear: () => void
  isProcessing: boolean
}
```

**Behavior:**
- Accepts: PNG, JPG, JPEG, SVG
- Shows file preview when selected
- Indicates processing state
- Validates file type on drop

**Usage:**
```tsx
<UploadZone
  onFileSelect={handleFileSelect}
  selectedFile={selectedFile}
  onClear={handleClear}
  isProcessing={isProcessing}
/>
```

---

### 3.2 SettingsPanel (`src/components/settings-panel.tsx`)

**Purpose:** Conversion configuration options

**Props:**
```typescript
interface SettingsPanelProps {
  mode: OutputMode
  onModeChange: (mode: OutputMode) => void
  removeBackground: boolean
  onRemoveBackgroundChange: (value: boolean) => void
  componentName: string
  onComponentNameChange: (name: string) => void
  isProcessing: boolean
}
```

**Sections:**
1. **Mode Selection** - Icon (1 color) vs Logo (4 colors)
2. **Background Removal** - Toggle switch
3. **Component Name** - Text input

---

### 3.3 ResultsPanel (`src/components/results-panel.tsx`)

**Purpose:** Display processing results and copy options

**Props:**
```typescript
interface ResultsPanelProps {
  result: {
    componentName: string
    optimizedSvg: string
    reactComponent: string
    publicUrl: string | null
    detectedColors?: string[]
    assetId?: string | null
  }
  onLoginClick: () => void
}
```

**Features:**
- SVG preview
- Detected colors display
- Copy buttons (SVG, React, URL)
- Share modal trigger

---

### 3.4 ShareModal (`src/components/share-modal.tsx`)

**Purpose:** Embed and share options for assets

**Props:**
```typescript
interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  asset: {
    component_name: string
    react_component: string
    svg_url: string
    visibility: string
    detected_colors?: string[]
    additional_colors?: string[]
  }
  baseUrl: string
}
```

**Embed Options:**
1. **Direct URL** - SVG endpoint
2. **AI Prompt** - Ready for ChatGPT/Cursor (with optional brand colors)
3. **HTML Image** - Simple img tag
4. **React Component** - Full TSX code
5. **React/Next.js Image** - JSX examples

**Special Feature:**
```tsx
// Toggle to include brand colors in AI prompt
<Toggle 
  checked={includeColors}
  onChange={setIncludeColors}
  label="Include brand colors in prompt"
/>
```

---

### 3.5 ColorEditor (`src/components/color-editor.tsx`)

**Purpose:** Edit detected and additional brand colors

**Props:**
```typescript
interface ColorEditorProps {
  detectedColors: string[]
  additionalColors: string[]
  onColorChange: (index: number, color: string) => void
  onAddColor: (color: string) => void
  onRemoveAdditionalColor: (index: number) => void
  onSave: () => Promise<void>
  isSaving: boolean
  hasChanges: boolean
}
```

**Features:**
- Edit existing colors (color picker)
- Add new colors
- Remove additional colors
- Preview changes
- Save with regeneration

---

### 3.6 AuthModal (`src/components/auth-modal.tsx`)

**Purpose:** Authentication modal for sign in/up

**Props:**
```typescript
interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  conversionCount?: number // Show limit message
}
```

**Auth Options:**
- Google OAuth
- GitHub OAuth
- Email/Password (form)

**Integration:**
```tsx
const { signInWithGoogle, signInWithGithub } = useAuth()
```

---

### 3.7 ToolCompatibility (`src/components/tool-compatibility.tsx`)

**Purpose:** Display AI tool compatibility status

**Features:**
- List of supported tools
- Voting system (works/doesn't work)
- Visual badges

**Tools Tracked:**
- Cursor
- ChatGPT Canvas
- Base44
- v0.dev
- Google AI Studio
- Bolt.new
- Lovable
- Replit

---

### 3.8 SiteHeader (`src/components/site-header.tsx`)

**Purpose:** Consistent navigation header across pages

**Props:**
```typescript
interface SiteHeaderProps {
  showBackButton?: boolean
  title?: string
  subtitle?: string
  onLoginClick?: () => void
}
```

**Features:**
- Logo/brand
- Page title & subtitle
- Back navigation (optional)
- User menu or login button
- GitHub link

---

### 3.9 UserMenu (`src/components/user-menu.tsx`)

**Purpose:** Authenticated user dropdown menu

**Menu Items:**
- My Assets
- Profile
- Admin (if admin user)
- Sign Out

**Usage:**
```tsx
// In header when user is authenticated
{user ? <UserMenu /> : <LoginButton />}
```

---

## 4. UI Primitives (shadcn/ui)

### 4.1 Button (`src/components/ui/button.tsx`)

**Variants:**
- `default` - Primary action
- `destructive` - Danger action
- `outline` - Secondary action
- `secondary` - Tertiary action
- `ghost` - Minimal style
- `link` - Text link style

**Sizes:**
- `default` - Standard
- `sm` - Small
- `lg` - Large
- `icon` - Icon only

---

### 4.2 Card (`src/components/ui/card.tsx`)

**Components:**
- `Card` - Container
- `CardHeader` - Header section
- `CardTitle` - Title text
- `CardDescription` - Description text
- `CardContent` - Main content
- `CardFooter` - Footer section

---

### 4.3 Tabs (`src/components/ui/tabs.tsx`)

**Components:**
- `Tabs` - Container with value state
- `TabsList` - Tab button container
- `TabsTrigger` - Tab button
- `TabsContent` - Tab panel

---

### 4.4 Switch (`src/components/ui/switch.tsx`)

**Props:**
```typescript
interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}
```

---

### 4.5 Input (`src/components/ui/input.tsx`)

**Base input with consistent styling.**

---

### 4.6 Label (`src/components/ui/label.tsx`)

**Accessible form labels using Radix UI.**

---

### 4.7 ColorPicker (`src/components/ui/color-picker.tsx`)

**Custom color picker component for brand color editing.**

---

## 5. Context Providers

### 5.1 AuthProvider (`src/contexts/auth-context.tsx`)

**Purpose:** Global authentication state management

**Provided Values:**
```typescript
interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithGithub: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}
```

**Usage:**
```tsx
// In component
const { user, loading, signInWithGoogle } = useAuth()

// In layout (wrapping app)
<AuthProvider>
  {children}
</AuthProvider>
```

---

## 6. Custom Hooks

### 6.1 useAuth

**Purpose:** Access auth context

```typescript
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
```

---

### 6.2 useSavedAsset

**Purpose:** Fetch a specific asset by name

```typescript
export function useSavedAsset(componentName: string) {
  const [asset, setAsset] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetch(`/api/assets/${componentName}`)
      .then(r => r.json())
      .then(data => setAsset(data.data))
      .finally(() => setLoading(false))
  }, [componentName])
  
  return { asset, loading }
}
```

---

### 6.3 useStats

**Purpose:** Fetch public statistics

```typescript
export function useStats() {
  const [stats, setStats] = useState({ users: 0, icons: 0, logos: 0 })
  
  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => setStats(data.data))
  }, [])
  
  return { stats }
}
```

---

### 6.4 useConversionCount

**Purpose:** Track user's conversion count (for rate limiting display)

```typescript
export function useConversionCount() {
  const [count, setCount] = useState(0)
  
  // Implementation tracks via localStorage or session
  
  return { count, increment: () => setCount(c => c + 1) }
}
```

---

### 6.5 useMobile

**Purpose:** Detect mobile viewport

```typescript
export function useMobile() {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  
  return isMobile
}
```

---

## 7. Component Best Practices

### 7.1 File Structure

```
components/
├── feature-name.tsx       # Component + logic
├── feature-name.test.tsx  # Tests (future)
└── ui/
    └── primitive.tsx      # Reusable primitives
```

### 7.2 Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Component file | kebab-case | `upload-zone.tsx` |
| Component name | PascalCase | `UploadZone` |
| Props interface | `{Name}Props` | `UploadZoneProps` |
| Hook | `use{Name}` | `useSavedAsset` |
| Context | `{Name}Context` | `AuthContext` |

### 7.3 Props Pattern

```typescript
interface ComponentProps {
  // Required props first
  value: string
  onChange: (value: string) => void
  
  // Optional props with defaults
  disabled?: boolean
  className?: string
}

export function Component({ 
  value, 
  onChange, 
  disabled = false,
  className 
}: ComponentProps) {
  // Implementation
}
```

### 7.4 State Management Guidelines

1. **Local state first** - useState for component-specific state
2. **Lift state up** - When shared between siblings
3. **Context** - For app-wide state (auth)
4. **Server state** - Fetch in useEffect, consider React Query (future)

---

*Component Documentation v1.0*  
*Maintained by: Asset-Bridge Engineering Team*
