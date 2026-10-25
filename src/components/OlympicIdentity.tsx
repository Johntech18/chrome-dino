import { OLYMPIC_COLORS } from "../game/olympicTheme";

export function OlympicRings({ className = "", inverse = false }: { className?: string; inverse?: boolean }) {
  const rings: [number, number, string][] = [
    [18, 17, OLYMPIC_COLORS.blue],
    [45, 17, inverse ? "#f3f0e6" : OLYMPIC_COLORS.black],
    [72, 17, OLYMPIC_COLORS.red],
    [31.5, 30, OLYMPIC_COLORS.yellow],
    [58.5, 30, OLYMPIC_COLORS.green],
  ];
  return (
    <svg viewBox="0 0 90 46" fill="none" className={className} role="img" aria-label="Olympic rings">
      {rings.map(([x, y, color]) => (
        <circle key={color} cx={x} cy={y} r="13" stroke={color} strokeWidth="3" />
      ))}
    </svg>
  );
}

export function OlympicHeading() {
  return (
    <div className="olympic-heading">
      <div>
        <p className="olympic-eyebrow">THE SUMMER GAMES / TOKYO 2020</p>
        <h1 className="olympic-title">
          T-REX <span>OLYMPICS</span>
          <span className="olympic-title-period" aria-hidden="true">.</span>
        </h1>
        <p className="olympic-intro">One little dinosaur. A world of sport. Go for gold.</p>
      </div>
      <OlympicRings className="olympic-heading-rings" inverse />
    </div>
  );
}