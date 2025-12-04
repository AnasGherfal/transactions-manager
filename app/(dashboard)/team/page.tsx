"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr"; 
import { 
  Users, 
  Mail, 
  Shield, 
  Trash2, 
  UserPlus,
  Check,
  Loader2,
  AlertTriangle
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Import the server action (ensure you create the file below)
import { inviteUserAction } from "@/actions/invite";
import { PageTransition } from "@/components/page-transition";

// --- TYPES ---
type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'viewer';
  status: 'active' | 'invited';
  last_sign_in_at: string | null;
};

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TeamPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Invite Modal State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [isInviting, setIsInviting] = useState(false);

  // --- LOAD USERS ---
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      
      // Fetch profiles from your database
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (data) {
         setUsers(data as any);
      } else if (error) {
         console.error("Error fetching users:", error);
      }
      setLoading(false);
    };

    fetchUsers();
  }, []);

  // --- HANDLERS ---

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setIsInviting(true);

    try {
        // Call Server Action to send invite via Supabase Admin
        const result = await inviteUserAction(inviteEmail, inviteRole);

        if (!result.success) {
            throw new Error(result.error);
        }
        
        // Optimistic UI update
        const newProfile: Profile = {
            id: 'pending-' + Math.random().toString(),
            email: inviteEmail,
            full_name: "Pending...",
            role: inviteRole as any,
            status: 'invited',
            last_sign_in_at: null
        };
        
        setUsers([...users, newProfile]);
        setIsInviteOpen(false);
        setInviteEmail("");
        alert("Invitation sent successfully!");
        
    } catch (error: any) {
        alert(`Failed to invite user: ${error.message}`);
    } finally {
        setIsInviting(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
      if(!confirm("Remove this user's access?")) return;
      
      // Optimistic update
      setUsers(users.filter(u => u.id !== userId));
      
      // Delete from DB (you might want a server action for this too for strict security)
      await supabase.from('profiles').delete().eq('id', userId);
  };

  return (
    <PageTransition>
      <div className="flex flex-col gap-8 p-6 max-w-7xl mx-auto w-full">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-8 w-8 text-blue-600" /> Team Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage access and roles for your organization.
            </p>
          </div>
          <Button onClick={() => setIsInviteOpen(true)} className="bg-blue-600 hover:bg-blue-700 shadow-md">
            <UserPlus className="h-4 w-4 mr-2" /> Invite Member
          </Button>
        </div>

        <Card className="shadow-md border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle>Active Members</CardTitle>
            <CardDescription>
              Users with access to this dashboard instance.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                    ) : users.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No team members found.</TableCell></TableRow>
                    ) : (
                        users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-slate-900">{user.full_name || "Unknown Name"}</span>
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <Mail className="h-3 w-3" /> {user.email}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1.5">
                                        {user.role === 'admin' ? <Shield className="h-3 w-3 text-purple-600"/> : <Users className="h-3 w-3 text-slate-500"/>}
                                        <span className="capitalize text-sm">{user.role}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {user.status === 'active' ? (
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                                    ) : (
                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Invited</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-sm text-slate-500">
                                    {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : "Never"}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-slate-400 hover:text-red-600"
                                        onClick={() => handleRemoveUser(user.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* INVITE MODAL */}
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                        Send an email invitation. They will set their own password.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleInvite} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input 
                            type="email" 
                            placeholder="colleague@company.com" 
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Role Permission</Label>
                        <Select value={inviteRole} onValueChange={setInviteRole}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="viewer">Viewer (Read Only)</SelectItem>
                                <SelectItem value="manager">Manager (Can Edit)</SelectItem>
                                <SelectItem value="admin">Admin (Full Access)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isInviting}>
                            {isInviting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Send Invitation"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

      </div>
    </PageTransition>
  );
}