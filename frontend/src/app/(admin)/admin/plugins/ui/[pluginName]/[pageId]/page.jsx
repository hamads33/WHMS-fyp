"use client";

import { use, useEffect, useState, useRef } from "react";
import { AlertCircle, RefreshCw, ExternalLink, Puzzle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiFetch } from "@/lib/api/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
// Plugin UI assets are served from backend, strip /api suffix
const BACKEND_BASE = API_BASE.replace(/\/api$/, "");

/**
 * Dynamic plugin UI page.
 * Renders a plugin-contributed page identified by pluginName + pageId.
 *
 * The backend serves the plugin's HTML page at:
 *   /plugins/{pluginName}/ui-data/{pageId}   → JSON data
 *   /api/admin/plugin-ui-manifest            → all plugin nav entries
 *
 * We fetch the UI manifest to find the page entry, then render the plugin
 * HTML in a sandboxed iframe using the backend static asset serving.
 *
 * Plugin HTML is served at: GET /api/plugins/{pluginName}/ui/{pageId}
 */
export default function PluginUiPage({ params }) {
  const { pluginName, pageId } = use(params);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [manifest, setManifest] = useState(null);
  const iframeRef               = useRef(null);

  // The plugin page HTML URL — served directly from backend
  const iframeSrc = `${BACKEND_BASE}/api/plugins/${encodeURIComponent(pluginName)}/ui/${encodeURIComponent(pageId)}`;

  useEffect(() => {
    apiFetch("/admin/plugin-ui-manifest")
      .then(res => {
        const entries = res?.data ?? [];
        const entry = entries.find(e => e.plugin === pluginName);
        if (!entry) throw new Error(`Plugin "${pluginName}" not found or has no UI`);
        const page = entry.pages?.find(p => p.id === pageId);
        if (!page) throw new Error(`Page "${pageId}" not found in plugin "${pluginName}"`);
        setManifest({ plugin: entry, page });
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [pluginName, pageId]);

  const handleIframeLoad = () => {};
  const handleIframeError = () => setError("Failed to load plugin page");

  const reload = () => {
    setError(null);
    if (iframeRef.current) {
      iframeRef.current.src = iframeSrc;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-[70vh] w-full rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-foreground capitalize">
          {pluginName} / {pageId}
        </h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={reload} className="gap-2">
          <RefreshCw className="h-4 w-4" />Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg border bg-muted flex items-center justify-center">
            <Puzzle className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground leading-none">
              {manifest?.page?.label ?? pageId}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {manifest?.plugin?.displayName ?? pluginName}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={reload} className="gap-2">
            <RefreshCw className="h-4 w-4" />Reload
          </Button>
          <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground">
            <a href={iframeSrc} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />Open
            </a>
          </Button>
        </div>
      </div>

      {/* Iframe */}
      <Card className="flex-1 overflow-hidden p-0">
        <CardContent className="p-0 h-full">
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            title={`${pluginName} — ${pageId}`}
            className="w-full h-full min-h-[70vh] border-0 rounded-lg"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        </CardContent>
      </Card>
    </div>
  );
}
