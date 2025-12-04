"use client";

import React, { useEffect, useState, useCallback } from "react";

import { createBrowserClient } from "@supabase/ssr"; 

import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Download,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Mail,
  PlusCircle,
  Globe,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner"; 
import { PageTransition } from "@/components/page-transition";


const PAGE_SIZE = 10;

type Log = {
  id: number;
  action: string;
  details: string | null;
  user_id: string | null;
  user_email: string | null;
  ip_address: string | null; 
  created_at: string;
  status: 'success' | 'warning' | 'error';
};

export default function ActivityPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Moved fetchLogs to useCallback to avoid dependency issues
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    
    // Calculate range for pagination
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('activity_logs')
      .select('*', { count: 'exact' }) // Request exact count for pagination
      .order('created_at', { ascending: false })
      .range(from, to);

    // Server-side Search
    if (searchTerm) {
      query = query.or(`action.ilike.%${searchTerm}%,details.ilike.%${searchTerm}%,user_email.ilike.%${searchTerm}%`);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error("Error fetching logs:", error);
    } else if (data) {
      setLogs(data as Log[]);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [page, searchTerm, supabase]);

  // Debounce search/fetch to prevent too many requests
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1); // Reset to page 1 when searching
  };



  const getStatusBadge = (status?: string) => {
    const safeStatus = status || 'success'; 

    switch(safeStatus) {
      case 'error': return <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-none">Failed</Badge>;
      case 'warning': return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">Warning</Badge>;
      default: return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Success</Badge>;
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
      <PageTransition>

    <div className="flex-1 space-y-8 p-8 pt-6 max-w-6xl mx-auto bg-slate-50 min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-indigo-600" />
            Audit Logs
          </h2>
          <p className="text-slate-500 mt-1">
            Real-time trail of database transactions and system events.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Button 
                onClick={fetchLogs}
                variant="outline"
                className="bg-white hover:bg-slate-50"
                title="Refresh Logs"
            >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

           
    
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Search via email, action, or details..." 
              className="pl-9 bg-white"
              value={searchTerm}
              onChange={handleSearchChange}
            />
        </div>
        <Button variant="outline" className="bg-white">
            <Filter className="mr-2 h-4 w-4" /> Filter
        </Button>
      </div>

      {/* MAIN LOG TABLE */}
      <Card className="border-slate-200 shadow-sm flex flex-col">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-slate-500"/> 
            Recent System Activity
          </CardTitle>
          <CardDescription>
            Displaying events {((page - 1) * PAGE_SIZE) + 1}-{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} total.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead className="w-[150px]">Action</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">User / IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading audit trail...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No activity recorded matching your filters.</TableCell></TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/50">
                    <TableCell className="text-xs font-medium text-slate-600">
                        {new Date(log.created_at).toLocaleString('en-GB', { 
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                        })}
                    </TableCell>
                    <TableCell>
                        <div className="font-semibold text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded-md inline-block border border-slate-200">
                            {log.action}
                        </div>
                    </TableCell>
                    <TableCell>
                        {getStatusBadge(log.status)}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 max-w-md truncate" title={log.details || ""}>
                        {log.details || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-0.5">
                           <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                {log.user_email || "System"}
                                <Mail className="h-3 w-3 text-slate-400" />
                           </div>
                           {log.ip_address && (
                             <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                                {log.ip_address}
                                <Globe className="h-2 w-2" />
                             </span>
                           )}
                        </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* PAGINATION FOOTER */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-500">
                Page {page} of {Math.max(1, totalPages)}
            </span>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                    className="bg-white"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading}
                    className="bg-white"
                >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>
        </div>
      </Card>
    </div>
    </PageTransition>
  );
}
