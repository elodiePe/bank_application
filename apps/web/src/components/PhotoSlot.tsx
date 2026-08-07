import { useState, type ReactNode } from 'react';

const EXTENSIONS = ['jpg', 'jpeg', 'png'];

interface PhotoSlotProps {
  /** Path without extension, e.g. "/images/landing/hero-family" — see public/images/landing/README.md. */
  basePath: string;
  alt: string;
  className?: string;
  /** Rendered instead once no file exists at basePath under any of EXTENSIONS. */
  fallback: ReactNode;
}

/** Tries each image extension in turn, then falls back to a drawn illustration — so the page
 * never shows a broken-image icon before a real photo has been dropped into public/images/landing. */
export function PhotoSlot({ basePath, alt, className, fallback }: PhotoSlotProps) {
  const [attempt, setAttempt] = useState(0);

  if (attempt >= EXTENSIONS.length) return <>{fallback}</>;

  return (
    <img
      src={`${basePath}.${EXTENSIONS[attempt]}`}
      alt={alt}
      className={className}
      onError={() => setAttempt((a) => a + 1)}
    />
  );
}
