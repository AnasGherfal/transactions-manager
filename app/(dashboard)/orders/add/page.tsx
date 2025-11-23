"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation" 
import { createBrowserClient } from "@supabase/ssr" 

import { createOrderAction } from "@/actions/orders" 
import { sendOrderEmail } from "@/actions/email" 

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Loader2, AlertTriangle, Check, X } from "lucide-react" 
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog" 
import { Label } from "@/components/ui/label" 

// Supabase Initialization
const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Define props for the reusable modal component
interface AddOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    // Callback to run after successful creation (e.g., to refresh lists)
    onOrderAdded?: (companyId: number) => void;
    // Optional: pre-select a company ID if opening from a specific company page
    initialCompanyId?: string | null; 
}

// Rename the component to reflect its new purpose as a reusable modal
export default function AddOrderModal({ 
    isOpen, 
    onClose, 
    onOrderAdded, 
    initialCompanyId: propInitialCompanyId
}: AddOrderModalProps) {
    const router = useRouter()
    const params = useSearchParams()
    
    // Determine the initial company ID from props or search params
    const preselectedCompany = propInitialCompanyId || params.get("company")

    const [companies, setCompanies] = useState<any[]>([])
    const [companyId, setCompanyId] = useState(preselectedCompany || "")
    const [amount, setAmount] = useState("")
    const [cards, setCards] = useState("")
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const showStatus = (type: 'success' | 'error', text: string) => {
        setStatusMessage(null) 
        setStatusMessage({ type, text })
        setTimeout(() => setStatusMessage(null), 4000)
    }

    // Load companies only once
    const loadCompanies = useCallback(async () => {
        const { data, error } = await supabase.from("companies").select("id, name")
        if (error) {
            showStatus('error', `Failed to load companies: ${error.message}`)
            return
        }
        setCompanies(data || [])
    }, [])

    useEffect(() => {
        // Reset state when modal closes/opens
        if (isOpen) {
            loadCompanies()
            // If propInitialCompanyId changes, update state
            setCompanyId(propInitialCompanyId || preselectedCompany || "")
        } else {
            // Reset form fields when modal closes
            setAmount("")
            setCards("")
            setFile(null)
            setStatusMessage(null)
            setLoading(false)
        }
    }, [isOpen, loadCompanies, propInitialCompanyId])

    // Update companyId state when the prop changes
    useEffect(() => {
        if (propInitialCompanyId !== undefined) {
            setCompanyId(propInitialCompanyId || "");
        }
    }, [propInitialCompanyId]);


    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        
        // Custom input validation
        if (!companyId || !amount || !cards) {
            showStatus('error', "Please select a company and provide amount/card count.")
            return
        }
        if (Number(amount) <= 0 || Number(cards) <= 0) {
             showStatus('error', "Amount and Card count must be greater than zero.")
            return
        }
        
        setLoading(true)

        try {
            // 1. Upload File to Supabase Storage 
            let uploadedPath: string | null = null

            if (file) {
                const filePath = `receipts/${companyId}/${Date.now()}_${file.name}`
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from("receipts")
                    .upload(filePath, file)

                if (uploadError) throw new Error("Receipt upload failed: " + uploadError.message)
                uploadedPath = uploadData.path
            }

            // 2. Save Order to DB (Server Action)
            const result = await createOrderAction({
                companyId: Number(companyId),
                amount: Number(amount),
                cards: Number(cards),
                receiptPath: uploadedPath,
            })

            if (!result.success) throw new Error(result.error)

            // 3. Send Email (Server Action) - NO FETCH HERE
            const company = companies.find((c) => String(c.id) === String(companyId))
            if (company?.email) {
                
                const emailFormData = new FormData()
                emailFormData.append("email", company.email)
                emailFormData.append("amount", amount)
                emailFormData.append("cards", cards)
                if (file) emailFormData.append("file", file)

                await sendOrderEmail(emailFormData) 
            }

            // Success handling
            showStatus('success', `Order #${result.orderId} created successfully.`)
            
            // Notify parent component
            if (onOrderAdded) {
                onOrderAdded(Number(companyId))
            } else {
                 // Default redirect if not used within another component
                 router.push(`/companies/${companyId}`)
            }
            
            // Close the modal after a short delay to show success message
            setTimeout(onClose, 1500);
            
        } catch (error: any) {
            showStatus('error', error.message || "An unexpected error occurred during order creation.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] p-6 rounded-xl bg-white shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-slate-800">Create New Card Order</DialogTitle>
                </DialogHeader>

                {/* STATUS MESSAGE AREA */}
                {statusMessage && (
                    <div className={`p-3 rounded-lg flex items-center gap-3 text-sm font-medium ${statusMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {statusMessage.type === 'success' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        <p>{statusMessage.text}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* Company Select */}
                    <div>
                        <Label htmlFor="companyId" className="mb-1 block">Company</Label>
                        <Select 
                            value={companyId} 
                            onValueChange={setCompanyId}
                            disabled={!!propInitialCompanyId || loading} // Disable if preselected or loading
                        >
                            <SelectTrigger id="companyId">
                                <SelectValue placeholder="Select company" />
                            </SelectTrigger>
                            <SelectContent>
                                {companies.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Amount Input */}
                        <div>
                            <Label htmlFor="amount" className="mb-1 block">Amount (LYD)</Label>
                            <Input 
                                id="amount" 
                                value={amount} 
                                onChange={(e) => setAmount(e.target.value)} 
                                type="number" 
                                min="1"
                                disabled={loading}
                                required
                            />
                        </div>
                        
                        {/* Cards Input */}
                        <div>
                            <Label htmlFor="cards" className="mb-1 block">Cards Count</Label>
                            <Input 
                                id="cards" 
                                value={cards} 
                                onChange={(e) => setCards(e.target.value)} 
                                type="number" 
                                min="1"
                                disabled={loading}
                                required
                            />
                        </div>
                    </div>

                    {/* Receipt File Input */}
                    <div>
                        <Label htmlFor="receipt" className="mb-1 block">Optional Receipt/Proof</Label>
                        <Input 
                            id="receipt"
                            type="file" 
                            accept="image/*, application/pdf"
                            onChange={(e) => e.target.files && setFile(e.target.files[0])} 
                            disabled={loading}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Max 5MB (PNG, JPG, PDF)</p>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={onClose} 
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            className="bg-blue-600 hover:bg-blue-700" 
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                                    Processing...
                                </>
                            ) : (
                                "Save Order"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}