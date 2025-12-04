"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { PageTransition } from "@/components/page-transition";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  Activity,
  Calendar,
  Building2,
  Filter,
  FileText
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CommandDialog, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

// --- TYPES ---
type Transaction = {
  id: number;
  company_id: number | null;
  amount: number;
  type: "Received" | "Paid";
  sender_name: string | null;
  receiver_name: string | null;
  created_at: string;
  notes: string | null;
  companies?: { name: string } | null;
};

// --- INITIALIZATION ---
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-LY", { 
    style: "currency", 
    currency: "LYD",
    maximumFractionDigits: 0 
  }).format(amount);



export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeCompaniesCount, setActiveCompaniesCount] = useState(0);
  const [showLast30Days, setShowLast30Days] = useState(false);

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      let query = supabase.from("transactions").select(`*, companies (name)`).order("created_at", { ascending: true });

      if (showLast30Days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        query = query.gte("created_at", startDate.toISOString());
      }

      const { data: txData, error: txError } = await query;
      if (txData) setTransactions(txData as Transaction[]);

      const { count } = await supabase.from("companies").select("*", { count: 'exact', head: true });
      if (count) setActiveCompaniesCount(count);

      setLoading(false);
    };
    fetchDashboardData();
  }, [showLast30Days]);

  // --- DATA PROCESSING ---
  const { chartData, stats, topCompanies, recentTransactions } = useMemo(() => {
    if (!transactions.length) return { chartData: [], stats: { received: 0, paid: 0, net: 0 }, topCompanies: [], recentTransactions: [] };

    const received = transactions.filter(t => t.type === "Received").reduce((acc, curr) => acc + curr.amount, 0);
    const paid = transactions.filter(t => t.type === "Paid").reduce((acc, curr) => acc + curr.amount, 0);

    const dailyMap = new Map();
    if (transactions.length > 0) {
      const firstDate = new Date(transactions[0].created_at);
      const lastDate = new Date();
      for (let d = new Date(firstDate); d <= lastDate; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
        dailyMap.set(dateKey, { name: dateKey, Income: 0, Expenses: 0 });
      }
    }

    transactions.forEach(t => {
        const dateKey = new Date(t.created_at).toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
        if (dailyMap.has(dateKey) || !showLast30Days) {
             if (!dailyMap.has(dateKey)) dailyMap.set(dateKey, { name: dateKey, Income: 0, Expenses: 0 });
            const entry = dailyMap.get(dateKey);
            if (t.type === "Received") entry.Income += t.amount;
            else entry.Expenses += t.amount;
        }
    });
    
    const chartData = Array.from(dailyMap.values());

    const companyMap = new Map();
    transactions.forEach(t => {
        const name = t.companies?.name || "Independent";
        const current = companyMap.get(name) || 0;
        companyMap.set(name, current + t.amount);
    });
    
    const topCompanies = Array.from(companyMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    const recentTransactions = [...transactions].reverse().slice(0, 6);

    return { chartData, topCompanies, recentTransactions, stats: { received, paid, net: received - paid } };
  }, [transactions, showLast30Days]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899'];

  if (loading) {
    return (
        <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
            <div className="flex justify-between items-center"><Skeleton className="h-10 w-48" /><Skeleton className="h-10 w-32" /></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
            <Skeleton className="h-[400px] rounded-xl" />
        </div>
    );
  }

  return (
    <PageTransition>
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full bg-slate-50/50 min-h-screen">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Dashboard
              {showLast30Days && <Badge variant="secondary" className="text-blue-600 bg-blue-50">Last 30 Days</Badge>}
            </h1>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> 
              {showLast30Days ? "Showing activity from the last 30 days" : "Showing all historical data"}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
               <Button variant={showLast30Days ? "default" : "outline"} onClick={() => setShowLast30Days(!showLast30Days)} className={showLast30Days ? "bg-slate-900 text-white" : "bg-white text-slate-700"}>
                  <Filter className="mr-2 h-4 w-4" />
                  {showLast30Days ? "View All Data" : "Filter Last 30 Days"}
               </Button>
             
          </div>
        </div>

        {/* KPI CARDS with SPARKLINES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Total Revenue" value={formatMoney(stats.received)} icon={<ArrowUpRight className="h-4 w-4 text-emerald-600" />} subtext="In selected period" trendColor="text-emerald-600" data={chartData} dataKey="Income" />
          <KpiCard title="Total Expenses" value={formatMoney(stats.paid)} icon={<ArrowDownLeft className="h-4 w-4 text-red-600" />} subtext="In selected period" trendColor="text-red-600" data={chartData} dataKey="Expenses" />
          <KpiCard title="Net Profit" value={formatMoney(stats.net)} icon={<Wallet className="h-4 w-4 text-blue-600" />} subtext="Revenue - Expenses" trendColor="text-slate-500" />
          <KpiCard title="Active Entities" value={activeCompaniesCount.toString()} icon={<Building2 className="h-4 w-4 text-purple-600" />} subtext="Total registered" trendColor="text-slate-500" />
        </div>
 
        {/* MAIN CHARTS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm border-slate-200">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-slate-500" /> Cash Flow Trend</CardTitle>
                  <CardDescription>Income vs Expenses over time</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                              <defs>
                                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                              </defs>
                              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} minTickGap={30} />
                              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `LYD ${value/1000}k`} />
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }} formatter={(value: number) => formatMoney(value)} />
                              <Area type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                              <Area type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                          </AreaChart>
                      </ResponsiveContainer>
                  </div>
              </CardContent>
          </Card>

          {/* RECENT TRANSACTIONS */}
          <Card className="shadow-sm border-slate-200 flex flex-col">
              <CardHeader className="pb-3"><CardTitle className="text-lg">Recent Transactions</CardTitle></CardHeader>
              <CardContent className="flex-1 overflow-auto max-h-[350px] pr-2">
                  <div className="space-y-4">
                      {recentTransactions.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between group">
                              <div className="flex items-center gap-3">
                                  <div className={`h-9 w-9 rounded-full flex items-center justify-center ${tx.type === 'Received' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                      {tx.type === 'Received' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                  </div>
                                  <div className="space-y-0.5">
                                      <p className="text-sm font-medium text-slate-900 leading-none">
                                          {tx.companies?.name ? tx.companies.name : <span className="text-slate-600">{tx.sender_name || "Unknown"} <span className="text-slate-400 text-xs">to</span> {tx.receiver_name || "Unknown"}</span>}
                                      </p>
                                      <p className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleDateString()}</p>
                                  </div>
                              </div>
                              <div className={`text-sm font-semibold ${tx.type === 'Received' ? 'text-emerald-600' : 'text-slate-900'}`}>{tx.type === 'Received' ? '+' : '-'}{formatMoney(tx.amount)}</div>
                          </div>
                      ))}
                  </div>
              </CardContent>
          </Card>
        </div>

        {/* DONUT CHART */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader><CardTitle>Top Volume Share</CardTitle></CardHeader>
          <CardContent>
              <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie data={topCompanies} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                              {topCompanies.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatMoney(value)} />
                          <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                      </PieChart>
                  </ResponsiveContainer>
              </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}

// Updated KpiCard with Sparklines
function KpiCard({ title, value, icon, subtext, trendColor, data, dataKey }: { title: string, value: string, icon: any, subtext: string, trendColor: string, data?: any[], dataKey?: string }) {
    return (
        <Card className="shadow-sm border-slate-200 relative overflow-hidden">
            <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">{icon}</div>
                </div>
                <div className="flex flex-col mt-2">
                    <span className="text-2xl font-bold text-slate-900">{value}</span>
                    <p className={`text-xs ${trendColor} mt-1 font-medium`}>{subtext}</p>
                </div>
            </CardContent>
            {/* Sparkline Background */}
            {data && dataKey && (
                <div className="absolute bottom-0 left-0 right-0 h-16 opacity-10 pointer-events-none">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <Line type="monotone" dataKey={dataKey} stroke="currentColor" strokeWidth={3} dot={false} className={trendColor.replace('text-', 'stroke-')} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </Card>
    )
}