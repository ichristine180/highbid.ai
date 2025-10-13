import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// GET - Fetch all pricing settings
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: pricing, error } = await supabase
      .from("pricing_settings")
      .select("*")
      .order("size_key");

    if (error) {
      console.error("Error fetching pricing:", error);
      return NextResponse.json(
        { error: "Failed to fetch pricing" },
        { status: 500 }
      );
    }

    return NextResponse.json({ pricing });
  } catch (error) {
    console.error("Error in pricing API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Update pricing (admin only)
export async function POST(request: NextRequest) {
  try {
    const { pricing } = await request.json();

    if (!pricing || !Array.isArray(pricing)) {
      return NextResponse.json(
        { error: "Invalid pricing data" },
        { status: 400 }
      );
    }

    // Use service role key for admin operations
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseServiceKey
    );

    // Update each pricing entry
    for (const item of pricing) {
      const { error } = await supabase
        .from("pricing_settings")
        .update({ price: item.price })
        .eq("size_key", item.size_key);

      if (error) {
        console.error(`Error updating pricing for ${item.size_key}:`, error);
        return NextResponse.json(
          { error: `Failed to update pricing for ${item.size_key}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Pricing updated successfully",
    });
  } catch (error) {
    console.error("Error updating pricing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
