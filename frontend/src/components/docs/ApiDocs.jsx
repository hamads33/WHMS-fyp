"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Layers, Zap } from "lucide-react";
import { DocsSidebar } from "./DocsSidebar";
import { EndpointGroup } from "./EndpointGroup";

/* ── spec parser ─────────────────────────────────────────── */

function parseSpec(spec) {
  if (!spec?.paths) return [];

  const groups = new Map();

  // Preserve tag order from spec
  if (spec.tags) {
    spec.tags.forEach((t) => {
      groups.set(t.name, { tag: t.name, description: t.description || "", endpoints: [] });
    });
  }

  Object.entries(spec.paths).forEach(([path, pathItem]) => {
    ["get", "post", "put", "patch", "delete", "options"].forEach((method) => {
      const op = pathItem[method];
      if (!op) return;

      const tags = op.tags?.length ? op.tags : ["Other"];
      tags.forEach((tag) => {
        if (!groups.has(tag)) groups.set(tag, { tag, description: "", endpoints: [] });
        groups.get(tag).endpoints.push({ id: `${method}-${path}`, method, path, ...op });
      });
    });
  });

  return Array.from(groups.values()).filter((g) => g.endpoints.length > 0);
}

/* ── component ───────────────────────────────────────────── */

export function ApiDocs({ spec }) {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const sectionRefs = useRef({});

  const allGroups = parseSpec(spec);
  const schemas   = spec?.components?.schemas || {};

  /* Search filter */
  const groups = search.trim()
    ? allGroups
        .map((g) => ({
          ...g,
          endpoints: g.endpoints.filter(
            (ep) =>
              ep.path.toLowerCase().includes(search.toLowerCase()) ||
              ep.method.toLowerCase().includes(search.toLowerCase()) ||
              ep.summary?.toLowerCase().includes(search.toLowerCase()) ||
              g.tag.toLowerCase().includes(search.toLowerCase())
          ),
        }))
        .filter((g) => g.endpoints.length > 0)
    : allGroups;

  /* Active section via IntersectionObserver */
  useEffect(() => {
    const observers = [];

    groups.forEach(({ tag }) => {
      const el = sectionRefs.current[tag];
      if (!el) return;

      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveTag(tag); },
        { rootMargin: "-5% 0px -75% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [groups]);

  const scrollToTag = useCallback((tag) => {
    sectionRefs.current[tag]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveTag(tag);
  }, []);

  /* Error state */
  if (!spec) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center max-w-sm px-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mx-auto mb-4">
            <Zap className="h-5 w-5 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Failed to load API spec</h2>
          <p className="text-sm text-muted-foreground">
            Make sure the backend is running at{" "}
            <code className="font-mono bg-muted px-1 rounded">localhost:4000</code> and the{" "}
            <code className="font-mono bg-muted px-1 rounded">/api/openapi.json</code> endpoint is
            reachable.
          </p>
        </div>
      </div>
    );
  }

  const totalEndpoints = allGroups.reduce((a, g) => a + g.endpoints.length, 0);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Sidebar ── */}
      <DocsSidebar
        groups={groups}
        activeTag={activeTag}
        onTagClick={scrollToTag}
        search={search}
        onSearchChange={setSearch}
        spec={spec}
      />

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto scroll-smooth">
        <div className="max-w-4xl mx-auto px-6 py-10">

          {/* Page header */}
          <header className="mb-10">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary flex-shrink-0">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-bold text-foreground tracking-tight">
                  {spec.info?.title || "API Documentation"}
                </h1>
                {spec.info?.description && (
                  <p className="text-muted-foreground mt-1 leading-relaxed text-sm max-w-xl">
                    {spec.info.description}
                  </p>
                )}
              </div>
            </div>

            {/* Meta pills */}
            <div className="flex flex-wrap items-center gap-2 mt-5">
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                <Layers className="h-3 w-3" />
                OpenAPI {spec.openapi || "3.0.3"}
              </span>
              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-mono text-muted-foreground">
                v{spec.info?.version || "1.0.0"}
              </span>
              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                {allGroups.length} tag{allGroups.length !== 1 ? "s" : ""}
              </span>
              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                {totalEndpoints} endpoint{totalEndpoints !== 1 ? "s" : ""}
              </span>
              {spec.servers?.[0]?.url && (
                <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-mono text-muted-foreground">
                  {spec.servers[0].url}
                </span>
              )}
            </div>
          </header>

          <Separator className="mb-10" />

          {/* Endpoint groups */}
          {groups.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-sm">
                No endpoints match &ldquo;{search}&rdquo;
              </p>
            </div>
          ) : (
            <div className="space-y-14">
              {groups.map((group) => (
                <div
                  key={group.tag}
                  ref={(el) => (sectionRefs.current[group.tag] = el)}
                  className="scroll-mt-6"
                >
                  <EndpointGroup group={group} schemas={schemas} />
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <Separator className="mt-14 mb-6" />
          <p className="text-center text-xs text-muted-foreground">
            {spec.info?.title} · v{spec.info?.version} · Generated from OpenAPI spec
          </p>
        </div>
      </main>
    </div>
  );
}
