import Image from "next/image";
import { cn } from "@/lib/cn";

// The brand's photo card: white border, slight tilt, name + label + role.
export function Polaroid({
  img,
  alt,
  name,
  label,
  role,
  tilt = 0,
  imgClass = "h-72",
  className,
  children,
}: {
  img: string;
  alt: string;
  name: string;
  label: "Caller" | "Natterer";
  role: string;
  tilt?: number;
  imgClass?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <figure
      className={cn("m-0 rounded-md bg-white p-3 pb-5 shadow-[0_24px_50px_rgba(24,35,59,0.16)]", className)}
      style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}
    >
      <div className={cn("relative w-full overflow-hidden rounded-sm", imgClass)}>
        <Image src={img} alt={alt} fill sizes="(max-width: 768px) 90vw, 400px" className="object-cover" />
      </div>
      <figcaption className="px-1.5 pt-3.5">
        <span className="flex items-baseline justify-between gap-3">
          <span className="font-serif text-2xl font-bold text-gn-navy">{name}</span>
          <span
            className={cn(
              "text-xs font-black tracking-[0.14em] uppercase",
              label === "Caller" ? "text-gn-coral-ink" : "text-gn-body",
            )}
          >
            {label}
          </span>
        </span>
        <span className="mt-1 block text-[0.9rem] text-gn-muted">{role}</span>
        {children}
      </figcaption>
    </figure>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="border border-gn-line bg-gn-paper px-2.5 py-1 text-[0.8rem] text-gn-navy">{children}</span>
  );
}
