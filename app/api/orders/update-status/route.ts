import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

// SERVER Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! 
);

export async function POST(req: Request) {
  try {
    const { orderId, newStatus, companyEmail, amount, cards } = await req.json();

    // SEND EMAIL ONLY ON SENT
    if (newStatus === "Sent") {
      const emailResult = await resend.emails.send({
        from: "Turbo Cards <orders@yourcompany.com>",
        to: companyEmail,
        subject: "Your prepaid card order has been sent",
        html: `
          <h2>Your Order Has Been Sent</h2>
          <p><strong>Amount:</strong> ${amount} LYD</p>
          <p><strong>Cards:</strong> ${cards}</p>
        `
      });

      if (emailResult.error) {
        return NextResponse.json(
          { error: "Email failed", details: emailResult.error },
          { status: 500 }
        );
      }
    }

    // TIMESTAMPS
    const timestamp: any = {};
    if (newStatus === "Sent") timestamp.date_sent = new Date().toISOString();
    if (newStatus === "Received") timestamp.date_received = new Date().toISOString();
    if (newStatus === "Paid") timestamp.date_paid = new Date().toISOString();

    // UPDATE ORDER
    await supabase
      .from("orders")
      .update({
        status: newStatus,
        ...timestamp
      })
      .eq("id", orderId);

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
