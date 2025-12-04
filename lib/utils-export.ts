import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- CSV EXPORT FUNCTION ---
export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert("No data to export")
    return
  }

  // Extract headers
  const headers = Object.keys(data[0])
  
  // Convert data to CSV format
  const csvContent = [
    headers.join(","), // Header row
    ...data.map(row => headers.map(fieldName => {
      // Handle commas or quotes in data
      const cell = row[fieldName] === null || row[fieldName] === undefined ? '' : row[fieldName]
      return JSON.stringify(cell)
    }).join(","))
  ].join("\n")

  // Create download link
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

// --- WHATSAPP LINK GENERATOR ---
export function generateWhatsAppLink(phone: string | null, message: string) {
  if (!phone) return null
  // Remove non-digit chars
  const cleanPhone = phone.replace(/\D/g, '')
  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`
}