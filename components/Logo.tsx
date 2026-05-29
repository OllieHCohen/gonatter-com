import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

type Props = {
  variant?: "light" | "dark" | "mark";
  href?: string | null;
  className?: string;
  priority?: boolean;
};

const SRC = {
  light: "/brand/logo-light.svg",
  dark: "/brand/logo-dark.svg",
  mark: "/brand/logo-mark.svg",
} as const;

// "light"/"dark" describe the BACKGROUND the logo sits on.
export function Logo({ variant = "light", href = "/", className, priority }: Props) {
  const isMark = variant === "mark";
  const img = (
    <Image
      src={SRC[variant]}
      alt="gonatter"
      width={isMark ? 40 : 168}
      height={isMark ? 40 : 67}
      priority={priority}
      className={cn(isMark ? "h-10 w-10" : "h-8 w-auto", className)}
    />
  );
  if (href === null) return img;
  return (
    <Link href={href} aria-label="gonatter home" className="inline-flex items-center">
      {img}
    </Link>
  );
}
