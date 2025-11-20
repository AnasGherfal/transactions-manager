"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Building2, Wallet } from "lucide-react"

export function Sidebar() {
  const pathname = usePathname()

  const menu = [
    { label: "Dashboard", href: "/", icon: Home },
    { label: "Companies", href: "/companies", icon: Building2 },
    { label: "Transactions", href: "/transactions", icon: Wallet },
  ]

  return (
<aside className="w-60 border-r h-full bg-white p-4 flex flex-col gap-4">
      {menu.map((item) => {
        const active = pathname === item.href
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 p-2 rounded-md ${
              active ? "bg-gray-200 font-medium" : "hover:bg-gray-100"
            }`}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        )
      })}
    </aside>
  )
}
