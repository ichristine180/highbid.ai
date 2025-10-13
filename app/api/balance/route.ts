import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user balance
    const { data: balanceData, error } = await supabase
      .from("user_balances")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (error) {
      // If no balance record exists, return 0
      if (error.code === "PGRST116") {
        return NextResponse.json({ balance: 0 });
      }
      console.error("Error fetching balance:", error);
      return NextResponse.json(
        { error: "Failed to fetch balance" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      balance: balanceData?.balance || 0
    });
  } catch (error) {
    console.error("Error in balance API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
