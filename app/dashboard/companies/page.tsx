"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

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

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCompanies()
  }, [])

  async function loadCompanies() {
    setLoading(true)

    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("id", { ascending: true })

    if (!error && data) {
      setCompanies(data)
    }

    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Companies</h1>

        <Link href="/companies/add">
          <Button>Add Company</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Companies List</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Percent Cut</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {companies.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.percent_cut ?? 0}%</TableCell>
                    <TableCell>{c.address ?? "-"}</TableCell>
                    <TableCell>{c.phone ?? "-"}</TableCell>

                    <TableCell className="text-right">
                      <Link href={`/companies/${c.id}`}>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </Link>
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
