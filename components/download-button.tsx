"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

type ReportData = {
  summary: {
    totalIssued: number
    totalReceived: number
    netOutstanding: number
  }
  outstanding: any[]
}

export function DownloadButton({ data }: { data: ReportData }) {
  const handleDownload = () => {
    // 1. Create CSV Content
    const csvRows = []
    
    // Add Summary Section
    csvRows.push("--- SUMMARY REPORT ---")
    csvRows.push(`Total Revenue,${data.summary.totalIssued}`)
    csvRows.push(`Total Collections,${data.summary.totalReceived}`)
    csvRows.push(`Net Outstanding,${data.summary.netOutstanding}`)
    csvRows.push("") // Empty line
    
    // Add Details Section
    csvRows.push("--- OUTSTANDING BALANCES ---")
    // Headers
    csvRows.push("Company Name,Issued,Collected,Outstanding Amount")
    
    // Rows
    data.outstanding.forEach((item) => {
      // Escape commas in names if necessary
      const safeName = item.name.includes(",") ? `"${item.name}"` : item.name
      csvRows.push(`${safeName},${item.issued},${item.collected},${item.outstanding}`)
    })

    // 2. Create Blob and Link
    const csvString = csvRows.join("\n")
    const blob = new Blob([csvString], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `financial_report_${new Date().toISOString().split('T')[0]}.csv`
    
    // 3. Trigger Download
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <Button onClick={handleDownload} variant="outline">
      <Download className="mr-2 h-4 w-4" />
      Download CSV
    </Button>
  )
}