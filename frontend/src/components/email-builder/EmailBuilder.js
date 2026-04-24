'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  DndContext, DragOverlay, closestCenter,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Save, Eye, Undo2, Redo2, ChevronDown,
  Download, Loader2, Check, ArrowLeft, Send, X,
  Keyboard, AlertCircle,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { EmailSettingsAPI } from '@/lib/api/email-settings';
import Link from 'next/link';

import Sidebar from './Sidebar';
import Canvas from './Canvas';
import PropertiesPanel from './PropertiesPanel';
import PreviewModal from './PreviewModal';
import BlockRenderer from './BlockRenderer';
import { useEmailBuilder } from './hooks/useEmailBuilder';
import { useDragDrop } from './hooks/useDragDrop';
import { EmailTemplatesAPI } from '@/lib/api/email-templates';

const DROP_ANIMATION = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: '0.5' } },
  }),
};

const CATEGORIES = ['account', 'billing', 'orders', 'support', 'security', 'marketing', 'notifications', 'general'];

// ── Drag overlay ghost ────────────────────────────────────────────────────────
function DragGhost({ activeItem }) {
  if (!activeItem) return null;

  if (activeItem.type === 'sidebar') {
    return (
      <div className="rounded-lg border-2 border-foreground bg-muted px-4 py-3 shadow-xl min-w-[200px]">
        <p className="text-sm font-semibold text-foreground">{activeItem.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Drop to add block</p>
      </div>
    );
  }

  if (activeItem.block) {
    return (
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-2xl border-2 border-foreground overflow-hidden opacity-95 max-w-sm">
        <BlockRenderer block={activeItem.block} isSelected={false} />
      </div>
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function EmailBuilder({ templateId = null, initialTemplate = null }) {
  const seedHtml = initialTemplate?.bodyHtml || '';

  // ── Meta state ─────────────────────────────────────────────────
  const [meta, setMeta] = useState({
    name:        initialTemplate?.name        || '',
    displayName: initialTemplate?.displayName || 'Untitled Email',
    subject:     initialTemplate?.subject     || '',
    category:    initialTemplate?.category    || 'general',
    language:    initialTemplate?.language    || 'en',
  });
  const [saving,       setSaving]       = useState(false);
  const [saveStatus,   setSaveStatus]   = useState(null);
  const [showPreview,  setShowPreview]  = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [showSendTest, setShowSendTest] = useState(false);
  const [sendTestTo,   setSendTestTo]   = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('email-builder-test-to') || '';
    }
    return '';
  });
  const [sending,      setSending]      = useState(false);
  const [sendResult,   setSendResult]   = useState(null);

  const initialBlocks = initialTemplate?.variables?.__layout || [];

  // ── Builder state ─────────────────────────────────────────────
  const builder = useEmailBuilder(initialBlocks);

  // ── Drag & drop ─────────────────────────────────────────────────
  const { sensors, activeItem, handleDragStart, handleDragEnd, handleDragCancel } =
    useDragDrop({
      blocks: builder.blocks,
      addBlock: builder.addBlock,
      reorderBlocks: builder.reorderBlocks,
      setSelectedId: builder.setSelectedId,
    });

  // ── Save ─────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!meta.displayName.trim()) return;
    setSaving(true);
    setSaveStatus(null);
    try {
      await EmailTemplatesAPI.saveLayout({
        id:          templateId,
        name:        meta.name || meta.displayName.toLowerCase().replace(/\s+/g, '_'),
        displayName: meta.displayName,
        subject:     meta.subject,
        category:    meta.category,
        language:    meta.language,
        blocks:      builder.blocks,
        html:        builder.getHtml(),
      });
      builder.setIsDirty(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2500);
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setSaving(false);
    }
  }, [meta, templateId, builder]);

  // ── Keyboard shortcuts ──────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e) {
      const isMod = e.metaKey || e.ctrlKey;

      // Ctrl+S — Save
      if (isMod && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }
      // Ctrl+Z — Undo
      if (isMod && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        builder.undo();
        return;
      }
      // Ctrl+Shift+Z or Ctrl+Y — Redo
      if ((isMod && e.shiftKey && e.key === 'z') || (isMod && e.key === 'y')) {
        e.preventDefault();
        builder.redo();
        return;
      }
      // Ctrl+P — Preview
      if (isMod && e.key === 'p') {
        e.preventDefault();
        setShowPreview(true);
        return;
      }
      // Delete / Backspace — delete selected block (when not in input)
      if ((e.key === 'Delete' || e.key === 'Backspace') && builder.selectedId) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        const isEditable = document.activeElement?.isContentEditable;
        if (tag === 'input' || tag === 'textarea' || isEditable) return;
        e.preventDefault();
        builder.removeBlock(builder.selectedId);
        return;
      }
      // Escape — deselect block
      if (e.key === 'Escape') {
        builder.setSelectedId(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [builder, handleSave]);

  // ── Unsaved changes warning ─────────────────────────────────────
  useEffect(() => {
    function handleBeforeUnload(e) {
      if (builder.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [builder.isDirty]);

  // ── Send Test ────────────────────────────────────────────────────
  const handleSendTest = useCallback(async () => {
    if (!sendTestTo) return;
    setSending(true); setSendResult(null);
    // Remember email for next time
    localStorage.setItem('email-builder-test-to', sendTestTo);
    try {
      const html = builder.blocks.length > 0 ? builder.getHtml() : seedHtml;
      await EmailSettingsAPI.sendDirect({
        to: sendTestTo,
        subject: meta.subject || meta.displayName || 'Test Email',
        html,
      });
      setSendResult({ ok: true, msg: `Sent to ${sendTestTo}` });
    } catch (e) {
      setSendResult({ ok: false, msg: e.message });
    } finally {
      setSending(false);
    }
  }, [sendTestTo, builder, meta, seedHtml]);

  // ── Download HTML ─────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    const html = builder.getHtml();
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${meta.displayName.replace(/\s+/g, '-').toLowerCase() || 'email'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [builder, meta.displayName]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-screen bg-background overflow-hidden">

        {/* ── Top Bar ─────────────────────────────────────────────── */}
        <header className="flex-none flex items-center gap-2 px-3 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-30">

          {/* Left group: navigation + title */}
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/admin/email-builder">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground h-8">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Templates</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Back to templates</TooltipContent>
              </Tooltip>
            </Link>

            <Separator orientation="vertical" className="h-5" />

            {/* Title */}
            {editingTitle ? (
              <Input
                autoFocus
                value={meta.displayName}
                onChange={(e) => setMeta(m => ({ ...m, displayName: e.target.value }))}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
                className="h-8 w-48 text-sm font-medium"
              />
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setEditingTitle(true)}
                    className="text-sm font-semibold hover:text-foreground transition-colors max-w-48 truncate text-left"
                  >
                    {meta.displayName || 'Untitled Email'}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Click to rename</TooltipContent>
              </Tooltip>
            )}

            {builder.isDirty && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Unsaved changes</TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="flex-1" />

          {/* Center group: subject + category */}
          <div className="hidden lg:flex items-center gap-2 max-w-sm w-full">
            <span className="text-xs text-muted-foreground shrink-0 font-medium">Subject:</span>
            <Input
              value={meta.subject}
              onChange={(e) => setMeta(m => ({ ...m, subject: e.target.value }))}
              placeholder="Email subject line..."
              className="h-8 text-sm flex-1"
            />
          </div>

          <Separator orientation="vertical" className="h-5 hidden lg:block" />

          {/* Category */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs capitalize">
                {meta.category} <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs">Category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CATEGORIES.map(c => (
                <DropdownMenuItem key={c} className={`capitalize text-sm ${meta.category === c ? 'font-semibold text-foreground' : ''}`}
                  onClick={() => setMeta(m => ({ ...m, category: c }))}>
                  {meta.category === c && <Check className="h-3.5 w-3.5 mr-1.5" />}
                  {c}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-5" />

          {/* Right group: actions */}
          <div className="flex items-center gap-1">
            {/* Undo / Redo */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={builder.undo} disabled={!builder.canUndo}>
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Undo <kbd className="ml-1 text-[10px] opacity-60">Ctrl+Z</kbd></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={builder.redo} disabled={!builder.canRedo}>
                  <Redo2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Redo <kbd className="ml-1 text-[10px] opacity-60">Ctrl+Y</kbd></TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-5 mx-0.5" />

            {/* Preview */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShowPreview(true)}>
                  <Eye className="h-3.5 w-3.5" /> <span className="hidden md:inline">Preview</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Preview email <kbd className="ml-1 text-[10px] opacity-60">Ctrl+P</kbd></TooltipContent>
            </Tooltip>

            {/* Send Test */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { setShowSendTest(true); setSendResult(null); }}>
                  <Send className="h-3.5 w-3.5" /> <span className="hidden md:inline">Test</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Send test email</TooltipContent>
            </Tooltip>

            {/* More actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                  More <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-xs gap-2" onClick={handleDownload}>
                  <Download className="h-3.5 w-3.5" /> Download HTML
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] text-muted-foreground font-normal">
                  <Keyboard className="h-3 w-3 inline mr-1" />
                  Ctrl+S save &middot; Ctrl+Z undo &middot; Ctrl+P preview
                </DropdownMenuLabel>
              </DropdownMenuContent>
            </DropdownMenu>

            <Separator orientation="vertical" className="h-5 mx-0.5" />

            {/* Save */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  className={`h-8 gap-1.5 text-xs min-w-[80px] ${
                    saveStatus === 'error' ? 'bg-destructive hover:bg-destructive/90' : ''
                  }`}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : saveStatus === 'saved' ? (
                    <><Check className="h-3.5 w-3.5" /> Saved</>
                  ) : saveStatus === 'error' ? (
                    <><AlertCircle className="h-3.5 w-3.5" /> Failed</>
                  ) : (
                    <><Save className="h-3.5 w-3.5" /> Save</>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Save template <kbd className="ml-1 text-[10px] opacity-60">Ctrl+S</kbd></TooltipContent>
            </Tooltip>
          </div>
        </header>

        {/* ── 3-Panel Layout ──────────────────────────────────────── */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex flex-1 overflow-hidden">

            {/* LEFT — Block Library */}
            <aside className="w-64 shrink-0 overflow-hidden">
              <Sidebar onLoadPreset={builder.loadPreset} />
            </aside>

            {/* CENTER — Canvas */}
            <main className="flex-1 overflow-hidden">
              <Canvas
                blocks={builder.blocks}
                selectedId={builder.selectedId}
                onSelect={builder.setSelectedId}
                onDelete={builder.removeBlock}
                onDuplicate={builder.duplicateBlock}
                onMoveUp={(id) => builder.moveBlock(id, 'up')}
                onMoveDown={(id) => builder.moveBlock(id, 'down')}
                onUpdate={builder.updateBlock}
                hasSeedHtml={!!seedHtml}
              />
            </main>

            {/* RIGHT — Properties */}
            <aside className="w-80 shrink-0 overflow-hidden border-l">
              <PropertiesPanel
                selectedBlock={builder.selectedBlock}
                onUpdate={(props) => builder.updateBlock(builder.selectedId, props)}
              />
            </aside>
          </div>

          {/* Drag overlay */}
          <DragOverlay dropAnimation={DROP_ANIMATION} adjustScale={false}>
            <DragGhost activeItem={activeItem} />
          </DragOverlay>
        </DndContext>

        {/* ── Send Test Modal ──────────────────────────────────── */}
        <Dialog open={showSendTest} onOpenChange={setShowSendTest}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Send className="h-4 w-4" /> Send Test Email
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Send the current template to an email address using your configured provider.
              </p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Recipient email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={sendTestTo}
                  onChange={e => setSendTestTo(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendTest()}
                  autoFocus
                />
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-muted/50 border border-border px-3 py-2.5 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Subject</span>
                  <span className="font-medium truncate ml-2 max-w-[200px]">{meta.subject || meta.displayName || 'Test Email'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Template</span>
                  <span className="font-medium truncate ml-2 max-w-[200px]">{meta.displayName}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Blocks</span>
                  <span className="font-medium">{builder.blocks.length}</span>
                </div>
              </div>

              {/* Result */}
              {sendResult && (
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${
                  sendResult.ok
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-destructive/10 text-destructive border border-destructive/30'
                }`}>
                  {sendResult.ok ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                  {sendResult.msg}
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowSendTest(false)}>Cancel</Button>
              <Button onClick={handleSendTest} disabled={sending || !sendTestTo} className="gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? 'Sending...' : 'Send Now'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Modal */}
        <PreviewModal
          open={showPreview}
          onClose={() => setShowPreview(false)}
          html={builder.blocks.length > 0 ? builder.getHtml() : seedHtml}
          subject={meta.subject}
        />
      </div>
    </TooltipProvider>
  );
}
