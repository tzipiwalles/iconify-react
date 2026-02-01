# Asset-Bridge - Product Requirements Document (PRD)

**Version:** 1.0  
**Last Updated:** February 2026  
**Status:** Production

---

## 1. Executive Summary

### 1.1 Product Vision
Asset-Bridge is a developer-focused SaaS tool that solves the "broken image" problem in AI-powered development workflows. When developers use AI coding tools like Cursor, ChatGPT Canvas, Base44, or v0.dev to generate web applications, local images and custom logos cannot be rendered in AI previews. Asset-Bridge provides instant hosting for custom assets, delivering permanent, publicly accessible URLs that work seamlessly with any AI tool.

### 1.2 Problem Statement
- **Primary Pain Point:** AI coding tools cannot access local files or custom logos, resulting in broken image icons in generated previews
- **Current Workarounds:** Manual uploads to Imgur, Cloudinary, or other services - time-consuming and fragmented workflow
- **Target Users:** Developers, designers, and no-code builders using AI tools for rapid prototyping

### 1.3 Solution
A one-click image-to-SVG conversion and hosting platform that:
1. Accepts any image format (PNG, JPG, SVG)
2. Optionally removes backgrounds using AI
3. Vectorizes images to optimized SVG
4. Generates permanent, hosted URLs
5. Creates ready-to-use React components
6. Provides AI-optimized prompts for embedding

---

## 2. Product Goals & Success Metrics

### 2.1 Key Objectives
| Objective | Description | Priority |
|-----------|-------------|----------|
| Instant Hosting | < 5 seconds from upload to public URL | P0 |
| Universal Compatibility | Works with all major AI coding tools | P0 |
| Zero Friction | No account required for basic usage | P0 |
| Quality Output | High-fidelity SVG conversion | P1 |
| Community Gallery | Public asset sharing | P1 |

### 2.2 Success Metrics (KPIs)
- **Daily Active Generations:** Target 100+ per day
- **Conversion Rate:** Upload → Successful generation > 80%
- **User Retention:** Week 2 return rate > 40%
- **Error Rate:** Processing failures < 5%
- **Average Processing Time:** < 8 seconds (Vercel timeout buffer)

---

## 3. User Personas

### 3.1 Primary: The AI-First Developer
- **Profile:** Full-stack developer using Cursor, GitHub Copilot, or similar AI tools
- **Need:** Quickly prototype with real brand assets
- **Pain:** Constantly sees broken image placeholders
- **Behavior:** Uses CLI tools, values speed over features

### 3.2 Secondary: The No-Code Builder
- **Profile:** Startup founder or marketer using Base44, Bubble, or v0.dev
- **Need:** Professional-looking prototypes with custom branding
- **Pain:** Cannot integrate real logos into AI-generated apps
- **Behavior:** Prefers GUI, values simplicity

### 3.3 Tertiary: The Design-Aware Developer
- **Profile:** Frontend developer who cares about design consistency
- **Need:** Maintain brand colors and visual identity
- **Pain:** Manual color extraction and consistency management
- **Behavior:** Uses design systems, values precision

---

## 4. Features & Requirements

### 4.1 Core Features (MVP - Shipped)

#### 4.1.1 Image Upload & Processing
| Requirement | Status | Details |
|-------------|--------|---------|
| Drag & drop upload | ✅ Shipped | PNG, JPG, SVG support |
| File size limit | ✅ Shipped | Max 4MB |
| Rate limiting | ✅ Shipped | 5 conversions/day for anonymous users |
| Admin bypass | ✅ Shipped | Unlimited for admin emails |

#### 4.1.2 Conversion Modes
| Mode | Description | Output |
|------|-------------|--------|
| **Icon Mode** | Single-color silhouette | 24x24 viewBox, `currentColor` |
| **Logo Mode** | Multi-color preservation | Original aspect ratio, 4 detected colors |

#### 4.1.3 Background Removal
| Option | Implementation |
|--------|---------------|
| Local Algorithm | Color-based detection & transparency |
| Remove.bg API | AI-powered (for Logo mode, with caching) |

#### 4.1.4 Output Generation
- **Optimized SVG:** SVGO processing, minimal file size
- **React Component:** JSX-compatible, props support (`size`, `className`)
- **Permanent URL:** CDN-backed Supabase Storage
- **AI Prompt:** Ready-to-paste instructions with brand colors

### 4.2 User Management

#### 4.2.1 Authentication
| Provider | Status |
|----------|--------|
| Google OAuth | ✅ Shipped |
| GitHub OAuth | ✅ Shipped |
| Email/Password | ✅ Shipped |

#### 4.2.2 User Features
- Personal asset library ("My Assets")
- Asset renaming
- Visibility toggle (Public/Private)
- Color editing for logos
- Asset deletion

### 4.3 Public Gallery
- Community-shared assets
- Share & embed modal with copy options
- Public API access by component name

### 4.4 Admin Dashboard
- User statistics
- Asset counts (icons/logos)
- Event tracking (generate clicks, success rate)
- API usage monitoring
- User feedback collection

---

## 5. User Flows

