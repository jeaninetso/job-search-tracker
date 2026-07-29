interface SpinnerProps {
  label?: string;
}

/** Small animated loading indicator - replaces plain "Loading..." text throughout the app. */
export function Spinner({ label = 'Loading' }: SpinnerProps) {
  return (
    <div className="spinner-row">
      <span className="spinner" aria-hidden="true" />
      <span className="hint">{label}</span>
    </div>
  );
}
