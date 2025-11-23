"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Building2, Wallet, CreditCard, ClipboardList } from "lucide-react"

export function Sidebar() {
  const pathname = usePathname()

  const menu = [
    { label: "Dashboard", href: "/home", icon: Home },
    { label: "Companies", href: "/companies", icon: Building2 },
    { label: "Transactions", href: "/transactions", icon: Wallet },
    // You might also add /reports or /settings here later
  ]

  // Helper to determine active state. The dashboard/home is often at '/' but the prompt uses '/home'.
  const isActive = (href: string) => {
    // Treat '/' and '/home' as active when on the dashboard page
    if (href === '/home' && (pathname === '/home' || pathname === '/')) {
      return true;
    }
    // Check if the current path starts with the href (for nested routes)
    return pathname.startsWith(href);
  };

  return (
    // Dark background for a premium, corporate look
    <aside className="w-64 border-r border-slate-700 bg-slate-900 h-full flex flex-col pt-4">
      
      {/* Brand Header - Matches Login Page */}
      <div className="flex items-center gap-2 font-bold text-xl tracking-wide px-6 mb-8 text-white">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
          <CreditCard className="h-4 w-4" />
        </div>
        <span>CardFlow</span>
      </div>

      {/* Navigation Menu */}
      <nav className="space-y-2 px-4 flex-1">
        {menu.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              // Active link styles: blue background, full color text, border
              // Default styles: text-slate-300, hover slightly lighter
              className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ease-in-out
                ${active
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
            >
              <Icon 
                size={18} 
                className={`transition-colors duration-150
                  ${active ? "text-white" : "text-slate-500 group-hover:text-blue-400"}
                `} 
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer / User Space (Optional, but adds polish) */}
      <div className="p-4 border-t border-slate-700 text-xs text-slate-500">
        &copy; {new Date().getFullYear()} CardFlow Manager
      </div>
    </aside>
  )
}