export type Transaction = {
  id: number
  companyId: number
  companyName: string
  type: "Received" | "Paid"
  amount: number
  date: string
  receipt: string | null     // FIXED: allow both
  notes: string
}
