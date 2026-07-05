// The home-page hero's soft floating colour blobs, reusable behind any app
// surface (call, credit…). Parent needs `relative`; purely decorative.
export function VoiceBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-visible">
      <div className="gn-float-a absolute -left-10 top-2 h-48 w-48 rounded-full bg-teal/20 blur-2xl" />
      <div className="gn-float-b absolute -right-8 top-40 h-56 w-56 rounded-full bg-coral/15 blur-2xl" />
      <div className="gn-float-a absolute left-24 top-72 h-28 w-28 rounded-full bg-sunshine/25 blur-xl" />
    </div>
  );
}
