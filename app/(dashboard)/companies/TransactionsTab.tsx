'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from "@supabase/ssr";
import { 
  Plus, Search, Filter, ArrowUpRight, ArrowDownLeft, 
  DollarSign, FileText, Loader2, Trash2, ExternalLink, 
  UploadCloud, ArrowRight, ArrowRightLeft, Calendar, 
  Pencil, Check, X
} from 'lucide-react';

import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";

// --- Types ---
type TransactionType = 'Received' | 'Paid';

interface Transaction {
  id: number;
  created_at: string;
  amount: number;
  type: TransactionType;
  receipt_url: string | null;
  company_id?: number;
  sender_name?: string | null;
  receiver_name?: string | null;
  notes?: string | null;
}

interface TransactionsTabProps {
  companyId: number;
  companyName?: string;
  onUpdate?: () => void; // Callback to refresh parent stats
}

const PAGE_SIZE = 10;

export default function TransactionsTab({ 
  companyId, 
  companyName,
  onUpdate
}: TransactionsTabProps) {
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // --- State ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form Data
  const [formData, setFormData] = useState({
    amount: '',
    type: 'Received' as TransactionType,
    created_at: new Date().toISOString().split('T')[0],
    sender_name: '',
    receiver_name: '',
    notes: ''
  });

  // --- Data Loading ---
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await supabase
      .from("transactions")
      .select("*", { count: "exact" })
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error loading transactions:", error);
      setLoading(false);
      return;
    }

    // Sign URLs
    const withSignedUrls: Transaction[] = await Promise.all(
      (data || []).map(async (tx: any) => {
        if (!tx.receipt_url) return tx;
        if (typeof tx.receipt_url === "string" && tx.receipt_url.startsWith("http")) return tx;

        const { data: signed, error: signErr } = await supabase.storage
          .from("receipts")
          .createSignedUrl(tx.receipt_url, 60 * 60 * 24 * 7);

        if (signErr || !signed?.signedUrl) return tx;

        return { ...tx, receipt_url: signed.signedUrl };
      })
    );

    setTransactions(withSignedUrls);
    setTotalCount(count || 0);
    setLoading(false);
  }, [companyId, page, supabase]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // --- Helpers ---
  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      amount: '',
      type: 'Received',
      created_at: new Date().toISOString().split('T')[0],
      sender_name: '',
      receiver_name: '',
      notes: ''
    });
    setReceiptFile(null);
    setIsFormOpen(true);
  };

  const openEditModal = (tx: Transaction) => {
    setEditingId(tx.id);
    setFormData({
      amount: tx.amount.toString(),
      type: tx.type,
      created_at: tx.created_at.split('T')[0],
      sender_name: tx.sender_name || '',
      receiver_name: tx.receiver_name || '',
      notes: tx.notes || ''
    });
    setReceiptFile(null);
    setIsFormOpen(true);
  };

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("en-LY", {
      style: "currency",
      currency: "LYD",
      maximumFractionDigits: 2,
    }).format(amount);

  // --- Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) return;
    setIsSubmitting(true);

    try {
      let storedReceiptPath: string | null = null;

      if (receiptFile) {
        const baseFolder = companyId ? `company_${companyId}` : "no_company";
        const filePath = `${baseFolder}/tx_${Date.now()}_${receiptFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(filePath, receiptFile);
        if (uploadError) throw uploadError;
        storedReceiptPath = filePath;
      }

      const payload: any = {
        company_id: companyId,
        amount: Number(formData.amount),
        type: formData.type,
        created_at: formData.created_at,
        sender_name: formData.sender_name || null,
        receiver_name: formData.receiver_name || null,
        notes: formData.notes || null,
      };

      if (storedReceiptPath) payload.receipt_url = storedReceiptPath;

      if (editingId) {
        const { error } = await supabase.from("transactions").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        if (!storedReceiptPath) payload.receipt_url = null;
        const { error } = await supabase.from("transactions").insert(payload);
        if (error) throw error;
      }

      setIsFormOpen(false);
      loadTransactions();
      
      // Refresh parent stats instantly
      if (onUpdate) onUpdate();

    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    await supabase.from("transactions").delete().eq("id", id);
    loadTransactions();
    // Refresh parent stats instantly
    if (onUpdate) onUpdate();
  };

  // Filter Logic
  const displayTransactions = transactions.filter(t => 
    !searchTerm || 
    t.amount.toString().includes(searchTerm) ||
    (t.sender_name && t.sender_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t.receiver_name && t.receiver_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <div className="space-y-4">
      {/* --- Header / Toolbar --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search transactions..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" /> Filter
          </Button>
          <Button onClick={openAddModal} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Add Transaction
          </Button>
        </div>
      </div>

      {/* --- Table --- */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[250px]">Transaction Parties</TableHead>
                  <TableHead className="min-w-[200px]">Notes</TableHead>
                  <TableHead className="w-[100px]">Receipt</TableHead>
                  <TableHead className="text-right w-[140px]">Amount</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                    </TableCell>
                  </TableRow>
                ) : displayTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No transactions found for {companyName}.
                    </TableCell>
                  </TableRow>
                ) : (
                  displayTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium text-slate-700">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-slate-900">{tx.sender_name || "?"}</span>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            <span className="font-medium text-slate-900">{tx.receiver_name || "?"}</span>
                          </div>
                          <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                            tx.type === 'Received' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {tx.type === 'Received' ? <ArrowDownLeft className="mr-1 h-3 w-3"/> : <ArrowUpRight className="mr-1 h-3 w-3"/>}
                            {tx.type}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-slate-600 line-clamp-2">{tx.notes || "-"}</p>
                      </TableCell>
                      <TableCell>
                        {tx.receipt_url ? (
                          <Button variant="ghost" size="sm" className="h-8 text-blue-600" asChild>
                            <a href={tx.receipt_url} target="_blank" rel="noreferrer">
                              <FileText className="mr-1 h-3 w-3" /> View
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className={`text-right font-mono font-medium ${
                        tx.type === 'Received' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {tx.type === 'Received' ? '+' : '-'}{formatMoney(tx.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-600" onClick={() => openEditModal(tx)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-600" onClick={() => handleDelete(tx.id)}>
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

          {!loading && totalCount > 0 && (
            <div className="flex items-center justify-between p-4 border-t bg-slate-50/50">
              <p className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- Add/Edit Dialog --- */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Transaction' : 'New Transaction'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Modify details.' : 'Record a new financial movement.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-md border">
              <div className="space-y-2">
                <Label>Amount (LYD)</Label>
                <div className="relative">
                  <Input type="number" step="0.01" min="0" placeholder="0.00" className="pl-8 font-mono" required value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})}/>
                  <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" required value={formData.created_at} onChange={(e) => setFormData({...formData, created_at: e.target.value})}/>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select value={formData.type} onValueChange={(val: TransactionType) => setFormData({...formData, type: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Received"><span className="flex items-center text-emerald-600"><ArrowDownLeft className="mr-2 h-4 w-4"/> Money In (Received)</span></SelectItem>
                  <SelectItem value="Paid"><span className="flex items-center text-red-600"><ArrowUpRight className="mr-2 h-4 w-4"/> Money Out (Paid)</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border-t" />
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-blue-600"><ArrowRightLeft className="h-4 w-4" /> Parties involved</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-xs text-slate-500 uppercase">Sender (From)</Label><Input placeholder="Name..." value={formData.sender_name} onChange={(e) => setFormData({...formData, sender_name: e.target.value})}/></div>
                <div className="space-y-2"><Label className="text-xs text-slate-500 uppercase">Receiver (To)</Label><Input placeholder="Name..." value={formData.receiver_name} onChange={(e) => setFormData({...formData, receiver_name: e.target.value})}/></div>
              </div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Optional description..." rows={2} value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})}/></div>
            <div className="space-y-2">
              <Label>{editingId ? "Replace Receipt (Optional)" : "Receipt (Optional)"}</Label>
              <Input type="file" accept="image/*,application/pdf" onChange={handleFileChange}/>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} {editingId ? 'Update Transaction' : 'Save Transaction'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}