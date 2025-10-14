import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const pollForTaskResult = async (
  jobId: string,
  apiToken: string,
  maxAttempts = 15
): Promise<string | { success: false; message: string }> => {
  const initialDelay = 30000;
  const pollInterval = 30000;
  await new Promise((resolve) => setTimeout(resolve, initialDelay));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch("https://xgodo.com/api/v2/jobs/applicants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          job_id: jobId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch task result: ${response.status}`);
      }

      const data = await response.json();
      console.log(
        "Applicants API Response (Attempt",
        attempt + 1,
        "):",
        JSON.stringify(data, null, 2)
      );

      if (
        data.job_tasks &&
        Array.isArray(data.job_tasks) &&
        data.job_tasks.length > 0
      ) {
        const task = data.job_tasks[0];
        console.log("Task status:", task.status);
        console.log("Task data:", JSON.stringify(task, null, 2));

        // Check if the task has failed
        if (task.status === "failed" || task.status === "declined") {
          const errorMessage =
            task.comment || task.failureReason || "Unknown error occurred";
          console.log("Task failed/declined:", errorMessage);
          return {
            success: false,
            message: `Speech generation failed,please try again`,
          };
        }
        if (task.job_proof) {
          try {
            const proofData = JSON.parse(task.job_proof);
            console.log("Parsed job_proof:", proofData);

            if (proofData.audioUrl && proofData.audioUrl.trim() !== "") {
              console.log("Found audioUrl:", proofData.audioUrl);
              return proofData.audioUrl;
            }
          } catch (parseError) {
            console.error("Error parsing job_proof:", parseError);
          }
        }
      } else {
        console.log("No job_tasks found or empty array");
      }
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Speech generation failed")
      ) {
        throw error;
      }
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }
  }

  throw new Error(
    "Timeout: Speech generation took too long. Please try again."
  );
};

export async function POST(request: NextRequest) {
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

  let generationId: string | null = null;

  try {
    const { prompt } = await request.json();

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const JOB_ID = process.env.NEXT_PUBLIC_XGODO_AUDIO_JOB_ID;
    const API_TOKEN = process.env.NEXT_PUBLIC_XGODO_API_TOKEN;

    if (!JOB_ID) {
      return NextResponse.json(
        {
          error:
            "Job ID is not configured. Please set NEXT_PUBLIC_XGODO_JOB_ID in environment variables.",
        },
        { status: 500 }
      );
    }

    if (!API_TOKEN) {
      return NextResponse.json(
        {
          error:
            "API token is not configured. Please set NEXT_PUBLIC_XGODO_API_TOKEN in environment variables.",
        },
        { status: 500 }
      );
    }

    // Fetch dynamic pricing from database (per word)
    const { data: pricingData, error: pricingError } = await supabase
      .from("tts_pricing_settings")
      .select("price")
      .limit(1)
      .single();

    let pricePerWord = 0.003; // Default fallback (per word)
    if (pricingError) {
      console.error("Error fetching TTS pricing:", pricingError);
      // Use default pricing if fetch fails
    } else if (pricingData) {
      pricePerWord = parseFloat(pricingData.price.toString());
    }

    // Calculate word count and total cost
    const wordCount = prompt.trim().split(/\s+/).length;
    const cost = pricePerWord * wordCount;

    // Create initial generation record
    const { data: generation, error: insertError } = await supabase
      .from("tts_generations")
      .insert({
        user_id: user.id,
        prompt,
        status: "generating",
        cost,
      })
      .select()
      .single();

    if (insertError || !generation) {
      console.error("Error creating generation record:", insertError);
      return NextResponse.json(
        { error: "Failed to create generation record" },
        { status: 500 }
      );
    }

    // Store generation ID for error handling
    generationId = generation.id;

    const inputData = JSON.stringify({
      textPrompt: prompt,
    });

    const submitResponse = await fetch(
      "https://xgodo.com/api/v2/planned_tasks/submit",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({
          job_id: JOB_ID,
          inputs: [inputData],
        }),
      }
    );

    if (!submitResponse.ok) {
      // Update generation record as failed
      await supabase
        .from("tts_generations")
        .update({
          status: "failed",
          error_message: `Failed to submit task: ${submitResponse.status}`,
        })
        .eq("id", generation.id);

      return NextResponse.json(
        { error: `Failed to submit task: ${submitResponse.status}` },
        { status: submitResponse.status }
      );
    }

    await submitResponse.json();
    const result = await pollForTaskResult(JOB_ID, API_TOKEN);

    if (typeof result === "object" && "success" in result && !result.success) {
      // Update generation record as failed
      await supabase
        .from("tts_generations")
        .update({
          status: "failed",
          error_message: result.message,
        })
        .eq("id", generation.id);

      return NextResponse.json(
        {
          success: false,
          message: result.message,
        },
        { status: 200 }
      );
    }

    if (result && typeof result === "string") {
      // Update generation record as completed
      await supabase
        .from("tts_generations")
        .update({
          status: "completed",
          audio_url: result,
        })
        .eq("id", generation.id);

      return NextResponse.json({
        success: true,
        audioUrl: result,
        generation_id: generation.id,
      });
    } else {
      // Update generation record as failed
      await supabase
        .from("tts_generations")
        .update({
          status: "failed",
          error_message: "No audio URL found in response",
        })
        .eq("id", generation.id);

      return NextResponse.json(
        { error: "No audio URL found in response" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error generating audio:", error);

    // Update generation record as failed if it was created
    if (generationId) {
      await supabase
        .from("tts_generations")
        .update({
          status: "failed",
          error_message:
            error instanceof Error
              ? error.message
              : "Failed to generate audio. Please try again.",
        })
        .eq("id", generationId);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate audio. Please try again.",
      },
      { status: 500 }
    );
  }
}
