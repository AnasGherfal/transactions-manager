"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

type Company = {
  id: number
  name: string
  email: string | null
  phone: string | null
  percent_cut: number | null
  address: string | null
  google_maps_url: string | null
  notes: string | null
}

type Order = {
  id: number
  amount: number
  cards: number
  status: string
  created_at: string
  receipt_url: string | null
}

type Transaction = {
  id: number
  type: "Received" | "Paid"
  amount: number
  created_at: string
  receipt_url: string | null
}

export default function CompanyDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)

  const [company, setCompany] = useState<Company | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    setLoading(true)

    // 1) Fetch company
    const { data: companyData } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .single()

    // 2) Fetch orders
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .eq("company_id", id)
      .order("created_at", { ascending: false })

    // 3) Fetch transactions
    const { data: txData } = await supabase
      .from("transactions")
      .select("*")
      .eq("company_id", id)
      .order("created_at", { ascending: false })

    setCompany(companyData)
    setOrders(ordersData || [])
    setTransactions(txData || [])
    setLoading(false)
  }

  if (loading) return <p className="p-4">Loading...</p>
  if (!company) return <p className="p-4">Company not found</p>

  return (
    <div className="space-y-10 max-w-5xl mx-auto">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{company.name}</h1>
          <p className="text-sm text-muted-foreground">
            Manage orders, transactions, company details, and history.
          </p>
        </div>

        <Button variant="outline" onClick={() => router.back()}>
          ← Back
        </Button>
      </div>

      {/* COMPANY INFO */}
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p>{company.email ?? "-"}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Phone</p>
              <p>{company.phone ?? "-"}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Percent Cut</p>
              <p>{company.percent_cut ?? 0}%</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Address</p>
              <p>{company.address ?? "-"}</p>

              {company.google_maps_url && (
                <a
                  href={company.google_maps_url}
                  target="_blank"
                  className="text-blue-600 underline text-sm"
                >
                  Open in Google Maps
                </a>
              )}
            </div>

          </div>

          {/* Notes */}
          {company.notes && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Notes</p>
              <p className="whitespace-pre-line">{company.notes}</p>
            </div>
          )}

        </CardContent>
      </Card>

      {/* ORDERS */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Orders</h2>
        <Link href={`/orders/add?company=${company.id}`}>
          <Button>Add Order</Button>
        </Link>
      </div>

      <Card>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-muted-foreground">No orders yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Cards</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Receipt</TableHead>
                </TableRow>
              </TableHeader>

   <TableBody>
  {orders.map((o) => (
    <TableRow key={o.id}>
      <TableCell>{o.created_at.slice(0, 10)}</TableCell>
      <TableCell>{o.amount} LYD</TableCell>
      <TableCell>{o.cards}</TableCell>
      
      {/* Status Changing */}
      <TableCell>
        <Select
          defaultValue={o.status}
          onValueChange={async (newStatus) => {
            // Build request
            const payload: any = {
              orderId: o.id,
              newStatus,
              amount: o.amount,
              cards: o.cards,
              companyEmail: company.email,
            }

            // If changing to Received → require receipt upload
         if (newStatus === "Paid" && !o.receipt_url) {
  alert("Upload receipt before marking the order as Paid.")
  return
}

            const res = await fetch("/api/orders/update-status", {
              method: "POST",
              body: JSON.stringify(payload),
              headers: { "Content-Type": "application/json" }
            })

            const response = await res.json()

            if (!res.ok) {
              alert("Error: " + response.error)
              return
            }

            // Reload orders
            const { data } = await supabase
              .from("orders")
              .select("*")
              .eq("company_id", id)
              .order("created_at", { ascending: false })

            setOrders(data || [])
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Sent">Sent</SelectItem>
            <SelectItem value="Received">Received</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>

      {/* Receipt Upload */}
{/* RECEIPT */}
<TableCell>
  {o.status === "Received" && !o.receipt_url ? (
    <Input
      type="file"
      accept="image/*"
      onChange={async (e) => {
        if (!e.target.files) return;
        const file = e.target.files[0];

const filePath = `receipts/${o.id}/${Date.now()}_${file.name}`

const { data: uploadData, error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(filePath, file)

    if (uploadError) {
      alert("Upload failed: " + uploadError.message)
      return
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({ receipt_url: uploadData.path }) // <--- SAVING PATH
      .eq("id", o.id)

    if (updateError) {
      alert("Database update failed")
      return
    }

loadData()      }}
    />
  ) : o.receipt_url ? (
    <a href={o.receipt_url} target="_blank" className="text-blue-600 underline">
      View Receipt
    </a>
  ) : (
    "-"
  )}
</TableCell>



    </TableRow>
  ))}
</TableBody>



            </Table>
          )}
        </CardContent>
      </Card>

      {/* TRANSACTIONS */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Transactions</h2>
        <Link href={`/transactions/add?company=${company.id}`}>
          <Button>Add Transaction</Button>
        </Link>
      </div>

      <Card>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground">No transactions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Receipt</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.created_at.slice(0, 10)}</TableCell>
                    <TableCell>{t.type}</TableCell>
                    <TableCell>{t.amount} LYD</TableCell>

                    <TableCell>
                      {t.receipt_url ? (
                        <a
                          href={t.receipt_url}
                          target="_blank"
                          className="text-blue-600 underline text-sm"
                        >
                          View
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
