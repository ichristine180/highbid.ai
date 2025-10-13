import { NextRequest, NextResponse } from "next/server";

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
      if (
        data.job_tasks &&
        Array.isArray(data.job_tasks) &&
        data.job_tasks.length > 0
      ) {
        const task = data.job_tasks[0];
        // Check if the task has failed
        if (task.status === "failed") {
          const errorMessage =
            task.comment || task.failureReason || "Unknown error occurred";
          console.log("Task failed:", errorMessage);
          return {
            success: false,
            message: "Image generation failed, please try again later",
          };
        }
        if (task.job_proof) {
          try {
            const proofData = JSON.parse(task.job_proof);
            if (proofData.imageUrl && proofData.imageUrl.trim() !== "") {
              return proofData.imageUrl;
            }
          } catch (parseError) {
            console.error("Error parsing job_proof:", parseError);
          }
        }
      }
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Image generation failed")
      ) {
        throw error;
      }
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }
  }

  throw new Error("Timeout: Image generation took too long. Please try again.");
};

export async function POST(request: NextRequest) {
  try {
    const { prompt, size } = await request.json();

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const JOB_ID = process.env.NEXT_PUBLIC_XGODO_JOB_ID;
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
    const inputData = JSON.stringify({
      imagePrompt: `${prompt} with this size ${size}`,
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
      return NextResponse.json(
        { error: `Failed to submit task: ${submitResponse.status}` },
        { status: submitResponse.status }
      );
    }

    await submitResponse.json();
    const result = await pollForTaskResult(JOB_ID, API_TOKEN);
    if (typeof result === "object" && "success" in result && !result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
        },
        { status: 200 }
      );
    }
    if (result && typeof result === "string") {
      return NextResponse.json({
        success: true,
        imageUrl: result,
      });
    } else {
      return NextResponse.json(
        { error: "No image URL found in response" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate image. Please try again.",
      },
      { status: 500 }
    );
  }
}
