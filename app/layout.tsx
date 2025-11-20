import "./globals.css"
import { Sidebar } from "@/components/layout/Sidebar"
import { Topbar } from "@/components/layout/Topbar"

export const metadata = {
  title: "Prepaid Manager",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen flex">
        {/* SIDEBAR */}
        <Sidebar />

        {/* MAIN AREA */}
        <div className="flex-1 flex flex-col">
          <Topbar />
          <main className="flex-1 overflow-auto p-4">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
