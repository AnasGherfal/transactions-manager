"use client"

import { useState } from "react"
import { 
  Bell, 
  Building2, 
  CreditCard, 
  Globe, 
  Lock, 
  Moon, 
  Save, 
  ShieldAlert, 
  Sun, 
  User 
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner" // Assuming you have a toast library, or remove if not

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false)

  // Simulation of saving settings
  const handleSave = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      // If you are using 'sonner' or 'radix-ui' toasts:
      // toast.success("Settings saved successfully")
      alert("Settings saved! (This is a UI demo)")
    }, 1000)
  }

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="space-y-0.5">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Settings
        </h2>
        <p className="text-muted-foreground">
          Manage system parameters, risk thresholds, and account preferences.
        </p>
      </div>

      <Separator className="my-6" />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-[600px] h-auto p-1 bg-slate-100 dark:bg-slate-800">
          <TabsTrigger value="general" className="py-2.5">General</TabsTrigger>
          <TabsTrigger value="business" className="py-2.5">Business Logic</TabsTrigger>
          <TabsTrigger value="notifications" className="py-2.5">Notifications</TabsTrigger>
          <TabsTrigger value="security" className="py-2.5">Security</TabsTrigger>
        </TabsList>

        {/* --- TAB: GENERAL --- */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                Localization & Display
              </CardTitle>
              <CardDescription>
                Customize how data is presented in your dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Currency Display</Label>
                  <Select defaultValue="lyd">
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lyd">Libyan Dinar (LYD)</SelectItem>
                      <SelectItem value="usd">US Dollar (USD)</SelectItem>
                      <SelectItem value="eur">Euro (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[0.8rem] text-muted-foreground">
                    This will update all financial figures across the dashboard.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select defaultValue="ddmmyyyy">
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ddmmyyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="mmddyyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="iso">YYYY-MM-DD (ISO)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Reduce eye strain by enabling dark mode interface.
                  </p>
                </div>
                <div className="flex items-center gap-2 border rounded-full p-1 bg-slate-100 dark:bg-slate-800">
                   <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                     <Sun className="h-4 w-4" />
                   </Button>
                   <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white dark:bg-slate-700 shadow-sm">
                     <Moon className="h-4 w-4 text-blue-500" />
                   </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t px-6 py-4">
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading && <Save className="mr-2 h-4 w-4 animate-spin" />}
                Save Preferences
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* --- TAB: BUSINESS LOGIC --- */}
        <TabsContent value="business" className="space-y-6">
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                Risk & Thresholds
              </CardTitle>
              <CardDescription>
                Define the rules that trigger system alerts and flags.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="threshold">High Debt Threshold (LYD)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 font-semibold">LYD</span>
                    <Input id="threshold" defaultValue="10000" className="pl-12 font-medium" />
                  </div>
                  <p className="text-[0.8rem] text-muted-foreground">
                    Companies exceeding this outstanding balance will be marked as <strong>High Risk</strong>.
                  </p>
                </div>

         
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t px-6 py-4">
              <Button onClick={handleSave} variant="default">Save Rules</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* --- TAB: NOTIFICATIONS --- */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-purple-600" />
                Alert Configuration
              </CardTitle>
              <CardDescription>
                Choose what events you want to be notified about.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                <div className="space-y-0.5">
                  <Label className="text-base">High Debt Alert</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when a company exceeds the risk threshold.
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                <div className="space-y-0.5">
                  <Label className="text-base">Large Payment Received</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify for payments over LYD 5,000.
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                <div className="space-y-0.5">
                  <Label className="text-base">Daily Summary Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a digest of daily KPIs at 8:00 AM.
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t px-6 py-4">
              <Button onClick={handleSave}>Update Alerts</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* --- TAB: SECURITY --- */}
        <TabsContent value="security" className="space-y-6">
          <Card>
             <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                Profile Settings
              </CardTitle>
              <CardDescription>
                Update your personal information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input defaultValue="Admin User" />
                 </div>
                 <div className="space-y-2">
                    <Label>Email</Label>
                    <Input defaultValue="admin@cardflow.com" disabled className="bg-slate-100" />
                 </div>
               </div>
            </CardContent>
          </Card>

          <Card className="border-red-100 dark:border-red-900/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Ensure your account stays secure by using a strong password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current">Current Password</Label>
                <Input id="current" type="password" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new">New Password</Label>
                  <Input id="new" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm Password</Label>
                  <Input id="confirm" type="password" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-red-50/50 dark:bg-red-950/10 border-t border-red-100 dark:border-red-900/30 px-6 py-4 justify-between">
              <p className="text-xs text-muted-foreground">Last password change: 30 days ago</p>
              <Button variant="destructive">Update Password</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}