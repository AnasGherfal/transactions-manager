import type { Transaction } from "@/lib/types"

export const transactions: Transaction[] = [
  {
    id: 1,
    companyId: 1,
    companyName: "Anis Cards",
    type: "Received",
    amount: 5000,
    date: "2025-11-02",
    receipt: null,
    notes: "Order #2 collected",
  },
  {
    id: 2,
    companyId: 2,
    companyName: "Libya Pay",
    type: "Paid",
    amount: 4000,
    date: "2025-10-15",
    receipt: null,
    notes: "Payout for order #1",
  },
]
