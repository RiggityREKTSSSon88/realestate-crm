import Sidebar from "@/components/ui/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";
import MobileLayout from "./MobileLayout";

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--color-slate-50)" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className="shrink-0 flex items-center px-6 mobile-header"
          style={{
            height: "64px",
            backgroundColor: "white",
            borderBottom: "1px solid var(--color-slate-200)",
          }}
        >
          <GlobalSearch />
        </header>
        <MobileLayout>
          <main className="flex-1 overflow-y-auto">{children}</main>
        </MobileLayout>
      </div>
    </div>
  );
}
