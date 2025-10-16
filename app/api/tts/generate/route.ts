import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { createClient } from "@supabase/supabase-js";

// Constants
const POLLING_CONFIG = {
  INITIAL_DELAY: 30000, // 30 seconds
  POLL_INTERVAL: 30000, // 30 seconds
  MAX_ATTEMPTS: 15,
} as const;

const XGODO_API_BASE = "https://xgodo.com/api/v2";

// Types
interface JobTask {
  _id: string;
  worker_id: string;
  job_id: string;
  job_title: string;
  status: "pending" | "running" | "completed" | "failed" | "declined";
  comment?: string | null;
  failureReason?: string | null;
  job_proof?: string | null;
  added: string;
  updated: string;
  planned_task?: string;
}

interface JobTasksResponse {
  _id: string;
  job_id: string;
  title: string;
  status: string;
  total_task: number;
  job_done: number;
  pending_tasks: number;
  satisfied_tasks: number;
  declined_tasks: number;
  failed_tasks: number;
  job_tasks: JobTask[];
}

interface JobProof {
  uploadedFileUrl: string;
}

interface TaskResult {
  success: boolean;
  message?: string;
  audioUrl?: string;
}

const findRelevantTask = (tasks: JobTask[], speechPrompt: string): JobTask | null => {
  if (!tasks || tasks.length === 0) return null;

  // Filter tasks that match the speechPrompt
  const matchingTasks = tasks.filter((task) => {
    try {
      if (task.planned_task) {
        
        
        const plannedTaskObj = JSON.parse(task.planned_task);
        return plannedTaskObj.speechPrompt === speechPrompt;
      }
      return false;
    } catch (e) {
      return false;
    }
  });

  if (matchingTasks.length === 0) return null;

  // Sort by timestamp (most recent first) and return the newest
  const sortedTasks = [...matchingTasks].sort(
    (a, b) => new Date(b.added).getTime() - new Date(a.added).getTime()
  );

  return sortedTasks[0];
};

/**
 * Parse and validate job proof data
 */
const parseJobProof = (jobProof: string | null | undefined): string | null => {
  if (!jobProof) return null;

  try {
    const proofData: JobProof = JSON.parse(jobProof);
    const url = proofData.uploadedFileUrl?.trim();
    return url && url !== "" ? url : null;
  } catch (error) {
    console.error("Error parsing job_proof:", error);
    return null;
  }
};

/**
 * Helper function to update generation status in database
 */
const updateGenerationStatus = async (
  supabase: any,
  generationId: string,
  status: "generating" | "completed" | "failed",
  audioUrl?: string,
  errorMessage?: string
) => {
  const updateData: any = { status };

  if (audioUrl) {
    updateData.audio_url = audioUrl;
  }

  if (errorMessage) {
    updateData.error_message = errorMessage;
  }

  return supabase
    .from("tts_generations")
    .update(updateData)
    .eq("id", generationId);
};

/**
 * Helper function to charge user for TTS generation
 */
const chargeUser = async (
  userId: string,
  amount: number,
  description: string,
  generationId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceKey) {
      console.error("Service role key not configured");
      return { success: false, error: "Service configuration error" };
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseServiceKey
    );

    // Update user balance using the database function
    const { data: newBalance, error: balanceError } = await supabaseAdmin.rpc(
      "update_user_balance",
      {
        p_user_id: userId,
        p_amount: amount,
        p_operation: "subtract",
      }
    );

    if (balanceError) {
      console.error("Error updating balance:", balanceError);
      return { success: false, error: "Failed to update balance" };
    }

    // Record the transaction
    const { error: transactionError } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: userId,
        type: "debit",
        amount: amount,
        description: description,
        payment_id: generationId,
        status: "completed",
        created_at: new Date().toISOString(),
      });

    if (transactionError) {
      console.error("Error recording transaction:", transactionError);
      // Don't fail if transaction recording fails, balance was already deducted
    }

    return { success: true };
  } catch (error) {
    console.error("Error in chargeUser:", error);
    return { success: false, error: "Failed to charge user" };
  }
};

/**
 * Submit a TTS task to the Xgodo API
 */
const submitTTSTask = async (
  jobId: string,
  apiToken: string,
  prompt: string
): Promise<void> => {
  const inputData = JSON.stringify({ speechPrompt: prompt });

  const response = await fetch(`${XGODO_API_BASE}/planned_tasks/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({
      job_id: jobId,
      inputs: [inputData],
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit task: ${response.status}`);
  }

  await response.json();
};

/**
 * Poll for task result with improved error handling and status checking
 */
