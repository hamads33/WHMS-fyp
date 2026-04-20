'use client';

import { Copy, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

export default function BlockToolbar({ blockType, blockId, isFirst, isLast, onDelete, onDuplicate, onMoveUp, onMoveDown, dragListeners }) {
  const label = BLOCK_TYPE_LABELS[blockType] || blockType;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="absolute -top-px left-0 right-0 flex items-center justify-between px-1 z-20 pointer-events-none"
        style={{ transform: 'translateY(-100%)' }}
      >
        {/* Left: drag handle + block type */}
        <div className="flex items-center gap-0.5 pointer-events-auto">
          <div
            className="flex items-center gap-1 cursor-grab active:cursor-grabbing rounded-md px-1.5 py-1 hover:bg-muted/80 transition-colors"
            {...dragListeners}
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[10px] font-semibold text-foreground bg-foreground/5 border border-border rounded px-1.5 py-0.5">
            {label}
          </span>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center bg-background border border-border rounded-lg shadow-sm pointer-events-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-r-none"
                onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
                disabled={isFirst}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Move up</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-none border-x border-border"
                onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
                disabled={isLast}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Move down</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-none border-r border-border"
                onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Duplicate</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-l-none text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Delete</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
