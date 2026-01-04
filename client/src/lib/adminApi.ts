import { getCurrentUser, getSession } from "./supabase";

/**
 * Helper function to make admin API requests with authentication
 * Uses Bearer token (preferred) and supabaseId as fallback
 */
export async function adminFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get session for Bearer token (preferred method)
    const session = await getSession();
    const accessToken = session?.access_token;

    // Add supabaseId to query params (fallback method)
    const urlObj = new URL(url, window.location.origin);
    urlObj.searchParams.set("supabaseId", user.id);

    // Merge headers
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");

    // Add Bearer token if available (preferred authentication method)
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(urlObj.toString(), {
      ...options,
      headers,
    });

    // Log error responses for debugging
    if (!response.ok) {
      let errorData: any = {};
      try {
        // Clone the response so we can read the body without consuming the original stream
        const clonedResponse = response.clone();
        const errorText = await clonedResponse.text();
        errorData = {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        };

        // Try to parse as JSON
        try {
          errorData.parsed = JSON.parse(errorText);
        } catch {
          // Not JSON, keep as text
        }
      } catch {
        errorData = {
          status: response.status,
          statusText: response.statusText,
          error: "Unknown error"
        };
      }

      console.error(`[ADMIN API] Request failed: ${url}`, errorData);
    }

    return response;
  } catch (error: any) {
    console.error(`[ADMIN API] Request error: ${url}`, error);
    throw error;
  }
}

