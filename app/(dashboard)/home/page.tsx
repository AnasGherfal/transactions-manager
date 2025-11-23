import { createClient } from "@/lib/supabase/server"
import {
  CreditCard,
  Wallet,
  Activity,
  ArrowUpRight,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DownloadButton } from "@/components/download-button"
import Link from "next/link"

// --- TYPES ---
type Order = {
  amount: number | null
  created_at: string
  company_id: number | null
}

type Transaction = {
  amount: number | null
  type: "Received" | "Paid"
  company_id: number | null
  created_at: string
}

// Function to generate initials from a name (needed for the card list)
const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

export default async function Dashboard() {
  const supabase = await createClient()

  // --- 1. DATE SETUP ---
  const now = new Date()
  const last30 = new Date()
  last30.setDate(now.getDate() - 30)
  const prev30Start = new Date()
  prev30Start.setDate(last30.getDate() - 30)

  const last30Iso = last30.toISOString()
  const prev30Iso = prev30Start.toISOString()

  // --- 2. PARALLEL DATA FETCHING ---
  const [
    { data: companies, count: companyCount },
    { data: ordersAll },
    { data: ordersLast30 },
    { data: ordersPrev30 },
    { data: txAll },
    { data: txLast30 },
    { data: txPrev30 },
    { data: recentTx },
    { data: settingsData }
  ] = await Promise.all([
    supabase.from("companies").select("id, name", { count: "exact" }),
    supabase.from("orders").select("amount, created_at, company_id"),
    supabase.from("orders").select("amount, created_at").gte("created_at", last30Iso),
    supabase.from("orders").select("amount").gte("created_at", prev30Iso).lt("created_at", last30Iso),
    supabase.from("transactions").select("amount, type, created_at, company_id"),
    supabase.from("transactions").select("amount, type").gte("created_at", last30Iso),
    supabase.from("transactions").select("amount, type").gte("created_at", prev30Iso).lt("created_at", last30Iso),
    supabase.from("transactions").select("amount, type, company_id, created_at").order("created_at", { ascending: false }).limit(6),
    supabase.from("system_settings").select("*").single()
  ])

  // --- 3. APPLY SETTINGS ---
  const settings = settingsData || { high_risk_threshold: 10000, currency: 'LYD' }
  const BIG_THRESHOLD = Number(settings.high_risk_threshold)
  const CURRENCY_CODE = settings.currency?.toUpperCase() || 'LYD'

  // --- 4. DATA PROCESSING HELPERS ---
  const companiesById = new Map<number, { id: number; name: string }>()
  ;(companies || []).forEach((c) => companiesById.set(c.id, c))

  const sum = (nums: any[]) =>
    nums.reduce((acc, curr) => acc + (curr.amount || 0), 0)

  // UPDATED: Currency now uses Dynamic Setting
  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: CURRENCY_CODE, 
      maximumFractionDigits: 0, 
    }).format(amount)

  // --- 5. CALCULATE KPI TOTALS ---
  const totalIssued = sum(ordersAll || [])
  const totalReceived = sum((txAll || []).filter((t) => t.type === "Received"))
  const netOutstanding = totalIssued - totalReceived

  // Trends
  const last30Issued = sum(ordersLast30 || [])
  const prev30Issued = sum(ordersPrev30 || [])
  const last30Received = sum((txLast30 || []).filter(t => t.type === "Received"))
  const prev30Received = sum((txPrev30 || []).filter(t => t.type === "Received"))

  const calcChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0
    return ((curr - prev) / prev) * 100
  }

  const issuedTrend = calcChange(last30Issued, prev30Issued)
  const receivedTrend = calcChange(last30Received, prev30Received)

  // --- 6. CALCULATE OUTSTANDING PER COMPANY ---
  const balanceMap = new Map<number, { issued: number; collected: number }>()

  ;(ordersAll || []).forEach((o: Order) => {
    if (!o.company_id) return
    const current = balanceMap.get(o.company_id) || { issued: 0, collected: 0 }
    balanceMap.set(o.company_id, { ...current, issued: current.issued + (o.amount || 0) })
  })

  ;(txAll || []).forEach((t: Transaction) => {
    if (!t.company_id || t.type !== "Received") return
    const current = balanceMap.get(t.company_id) || { issued: 0, collected: 0 }
    balanceMap.set(t.company_id, { ...current, collected: current.collected + (t.amount || 0) })
  })

  const fullOutstandingList = Array.from(balanceMap.entries())
    .map(([id, bal]) => ({
      id,
      name: companiesById.get(id)?.name || "Unknown",
      ...bal,
      outstanding: bal.issued - bal.collected,
    }))
    .filter((c) => c.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding)

  const topOutstandingList = fullOutstandingList.slice(0, 5)

  // Use Dynamic Threshold for flagging
  const highRiskCount = fullOutstandingList.filter(c => c.outstanding >= BIG_THRESHOLD).length
  const maxOutstanding = topOutstandingList[0]?.outstanding || 1

  // --- 7. GENERATE CHART DATA (Last 14 Days) ---
  const daysMap = new Map<string, number>()
  const today = new Date()
  const chartDays = 14

  for (let i = chartDays - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(today.getDate() - i)
    daysMap.set(d.toISOString().split("T")[0], 0)
  }

  ;(ordersLast30 || []).forEach((o: any) => {
    const dateKey = o.created_at.split("T")[0]
    if (daysMap.has(dateKey)) {
      daysMap.set(dateKey, (daysMap.get(dateKey) || 0) + (o.amount || 0))
    }
  })

  const chartData = Array.from(daysMap.entries()).map(([date, value]) => ({
    date: new Date(date).toLocaleDateString("en-US", { weekday: "narrow" }),
    fullDate: date,
    value,
  }))

  const maxChartValue = Math.max(...chartData.map((d) => d.value), 100)

  const reportData = {
    summary: { totalIssued, totalReceived, netOutstanding },
    outstanding: fullOutstandingList
  }

  return (
    <>
      <div className="flex-1 space-y-8 p-8 pt-6">
        {/* HEADER SECTION (Removed static header, now in HeaderWithUser) */}
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Financial Overview</h2>
            <p className="text-muted-foreground">
              Overview of financial performance and partner activity.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <DownloadButton data={reportData} />
          </div>
        </div>

        {/* TOP KPI CARDS */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* REVENUE */}
          <Card className="shadow-sm border-l-4 border-l-primary/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(totalIssued)}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center">
                {issuedTrend > 0 ? <TrendingUp className="mr-1 h-3 w-3 text-emerald-500" /> : <TrendingDown className="mr-1 h-3 w-3 text-rose-500" />}
                <span className={issuedTrend > 0 ? "text-emerald-500" : "text-rose-500"}>{issuedTrend.toFixed(1)}%</span> from last month
              </p>
            </CardContent>
          </Card>

          {/* COLLECTIONS */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collections</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(totalReceived)}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center">
                {receivedTrend > 0 ? <TrendingUp className="mr-1 h-3 w-3 text-emerald-500" /> : <TrendingDown className="mr-1 h-3 w-3 text-rose-500" />}
                <span className={receivedTrend > 0 ? "text-emerald-500" : "text-rose-500"}>{receivedTrend.toFixed(1)}%</span> from last month
              </p>
            </CardContent>
          </Card>

          {/* OUTSTANDING */}
          <Card className="shadow-sm border-l-4 border-l-amber-500/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Outstanding</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(netOutstanding)}</div>
              <p className="text-xs text-muted-foreground mt-1">Unpaid balance across all partners</p>
            </CardContent>
          </Card>

          {/* NEW CARD: High Risk Count */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Risk Partners</CardTitle>
              <Activity className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{highRiskCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Companies owing &gt; {formatMoney(BIG_THRESHOLD)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* MIDDLE SECTION: OVERVIEW CHART & RECENT SALES */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          
          {/* CHART SECTION */}
          <Card className="col-span-4 shadow-sm">
            <CardHeader>
              <CardTitle>Daily Issuance Overview</CardTitle>
              <CardDescription>Volume of orders over the last 14 days.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[240px] w-full flex items-end justify-between gap-2 px-4 pt-8">
                {chartData.map((item, i) => (
                  <div key={i} className="group relative flex h-full w-full flex-col justify-end gap-2">
                    <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:block group-hover:opacity-100 z-10 whitespace-nowrap">
                      {formatMoney(item.value)}
                    </div>
                    <div
                      className="w-full rounded-t-md bg-slate-900 transition-all hover:bg-slate-700 dark:bg-slate-100 dark:hover:bg-slate-300"
                      style={{
                        height: `${(item.value / maxChartValue) * 100}%`,
                        minHeight: item.value > 0 ? "4px" : "0",
                      }}
                    />
                    <span className="text-center text-[10px] text-muted-foreground font-medium uppercase">
                      {item.date}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* RECENT ACTIVITY LIST */}
          <Card className="col-span-3 shadow-sm">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest financial movements.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {(!recentTx || recentTx.length === 0) ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No recent activity.</p>
                ) : (
                  recentTx.map((tx, index) => {
                    const companyName = companiesById.get(tx.company_id || 0)?.name || "Unknown"
                    return (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className={tx.type === 'Received' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                              {tx.type === 'Received' ? <ArrowUpRight className="h-4 w-4"/> : <Activity className="h-4 w-4"/>}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">
                              {companyName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className={`font-medium text-sm ${tx.type === 'Received' ? 'text-emerald-600' : 'text-slate-600'}`}>
                          {tx.type === 'Received' ? "+" : "-"}{formatMoney(tx.amount || 0)}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* BOTTOM SECTION: DETAILED OUTSTANDING TABLE */}
        <div className="grid gap-4 md:grid-cols-1">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Outstanding Balances</CardTitle>
                <CardDescription>
                  Companies with the highest pending payments.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/companies">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {topOutstandingList.length === 0 ? (
                  <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                    No outstanding balances found. Excellent work!
                  </div>
                ) : (
                  topOutstandingList.map((company) => {
                    const percentageOfMax = (company.outstanding / maxOutstanding) * 100
                    const isHighRisk = company.outstanding >= BIG_THRESHOLD
                    
                    return (
                      <div key={company.id} className="flex flex-col space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8 border">
                              <AvatarFallback>{getInitials(company.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium leading-none flex items-center gap-2">
                                  {company.name}
                                  {isHighRisk && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">HIGH RISK</span>}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Issued: {formatMoney(company.issued)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-bold ${isHighRisk ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'}`}>
                              {formatMoney(company.outstanding)}
                            </span>
                            <p className="text-xs text-amber-600 font-medium">Pending</p>
                          </div>
                        </div>
                        {/* Visual Progress Bar for Debt Relative to Max Debt */}
                        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ease-in-out ${isHighRisk ? 'bg-red-500' : 'bg-amber-500'}`}
                            style={{ width: `${percentageOfMax}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/50 px-6 py-3">
              <div className="text-xs text-muted-foreground flex w-full justify-between items-center">
                  <span>Updated just now</span>
                  <span className="flex items-center gap-1"><Activity className="h-3 w-3"/> System Healthy</span>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  )
}