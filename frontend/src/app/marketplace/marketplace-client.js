"use client"

import Link from "next/link"
import { useState, useCallback } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { PluginCard } from "@/components/marketplace/PluginCard"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { useMarketplace } from "@/hooks/useMarketplace"
import { MarketplaceAPI } from "@/lib/api/marketplace"
import { debounce } from "@/lib/utils"
import { useToast } from "@/hooks/useToast"

const categories = ["All", "Development", "Design", "Productivity", "Utilities", "Analytics", "Appearance"]
const statusOptions = [
  { label: "Verified", value: "verified" },
  { label: "Featured", value: "featured" },
  { label: "New", value: "new" },
]

function Skeleton() {
  return <Card className="h-[400px] bg-muted animate-pulse rounded-lg" />
}

export default function MarketplaceClient() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [priceRange, setPriceRange] = useState([0, 50])
  const [selectedRating, setSelectedRating] = useState("all")
  const [selectedStatuses, setSelectedStatuses] = useState([])
  const [sortBy, setSortBy] = useState("popularity")

  const { toast } = useToast()

  // Fetch plugins with filters
  const { plugins, loading, error, pagination, search, filter } = useMarketplace({
    page: 1,
    limit: 20,
    sortBy,
  })

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query) => {
      const filters = {
        search: query,
        category: selectedCategory !== "All" ? selectedCategory : undefined,
        priceMin: priceRange[0],
        priceMax: priceRange[1],
        rating: selectedRating !== "all" ? selectedRating : undefined,
        status: selectedStatuses.length > 0 ? selectedStatuses.join(",") : undefined,
        sortBy,
      }
      filter(filters)
    }, 500),
    [selectedCategory, priceRange, selectedRating, selectedStatuses, sortBy]
  )

  const handleSearch = (value) => {
    setSearchQuery(value)
    debouncedSearch(value)
  }

  const applyFilters = () => {
    const filters = {
      search: searchQuery,
      category: selectedCategory !== "All" ? selectedCategory : undefined,
      priceMin: priceRange[0],
      priceMax: priceRange[1],
      rating: selectedRating !== "all" ? selectedRating : undefined,
      status: selectedStatuses.length > 0 ? selectedStatuses.join(",") : undefined,
      sortBy,
    }
    filter(filters)
  }

  const handleInstall = async (pluginId) => {
    try {
      const result = await MarketplaceAPI.installPlugin(pluginId)
      toast({
        title: "Success!",
        description: "Plugin installed successfully",
        variant: "default",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Failed to install plugin",
        variant: "destructive",
      })
    }
  }

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCategory("All")
    setPriceRange([0, 50])
    setSelectedRating("all")
    setSelectedStatuses([])
    filter({})
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Plugin Marketplace</h1>
                <p className="text-sm text-muted-foreground">Discover and install amazing plugins</p>
              </div>
              <Link href="/developer/plugins/dashboard">
                <Button variant="outline">Developer Dashboard</Button>
              </Link>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search plugins..."
                className="pl-10 bg-card"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1">
            <div className="space-y-6 sticky top-24">
              {/* Category Filter */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Category</h3>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedCategory === cat}
                        onCheckedChange={() => {
                          setSelectedCategory(cat)
                          setTimeout(applyFilters, 100)
                        }}
                      />
                      <span className="text-sm text-foreground">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Price Range</h3>
                <div className="space-y-3">
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    onValueCommit={applyFilters}
                    min={0}
                    max={50}
                    step={1}
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
                <RadioGroup
                  value={selectedRating}
                  onValueChange={(val) => {
                    setSelectedRating(val)
                    setTimeout(applyFilters, 100)
                  }}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="text-sm cursor-pointer">
                      All ratings
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="4" id="4-stars" />
                    <Label htmlFor="4-stars" className="text-sm cursor-pointer">
                      4.0+ stars
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="4.5" id="4.5-stars" />
                    <Label htmlFor="4.5-stars" className="text-sm cursor-pointer">
                      4.5+ stars
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Status Filter */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Status</h3>
                <div className="space-y-2">
                  {statusOptions.map((status) => (
                    <label key={status.value} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedStatuses.includes(status.value)}
                        onCheckedChange={(checked) => {
                          const newStatuses = checked
                            ? [...selectedStatuses, status.value]
                            : selectedStatuses.filter((s) => s !== status.value)
                          setSelectedStatuses(newStatuses)
                          setTimeout(applyFilters, 100)
                        }}
                      />
                      <span className="text-sm text-foreground">{status.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              <Button variant="outline" className="w-full" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Sort and Results */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm text-muted-foreground">
                {loading ? "Loading..." : `${pagination.total || plugins.length} plugins found`}
              </div>
              <Select
                value={sortBy}
                onValueChange={(val) => {
                  setSortBy(val)
                  setTimeout(applyFilters, 100)
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popularity">Most Popular</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Error State */}
            {error && (
              <Card className="p-6 mb-6 border-destructive">
                <p className="text-destructive">Error: {error}</p>
                <Button variant="outline" className="mt-4" onClick={() => filter({})}>
                  Retry
                </Button>
              </Card>
            )}

            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} />
                ))}
              </div>
            )}

            {/* Plugin Grid */}
            {!loading && !error && plugins.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plugins.map((plugin) => (
                  <PluginCard key={plugin.id} plugin={plugin} onInstall={handleInstall} />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && plugins.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-5xl mb-4">🔍</div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">No plugins found</h2>
                <p className="text-muted-foreground max-w-sm mb-4">
                  Try adjusting your filters or search query
                </p>
                <Button onClick={clearFilters}>Clear All Filters</Button>
              </div>
            )}

            {/* Pagination */}
            {!loading && plugins.length > 0 && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  disabled={pagination.page === 1}
                  onClick={() => filter({ page: pagination.page - 1 })}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => filter({ page: pagination.page + 1 })}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}