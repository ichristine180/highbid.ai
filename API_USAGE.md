# HighBid.ai External API Documentation

Access HighBid.ai's image and speech generation services programmatically using our REST API.

## Authentication

All API requests require authentication via an API token passed in the `Authorization` header:

```
Authorization: Bearer YOUR_API_TOKEN
```

### Getting Your API Token

1. Log in to your HighBid.ai account
2. Navigate to your dashboard
3. Go to API Settings
4. Click "Generate New Token"
5. Save your token securely (you won't be able to see it again!)

### Creating a Token via API (Web App Only)

```bash
curl -X POST https://your-domain.com/api/tokens \
  -H "Content-Type: application/json" \
  -b "your-session-cookies" \
  -d '{
    "name": "Production API Token",
    "expires_in_days": 365
  }'
```

Response:
```json
{
  "success": true,
  "message": "API token created successfully...",
  "token": {
    "id": "uuid",
    "name": "Production API Token",
    "token": "hb_xxxxxxxxxxxxx...",
    "is_active": true,
    "created_at": "2025-10-14T...",
    "expires_at": "2026-10-14T..."
  }
}
```

## Endpoints

### 1. Image Generation

Generate images from text prompts.

**Endpoint:** `POST /api/generateImage`

**Request:**
```bash
curl -X POST https://your-domain.com/api/generateImage \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer hb_xxxxxxxxxxxxx" \
  -d '{
    "prompt": "A beautiful sunset over the ocean with palm trees",
    "size": "1024x1024"
  }'
```

**Parameters:**
- `prompt` (string, required): Text description of the image
- `size` (string, required): Image dimensions
  - Options: `512x512`, `1024x1024`, `1024x1792`, `1792x1024`

**Success Response (200):**
```json
{
  "success": true,
  "imageUrl": "https://xgodo.com/server/temp/xxxxx.png",
  "generation_id": "uuid"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Image generation failed. Please try again."
}
```

**Pricing:** Dynamic based on image size (check your dashboard)

---

### 2. Text-to-Speech Generation

Convert text to natural-sounding speech audio.

**Endpoint:** `POST /api/tts/generate`

**Request:**
```bash
curl -X POST https://your-domain.com/api/tts/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer hb_xxxxxxxxxxxxx" \
  -d '{
    "prompt": "Hello, welcome to our text-to-speech service!"
  }'
```

**Parameters:**
- `prompt` (string, required): Text to convert to speech

**Success Response (200):**
```json
{
  "success": true,
  "audioUrl": "https://xgodo.com/server/temp/xxxxx.wav",
  "generation_id": "uuid"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Speech generation failed. Please try again."
}
```

**Pricing:** Charged per word (check your dashboard for current rate)

---

### 3. Token Management

#### List Your Tokens
**Endpoint:** `GET /api/tokens`

**Note:** Requires session-based authentication (web app only)

```bash
curl -X GET https://your-domain.com/api/tokens \
  -b "your-session-cookies"
```

**Response:**
```json
{
  "success": true,
  "tokens": [
    {
      "id": "uuid",
      "name": "Production Token",
      "token": "hb_xxxxxx...xxxx",
      "is_active": true,
      "created_at": "2025-10-14T...",
      "last_used_at": "2025-10-14T...",
      "expires_at": null
    }
  ]
}
```

#### Delete a Token
**Endpoint:** `DELETE /api/tokens?id=TOKEN_ID`

**Note:** Requires session-based authentication (web app only)

```bash
curl -X DELETE https://your-domain.com/api/tokens?id=uuid \
  -b "your-session-cookies"
```

---

## Code Examples

### Python

```python
import requests

API_BASE_URL = "https://your-domain.com/api"
API_TOKEN = "hb_xxxxxxxxxxxxx"

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_TOKEN}"
}

# Generate an image
def generate_image(prompt, size="1024x1024"):
    response = requests.post(
        f"{API_BASE_URL}/generateImage",
        headers=headers,
        json={
            "prompt": prompt,
            "size": size
        }
    )
    return response.json()

# Generate speech
def generate_speech(text):
    response = requests.post(
        f"{API_BASE_URL}/tts/generate",
        headers=headers,
        json={
            "prompt": text
        }
    )
    return response.json()

# Example usage
image_result = generate_image("A cat sitting on a laptop")
print(f"Image URL: {image_result['imageUrl']}")

speech_result = generate_speech("Hello world!")
print(f"Audio URL: {speech_result['audioUrl']}")
```

### JavaScript/Node.js

```javascript
const axios = require('axios');

const API_BASE_URL = 'https://your-domain.com/api';
const API_TOKEN = 'hb_xxxxxxxxxxxxx';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_TOKEN}`
};

