"use client"

import { useState, useEffect } from "react"
import { ThumbsUp, ThumbsDown, Plus, ExternalLink, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Tool {
  id: string
  name: string
  category: string
  url: string | null
  icon_emoji: string
  icon_slug: string | null
  works: boolean | null
  verified: boolean
  works_votes: number
  doesnt_work_votes: number
  total_votes: number
}

// Get or create session ID for anonymous users
function getSessionId(): string {
  if (typeof window === "undefined") return ""
  let sessionId = localStorage.getItem("ab_session_id")
  if (!sessionId) {
    sessionId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    localStorage.setItem("ab_session_id", sessionId)
  }
  return sessionId
}

export function ToolCompatibility() {
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState<string | null>(null)
  const [showSuggest, setShowSuggest] = useState(false)
  const [newTool, setNewTool] = useState({ name: "", url: "" })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetchTools()
  }, [])

  const fetchTools = async () => {
    try {
      const res = await fetch("/api/tools")
      const data = await res.json()
      if (data.success) {
        setTools(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch tools:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async (toolId: string, works: boolean) => {
    setVoting(toolId)
    try {
      const res = await fetch("/api/tools/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolId,
          works,
          sessionId: getSessionId(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        // Refresh tools to get updated counts
        fetchTools()
      }
    } catch (error) {
      console.error("Failed to vote:", error)
    } finally {
      setVoting(null)
    }
  }

  const handleSuggest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTool.name.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTool.name,
          url: newTool.url || null,
          sessionId: getSessionId(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSubmitted(true)
        setNewTool({ name: "", url: "" })
        setTimeout(() => {
          setShowSuggest(false)
          setSubmitted(false)
        }, 2000)
      }
    } catch (error) {
      console.error("Failed to suggest tool:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (tool: Tool) => {
    if (tool.works === true) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
          <Check className="h-3 w-3" /> Works
        </span>
      )
    }
    if (tool.works === false) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
          ✕ Doesn&apos;t work
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-400">
        ? Unknown
      </span>
    )
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "web_app": return "Web App"
      case "chat": return "Chat"
      case "ide": return "IDE"
      case "html": return "HTML"
      default: return category
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Separate tools by status
  const workingTools = tools.filter(t => t.works === true)
  const notWorkingTools = tools.filter(t => t.works === false)
  const unknownTools = tools.filter(t => t.works === null)

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold">AI Tool Compatibility</h3>
        <p className="text-sm text-muted-foreground">
          See which AI tools work with Asset-Bridge URLs. Vote based on your experience!
        </p>
      </div>

      {/* Working Tools */}
      {workingTools.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-400">
            <Check className="h-4 w-4" /> Verified Working ({workingTools.length})
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {workingTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} voting={voting} onVote={handleVote} getStatusBadge={getStatusBadge} getCategoryLabel={getCategoryLabel} />
            ))}
          </div>
        </div>
      )}

      {/* Not Working Tools */}
      {notWorkingTools.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-400">
            ✕ Known Issues ({notWorkingTools.length})
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {notWorkingTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} voting={voting} onVote={handleVote} getStatusBadge={getStatusBadge} getCategoryLabel={getCategoryLabel} />
            ))}
          </div>
        </div>
      )}

      {/* Unknown/Untested Tools */}
      {unknownTools.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-yellow-400">
            ? Help Us Test ({unknownTools.length})
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {unknownTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} voting={voting} onVote={handleVote} getStatusBadge={getStatusBadge} getCategoryLabel={getCategoryLabel} />
            ))}
          </div>
        </div>
      )}

      {/* Suggest New Tool */}
      <div className="border-t border-border pt-4">
        {!showSuggest ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSuggest(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Suggest a Tool
          </Button>
        ) : submitted ? (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <Check className="h-4 w-4" /> Thanks! We&apos;ll review your suggestion.
          </div>
        ) : (
          <form onSubmit={handleSuggest} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">Tool Name *</label>
              <input
                type="text"
                value={newTool.name}
                onChange={(e) => setNewTool({ ...newTool, name: e.target.value })}
                placeholder="e.g. Cody AI"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                required
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">URL (optional)</label>
              <input
                type="url"
                value={newTool.url}
                onChange={(e) => setNewTool({ ...newTool, url: e.target.value })}
                placeholder="https://..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowSuggest(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// Tooltips for specific tools that don't work
const toolTooltips: Record<string, string> = {
  "Claude Artifacts": "Blocked by Anthropic's security policy. Use inside Cursor via Claude instead.",
}

// Separate component for tool card
function ToolCard({
  tool,
  voting,
  onVote,
  getStatusBadge,
  getCategoryLabel,
}: {
  tool: Tool
  voting: string | null
  onVote: (toolId: string, works: boolean) => void
  getStatusBadge: (tool: Tool) => JSX.Element
  getCategoryLabel: (category: string) => string
}) {
  const tooltip = toolTooltips[tool.name]
  const [logoError, setLogoError] = useState(false)
  
  // Check if icon_slug is a full URL or a Simple Icons slug
  const logoUrl = tool.icon_slug
    ? tool.icon_slug.startsWith('http')
      ? tool.icon_slug
      : `https://cdn.simpleicons.org/${tool.icon_slug}`
    : null
  
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-3">
        {/* Logo or emoji */}
        {logoUrl && !logoError ? (
          <img
            src={logoUrl}
            alt={`${tool.name} logo`}
            className="h-6 w-6"
            onError={() => setLogoError(true)}
          />
        ) : (
          <span className="text-xl">{tool.icon_emoji}</span>
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{tool.name}</span>
            {tool.verified && (
              <span className="text-xs text-blue-400" title="Verified by Asset-Bridge team">✓</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{getCategoryLabel(tool.category)}</span>
            {tool.url && (
              <a href={tool.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {/* Tooltip for tools that don't work */}
          {tooltip && tool.works === false && (
            <p className="mt-1 text-[10px] text-muted-foreground/70 italic max-w-[180px]">
              {tooltip}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {getStatusBadge(tool)}
        
        {/* Vote buttons */}
        <div className="flex items-center gap-1 rounded-lg bg-black/30 p-1">
          <button
            onClick={() => onVote(tool.id, true)}
            disabled={voting === tool.id}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors hover:bg-emerald-500/20 hover:text-emerald-400 disabled:opacity-50"
            title="Works for me"
          >
            <ThumbsUp className="h-3 w-3" />
            {tool.works_votes > 0 && <span>{tool.works_votes}</span>}
          </button>
          <button
            onClick={() => onVote(tool.id, false)}
            disabled={voting === tool.id}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
            title="Doesn't work for me"
          >
            <ThumbsDown className="h-3 w-3" />
            {tool.doesnt_work_votes > 0 && <span>{tool.doesnt_work_votes}</span>}
          </button>
        </div>
      </div>
    </div>
  )
}
