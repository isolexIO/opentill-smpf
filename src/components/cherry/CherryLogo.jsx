// Cherry brand mark — a cherry fruit icon matching Cherry.fun's branding.
// Inline SVG so it scales with text color and never breaks on external asset changes.
export default function CherryLogo({ className = '', size }) {
  const dims = size ? { width: size, height: size } : {};
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...dims}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cherryGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF4D6D" />
          <stop offset="1" stopColor="#C40B5C" />
        </linearGradient>
      </defs>
      {/* Stem */}
      <path
        d="M12 3c1.2 1.8 1.2 3.8 0 6"
        stroke="#7BC47F"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Leaf */}
      <path
        d="M12.4 4.2c1.6-1.4 3.4-1.2 5-0.2-1.2 1.8-2.8 2.2-5 1.4"
        fill="#7BC47F"
      />
      {/* Left cherry */}
      <circle cx="8" cy="16" r="4.2" fill="url(#cherryGrad)" />
      {/* Right cherry */}
      <circle cx="16" cy="15" r="4.2" fill="url(#cherryGrad)" />
      {/* Highlights */}
      <circle cx="6.6" cy="14.4" r="1.1" fill="#ffffff" fillOpacity="0.45" />
      <circle cx="14.6" cy="13.4" r="1.1" fill="#ffffff" fillOpacity="0.45" />
    </svg>
  );
}