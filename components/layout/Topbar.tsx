"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Bell, CreditCard, LogOut, Search, Settings, User, Loader2, Building2 } from "lucide-react"

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

type CompanyResult = {
  id: number
  name: string
}

export function Topbar() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CompanyResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch companies when query changes (Debounced)
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

      if (data) {
        setResults(data)
      }
      setIsLoading(false)
    }

    const timeoutId = setTimeout(fetchCompanies, 300)
    return () => clearTimeout(timeoutId)
  }, [query, supabase])

  // Close dropdown when clicking outside
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

  const handleSelectCompany = (id: number) => {
    setIsOpen(false)
    setQuery("") // Optional: Clear search after navigation
    router.push(`/companies/${id}`)
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur-md px-6 transition-all dark:bg-slate-950/80">
      <div className="flex h-16 items-center justify-between gap-4">
        {/* Left: Brand/Breadcrumb Context */}
        <div className="flex items-center gap-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white md:hidden">
            <CreditCard className="h-4 w-4" />
          </div>
          <h2 className="hidden text-lg font-semibold tracking-tight md:block text-slate-900 dark:text-slate-100">
            Dashboard
          </h2>
        </div>

        {/* Center: Live Company Search */}
        <div className="hidden flex-1 items-center justify-center md:flex max-w-md">
          <div 
            ref={searchContainerRef}
            className="relative w-full"
          >
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

            {/* Autocomplete Dropdown */}
            {isOpen && query.length > 0 && (
              <div className="absolute top-full mt-2 w-full origin-top rounded-md border bg-white p-1 shadow-lg animate-in fade-in zoom-in-95 dark:bg-slate-950 dark:border-slate-800">
                {results.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Companies
                    </p>
                    {results.map((company) => (
                      <button
                        key={company.id}
                        onClick={() => handleSelectCompany(company.id)}
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

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-blue-600">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9 border-2 border-slate-100 transition hover:border-blue-200">
                  <AvatarImage src="/placeholder-user.jpg" alt="Admin" />
                  <AvatarFallback className="bg-blue-100 text-blue-700 font-medium">AD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Administrator</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    admin@cardflow.com
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