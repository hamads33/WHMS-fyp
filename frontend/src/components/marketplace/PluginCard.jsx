import Link from "next/link"
import { Download, ShoppingCart, BadgeCheck, Sparkles, LayoutDashboard } from "lucide-react" // Download already imported
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StarRating } from "./StarRating"
import { CapabilityBadges } from "@/components/plugins/PluginCapabilityBadges"
import { formatNumber, formatPrice } from "@/lib/utils"

// ── Status badges overlaid on card hero ───────────────────────────────────────

function HeroBadges({ plugin }) {
  const isFeatured = plugin.featured || plugin.status === "featured"
  const isVerified = plugin.verified || plugin.status === "verified"
  const hasUi      = plugin.capabilities?.includes("ui") ||
                     plugin.ui?.adminPages?.length > 0

  return (
    <>
      {/* Left stack: Featured / Verified / Has UI */}
      <div className="absolute top-2 left-2 flex flex-col gap-1">
        {isFeatured && (
          <Badge className="text-[10px] px-1.5 py-0.5 gap-0.5 bg-primary text-primary-foreground">
            <Sparkles className="w-2.5 h-2.5" />Featured
          </Badge>
        )}
        {isVerified && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 gap-0.5 bg-background">
            <BadgeCheck className="w-2.5 h-2.5 text-blue-500" />Verified
          </Badge>
        )}
        {hasUi && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 gap-0.5 bg-background text-blue-600 border-blue-200">
            <LayoutDashboard className="w-2.5 h-2.5" />Has UI
          </Badge>
        )}
      </div>

      {/* Right: "new" badge kept from original */}
      {plugin.status === "new" && (
        <div className="absolute top-2 right-2">
          <Badge className="text-xs bg-accent">New</Badge>
        </div>
      )}
    </>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function PluginCard({ plugin, onInstall, detailHref }) {
  const handleInstall = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onInstall?.(plugin.slug || plugin.id)
  }

  const capabilities = plugin.capabilities ?? []

  return (
    <Link href={detailHref ?? `/marketplace/${plugin.slug || plugin.id}`}>
      <Card className="flex flex-col overflow-hidden hover:border-primary/50 transition-colors cursor-pointer h-full">
        <div className="h-40 bg-muted flex items-center justify-center relative">
          {plugin.icon ? (
            <img
              src={plugin.icon}
              alt={plugin.name}
              className="w-20 h-20 object-contain"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center">
              <div className="text-2xl font-bold text-primary">
                {plugin.name?.[0] ?? "P"}
              </div>
            </div>
          )}

          <HeroBadges plugin={plugin} />
        </div>

        <div className="flex-1 p-4 flex flex-col">
          <h3 className="font-semibold text-foreground line-clamp-2 mb-1">
            {plugin.name}
          </h3>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {plugin.description}
          </p>

          {/* Capability icons */}
          {capabilities.length > 0 && (
            <div className="mb-3">
              <CapabilityBadges capabilities={capabilities} size="xs" />
            </div>
          )}

          <div className="space-y-1.5 mb-4">
            <div className="text-xs text-muted-foreground">
              {plugin.developer || plugin.author}
            </div>
            <StarRating rating={plugin.rating || 0} />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Download size={13} />
              {formatNumber(plugin.downloads || 0)} downloads
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 mt-auto pt-4 border-t">
            <div className="font-semibold text-foreground">
              {plugin.pricingType === "free" || !plugin.price
                ? <span className="text-green-600 dark:text-green-400">Free</span>
                : plugin.pricingType === "subscription"
                  ? <span className="text-purple-600 dark:text-purple-400">${(plugin.price / 100).toFixed(2)}/{plugin.interval ?? "mo"}</span>
                  : <span className="text-blue-600 dark:text-blue-400">${(plugin.price / 100).toFixed(2)}</span>
              }
            </div>
            <Button size="sm" className="gap-1" onClick={handleInstall}>
              {plugin.pricingType === "free" ? (
                <><Download size={14} />Install</>
              ) : (
                <><ShoppingCart size={14} />Buy</>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  )
}