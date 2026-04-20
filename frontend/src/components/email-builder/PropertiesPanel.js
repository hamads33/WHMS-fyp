'use client';

import { useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { MERGE_VARIABLES, VARIABLE_GROUPS } from './utils/mergeVariables';
import {
  AlignLeft, AlignCenter, AlignRight, Variable, Settings2,
  ChevronDown, Type, Palette, BoxSelect, MousePointerClick,
} from 'lucide-react';

// ─── Reusable atoms ──────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Section({ title, icon: Icon, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 group cursor-pointer">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        <span className="text-xs font-semibold text-foreground flex-1 text-left">{title}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-3 pb-3">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={value || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-8 rounded-md cursor-pointer border border-border bg-transparent p-0.5"
          />
        </div>
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 font-mono text-xs flex-1"
          placeholder="#000000"
        />
      </div>
    </Field>
  );
}

function AlignField({ value, onChange }) {
  return (
    <Field label="Alignment">
      <div className="flex gap-0.5 bg-muted rounded-lg p-0.5">
        {[
          { v: 'left',   Icon: AlignLeft },
          { v: 'center', Icon: AlignCenter },
          { v: 'right',  Icon: AlignRight },
        ].map(({ v, Icon }) => (
          <button
            key={v}
            className={`flex-1 flex items-center justify-center h-7 rounded-md text-xs transition-all ${
              value === v
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => onChange(v)}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
    </Field>
  );
}

function SizeInput({ label, value, onChange, placeholder, unit = 'px' }) {
  const numericValue = parseInt(value) || '';

  return (
    <Field label={label}>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onChange(`${Math.max(0, (parseInt(value) || 0) - 1)}${unit}`)}
        >
          <span className="text-xs font-bold">-</span>
        </Button>
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-8 font-mono text-xs text-center flex-1"
        />
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onChange(`${(parseInt(value) || 0) + 1}${unit}`)}
        >
          <span className="text-xs font-bold">+</span>
        </Button>
      </div>
    </Field>
  );
}

function MergeVarPicker({ onInsert }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
          <Variable className="h-3.5 w-3.5" />
          Insert Variable
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52 max-h-72 overflow-y-auto">
        {VARIABLE_GROUPS.map((group) => (
          <div key={group}>
            <DropdownMenuLabel className="text-xs text-muted-foreground">{group}</DropdownMenuLabel>
            {MERGE_VARIABLES.filter(v => v.group === group).map(v => (
              <DropdownMenuItem key={v.value} className="text-xs font-mono" onClick={() => onInsert(v.value)}>
                {v.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Block-specific panels ────────────────────────────────────────────────────

function TextPanel({ block, onChange }) {
  const { props } = block;
  const textRef = useRef(null);

  const insertVar = (v) => {
    const el = textRef.current;
    if (!el) { onChange({ content: (props.content || '') + v }); return; }
    const pos = el.selectionStart ?? (props.content || '').length;
    const before = (props.content || '').slice(0, pos);
    const after  = (props.content || '').slice(pos);
    onChange({ content: before + v + after });
  };

  return (
    <div className="space-y-1">
      <Section title="Content" icon={Type} defaultOpen={true}>
        <Textarea
          ref={textRef}
          value={props.content || ''}
          onChange={(e) => onChange({ content: e.target.value })}
          rows={5}
          className="text-sm resize-none"
        />
        <MergeVarPicker onInsert={insertVar} />
      </Section>

      <Separator />

      <Section title="Typography" icon={Type} defaultOpen={true}>
        <SizeInput label="Font Size" value={props.fontSize} onChange={(v) => onChange({ fontSize: v })} placeholder="15px" />
        <AlignField value={props.align || 'left'} onChange={(v) => onChange({ align: v })} />
        <ColorField label="Text Color" value={props.color} onChange={(v) => onChange({ color: v })} />
      </Section>

      <Separator />

      <Section title="Spacing" icon={BoxSelect} defaultOpen={false}>
        <Field label="Padding (CSS shorthand)">
          <Input value={props.padding || ''} onChange={(e) => onChange({ padding: e.target.value })} placeholder="8px 40px" className="h-8 font-mono text-xs" />
        </Field>
      </Section>
    </div>
  );
}

function HeadingPanel({ block, onChange }) {
  const { props } = block;
  return (
    <div className="space-y-1">
      <Section title="Content" icon={Type} defaultOpen={true}>
        <Field label="Heading Text">
          <Input value={props.content || ''} onChange={(e) => onChange({ content: e.target.value })} className="h-8" />
        </Field>
        <Field label="Heading Level">
          <div className="flex gap-0.5 bg-muted rounded-lg p-0.5">
            {['h1', 'h2', 'h3'].map(l => (
              <button
                key={l}
                className={`flex-1 h-7 rounded-md text-xs font-bold transition-all ${
                  props.level === l
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => onChange({ level: l })}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      <Separator />

      <Section title="Typography" icon={Type} defaultOpen={true}>
        <SizeInput label="Font Size" value={props.fontSize} onChange={(v) => onChange({ fontSize: v })} placeholder="26px" />
        <AlignField value={props.align || 'left'} onChange={(v) => onChange({ align: v })} />
        <ColorField label="Text Color" value={props.color} onChange={(v) => onChange({ color: v })} />
      </Section>

      <Separator />

      <Section title="Spacing" icon={BoxSelect} defaultOpen={false}>
        <Field label="Padding">
          <Input value={props.padding || ''} onChange={(e) => onChange({ padding: e.target.value })} placeholder="12px 40px 4px" className="h-8 font-mono text-xs" />
        </Field>
      </Section>
    </div>
  );
}

function ImagePanel({ block, onChange }) {
  const { props } = block;
  return (
    <div className="space-y-1">
      <Section title="Image" icon={Type} defaultOpen={true}>
        <Field label="Image URL">
          <Input value={props.src || ''} onChange={(e) => onChange({ src: e.target.value })} placeholder="https://..." className="h-8 text-xs" />
        </Field>
        <Field label="Alt Text">
          <Input value={props.alt || ''} onChange={(e) => onChange({ alt: e.target.value })} placeholder="Describe the image" className="h-8" />
        </Field>
      </Section>

      <Separator />

      <Section title="Layout" icon={BoxSelect} defaultOpen={true}>
        <SizeInput label="Width" value={props.width} onChange={(v) => onChange({ width: v })} placeholder="100%" />
        <AlignField value={props.align || 'center'} onChange={(v) => onChange({ align: v })} />
        <SizeInput label="Border Radius" value={props.borderRadius} onChange={(v) => onChange({ borderRadius: v })} placeholder="0px" />
      </Section>
    </div>
  );
}

function ButtonPanel({ block, onChange }) {
  const { props } = block;
  return (
    <div className="space-y-1">
      <Section title="Content" icon={MousePointerClick} defaultOpen={true}>
        <Field label="Button Label">
          <Input value={props.label || ''} onChange={(e) => onChange({ label: e.target.value })} className="h-8" />
        </Field>
        <Field label="URL">
          <Input value={props.url || ''} onChange={(e) => onChange({ url: e.target.value })} placeholder="https://..." className="h-8 text-xs" />
          <div className="mt-1.5">
            <MergeVarPicker onInsert={(v) => onChange({ url: (props.url || '') + v })} />
          </div>
        </Field>
        <AlignField value={props.align || 'center'} onChange={(v) => onChange({ align: v })} />
      </Section>

      <Separator />

      <Section title="Colors" icon={Palette} defaultOpen={true}>
        <ColorField label="Background" value={props.bgColor} onChange={(v) => onChange({ bgColor: v })} />
        <ColorField label="Text" value={props.textColor} onChange={(v) => onChange({ textColor: v })} />
      </Section>

      <Separator />

      <Section title="Sizing" icon={BoxSelect} defaultOpen={false}>
        <Field label="Padding">
          <Input value={props.padding || ''} onChange={(e) => onChange({ padding: e.target.value })} placeholder="13px 28px" className="h-8 font-mono text-xs" />
        </Field>
        <SizeInput label="Border Radius" value={props.borderRadius} onChange={(v) => onChange({ borderRadius: v })} placeholder="6px" />
        <SizeInput label="Font Size" value={props.fontSize} onChange={(v) => onChange({ fontSize: v })} placeholder="15px" />
        <Field label="Block Padding (outer)">
          <Input value={props.blockPadding || ''} onChange={(e) => onChange({ blockPadding: e.target.value })} placeholder="20px 40px" className="h-8 font-mono text-xs" />
        </Field>
      </Section>
    </div>
  );
}

function DividerPanel({ block, onChange }) {
  const { props } = block;
  return (
    <div className="space-y-1">
      <Section title="Style" icon={Palette} defaultOpen={true}>
        <ColorField label="Color" value={props.color} onChange={(v) => onChange({ color: v })} />
        <SizeInput label="Thickness" value={props.thickness} onChange={(v) => onChange({ thickness: v })} placeholder="1px" />
      </Section>

      <Separator />

      <Section title="Spacing" icon={BoxSelect} defaultOpen={false}>
        <Field label="Margin">
          <Input value={props.margin || ''} onChange={(e) => onChange({ margin: e.target.value })} placeholder="8px 40px" className="h-8 font-mono text-xs" />
        </Field>
      </Section>
    </div>
  );
}

function SpacerPanel({ block, onChange }) {
  const { props } = block;
  return (
    <Section title="Spacing" icon={BoxSelect} defaultOpen={true}>
      <SizeInput label="Height" value={props.height} onChange={(v) => onChange({ height: v })} placeholder="32px" />
    </Section>
  );
}

function ColumnsPanel({ block, onChange, colCount }) {
  const { props } = block;
  const columns = props.columns || [];

  const updateCol = (idx, field, value) => {
    const newCols = columns.map((c, i) => i === idx ? { ...c, [field]: value } : c);
    onChange({ columns: newCols });
  };

  return (
    <div className="space-y-1">
      <Section title="Layout" icon={BoxSelect} defaultOpen={true}>
        <Field label="Padding">
          <Input value={props.padding || ''} onChange={(e) => onChange({ padding: e.target.value })} placeholder="12px 40px" className="h-8 font-mono text-xs" />
        </Field>
        <SizeInput label="Column Gap" value={props.gap} onChange={(v) => onChange({ gap: v })} placeholder="16px" />
      </Section>

      <Separator />

      {Array.from({ length: colCount }).map((_, i) => (
        <Section key={i} title={`Column ${i + 1}`} icon={Type} defaultOpen={i === 0}>
          <Field label="Content">
            <Textarea
              value={columns[i]?.content || ''}
              onChange={(e) => updateCol(i, 'content', e.target.value)}
              rows={3}
              className="text-xs resize-none"
            />
          </Field>
          <ColorField label="Text Color" value={columns[i]?.color} onChange={(v) => updateCol(i, 'color', v)} />
          <SizeInput label="Font Size" value={columns[i]?.fontSize} onChange={(v) => updateCol(i, 'fontSize', v)} placeholder="14px" />
        </Section>
      ))}
    </div>
  );
}

function HeroPanel({ block, onChange }) {
  const { props } = block;
  return (
    <div className="space-y-1">
      <Section title="Content" icon={Type} defaultOpen={true}>
        <Field label="Title">
          <Input value={props.title || ''} onChange={(e) => onChange({ title: e.target.value })} className="h-8" />
          <div className="mt-1.5"><MergeVarPicker onInsert={(v) => onChange({ title: (props.title || '') + v })} /></div>
        </Field>
        <Field label="Subtitle">
          <Textarea value={props.subtitle || ''} onChange={(e) => onChange({ subtitle: e.target.value })} rows={2} className="text-sm resize-none" />
        </Field>
        <AlignField value={props.align || 'center'} onChange={(v) => onChange({ align: v })} />
      </Section>

      <Separator />

      <Section title="Colors" icon={Palette} defaultOpen={true}>
        <ColorField label="Background" value={props.bgColor} onChange={(v) => onChange({ bgColor: v })} />
        <ColorField label="Text" value={props.textColor} onChange={(v) => onChange({ textColor: v })} />
      </Section>

      <Separator />

      <Section title="Button" icon={MousePointerClick} defaultOpen={true}>
        <Field label="Label">
          <Input value={props.buttonLabel || ''} onChange={(e) => onChange({ buttonLabel: e.target.value })} className="h-8" />
        </Field>
        <Field label="URL">
          <Input value={props.buttonUrl || ''} onChange={(e) => onChange({ buttonUrl: e.target.value })} placeholder="https://..." className="h-8 text-xs" />
          <div className="mt-1.5"><MergeVarPicker onInsert={(v) => onChange({ buttonUrl: (props.buttonUrl || '') + v })} /></div>
        </Field>
        <ColorField label="Button Background" value={props.buttonBgColor} onChange={(v) => onChange({ buttonBgColor: v })} />
        <ColorField label="Button Text" value={props.buttonTextColor} onChange={(v) => onChange({ buttonTextColor: v })} />
      </Section>

      <Separator />

      <Section title="Spacing" icon={BoxSelect} defaultOpen={false}>
        <Field label="Padding">
          <Input value={props.padding || ''} onChange={(e) => onChange({ padding: e.target.value })} placeholder="52px 40px" className="h-8 font-mono text-xs" />
        </Field>
      </Section>
    </div>
  );
}

function FooterPanel({ block, onChange }) {
  const { props } = block;
  return (
    <div className="space-y-1">
      <Section title="Content" icon={Type} defaultOpen={true}>
        <Field label="Primary Text">
          <Input value={props.text || ''} onChange={(e) => onChange({ text: e.target.value })} className="h-8" />
          <div className="mt-1.5"><MergeVarPicker onInsert={(v) => onChange({ text: (props.text || '') + v })} /></div>
        </Field>
        <Field label="Secondary Text">
          <Textarea value={props.subtext || ''} onChange={(e) => onChange({ subtext: e.target.value })} rows={2} className="text-xs resize-none" />
        </Field>
      </Section>

      <Separator />

      <Section title="Style" icon={Palette} defaultOpen={true}>
        <ColorField label="Background" value={props.bgColor} onChange={(v) => onChange({ bgColor: v })} />
        <ColorField label="Text Color" value={props.textColor} onChange={(v) => onChange({ textColor: v })} />
        <SizeInput label="Font Size" value={props.fontSize} onChange={(v) => onChange({ fontSize: v })} placeholder="13px" />
        <AlignField value={props.align || 'center'} onChange={(v) => onChange({ align: v })} />
      </Section>

      <Separator />

      <Section title="Spacing" icon={BoxSelect} defaultOpen={false}>
        <Field label="Padding">
          <Input value={props.padding || ''} onChange={(e) => onChange({ padding: e.target.value })} placeholder="28px 40px" className="h-8 font-mono text-xs" />
        </Field>
      </Section>
    </div>
  );
}

// ─── Main PropertiesPanel ─────────────────────────────────────────────────────

const TYPE_LABELS = {
  text: 'Text', heading: 'Heading', image: 'Image', button: 'Button',
  divider: 'Divider', spacer: 'Spacer', columns2: '2 Columns',
  columns3: '3 Columns', hero: 'Hero Section', footer: 'Footer',
};

const TYPE_ICONS = {
  text: Type, heading: Type, image: BoxSelect, button: MousePointerClick,
  divider: BoxSelect, spacer: BoxSelect, columns2: BoxSelect,
  columns3: BoxSelect, hero: BoxSelect, footer: BoxSelect,
};

export default function PropertiesPanel({ selectedBlock, onUpdate }) {
  if (!selectedBlock) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-6">
        <div className="rounded-2xl bg-muted p-5">
          <Settings2 className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-muted-foreground">No block selected</p>
          <p className="text-xs text-muted-foreground/60 max-w-[200px]">
            Click any block on the canvas to edit its properties
          </p>
        </div>
        <div className="mt-4 space-y-1.5 text-left w-full max-w-[200px]">
          <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-wide">Shortcuts</p>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground/50">
            <span>Delete block</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Del</kbd>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground/50">
            <span>Deselect</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Esc</kbd>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground/50">
            <span>Undo</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Ctrl+Z</kbd>
          </div>
        </div>
      </div>
    );
  }

  const { type } = selectedBlock;
  const label = TYPE_LABELS[type] || type;
  const Icon = TYPE_ICONS[type] || Settings2;

  function renderPanel() {
    const props = { block: selectedBlock, onChange: onUpdate };
    switch (type) {
      case 'text':     return <TextPanel    {...props} />;
      case 'heading':  return <HeadingPanel {...props} />;
      case 'image':    return <ImagePanel   {...props} />;
      case 'button':   return <ButtonPanel  {...props} />;
      case 'divider':  return <DividerPanel {...props} />;
      case 'spacer':   return <SpacerPanel  {...props} />;
      case 'columns2': return <ColumnsPanel {...props} colCount={2} />;
      case 'columns3': return <ColumnsPanel {...props} colCount={3} />;
      case 'hero':     return <HeroPanel    {...props} />;
      case 'footer':   return <FooterPanel  {...props} />;
      default:         return <p className="text-sm text-muted-foreground">No settings for this block.</p>;
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-muted/30">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground/5">
          <Icon className="h-3.5 w-3.5 text-foreground" />
        </div>
        <span className="text-sm font-semibold flex-1">{label}</span>
        <span className="text-[10px] text-muted-foreground font-mono opacity-40 truncate max-w-[80px]">{selectedBlock.id}</span>
      </div>
      <ScrollArea className="flex-1 px-4 py-3">
        {renderPanel()}
      </ScrollArea>
    </div>
  );
}
