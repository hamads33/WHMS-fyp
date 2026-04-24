// ========================================
import { Star } from "lucide-react"

export function StarRating({ rating, size = 16, showValue = true }) {
  return (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={size}
          className={
            i < Math.floor(rating) 
              ? "fill-yellow-400 text-yellow-400" 
              : "text-muted-foreground"
          }
        />
      ))}
      {showValue && (
        <span className="text-sm text-muted-foreground ml-1">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  )
}