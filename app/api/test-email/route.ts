import { NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET() {
  try {
    await resend.emails.send({
from: "Prepaid Manager <onboarding@resend.dev>",
      to: "kimsonronaldo@gmail.com",   // ← replace with your email
      subject: "Test Email from Prepaid Manager",
      html: `
        <h2>Hello!</h2>
        <p>This is a test email from your Next.js app.</p>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
