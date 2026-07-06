import AppSidebar from "@/components/app-sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="min-w-0 flex-1 pb-20 lg:pb-0">
        {children}
      </main>
    </div>
  );
}
