# Live API Usage Guide

## Overview

The Shape Editor Pro Live API provides endpoints to capture complete application state, including generation sets, batch configurations, export settings, and artboard settings. This guide covers how to use the API both from within the Replit environment and from external services like n8n.

---

## Available Endpoints

### 1. `/api/live/sets/enabled` (POST)

Returns only **enabled** generation sets with filtered batch configurations (disabled sections stripped).

**Response includes:**
- Enabled generation sets with complete shape types data
- Filtered generation config settings (only enabled sections)
- Set manager settings (visibility, transforms, alignment, blend modes, compositing)
- Export settings
- Artboard settings  
- Batch export settings

---

## Authentication

All endpoints require an API key passed via the `x-api-key` header.

**Security Note:** Never hardcode API keys in scripts or documentation. Always use secure credential management.

---

## Usage Scenarios

### Scenario 1: Internal Usage (Replit Shell)

When running curl commands **inside the Replit environment** (Shell, workspace scripts, Replit workflows), you can use environment variables to access secrets securely.

#### Setup Instructions

1. **Add Secret to Replit:**
   - Open the **Secrets** pane in Replit (Tools → Secrets)
   - Click **New Secret**
   - Name: `LIVE_API_KEY`
   - Value: Your actual API key (e.g., `3211d3f332fsss4t4tbebw5r653765h6brb4`)
   - Click **Add**

2. **Verify Secret is Available:**
   ```bash
   printenv | grep LIVE_API_KEY
   ```
   You should see: `LIVE_API_KEY=your-api-key-value`

#### Example: curl Command in Replit Shell

```bash
curl -X POST http://localhost:5000/api/live/sets/enabled \
  -H "Content-Type: application/json" \
  -H "x-api-key: $LIVE_API_KEY" \
  -d '{"userId":"dev-user"}'
```

**How it works:**
- `$LIVE_API_KEY` automatically expands to the secret value stored in Replit
- The key is never exposed in command history or scripts
- Anyone running this command will use their own secret value

#### Example: Using in a Bash Script

```bash
#!/bin/bash

# Fetch enabled generation sets
response=$(curl -s -X POST http://localhost:5000/api/live/sets/enabled \
  -H "Content-Type: application/json" \
  -H "x-api-key: $LIVE_API_KEY" \
  -d '{"userId":"'"$USER_ID"'"}')

echo "Response: $response"
```

---

### Scenario 2: External Usage (n8n, Zapier, Make, etc.)

When calling the API from **external services** outside the Replit environment, you cannot access Replit secrets. Instead, use the external service's own credential management system.

#### n8n Setup Instructions

##### Option A: Using n8n Credentials (Recommended)

1. **Create Credential in n8n:**
   - Go to **Credentials** in n8n
   - Click **Add Credential**
   - Choose **Header Auth** or **Generic Credential**
   - Name: `ShapeEditorAPIKey`
   - Add the API key value

2. **Use in HTTP Request Node:**

   **Node Configuration:**
   - **Method:** POST
   - **URL:** `https://your-replit-app.repl.co/api/live/sets/enabled`
   
   **Headers:**
   ```json
   {
     "Content-Type": "application/json",
     "x-api-key": "={{$credentials.ShapeEditorAPIKey}}"
   }
   ```
   
   **Body (JSON):**
   ```json
   {
     "userId": "{{$json.userId}}"
   }
   ```

3. **Authentication:**
   - In the HTTP Request node, select your credential from the **Credential for Predefined Credential Type** dropdown

##### Option B: Using n8n Variables

1. **Set Variable in Workflow:**
   ```javascript
   // In a Set node
   {
     "apiKey": "your-api-key-value"
   }
   ```

2. **Use in HTTP Request Node:**
   ```json
   {
     "x-api-key": "={{$node['Set'].json.apiKey}}"
   }
   ```

**Note:** This method stores the key in the workflow, which is less secure than using credentials.

#### Example: curl Command from External Server

```bash
# Store API key in environment variable on your server
export LIVE_API_KEY="your-api-key-value"

# Make request
curl -X POST https://your-replit-app.repl.co/api/live/sets/enabled \
  -H "Content-Type: application/json" \
  -H "x-api-key: $LIVE_API_KEY" \
  -d '{"userId":"external-user-123"}'
```

---

## Request Format

### POST `/api/live/sets/enabled`

**Request Body:**
```json
{
  "userId": "string"
}
```

**Request Headers:**
```json
{
  "Content-Type": "application/json",
  "x-api-key": "your-api-key"
}
```

---

## Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "generationSets": [
      {
        "id": "set-1760146321165-0f3pjy9n8",
        "name": "Set 1",
        "enabled": true,
        "enabledShapeTypes": ["circle", "rectangle"],
        "shapeCountMode": "range",
        "shapeCountFixed": 10,
        "shapeCountRange": [5, 15],
        "shapeSpecificProperties": {
          "circle": {
            "segmentCountRange": [16, 32]
          },
          "rectangle": {
            "cornerRadiusMode": "range",
            "cornerRadiusRange": [0, 20]
          }
        },
        "batchConfig": {
          "selectedPreset": "custom",
          "propertiesEnabled": true,
          "fillEnabled": true,
          "strokeEnabled": true,
          "distributionEnabled": true,
          "distributionPattern": "grid",
          "gridRows": 3,
          "gridColumns": 3,
          "gridSpacing": 50
        },
        "setVisibility": {
          "visible": true,
          "opacity": 1,
          "opacityVariance": 0
        },
        "setBlendMode": "normal",
        "compositingOperation": "source-over",
        "setTransform": {
          "x": 0,
          "y": 0,
          "rotation": 0,
          "scaleX": 1,
          "scaleY": 1
        },
        "artboardAlignment": {
          "fitToArtboard": false,
          "alignTo": "center"
        },
        "zIndexConfig": {
          "mode": "auto",
          "baseValue": 0
        },
        "generationOrder": 0,
        "description": ""
      }
    ],
    "currentSetId": "set-1760146321165-0f3pjy9n8",
    "exportSettings": {
      "format": "png",
      "quality": 90,
      "scale": 1,
      "mode": "all"
    },
    "artboardSettings": {
      "width": 400,
      "height": 400,
      "backgroundColor": "#ffffff",
      "displayGrid": false,
      "displayBorder": true
    },
    "batchExportSettings": {
      "enabled": false,
      "count": 10,
      "setsPerExport": 1
    }
  }
}
```

### Error Response

```json
{
  "error": "Invalid API key"
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized (invalid API key)
- `404` - User not found
- `500` - Server error

---

## Security Best Practices

### ✅ Do's

1. **Use Environment Variables:**
   - Store API keys in environment variables, never in code
   - In Replit: Use the Secrets pane
   - In external services: Use their credential management system

2. **Use HTTPS in Production:**
   - Always use `https://` when calling published Replit apps
   - Never send API keys over unencrypted connections

3. **Rotate Keys Regularly:**
   - Change API keys periodically
   - Update in all services using the key

4. **Restrict Access:**
   - Limit who can view/edit Replit secrets
   - Use separate keys for different environments (dev/prod)

### ❌ Don'ts

1. **Never Hardcode Keys:**
   ```bash
   # BAD - Key exposed in script
   curl -H "x-api-key: 3211d3f332fsss4t4tbebw5r653765h6brb4" ...
   
   # GOOD - Key from environment variable
   curl -H "x-api-key: $LIVE_API_KEY" ...
   ```

2. **Never Commit Keys to Git:**
   - Add `.env` files to `.gitignore`
   - Use Replit Secrets instead of `.env` files when possible

3. **Never Share Keys Publicly:**
   - Don't paste keys in chat, documentation, or screenshots
   - Revoke and regenerate if accidentally exposed

4. **Never Log Keys:**
   ```javascript
   // BAD
   console.log('API Key:', process.env.LIVE_API_KEY);
   
   // GOOD
   console.log('API Key:', '****');
   ```

---

## Testing the API

### Test from Replit Shell

```bash
# Set up test user ID
export TEST_USER_ID="dev-user"

# Make request
curl -X POST http://localhost:5000/api/live/sets/enabled \
  -H "Content-Type: application/json" \
  -H "x-api-key: $LIVE_API_KEY" \
  -d '{"userId":"'"$TEST_USER_ID"'"}' | jq
```

**Using jq for pretty output:**
```bash
# Install jq if not available
# In Replit: already installed

# Pretty print response
curl -s -X POST http://localhost:5000/api/live/sets/enabled \
  -H "Content-Type: application/json" \
  -H "x-api-key: $LIVE_API_KEY" \
  -d '{"userId":"dev-user"}' | jq '.data.generationSets[0].name'
```

### Test from n8n

1. **Create a simple workflow:**
   - Start with **Manual Trigger** node
   - Add **HTTP Request** node configured as shown above
   - Add **Set** node to view response

2. **Execute workflow:**
   - Click **Execute Workflow**
   - Check the **Set** node output

3. **Debug issues:**
   - Check HTTP Request node for error messages
   - Verify API key is correct in credentials
   - Ensure URL is correct (http://localhost for dev, https://your-app.repl.co for production)

---

## Integration Examples

### Example 1: Fetch and Process in n8n

**Workflow:** Fetch enabled sets → Filter by shape type → Send to webhook

**Node 1: HTTP Request (Fetch Sets)**
```json
{
  "method": "POST",
  "url": "https://your-app.repl.co/api/live/sets/enabled",
  "headers": {
    "x-api-key": "={{$credentials.ShapeEditorAPIKey}}"
  },
  "body": {
    "userId": "production-user"
  }
}
```

**Node 2: Function (Filter)**
```javascript
const sets = $input.item.json.data.generationSets;
const circleSets = sets.filter(set => 
  set.enabledShapeTypes.includes('circle')
);
return { circleSets };
```

**Node 3: Webhook (Send)**
- Send filtered data to external system

### Example 2: Bash Script for Batch Processing

```bash
#!/bin/bash

# Configuration
API_URL="http://localhost:5000/api/live/sets/enabled"
OUTPUT_DIR="./api-exports"
USER_ID="batch-processor"

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

# Fetch data
echo "Fetching enabled generation sets..."
response=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $LIVE_API_KEY" \
  -d '{"userId":"'"$USER_ID"'"}')

# Check for errors
if echo "$response" | jq -e '.error' > /dev/null; then
  echo "Error: $(echo "$response" | jq -r '.error')"
  exit 1
fi

# Save to file
timestamp=$(date +%Y%m%d_%H%M%S)
output_file="$OUTPUT_DIR/sets_$timestamp.json"
echo "$response" | jq '.' > "$output_file"

echo "Data saved to: $output_file"

# Extract set count
set_count=$(echo "$response" | jq '.data.generationSets | length')
echo "Total enabled sets: $set_count"
```

---

## Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Verify API key matches the value in `server/routes/liveApi.ts`
   - Check header name is exactly `x-api-key` (case-sensitive)
   - Ensure no extra whitespace in key value

2. **"User not found" error**
   - User must exist in database
   - Verify userId in request body matches a real user

3. **Connection refused**
   - Ensure the Replit app is running
   - Check the URL is correct (localhost:5000 for dev)
   - For published apps, use the Replit-provided URL

4. **CORS errors (browser requests)**
   - API is designed for server-to-server communication
   - If calling from browser, ensure CORS is configured in Express

5. **Empty response**
   - Check that user has at least one enabled generation set
   - Verify batch configuration has enabled sections

### Debug Steps

1. **Verify Environment Variable:**
   ```bash
   echo $LIVE_API_KEY
   ```

2. **Test with Hardcoded Key (temporarily):**
   ```bash
   curl -X POST http://localhost:5000/api/live/sets/enabled \
     -H "x-api-key: 3211d3f332fsss4t4tbebw5r653765h6brb4" \
     -d '{"userId":"dev-user"}'
   ```

3. **Check Server Logs:**
   - View Replit console for error messages
   - Add console.log statements in `server/routes/liveApi.ts`

4. **Test Endpoint Availability:**
   ```bash
   curl -X POST http://localhost:5000/api/live/sets/enabled \
     -H "x-api-key: $LIVE_API_KEY" \
     -d '{"userId":"dev-user"}' -v
   ```

---

## API Key Management

### Setting Up the API Key

The API key is configured in `server/routes/liveApi.ts`:

```typescript
// API key from environment or fallback to hardcoded for development
const API_KEY = process.env.LIVE_API_KEY || '3211d3f332fsss4t4tbebw5r653765h6brb4';
```

### Updating the API Key

1. **Generate New Key:**
   ```bash
   # Generate random key
   openssl rand -hex 32
   ```

2. **Update in Replit:**
   - Go to Secrets pane
   - Update `LIVE_API_KEY` value
   - Restart the app

3. **Update in External Services:**
   - Update credentials in n8n
   - Update environment variables on external servers
   - Update any documentation

### Multiple API Keys (Future Enhancement)

Currently supports single API key. To add multiple keys:

```typescript
const VALID_API_KEYS = [
  process.env.LIVE_API_KEY_1,
  process.env.LIVE_API_KEY_2,
  process.env.LIVE_API_KEY_3
].filter(Boolean);

// In middleware
if (!VALID_API_KEYS.includes(apiKey)) {
  return res.status(401).json({ error: 'Invalid API key' });
}
```

---

## Next Steps

- **Monitor Usage:** Track API calls to detect unusual activity
- **Rate Limiting:** Implement rate limiting to prevent abuse
- **API Documentation:** Consider adding OpenAPI/Swagger docs
- **Webhooks:** Add webhook support for real-time updates
- **Versioning:** Implement API versioning (e.g., `/api/v1/live/sets/enabled`)

---

## Support

For issues or questions:
1. Check this documentation first
2. Review troubleshooting section
3. Check server logs in Replit console
4. Contact support with error messages and request details
