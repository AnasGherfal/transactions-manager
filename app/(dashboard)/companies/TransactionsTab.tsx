"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Loader2,
  Wallet,
  ExternalLink,
  Plus,
  ArrowLeft,
  ArrowRight,
  Receipt,
  Check,
  DollarSign,
  Trash2,
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
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Transaction = {
  id: number;
  type: "Received" | "Paid";
  amount: number;
  created_at: string;
  receipt_url: string | null; // storage path or full URL
};

const PAGE_SIZE = 10;

export default function TransactionsTab({ companyId }: { companyId: number }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    amount: "",
    type: "Received" as "Received" | "Paid",
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Delete confirmation modal
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("en-LY", {
      style: "currency",
      currency: "LYD",
      maximumFractionDigits: 0,
    }).format(amount);

      const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };
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

    // Sign any stored paths
    const withSignedUrls: Transaction[] = await Promise.all(
      (data || []).map(async (tx: any) => {
        if (!tx.receipt_url) return tx;

        if (typeof tx.receipt_url === "string" && tx.receipt_url.startsWith("http")) {
          // Old data: already a full URL
          return tx;
        }

        const { data: signed, error: signErr } = await supabase.storage
          .from("receipts")
          .createSignedUrl(tx.receipt_url, 60 * 60 * 24 * 7); // 7 days

        if (signErr || !signed?.signedUrl) {
          console.error("Error signing URL", signErr);
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
  }, [companyId, page, supabase]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // --- ADD TRANSACTION LOGIC ---
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransaction.amount) return;

    setIsSubmitting(true);

    try {
      let storedReceiptPath: string | null = null;

      if (receiptFile) {
        // Match same folder pattern as main page
        const baseFolder = companyId ? `company_${companyId}` : "no_company";
        const filePath = `${baseFolder}/tx_${Date.now()}_${receiptFile.name}`;

        const { error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(filePath, receiptFile);

        if (uploadError) throw uploadError;

        storedReceiptPath = filePath; // store ONLY the path
      }

      const { error: insertError } = await supabase.from("transactions").insert({
        company_id: companyId,
        amount: Number(newTransaction.amount),
        type: newTransaction.type,
        receipt_url: storedReceiptPath,
      });

      if (insertError) throw insertError;

      setIsAddModalOpen(false);
      setNewTransaction({ amount: "", type: "Received" });
      setReceiptFile(null);
      loadTransactions();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
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

  return (
    <>
      <Card className="shadow-lg border-2 border-slate-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xl flex items-center gap-2 text-slate-800">
            <Wallet className="h-5 w-5 text-blue-600" />
            Financial Transactions
          </CardTitle>
          <Button
            className="bg-slate-800 text-white hover:bg-slate-700"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Transaction
          </Button>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
              <p className="mt-2 text-slate-500">Loading ledger...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed">
              <Receipt className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="text-muted-foreground">No transactions found.</p>
              <Button variant="link" onClick={() => setIsAddModalOpen(true)}>
                Record your first payment
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Receipt</TableHead>
                      <TableHead className="w-[50px]"></TableHead>

                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow
                        key={t.id}
                        className={t.type === "Paid" ? "bg-red-50/50" : "bg-emerald-50/50"}
                      >
                   
                        <TableCell className="text-sm">
                          {new Date(t.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              t.type === "Paid"
                                ? "bg-red-500 hover:bg-red-600"
                                : "bg-emerald-500 hover:bg-emerald-600"
                            }
                          >
                            {t.type}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono font-semibold ${
                            t.type === "Paid" ? "text-red-600" : "text-emerald-600"
                          }`}
                        >
                          {t.type === "Paid" ? "-" : "+"} {formatMoney(t.amount)}
                        </TableCell>
                        <TableCell>
                          {t.receipt_url ? (
                            <a
                              href={t.receipt_url}
                              target="_blank"
                              className="text-blue-600 underline text-sm flex items-center gap-1 hover:text-blue-700"
                            >
                              View <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                                  <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeleteId(t.id);
                              setIsDeleteModalOpen(true);
                            }}
                            className="h-8 w-8 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-slate-500">
                  Page {page} of {totalPages} ({totalCount} items)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ADD TRANSACTION DIALOG */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Record Transaction</DialogTitle>
            <DialogDescription>
              Manually record a payment received or an expense paid.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTransaction} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select
                value={newTransaction.type}
                onValueChange={(val: "Received" | "Paid") =>
                  setNewTransaction({ ...newTransaction, type: val })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Received">Received (Money In)</SelectItem>
                  <SelectItem value="Paid">Paid (Money Out)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Amount (LYD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="number"
                  className="pl-9"
                  placeholder="0.00"
                  value={newTransaction.amount}
                  onChange={(e) =>
                    setNewTransaction({ ...newTransaction, amount: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Receipt (Optional)</Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              />
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Save Transaction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
