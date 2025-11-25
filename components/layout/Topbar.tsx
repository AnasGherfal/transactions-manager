"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { 
  Bell, 
  CreditCard, 
  LogOut, 
  Search, 
  Settings, 
  User, 
  Loader2, 
  Building2,
  Inbox,
  X,
  Check
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

type CompanyResult = {
  id: number
  name: string
}

type Notification = {
  id: number
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  is_read: boolean
  created_at: string
}

export function Topbar() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CompanyResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // User & Notification State
  const [userData, setUserData] = useState({
    id: "",
    name: "Loading...",
    email: "...",
    initials: "??"
  })
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isNotifOpen, setIsNotifOpen] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 1. Fetch User Data
  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        let displayName = user.email?.split('@')[0] || "User"
        let displayEmail = user.email || ""

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()

        if (profile?.full_name) {
          displayName = profile.full_name
        }

        const initials = displayName
          .split(" ")
          .map((n: string) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()

        setUserData({
          id: user.id,
          name: displayName,
          email: displayEmail,
          initials: initials
        })
      }
    }
    getUserData()
  }, [supabase])

  // 2. Fetch & Subscribe to Notifications
  useEffect(() => {
    if (!userData.id) return

    // Initial Fetch
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (data) {
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.is_read).length)
      }
    }
    fetchNotifications()

    // Realtime Subscription
    const channel = supabase
      .channel('realtime-notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userData.id}`
      }, (payload) => {
        const newNotif = payload.new as Notification
        setNotifications(prev => [newNotif, ...prev])
        setUnreadCount(prev => prev + 1)
        // Optional: Play sound here
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userData.id, supabase])

  // 3. Search Logic
  useEffect(() => {
    const fetchCompanies = async () => {
      if (query.trim().length === 0) {
        setResults([])
        return
      }
      setIsLoading(true)
      const { data } = await supabase
        .from("companies")
        .select("id, name")
        .ilike("name", `%${query}%`)
        .limit(5)

      if (data) setResults(data)
      setIsLoading(false)
    }
    const timeoutId = setTimeout(fetchCompanies, 300)
    return () => clearTimeout(timeoutId)
  }, [query, supabase])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push("/login")
  }

  const handleMarkRead = async (id: number) => {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
    // DB update
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  }

  const handleClearAll = async () => {
    setNotifications([])
    setUnreadCount(0)
    await supabase.from('notifications').delete().eq('user_id', userData.id)
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur-md px-6 transition-all dark:bg-slate-950/80">
      <div className="flex h-16 items-center justify-between gap-4">
        {/* Left: Brand */}
        <div className="flex items-center gap-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white md:hidden">
            <CreditCard className="h-4 w-4" />
          </div>
          <h2 className="hidden text-lg font-semibold tracking-tight md:block text-slate-900 dark:text-slate-100">
            Dashboard
          </h2>
        </div>

        {/* Center: Search */}
        <div className="hidden flex-1 items-center justify-center md:flex max-w-md">
          <div ref={searchContainerRef} className="relative w-full">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search companies..."
                className="w-full bg-slate-50 pl-9 focus-visible:ring-blue-600 dark:bg-slate-900"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setIsOpen(true)
                }}
                onFocus={() => setIsOpen(true)}
              />
              {isLoading && (
                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {isOpen && query.length > 0 && (
              <div className="absolute top-full mt-2 w-full origin-top rounded-md border bg-white p-1 shadow-lg animate-in fade-in zoom-in-95 dark:bg-slate-950 dark:border-slate-800">
                {results.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Companies</p>
                    {results.map((company) => (
                      <button
                        key={company.id}
                        onClick={() => {
                          setIsOpen(false)
                          setQuery("")
                          router.push(`/companies/${company.id}`)
                        }}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <span>{company.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                    {!isLoading && "No companies found."}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          
          {/* NOTIFICATIONS BELL */}
          <Popover open={isNotifOpen} onOpenChange={setIsNotifOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-blue-600">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-600 border-2 border-white dark:border-slate-950 animate-pulse"></span>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 mr-4" align="end">
              <div className="flex items-center justify-between p-4 border-b bg-slate-50/50">
                <h4 className="font-semibold text-sm">Notifications</h4>
                {notifications.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs h-auto p-0 text-muted-foreground hover:text-red-600" onClick={handleClearAll}>
                    Clear all
                  </Button>
                )}
              </div>
              <div className="max-h-[350px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                    <Inbox className="h-10 w-10 opacity-20" />
                    <p className="text-sm">No new notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`relative flex flex-col gap-1 p-4 transition-colors cursor-pointer hover:bg-slate-50 ${notif.is_read ? 'bg-white text-slate-500' : 'bg-blue-50/30 text-slate-800'}`}
                        onClick={() => handleMarkRead(notif.id)}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className={`font-medium text-sm ${!notif.is_read && 'text-blue-700'}`}>{notif.title}</span>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(notif.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                        {!notif.is_read && (
                          <div className="absolute top-4 right-2 h-2 w-2 rounded-full bg-blue-600" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* USER PROFILE */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9 border-2 border-slate-100 transition hover:border-blue-200">
                  <AvatarImage src="/placeholder-user.jpg" alt={userData.name} />
                  <AvatarFallback className="bg-blue-100 text-blue-700 font-medium">{userData.initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userData.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userData.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>System Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}