"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Columns3,
  Grid2x2,
  LayoutDashboard,
  Lightbulb,
  ListTodo,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Target,
  User,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ---------------------------------------------------------------------------
// Navigation config
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/plans", label: "Plans", icon: BookOpen },
  { href: "/kanban", label: "Kanban", icon: Columns3 },
  { href: "/matrix", label: "Matrix", icon: Grid2x2 },
  { href: "/profile", label: "Profile", icon: User },
] as const;

const isStaging = process.env.NEXT_PUBLIC_APP_ENV === "staging";

// ---------------------------------------------------------------------------
// User initial helper
// ---------------------------------------------------------------------------

function getUserInitial(email?: string, displayName?: string): string {
  if (displayName) return displayName.charAt(0).toUpperCase();
  if (email) return email.charAt(0).toUpperCase();
  return "?";
}

function getUserDisplay(email?: string, displayName?: string): string {
  return displayName || email || "User";
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const userInitial = getUserInitial(
    user?.email,
    user?.user_metadata?.display_name,
  );
  const userDisplay = getUserDisplay(
    user?.email,
    user?.user_metadata?.display_name,
  );

  // ------------------------------------------------------------------
  // Shared nav link renderer
  // ------------------------------------------------------------------

  const renderNavLink = (item: (typeof NAV_ITEMS)[number], iconOnly = false) => {
    const isActive =
      pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
          collapsed && !iconOnly && "lg:justify-center lg:px-2",
        )}
        title={collapsed ? item.label : undefined}
      >
        <Icon
          className={cn(
            "size-5 shrink-0",
            isActive
              ? "text-sidebar-primary"
              : "text-sidebar-foreground/60",
          )}
        />
        {(!collapsed || iconOnly) && (
          <span
            className={cn(
              "truncate",
              collapsed && "lg:hidden",
            )}
          >
            {item.label}
          </span>
        )}
      </Link>
    );
  };

  // ------------------------------------------------------------------
  // Desktop sidebar
  // ------------------------------------------------------------------

  const desktopSidebar = (
    <aside
      className={cn(
        "hidden lg:flex lg:flex-col lg:shrink-0 lg:sticky lg:top-0 lg:h-screen",
        "bg-card/80 backdrop-blur border-r border-sidebar-border",
        "transition-all duration-300 ease-in-out",
        collapsed ? "lg:w-16" : "lg:w-56",
      )}
    >
      {/* Brand / Header */}
      <div
        className={cn(
          "flex items-center h-14 shrink-0 border-b border-sidebar-border px-3",
          collapsed ? "lg:justify-center" : "lg:justify-between",
        )}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2 overflow-hidden"
        >
          <Target className="size-6 shrink-0 text-primary" />
          <span
            className={cn(
              "text-lg font-bold tracking-tight transition-opacity duration-200 whitespace-nowrap",
              collapsed ? "lg:hidden lg:opacity-0" : "lg:opacity-100",
            )}
          >
            Questify{isStaging ? " STG" : ""}
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn("shrink-0", collapsed && "lg:hidden")}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </Button>
      </div>

      {/* Collapse toggle when icon-only */}
      {collapsed && (
        <div className="flex justify-center pt-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="size-4" />
          </Button>
        </div>
      )}

      {/* Navigation */}
      <nav
        className={cn(
          "flex-1 flex flex-col gap-1 overflow-y-auto px-3 py-4",
          collapsed && "lg:px-2",
        )}
      >
        {NAV_ITEMS.map((item) => renderNavLink(item))}
      </nav>

      {/* Spacer */}
      <div className="shrink-0" />

      {/* User section */}
      <div
        className={cn(
          "shrink-0 border-t border-sidebar-border p-3",
          collapsed && "lg:p-2",
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-sidebar-accent/50",
              collapsed && "lg:justify-center lg:px-1",
            )}
          >
            <Avatar size="sm">
              <AvatarFallback>{userInitial}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="min-w-0 flex-1 lg:block">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {userDisplay}
                </p>
                <p className="truncate text-xs text-sidebar-foreground/60">
                  {user?.email}
                </p>
              </div>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            sideOffset={8}
            className="w-56"
          >
            <DropdownMenuGroup>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <User className="size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => signOut()}
            >
              <LogOut className="size-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );

  // ------------------------------------------------------------------
  // Mobile bottom bar
  // ------------------------------------------------------------------

  const mobileBottomBar = (
    <nav
      className={cn(
        "lg:hidden fixed bottom-0 inset-x-0 z-40",
        "flex items-center justify-around",
        "bg-card/80 backdrop-blur border-t border-sidebar-border",
        "safe-bottom",
        "h-14",
      )}
    >
      {NAV_ITEMS.slice(0, 5).map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-3 py-1 min-w-0 rounded-lg transition-colors tap-target",
              isActive
                ? "text-sidebar-primary"
                : "text-sidebar-foreground/60",
            )}
            aria-label={item.label}
          >
            <Icon className="size-5 shrink-0" />
            <span className="text-[10px] font-medium leading-none truncate max-w-[48px]">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <>
      {desktopSidebar}
      {mobileBottomBar}
    </>
  );
}
