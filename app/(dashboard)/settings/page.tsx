"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { 
  Bell, 
  Globe, 
  Lock, 
  Save, 
  ShieldAlert, 
  User,
  Loader2,
  Send
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
import { toast } from "sonner" 

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [settingsId, setSettingsId] = useState<number | null>(null)

  // --- STATE FOR SETTINGS ---
  // 1. General & Business
  const [sysSettings, setSysSettings] = useState({
    currency: "lyd",
    date_format: "ddmmyyyy",
    high_risk_threshold: "10000",
    default_tax_rate: "0"
  })

  // 2. Profile & Notifications
  const [profile, setProfile] = useState({
    full_name: "",
    email: "", 
    notify_high_debt: true,
    notify_large_payment: true,
    notify_daily_summary: false
  })

  // 3. Password
  const [passwords, setPasswords] = useState({
    new: "",
    confirm: ""
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // --- FETCH INITIAL DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // 1. Get User
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserId(user.id)

        // 2. Get System Settings
        const { data: sysData } = await supabase
          .from("system_settings")
          .select("*")
          .limit(1)
          .single()

        if (sysData) {
          setSettingsId(sysData.id)
          setSysSettings({
            currency: sysData.currency,
            date_format: sysData.date_format,
            high_risk_threshold: sysData.high_risk_threshold,
            default_tax_rate: sysData.default_tax_rate
          })
        }

        // 3. Get User Profile (Notifications)
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        setProfile({
          full_name: profileData?.full_name || "",
          email: user.email || "",
          notify_high_debt: profileData?.notify_high_debt ?? true,
          notify_large_payment: profileData?.notify_large_payment ?? true,
          notify_daily_summary: profileData?.notify_daily_summary ?? false
        })

      } catch (error) {
        console.error("Error loading settings:", error)
        toast.error("Failed to load settings")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // --- SAVE HANDLERS ---

  const saveSystemSettings = async () => {
    if (!settingsId) {
       toast.error("System settings not loaded correctly.")
       return
    }

    setSaving(true)
    const { error } = await supabase
      .from("system_settings")
      .update({
        currency: sysSettings.currency,
        date_format: sysSettings.date_format,
        high_risk_threshold: parseFloat(sysSettings.high_risk_threshold),
        default_tax_rate: parseFloat(sysSettings.default_tax_rate)
      })
      .eq('id', settingsId)

    setSaving(false)
    if (error) toast.error("Failed to save settings")
    else toast.success("System settings updated")
  }

  const saveProfile = async () => {
    if (!userId) return
    setSaving(true)

    // 1. Update Profile Table (Notifications & Name)
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        full_name: profile.full_name,
        notify_high_debt: profile.notify_high_debt,
        notify_large_payment: profile.notify_large_payment,
        notify_daily_summary: profile.notify_daily_summary,
        updated_at: new Date().toISOString()
      })

    // 2. Update Auth Email if changed
    let emailMsg = ""
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email !== profile.email) {
      const { error: authError } = await supabase.auth.updateUser({ email: profile.email })
      if (authError) toast.error(`Email update failed: ${authError.message}`)
      else emailMsg = " (Check new email for confirmation)"
    }

    setSaving(false)
    if (profileError) toast.error("Failed to update profile")
    else toast.success(`Profile & Alerts updated${emailMsg}`)
  }

  const updatePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error("Passwords do not match")
      return
    }
    if (passwords.new.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: passwords.new })
    setSaving(false)

    if (error) toast.error(error.message)
    else {
      toast.success("Password updated successfully")
      setPasswords({ new: "", confirm: "" })
    }
  }

  const sendTestNotification = async () => {
    if (!userId) return
    
    const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        title: "System Test",
        message: "This is a test notification to verify your alert settings.",
        type: "info"
    })

    if (error) toast.error(error.message)
    else toast.success("Test notification sent! Check the bell icon.")
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
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
                  <Select 
                    value={sysSettings.currency}
                    onValueChange={(val) => setSysSettings({...sysSettings, currency: val})}
                  >
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
                  <Select 
                    value={sysSettings.date_format}
                    onValueChange={(val) => setSysSettings({...sysSettings, date_format: val})}
                  >
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
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t px-6 py-4">
              <Button onClick={saveSystemSettings} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                  <Label htmlFor="threshold">High Debt Threshold</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 font-semibold uppercase">{sysSettings.currency}</span>
                    <Input 
                      id="threshold" 
                      value={sysSettings.high_risk_threshold}
                      onChange={(e) => setSysSettings({...sysSettings, high_risk_threshold: e.target.value})}
                      className="pl-12 font-medium" 
                      type="number"
                    />
                  </div>
                  <p className="text-[0.8rem] text-muted-foreground">
                    Companies exceeding this outstanding balance will be marked as <strong>High Risk</strong>.
                  </p>
                </div>
                
                <div className="space-y-2">
                   <Label htmlFor="tax">Default Tax/VAT Rate (%)</Label>
                   <div className="relative">
                    <Input 
                      id="tax" 
                      value={sysSettings.default_tax_rate}
                      onChange={(e) => setSysSettings({...sysSettings, default_tax_rate: e.target.value})}
                      className="pr-8" 
                      type="number"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-500 font-bold">%</span>
                   </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t px-6 py-4">
              <Button onClick={saveSystemSettings} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Rules
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* --- TAB: NOTIFICATIONS (FUNCTIONAL) --- */}
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
                <Switch 
                  checked={profile.notify_high_debt}
                  onCheckedChange={(c) => setProfile({...profile, notify_high_debt: c})}
                />
              </div>
              
              <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                <div className="space-y-0.5">
                  <Label className="text-base">Large Payment Received</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify for payments over LYD 5,000.
                  </p>
                </div>
                <Switch 
                  checked={profile.notify_large_payment}
                  onCheckedChange={(c) => setProfile({...profile, notify_large_payment: c})}
                />
              </div>

              <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                <div className="space-y-0.5">
                  <Label className="text-base">Daily Summary Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a digest of daily KPIs at 8:00 AM.
                  </p>
                </div>
                <Switch 
                  checked={profile.notify_daily_summary}
                  onCheckedChange={(c) => setProfile({...profile, notify_daily_summary: c})}
                />
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t px-6 py-4 flex justify-between">
              <Button variant="outline" onClick={sendTestNotification} className="gap-2">
                <Send className="h-4 w-4" /> Send Test Notification
              </Button>
              <Button onClick={saveProfile} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Alerts
              </Button>
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
                    <Input 
                      value={profile.full_name}
                      onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                    />
                 </div>
                 <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      value={profile.email}
                      onChange={(e) => setProfile({...profile, email: e.target.value})}
                    />
                 </div>
               </div>
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t px-6 py-4">
              <Button onClick={saveProfile} disabled={saving}>Update Profile</Button>
            </CardFooter>
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
                <Label htmlFor="new">New Password</Label>
                <Input 
                  id="new" 
                  type="password" 
                  value={passwords.new}
                  onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input 
                  id="confirm" 
                  type="password" 
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                />
              </div>
            </CardContent>
            <CardFooter className="bg-red-50/50 dark:bg-red-950/10 border-t border-red-100 dark:border-red-900/30 px-6 py-4 justify-between">
              <p className="text-xs text-muted-foreground">Last password change: 30 days ago</p>
              <Button variant="destructive" onClick={updatePassword} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}