'use client';

import { useRef, useEffect } from 'react';

export default function TextBlock({ block, isSelected, onChange }) {
  const ref = useRef(null);
  const { props } = block;

  // Sync content from outside (e.g. preset load) without overwriting cursor
  useEffect(() => {
    if (ref.current && ref.current.innerText !== props.content) {
      ref.current.innerText = props.content || '';
    }
  }, [props.content]);

  return (
    <div
      style={{
        padding: props.padding || '8px 40px',
        fontSize: props.fontSize || '15px',
        color: props.color || '#374151',
        textAlign: props.align || 'left',
        lineHeight: '1.75',
        outline: 'none',
        minHeight: '1.75em',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
      contentEditable={isSelected}
      suppressContentEditableWarning
      ref={ref}
      onBlur={(e) => onChange?.({ content: e.currentTarget.innerText })}
      onClick={(e) => e.stopPropagation()}
      spellCheck={false}
    />
  );
}
