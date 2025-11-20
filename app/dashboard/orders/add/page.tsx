"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

import { createOrderAction } from "@/actions/orders" 
import { sendOrderEmail } from "@/actions/email" // <--- IMPORT NEW ACTION

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

export default function AddOrderPage() {
  const router = useRouter()
  const params = useSearchParams()
  const preselectedCompany = params.get("company")

  const [companies, setCompanies] = useState<any[]>([])
  const [companyId, setCompanyId] = useState(preselectedCompany || "")
  const [amount, setAmount] = useState("")
  const [cards, setCards] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadCompanies()
  }, [])

  async function loadCompanies() {
    const { data } = await supabase.from("companies").select("*")
    setCompanies(data || [])
  }

  async function handleSubmit() {
    if (!companyId || !amount || !cards) {
        alert("Please fill in all fields")
        return
    }
    setLoading(true)

    try {
      // 1. Upload File to Supabase Storage (Client Side is faster for uploads)
      let uploadedPath: string | null = null

      if (file) {
        const filePath = `receipts/${companyId}/${Date.now()}_${file.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(filePath, file)

        if (uploadError) throw new Error("Upload failed: " + uploadError.message)
        uploadedPath = uploadData.path
      }

      // 2. Save Order to DB (Server Action)
      const result = await createOrderAction({
        companyId: Number(companyId),
        amount: Number(amount),
        cards: Number(cards),
        receiptPath: uploadedPath,
      })

      if (!result.success) throw new Error(result.error)

      // 3. Send Email (Server Action) - NO FETCH HERE
      const company = companies.find((c) => String(c.id) === String(companyId))
      if (company?.email) {
        
        // We must use FormData to send a File object to a Server Action
        const emailFormData = new FormData()
        emailFormData.append("email", company.email)
        emailFormData.append("amount", amount)
        emailFormData.append("cards", cards)
        if (file) emailFormData.append("file", file)

        // Direct function call!
        await sendOrderEmail(emailFormData) 
      }

      router.push(`/companies/${companyId}`)
      
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto py-10 space-y-8">
       {/* ... JSX remains exactly the same ... */}
       <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Add Order</h1>
        <Button variant="outline" onClick={() => router.back()}>← Back</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Select */}
          <div>
            <label className="text-sm font-medium mb-1 block">Company</label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Inputs */}
          <div>
            <label className="text-sm font-medium mb-1 block">Amount (LYD)</label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Cards</label>
            <Input value={cards} onChange={(e) => setCards(e.target.value)} type="number" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Receipt</label>
            <Input type="file" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Order"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}