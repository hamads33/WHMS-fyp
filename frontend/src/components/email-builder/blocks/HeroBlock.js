'use client';

import { useRef, useEffect } from 'react';

function Editable({ value, tag: Tag = 'div', style, isSelected, onBlur }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) ref.current.innerText = value || '';
  }, [value]);
  return (
    <Tag
      ref={ref}
      contentEditable={isSelected}
      suppressContentEditableWarning
      onBlur={onBlur}
      onClick={(e) => e.stopPropagation()}
      style={{ ...style, outline: 'none', wordBreak: 'break-word' }}
      spellCheck={false}
    />
  );
}

export default function HeroBlock({ block, isSelected, onChange }) {
  const { props } = block;
  const align = props.align || 'center';
  const textAlign = align;
  const itemsAlign = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
  const bg = props.bgColor || '#4f46e5';

  return (
    <div
      style={{
        backgroundColor: bg,
        padding: props.padding || '56px 48px',
        textAlign,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative circles */}
      <div style={{
        position: 'absolute', top: '-40px', right: '-40px',
        width: '180px', height: '180px', borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-60px', left: '-30px',
        width: '220px', height: '220px', borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '20px', left: '30px',
        width: '80px', height: '80px', borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: itemsAlign, gap: 0 }}>
        <Editable
          tag="div"
          value={props.title || ''}
          isSelected={isSelected}
          onBlur={(e) => onChange?.({ title: e.currentTarget.innerText })}
          style={{
            fontSize: props.titleFontSize || '32px',
            fontWeight: 800,
            color: props.textColor || '#ffffff',
            lineHeight: 1.25,
            marginBottom: '14px',
            letterSpacing: '-0.5px',
            maxWidth: '520px',
          }}
        />
        <Editable
          tag="div"
          value={props.subtitle || ''}
          isSelected={isSelected}
          onBlur={(e) => onChange?.({ subtitle: e.currentTarget.innerText })}
          style={{
            fontSize: '16px',
            color: props.textColor || '#ffffff',
            opacity: 0.85,
            lineHeight: 1.65,
            marginBottom: '28px',
            maxWidth: '460px',
          }}
        />
        {props.buttonLabel && (
          <span
            style={{
              display: 'inline-block',
              backgroundColor: props.buttonBgColor || '#ffffff',
              color: props.buttonTextColor || '#4f46e5',
              padding: '14px 34px',
              borderRadius: props.buttonRadius || '8px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'default',
              letterSpacing: '0.1px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            }}
          >
            {props.buttonLabel}
          </span>
        )}
      </div>
    </div>
  );
}
