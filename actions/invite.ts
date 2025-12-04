'use server'

import { createClient } from '@supabase/supabase-js'

export async function inviteUserAction(email: string, role: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Use the environment variable for the site URL, falling back to localhost
  // This is more reliable than headers() in server actions
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // --- DEBUG LOGGING ---
  // Look for this in your terminal when you click "Invite"
  const redirectLink = `${siteUrl}/?next=/updatePassword`;
  console.log("--------------------------------------------------");
  console.log("🚀 GENERATED REDIRECT LINK:", redirectLink);
  console.log("--------------------------------------------------");

  if (!supabaseServiceKey) {
    return { success: false, error: "Service Role Key missing on server." };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Send (or Resend) the invite
  // We redirect to /auth/callback, which then forwards to /auth/update-password
  // IMPORTANT: Ensure 'http://localhost:3000/**' is in your Supabase Redirect URLs whitelist
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirectLink
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // 2. Upsert the profile
  if (data.user) {
    // Prepare the profile data
    const profileData: any = {
      id: data.user.id,
      email: email, 
      role: role,
      full_name: email.split('@')[0], 
      status: 'invited',
      updated_at: new Date().toISOString() 
    };

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' });

    if (profileError) {
        console.error("Profile update error:", profileError);
        // Return the specific DB error message to the UI
        return { success: false, error: `Profile update failed: ${profileError.message}` };
    }
  }

  return { success: true };
}