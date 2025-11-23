"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import dynamic from "next/dynamic" 

// Icons & UI
import { 
  ArrowLeft, Building2, Mail, Phone, MapPin, Tag, 
  ListOrdered, Loader2, Check, AlertTriangle, 
  FileText, Upload, ExternalLink, Plus, Percent, 
  Edit, CreditCard, DollarSign, Pencil, Wallet, TrendingUp, ArrowRight, Trash2, Calendar
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

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
  // created_at is now the user-editable date of the order
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

// Helper to format date string to YYYY-MM-DD for date inputs
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
  
  // Orders State (With Pagination)
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

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  // New state for order date (defaults to today)
  const [newOrderData, setNewOrderData] = useState({ 
    amount: '', 
    cards: '', 
    date: formatDateForInput(new Date().toISOString()) 
  })

  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)

  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false)
  // New state includes date for editing
  const [editingOrderData, setEditingOrderData] = useState({ id: 0, amount: '', cards: '', date: '' })
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false)
  const [isDeletingOrder, setIsDeletingOrder] = useState(false)

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // State for handling signed URL generation loading (private bucket access)
  const [signedUrlLoadingId, setSignedUrlLoadingId] = useState<number | null>(null)

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
    setCompany(data)
    setEditFormData(data)
  }, [companyId])

  useEffect(() => {
    // Re-run loadOrders when ordersPage changes
    if (!companyId) return
    loadOrders()
  }, [ordersPage]) // Dependency on ordersPage

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    
    const from = (ordersPage - 1) * ORDERS_PAGE_SIZE
    const to = from + ORDERS_PAGE_SIZE - 1

    const { data, error, count } = await supabase
      .from("orders")
      .select("*", { count: 'exact' })
      .eq("company_id", companyId)
      // Orders are sorted by the created_at date (which is now editable)
      .order("created_at", { ascending: false }) 
      .range(from, to)

    if (!error) {
        setOrders(data || [])
        setTotalOrdersCount(count || 0)
    }
    setLoadingOrders(false);
  }, [companyId, ordersPage]) // Dependency on ordersPage

  // Calculate Live Balance from DB
  const loadFinancials = useCallback(async () => {
    // 1. Sum of Orders (Debt)
    const { data: orderData } = await supabase.from("orders").select("amount").eq("company_id", companyId)
    const totalOrd = orderData?.reduce((acc, curr) => acc + curr.amount, 0) || 0

    // 2. Sum of Transactions (Payments)
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
  }, [companyId])

  useEffect(() => {
    if (!companyId) return
    Promise.all([loadCompanyDetails(), loadFinancials()]).then(() => setLoading(false))
    // Note: loadOrders is managed by its own useEffect based on ordersPage
  }, [companyId, loadCompanyDetails, loadFinancials])

  // --- HANDLERS ---
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }))
  }

  const handleUpdateCompanyDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setIsSaving(true);
    const { error } = await supabase.from("companies").update(editFormData).eq("id", company.id)
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
    setIsSubmittingOrder(true)

    // Use the selected date (which is in YYYY-MM-DD format) and convert to ISO string
    const dateToUse = newOrderData.date ? new Date(newOrderData.date).toISOString() : new Date().toISOString()

    const { error } = await supabase.from("orders").insert({
        company_id: companyId,
        amount: Number(newOrderData.amount),
        cards: Number(newOrderData.cards),
        status: 'Pending',
        created_at: dateToUse, // Use the user-defined date
    })
    
    setIsSubmittingOrder(false)
    if (error) showStatus('error', error.message)
    else {
        showStatus('success', 'Order Created')
        setIsOrderModalOpen(false)
        // Reset form data and default date
        setNewOrderData({amount:'', cards:'', date: formatDateForInput(new Date().toISOString())}) 
        // Reset to page 1 to see new order
        setOrdersPage(1) 
        loadOrders()
        loadFinancials()
    }
  }

  // --- EDIT ORDER HANDLERS ---
  const openEditOrderModal = (order: Order) => {
    setEditingOrderData({ 
        id: order.id, 
        amount: order.amount.toString(), 
        cards: order.cards.toString(),
        // Convert ISO string date to YYYY-MM-DD for date input
        date: formatDateForInput(order.created_at)
    })
    setIsEditOrderModalOpen(true)
  }

  const handleSaveEditedOrder = async (e: React.FormEvent) => {
     e.preventDefault()
     setIsUpdatingOrder(true)
     
     // Use the selected date and convert to ISO string
     const dateToUse = editingOrderData.date ? new Date(editingOrderData.date).toISOString() : new Date().toISOString()
     
     const { error } = await supabase.from("orders").update({
         amount: Number(editingOrderData.amount),
         cards: Number(editingOrderData.cards),
         created_at: dateToUse, // Update the date
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
    const isConfirmed = window.confirm(`Are you absolutely sure you want to permanently delete Order #${orderId}? This action cannot be undone.`);
    if (!isConfirmed) return

    setIsDeletingOrder(true)
    
    // Optional: Delete the receipt file from storage first if it exists
    const orderToDelete = orders.find(o => o.id === orderId)
    if (orderToDelete?.receipt_url) {
        // We don't necessarily need to await this, but it's cleaner to try
        await supabase.storage.from("receipts").remove([orderToDelete.receipt_url])
    }
    
    const { error: deleteOrderError } = await supabase.from("orders").delete().eq("id", orderId)
    
    setIsDeletingOrder(false)
    if (deleteOrderError) {
        showStatus('error', deleteOrderError.message)
    } else {
        showStatus('success', `Order #${orderId} deleted successfully.`)
        setIsEditOrderModalOpen(false)
        loadOrders()
        loadFinancials()
    }
  }

  const handleOrderStatusChange = async (order: Order, newStatus: Order['status']) => {
    if (newStatus === "Paid" && !order.receipt_url) {
      showStatus('error', "Please upload the receipt before marking the order as Paid.")
      return
    }
    const { error } = await supabase.from("orders").update({status: newStatus}).eq("id", order.id)
    if(error) showStatus('error', error.message)
    else { showStatus('success', `Status updated to ${newStatus}`); loadOrders(); }
  }

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>, orderId: number) => {
    if (!e.target.files || !company) return;
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        // Unique file path based on company ID, order ID, and timestamp
        const filePath = `receipts/${company.id}/${orderId}_${Date.now()}_${file.name}`
        
        // 1. Upload file to the private bucket
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from("receipts")
            .upload(filePath, file)

        if (uploadError) {
            if (uploadError.message.includes("Bucket not found")) {
                showStatus('error', "Storage bucket 'receipts' missing. Please create it in Supabase.")
            } else {
                showStatus('error', `Upload failed: ${uploadError.message}`)
            }
            return
        }
        
        // 2. Store the file path in the database
        const { error: updateError } = await supabase
            .from("orders")
            .update({ receipt_url: uploadData.path }) 
            .eq("id", orderId)

        if (updateError) {
            showStatus('error', `Database update failed: ${updateError.message}`)
            return
        }

        showStatus('success', 'Receipt uploaded successfully.')
        loadOrders()
    } catch (e: any) {
        showStatus('error', e.message)
    }
  }

  // Function to generate and open a signed URL
  const handleViewReceipt = async (orderId: number, path: string) => {
    setSignedUrlLoadingId(orderId)
    try {
        const { data, error } = await supabase.storage
            .from('receipts')
            // Generate a temporary URL valid for 60 seconds
            .createSignedUrl(path, 60) 

        if (error) {
            showStatus('error', `Failed to generate view link: ${error.message}`)
            return
        }

        // Open the secure, temporary link
        window.open(data.signedUrl, '_blank')

    } catch (e: any) {
        showStatus('error', `Error during URL generation: ${e.message}`)
    } finally {
        setSignedUrlLoadingId(null)
    }
  }


  // --- SUB-COMPONENTS ---
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
            <p className="font-semibold text-sm text-slate-800 truncate">{company?.email ?? "N/A"}</p>
          </div>
          <div className="space-y-1 p-2 bg-blue-50/50 rounded-lg">
            <p className="text-xs font-medium text-blue-700 flex items-center gap-1"><Phone className="h-3 w-3"/> Phone</p>
            <p className="font-semibold text-sm text-slate-800">{company?.phone ?? "N/A"}</p>
          </div>
          <div className="space-y-1 p-2 bg-blue-50/50 rounded-lg">
            <p className="text-xs font-medium text-blue-700 flex items-center gap-1"><Percent className="h-3 w-3"/> Percent Cut</p>
            <p className="font-bold text-lg text-blue-600">{company?.percent_cut ?? 0}%</p>
          </div>
        </div>
        <div className="space-y-1 p-4 border border-slate-200 rounded-lg">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1"><MapPin className="h-4 w-4"/> Address</p>
          <p className="text-slate-800 text-base">{company?.address ?? "Address not set"}</p>
          {company?.google_maps_url && (
            <a href={company.google_maps_url} target="_blank" className="text-blue-600 underline text-sm flex items-center gap-1 hover:text-blue-700 transition-colors">
              View Location <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {company?.notes && (
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
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsOrderModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Order
        </Button>
      </CardHeader>
      <CardContent>
        {loadingOrders ? (
          <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" /> <p className="mt-2 text-slate-500">Loading orders...</p></div>
        ) : orders.length === 0 ? (
          <p className="text-muted-foreground p-4 bg-slate-50 rounded-lg">No card orders have been placed for this company yet.</p>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[120px]">Date</TableHead> {/* Date column added */}
                    <TableHead className="text-center">Amount (LYD)</TableHead>
                    <TableHead className="text-center">Cards</TableHead>
                    <TableHead className="w-[160px]">Status</TableHead>
                    <TableHead className="w-[160px]">Receipt</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="text-sm">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-center font-mono text-slate-800">{formatMoney(o.amount)}</TableCell>
                      <TableCell className="text-center text-slate-600">{o.cards}</TableCell>
                      <TableCell>
                        <Select
                          value={o.status}
                          onValueChange={(newStatus: Order['status']) => handleOrderStatusChange(o, newStatus)}
                          disabled={o.status === 'Paid'}
                        >
                          <SelectTrigger className={`w-[140px] ${o.status === 'Paid' ? 'bg-emerald-50 text-emerald-800' : ''}`}>
                            <SelectValue placeholder={o.status} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Sent">Sent</SelectItem>
                            <SelectItem value="Received">Received</SelectItem>
                            <SelectItem value="Paid" disabled={!o.receipt_url}>Paid</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {o.status === "Received" && !o.receipt_url ? (
                          <Label htmlFor={`file-${o.id}`} className="flex items-center gap-1 text-blue-600 underline cursor-pointer hover:text-blue-700 text-sm">
                            <Upload className="h-3 w-3" /> Upload
                            <Input id={`file-${o.id}`} type="file" accept="image/*, application/pdf" className="hidden" onChange={(e) => handleReceiptUpload(e, o.id)} />
                          </Label>
                        ) : o.receipt_url ? (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 p-0 h-auto font-normal disabled:opacity-80" 
                            onClick={() => handleViewReceipt(o.id, o.receipt_url!)}
                            disabled={signedUrlLoadingId === o.id}
                          >
                            {signedUrlLoadingId === o.id ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                                <FileText className="h-3 w-3 mr-1" />
                            )}
                            View Receipt
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEditOrderModal(o)}>
                              <Pencil className="h-4 w-4" />
                          </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* ORDERS PAGINATION */}
            <div className="flex items-center justify-between pt-2 border-t mt-4">
              <p className="text-sm text-slate-500">
                Page {ordersPage} of {Math.ceil(totalOrdersCount / ORDERS_PAGE_SIZE)} ({totalOrdersCount} orders)
              </p>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setOrdersPage(p => Math.max(1, p - 1))}
                  disabled={ordersPage === 1}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Prev
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setOrdersPage(p => Math.min(Math.ceil(totalOrdersCount / ORDERS_PAGE_SIZE), p + 1))}
                  disabled={ordersPage >= Math.ceil(totalOrdersCount / ORDERS_PAGE_SIZE)}
                >
                  Next <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  // --- RENDER ---
  if (loading) return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" /></div>
  if (!company) return <div className="p-8 text-center">Company not found</div>

  const setTab = (tab: Tab) => router.push(`/companies/${companyId}?tab=${tab}`, { scroll: false })

  // --- MODALS CONTENT ---
  const EditCompanyModal = (
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
  )

  const CreateOrderModal = (
    <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Create New Order</DialogTitle><DialogDescription>Enter details below.</DialogDescription></DialogHeader>
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-500" /> Order Date (Defaults to Today)</Label>
            <Input 
              type="date" 
              value={newOrderData.date} 
              onChange={e => setNewOrderData({...newOrderData, date:e.target.value})} 
            />
          </div>
          <div className="space-y-2"><Label>Amount (LYD)</Label><Input type="number" value={newOrderData.amount} onChange={e=>setNewOrderData({...newOrderData, amount:e.target.value})} required /></div>
          <div className="space-y-2"><Label>Cards Quantity</Label><Input type="number" value={newOrderData.cards} onChange={e=>setNewOrderData({...newOrderData, cards:e.target.value})} required /></div>
          <DialogFooter><Button type="submit" disabled={isSubmittingOrder}>{isSubmittingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Create Order"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )

  const EditOrderModal = (
    <Dialog open={isEditOrderModalOpen} onOpenChange={setIsEditOrderModalOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle>Edit Order #{editingOrderData.id}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSaveEditedOrder} className="space-y-4">
          
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-500" /> Order Date</Label>
            <Input 
              type="date" 
              value={editingOrderData.date} 
              onChange={e => setEditingOrderData({...editingOrderData, date:e.target.value})} 
              required
            />
          </div>
          <div className="space-y-2"><Label>Amount (LYD)</Label><Input type="number" value={editingOrderData.amount} onChange={e=>setEditingOrderData({...editingOrderData, amount:e.target.value})} required /></div>
          <div className="space-y-2"><Label>Cards Quantity</Label><Input type="number" value={editingOrderData.cards} onChange={e=>setEditingOrderData({...editingOrderData, cards:e.target.value})} required /></div>
          
          <DialogFooter className="flex flex-col sm:flex-row-reverse sm:justify-between pt-4 border-t">
              <Button type="submit" disabled={isUpdatingOrder}>
                {isUpdatingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Save Changes"}
              </Button>
              <Button 
                type="button" 
                variant="destructive" 
                disabled={isDeletingOrder}
                onClick={() => handleDeleteOrder(editingOrderData.id)}
                className="mt-3 sm:mt-0"
              >
                {isDeletingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <><Trash2 className="h-4 w-4 mr-2"/> Delete Order</>}
              </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )

  return (
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
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Orders (Debt)</p>
                        <p className="text-2xl font-bold text-slate-800">{formatMoney(financials.totalOrders)}</p>
                    </div>
                    <ListOrdered className="h-8 w-8 text-slate-300" />
                </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-emerald-100">
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-emerald-700">Total Received</p>
                        <p className="text-2xl font-bold text-emerald-800">{formatMoney(financials.totalReceived)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-emerald-300" />
                </CardContent>
            </Card>
            <Card className={`${financials.balance < 0 ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className={`text-sm font-medium ${financials.balance < 0 ? 'text-red-700' : 'text-blue-700'}`}>
                            {financials.balance < 0 ? "They Owe You" : "Balance (Credit)"}
                        </p>
                        <p className={`text-2xl font-bold ${financials.balance < 0 ? 'text-red-800' : 'text-blue-800'}`}>
                            {formatMoney(Math.abs(financials.balance))}
                        </p>
                    </div>
                    <Wallet className={`h-8 w-8 ${financials.balance < 0 ? 'text-red-300' : 'text-blue-300'}`} />
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
        <button onClick={() => setTab('orders')} className={`px-4 py-2 font-semibold text-sm rounded-t-lg ${activeTab === 'orders' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500'}`}>Orders ({totalOrdersCount})</button>
        <button onClick={() => setTab('transactions')} className={`px-4 py-2 font-semibold text-sm rounded-t-lg ${activeTab === 'transactions' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500'}`}>Transactions</button>
      </div>

      {/* CONTENT RENDER */}
      {activeTab === 'details' && DetailsTab}
      {activeTab === 'orders' && OrdersTab}
      {activeTab === 'transactions' && <TransactionsTab companyId={companyId} />}

      {/* Modals */}
      {EditCompanyModal}
      {CreateOrderModal}
      {EditOrderModal}
    </div>
  )
}