"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createBrowserClient } from "@supabase/ssr"
import { 
  Building2, 
  Plus, 
  Eye, 
  Loader2, 
  Frown, 
  MapPin,
  ChevronLeft,
  ChevronRight
} from "lucide-react"

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

type Company = {
  id: number
  name: string
  email: string | null
  phone: string | null
  percent_cut: number | null
  address: string | null
  google_maps_url: string | null
  notes: string | null
  created_at: string
  // Placeholders for joined data
  total_orders: number 
  balance: number
}

// Initialize Supabase Client
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ITEMS_PER_PAGE = 5 // Change this to 10 or 20 as needed

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
    <p>Loading partner profiles...</p>
  </div>
)

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground bg-slate-50 rounded-lg p-6">
    <Frown className="h-10 w-10 text-slate-400 mb-4" />
    <h3 className="text-lg font-semibold text-slate-700">No Companies Registered</h3>
    <p className="text-sm">
      It looks like you haven't added any partner companies yet.
    </p>
    <Link href="/companies/add" className="mt-4">
      <Button className="bg-blue-600 hover:bg-blue-700">
        <Plus className="mr-2 h-4 w-4" />
        Add Your First Company
      </Button>
    </Link>
  </div>
)

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    loadCompanies()
    // Depend on currentPage so it refetches when page changes
  }, [currentPage]) 

  async function loadCompanies() {
    setLoading(true)

    // Calculate range for pagination
    // Page 1: range(0, 4), Page 2: range(5, 9), etc.
    const from = (currentPage - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1

    // We ask for 'count' to get the total number of rows in the DB
    const { data, error, count } = await supabase
      .from("companies")
      .select("*", { count: 'exact' }) 
      .order("id", { ascending: true })
      .range(from, to)

    if (error) {
      console.error("Error loading companies:", error.message)
      setLoading(false)
      return
    }

    // Enhance data (placeholders)
    const enhancedData: Company[] = (data || []).map(c => ({
      ...c,
      total_orders: 0, 
      balance: 0, 
    }))

    setCompanies(enhancedData)
    setTotalCount(count || 0)
    setLoading(false)
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1)
  }

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Partner Companies
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage merchant profiles and track operational details.
          </p>
        </div>

        <Link href="/companies/add">
          <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20">
            <Plus className="mr-2 h-4 w-4" />
            Add New Partner
          </Button>
        </Link>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
             <Building2 className="h-5 w-5 text-slate-600" />
             Registered Merchants
          </CardTitle>
          <CardDescription>
            Showing {companies.length} of {totalCount} active companies.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <LoadingSpinner />
          ) : companies.length === 0 && currentPage === 1 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-4">
              {/* Table Container */}
              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800">
                    <TableRow>
                      <TableHead className="w-[200px] font-semibold text-slate-700">Company Name</TableHead>
                      <TableHead className="font-semibold text-slate-700">Phone</TableHead>
                      <TableHead className="font-semibold text-slate-700">Address / Location</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700">Cut (%)</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700 w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {companies.map((c) => (
                      <TableRow key={c.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-medium text-slate-900">{c.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.phone ?? "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground flex items-center gap-2">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-xs">{c.address ?? "Location not set"}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-blue-700">
                          {c.percent_cut !== null ? `${c.percent_cut.toFixed(2)}%` : '0.00%'}
                        </TableCell>

                        <TableCell className="text-right">
                          <Link href={`/companies/${c.id}`}>
                            <Button size="icon" variant="ghost" title="View Details" className="text-slate-500 hover:text-blue-600">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages || loading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}