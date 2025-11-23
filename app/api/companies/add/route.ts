// app/api/companies/add/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! 
);
export async function POST(req: Request) {
  try {
    const body = await req.json()

    const { name, email, phone, percent_cut, address, google_maps_url, notes } = body

    // Try to extract coordinates from google maps link
    let latitude = null
    let longitude = null

    if (google_maps_url) {
      const match = google_maps_url.match(/@?(-?\d+\.\d+),(-?\d+\.\d+)/)
      if (match) {
        latitude = parseFloat(match[1])
        longitude = parseFloat(match[2])
      }
    }

    const { data, error } = await supabase
      .from("companies")
      .insert({
        name,
        email,
        phone,
        percent_cut: percent_cut ? Number(percent_cut) : 0,
        address,
        google_maps_url,
        notes,
        latitude,
        longitude
      })
      .select("*")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, company: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
