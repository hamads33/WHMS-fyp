'use client';

import { useRef, useEffect } from 'react';

const LEVEL_STYLES = {
  h1: { fontSize: '36px', letterSpacing: '-0.8px' },
  h2: { fontSize: '26px', letterSpacing: '-0.4px' },
  h3: { fontSize: '20px', letterSpacing: '-0.2px' },
};

export default function HeadingBlock({ block, isSelected, onChange }) {
  const ref = useRef(null);
  const { props } = block;
  const Tag = props.level || 'h2';
  const levelStyle = LEVEL_STYLES[Tag] || LEVEL_STYLES.h2;

  useEffect(() => {
    if (ref.current && ref.current.innerText !== props.content) {
      ref.current.innerText = props.content || '';
    }
  }, [props.content]);

  return (
    <Tag
      ref={ref}
      style={{
        padding: props.padding || '16px 40px 4px',
        fontSize: props.fontSize || levelStyle.fontSize,
        color: props.color || '#0f172a',
        textAlign: props.align || 'left',
        fontWeight: 800,
        lineHeight: 1.25,
        letterSpacing: props.letterSpacing || levelStyle.letterSpacing,
        margin: 0,
        outline: 'none',
        wordBreak: 'break-word',
      }}
      contentEditable={isSelected}
      suppressContentEditableWarning
      onBlur={(e) => onChange?.({ content: e.currentTarget.innerText })}
      onClick={(e) => e.stopPropagation()}
      spellCheck={false}
    />
  );
}
