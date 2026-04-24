'use client';

import { useRef, useEffect } from 'react';

function Editable({ value, style, isSelected, onBlur }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) ref.current.innerText = value || '';
  }, [value]);
  return (
    <div
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

export default function FooterBlock({ block, isSelected, onChange }) {
  const { props } = block;
  const bg = props.bgColor || '#f8f9fb';
  const textColor = props.textColor || '#6b7280';
  const fontSize = props.fontSize || '13px';
  const align = props.align || 'center';

  return (
    <div
      style={{
        backgroundColor: bg,
        padding: props.padding || '28px 40px 32px',
        textAlign: align,
        borderTop: `3px solid ${props.accentColor || '#e5e7eb'}`,
      }}
    >
      {/* Logo / company name mark */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
        width: '100%',
        marginBottom: '14px',
      }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '6px',
          backgroundColor: props.brandColor || '#4f46e5',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginRight: '8px',
        }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.8)' }} />
        </div>
        <span style={{ fontSize: '13px', fontWeight: 700, color: props.brandColor || '#4f46e5', letterSpacing: '0.2px' }}>
          {props.brandName || '{{company.name}}'}
        </span>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: props.dividerColor || '#e5e7eb', margin: '0 0 16px' }} />

      <Editable
        value={props.text || ''}
        isSelected={isSelected}
        onBlur={(e) => onChange?.({ text: e.currentTarget.innerText })}
        style={{ fontSize, color: textColor, fontWeight: 600, marginBottom: '6px', lineHeight: 1.5 }}
      />
      <Editable
        value={props.subtext || ''}
        isSelected={isSelected}
        onBlur={(e) => onChange?.({ subtext: e.currentTarget.innerText })}
        style={{ fontSize, color: textColor, opacity: 0.75, lineHeight: 1.6 }}
      />
    </div>
  );
}
