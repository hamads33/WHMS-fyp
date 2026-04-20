'use client';

import { useRef, useEffect } from 'react';

function EditableCol({ content, style, isSelected, onBlur }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && ref.current.innerText !== content) {
      ref.current.innerText = content || '';
    }
  }, [content]);

  return (
    <div
      ref={ref}
      contentEditable={isSelected}
      suppressContentEditableWarning
      onBlur={onBlur}
      onClick={(e) => e.stopPropagation()}
      style={{
        ...style,
        outline: 'none',
        minHeight: '1.5em',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
      spellCheck={false}
    />
  );
}

export function Columns2Block({ block, isSelected, onChange }) {
  const { props } = block;
  const columns = props.columns || [{}, {}];

  const updateCol = (idx, text) => {
    const newCols = columns.map((c, i) => i === idx ? { ...c, content: text } : c);
    onChange?.({ columns: newCols });
  };

  return (
    <div style={{ padding: props.padding || '12px 40px', display: 'flex', gap: props.gap || '16px' }}>
      {columns.map((col, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            minWidth: 0,
            backgroundColor: col.bg || props.colBg || '#f9fafb',
            borderRadius: '10px',
            padding: '16px 18px',
            border: '1px solid #e5e7eb',
          }}
        >
          <EditableCol
            content={col.content || ''}
            isSelected={isSelected}
            onBlur={(e) => updateCol(i, e.currentTarget.innerText)}
            style={{
              fontSize: col.fontSize || '14px',
              color: col.color || '#374151',
              lineHeight: 1.75,
              fontWeight: col.fontWeight || 'normal',
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function Columns3Block({ block, isSelected, onChange }) {
  const { props } = block;
  const columns = props.columns || [{}, {}, {}];

  const updateCol = (idx, text) => {
    const newCols = columns.map((c, i) => i === idx ? { ...c, content: text } : c);
    onChange?.({ columns: newCols });
  };

  return (
    <div style={{ padding: props.padding || '12px 40px', display: 'flex', gap: props.gap || '12px' }}>
      {columns.map((col, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            minWidth: 0,
            backgroundColor: col.bg || props.colBg || '#f9fafb',
            borderRadius: '10px',
            padding: '14px 14px',
            border: '1px solid #e5e7eb',
            textAlign: 'center',
          }}
        >
          <EditableCol
            content={col.content || ''}
            isSelected={isSelected}
            onBlur={(e) => updateCol(i, e.currentTarget.innerText)}
            style={{
              fontSize: col.fontSize || '13px',
              color: col.color || '#374151',
              lineHeight: 1.7,
              fontWeight: col.fontWeight || 'normal',
            }}
          />
        </div>
      ))}
    </div>
  );
}
