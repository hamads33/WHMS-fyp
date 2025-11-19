"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  PluginItem,
  ActionItem,
  PluginUploadResponse,
} from "@/app/automation/utils/types";
import {
  listPlugins,
  uploadPlugin,
  listActions,
} from "@/app/automation/utils/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import PluginActionTestClient from "./plugin-action-test-client";
import { FileText } from "lucide-react";

export default function PluginsClient({
  initialPlugins,
  initialActions,
}: {
  initialPlugins: PluginItem[];
  initialActions: ActionItem[];
}) {
  const [plugins, setPlugins] = useState<PluginItem[]>(initialPlugins || []);
  const [actions, setActions] = useState<ActionItem[]>(initialActions || []);
  const [selected, setSelected] = useState<PluginItem | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  const [openUpload, setOpenUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const [uploading, setUploading] = useState(false);

  // -----------------------------
  // Refresh plugins + actions
  // -----------------------------
  const refresh = useCallback(async () => {
    try {
      const p = await listPlugins();
      const a = await listActions();
      setPlugins(p || []);
      setActions(a || []);
    } catch (err: any) {
      toast.error("Failed to refresh plugins/actions");
    }
  }, []);

  // -----------------------------
  // Sync initial props
  // -----------------------------
  useEffect(() => {
    setPlugins(initialPlugins || []);
    setActions(initialActions || []);
  }, [initialPlugins, initialActions]);

  // -----------------------------
  // Drag & Drop Upload Area
  // -----------------------------
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      el.classList.add("ring", "ring-sky-300");
    };

    const onDragLeave = () => {
      el.classList.remove("ring", "ring-sky-300");
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      el.classList.remove("ring", "ring-sky-300");

      const f = e.dataTransfer?.files?.[0] ?? null;
      if (f && f.name.endsWith(".zip")) setFile(f);
      else toast.error("Please drop a .zip file");
    };

    el.addEventListener("dragover", onDragOver as any);
    el.addEventListener("dragleave", onDragLeave as any);
    el.addEventListener("drop", onDrop as any);

    return () => {
      el.removeEventListener("dragover", onDragOver as any);
      el.removeEventListener("dragleave", onDragLeave as any);
      el.removeEventListener("drop", onDrop as any);
    };
  }, []);

  // -----------------------------
  // File input handler
  // -----------------------------
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && !f.name.endsWith(".zip"))
      return toast.error("Only .zip allowed");

    setFile(f);
  };

  // -----------------------------
  // Upload Plugin
  // -----------------------------
  const doUpload = async () => {
    if (!file) return;

    setUploading(true);

    try {
      const res: PluginUploadResponse = await uploadPlugin(file);

      toast.success("Upload successful");

      // Backend may return "installed" or "plugin"
      const p = res.installed ?? res.plugin;

      if (p) {
        toast.success(
          `Installed: ${p.name ?? p.id} ${p.version ? `v${p.version}` : ""}`
        );
      }

      setFile(null);
      setOpenUpload(false);

      await refresh();
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // -----------------------------------------------------
  // Render
  // -----------------------------------------------------
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* -------------------------------------------
           LEFT SIDE: PLUGIN GRID
      -------------------------------------------- */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Installed plugins extend the automation engine.
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={refresh} variant="ghost">
              Refresh
            </Button>

            <Dialog open={openUpload} onOpenChange={setOpenUpload}>
              <DialogTrigger asChild>
                <Button>Upload Plugin</Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Plugin (ZIP)</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                  <div
                    ref={dropRef}
                    onClick={() =>
                      document.getElementById("plugin-upload-input")?.click()
                    }
                    className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="w-6 h-6 text-slate-500" />
                      <div>
                        <div className="font-medium">
                          Drag & drop a ZIP file here
                        </div>
                        <div className="text-sm text-slate-500">
                          or click to choose
                        </div>
                      </div>
                    </div>
                  </div>

                  <input
                    id="plugin-upload-input"
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={handleFileInput}
                  />

                  {file && (
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded">
                      <div>
                        <div className="font-medium">{file.name}</div>
                        <div className="text-sm text-slate-500">
                          {Math.round(file.size / 1024)} KB
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={() => setFile(null)}>
                          Remove
                        </Button>

                        <Button disabled={uploading} onClick={doUpload}>
                          {uploading ? "Uploading..." : "Upload"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenUpload(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* -------------------------------------------
            PLUGIN LIST GRID
        -------------------------------------------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {plugins.length === 0 ? (
            <div className="text-sm text-slate-500">
              No plugins installed.
            </div>
          ) : (
            plugins.map((p) => (
              <Card
                key={p.id}
                className="border hover:shadow-sm cursor-pointer"
                onClick={() => {
                  setSelected(p);
                  setSelectedActionId(null);
                }}
              >
                <CardHeader className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <div className="text-sm text-slate-500">
                      {p.description ?? ""}
                    </div>
                  </div>
                  <Badge>{p.version ?? "—"}</Badge>
                </CardHeader>

                <CardContent>
                  <div className="text-sm text-slate-600 mb-2">
                    ID: <span className="font-mono">{p.id}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(p);
                        setSelectedActionId(null);
                      }}
                    >
                      Inspect
                    </Button>

                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(p);
                      }}
                    >
                      Actions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* -------------------------------------------
          RIGHT SIDE: PLUGIN DETAILS
      -------------------------------------------- */}
      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Plugin Details</CardTitle>
          </CardHeader>

          <CardContent>
            {!selected ? (
              <div className="text-sm text-slate-500">
                Select a plugin to inspect metadata & actions.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm">
                  <div className="font-medium">{selected.name}</div>

                  <div className="text-xs text-slate-500">
                    ID:{" "}
                    <span className="font-mono">{selected.id}</span>
                  </div>
                </div>

                <div className="text-sm text-slate-600">
                  {selected.description}
                </div>

                {/* ACTIONS LIST */}
                <div>
                  <div className="text-xs text-slate-500 mt-2 mb-1">
                    Actions provided by this plugin
                  </div>

                  <div className="space-y-2">
                    {actions.filter(
                      (a) =>
                        a.pluginId === selected.id ||
                        a.source === selected.id
                    ).length === 0 ? (
                      <div className="text-sm text-slate-500">
                        No actions exposed.
                      </div>
                    ) : (
                      actions
                        .filter(
                          (a) =>
                            a.pluginId === selected.id ||
                            a.source === selected.id
                        )
                        .map((act) => (
                          <div
                            key={act.id}
                            className="p-2 border rounded flex items-start justify-between"
                          >
                            <div>
                              <div className="font-medium">{act.name}</div>
                              <div className="text-xs text-slate-500">
                                id:{" "}
                                <span className="font-mono">{act.id}</span>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedActionId(act.id)}
                            >
                              Test
                            </Button>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* RAW MANIFEST */}
                <div className="mt-3">
                  <div className="text-xs text-slate-500 mb-2">
                    Raw Manifest
                  </div>

                  <pre className="text-sm bg-slate-50 p-3 rounded overflow-auto">
                    {JSON.stringify(selected, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ACTION TESTER */}
        {selectedActionId && (
          <Card>
            <CardHeader>
              <CardTitle>
                Test Action —{" "}
                {actions.find((a) => a.id === selectedActionId)?.name ??
                  selectedActionId}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <PluginActionTestClient
                action={
                  actions.find((a) => a.id === selectedActionId)!
                }
              />
            </CardContent>
          </Card>
        )}
      </aside>
    </div>
  );
}
