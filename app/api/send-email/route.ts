import { NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const form = await req.formData()

    const email = form.get("email") as string
    const amount = form.get("amount") as string
    const cards = form.get("cards") as string
    const file = form.get("file") as File | null

    const attachments = []

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer())
      attachments.push({
        filename: file.name,
        content: buffer.toString("base64"),
        type: file.type,
        disposition: "attachment"
      })
    }

    await resend.emails.send({
      from: "Prepaid Manager <orders@yourdomain.com>",
      to: email,
      subject: `New Prepaid Card Order`,
      html: `
        <h2>New Order</h2>
        <p><strong>Amount:</strong> ${amount} LYD</p>
        <p><strong>Cards:</strong> ${cards}</p>
      `,
      attachments
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
