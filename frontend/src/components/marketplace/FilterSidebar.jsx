import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"

export function FilterSidebar({
  categories,
  selectedCategory,
  onCategoryChange,
  priceRange,
  onPriceRangeChange,
  selectedRating,
  onRatingChange,
  statusOptions,
  selectedStatuses,
  onStatusChange,
  onClearFilters
}) {
  return (
    <div className="space-y-6 sticky top-24">
      {/* Category Filter */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">Category</h3>
        <div className="space-y-2">
          {categories.map((cat) => (
            <label key={cat} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
              <Checkbox 
                checked={selectedCategory === cat} 
                onCheckedChange={() => onCategoryChange(cat)} 
              />
              <span className="text-sm text-foreground">{cat}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">Price Range</h3>
        <div className="space-y-3">
          <Slider
            value={priceRange}
            onValueChange={onPriceRangeChange}
            min={0}
            max={50}
            step={1}
            className="w-full"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>${priceRange[0]}</span>
            <span>${priceRange[1]}</span>
          </div>
        </div>
      </div>

      {/* Rating Filter */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">Minimum Rating</h3>
        <RadioGroup value={selectedRating} onValueChange={onRatingChange}>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="all" id="all" />
            <Label htmlFor="all" className="text-sm cursor-pointer">All ratings</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="4" id="4-stars" />
            <Label htmlFor="4-stars" className="text-sm cursor-pointer">4.0+ stars</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="4.5" id="4.5-stars" />
            <Label htmlFor="4.5-stars" className="text-sm cursor-pointer">4.5+ stars</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="4.8" id="4.8-stars" />
            <Label htmlFor="4.8-stars" className="text-sm cursor-pointer">4.8+ stars</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Status Filter */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">Status</h3>
        <div className="space-y-2">
          {statusOptions.map((status) => (
            <label
              key={status.value}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <Checkbox
                checked={selectedStatuses.includes(status.value)}
                onCheckedChange={(checked) => onStatusChange(status.value, checked)}
              />
              <span className="text-sm text-foreground">{status.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      <Button
        variant="outline"
        className="w-full text-foreground border-border bg-transparent"
        onClick={onClearFilters}
      >
        Clear Filters
      </Button>
    </div>
  )
}