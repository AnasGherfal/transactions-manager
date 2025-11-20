"use server"

import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendOrderEmail(formData: FormData) {
  const email = formData.get("email") as string
  const amount = formData.get("amount") as string
  const cards = formData.get("cards") as string
  const file = formData.get("file") as File | null

  try {
    const attachments = []

    // If a file was provided, we need to buffer it to send as an attachment
    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      attachments.push({
        filename: file.name,
        content: buffer,
      })
    }

    // Send the email
    const { data, error } = await resend.emails.send({
      from: "Orders <onboarding@resend.dev>", // Update this to your verified domain
      to: [email],
      subject: `New Order: ${amount} LYD`,
      html: `
        <h1>New Order Received</h1>
        <p><strong>Amount:</strong> ${amount} LYD</p>
        <p><strong>Cards:</strong> ${cards}</p>
        <p>Please find the receipt attached.</p>
      `,
      attachments: attachments,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }

  } catch (e: any) {
    return { success: false, error: e.message }
  }
}