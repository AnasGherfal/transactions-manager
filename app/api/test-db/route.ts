import { supabaseServer } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const { data, error } = await supabaseServer
    .from("companies")
    .select("*")
    .limit(1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, data })
}