// Generate an image
async function generateImage(prompt, size = '1024x1024') {
  const response = await axios.post(
    `${API_BASE_URL}/generateImage`,
    {
      prompt: prompt,
      size: size
    },
    { headers }
  );
  return response.data;
}

// Generate speech
async function generateSpeech(text) {
  const response = await axios.post(
    `${API_BASE_URL}/tts/generate`,
    {
      prompt: text
    },
    { headers }
  );
  return response.data;
}

// Example usage
(async () => {
  const imageResult = await generateImage('A cat sitting on a laptop');
  console.log('Image URL:', imageResult.imageUrl);

  const speechResult = await generateSpeech('Hello world!');
  console.log('Audio URL:', speechResult.audioUrl);
})();
```

### PHP

```php
<?php

$apiBaseUrl = 'https://your-domain.com/api';
$apiToken = 'hb_xxxxxxxxxxxxx';

function makeRequest($endpoint, $data) {
    global $apiBaseUrl, $apiToken;

    $ch = curl_init("$apiBaseUrl/$endpoint");
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        "Authorization: Bearer $apiToken"
    ]);

    $response = curl_exec($ch);
    curl_close($ch);

    return json_decode($response, true);
}

// Generate an image
$imageResult = makeRequest('generateImage', [
    'prompt' => 'A cat sitting on a laptop',
    'size' => '1024x1024'
]);
echo "Image URL: " . $imageResult['imageUrl'] . "\n";

// Generate speech
$speechResult = makeRequest('tts/generate', [
    'prompt' => 'Hello world!'
]);
echo "Audio URL: " . $speechResult['audioUrl'] . "\n";

?>
```

## Error Handling

### HTTP Status Codes

- `200 OK` - Request successful
- `400 Bad Request` - Invalid or missing parameters
- `401 Unauthorized` - Invalid or missing API token
- `500 Internal Server Error` - Server error

### Common Errors

**Invalid Token:**
```json
{
  "error": "Invalid API token"
}
```

**Token Expired:**
```json
{
  "error": "API token has expired"
}
```

**Missing Parameters:**
```json
{
  "error": "Prompt is required"
}
```

**Generation Failed:**
```json
{
  "success": false,
  "message": "Image generation failed. Please try again."
}
```

## Best Practices

1. **Secure Your Token:** Never expose your API token in client-side code or public repositories
2. **Handle Timeouts:** Image/speech generation can take 30-60 seconds
3. **Implement Retry Logic:** Network issues may occur; implement exponential backoff
4. **Cache Results:** Store generated URLs to avoid duplicate generations
5. **Monitor Usage:** Track your API usage to manage costs
6. **Set Expiration:** Use token expiration for added security
7. **Rotate Tokens:** Regularly rotate tokens, especially if compromised

## Rate Limits

Rate limits may apply based on your account tier. Contact support for enterprise rate limits.

## Support

- **API Documentation:** `https://your-domain.com/api/docs`
- **Email:** support@highbid.ai
- **Dashboard:** Access your account dashboard for usage statistics and billing

## Webhooks (Coming Soon)

We're working on webhook support to notify you when generations are complete. Stay tuned!

---

**Last Updated:** October 2025
**API Version:** 1.0.0
