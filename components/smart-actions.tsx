"use client"

import { Button } from "@/components/ui/button"
import { generateWhatsAppLink } from "@/lib/utils-export" // Note: ensure filepath matches
import { Printer, Send } from "lucide-react"

interface SmartActionsProps {
  companyName: string
  companyPhone: string | null
  orderId: number
  amount: number
  itemsCount: number // e.g., cards
  date: string
}

export function SmartActions({ companyName, companyPhone, orderId, amount, itemsCount, date }: SmartActionsProps) {
  
  const handleWhatsApp = () => {
    if (!companyPhone) {
      alert("No phone number available for this company.")
      return
    }
    const message = `Hello ${companyName},\n\nThis is a confirmation for Order #${orderId}.\nDate: ${date}\nItems: ${itemsCount} Cards\nTotal: ${amount} LYD.\n\nThank you!`
    const link = generateWhatsAppLink(companyPhone, message)
    if (link) window.open(link, '_blank')
  }

  const handlePrintInvoice = () => {
    // Create a temporary print window
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
      <html>
        <head>
          <title>Invoice #${orderId}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 40px; }
            .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
            .invoice-title { font-size: 32px; color: #333; text-align: right; }
            .details { margin-bottom: 40px; }
            .amount-box { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: right; }
            .total { font-size: 24px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border-bottom: 1px solid #eee; padding: 12px; text-align: left; }
            th { background: #f8fafc; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">CardFlow System</div>
            <div>
              <div class="invoice-title">INVOICE</div>
              <p>#${orderId}</p>
              <p>${date}</p>
            </div>
          </div>

          <div class="details">
            <strong>Bill To:</strong><br>
            ${companyName}<br>
            ${companyPhone || ''}
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th style="text-align:right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Prepaid Cards Order</td>
                <td>${itemsCount}</td>
                <td style="text-align:right">${amount} LYD</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 40px; display: flex; justify-content: flex-end;">
            <div class="amount-box">
              <p>Total Due:</p>
              <div class="total">${amount} LYD</div>
            </div>
          </div>

          <div style="margin-top: 60px; text-align: center; font-size: 12px; color: #666;">
            <p>Thank you for your business.</p>
          </div>
          
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleWhatsApp} className="text-green-600 border-green-200 hover:bg-green-50">
        <Send className="h-4 w-4 mr-1" /> WhatsApp
      </Button>
      <Button variant="outline" size="sm" onClick={handlePrintInvoice}>
        <Printer className="h-4 w-4 mr-1" /> Invoice
      </Button>
    </div>
  )
}