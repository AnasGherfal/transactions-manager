"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Building2, Wallet, CreditCard, ClipboardClock, Users } from "lucide-react"

export function Sidebar() {
  const pathname = usePathname()

  const menu = [
    { label: "Dashboard", href: "/home", icon: Home },
    { label: "Companies", href: "/companies", icon: Building2 },
    { label: "Transactions", href: "/transactions", icon: Wallet },
    { label: "Team", href: "/team", icon: Users },
    { label: "Logs", href: "/activity", icon: ClipboardClock },
  ]

  const isActive = (href: string) => {
    if (href === '/home' && (pathname === '/home' || pathname === '/')) return true
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-full bg-slate-900 h-full flex flex-col pt-6">
      <div className="flex items-center gap-2 font-bold text-xl px-6 mb-8 text-white">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <CreditCard className="h-4 w-4" />
        </div>
        <span>CardFlow</span>
      </div>

      <nav className="space-y-2 px-4 flex-1">
        {menu.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${active 
                  ? "bg-blue-600 text-white shadow-lg" 
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
            >
              <Icon size={18} className={active ? "text-white" : "text-slate-500"} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 text-[10px] text-slate-500">
        &copy; {new Date().getFullYear()} CardFlow Manager
      </div>
    </aside>
  )
}