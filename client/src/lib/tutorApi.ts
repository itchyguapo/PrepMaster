import { supabase } from "@/lib/supabase";

/**
 * Helper function to make authenticated API calls to tutor endpoints
 */
export async function tutorFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  return response;
}