### 5.1 Anonymous User Flow
```
[Landing Page] → [Click "Generate Logo"] → [Create Page]
       ↓
[Upload Image] → [Select Mode (Icon/Logo)] → [Configure Options]
       ↓
[Click Generate] → [View Results] → [Copy URL/Code]
       ↓
[Rate limit reached] → [Prompt to sign in]
```

### 5.2 Authenticated User Flow
```
[Sign In] → [Generate Asset] → [Auto-save to "My Assets"]
       ↓
[My Assets Page] → [Manage: Rename, Edit Colors, Toggle Visibility, Delete]
       ↓
[Share Modal] → [Copy: URL, AI Prompt, HTML, React Component]
```

### 5.3 Asset Embedding Flow (AI Tool User)
```
[Generate Asset] → [Copy AI Prompt with URL]
       ↓
[Paste in ChatGPT/Cursor/v0] → [AI uses hosted URL]
       ↓
[Preview renders correctly with real logo]
```

---

## 6. Technical Constraints

### 6.1 Performance Requirements
| Constraint | Limit | Reason |
|------------|-------|--------|
| Processing time | < 10 seconds | Vercel serverless timeout |
| Max color count | 4 colors | Potrace performance |
| File size | 4MB max | Memory limits |
| SVG output size | < 100KB | CDN efficiency |

### 6.2 API Rate Limits
- Anonymous: 5 requests/day
- Authenticated: Unlimited (tracked)
- Admin: Unlimited, no rate limiting

### 6.3 Third-Party Dependencies
| Service | Purpose | Fallback |
|---------|---------|----------|
| Supabase | Auth, Database, Storage | Required |
| remove.bg API | AI background removal | Local algorithm |
| Vercel | Hosting, Serverless | None (required) |

---

## 7. API Endpoints

### 7.1 Public API
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/assets/{name}` | GET | Get asset metadata (JSON) |
| `/api/assets/{name}/svg` | GET | Get SVG content directly |
| `/api/assets/public` | GET | List all public assets |
| `/api/process` | POST | Convert image to SVG |

### 7.2 Authenticated API
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/assets` | GET | List user's assets |
| `/api/assets/{name}/rename` | PATCH | Rename asset |
| `/api/assets/{name}/colors` | PATCH | Update brand colors |
| `/api/assets/{name}/visibility` | PATCH | Toggle public/private |
| `/api/assets/{name}` | DELETE | Delete asset |

### 7.3 Admin API
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/users` | GET | User statistics |
| `/api/admin/events` | GET | Event tracking data |
| `/api/admin/api-usage` | GET | API usage stats |
| `/api/admin/assets/{name}` | DELETE | Admin delete asset |

---

## 8. Future Roadmap

### Phase 2: Enhanced Features
- [ ] Organization/team workspaces
- [ ] API key authentication for programmatic access
- [ ] Batch upload (multiple files)
- [ ] Custom domains for assets
- [ ] Figma plugin integration

### Phase 3: Enterprise
- [ ] SSO support
- [ ] Asset version history
- [ ] Usage analytics per asset
- [ ] Private CDN option
- [ ] SLA guarantees

### Phase 4: Ecosystem
- [ ] CLI tool (`npx asset-bridge upload logo.png`)
- [ ] VS Code extension
- [ ] GitHub Action for CI/CD
- [ ] Webhook notifications

---

## 9. Competitive Analysis

| Feature | Asset-Bridge | Cloudinary | Imgur | Vercel Blob |
|---------|--------------|------------|-------|-------------|
| AI-focused UX | ✅ | ❌ | ❌ | ❌ |
| SVG conversion | ✅ | Limited | ❌ | ❌ |
| Background removal | ✅ | ✅ | ❌ | ❌ |
| React component gen | ✅ | ❌ | ❌ | ❌ |
| Free tier | ✅ | ✅ | ✅ | ✅ |
| Brand colors extraction | ✅ | ❌ | ❌ | ❌ |
| AI prompts | ✅ | ❌ | ❌ | ❌ |

---

## 10. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Remove.bg API costs | Medium | Medium | Caching, local fallback |
| Supabase outage | Low | High | Retry logic, status page |
| Abuse (spam uploads) | Medium | Medium | Rate limiting, CAPTCHA (future) |
| Copyright violations | Low | High | User terms, DMCA process |
| Vercel timeout | Medium | High | Processing optimizations, async jobs |

---

## 11. Success Criteria for v1.0

### Launch Checklist
- [x] Core image upload and conversion
- [x] Icon and Logo modes
- [x] Background removal (local + API)
- [x] User authentication (Google, GitHub)
- [x] Personal asset management
- [x] Public gallery
- [x] Share & embed modal
- [x] Admin dashboard
- [x] Rate limiting
- [x] Mobile responsive design
- [x] SEO optimization
- [x] Analytics integration

### Post-Launch Monitoring
- Error rates in production
- User feedback collection
- Performance metrics (Vercel Analytics)
- Feature request tracking

---

*Document maintained by: Asset-Bridge Team*  
*For questions, contact: tzipi.walles@gmail.com*
