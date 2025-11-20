"use client"

import { useState } from "react"
import { transactions as initialData } from "@/lib/data/transactions"
import { companies } from "@/lib/data/companies"
import type { Transaction } from "@/lib/types"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"


export default function TransactionsPage() {
const [list, setList] = useState<Transaction[]>(initialData)
  const [viewImage, setViewImage] = useState<string | null>(null)

  // Form state
  const [companyId, setCompanyId] = useState("")
  const [type, setType] = useState("Received")
  const [amount, setAmount] = useState("")
  const [notes, setNotes] = useState("")

  // Filters
  const [filterType, setFilterType] = useState("all")
  const [filterCompany, setFilterCompany] = useState("all")

  function addTransaction() {
    if (!companyId || !amount) return

    const company = companies.find((c) => c.id === Number(companyId))

const newTx: Transaction = {
  id: list.length + 1,
  companyId: Number(companyId),
  companyName: company?.name || "",
  type: type as "Received" | "Paid",
  amount: Number(amount),
  date: new Date().toISOString().slice(0, 10),
  receipt: null,
  notes,
}


    setList([newTx, ...list])

    setCompanyId("")
    setAmount("")
    setType("Received")
    setNotes("")
  }

  function uploadReceipt(txId: number, file: File) {
    const url = URL.createObjectURL(file)

    const updated = list.map((t) =>
      t.id === txId ? { ...t, receipt: url } : t
    )

    setList(updated)
  }

  const filteredList = list.filter((tx) => {
    const typeMatch = filterType === "all" || tx.type === filterType
    const companyMatch = filterCompany === "all" || tx.companyId === Number(filterCompany)
    return typeMatch && companyMatch
  })

  function getBadgeColor(type: string) {
    return type === "Received"
      ? "bg-green-200 text-green-800"
      : "bg-red-200 text-red-800"
  }

  return (
    <div className="space-y-8">

      <h1 className="text-2xl font-bold">Transactions</h1>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <Card>
          <CardHeader>
            <CardTitle>Total Received</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-green-700">
            {list
              .filter((tx) => tx.type === "Received")
              .reduce((sum, tx) => sum + tx.amount, 0)} LYD
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Paid</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-red-700">
            {list
              .filter((tx) => tx.type === "Paid")
              .reduce((sum, tx) => sum + tx.amount, 0)} LYD
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Balance</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {
              list.reduce((balance, tx) => {
                return tx.type === "Received"
                  ? balance + tx.amount
                  : balance - tx.amount
              }, 0)
            } LYD
          </CardContent>
        </Card>

      </div>

      {/* HEADER WITH ADD BUTTON */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">All Transactions</h2>

        <Dialog>
          <DialogTrigger asChild>
            <Button>Add Transaction</Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Transaction</DialogTitle>
              <DialogDescription>Record a new transaction.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">

              <Select onValueChange={setCompanyId} value={companyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select onValueChange={setType} defaultValue="Received">
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Received">Received</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                </SelectContent>
              </Select>

              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                placeholder="Amount (LYD)"
              />

              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes..."
              />

            </div>

            <DialogFooter>
              <Button onClick={addTransaction}>Save</Button>
            </DialogFooter>

          </DialogContent>
        </Dialog>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-4 justify-end">

        <Select onValueChange={setFilterType} defaultValue="all">
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Received">Received</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={setFilterCompany} defaultValue="all">
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by Company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

      </div>

      {/* TABLE */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Receipt</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {filteredList.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell>{tx.date}</TableCell>
              <TableCell>{tx.companyName}</TableCell>
              <TableCell>
                <Badge className={getBadgeColor(tx.type)}>{tx.type}</Badge>
              </TableCell>
              <TableCell>{tx.amount} LYD</TableCell>
              <TableCell>{tx.notes || "-"}</TableCell>

              <TableCell>
                {tx.receipt ? (
                  <Avatar className="h-12 w-12 cursor-pointer">
                    <AvatarImage 
                      src={tx.receipt}
                      onClick={() => setViewImage(tx.receipt!)}
                    />
                    <AvatarFallback>IMG</AvatarFallback>
                  </Avatar>
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      e.target.files?.[0] &&
                      uploadReceipt(tx.id, e.target.files[0])
                    }
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* IMAGE PREVIEW */}
      <Dialog open={!!viewImage} onOpenChange={() => setViewImage(null)}>
        <DialogContent className="max-w-lg">
          {viewImage && <img src={viewImage} className="w-full rounded" />}
        </DialogContent>
      </Dialog>

    </div>
  )
}
