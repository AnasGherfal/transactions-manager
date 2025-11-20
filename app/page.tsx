"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    companies: 0,
    orders: 0,
    pendingOrders: 0,
    receivedOrders: 0,
    paidOrders: 0,
    totalMoneyIn: 0,
    totalMoneyOut: 0,
  });

  const [loading, setLoading] = useState(true);
const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);

    // --- Fetch companies count ---
    const { count: companiesCount } = await supabase
      .from("companies")
      .select("*", { count: "exact", head: true });

    // --- Fetch orders ---
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*");

    // --- Fetch transactions ---
    const { data: txData } = await supabase
      .from("transactions")
      .select("*");

    const pending = ordersData?.filter((o) => o.status === "Pending").length || 0;
    const received = ordersData?.filter((o) => o.status === "Received").length || 0;
    const paid = ordersData?.filter((o) => o.status === "Paid").length || 0;

    const moneyIn = txData
      ?.filter((t) => t.type === "Received")
      ?.reduce((a, b) => a + b.amount, 0) || 0;

    const moneyOut = txData
      ?.filter((t) => t.type === "Paid")
      ?.reduce((a, b) => a + b.amount, 0) || 0;

    setStats({
      companies: companiesCount || 0,
      orders: ordersData?.length || 0,
      pendingOrders: pending,
      receivedOrders: received,
      paidOrders: paid,
      totalMoneyIn: moneyIn,
      totalMoneyOut: moneyOut,
    });

    setLoading(false);
  }

  if (loading) {
    return <div className="p-6 text-lg">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-10 max-w-6xl mx-auto py-10">
    <div className="p-4">
      <h1 className="font-bold text-xl mb-2">Test Auth</h1>
      <p>Current user: {userEmail ?? "No user"}</p>
    </div>
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Link href="/login">
          <Button variant="outline">Account</Button>
        </Link>
      </div>

      {/* TOP STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card>
          <CardHeader><CardTitle>Companies</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{stats.companies}</CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Total Orders</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{stats.orders}</CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Money In</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold text-green-600">
            {stats.totalMoneyIn} LYD
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Money Out</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold text-red-600">
            {stats.totalMoneyOut} LYD
          </CardContent>
        </Card>
      </div>

      {/* ORDERS BREAKDOWN */}
      <h2 className="text-xl font-semibold mt-6">Order Status Breakdown</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

        <Card>
          <CardHeader><CardTitle>Pending</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold text-yellow-600">
            {stats.pendingOrders}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Received</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold text-blue-600">
            {stats.receivedOrders}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Paid</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold text-green-700">
            {stats.paidOrders}
          </CardContent>
        </Card>

      </div>

      {/* QUICK LINKS */}
      <h2 className="text-xl font-semibold">Quick Actions</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

        <Link href="/companies">
          <Card className="cursor-pointer hover:shadow-lg transition">
            <CardHeader><CardTitle>Manage Companies</CardTitle></CardHeader>
            <CardContent>View, edit, and add companies.</CardContent>
          </Card>
        </Link>

        <Link href="/orders/add">
          <Card className="cursor-pointer hover:shadow-lg transition">
            <CardHeader><CardTitle>Add Order</CardTitle></CardHeader>
            <CardContent>Create a new order.</CardContent>
          </Card>
        </Link>

        <Link href="/transactions/add">
          <Card className="cursor-pointer hover:shadow-lg transition">
            <CardHeader><CardTitle>Add Transaction</CardTitle></CardHeader>
            <CardContent>Record money in/out.</CardContent>
          </Card>
        </Link>

      </div>

    </div>
  );
}
