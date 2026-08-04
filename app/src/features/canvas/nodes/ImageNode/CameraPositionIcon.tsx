interface CameraPositionIconProps {
  className?: string;
  strokeWidth?: number;
}

/** Architectural camera position: video camera, tripod, and vertical height scale. */
export function CameraPositionIcon({ className, strokeWidth = 1.35 }: CameraPositionIconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="11" y="12" width="20" height="13" rx="2.5" />
      <path d="m31 16 7-3v11l-7-3" />
      <path d="M17 12V9h8v3" />
      <path d="M21 25v5m-7 10 7-10 7 10M12 40h4m10 0h4" />
      <path d="M6 10v29m-2-26 2-3 2 3M4 36l2 3 2-3" opacity="0.72" />
      <path d="M6 20h3M6 29h3" opacity="0.48" />
    </svg>
  );
}
