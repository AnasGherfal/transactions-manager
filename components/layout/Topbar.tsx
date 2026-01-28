"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { 
  Bell, 
  Menu, // Added
  CreditCard, 
  LogOut, 
  Search, 
  Settings, 
  User, 
  Loader2, 
  Building2,
  Inbox,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Sidebar } from "./Sidebar"

type CompanyResult = { id: number; name: string }
type Notification = { id: number; title: string; message: string; type: 'info' | 'warning' | 'success' | 'error'; is_read: boolean; created_at: string }

export function Topbar() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CompanyResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const [userData, setUserData] = useState({ id: "", name: "Loading...", email: "...", initials: "??" })
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isNotifOpen, setIsNotifOpen] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        let displayName = user.email?.split('@')[0] || "User"
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
        if (profile?.full_name) displayName = profile.full_name
        const initials = displayName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
        setUserData({ id: user.id, name: displayName, email: user.email || "", initials })
      }
    }
    getUserData()
  }, [supabase])

  useEffect(() => {
    if (!userData.id) return
    const fetchNotifications = async () => {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', userData.id).order('created_at', { ascending: false }).limit(20)
      if (data) {
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.is_read).length)
      }
    }
    fetchNotifications()
  }, [userData.id, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push("/login")
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur-md px-4 md:px-6 transition-all dark:bg-slate-950/80">
      <div className="flex h-16 items-center justify-between gap-4">
        
        {/* Left: Mobile Menu & Brand */}
        <div className="flex items-center gap-2">
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 bg-slate-900 border-slate-700">
                <Sidebar />
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white md:hidden">
            <CreditCard className="h-4 w-4" />
          </div>
          <h2 className="hidden text-lg font-semibold tracking-tight md:block text-slate-900 dark:text-slate-100">
            Dashboard
          </h2>
        </div>

        {/* Center: Search (Hidden on small mobile) */}
        <div className="hidden sm:flex flex-1 items-center justify-center max-w-md">
          <div ref={searchContainerRef} className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              className="w-full bg-slate-50 pl-9 dark:bg-slate-900"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Popover open={isNotifOpen} onOpenChange={setIsNotifOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unreadCount > 0 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-600" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b font-semibold">Notifications</div>
                <div className="max-h-60 overflow-y-auto p-4 text-sm text-center text-muted-foreground">
                    {notifications.length === 0 ? "No new notifications" : "Notification list here..."}
                </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-blue-100 text-blue-700">{userData.initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{userData.name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}