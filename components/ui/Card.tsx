import { cn } from "@/lib/cn";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(28,48,69,0.04)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
