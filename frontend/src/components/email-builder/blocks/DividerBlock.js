'use client';

export default function DividerBlock({ block }) {
  const { props } = block;
  return (
    <div style={{ padding: props.margin || '8px 40px' }}>
      <hr style={{ border: 'none', borderTop: `${props.thickness || '1px'} solid ${props.color || '#e5e7eb'}`, margin: 0 }} />
    </div>
  );
}
