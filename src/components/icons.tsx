type P = { className?: string };

export const IconSound = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M4 9.5h3.2L12 5.4v13.2L7.2 14.5H4z" strokeLinejoin="round" />
    <path d="M15.6 9.2a4 4 0 0 1 0 5.6M18.2 6.6a7.6 7.6 0 0 1 0 10.8" strokeLinecap="round" />
  </svg>
);

export const IconMute = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M4 9.5h3.2L12 5.4v13.2L7.2 14.5H4z" strokeLinejoin="round" />
    <path d="M16.2 9.8l4.6 4.4M20.8 9.8l-4.6 4.4" strokeLinecap="round" />
  </svg>
);

export const IconPause = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <rect x="6.5" y="5" width="4" height="14" rx="0.6" />
    <rect x="13.5" y="5" width="4" height="14" rx="0.6" />
  </svg>
);

export const IconPlay = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M7 4.8l12.2 7.2L7 19.2z" />
  </svg>
);

export const IconRestart = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.1">
    <path d="M20 12a8 8 0 1 1-2.6-5.9" strokeLinecap="round" />
    <path d="M20 3.6V9h-5.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconTrophy = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M7 4h10v5a5 5 0 0 1-10 0z" strokeLinejoin="round" />
    <path d="M7 5.5H4.5V7A3.5 3.5 0 0 0 7 10.4M17 5.5h2.5V7A3.5 3.5 0 0 1 17 10.4" />
    <path d="M12 14v3.5M8.5 20h7" strokeLinecap="round" />
  </svg>
);

export const IconBolt = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M13.4 2 4.9 13.4h5.2L9.8 22l8.9-11.9h-5.5z" />
  </svg>
);

export const IconSignalOff = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M3 4l18 16" strokeLinecap="round" />
    <path d="M6.2 9.6A11 11 0 0 1 12 8c1.4 0 2.8.26 4.05.74M9.3 13.05A6.5 6.5 0 0 1 12 12.4c.7 0 1.37.14 1.98.4M11.4 16.6l.6.6.6-.6" strokeLinecap="round" />
  </svg>
);

export const IconCheck = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.6">
    <path d="M5 12.5l4.4 4.4L19 7.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconLock = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9">
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
    <path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" strokeLinecap="round" />
  </svg>
);

export const IconTarget = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="8.2" />
    <circle cx="12" cy="12" r="4.4" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
  </svg>
);

export const IconBag = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M5.5 8.5h13l-1 11h-11z" strokeLinejoin="round" />
    <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" strokeLinecap="round" />
  </svg>
);

export const IconGauge = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 17a8 8 0 1 1 16 0" strokeLinecap="round" />
    <path d="M12 17l4-5" strokeLinecap="round" />
  </svg>
);
