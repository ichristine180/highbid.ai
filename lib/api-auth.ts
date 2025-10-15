import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";

export interface AuthResult {
  authenticated: boolean;
  user: any | null;
  error?: string;
  supabase?: any; // The supabase client to use for this request (bypasses RLS if using API token)
}

/**
 * Authenticate a request using either:
 * 1. API token from Authorization header (Bearer token)
 * 2. Session cookies (for web app)
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult> {
  // Create supabase client with service role for API token validation
  // This bypasses RLS since we need to look up tokens without being authenticated
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll() {
              // No-op for read-only authentication
            },
          },
        }
      )
    : null;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // No-op for read-only authentication
        },
      },
    }
  );

  // First, check for API token in Authorization header
  const authHeader = request.headers.get("authorization");
  console.log('[API Auth] Authorization header:', authHeader ? 'Present' : 'Missing');

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    console.log('[API Auth] Token extracted:', token.substring(0, 15) + '...');

    // Validate the API token using service role client if available (to bypass RLS)
    const clientForTokenValidation = supabaseServiceRole || supabase;
    const result = await validateApiToken(token, clientForTokenValidation);
    console.log('[API Auth] Validation result:', result.authenticated ? 'Success' : `Failed: ${result.error}`);

    if (result.authenticated) {
      // Return service role client so API operations can bypass RLS
      return {
        ...result,
        supabase: clientForTokenValidation
      };
    }
  } else if (authHeader) {
    console.log('[API Auth] Header present but invalid format');
  }

  // Fallback to session-based authentication (cookies)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      authenticated: false,
      user: null,
      error: "Unauthorized - No valid authentication found",
    };
  }

  return {
    authenticated: true,
    user,
    supabase: supabase // Use regular client for session auth (respects RLS)
  };
}

/**
 * Validate an API token and return the associated user
 */
async function validateApiToken(
  token: string,
  supabase: SupabaseClient
): Promise<AuthResult> {
  try {
    console.log('[API Auth] Validating token in database...');
    console.log('[API Auth] Token length:', token.length);
    console.log('[API Auth] Token starts with:', token.substring(0, 10));

    // Query the api_tokens table - use maybeSingle() instead of single()
    const { data: tokenData, error } = await supabase
      .from("api_tokens")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    console.log('[API Auth] DB Query result:', {
      found: !!tokenData,
      error: error?.message || 'none',
      tokenData: tokenData ? { user_id: tokenData.user_id, name: tokenData.name } : null
    });

    if (error) {
      console.log('[API Auth] Database error:', error);
      return {
        authenticated: false,
        user: null,
        error: "Database error: " + error.message,
      };
    }

    if (!tokenData) {
      console.log('[API Auth] Token not found in database');
      return {
        authenticated: false,
        user: null,
        error: "Invalid API token",
      };
    }

    // Check if token is active (if column exists)
    if (tokenData.is_active !== undefined && !tokenData.is_active) {
      return {
        authenticated: false,
        user: null,
        error: "API token is inactive",
      };
    }

    // Check if token has expired (if column exists)
    if (tokenData.expires_at) {
      const expiresAt = new Date(tokenData.expires_at);
      if (expiresAt < new Date()) {
        return {
          authenticated: false,
          user: null,
          error: "API token has expired",
        };
      }
    }

    // Update last_used_at timestamp
    await supabase
      .from("api_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("token", token);

    console.log('[API Auth] Token validation successful for user:', tokenData.user_id);

    // Return with user_id - we don't need to fetch from profiles
    return {
      authenticated: true,
      user: {
        id: tokenData.user_id,
      },
    };
  } catch (error) {
    console.error("[API Auth] Error validating API token:", error);
    return {
      authenticated: false,
      user: null,
      error: "Failed to validate API token",
    };
  }
}

/**
 * Generate a secure random API token
 */
export function generateApiToken(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const length = 64;
  let token = "hb_"; // Prefix for "highbid"

  // Use crypto.getRandomValues for secure random generation
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < length; i++) {
    token += chars[randomValues[i] % chars.length];
  }

  return token;
}
