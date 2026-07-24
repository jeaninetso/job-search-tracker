const COLORS = ['#c9cba3', '#ffe1a8', '#e26d5c', '#f2b8ab', '#ead9a0'];
const PIECES = 28;

export function Confetti() {
  const pieces = Array.from({ length: PIECES }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.3;
    const duration = 1.6 + Math.random() * 0.9;
    const rotation = Math.random() * 360;
    const color = COLORS[i % COLORS.length];
    const drift = (Math.random() - 0.5) * 120;
    return (
      <span
        key={i}
        className="confetti-piece"
        style={{
          left: `${left}%`,
          background: color,
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
          transform: `rotate(${rotation}deg)`,
          // @ts-expect-error custom property read by the keyframe animation
          '--drift': `${drift}px`,
        }}
      />
    );
  });

  return <div className="confetti-container">{pieces}</div>;
}
