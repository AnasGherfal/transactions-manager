"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";

import {
  Filter, Loader2, Check, AlertTriangle, Plus, Wallet,
  ArrowRight, ArrowDownLeft, ArrowUpRight, Trash2, User,
  Pencil, Building2, FileText, Search
} from "lucide-react";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTransition } from "@/components/page-transition";

// --- TYPES ---

type Company = {
  id: number;
  name: string;
};

type Transaction = {
  id: number;
  company_id: number | null;
  amount: number;
  type: "Received" | "Paid";
  receipt_url: string | null;
  notes: string | null;
  sender_name: string | null;
  receiver_name: string | null;
  created_at: string;
  companies?: { name: string } | null;
};

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-LY", {
    style: "currency",
    currency: "LYD",
    maximumFractionDigits: 2,
  }).format(amount);

const PAGE_SIZE = 15;

export default function TransactionsPage() {
  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  // Filters
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Delete confirmation modal
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalReceived: 0,
    totalPaid: 0,
    balance: 0,
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    company_id: "no_company",
    amount: "",
    type: "Received" as "Received" | "Paid",
    created_at: new Date().toISOString().split("T")[0],
    notes: "",
    sender_name: "",
    receiver_name: "",
  });

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string; } | null>(null);

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // --- DATA LOADING ---

  const loadCompanies = async () => {
    const { data } = await supabase.from("companies").select("id, name").order("name");
    if (data) setCompanies(data);
  };

  const loadStats = useCallback(async () => {
    let query = supabase.from("transactions").select("amount, type");
    if (selectedCompanyId !== "all") {
      query = query.eq("company_id", selectedCompanyId);
    }
    const { data } = await query;

    if (data) {
      let received = 0;
      let paid = 0;
      data.forEach((tx: any) => {
        if (tx.type === "Received") received += tx.amount;
        else paid += tx.amount;
      });
      setStats({
        totalReceived: received,
        totalPaid: paid,
        balance: received - paid,
      });
    }
  }, [selectedCompanyId]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("transactions")
      .select(`*, companies (name)`, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (selectedCompanyId !== "all") {
      query = query.eq("company_id", selectedCompanyId);
    }

    if (searchTerm) {
       query = query.or(`sender_name.ilike.%${searchTerm}%,receiver_name.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      showStatus("error", error.message);
      setLoading(false);
      return;
    }

    // --- RESTORED: SIGN URLS LOGIC ---
    const transactionsWithSignedUrls = await Promise.all(
        (data as Transaction[]).map(async (tx) => {
            if (!tx.receipt_url) return tx;
            // If it's already a full http link, skip signing
            if (tx.receipt_url.startsWith("http")) return tx;

            const { data: signed, error: signErr } = await supabase.storage
                .from("receipts")
                .createSignedUrl(tx.receipt_url, 60 * 60 * 24); // Valid for 24 hours

            if (signErr || !signed?.signedUrl) return tx;

            return { ...tx, receipt_url: signed.signedUrl };
        })
    );

    setTransactions(transactionsWithSignedUrls);
    setTotalCount(count || 0);
    setLoading(false);
  }, [page, selectedCompanyId, searchTerm]);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
        loadTransactions();
        loadStats();
    }, 500);
    return () => clearTimeout(timer);
  }, [loadTransactions, loadStats]);

  // --- HELPERS ---

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      company_id: selectedCompanyId !== "all" ? selectedCompanyId : "no_company",
      amount: "",
      type: "Received",
      created_at: new Date().toISOString().split("T")[0],
      notes: "",
      sender_name: "",
      receiver_name: "",
    });
    setReceiptFile(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tx: Transaction) => {
    setEditingId(tx.id);
    setFormData({
      company_id: tx.company_id ? tx.company_id.toString() : "no_company",
      amount: tx.amount.toString(),
      type: tx.type,
      created_at: tx.created_at.split("T")[0],
      notes: tx.notes || "",
      sender_name: tx.sender_name || "",
      receiver_name: tx.receiver_name || "",
    });
    setReceiptFile(null);
    setIsModalOpen(true);
  };

  // --- ACTIONS ---

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) return;
    setIsSubmitting(true);

    try {
      const finalCompanyId = formData.company_id === "no_company" ? null : Number(formData.company_id || null);
      let storedReceiptPath: string | null = null;

      if (receiptFile) {
        const baseFolder = finalCompanyId ? `company_${finalCompanyId}` : "no_company";
        const filePath = `${baseFolder}/tx_${Date.now()}_${receiptFile.name}`;
        const { error: uploadError } = await supabase.storage.from("receipts").upload(filePath, receiptFile);
        if (uploadError) throw uploadError;
        storedReceiptPath = filePath;
      }

      const payload: any = {
        company_id: finalCompanyId,
        amount: Number(formData.amount),
        type: formData.type,
        created_at: formData.created_at,
        notes: formData.notes || null,
        sender_name: formData.sender_name || null,
        receiver_name: formData.receiver_name || null,
      };
      if (storedReceiptPath) payload.receipt_url = storedReceiptPath;

      if (editingId) {
        const { error } = await supabase.from("transactions").update(payload).eq("id", editingId);
        if (error) throw error;
        showStatus("success", "Transaction updated");
      } else {
        if (!storedReceiptPath) payload.receipt_url = null;
        const { error } = await supabase.from("transactions").insert(payload);
        if (error) throw error;
        showStatus("success", "Transaction added");
      }

      setIsModalOpen(false);
      loadTransactions();
      loadStats();

    } catch (err: any) {
      console.error(err);
      showStatus("error", err.message || "Error saving transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const previousTransactions = [...transactions];
    
    setTransactions(prev => prev.filter(t => t.id !== deleteId));
    setTotalCount(prev => prev - 1);
    setIsDeleteModalOpen(false);
    showStatus("success", "Transaction deleted");

    const { error } = await supabase.from("transactions").delete().eq("id", deleteId);

    if (error) {
      setTransactions(previousTransactions);
      setTotalCount(prev => prev + 1);
      showStatus("error", "Failed to delete: " + error.message);
    } else {
      loadStats();
    }
    setDeleteId(null);
  };

  // --- RENDER ---

  return (
    <PageTransition>
    <div className="flex flex-col gap-8 p-6 max-w-7xl mx-auto w-full">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="h-8 w-8 text-blue-600" /> Financial Overview
          </h1>
          <p className="text-muted-foreground mt-1">Manage all incoming and outgoing transactions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700 shadow-sm transition-all hover:scale-105">
            <Plus className="h-4 w-4 mr-2" /> Add Transaction
          </Button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700">Total Received</p>
              <p className="text-2xl font-bold text-emerald-800">{formatMoney(stats.totalReceived)}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-200 flex items-center justify-center">
              <ArrowDownLeft className="h-6 w-6 text-emerald-700" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-100 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700">Total Paid</p>
              <p className="text-2xl font-bold text-red-800">{formatMoney(stats.totalPaid)}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-red-200 flex items-center justify-center">
              <ArrowUpRight className="h-6 w-6 text-red-700" />
            </div>
          </CardContent>
        </Card>

        <Card className={`${stats.balance >= 0 ? "bg-blue-50 border-blue-100" : "bg-orange-50 border-orange-100"} shadow-sm`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${stats.balance >= 0 ? "text-blue-700" : "text-orange-700"}`}>Net Balance</p>
              <p className={`text-2xl font-bold ${stats.balance >= 0 ? "text-blue-800" : "text-orange-800"}`}>{formatMoney(stats.balance)}</p>
            </div>
            <Wallet className={`h-8 w-8 ${stats.balance >= 0 ? "text-blue-300" : "text-orange-300"}`} />
          </CardContent>
        </Card>
      </div>

      {/* STATUS MESSAGE */}
      {statusMessage && (
        <div className={`p-4 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${statusMessage.type === "success" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
          {statusMessage.type === "success" ? <Check className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          <p className="text-sm font-medium">{statusMessage.text}</p>
        </div>
      )}

      {/* MAIN TABLE */}
      <Card className="shadow-md border border-slate-200">
        <CardHeader className="bg-slate-50/80 border-b flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <span className="font-semibold text-slate-700">Filter Transactions</span>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
             {/* Text Search */}
             <div className="relative w-full md:w-[250px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Search sender, receiver, notes..." 
                    className="pl-9 bg-white" 
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                />
             </div>
             {/* Company Select */}
             <div className="w-full md:w-[250px]">
                <Select value={selectedCompanyId} onValueChange={(val) => { setSelectedCompanyId(val); setPage(1); }}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Filter by Company" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Transactions</SelectItem>
                    {companies.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
                </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[180px]">Company/Entity</TableHead>
                  <TableHead className="w-[150px]">Parties</TableHead>
                  <TableHead className="w-[120px] text-right">Amount</TableHead>
                  <TableHead className="w-[160px]">Notes</TableHead>
                  <TableHead className="w-[100px]">Receipt</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><div className="flex items-center gap-2"><Skeleton className="h-4 w-12" /><Skeleton className="h-4 w-12" /></div></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                      <TableCell><div className="flex justify-end gap-1"><Skeleton className="h-8 w-8 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /></div></TableCell>
                    </TableRow>
                  ))
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No transactions found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-medium text-slate-600">{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {tx.companies ? (
                          <div className="flex items-center gap-2 text-blue-600 font-medium">
                            <Building2 className="h-4 w-4" /> {tx.companies.name}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic flex items-center gap-2"><User className="h-4 w-4" /> Independent</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <span>{tx.sender_name || "?"}</span>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            <span>{tx.receiver_name || "?"}</span>
                          </div>
                          <span className={`inline-flex w-fit items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${tx.type === "Received" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                            {tx.type}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-mono font-bold ${tx.type === "Received" ? "text-emerald-600" : "text-red-600"}`}>
                        {tx.type === "Paid" ? "-" : "+"}{formatMoney(tx.amount)}
                      </TableCell>
                      <TableCell><p className="text-sm text-slate-500 truncate max-w-[150px]" title={tx.notes || ""}>{tx.notes || "-"}</p></TableCell>
                      <TableCell>
                        {tx.receipt_url ? (
                          <a href={tx.receipt_url} target="_blank" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-medium">
                            <FileText className="h-3 w-3"/> View
                          </a>
                        ) : <span className="text-xs text-slate-300">-</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-600" onClick={() => openEditModal(tx)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-600" onClick={() => { setDeleteId(tx.id); setIsDeleteModalOpen(true); }}>
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

          {!loading && (
            <div className="flex items-center justify-between p-4 border-t bg-slate-50/50">
                <p className="text-sm text-slate-500">Page {page} • Total {totalCount}</p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={transactions.length < PAGE_SIZE}>Next</Button>
                </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE / EDIT MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
            <DialogDescription>{editingId ? "Update details." : "Record money movement."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTransaction} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-md border">
              <div className="space-y-2">
                <Label>Amount (LYD)</Label>
                <Input type="number" step="0.01" className="font-mono text-lg" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={formData.created_at} onChange={(e) => setFormData({ ...formData, created_at: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={formData.type} onValueChange={(val: any) => setFormData({ ...formData, type: val })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Received">Received (In)</SelectItem>
                            <SelectItem value="Paid">Paid (Out)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Company</Label>
                    <Select value={formData.company_id} onValueChange={(val) => setFormData({ ...formData, company_id: val })}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="no_company">-- Independent --</SelectItem>
                            {companies.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Sender</Label><Input value={formData.sender_name} onChange={e => setFormData({...formData, sender_name: e.target.value})} /></div>
                <div className="space-y-2"><Label>Receiver</Label><Input value={formData.receiver_name} onChange={e => setFormData({...formData, receiver_name: e.target.value})} /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={2}/></div>
            <div className="space-y-2"><Label>Receipt (Optional)</Label><Input type="file" onChange={e => setReceiptFile(e.target.files?.[0] || null)} /></div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : null} Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM MODAL */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2"><AlertTriangle className="h-5 w-5"/> Confirm Delete</DialogTitle>
            <DialogDescription>Are you sure? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete Record</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </PageTransition>
  );
}