"use client";

import { useEffect, useState, useCallback } from "react";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import dynamic from "next/dynamic";
import { exportToCSV, generateWhatsAppLink } from "@/lib/utils-export";
import { SmartActions } from "@/components/smart-actions";

import { 
  ArrowLeft, Building2, Mail, Phone, MapPin, Tag, 
  ListOrdered, Loader2, Check, AlertTriangle, 
  FileText, Upload, ExternalLink, Plus, Percent, 
  Edit, Wallet, TrendingUp, Trash2, Calendar, Pencil, 
  Download, Send
} from "lucide-react";
import { motion } from "framer-motion";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTransition } from "@/components/page-transition";




// --- LAZY LOAD TRANSACTIONS ---
const TransactionsTab = dynamic(() => import("../TransactionsTab"), {
  loading: () => <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" /></div>
})

// --- TYPES ---
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
}

type Order = {
  id: number
  amount: number
  cards: number
  status: "Pending" | "Sent" | "Received" | "Paid"
  created_at: string 
  receipt_url: string | null
}

type Tab = 'details' | 'orders' | 'transactions';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const formatMoney = (amount: number) => 
  new Intl.NumberFormat('en-LY', { 
    style: 'currency', 
    currency: 'LYD',
    maximumFractionDigits: 0 
  }).format(amount);

const ORDERS_PAGE_SIZE = 10;

const formatDateForInput = (dateString: string) => {
    return new Date(dateString).toISOString().substring(0, 10);
}

