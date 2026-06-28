export default function StagingBanner() {
  if (process.env.NEXT_PUBLIC_APP_ENV !== "staging") return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center bg-amber-500 px-4 py-1 text-xs font-bold text-black">
      ⚠ STAGING — Тестовый стенд. Данные не сохраняются в прод.
    </div>
  );
}
