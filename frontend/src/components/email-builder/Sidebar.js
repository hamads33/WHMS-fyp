'use client';

import { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Type, Heading2, Image, MousePointer, Minus,
  Space, Columns2, Columns3, LayoutTemplate, PanelBottom,
  Sparkles, UserCircle, ShieldCheck, Receipt, Package,
  Server, HeadphonesIcon, Megaphone, Blocks, Search, X,
} from 'lucide-react';
import { BLOCK_LIBRARY } from './utils/blockDefaults';
import { PRESETS } from './utils/presets';

const ICON_MAP = {
  Type, Heading2, Image, MousePointer, Minus, Space,
  Columns2, Columns3, LayoutTemplate, PanelBottom,
};

const CATEGORY_META = {
  account:   { label: 'Account',   icon: UserCircle,     color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-500/10' },
  security:  { label: 'Security',  icon: ShieldCheck,    color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-500/10' },
  billing:   { label: 'Billing',   icon: Receipt,        color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  orders:    { label: 'Orders',    icon: Package,        color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  services:  { label: 'Services',  icon: Server,         color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
  support:   { label: 'Support',   icon: HeadphonesIcon, color: 'text-cyan-600 dark:text-cyan-400',   bg: 'bg-cyan-500/10' },
  marketing: { label: 'Marketing', icon: Megaphone,      color: 'text-pink-600 dark:text-pink-400',   bg: 'bg-pink-500/10' },
};

function groupPresets(presets) {
  const order = [];
  const map = {};
  for (const p of presets) {
    if (!map[p.category]) { map[p.category] = []; order.push(p.category); }
    map[p.category].push(p);
  }
  return order.map(cat => ({ category: cat, presets: map[cat] }));
}

function DraggableSidebarBlock({ type, label, icon, desc }) {
  const Icon = ICON_MAP[icon] || Type;
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: `sidebar-${type}`,
    data: { origin: 'sidebar', blockType: type, label },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        group flex items-center gap-2.5 rounded-lg px-3 py-2 cursor-grab active:cursor-grabbing
        border border-transparent transition-all duration-100 select-none
        hover:border-foreground/15 hover:bg-muted/80
        ${isDragging ? 'opacity-40 scale-95' : ''}
      `}
      style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-foreground/5 transition-colors">
        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-none">{label}</p>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

export default function Sidebar({ onLoadPreset }) {
  const [tab, setTab] = useState('blocks');
  const [blockSearch, setBlockSearch] = useState('');
  const [presetSearch, setPresetSearch] = useState('');

  const grouped = useMemo(() => groupPresets(PRESETS), []);

  const filteredBlocks = useMemo(() => {
    if (!blockSearch) return BLOCK_LIBRARY;
    const q = blockSearch.toLowerCase();
    return BLOCK_LIBRARY.filter(b =>
      b.label.toLowerCase().includes(q) || b.desc.toLowerCase().includes(q) || b.type.toLowerCase().includes(q)
    );
  }, [blockSearch]);

  const filteredGrouped = useMemo(() => {
    if (!presetSearch) return grouped;
    const q = presetSearch.toLowerCase();
    return grouped
      .map(g => ({
        ...g,
        presets: g.presets.filter(p =>
          p.label.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
        ),
      }))
      .filter(g => g.presets.length > 0);
  }, [presetSearch, grouped]);

  return (
    <div className="h-full flex flex-col border-r bg-background">
      {/* Tab switcher */}
      <div className="flex shrink-0 border-b">
        <button
          onClick={() => setTab('blocks')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
            tab === 'blocks'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Blocks className="h-3.5 w-3.5" />
          Blocks
        </button>
        <button
          onClick={() => setTab('presets')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
            tab === 'presets'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Presets
          <span className="ml-0.5 rounded-full bg-muted text-muted-foreground text-[9px] font-bold px-1.5 py-0.5 leading-none">
            {PRESETS.length}
          </span>
        </button>
      </div>

      {/* ── BLOCKS TAB ── */}
      {tab === 'blocks' && (
        <>
          {/* Search */}
          <div className="px-2 pt-2 pb-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search blocks..."
                value={blockSearch}
                onChange={(e) => setBlockSearch(e.target.value)}
                className="h-8 pl-8 pr-7 text-xs"
              />
              {blockSearch && (
                <button
                  onClick={() => setBlockSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {filteredBlocks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No blocks match &ldquo;{blockSearch}&rdquo;</p>
              ) : (
                filteredBlocks.map((block) => (
                  <DraggableSidebarBlock key={block.type} {...block} />
                ))
              )}
            </div>
            {!blockSearch && (
              <div className="mx-3 mb-4 mt-2 rounded-lg bg-muted/50 border border-dashed p-3">
                <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                  Drag any block onto the canvas to add it to your email
                </p>
              </div>
            )}
          </ScrollArea>
        </>
      )}

      {/* ── PRESETS TAB ── */}
      {tab === 'presets' && (
        <>
          {/* Search */}
          <div className="px-2 pt-2 pb-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search presets..."
                value={presetSearch}
                onChange={(e) => setPresetSearch(e.target.value)}
                className="h-8 pl-8 pr-7 text-xs"
              />
              {presetSearch && (
                <button
                  onClick={() => setPresetSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-3">
              {filteredGrouped.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No presets match &ldquo;{presetSearch}&rdquo;</p>
              ) : (
                filteredGrouped.map(({ category, presets }) => {
                  const meta = CATEGORY_META[category] || {
                    label: category, icon: Sparkles,
                    color: 'text-gray-500', bg: 'bg-gray-500/10',
                  };
                  const Icon = meta.icon;

                  return (
                    <div key={category}>
                      {/* Category header */}
                      <div className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 mb-1.5 ${meta.bg}`}>
                        <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${meta.color}`}>{meta.label}</p>
                        <span className={`ml-auto text-[9px] font-semibold ${meta.color} opacity-60`}>{presets.length}</span>
                      </div>

                      <div className="space-y-1">
                        {presets.map((preset) => (
                          <button
                            key={preset.key}
                            onClick={() => onLoadPreset?.(preset)}
                            className="w-full text-left rounded-lg border border-border px-3 py-2.5 transition-all group hover:border-foreground/20 hover:bg-muted/50 hover:shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold leading-snug text-foreground">{preset.label}</p>
                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{preset.description}</p>
                              </div>
                              <span className="text-[10px] text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
                                {preset.blocks?.length || 0} blocks
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {!presetSearch && (
              <div className="mx-3 mb-4 mt-1 rounded-lg bg-muted/50 border border-dashed p-3">
                <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                  Click any preset to load a full ready-made template
                </p>
              </div>
            )}
          </ScrollArea>
        </>
      )}
    </div>
  );
}
