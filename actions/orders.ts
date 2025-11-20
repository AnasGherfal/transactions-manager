"use server"

import { supabase } from "@/lib/supabase/client"
import { revalidatePath } from "next/cache"
// If you have a resend client in lib, import it here. 
// For now, we will call your existing API route to keep email attachments working easily.

export async function createOrderAction(formData: {
  companyId: number
  amount: number
  cards: number
  receiptPath: string | null
}) {
  
  // 1. Insert into Database
  const { data, error } = await supabase
    .from("orders")
    .insert({
      company_id: formData.companyId,
      amount: formData.amount,
      cards: formData.cards,
      status: "Pending",
      receipt_url: formData.receiptPath, // Saving the PATH, not the URL
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // 2. Revalidate the company page so the new order shows up immediately
  revalidatePath(`/companies/${formData.companyId}`)

  return { success: true, order: data }
}