# Asset-Bridge 🌉

A developer tool that transforms raw images and SVGs into optimized, standardized React components — perfect for AI coding workflows like Base44, Cursor, and more.

![Asset-Bridge](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)

## ✨ Features

- **🎨 Drag & Drop Upload**: Support for PNG, JPG, and SVG files
- **🔮 Smart Vectorization**: Converts raster images to SVG using potrace
- **🎯 Multi-Color Support**: 1-5 color layers with auto-detection
- **🧹 Background Removal**: Optional AI-powered background removal
- **⚡ SVG Optimization**: SVGO with custom configuration
- **📦 React Component Generation**: Ready-to-use JSX components
- **🌓 Dark Mode UI**: Modern, beautiful interface
- **☁️ Cloud Storage**: Optional Supabase integration

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend/Storage**: Supabase (`@supabase/ssr`)
- **Image Processing**: sharp
- **Vectorization**: potrace
- **SVG Optimization**: svgo

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/asset-bridge.git
cd asset-bridge
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file (optional):
```env
# Supabase Configuration (optional)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Background Removal API (optional)
REMOVE_BG_API_KEY=your_remove_bg_api_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage

1. **Upload**: Drag and drop your image (PNG, JPG) or SVG
2. **Configure**: 
   - Choose color count (1-5 layers)
   - Toggle auto-detect colors or set custom palette
   - Optionally enable background removal
   - Set custom component name
3. **Process**: Click "Generate Component"
4. **Export**: Copy code or download files (SVG / TSX)

## 📤 Output Format

### Generated React Component

```jsx
import React from "react"

export default function MyIcon({ size = 24, className, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="..." />
    </svg>
  )
}
```

### Key Features

- ✅ **JSX-compatible** - All attributes converted to camelCase
- ✅ **AI-platform ready** - Works with Base44, Cursor, etc.
- ✅ **Themeable** - Uses `currentColor` for easy styling
- ✅ **Responsive** - No fixed dimensions, controlled via props/CSS
- ✅ **Optimized** - Minimal file size with SVGO

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | No | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Your Supabase anonymous key |
| `REMOVE_BG_API_KEY` | No | Your remove.bg API key |

## 🚢 Deployment

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/asset-bridge)

Or build manually:

```bash
npm run build
npm start
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

Built with ❤️ for AI coding workflows
