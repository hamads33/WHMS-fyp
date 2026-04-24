'use client';

export default function ImageBlock({ block }) {
  const { props } = block;
  const justify = props.align === 'right' ? 'flex-end' : props.align === 'center' ? 'center' : 'flex-start';

  return (
    <div style={{ padding: props.padding || '0', display: 'flex', justifyContent: justify }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={props.src || 'https://placehold.co/560x200/e2e8f0/94a3b8?text=Image'}
        alt={props.alt || ''}
        style={{
          width: props.width || '100%',
          maxWidth: '100%',
          borderRadius: props.borderRadius || '0px',
          display: 'block',
        }}
      />
    </div>
  );
}
