"use client"

import { useState, useEffect } from "react"
import { Star, Share2, ArrowLeft, MessageCircle, ThumbsUp, Download, AlertCircle, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel"
import { StarRating } from "@/components/marketplace/StarRating"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { usePluginDetail } from "@/hooks/useMarketplace"
import { MarketplaceAPI } from "@/lib/api/marketplace"
import { useToast } from "@/hooks/useToast"
import { formatNumber, formatPrice, formatDate } from "@/lib/utils"

export default function PluginDetailClient({ pluginId }) {
  const { plugin, loading, error, installPlugin, addToFavorites } = usePluginDetail(pluginId)
  const [activeTab, setActiveTab] = useState("overview")
  const [helpfulReviews, setHelpfulReviews] = useState({})
  const [reviews, setReviews] = useState([])
  const [relatedPlugins, setRelatedPlugins] = useState([])
  const [installing, setInstalling] = useState(false)
  const { toast } = useToast()

  // Fetch reviews
  useEffect(() => {
    if (!pluginId) return
    
    async function fetchReviews() {
      try {
        const data = await MarketplaceAPI.getPluginReviews(pluginId, { limit: 10 })
        setReviews(data.reviews || data.data || [])
      } catch (err) {
        console.error("Failed to fetch reviews:", err)
      }
    }
    
    fetchReviews()
  }, [pluginId])

  // Fetch related plugins
  useEffect(() => {
    if (!pluginId) return
    
    async function fetchRelated() {
      try {
        const data = await MarketplaceAPI.getRelatedPlugins(pluginId, 3)
        setRelatedPlugins(data.plugins || data.data || [])
      } catch (err) {
        console.error("Failed to fetch related plugins:", err)
      }
    }
    
    fetchRelated()
  }, [pluginId])

  const handleInstall = async () => {
    setInstalling(true)
    const result = await installPlugin()
    setInstalling(false)

    if (result.success) {
      toast({
        title: "Success!",
        description: "Plugin installed successfully",
        variant: "default",
      })
    } else {
      toast({
        title: "Installation Failed",
        description: result.error,
        variant: "destructive",
      })
    }
  }

  const handleFavorite = async () => {
    const result = await addToFavorites()
    if (result.success) {
      toast({
        title: "Added to Favorites",
        description: "Plugin added to your favorites",
        variant: "default",
      })
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    }
  }

  const handleMarkHelpful = async (reviewId) => {
    try {
      await MarketplaceAPI.markReviewHelpful(pluginId, reviewId)
      setHelpfulReviews({ ...helpfulReviews, [reviewId]: true })
      toast({
        title: "Thanks for your feedback!",
        variant: "default",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !plugin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Plugin not found</h1>
          <p className="text-muted-foreground mb-4">{error || "The plugin you're looking for doesn't exist."}</p>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  const ratingDistribution = plugin.ratingDistribution || {
    5: 0, 4: 0, 3: 0, 2: 0, 1: 0
  }
  const totalRatings = Object.values(ratingDistribution).reduce((a, b) => a + b, 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Button variant="ghost" className="mb-4 gap-2" onClick={() => window.history.back()}>
            <ArrowLeft size={16} />
            Back
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Plugin Info */}
            <div className="lg:col-span-2">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-24 h-24 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {plugin.icon ? (
                    <img src={plugin.icon} alt={plugin.name} className="w-20 h-20 object-contain" />
                  ) : (
                    <div className="text-4xl font-bold text-primary">{plugin.name[0]}</div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-3xl font-bold text-foreground">{plugin.name}</h1>
                    {plugin.status === "verified" && (
                      <Badge variant="outline" className="text-xs">Verified</Badge>
                    )}
                    {plugin.status === "featured" && (
                      <Badge className="text-xs bg-primary">Featured</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mb-3">{plugin.category}</p>
                  <StarRating rating={plugin.rating || 0} size={20} />
                </div>
              </div>

              <p className="text-foreground mb-4">{plugin.description}</p>
            </div>

            {/* Stats Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="p-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Downloads</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatNumber(plugin.downloads || 0)}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Rating</p>
                    <p className="text-2xl font-bold text-foreground">{plugin.rating || "N/A"}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Version</p>
                    <p className="text-2xl font-bold text-foreground">v{plugin.version || "1.0.0"}</p>
                  </div>
                </div>
              </Card>

              {/* Developer Info */}
              <Card className="p-4">
                <h3 className="font-semibold text-foreground mb-4">Developer</h3>
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={plugin.developerImage} />
                    <AvatarFallback>{plugin.developer?.[0] || "D"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{plugin.developer || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">Official Developer</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  View Profile
                </Button>
              </Card>

              {/* Related Plugins */}
              {relatedPlugins.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-semibold text-foreground mb-4">Related Plugins</h3>
                  <div className="space-y-3">
                    {relatedPlugins.map((related) => (
                      <div
                        key={related.id}
                        className="p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors cursor-pointer"
                        onClick={() => window.location.href = `/marketplace/${related.slug || related.id}`}
                      >
                        <p className="font-semibold text-foreground text-sm mb-1">{related.name}</p>
                        <div className="flex items-center justify-between">
                          <StarRating rating={related.rating || 0} showValue={false} />
                          <span className="text-xs text-muted-foreground">
                            {formatPrice(related.price || 0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Action Buttons */}
        <div className="flex gap-3 mb-8">
          <Button 
            className="gap-2 bg-primary" 
            onClick={handleInstall}
            disabled={installing}
          >
            <Download size={16} />
            {installing ? "Installing..." : "Install Plugin"}
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleFavorite}>
            <Heart size={16} />
            Add to Favorites
          </Button>
          <Button variant="outline" className="gap-2">
            <Share2 size={16} />
            Share
          </Button>
        </div>

        {/* System Requirements */}
        {plugin.requirements && (
          <Alert className="mb-8 bg-muted">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>System Requirements:</strong> {plugin.requirements}
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="border-b">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
            <TabsTrigger value="changelog">Changelog</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {plugin.features && plugin.features.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Features</h2>
                <ul className="space-y-3">
                  {plugin.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {plugin.screenshots && plugin.screenshots.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Screenshots</h2>
                <Carousel>
                  <CarouselContent>
                    {plugin.screenshots.map((screenshot, i) => (
                      <CarouselItem key={i}>
                        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                          <img src={screenshot} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              </Card>
            )}

            {plugin.installation && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Installation</h2>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
                  {plugin.installation}
                </pre>
              </Card>
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6 mt-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-6">Rating Summary</h2>
              <div className="flex items-center gap-8 mb-6">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">{plugin.rating || "N/A"}</div>
                  <StarRating rating={plugin.rating || 0} size={20} />
                  <p className="text-sm text-muted-foreground mt-2">{totalRatings} ratings</p>
                </div>

                <div className="flex-1 space-y-3">
                  {[5, 4, 3, 2, 1].map((stars) => (
                    <div key={stars} className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-12">{stars} ★</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: totalRatings > 0 
                              ? `${(ratingDistribution[stars] / totalRatings) * 100}%` 
                              : '0%',
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {ratingDistribution[stars] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Button className="w-full gap-2">
              <MessageCircle size={16} />
              Write a Review
            </Button>

            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={review.avatar} />
                        <AvatarFallback>{review.author?.[0] || "U"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{review.author}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(review.date || review.createdAt)}
                        </p>
                      </div>
                    </div>
                    <StarRating rating={review.rating || 0} showValue={false} />
                  </div>

                  <p className="font-semibold mb-2">{review.title}</p>
                  <p className="text-sm mb-4">{review.content}</p>

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleMarkHelpful(review.id)}
                  >
                    <ThumbsUp
                      size={16}
                      className={helpfulReviews[review.id] ? "fill-primary text-primary" : ""}
                    />
                    Helpful ({review.helpful || 0})
                  </Button>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Changelog Tab */}
          <TabsContent value="changelog" className="space-y-4 mt-6">
            {plugin.changelog?.map((entry, i) => (
              <Collapsible key={i} defaultOpen={i === 0}>
                <CollapsibleTrigger asChild>
                  <Card className="p-4 cursor-pointer hover:border-primary/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">v{entry.version}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(entry.date)}
                        </p>
                      </div>
                      <Badge variant="outline">{i === 0 ? "Latest" : "Previous"}</Badge>
                    </div>
                  </Card>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 ml-4 border-l-2 pl-4">
                  <ul className="space-y-2">
                    {entry.changes?.map((change, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6 mt-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Plugin Information</h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-semibold">{plugin.version || "1.0.0"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-semibold">{plugin.category || "General"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Release Date</span>
                  <span className="font-semibold">
                    {formatDate(plugin.releaseDate || plugin.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-semibold">{formatPrice(plugin.price || 0)}</span>
                </div>
              </div>
            </Card>

            {plugin.dependencies && plugin.dependencies.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Dependencies</h2>
                <div className="space-y-2">
                  {plugin.dependencies.map((dep, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      {dep}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">License & Links</h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">License</span>
                  <span className="font-semibold">{plugin.license || "MIT"}</span>
                </div>
                {plugin.repository && (
                  <a
                    href={plugin.repository}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-primary hover:underline font-semibold"
                  >
                    View Repository →
                  </a>
                )}
                {plugin.documentation && (
                  <a
                    href={plugin.documentation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-primary hover:underline font-semibold"
                  >
                    View Documentation →
                  </a>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}