import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  // 1. Initialize the client (now async)
  const supabase = await createClient();

  // 2. Fetch the user/session safely
  const { data: { user } } = await supabase.auth.getUser();

  console.log(user)
  // 3. Redirect based on auth status
  if (user) {
    redirect("/home");
  } else {
      console.log(user)

    redirect("/login");
  }
}