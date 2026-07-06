import AppSidebar from "@/components/app-sidebar";
import MobileBottomNav from "@/components/mobile-bottom-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      <AppSidebar />
      <main className="min-w-0 flex-1 pb-0 lg:pb-0">
        <div className="px-4 sm:px-6 pb-16 lg:pb-0">
          {children}
        </div>
        <MobileBottomNav />
      </main>
    </div>
  );
}
