import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// GET - Fetch TTS pricing settings
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: pricing, error } = await supabase
      .from("tts_pricing_settings")
      .select("*")
      .limit(1);

    if (error) {
      console.error("Error fetching TTS pricing:", error);
      return NextResponse.json(
        { error: "Failed to fetch pricing" },
        { status: 500 }
      );
    }

    return NextResponse.json({ pricing });
  } catch (error) {
    console.error("Error in TTS pricing API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Update TTS pricing (admin only)
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
        .from("tts_pricing_settings")
        .update({ price: item.price })
        .eq("id", item.id);

      if (error) {
        console.error(`Error updating TTS pricing:`, error);
        return NextResponse.json(
          { error: `Failed to update pricing` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "TTS pricing updated successfully",
    });
  } catch (error) {
    console.error("Error updating TTS pricing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
