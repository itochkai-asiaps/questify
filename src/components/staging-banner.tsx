"use client";

import { useState, useCallback } from "react";

export default function StagingBanner() {
  if (process.env.NEXT_PUBLIC_APP_ENV !== "staging") return null;

  const version = process.env.NEXT_PUBLIC_APP_VERSION || "dev";
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(version);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [version]);

  return (
    <button
      onClick={handleCopy}
      title="Click to copy version"
      className="fixed bottom-20 lg:bottom-2 right-2 z-50 cursor-pointer rounded-full bg-amber-500/90 px-2.5 py-0.5 text-[10px] font-mono font-medium text-white backdrop-blur-sm transition hover:bg-amber-500"
    >
      {copied ? "Copied!" : version}
    </button>
  );
}
