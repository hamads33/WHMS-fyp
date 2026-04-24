import { v4 as uuidv4 } from 'uuid';

export function createBlock(type) {
  const id = `${type}-${uuidv4().slice(0, 8)}`;

  const map = {
    text: {
      id, type: 'text',
      props: {
        content: 'Write your text content here. Click to edit.',
        fontSize: '15px',
        align: 'left',
        color: '#374151',
        padding: '8px 40px',
      },
    },
    heading: {
      id, type: 'heading',
      props: {
        content: 'Your Heading',
        level: 'h2',
        fontSize: '26px',
        align: 'left',
        color: '#111827',
        padding: '12px 40px 4px',
      },
    },
    image: {
      id, type: 'image',
      props: {
        src: 'https://placehold.co/560x200/e2e8f0/94a3b8?text=Click+to+set+image',
        alt: 'Email image',
        align: 'center',
        width: '100%',
        borderRadius: '0px',
        padding: '8px 0',
      },
    },
    button: {
      id, type: 'button',
      props: {
        label: 'Click Here',
        url: '#',
        align: 'center',
        bgColor: '#4f46e5',
        textColor: '#ffffff',
        padding: '13px 28px',
        borderRadius: '6px',
        fontSize: '15px',
        blockPadding: '20px 40px',
      },
    },
    divider: {
      id, type: 'divider',
      props: {
        color: '#e5e7eb',
        thickness: '1px',
        margin: '8px 40px',
      },
    },
    spacer: {
      id, type: 'spacer',
      props: { height: '32px' },
    },
    columns2: {
      id, type: 'columns2',
      props: {
        gap: '16px',
        padding: '12px 40px',
        columns: [
          { content: 'Column 1 — write your content here.', color: '#374151', fontSize: '14px' },
          { content: 'Column 2 — write your content here.', color: '#374151', fontSize: '14px' },
        ],
      },
    },
    columns3: {
      id, type: 'columns3',
      props: {
        gap: '12px',
        padding: '12px 40px',
        columns: [
          { content: 'Column 1', color: '#374151', fontSize: '14px' },
          { content: 'Column 2', color: '#374151', fontSize: '14px' },
          { content: 'Column 3', color: '#374151', fontSize: '14px' },
        ],
      },
    },
    hero: {
      id, type: 'hero',
      props: {
        title: 'Welcome to {{company.name}}',
        subtitle: 'We are glad to have you here. Get started below.',
        bgColor: '#4f46e5',
        textColor: '#ffffff',
        buttonLabel: 'Get Started',
        buttonUrl: '#',
        buttonBgColor: '#ffffff',
        buttonTextColor: '#4f46e5',
        padding: '52px 40px',
        align: 'center',
      },
    },
    footer: {
      id, type: 'footer',
      props: {
        text: '© {{company.name}} · All rights reserved.',
        subtext: 'You are receiving this email because you signed up for {{company.name}}.',
        bgColor: '#f8f9fb',
        textColor: '#6b7280',
        fontSize: '13px',
        align: 'center',
        padding: '28px 40px',
      },
    },
  };

  return map[type] ?? { id, type, props: {} };
}

export const BLOCK_LIBRARY = [
  { type: 'text',     label: 'Text',         icon: 'Type',        desc: 'Paragraph text' },
  { type: 'heading',  label: 'Heading',       icon: 'Heading2',    desc: 'Section heading' },
  { type: 'image',    label: 'Image',         icon: 'Image',       desc: 'Embed an image' },
  { type: 'button',   label: 'Button',        icon: 'MousePointer',desc: 'CTA button' },
  { type: 'divider',  label: 'Divider',       icon: 'Minus',       desc: 'Horizontal rule' },
  { type: 'spacer',   label: 'Spacer',        icon: 'Space',       desc: 'Empty space' },
  { type: 'columns2', label: '2 Columns',     icon: 'Columns2',    desc: 'Two column layout' },
  { type: 'columns3', label: '3 Columns',     icon: 'Columns3',    desc: 'Three column layout' },
  { type: 'hero',     label: 'Hero Section',  icon: 'LayoutTemplate', desc: 'Banner with CTA' },
  { type: 'footer',   label: 'Footer',        icon: 'PanelBottom', desc: 'Email footer' },
];
