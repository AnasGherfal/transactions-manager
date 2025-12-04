"use client";

import { useEffect, useState, useCallback } from "react";

import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { PageTransition } from "@/components/page-transition";

import { 
  Building2, 
  Plus, 
  Eye, 
  Loader2, 
  Frown, 
  MapPin,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertTriangle,
  Check
} from "lucide-react";
import { motion } from "framer-motion";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";




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
  total_orders: number 
  balance: number
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ITEMS_PER_PAGE = 5

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Delete State
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 4000)
  }

  const loadCompanies = useCallback(async () => {
    setLoading(true)

    const from = (currentPage - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1

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

    const enhancedData: Company[] = (data || []).map((c: any) => ({
      ...c,
      total_orders: 0, 
      balance: 0, 
    }))

    setCompanies(enhancedData)
    setTotalCount(count || 0)
    setLoading(false)
  }, [currentPage])

  useEffect(() => {
    loadCompanies()
  }, [loadCompanies])

  // --- OPTIMISTIC DELETE ---
  const confirmDelete = async () => {
    if (!deleteId) return

    // 1. Snapshot previous state
    const previousCompanies = [...companies]

    // 2. Optimistic Update (Remove immediately)
    setCompanies(prev => prev.filter(c => c.id !== deleteId))
    setTotalCount(prev => prev - 1)
    
    // 3. UI Feedback
    setIsDeleteModalOpen(false)
    showStatus('success', 'Company deleted successfully.')

    // 4. Server Request
    const { error } = await supabase.from("companies").delete().eq("id", deleteId)

    // 5. Rollback on error
    if (error) {
      setCompanies(previousCompanies)
      setTotalCount(prev => prev + 1)
      showStatus('error', `Failed to delete: ${error.message}`)
    } else {
        // Background refresh to ensure sync
        loadCompanies()
    }
    setDeleteId(null)
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1)
  }

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1)
  }

  return (
    <PageTransition>
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* HEADER */}
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

        {/* STATUS MESSAGE */}
        {statusMessage && (
            <div className={`p-4 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${statusMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                {statusMessage.type === 'success' ? <Check className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                <p className="text-sm font-medium">{statusMessage.text}</p>
            </div>
        )}

        <Card className="shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-slate-600" />
                Registered Merchants
            </CardTitle>
            <CardDescription>
              Showing {companies.length} of {totalCount} active companies.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <div className="flex flex-col">
              {/* Table Container */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800">
                    <TableRow>
                      <TableHead className="w-[200px] font-semibold text-slate-700">Company Name</TableHead>
                      <TableHead className="font-semibold text-slate-700">Phone</TableHead>
                      <TableHead className="font-semibold text-slate-700">Address / Location</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700">Cut (%)</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700 w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {loading ? (
                      // --- SKELETON LOADING UI ---
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell>
                             <div className="flex gap-2 items-center">
                                 <Skeleton className="h-4 w-4 rounded-full" />
                                 <Skeleton className="h-4 w-40" />
                             </div>
                          </TableCell>
                          <TableCell className="text-right"><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                          <TableCell><div className="flex justify-end gap-1"><Skeleton className="h-8 w-8 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /></div></TableCell>
                        </TableRow>
                      ))
                    ) : companies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-48 text-center">
                           <div className="flex flex-col items-center justify-center text-muted-foreground">
                                <Frown className="h-10 w-10 text-slate-400 mb-4" />
                                <h3 className="text-lg font-semibold text-slate-700">No Companies Registered</h3>
                                <p className="text-sm">Start by adding your first partner company.</p>
                           </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      companies.map((c) => (
                        <TableRow key={c.id} className="hover:bg-slate-50 transition-colors group">
                          <TableCell className="font-medium text-slate-900">{c.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.phone ?? "-"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground flex items-center gap-2">
                            <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                            <span className="truncate max-w-xs">{c.address ?? "Location not set"}</span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-blue-700 bg-blue-50/50">
                            {c.percent_cut !== null ? `${c.percent_cut.toFixed(2)}%` : '0.00%'}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex justify-end items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <Link href={`/companies/${c.id}`}>
                                <Button size="icon" variant="ghost" title="View Details" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50">
                                    <Eye className="h-4 w-4" />
                                </Button>
                                </Link>
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    title="Delete Company" 
                                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => { setDeleteId(c.id); setIsDeleteModalOpen(true); }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {!loading && companies.length > 0 && (
                <div className="flex items-center justify-between p-4 border-t bg-slate-50/50">
                    <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {Math.max(1, totalPages)}
                    </div>
                    <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevPage}
                        disabled={currentPage === 1 || loading}
                        className="bg-white"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage >= totalPages || loading}
                        className="bg-white"
                    >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                    </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* DELETE CONFIRMATION MODAL */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
            <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
                <DialogTitle className="text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5"/> Delete Company
                </DialogTitle>
                <DialogDescription className="pt-2">
                Are you sure you want to delete this company? 
                <br/><br/>
                <span className="font-semibold text-slate-900">Warning:</span> This will also delete all associated orders and transactions history. This action cannot be undone.
                </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={confirmDelete}>Confirm Delete</Button>
            </div>
            </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  )
}