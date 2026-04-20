'use client';

export default function SpacerBlock({ block, isSelected }) {
  const { props } = block;
  return (
    <div
      style={{
        height: props.height || '32px',
        backgroundColor: isSelected ? 'rgba(99,102,241,0.06)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {isSelected && (
        <span style={{ fontSize: '11px', color: '#a5b4fc', letterSpacing: '0.05em', userSelect: 'none' }}>
          SPACER — {props.height || '32px'}
        </span>
      )}
    </div>
  );
}
