import Link from "next/link"
import { Download, ShoppingCart } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StarRating } from "./StarRating"
import { formatNumber, formatPrice } from "@/lib/utils"

export function PluginCard({ plugin, onInstall }) {
  const handleInstall = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onInstall?.(plugin.id)
  }

  return (
    <Link href={`/marketplace/${plugin.slug || plugin.id}`}>
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
                {plugin.name[0]}
              </div>
            </div>
          )}
          
          {plugin.status && (
            <div className="absolute top-2 right-2">
              {plugin.status === "verified" && (
                <Badge variant="outline" className="text-xs">Verified</Badge>
              )}
              {plugin.status === "featured" && (
                <Badge className="text-xs bg-primary">Featured</Badge>
              )}
              {plugin.status === "new" && (
                <Badge className="text-xs bg-accent">New</Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 p-4 flex flex-col">
          <h3 className="font-semibold text-foreground line-clamp-2 mb-2">
            {plugin.name}
          </h3>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {plugin.description}
          </p>

          <div className="space-y-2 mb-4">
            <div className="text-xs text-muted-foreground">
              {plugin.developer || plugin.author}
            </div>
            <StarRating rating={plugin.rating || 0} />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Download size={14} />
              {formatNumber(plugin.downloads || 0)} downloads
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 mt-auto pt-4 border-t">
            <div className="font-semibold text-foreground">
              {formatPrice(plugin.price || 0)}
            </div>
            <Button size="sm" className="gap-1" onClick={handleInstall}>
              <ShoppingCart size={16} />
              Install
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  )
}