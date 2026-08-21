import { createClient, User } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || "https://crjvsfclgevqgybuxvfa.supabase.co";
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || (import.meta.env.SUPABASE_PUBLISHABLE_KEY as string) || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or Anon Key is missing from environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  role?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Checks if user exists in the `users` table after login.
 * If not, inserts user information into the database table.
 */
export async function syncUserProfile(user: User): Promise<UserProfile | null> {
  if (!user || !user.id) return null;

  try {
    const userEmail = (user.email || "").trim().toLowerCase();
    const isAdmin = userEmail === "sorathiyadhruvin2005@gmail.com";
    const computedRole = user.user_metadata?.role || (isAdmin ? "admin" : "user");

    // Check if user exists
    const { data: existingUser, error: selectError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (selectError && selectError.code !== "PGRST116") {
      console.error("Error checking user existence in Supabase users table:", selectError.message);
    }

    if (existingUser) {
      const profile = existingUser as UserProfile;
      if (!profile.role) {
        profile.role = computedRole;
      }
      return profile;
    }

    // Insert user info into users table if not present
    let firstName = user.user_metadata?.first_name || user.user_metadata?.given_name || user.user_metadata?.name?.split(" ")[0];
    let lastName = user.user_metadata?.last_name || user.user_metadata?.family_name || user.user_metadata?.name?.split(" ").slice(1).join(" ");
    
    if (!firstName && !lastName) {
      firstName = user.email?.split("@")[0] || "";
      lastName = "";
    }
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

    const newUser: any = {
      id: user.id,
      email: user.email || "",
      first_name: firstName || null,
      last_name: lastName || null,
      profile_image_url: avatarUrl,
      role: computedRole,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: insertedUser, error: insertError } = await supabase
      .from("users")
      .upsert(newUser, { onConflict: "id" })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting user into users table:", insertError.message);
      // DO NOT return mock/dummy data.
      return null;
    }

    return insertedUser as UserProfile;
  } catch (err) {
    console.error("Unexpected error syncing user profile:", err);
    return null;
  }
}
