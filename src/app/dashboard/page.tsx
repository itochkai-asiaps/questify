"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const completed = localStorage.getItem("onboarding_completed");
    if (completed !== "true") {
      router.replace("/onboarding");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return null;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="mt-12 flex items-center justify-center">
        <svg
          className="size-48 animate-pulse"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="heartGrad" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ff6b6b" />
              <stop offset="50%" stopColor="#ee5a24" />
              <stop offset="100%" stopColor="#e84118" />
            </radialGradient>
          </defs>
          <path
            d="M50 85 C30 70, 5 55, 5 35 C5 20, 20 8, 35 12 C42 14, 48 19, 50 25 C52 19, 58 14, 65 12 C80 8, 95 20, 95 35 C95 55, 70 70, 50 85Z"
            fill="url(#heartGrad)"
            stroke="#c0392b"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </div>
  );
}
