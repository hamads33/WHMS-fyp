// /frontend/app/automation/plugins/upload/page.tsx
"use client";

import React, { useRef, useState } from "react";
import { uploadPlugin, listPlugins } from "@/app/automation/utils/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function PluginsUploadPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const onPick = () => inputRef.current?.click();
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null);

  const onUpload = async () => {
    if (!file) return toast.error("Select a zip file");
    setLoading(true);
    try {
      await uploadPlugin(file);
      toast.success("Uploaded");
      await listPlugins();
      setFile(null);
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow space-y-4">
      <h2 className="text-lg font-medium">Upload Plugin</h2>

      <input ref={inputRef} type="file" accept=".zip" className="hidden" onChange={onFile} />
      <div className="flex gap-3">
        <Button onClick={onPick}>Pick ZIP</Button>
        <Button onClick={onUpload} disabled={!file || loading}>
          {loading ? "Uploading..." : "Upload"}
        </Button>
        <div className="text-sm text-slate-500">{file ? file.name : "No file selected"}</div>
      </div>
    </div>
  );
}
