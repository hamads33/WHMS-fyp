'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import BlockRenderer from './BlockRenderer';
import BlockToolbar from './BlockToolbar';
import { Mail, Sparkles, Plus } from 'lucide-react';

const BLOCK_TYPE_LABELS = {
  text: 'Text',
  heading: 'Heading',
  image: 'Image',
  button: 'Button',
  divider: 'Divider',
  spacer: 'Spacer',
  columns2: '2 Columns',
  columns3: '3 Columns',
  hero: 'Hero',
  footer: 'Footer',
};

// ── Sortable block wrapper ────────────────────────────────────────────────────
function SortableBlock({ block, isSelected, isFirst, isLast, onSelect, onDelete, onDuplicate, onMoveUp, onMoveDown, onUpdate }) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({
    id: block.id,
    data: { origin: 'canvas', block },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative group/block
        ${isDragging ? 'opacity-30 z-50' : ''}
      `}
      onClick={(e) => { e.stopPropagation(); onSelect(block.id); }}
    >
      {/* Block type label — visible on hover */}
      <div className={`
        absolute -left-0.5 top-1/2 -translate-y-1/2 -translate-x-full z-20
        pointer-events-none transition-opacity duration-150
        ${isSelected ? 'opacity-100' : 'opacity-0 group-hover/block:opacity-100'}
      `}>
        <span className="text-[10px] font-semibold text-muted-foreground bg-muted border border-border rounded px-1.5 py-0.5 whitespace-nowrap shadow-sm">
          {BLOCK_TYPE_LABELS[block.type] || block.type}
        </span>
      </div>

      {/* Selection / hover ring */}
      <div
        className={`
          absolute inset-0 rounded pointer-events-none z-10 transition-all duration-100
          ${isSelected
            ? 'ring-2 ring-foreground ring-inset'
            : 'group-hover/block:ring-1 group-hover/block:ring-foreground/20 group-hover/block:ring-inset'
          }
        `}
      />

      {/* Toolbar — visible on hover or selection */}
      {(isSelected) && (
        <BlockToolbar
          blockType={block.type}
          blockId={block.id}
          isFirst={isFirst}
          isLast={isLast}
          onDelete={() => onDelete(block.id)}
          onDuplicate={() => onDuplicate(block.id)}
          onMoveUp={() => onMoveUp(block.id)}
          onMoveDown={() => onMoveDown(block.id)}
          dragListeners={{ ...listeners, ...attributes }}
        />
      )}

      {/* Block content */}
      <BlockRenderer
        block={block}
        isSelected={isSelected}
        onChange={(props) => onUpdate(block.id, props)}
      />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyCanvas({ hasSeedHtml, isOver }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-5 py-20 px-8 text-center transition-all duration-200 ${
      isOver ? 'scale-[1.02]' : ''
    }`}>
      <div className={`rounded-2xl p-6 transition-all duration-200 ${
        isOver
          ? 'bg-foreground/10 ring-2 ring-foreground ring-dashed scale-105'
          : 'bg-muted ring-1 ring-border'
      }`}>
        {isOver ? (
          <Plus className="h-8 w-8 text-foreground" />
        ) : (
          <Mail className="h-8 w-8 text-muted-foreground/60" />
        )}
      </div>

      <div>
        <p className="text-base font-semibold text-foreground">
          {isOver ? 'Drop here to add' : 'Start building your email'}
        </p>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto">
          {isOver
            ? 'Release to insert this block'
            : 'Drag blocks from the left panel, or load a preset from the Presets tab'
          }
        </p>
      </div>

      {hasSeedHtml && !isOver && (
        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted px-4 py-3 text-left max-w-xs">
          <Sparkles className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            This template has existing HTML. Click <strong>Preview</strong> to view it, or load a preset to start editing visually.
          </p>
        </div>
      )}

      {!isOver && (
        <div className="flex gap-2 mt-1 text-xs text-muted-foreground/40">
          <span className="rounded border border-border/50 px-2 py-1">&larr; Drag a block</span>
          <span className="rounded border border-border/50 px-2 py-1">or open Presets tab &rarr;</span>
        </div>
      )}
    </div>
  );
}

// ── Drop zone indicator between blocks ──────────────────────────────────────
function DropIndicator({ isOver }) {
  return (
    <div className={`transition-all duration-200 mx-8 ${isOver ? 'h-1 my-1' : 'h-0 my-0'}`}>
      <div className={`h-full rounded-full bg-foreground transition-opacity ${isOver ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  );
}

// ── Canvas ────────────────────────────────────────────────────────────────────
export default function Canvas({
  blocks,
  selectedId,
  onSelect,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onUpdate,
  previewWidth,
  hasSeedHtml,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas' });

  return (
    <div className="h-full overflow-y-auto bg-[#e8eaf0] dark:bg-zinc-950"
      style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #c7cad4 1px, transparent 0)', backgroundSize: '24px 24px' }}
    >
      <div className="min-h-full flex flex-col items-center py-10 px-4">

        {/* Fake email client top bar */}
        {blocks.length > 0 && (
          <div style={{ width: previewWidth || '100%', maxWidth: 640 }} className="w-full mb-0">
            <div className="bg-white dark:bg-zinc-800 rounded-t-2xl border border-b-0 border-border/50 px-4 py-2 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
              </div>
              <div className="flex-1 mx-3">
                <div className="h-5 rounded-md bg-muted/60 text-[11px] text-muted-foreground/50 flex items-center px-2.5 font-mono">
                  Email Preview
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground/40 font-mono">
                {blocks.length} block{blocks.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {/* Email container */}
        <div
          ref={setNodeRef}
          style={{ width: previewWidth || '100%', maxWidth: 640 }}
          className={`
            w-full bg-white dark:bg-zinc-800 shadow-xl transition-all duration-300
            ${blocks.length > 0 ? 'rounded-b-2xl border border-t-0 border-border/50' : 'rounded-2xl border border-border/50'}
            ${isOver && blocks.length > 0 ? 'ring-2 ring-foreground/30 ring-offset-2 ring-offset-[#e8eaf0] dark:ring-offset-zinc-950' : ''}
          `}
          onClick={() => onSelect(null)}
        >
          {blocks.length === 0 ? (
            <EmptyCanvas hasSeedHtml={hasSeedHtml} isOver={isOver} />
          ) : (
            <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
              {/* top padding gives the first block's toolbar room to render above */}
              <div className="pt-8" />
              {blocks.map((block, i) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  isSelected={selectedId === block.id}
                  isFirst={i === 0}
                  isLast={i === blocks.length - 1}
                  onSelect={onSelect}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                  onMoveUp={onMoveUp}
                  onMoveDown={onMoveDown}
                  onUpdate={onUpdate}
                />
              ))}
            </SortableContext>
          )}
        </div>

        {/* Bottom spacing */}
        <div className="h-24" />
      </div>
    </div>
  );
}
