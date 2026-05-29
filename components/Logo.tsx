import Image from "next/image";
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

const SRC = {
  light: "/brand/logo-light.svg",
  dark: "/brand/logo-dark.svg",
  mark: "/brand/logo-mark.svg",
} as const;

// Heights for the full wordmark (width auto-scales to the ~2.5:1 ratio).
const FULL_H: Record<Size, string> = { sm: "h-7", md: "h-10", lg: "h-14" };
const MARK_WH: Record<Size, string> = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-14 w-14" };

// "light"/"dark" describe the BACKGROUND the logo sits on.
export function Logo({ variant = "light", size = "md", href = "/", className, priority }: Props) {
  const isMark = variant === "mark";
  const img = (
    <Image
      src={SRC[variant]}
      alt="gonatter"
      width={isMark ? 56 : 240}
      height={isMark ? 56 : 96}
      priority={priority}
      className={cn(isMark ? MARK_WH[size] : `${FULL_H[size]} w-auto`, className)}
    />
  );
  if (href === null) return img;
  return (
    <Link href={href} aria-label="gonatter home" className="inline-flex items-center">
      {img}
    </Link>
  );
}
