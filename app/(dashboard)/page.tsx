// app/(dashboard)/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase/client" // Make sure to use your server client if available
import { Building2, CreditCard, ArrowUpRight, ArrowDownLeft } from "lucide-react"

export default async function DashboardHome() {
  // Fetch summary data
  const { count: companyCount } = await supabase.from("companies").select("*", { count: "exact" })
  const { data: orders } = await supabase.from("orders").select("amount, status")
  const { data: transactions } = await supabase.from("transactions").select("amount, type")

  // Calculate totals
  const totalOrders = orders?.reduce((sum, o) => sum + (o.amount || 0), 0) || 0
  const totalReceived = transactions
    ?.filter(t => t.type === "Received")
    .reduce((sum, t) => sum + (t.amount || 0), 0) || 0
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      
      {/* STATS CARDS */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companyCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders (LYD)</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReceived.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}