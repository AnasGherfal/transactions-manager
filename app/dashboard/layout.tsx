import { Sidebar } from "@/components/layout/Sidebar"
import { Topbar } from "@/components/layout/Topbar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // 1. Main Container: Flex row (Sidebar | Content)
    // h-screen makes it take up the full window height
    <div className="flex h-screen w-full overflow-hidden bg-gray-50/50">
      
      {/* 2. Sidebar Section */}
      {/* We wrap it to ensure it stays fixed on the left */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* 3. Right Side Section (Topbar + Content) */}
      <div className="flex flex-col flex-1">
        
        {/* Topbar sits at the top of the right column */}
        <Topbar />

        {/* 4. Main Scrollable Content */}
        {/* overflow-y-auto ensures only this part scrolls, not the sidebar */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
        
      </div>
    </div>
  )
}