// The one exception to the monochrome rule, by explicit request - a
// classic bright multi-color confetti burst.
const COLORS = ['#e63946', '#f4a261', '#e9c46a', '#2a9d8f', '#4361ee', '#a855f7'];
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
