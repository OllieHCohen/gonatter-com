import Link from "next/link";
import { cn } from "@/lib/cn";

type Size = "sm" | "md" | "lg";

type Props = {
  variant?: "light" | "dark" | "mark";
  size?: Size;
  href?: string | null;
  className?: string;
  priority?: boolean;
};

// Mark height and wordmark size per size step.
const MARK_H: Record<Size, number> = { sm: 20, md: 24, lg: 30 };
const WORD: Record<Size, string> = { sm: "text-xl", md: "text-2xl", lg: "text-[1.9rem]" };

// The voice-waveform mark: coral dots either side of three bars.
export function LogoMark({ height = 24, onDark = false }: { height?: number; onDark?: boolean }) {
  return (
    <svg
      width={(height * 44) / 28}
      height={height}
      viewBox="0 0 44 28"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="3" cy="14" r="3" fill="#e07a5a" />
      <rect x="10" y="0" width="6" height="28" rx="3" fill={onDark ? "#ffffff" : "#18233b"} />
      <rect x="20" y="5" width="5" height="18" rx="2.5" fill={onDark ? "#a9c3be" : "#5b7186"} />
      <rect x="29" y="8" width="5" height="12" rx="2.5" fill={onDark ? "#5b7186" : "#a9c3be"} />
      <circle cx="41" cy="14" r="3" fill="#e07a5a" />
    </svg>
  );
}

// "light"/"dark" describe the BACKGROUND the logo sits on.
export function Logo({ variant = "light", size = "md", href = "/", className }: Props) {
  const onDark = variant === "dark";
  const logo = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark height={MARK_H[size]} onDark={onDark} />
      {variant !== "mark" && (
        <span
          className={cn(
            "font-serif font-bold leading-none tracking-[-0.02em]",
            WORD[size],
            onDark ? "text-white" : "text-gn-navy",
          )}
        >
          gonatter
        </span>
      )}
    </span>
  );
  if (href === null) return logo;
  return (
    <Link href={href} aria-label="gonatter home" className="inline-flex items-center">
      {logo}
    </Link>
  );
}
