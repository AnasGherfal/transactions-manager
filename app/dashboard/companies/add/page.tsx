"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default function AddCompanyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg("")

    const form = e.target as HTMLFormElement
    const formData = new FormData(form)
    const payload = Object.fromEntries(formData)

    const res = await fetch("/api/companies/add", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    })

    const json = await res.json()
    setLoading(false)

    if (json.success) {
      setMsg("Company added successfully!")
      setTimeout(() => router.push("/companies"), 800) // go back after success
    } else {
      setMsg("Error: " + json.error)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* PAGE HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Add Company</h1>
          <p className="text-sm text-muted-foreground">
            Add a new company to your prepaid card management system.
          </p>
        </div>

        <Button variant="outline" onClick={() => router.back()}>
          ← Back
        </Button>
      </div>

      {/* FORM CARD */}
      <Card>
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* TWO COLUMN GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="space-y-2">
                <label className="text-sm font-medium">Company Name</label>
                <Input name="name" required placeholder="Anis Store" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input name="email" type="email" placeholder="company@email.com" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input name="phone" placeholder="091-xxxxxxx" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Percent Cut</label>
                <Input name="percent_cut" type="number" placeholder="10" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Address</label>
                <Input name="address" placeholder="Tripoli - Gargaresh" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Google Maps URL</label>
                <Input
                  name="google_maps_url"
                  placeholder="https://maps.google.com/..."
                />
              </div>

            </div>

            {/* NOTES */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                name="notes"
                placeholder="Write any additional notes..."
                rows={4}
              />
            </div>

            {/* SUBMIT BUTTON */}
            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Company"}
              </Button>
            </div>

          </form>

          {msg && <p className="text-sm mt-3">{msg}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