// --- MAIN COMPONENT ---
export default function CompanyDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const companyId = Number(params.id)
  const activeTab = (searchParams.get('tab') as Tab) || 'details'

  const [company, setCompany] = useState<Company | null>(null)
  
  // Orders State
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersPage, setOrdersPage] = useState(1)
  const [totalOrdersCount, setTotalOrdersCount] = useState(0)
  
  // Balance State
  const [financials, setFinancials] = useState({ totalOrders: 0, totalReceived: 0, balance: 0 })

  const [loading, setLoading] = useState(true)
  const [loadingOrders, setLoadingOrders] = useState(false)
  
  // Modals State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editFormData, setEditFormData] = useState<Partial<Company>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Order Creation State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [newOrderData, setNewOrderData] = useState({ 
    amount: '', 
    cards: '', 
    date: formatDateForInput(new Date().toISOString()) 
  })
  const [newOrderFile, setNewOrderFile] = useState<File | null>(null)

  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)

  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false)
  const [editingOrderData, setEditingOrderData] = useState({ id: 0, amount: '', cards: '', date: '', receipt_url: null as string | null })
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false)
  const [isDeletingOrder, setIsDeletingOrder] = useState(false)

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [signedUrlLoadingId, setSignedUrlLoadingId] = useState<number | null>(null)
  const [sendingEmailId, setSendingEmailId] = useState<number | null>(null)

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 4000)
  }

  // --- DATA LOADING ---
  const loadCompanyDetails = useCallback(async () => {
    const { data, error } = await supabase.from("companies").select("*").eq("id", companyId).single()
    if (error) {
      showStatus('error', `Failed: ${error.message}`)
      setCompany(null)
      return
    }
    setCompany(data as Company)
    setEditFormData(data as Company)
  }, [companyId])

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    
    const from = (ordersPage - 1) * ORDERS_PAGE_SIZE
    const to = from + ORDERS_PAGE_SIZE - 1

    const { data, error, count } = await supabase
      .from("orders")
      .select("*", { count: 'exact' })
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }) 
      .range(from, to)

    if (!error) {
        setOrders(data as Order[] || [])
        setTotalOrdersCount(count || 0)
    }
    setLoadingOrders(false);
  }, [companyId, ordersPage]) 

  // Calculate Live Balance
  const loadFinancials = useCallback(async () => {
    // In real app, these queries would run. For mock, we skip calculation logic.
    /*
    const { data: orderData } = await supabase.from("orders").select("amount").eq("company_id", companyId)
    const totalOrd = orderData?.reduce((acc, curr) => acc + curr.amount, 0) || 0

    const { data: txData } = await supabase.from("transactions").select("amount, type").eq("company_id", companyId)
    
    let totalRec = 0
    txData?.forEach(tx => {
        if (tx.type === 'Received') totalRec += tx.amount
        else totalRec -= tx.amount 
    })

    setFinancials({
        totalOrders: totalOrd,
        totalReceived: totalRec,
        balance: totalRec - totalOrd 
    })
    */
    // Mock financials
    setFinancials({ totalOrders: 12500, totalReceived: 8000, balance: -4500 })
  }, [companyId])

  // Initial Load
  useEffect(() => {
    if (!companyId) return
    Promise.all([loadCompanyDetails(), loadFinancials()]).then(() => setLoading(false))
  }, [companyId, loadCompanyDetails, loadFinancials])

  // Orders Pagination Load
  useEffect(() => {
    if (!companyId) return
    loadOrders()
  }, [ordersPage, loadOrders, companyId])

  // --- HANDLERS ---
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }))
  }

  const handleUpdateCompanyDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setIsSaving(true);

    const { id, created_at, ...updates } = editFormData as Company;

    const { error } = await supabase.from("companies").update(updates).eq("id", company.id)
    setIsSaving(false);
    if (error) showStatus('error', error.message);
    else {
        showStatus('success', 'Updated');
        setIsEditModalOpen(false);
        loadCompanyDetails();
    }
  }

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrderFile) {
        showStatus('error', 'Please upload an order file/receipt.');
        return;
    }
    setIsSubmittingOrder(true)

    try {
        const filePath = `company_${companyId}/${Date.now()}`;
        await supabase.storage.from("order-files").upload(filePath, newOrderFile);
        
        await supabase.from("orders").insert({
            company_id: companyId,
            amount: Number(newOrderData.amount),
            cards: Number(newOrderData.cards),
            status: 'Pending',
            created_at: new Date().toISOString(),
            receipt_url: filePath,
        })
        
        showStatus('success', 'Order Created');
        setIsOrderModalOpen(false);
        setNewOrderData({amount:'', cards:'', date: formatDateForInput(new Date().toISOString())});
        setNewOrderFile(null);
        setOrdersPage(1); 
        loadOrders();
        
    } catch (error: any) {
        showStatus('error', error.message || 'Failed to create order.');
    } finally {
        setIsSubmittingOrder(false);
    }
  }

  const openEditOrderModal = (order: Order) => {
    setEditingOrderData({ 
        id: order.id, 
        amount: order.amount.toString(), 
        cards: order.cards.toString(),
        date: formatDateForInput(order.created_at),
        receipt_url: order.receipt_url
    })
    setIsEditOrderModalOpen(true)
  }

  const handleSaveEditedOrder = async (e: React.FormEvent) => {
     e.preventDefault()
     setIsUpdatingOrder(true)
     
     const dateToUse = editingOrderData.date ? new Date(editingOrderData.date).toISOString() : new Date().toISOString()
     
     const { error } = await supabase.from("orders").update({
         amount: Number(editingOrderData.amount),
         cards: Number(editingOrderData.cards),
         created_at: dateToUse,
     }).eq("id", editingOrderData.id)
     
     setIsUpdatingOrder(false)
     if(error) showStatus('error', error.message)
     else {
         showStatus('success', 'Order Updated')
         setIsEditOrderModalOpen(false)
         loadOrders()
         loadFinancials()
     }
  }
  
  const handleDeleteOrder = async (orderId: number) => {
    if (!confirm(`Delete Order #${orderId}?`)) return

    setIsDeletingOrder(true)
    
    // Optimistic delete could be added here
    
    const { error } = await supabase.from("orders").delete().eq("id", orderId)
    
    setIsDeletingOrder(false)
    if (error) {
        showStatus('error', error.message)
    } else {
        showStatus('success', `Order deleted.`)
        setIsEditOrderModalOpen(false)
        loadOrders()
        loadFinancials()
    }
  }

  const handleOrderStatusChange = async (order: Order, newStatus: Order['status']) => {
    const { error } = await supabase.from("orders").update({status: newStatus}).eq("id", order.id)
    if(error) showStatus('error', error.message)
    else { loadOrders(); }
  }

  const handleViewReceipt = async (orderId: number, path: string) => {
    setSignedUrlLoadingId(orderId)
    // Mock view logic
    setTimeout(() => {
        window.open('https://example.com/receipt.pdf', '_blank')
        setSignedUrlLoadingId(null)
    }, 500)
  }

  const handleExportOrders = () => {
    const cleanData = orders.map(o => ({
        Date: new Date(o.created_at).toLocaleDateString(),
        Amount: o.amount,
        Cards: o.cards,
        Status: o.status
    }))
    exportToCSV(cleanData, `orders_${company?.name}`)
  }

  const setTab = (tab: Tab) => {
      // In a real app we push router, here we manually simulate for preview
      // router.push(`/companies/${companyId}?tab=${tab}`, { scroll: false })
      window.history.pushState(null, '', `?tab=${tab}`);
      // Force re-render would require state for tab, relying on router in real app
  }

  // --- UI ---
  // SKELETON LOADING STATE FOR WHOLE PAGE OR JUST DETAILS
  if (loading) {
      return (
        <PageTransition>
            <div className="flex flex-col gap-8 p-6 max-w-7xl mx-auto w-full">
                <div className="flex flex-col gap-6 border-b pb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10" />
                            <div>
                                <Skeleton className="h-8 w-64 mb-2" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                    </div>
                </div>
                <div className="flex gap-4">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                </div>
                <Skeleton className="h-96 w-full rounded-xl" />
            </div>
        </PageTransition>
      )
  }

  if (!company) return <div className="p-8 text-center">Company not found</div>

  // --- TABS CONTENT ---
  const DetailsTab = (
    <Card className="shadow-lg border-2 border-slate-100">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl flex items-center gap-2 text-slate-800"><Tag className="h-5 w-5 text-blue-600"/> Company Information</CardTitle>
        <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
          <Edit className="h-4 w-4 mr-2" /> Edit Details
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1 p-2 bg-blue-50/50 rounded-lg">
            <p className="text-xs font-medium text-blue-700 flex items-center gap-1"><Mail className="h-3 w-3"/> Email</p>
            <p className="font-semibold text-sm text-slate-800 truncate">{company.email ?? "N/A"}</p>
          </div>
          <div className="space-y-1 p-2 bg-blue-50/50 rounded-lg">
            <p className="text-xs font-medium text-blue-700 flex items-center gap-1"><Phone className="h-3 w-3"/> Phone</p>
            <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-slate-800">{company.phone ?? "N/A"}</p>
                {company.phone && (
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-green-600 hover:text-green-700" onClick={() => {
                        const link = generateWhatsAppLink(company.phone!, `Hello ${company.name}`);
                        if (link) window.open(link, '_blank');
                    }}>
                        <Send className="h-4 w-4" />
                    </Button>
                )}
            </div>
          </div>
          <div className="space-y-1 p-2 bg-blue-50/50 rounded-lg">
            <p className="text-xs font-medium text-blue-700 flex items-center gap-1"><Percent className="h-3 w-3"/> Percent Cut</p>
            <p className="font-bold text-lg text-blue-600">{company.percent_cut ?? 0}%</p>
          </div>
        </div>
        <div className="space-y-1 p-4 border border-slate-200 rounded-lg">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1"><MapPin className="h-4 w-4"/> Address</p>
          <p className="text-slate-800 text-base">{company.address ?? "Address not set"}</p>
          {company.google_maps_url && (
            <a href={company.google_maps_url} target="_blank" className="text-blue-600 underline text-sm flex items-center gap-1 hover:text-blue-700 transition-colors">
              View Location <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {company.notes && (
          <div className="space-y-1 p-4 border rounded-lg bg-slate-50">
            <p className="text-sm font-medium text-muted-foreground">Operational Notes</p>
            <p className="whitespace-pre-line text-slate-700 text-sm">{company.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const OrdersTab = (
    <Card className="shadow-lg border-2 border-slate-100">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xl flex items-center gap-2 text-slate-800"><ListOrdered className="h-5 w-5 text-blue-600"/> Card Orders</CardTitle>
        <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportOrders} className="gap-2">
                <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsOrderModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> New Order
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loadingOrders ? (
          // --- SKELETON FOR ORDERS TABLE ---
          <div className="space-y-4">
             <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                 <Skeleton className="h-6 w-24" />
                 <Skeleton className="h-6 w-24" />
                 <Skeleton className="h-6 w-24" />
                 <Skeleton className="h-6 w-24" />
             </div>
             {[1,2,3,4,5].map(i => (
                 <div key={i} className="flex justify-between items-center py-2 border-b">
                     <Skeleton className="h-4 w-20" />
                     <Skeleton className="h-4 w-20" />
                     <Skeleton className="h-4 w-10" />
                     <Skeleton className="h-8 w-24 rounded" />
                     <Skeleton className="h-4 w-16" />
                     <Skeleton className="h-8 w-8 rounded" />
                 </div>
             ))}
          </div>
        ) : orders.length === 0 ? (
          <p className="text-muted-foreground p-4 bg-slate-50 rounded-lg">No card orders have been placed for this company yet.</p>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead className="text-center">Amount (LYD)</TableHead>
                    <TableHead className="text-center">Cards</TableHead>
                    <TableHead className="w-[160px]">Status</TableHead>
                    <TableHead className="w-[160px]">File</TableHead>
                    <TableHead className="w-[180px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="text-sm">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-center font-mono text-slate-800">{formatMoney(o.amount)}</TableCell>
                      <TableCell className="text-center text-slate-600">{o.cards}</TableCell>
                      <TableCell>
                        <Select value={o.status} disabled={o.status === 'Paid'} onValueChange={(v) => handleOrderStatusChange(o, v as Order['status'])}>
                            <SelectTrigger className="w-[130px]"><SelectValue placeholder={o.status} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="Sent">Sent</SelectItem>
                                <SelectItem value="Received">Received</SelectItem>
                                <SelectItem value="Paid">Paid</SelectItem>
                            </SelectContent>
                        </Select>
                        {sendingEmailId === o.id && <p className="text-xs text-blue-500 mt-1">Sending email...</p>}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-blue-600 p-0 h-auto" onClick={() => handleViewReceipt(o.id, o.receipt_url!)}>
                            View File
                        </Button>
                      </TableCell>
                      <TableCell>
                          <SmartActions 
                            companyName={company.name} 
                            companyPhone={company.phone} 
                            orderId={o.id} 
                            amount={o.amount} 
                            itemsCount={o.cards} 
                            date={new Date(o.created_at).toLocaleDateString()}
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8 ml-1 text-slate-400 hover:text-blue-600" onClick={() => openEditOrderModal(o)}><Pencil className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between pt-2 border-t mt-4">
                <p className="text-sm text-slate-500">Page {ordersPage} of {Math.ceil(totalOrdersCount / ORDERS_PAGE_SIZE)}</p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setOrdersPage(p => Math.max(1, p - 1))} disabled={ordersPage === 1}>Prev</Button>
                    <Button variant="outline" size="sm" onClick={() => setOrdersPage(p => Math.min(Math.ceil(totalOrdersCount / ORDERS_PAGE_SIZE), p + 1))} disabled={ordersPage >= Math.ceil(totalOrdersCount / ORDERS_PAGE_SIZE)}>Next</Button>
                </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <PageTransition>
    <div className="flex flex-col gap-8 p-6 max-w-7xl mx-auto w-full">
      {/* HEADER & FINANCIALS */}
      <div className="flex flex-col gap-6 border-b pb-6">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => router.push("/companies")}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="h-6 w-6 text-blue-600"/> {company.name}
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">ID: #{company.id}</p>
            </div>
            </div>
        </div>

        {/* FINANCIAL SUMMARY CARD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-50 border-slate-200">
                <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium text-slate-500">Total Orders (Debt)</CardTitle></CardHeader>
                <CardContent className="p-4 pt-0 flex justify-between items-end">
                    <p className="text-2xl font-bold text-slate-800">{formatMoney(financials.totalOrders)}</p>
                    <ListOrdered className="h-6 w-6 text-slate-300" />
                </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-emerald-100">
                <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium text-emerald-700">Total Received</CardTitle></CardHeader>
                <CardContent className="p-4 pt-0 flex justify-between items-end">
                    <p className="text-2xl font-bold text-emerald-800">{formatMoney(financials.totalReceived)}</p>
                    <TrendingUp className="h-6 w-6 text-emerald-300" />
                </CardContent>
            </Card>
            <Card className={`${financials.balance < 0 ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                <CardHeader className="p-4 pb-2">
                    <CardTitle className={`text-sm font-medium ${financials.balance < 0 ? 'text-red-700' : 'text-blue-700'}`}>
                       {financials.balance < 0 ? "They Owe You" : "Balance (Credit)"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex justify-between items-end">
                    <p className={`text-2xl font-bold ${financials.balance < 0 ? 'text-red-800' : 'text-blue-800'}`}>
                        {formatMoney(Math.abs(financials.balance))}
                    </p>
                    <Wallet className={`h-6 w-6 ${financials.balance < 0 ? 'text-red-300' : 'text-blue-300'}`} />
                </CardContent>
            </Card>
        </div>
      </div>

      {/* STATUS MESSAGE */}
      {statusMessage && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${statusMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
          {statusMessage.type === 'success' ? <Check className="h-5 w-5"/> : <AlertTriangle className="h-5 w-5"/>}
          <p className="text-sm font-medium">{statusMessage.text}</p>
        </div>
      )}

      {/* TABS */}
      <div className="flex border-b border-slate-200">
        <button onClick={() => setTab('details')} className={`px-4 py-2 font-semibold text-sm rounded-t-lg ${activeTab === 'details' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500'}`}>Details</button>
        <button onClick={() => setTab('orders')} className={`px-4 py-2 font-semibold text-sm rounded-t-lg ${activeTab === 'orders' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500'}`}>Orders</button>
        <button onClick={() => setTab('transactions')} className={`px-4 py-2 font-semibold text-sm rounded-t-lg ${activeTab === 'transactions' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500'}`}>Transactions</button>
      </div>

      <div className="mt-6">
        {activeTab === 'details' && DetailsTab}
        {activeTab === 'orders' && OrdersTab}
        {activeTab === 'transactions' && (
            <TransactionsTab 
                companyId={companyId} 
                companyName={company.name}
                onUpdate={loadFinancials} 
            />
        )}
      </div>

      {/* MODALS */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Create New Order</DialogTitle><DialogDescription>Upload required file.</DialogDescription></DialogHeader>
          <form onSubmit={handleCreateOrder} className="space-y-4">
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={newOrderData.date} onChange={e => setNewOrderData({...newOrderData, date:e.target.value})} /></div>
            <div className="space-y-2"><Label>Amount (LYD)</Label><Input type="number" step="0.01" value={newOrderData.amount} onChange={e=>setNewOrderData({...newOrderData, amount:e.target.value})} required /></div>
            <div className="space-y-2"><Label>Cards</Label><Input type="number" value={newOrderData.cards} onChange={e=>setNewOrderData({...newOrderData, cards:e.target.value})} required /></div>
            <div className="space-y-2 border-t pt-4"><Label>Order File (Required)</Label><Input type="file" required onChange={e => setNewOrderFile(e.target.files ? e.target.files[0] : null)} /></div>
            <DialogFooter><Button type="submit" disabled={isSubmittingOrder}>{isSubmittingOrder ? <Loader2 className="animate-spin"/> : "Create"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle>Edit {company?.name}</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdateCompanyDetails} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2"><Label>Name</Label><Input name="name" value={editFormData.name || ''} onChange={handleFormChange} required /></div>
               <div className="space-y-2"><Label>Percent Cut</Label><Input name="percent_cut" type="number" step="0.01" value={editFormData.percent_cut ?? ''} onChange={handleFormChange} /></div>
               <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" value={editFormData.email || ''} onChange={handleFormChange} /></div>
               <div className="space-y-2"><Label>Phone</Label><Input name="phone" type="tel" value={editFormData.phone || ''} onChange={handleFormChange} /></div>
             </div>
             <div className="space-y-2"><Label>Address</Label><Input name="address" value={editFormData.address || ''} onChange={handleFormChange} /></div>
             <div className="space-y-2"><Label>Maps URL</Label><Input name="google_maps_url" value={editFormData.google_maps_url || ''} onChange={handleFormChange} /></div>
             <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" value={editFormData.notes || ''} onChange={handleFormChange} /></div>
             <DialogFooter><Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Save"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOrderModalOpen} onOpenChange={setIsEditOrderModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Edit Order #{editingOrderData.id}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveEditedOrder} className="space-y-4">
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={editingOrderData.date} onChange={e => setEditingOrderData({...editingOrderData, date:e.target.value})} required /></div>
            <div className="space-y-2"><Label>Amount (LYD)</Label><Input type="number" step="0.01" value={editingOrderData.amount} onChange={e=>setEditingOrderData({...editingOrderData, amount:e.target.value})} required /></div>
            <div className="space-y-2"><Label>Cards</Label><Input type="number" value={editingOrderData.cards} onChange={e=>setEditingOrderData({...editingOrderData, cards:e.target.value})} required /></div>
            {editingOrderData.receipt_url && <div className="text-xs text-blue-600">File Attached</div>}
            <DialogFooter className="flex justify-between pt-4 border-t">
                <Button type="button" variant="destructive" onClick={() => handleDeleteOrder(editingOrderData.id)} disabled={isDeletingOrder}>Delete</Button>
                <Button type="submit" disabled={isUpdatingOrder}>{isUpdatingOrder ? <Loader2 className="animate-spin"/> : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </PageTransition>
  )
}