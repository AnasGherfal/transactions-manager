// app/(dashboard)/layout.tsx
import { Sidebar } from "@/components/layout/Sidebar"
import { Topbar } from "@/components/layout/Topbar"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server" // Make sure you have a server client helper!

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 1. Protect the route (Server-side check)
  // If you haven't set up createClient in lib/supabase/server.ts yet, skip this check for now.

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      {/* Sidebar - Hidden on mobile, visible on desktop */}
      <div className="hidden md:block w-64 flex-shrink-0">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}