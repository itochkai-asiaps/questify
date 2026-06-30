export default function StagingBanner() {
  if (process.env.NEXT_PUBLIC_APP_ENV !== "staging") return null;

  const version = process.env.NEXT_PUBLIC_APP_VERSION;

  return (
    <div className="fixed bottom-2 right-2 z-50 rounded-full bg-amber-500/90 px-2.5 py-0.5 text-[10px] font-mono font-medium text-white backdrop-blur-sm">
      {version ? `v${version}` : "dev"}
    </div>
  );
}
