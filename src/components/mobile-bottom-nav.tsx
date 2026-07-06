"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Columns3,
  Grid2x2,
  LayoutDashboard,
  Lightbulb,
  ListTodo,
  Target,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/plans", label: "Plans", icon: BookOpen },
  { href: "/kanban", label: "Kanban", icon: Columns3 },
  { href: "/matrix", label: "Matrix", icon: Grid2x2 },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "lg:hidden sticky bottom-0 z-40 -mx-4 sm:-mx-6",
        "flex items-center justify-around",
        "bg-card/80 backdrop-blur border-t border-sidebar-border",
        "h-16 pb-[env(safe-area-inset-bottom,0px)]",
      )}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-3 py-1 min-w-0 rounded-lg transition-colors",
              isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60",
            )}
            aria-label={item.label}
          >
            <Icon className="size-6 shrink-0" />
            <span className="text-xs font-medium leading-none truncate max-w-[56px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
