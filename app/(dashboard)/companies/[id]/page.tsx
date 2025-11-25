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
  Edit, Wallet, TrendingUp, Trash2, Calendar, Pencil, 
  Send,
  ArrowRight
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
  created_at: string 
  // This field will store the path to the file in the 'order-files' bucket
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
  const [newOrderFile, setNewOrderFile] = useState<File | null>(null) // State for the file upload

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
    setCompany(data)
    setEditFormData(data)
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
        setOrders(data || [])
        setTotalOrdersCount(count || 0)
    }
    setLoadingOrders(false);
  }, [companyId, ordersPage]) 

  // Calculate Live Balance
  const loadFinancials = useCallback(async () => {
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

    // CRITICAL FIX: Remove 'id' and 'created_at' before sending to Supabase
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

    let orderFilePath: string | null = null;
    
    try {
        // 1. Upload file to 'order-files' bucket
        const fileExtension = newOrderFile.name.split('.').pop();
        const filePath = `company_${companyId}/${Date.now()}.${fileExtension}`;
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("order-files")
          .upload(filePath, newOrderFile, {
            upsert: false // Should not overwrite existing files, new order means new file
          });
          
        if (uploadError) throw uploadError;
        orderFilePath = uploadData.path;

        // 2. Insert order data
        const dateToUse = newOrderData.date ? new Date(newOrderData.date).toISOString() : new Date().toISOString()
        
        const { error: insertError } = await supabase.from("orders").insert({
            company_id: companyId,
            amount: Number(newOrderData.amount),
            cards: Number(newOrderData.cards),
            status: 'Pending',
            created_at: dateToUse,
            receipt_url: orderFilePath, // Storing the file path here
        })
        
        if (insertError) throw insertError;
        
        showStatus('success', 'Order Created and file uploaded.');
        setIsOrderModalOpen(false);
        setNewOrderData({amount:'', cards:'', date: formatDateForInput(new Date().toISOString())});
        setNewOrderFile(null); // Reset file input
        setOrdersPage(1); 
        loadOrders();
        loadFinancials(); // Update cards instantly
        
    } catch (error: any) {
        console.error("Order Creation Error:", error);
        showStatus('error', error.message || 'Failed to create order or upload file.');
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
         loadFinancials() // Update cards instantly
     }
  }
  
  const handleDeleteOrder = async (orderId: number) => {
    if (!confirm(`Delete Order #${orderId}?`)) return

    setIsDeletingOrder(true)
    
    const orderToDelete = orders.find(o => o.id === orderId)
    // Attempt to delete the order file from the 'order-files' bucket
    if (orderToDelete?.receipt_url) {
        await supabase.storage.from("order-files").remove([orderToDelete.receipt_url])
    }
    
    const { error } = await supabase.from("orders").delete().eq("id", orderId)
    
    setIsDeletingOrder(false)
    if (error) {
        showStatus('error', error.message)
    } else {
        showStatus('success', `Order deleted.`)
        setIsEditOrderModalOpen(false)
        loadOrders()
        loadFinancials() // Update cards instantly
    }
  }

  // Helper to convert ArrayBuffer to Base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };
  
  const handleOrderStatusChange = async (order: Order, newStatus: Order['status']) => {
    if (newStatus === "Sent") {
        if (!company?.email) {
            showStatus('error', 'Company email is required to send the order file.');
            return;
        }
        if (!order.receipt_url) {
            showStatus('error', 'Order file is missing. Cannot send email.');
            return;
        }
        
        setSendingEmailId(order.id);

        try {
            // 1. Fetch the file content from the 'order-files' bucket
            const { data: fileData, error: fileError } = await supabase.storage
              .from('order-files')
              .download(order.receipt_url);

            if (fileError) throw new Error(`File download failed: ${fileError.message}`);
            
            // 2. Convert ArrayBuffer to Base64
            const base64Data = arrayBufferToBase64(fileData);
            
            // 3. Construct Email Details
            const attachmentFilename = order.receipt_url.split('/').pop() || `Order_${order.id}_File.pdf`;
            const subject = `Order #${order.id} Sent - ${company.name}`;
            const bodyHtml = `
                <p>Dear ${company.name},</p>
                <p>Your order #${order.id} has been processed and sent.</p>
                <p><strong>Order Details:</strong></p>
                <ul>
                    <li>Amount: ${formatMoney(order.amount)}</li>
                    <li>Cards: ${order.cards}</li>
                    <li>Date: ${new Date(order.created_at).toLocaleDateString()}</li>
                    <li>Status: <strong>Sent</strong></li>
                </ul>
                <p>Please find the order file attached for your reference.</p>
                <p>Thank you.</p>
            `;

            // 4. Call the API route to send the email
            const emailResponse = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: company.email,
                    subject: subject,
                    bodyHtml: bodyHtml,
                    attachmentData: base64Data,
                    attachmentFilename: attachmentFilename,
                })
            });

            if (!emailResponse.ok) {
                const errorDetail = await emailResponse.json();
                throw new Error(errorDetail.error || 'Failed to send email.');
            }
            
            showStatus('success', `Status updated to SENT and email successfully sent to ${company.email}.`);

        } catch (e: any) {
            showStatus('error', e.message || 'An unknown error occurred during email transmission.');
            setSendingEmailId(null);
            return; // STOP execution if email fails
        } finally {
            setSendingEmailId(null);
        }
    } 

    // Proceed with status update only if not 'Sent' or if email succeeded
    const { error } = await supabase.from("orders").update({status: newStatus}).eq("id", order.id)
    if(error) showStatus('error', error.message)
    else { loadOrders(); }
  }

  // Handle receipt upload for payment confirmation (uses the old flow/bucket name 'receipts')
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>, orderId: number) => {
    if (!e.target.files || !company) return;
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        // Upload to the generic 'receipts' bucket (as in the original structure)
        const filePath = `receipts/${company.id}/payment_${orderId}_${Date.now()}_${file.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage.from("receipts").upload(filePath, file)

        if (uploadError) throw uploadError
        
        // Note: The receipt_url field is being REPURPOSED here. For orders, it stores the initial "order-file".
        // For payment confirmations, you would ideally need a separate field (e.g., payment_receipt_url)
        // Since we can't change the schema, we'll assume this payment receipt is for another system or 
        // that the current `receipt_url` is strictly for the initial order file, and this functionality 
        // is deprecated/needs a new field.
        
        // For now, let's keep the file, but show an error/warning that this field is reserved.
        // We will remove the update logic here to prevent overwriting the 'order-file' path.
        // If the user wants to track payment receipts, a new database column is required.
        showStatus('error', 'Payment receipt upload is tracked via the separate "Transactions" tab, not here.');
        
        // Clean up the uploaded file to prevent storage bloat, as we are not tracking it.
        await supabase.storage.from("receipts").remove([uploadData.path]);
        
    } catch (e: any) {
        showStatus('error', e.message)
    }
  }

  const handleViewReceipt = async (orderId: number, path: string) => {
    setSignedUrlLoadingId(orderId)
    try {
        // Use 'order-files' bucket for the order document receipt_url
        const { data, error } = await supabase.storage.from('order-files').createSignedUrl(path, 60) 
        if (error) throw error
        window.open(data.signedUrl, '_blank')
    } catch (e: any) {
        showStatus('error', `Error: ${e.message}`)
    } finally {
        setSignedUrlLoadingId(null)
    }
  }

  // --- UI ---
  if (loading) return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" /></div>
  if (!company) return <div className="p-8 text-center">Company not found</div>

  const setTab = (tab: Tab) => router.push(`/companies/${companyId}?tab=${tab}`, { scroll: false })

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
        {activeTab === 'details' && (
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
                    <p className="font-semibold text-sm text-slate-800">{company.phone ?? "N/A"}</p>
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
        )}

        {activeTab === 'orders' && (
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
                            <TableHead className="w-[120px]">Date</TableHead>
                            <TableHead className="text-center">Amount (LYD)</TableHead>
                            <TableHead className="text-center">Cards</TableHead>
                            <TableHead className="w-[160px]">Status</TableHead>
                            <TableHead className="w-[160px]">Order File</TableHead>
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
                                <Select value={o.status} onValueChange={(newStatus: Order['status']) => handleOrderStatusChange(o, newStatus)} disabled={o.status === 'Paid' || sendingEmailId === o.id}>
                                <SelectTrigger className={`w-[140px] ${o.status === 'Paid' ? 'bg-emerald-50 text-emerald-800' : ''}`}><SelectValue placeholder={o.status} />
                                {sendingEmailId === o.id && <Loader2 className="h-4 w-4 animate-spin ml-2"/>}
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Sent" disabled={!company?.email || !o.receipt_url}>
                                        <div className="flex items-center">
                                            Sent {o.status !== 'Sent' && <Send className="h-3 w-3 ml-2 text-blue-600" />}
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="Received">Received</SelectItem>
                                    <SelectItem value="Paid">Paid</SelectItem>
                                </SelectContent>
                                </Select>
                                {sendingEmailId === o.id && <p className="text-xs text-blue-500 mt-1">Sending email...</p>}
                            </TableCell>
                            <TableCell>
                                {o.receipt_url ? (
                                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-0 h-auto font-normal disabled:opacity-80" onClick={() => handleViewReceipt(o.id, o.receipt_url!)} disabled={signedUrlLoadingId === o.id}>
                                    {signedUrlLoadingId === o.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <FileText className="h-3 w-3 mr-1" />} View File
                                </Button>
                                ) : <span className="text-muted-foreground text-xs text-red-500">Missing File</span>}
                                {/* Original Upload field removed as per instruction/logic clarification */}
                            </TableCell>
                            <TableCell>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEditOrderModal(o)}><Pencil className="h-4 w-4" /></Button>
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t mt-4">
                    <p className="text-sm text-slate-500">Page {ordersPage} of {Math.ceil(totalOrdersCount / ORDERS_PAGE_SIZE)} ({totalOrdersCount} orders)</p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setOrdersPage(p => Math.max(1, p - 1))} disabled={ordersPage === 1}><ArrowLeft className="h-4 w-4 mr-2" /> Prev</Button>
                        <Button variant="outline" size="sm" onClick={() => setOrdersPage(p => Math.min(Math.ceil(totalOrdersCount / ORDERS_PAGE_SIZE), p + 1))} disabled={ordersPage >= Math.ceil(totalOrdersCount / ORDERS_PAGE_SIZE)}>Next <ArrowRight className="h-4 w-4 ml-2" /></Button>
                    </div>
                    </div>
                </div>
                )}
            </CardContent>
            </Card>
        )}

        {activeTab === 'transactions' && (
            <TransactionsTab 
                companyId={companyId} 
                companyName={company.name}
                onUpdate={loadFinancials} 
            />
        )}
      </div>

      {/* EDIT COMPANY MODAL */}
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

      {/* CREATE ORDER MODAL */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Create New Order</DialogTitle><DialogDescription>Enter details and upload the order file/receipt.</DialogDescription></DialogHeader>
          <form onSubmit={handleCreateOrder} className="space-y-4">
            <div className="space-y-2"><Label className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-500" /> Order Date</Label><Input type="date" value={newOrderData.date} onChange={e => setNewOrderData({...newOrderData, date:e.target.value})} /></div>
            <div className="space-y-2"><Label>Amount (LYD)</Label><Input type="number" step="0.01" value={newOrderData.amount} onChange={e=>setNewOrderData({...newOrderData, amount:e.target.value})} required /></div>
            <div className="space-y-2"><Label>Cards Quantity</Label><Input type="number" value={newOrderData.cards} onChange={e=>setNewOrderData({...newOrderData, cards:e.target.value})} required /></div>
            <div className="space-y-2 border-t pt-4">
                <Label className="flex items-center gap-2 font-medium text-slate-700">
                    <FileText className="h-4 w-4" /> Order File (Required)
                </Label>
                <Input type="file" required onChange={e => setNewOrderFile(e.target.files ? e.target.files[0] : null)} />
                <p className="text-xs text-muted-foreground pt-1">This file will be emailed when status is set to {"Sent."}</p>
            </div>
            <DialogFooter><Button type="submit" disabled={isSubmittingOrder}>{isSubmittingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Create Order"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT ORDER MODAL */}
      <Dialog open={isEditOrderModalOpen} onOpenChange={setIsEditOrderModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Edit Order #{editingOrderData.id}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveEditedOrder} className="space-y-4">
            <div className="space-y-2"><Label className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-500" /> Order Date</Label><Input type="date" value={editingOrderData.date} onChange={e => setEditingOrderData({...editingOrderData, date:e.target.value})} required /></div>
            <div className="space-y-2"><Label>Amount (LYD)</Label><Input type="number" step="0.01" value={editingOrderData.amount} onChange={e=>setEditingOrderData({...editingOrderData, amount:e.target.value})} required /></div>
            <div className="space-y-2"><Label>Cards Quantity</Label><Input type="number" value={editingOrderData.cards} onChange={e=>setEditingOrderData({...editingOrderData, cards:e.target.value})} required /></div>
            {editingOrderData.receipt_url && (
                <div className="space-y-2 p-3 bg-slate-50 border rounded-lg">
                    <Label className="text-xs uppercase text-slate-500">Current Order File</Label>
                    <p className="text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600"/> 
                        {editingOrderData.receipt_url.split('/').pop()}
                    </p>
                </div>
            )}
            <DialogFooter className="flex flex-col sm:flex-row-reverse sm:justify-between pt-4 border-t">
                <Button type="submit" disabled={isUpdatingOrder}>{isUpdatingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Save Changes"}</Button>
                <Button type="button" variant="destructive" disabled={isDeletingOrder} onClick={() => handleDeleteOrder(editingOrderData.id)} className="mt-3 sm:mt-0">{isDeletingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <><Trash2 className="h-4 w-4 mr-2"/> Delete Order</>}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}