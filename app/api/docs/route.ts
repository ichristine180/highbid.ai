import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.com";

  const documentation = {
    version: "1.0.0",
    title: "HighBid.ai API Documentation",
    description: "External API access for image and speech generation",
    authentication: {
      method: "Bearer Token",
      description:
        "Include your API token in the Authorization header of each request",
      header_format: "Authorization: Bearer YOUR_API_TOKEN",
      obtaining_tokens:
        "Log in to your account and generate API tokens from your dashboard",
    },
    base_url: `${baseUrl}/api`,
    endpoints: {
      image_generation: {
        method: "POST",
        path: "/generateImage",
        url: `${baseUrl}/api/generateImage`,
        description: "Generate an image from a text prompt",
        authentication_required: true,
        request: {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer YOUR_API_TOKEN",
          },
          body: {
            prompt: {
              type: "string",
              required: true,
              description: "Text description of the image you want to generate",
              example: "A beautiful sunset over the ocean with palm trees",
            },
            size: {
              type: "string",
              required: true,
              description: "Image size/resolution",
              example: "1024x1024",
              options: ["512x512", "1024x1024", "1024x1792", "1792x1024"],
            },
          },
        },
        response: {
          success: {
            success: true,
            imageUrl: "https://example.com/generated-image.png",
            generation_id: "uuid",
          },
          error: {
            success: false,
            message: "Error description",
          },
        },
        example_curl: `curl -X POST ${baseUrl}/api/generateImage \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "prompt": "A beautiful sunset over the ocean",
    "size": "1024x1024"
  }'`,
        pricing: "Dynamic pricing based on image size (see dashboard)",
      },
      tts_generation: {
        method: "POST",
        path: "/tts/generate",
        url: `${baseUrl}/api/tts/generate`,
        description: "Generate speech audio from text",
        authentication_required: true,
        request: {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer YOUR_API_TOKEN",
          },
          body: {
            prompt: {
              type: "string",
              required: true,
              description: "Text to convert to speech",
              example: "Hello, welcome to our text-to-speech service!",
            },
          },
        },
        response: {
          success: {
            success: true,
            audioUrl: "https://example.com/generated-audio.wav",
            generation_id: "uuid",
          },
          error: {
            success: false,
            message: "Error description",
          },
        },
        example_curl: `curl -X POST ${baseUrl}/api/tts/generate \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "prompt": "Hello, welcome to our service!"
  }'`,
        pricing: "Charged per word (see dashboard for current rate)",
      },
      token_management: {
        list_tokens: {
          method: "GET",
          path: "/tokens",
          url: `${baseUrl}/api/tokens`,
          description: "List all your API tokens",
          authentication_required: true,
          note: "Requires session-based authentication (web app only)",
        },
        create_token: {
          method: "POST",
          path: "/tokens",
          url: `${baseUrl}/api/tokens`,
          description: "Create a new API token",
          authentication_required: true,
          note: "Requires session-based authentication (web app only)",
          request: {
            body: {
              name: {
                type: "string",
                required: true,
                description: "Descriptive name for the token",
                example: "Production API Token",
              },
              expires_in_days: {
                type: "number",
                required: false,
                description:
                  "Number of days until token expires (null for no expiration)",
                example: 365,
              },
            },
          },
        },
        delete_token: {
          method: "DELETE",
          path: "/tokens?id=TOKEN_ID",
          url: `${baseUrl}/api/tokens?id=TOKEN_ID`,
          description: "Delete/revoke an API token",
          authentication_required: true,
          note: "Requires session-based authentication (web app only)",
        },
      },
    },
    error_codes: {
      400: "Bad Request - Invalid or missing parameters",
      401: "Unauthorized - Invalid or missing API token",
      500: "Internal Server Error - Something went wrong on our end",
    },
    rate_limits: {
      description: "Rate limits may apply based on your account tier",
      note: "Contact support for enterprise rate limits",
    },
    support: {
      documentation: `${baseUrl}/api/docs`,
      contact: "support@highbid.ai",
    },
  };

  return NextResponse.json(documentation, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
    },
  });
}