const pollForTaskResult = async (
  jobId: string,
  apiToken: string,
  prompt: string,
  maxAttempts = POLLING_CONFIG.MAX_ATTEMPTS
): Promise<TaskResult> => {
  // Initial delay before first poll
  await new Promise((resolve) =>
    setTimeout(resolve, POLLING_CONFIG.INITIAL_DELAY)
  );

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`${XGODO_API_BASE}/jobs/applicants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({ job_id: jobId }),
      });

      if (!response.ok) {
        console.error(`API request failed: ${response.status}`);
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, POLLING_CONFIG.POLL_INTERVAL)
          );
          continue;
        }
        throw new Error(`Failed to fetch task result: ${response.status}`);
      }

      const data: JobTasksResponse = await response.json();

      // Find the most relevant task
      const task = findRelevantTask(data.job_tasks,prompt);

      if (!task) {
        console.warn(`Attempt ${attempt + 1}: No relevant task found`);
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, POLLING_CONFIG.POLL_INTERVAL)
          );
          continue;
        }
        return {
          success: false,
          message: "No task found for this generation",
        };
      }

      console.log(
        `Attempt ${attempt + 1}: Task ${task._id} status: ${task.status}`
      );

      // Handle failed or declined tasks
      if (task.status === "failed" || task.status === "declined") {
        const errorMessage =
          task.comment ||
          task.failureReason ||
          "Task failed without specific error";
        console.error(`Task ${task.status}:`, errorMessage);

        return {
          success: false,
          message: "Speech generation failed. Please try again.",
        };
      }

      // Handle completed tasks - check for audio URL
      if (task.status === "pending" || task.status === "running") {
        // Check if there's already a proof with audio URL (task completed but status not updated)
        const audioUrl = parseJobProof(task.job_proof);
        if (audioUrl) {
          console.log(`Task completed with audio URL: ${audioUrl}`);
          return {
            success: true,
            audioUrl,
          };
        }
      }

      // Task is still in progress, continue polling
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, POLLING_CONFIG.POLL_INTERVAL)
        );
      }
    } catch (error) {
      console.error(`Attempt ${attempt + 1} error:`, error);

      // If it's a specific error we should propagate, throw it
      if (error instanceof Error && error.message.includes("Failed to fetch task result")) {
        throw error;
      }

      // Otherwise, continue polling if we have attempts left
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, POLLING_CONFIG.POLL_INTERVAL)
        );
      }
    }
  }

  return {
    success: false,
    message: "Speech generation timed out. Please try again.",
  };
};

export async function POST(request: NextRequest) {
  let generationId: string | null = null;
  let supabase: any = null;

  try {
    const { prompt } = await request.json();

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Authenticate request (supports both API tokens and session cookies)
    const authResult = await authenticateRequest(request);

    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const user = authResult.user;
    // Use the supabase client from auth result (bypasses RLS for API token auth)
    supabase = authResult.supabase;

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

    // Check user balance before generation
    const { data: balanceData, error: balanceError } = await supabase
      .from("user_balances")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    const currentBalance = balanceData?.balance || 0;

    if (balanceError && balanceError.code !== "PGRST116") {
      console.error("Error fetching balance:", balanceError);
    }

    if (currentBalance < cost) {
      return NextResponse.json(
        {
          error: `Insufficient balance. You need $${cost.toFixed(2)} but only have $${currentBalance.toFixed(2)}. Please top up your account.`,
        },
        { status: 402 }
      );
    }

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

    // Submit task to Xgodo API
    try {
      await submitTTSTask(JOB_ID, API_TOKEN, prompt);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to submit task";

      await updateGenerationStatus(
        supabase,
        generation.id,
        "failed",
        undefined,
        errorMessage
      );

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    // Poll for task result
    const result = await pollForTaskResult(JOB_ID, API_TOKEN,prompt);

    // Handle failed task result
    if (!result.success) {
      await updateGenerationStatus(
        supabase,
        generation.id,
        "failed",
        undefined,
        result.message || "Unknown error occurred"
      );

      return NextResponse.json(
        {
          success: false,
          message: result.message || "Speech generation failed",
        },
        { status: 200 }
      );
    }

    // Handle successful task result
    if (result.audioUrl) {
      await updateGenerationStatus(
        supabase,
        generation.id,
        "completed",
        result.audioUrl
      );

      // Charge the user for successful generation
      const chargeResult = await chargeUser(
        user.id,
        cost,
        `Text-to-speech generation (${wordCount} words)`,
        generation.id
      );

      if (!chargeResult.success) {
        console.error("Failed to charge user:", chargeResult.error);
        // Note: Audio was generated successfully, but charging failed
        // Log this for manual review
      }

      return NextResponse.json({
        success: true,
        audioUrl: result.audioUrl,
        generation_id: generation.id,
        cost: cost, // Return cost for client info
      });
    }

    // Edge case: success but no audio URL
    await updateGenerationStatus(
      supabase,
      generation.id,
      "failed",
      undefined,
      "No audio URL returned from service"
    );

    return NextResponse.json(
      {
        success: false,
        message: "No audio URL found in response",
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error generating audio:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to generate audio. Please try again.";

    // Update generation record as failed if it was created
    if (generationId) {
      await updateGenerationStatus(
        supabase,
        generationId,
        "failed",
        undefined,
        errorMessage
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
