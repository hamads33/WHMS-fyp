"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Star, Trash2, RefreshCw, MessageSquare, Search, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { StarRating } from "@/components/marketplace/StarRating";
import MarketplaceAPI from "@/lib/api/marketplace";
import { formatDate } from "@/lib/utils";

function ReviewRow({ review, onDelete }) {
  return (
    <div className="flex items-start gap-4 py-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground select-none">
        {review.userId?.slice(0, 2)?.toUpperCase() ?? "U"}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <StarRating rating={review.rating ?? 0} size={13} showValue={false} />
          <Badge variant="outline" className="text-xs">{review.rating}/5</Badge>
          {review.title && <span className="font-medium text-sm text-foreground">{review.title}</span>}
        </div>
        {review.text && <p className="text-sm text-muted-foreground line-clamp-2">{review.text}</p>}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {review.product && (
            <span>Plugin: <span className="font-medium text-foreground">{review.product.name}</span></span>
          )}
          <span>{formatDate(review.createdAt, "short")}</span>
        </div>
      </div>

      <Button
        size="sm"
        variant="ghost"
        className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => onDelete(review)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-start gap-4 py-4">
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex gap-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-32" /></div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-40" />
      </div>
      <Skeleton className="h-8 w-8 shrink-0" />
    </div>
  );
}

export default function ReviewsManagementPage() {
  const [reviews, setReviews]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [deleting, setDeleting]   = useState(null); // review to delete
  const [confirming, setConfirming] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await MarketplaceAPI.listReviews();
      setReviews(data);
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to load reviews", description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleting) return;
    setConfirming(true);
    try {
      await MarketplaceAPI.deleteReview(deleting.id);
      toast({ title: "Review deleted" });
      setDeleting(null);
      await load();
    } catch (err) {
      toast({ variant: "destructive", title: "Delete failed", description: err.message });
    } finally {
      setConfirming(false);
    }
  };

  const filtered = reviews.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.text?.toLowerCase().includes(q) ||
      r.title?.toLowerCase().includes(q) ||
      r.product?.name?.toLowerCase().includes(q)
    );
  });

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Reviews & Ratings</h1>
          <p className="text-sm text-muted-foreground mt-1">Moderate user reviews submitted to the marketplace.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 shrink-0">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{reviews.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Reviews</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-500">{avgRating}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Avg Rating</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {[...new Set(reviews.map(r => r.productId))].length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Reviewed Plugins</p>
          </CardContent></Card>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search reviews…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-base">
            {loading ? "Loading…" : `${filtered.length} review${filtered.length !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 px-4 divide-y divide-border">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No reviews found</p>
            </div>
          ) : (
            filtered.map(review => (
              <ReviewRow key={review.id} review={review} onDelete={r => setDeleting(r)} />
            ))
          )}
        </CardContent>
      </Card>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleting} onOpenChange={v => !v && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Review</DialogTitle>
            <DialogDescription>
              This will permanently remove the review from the marketplace. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={confirming}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={confirming} className="gap-2">
              {confirming && <RefreshCw className="h-4 w-4 animate-spin" />}
              Delete Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
