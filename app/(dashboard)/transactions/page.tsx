"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

import {
  ArrowLeft,
  Building2,
  Filter,
  Loader2,
  Check,
  AlertTriangle,
  Plus,
  Wallet,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  User,
  ArrowRightLeft,
  ExternalLink,
  Pencil, // Added Pencil icon
} from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  receipt_url: string | null; // storage path or old full URL
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
  const router = useRouter();

  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
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
  const [isModalOpen, setIsModalOpen] = useState(false); // Renamed from isAddModalOpen
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null); // NEW: Track edit mode

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

  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // --- DATA LOADING ---

  const loadCompanies = async () => {
    const { data, error } = await supabase.from("companies").select("id, name").order("name");

    if (error) {
      console.error(error);
      return;
    }
    if (data) setCompanies(data);
  };

  const loadStats = useCallback(async () => {
    let query = supabase.from("transactions").select("amount, type");

    if (selectedCompanyId !== "all") {
      query = query.eq("company_id", selectedCompanyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      return;
    }

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
      .select(
        `
        *,
        companies (name)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (selectedCompanyId !== "all") {
      query = query.eq("company_id", selectedCompanyId);
    }

    const { data, error, count } = await query;

    if (error) {
      showStatus("error", error.message);
      setLoading(false);
      return;
    }

    // Map receipt_url -> signed URL if it's a storage path
    const withSignedUrls: Transaction[] = await Promise.all(
      (data || []).map(async (tx: any) => {
        if (!tx.receipt_url) return tx;

        // If already a full URL (old data), use as-is
        if (typeof tx.receipt_url === "string" && tx.receipt_url.startsWith("http")) {
          return tx;
        }

        // Otherwise treat it as a path within the "receipts" bucket
        const { data: signed, error: signErr } = await supabase.storage
          .from("receipts")
          .createSignedUrl(tx.receipt_url, 60 * 60 * 24 * 7); // 7 days

        if (signErr || !signed?.signedUrl) {
          console.error("Error creating signed URL", signErr);
          return tx;
        }

        return {
          ...tx,
          receipt_url: signed.signedUrl,
        };
      })
    );

    setTransactions(withSignedUrls);
    setTotalCount(count || 0);
    setLoading(false);
  }, [page, selectedCompanyId]);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    loadTransactions();
    loadStats();
  }, [loadTransactions, loadStats]);

  // --- HELPERS FOR MODAL ---

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      company_id: "no_company",
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
      created_at: tx.created_at.split("T")[0], // Extract YYYY-MM-DD
      notes: tx.notes || "",
      sender_name: tx.sender_name || "",
      receiver_name: tx.receiver_name || "",
    });
    setReceiptFile(null); // Reset file input (user only uploads if they want to CHANGE it)
    setIsModalOpen(true);
  };

  // --- HANDLERS ---

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount) return;

    setIsSubmitting(true);

    try {
      const finalCompanyId =
        formData.company_id === "no_company" ? null : Number(formData.company_id || null);

      // 1) Upload receipt (optional)
      let storedReceiptPath: string | null = null;

      if (receiptFile) {
        const baseFolder = finalCompanyId ? `company_${finalCompanyId}` : "no_company";
        const filePath = `${baseFolder}/tx_${Date.now()}_${receiptFile.name}`;

        const { error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(filePath, receiptFile);

        if (uploadError) throw uploadError;

        storedReceiptPath = filePath;
      }

      // 2) Prepare payload
      const payload: any = {
        company_id: finalCompanyId,
        amount: Number(formData.amount),
        type: formData.type === "Received" ? "Received" : "Paid",
        created_at: formData.created_at,
        notes: formData.notes || null,
        sender_name: formData.sender_name || null,
        receiver_name: formData.receiver_name || null,
      };

      // Only update receipt_url if a new file was uploaded
      if (storedReceiptPath) {
        payload.receipt_url = storedReceiptPath;
      }

      let error;

      if (editingId) {
        // --- UPDATE MODE ---
        const { error: updateError } = await supabase
          .from("transactions")
          .update(payload)
          .eq("id", editingId);
        error = updateError;
      } else {
        // --- CREATE MODE ---
        // Ensure receipt_url is null if not provided during create
        if (!storedReceiptPath) payload.receipt_url = null;
        
        const { error: insertError } = await supabase
          .from("transactions")
          .insert(payload);
        error = insertError;
      }

      if (error) throw error;

      showStatus("success", `Transaction ${editingId ? "updated" : "added"} successfully`);
      setIsModalOpen(false);

      // Reload
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

    const { error } = await supabase.from("transactions").delete().eq("id", deleteId);

    if (error) showStatus("error", error.message);
    else {
      showStatus("success", "Transaction deleted");
      loadTransactions();
      loadStats();
    }

    setDeleteId(null);
    setIsDeleteModalOpen(false);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  // --- RENDER ---

  return (
    <div className="flex flex-col gap-8 p-6 max-w-7xl mx-auto w-full">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="h-8 w-8 text-blue-600" /> Financial Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage all incoming and outgoing transactions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Transaction
          </Button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-emerald-50 border-emerald-100">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700">Total Received (In)</p>
              <p className="text-2xl font-bold text-emerald-800">
                {formatMoney(stats.totalReceived)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-200 flex items-center justify-center">
              <ArrowDownLeft className="h-6 w-6 text-emerald-700" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-100">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700">Total Paid (Out)</p>
              <p className="text-2xl font-bold text-red-800">
                {formatMoney(stats.totalPaid)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-red-200 flex items-center justify-center">
              <ArrowUpRight className="h-6 w-6 text-red-700" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`${
            stats.balance >= 0
              ? "bg-blue-50 border-blue-100"
              : "bg-orange-50 border-orange-100"
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p
                className={`text-sm font-medium ${
                  stats.balance >= 0 ? "text-blue-700" : "text-orange-700"
                }`}
              >
                Net Balance
              </p>
              <p
                className={`text-2xl font-bold ${
                  stats.balance >= 0 ? "text-blue-800" : "text-orange-800"
                }`}
              >
                {formatMoney(stats.balance)}
              </p>
            </div>
            <Wallet
              className={`h-8 w-8 ${
                stats.balance >= 0 ? "text-blue-300" : "text-orange-300"
              }`}
            />
          </CardContent>
        </Card>
      </div>

      {/* STATUS MESSAGE */}
      {statusMessage && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            statusMessage.type === "success"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {statusMessage.type === "success" ? (
            <Check className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
          <p className="text-sm font-medium">{statusMessage.text}</p>
        </div>
      )}

      {/* MAIN TABLE + FILTERS */}
      <Card className="shadow-md border border-slate-200">
        <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <span className="font-semibold text-slate-700">Filter Transactions</span>
          </div>
          <div className="w-[250px]">
            <Select
              value={selectedCompanyId}
              onValueChange={(val) => {
                setSelectedCompanyId(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Filter by Company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No transactions found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[100px]">Date</TableHead>
                      <TableHead className="w-[180px]">Company/Entity</TableHead>
                      <TableHead className="w-[120px]">Transaction Flow</TableHead>
                      <TableHead className="w-[120px]">Amount</TableHead>
                      <TableHead className="w-[160px]">Notes</TableHead>
                      <TableHead className="w-[120px]">Receipt</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        {/* Date */}
                        <TableCell className="font-medium text-slate-600">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </TableCell>

                        {/* Company / Entity */}
                        <TableCell>
                          {tx.companies ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-slate-400" />
                              <span
                                className="font-medium text-blue-600 hover:underline cursor-pointer"
                                onClick={() =>
                                  router.push(`/companies/${tx.company_id}?tab=transactions`)
                                }
                              >
                                {tx.companies.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic flex items-center gap-2">
                              <User className="h-4 w-4" /> Independent
                            </span>
                          )}
                        </TableCell>

                        {/* Flow + Type */}
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-slate-700">
                                {tx.sender_name || "?"}
                              </span>
                              <ArrowRight className="h-3 w-3 text-slate-400" />
                              <span className="font-medium text-slate-700">
                                {tx.receiver_name || "?"}
                              </span>
                            </div>
                            <span
                              className={`inline-flex w-fit items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                                tx.type === "Received"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {tx.type}
                            </span>
                          </div>
                        </TableCell>

                        {/* Amount */}
                        <TableCell
                          className={`font-mono font-medium ${
                            tx.type === "Received"
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {tx.type === "Paid" ? "-" : "+"}
                          {formatMoney(tx.amount)}
                        </TableCell>

                        {/* Notes */}
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm text-slate-700 truncate max-w-xs">
                              {tx.notes || ""}
                            </span>
                          </div>
                        </TableCell>

                        {/* Receipt */}
                        <TableCell>
                          {tx.receipt_url ? (
                            <a
                              href={tx.receipt_url}
                              target="_blank"
                              className="text-blue-600 underline text-sm flex items-center gap-1 hover:text-blue-700"
                            >
                              View <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>

                        {/* Actions: Edit & Delete */}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(tx)}
                              className="h-8 w-8 text-slate-400 hover:text-blue-600"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeleteId(tx.id);
                                setIsDeleteModalOpen(true);
                              }}
                              className="h-8 w-8 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-slate-500">
                  Page {page} of {totalPages} ({totalCount} transactions)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* CREATE / EDIT TRANSACTION MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Transaction" : "Add Transaction"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update details for this transaction."
                : "Record money movement, drivers, and specific parties involved."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTransaction} className="space-y-4">
            {/* Amount + Date */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-md border border-slate-100">
              <div className="space-y-2">
                <Label className="text-slate-600">
                  Amount (LYD) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500"></span>
                  <Input
                    type="number"
                    step="0.01"
                    className="pl-7 font-mono text-lg"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600">
                  Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.created_at}
                  onChange={(e) =>
                    setFormData({ ...formData, created_at: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            {/* Type + Company */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val: "Received" | "Paid") =>
                    setFormData({ ...formData, type: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Received">Money In (Received)</SelectItem>
                    <SelectItem value="Paid">Money Out (Paid)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Company (Optional)</Label>
                <Select
                  value={formData.company_id}
                  onValueChange={(val) =>
                    setFormData({ ...formData, company_id: val })
                  }
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select Company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="no_company"
                      className="text-slate-500 font-medium"
                    >
                      -- No Company / Independent --
                    </SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t border-slate-100 my-2"></div>

            {/* Parties */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-blue-600 font-semibold">
                <ArrowRightLeft className="h-4 w-4" /> Transaction Parties
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500 uppercase tracking-wider">
                    Sender (From)
                  </Label>
                  <Input
                    placeholder="Who gave the money?"
                    value={formData.sender_name}
                    onChange={(e) =>
                      setFormData({ ...formData, sender_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500 uppercase tracking-wider">
                    Receiver (To)
                  </Label>
                  <Input
                    placeholder="Who got the money?"
                    value={formData.receiver_name}
                    onChange={(e) =>
                      setFormData({ ...formData, receiver_name: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Description / Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Any additional details..."
                rows={2}
              />
            </div>

            {/* Receipt upload */}
            <div className="space-y-2">
              <Label>
                {editingId ? "Replace Receipt (Optional)" : "Receipt (Optional)"}
              </Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              />
              {editingId && (
                <p className="text-xs text-muted-foreground">
                  Leave empty to keep existing receipt.
                </p>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 w-full md:w-auto"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {editingId ? "Update Transaction" : "Save Transaction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>

            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}