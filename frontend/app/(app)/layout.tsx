import Sidebar from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Faint paper grid */}
      <div className="fixed inset-0 grid-bg opacity-40 pointer-events-none" />
      <Sidebar />
      <main className="ml-60 min-h-screen relative bg-ground text-ink">
        {children}
      </main>
    </>
  );
}
