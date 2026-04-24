'use client';

export default function ButtonBlock({ block }) {
  const { props } = block;
  const justify =
    props.align === 'right' ? 'flex-end' :
    props.align === 'center' ? 'center' : 'flex-start';

  const bg = props.bgColor || '#4f46e5';
  const radius = props.borderRadius || '8px';

  return (
    <div style={{ padding: props.blockPadding || '20px 40px', display: 'flex', justifyContent: justify }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: bg,
          color: props.textColor || '#ffffff',
          padding: props.padding || '13px 28px',
          borderRadius: radius,
          fontSize: props.fontSize || '15px',
          fontWeight: 700,
          lineHeight: 1,
          cursor: 'default',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          letterSpacing: '0.15px',
          boxShadow: `0 4px 12px ${bg}55`,
        }}
      >
        {props.label || 'Click Here'}
        <span style={{ fontSize: '16px', lineHeight: 1, opacity: 0.85 }}>→</span>
      </span>
    </div>
  );
}
