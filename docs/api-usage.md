# Shape Editor Live API - Usage Guide

## Overview

The Shape Editor Live API provides endpoints to capture complete application state, execute server-side shape generation, and export images with real PNG/JPEG rendering. This guide covers the complete export workflow including individual file downloads, batch operations, and integration patterns.

---

## Available Endpoints

### 1. `/api/live/sets/enabled` (POST)
Returns only **enabled** generation sets with filtered batch configurations.

**Response includes:**
- Enabled generation sets with complete shape types data
- Filtered generation config settings (only enabled sections)
- Set manager settings (visibility, transforms, alignment, blend modes, compositing)
- Export settings, artboard settings, batch export settings

### 2. `/api/live/sets/execute` (POST)
Executes server-side shape generation and creates export job with real PNG/JPEG images.

**Response includes:**
- Export job ID for tracking
- Initial status
- Estimated completion time

### 3. `/api/export/status/:exportId` (GET)
Polls export job progress and retrieves download URLs when complete.

**Response includes:**
- Job status (pending, processing, completed, failed)
- Progress percentage
- Download URLs (ZIP and individual files)
- File metadata

### 4. `/api/export/download/:exportId` (GET)
Downloads complete export as ZIP file.

### 5. `/api/export/files/:exportId/:filename` (GET)
Downloads individual image files from export.

### 6. `/api/projects/download/:filename` (GET)
Downloads individual project JSON files.

### 7. `/api/projects/save` (POST)
Saves complete project data including shapes, groups, canvas settings, generation sets, and configuration.

**Request Body:**
- `shapes`: Array of shape objects (optional)
- `groups`: Array of group objects (optional)
- `canvasSettings`: Canvas configuration object (optional)
- `batchConfigSettings`: Complete generation config settings (optional)
- `generationSets`: Array of generation set configurations (optional)
- `enabledShapeTypes`: Array of enabled shape type strings (optional)
- `projectName`: Custom project name (optional)
- `includeTimestamp`: Whether to include timestamp in filename (optional, default: true)

**Response includes:**
- Success status
- Saved file path
- Project metadata

---

## Supported Export Formats

The API supports the following image formats:
- **PNG**: Lossless compression with transparency support (recommended for graphics)
- **JPEG**: Lossy compression with smaller file sizes (quality: 1-100)
- **WebP**: Modern format with excellent compression
- **AVIF**: Next-generation format with best compression
- **BMP**: Uncompressed bitmap format

**Scale Factor:** Supports 0.1x to 8x scaling (up to 600dpi for high-resolution print-quality exports)

---

## Authentication

All endpoints require an API key passed via the `x-api-key` header.

**Security Note:** Never hardcode API keys in scripts or documentation. Always use secure credential management.

---

## Complete Export Workflow

### Three-Step Process

The complete workflow follows this pattern:
1. **Get Configuration** - `/api/live/sets/enabled` retrieves current app state
2. **Execute Export** - `/api/live/sets/execute` generates images server-side
3. **Download Files** - `/api/export/download/:exportId` or individual file endpoints

---

## Quick Start Examples

### Example 1: Complete Workflow (Production URL)

```bash
# Step 1: Get enabled sets configuration
CONFIG=$(curl -s -X POST "https://shape-studio-nsdesign.replit.app/api/live/sets/enabled" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $LIVE_API_KEY" \
  -d '{"userId":"21294"}')

# Step 2: Execute export with configuration
EXPORT_ID=$(echo "$CONFIG" | jq -c '{data}' | \
  curl -s -X POST "https://shape-studio-nsdesign.replit.app/api/live/sets/execute" \
    -H "Content-Type: application/json" \
    -H "x-api-key: $LIVE_API_KEY" \
    -d @- | jq -r '.data.exportId')

echo "Export ID: $EXPORT_ID"

# Step 3: Poll for completion (wait 5 seconds)
sleep 5

# Step 4: Get status and download path
STATUS=$(curl -s "https://shape-studio-nsdesign.replit.app/api/export/status/$EXPORT_ID")
DOWNLOAD_PATH=$(echo "$STATUS" | jq -r '.status.downloadPath')

# Step 5: Download ZIP with smart filename extraction
curl -JO "https://shape-studio-nsdesign.replit.app$DOWNLOAD_PATH"

echo "✅ Export complete! Check your directory for batch-export-*.zip"
```

### Example 2: One-Line Chained Command (Local Development)

```bash
CONFIG=$(curl -s -X POST "http://localhost:5000/api/live/sets/enabled" \
  -H "x-api-key: $LIVE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId":"21294"}') && \
EXPORT_ID=$(echo "$CONFIG" | jq -c '{data}' | curl -s -X POST "http://localhost:5000/api/live/sets/execute" \
  -H "x-api-key: $LIVE_API_KEY" \
  -H "Content-Type: application/json" \
  -d @- | jq -r '.data.exportId') && \
sleep 5 && \
curl -JO "http://localhost:5000$(curl -s "http://localhost:5000/api/export/status/$EXPORT_ID" | jq -r '.status.downloadPath')"
```

**What `-JO` does:**
- `-J` - Use filename from `Content-Disposition` header (e.g., `batch-export-2025-10-18T16-03-29.zip`)
- `-O` - Save file with the extracted filename

---

## Downloading Individual Files

When an export completes, the status response includes individual file URLs for both images and project files.

### Example: Extract and Download Individual Images

```bash
# Get export status
STATUS=$(curl -s "https://shape-studio-nsdesign.replit.app/api/export/status/$EXPORT_ID")

# Extract image file URLs
IMAGE_URLS=$(echo "$STATUS" | jq -r '.status.imageFiles[]?.url')

# Download each image
echo "$IMAGE_URLS" | while read url; do
  curl -JO "https://shape-studio-nsdesign.replit.app$url"
done
```

### Example: Download Specific Images by Index

```bash
# Download only the first 3 images
STATUS=$(curl -s "https://shape-studio-nsdesign.replit.app/api/export/status/$EXPORT_ID")

echo "$STATUS" | jq -r '.status.imageFiles[0:3][]?.url' | while read url; do
  curl -JO "https://shape-studio-nsdesign.replit.app$url"
done
```

### Example: Download Project Files

```bash
# Extract and download project JSON files
STATUS=$(curl -s "https://shape-studio-nsdesign.replit.app/api/export/status/$EXPORT_ID")

PROJECT_URLS=$(echo "$STATUS" | jq -r '.status.projectFiles[]?.url')

echo "$PROJECT_URLS" | while read url; do
  curl -JO "https://shape-studio-nsdesign.replit.app$url"
done
```

### Example: Organized Download Script

```bash
#!/bin/bash

# Configuration
API_BASE="https://shape-studio-nsdesign.replit.app"
EXPORT_ID="$1"
OUTPUT_DIR="./downloads"

# Validate export ID
if [ -z "$EXPORT_ID" ]; then
  echo "Usage: $0 <export_id>"
  exit 1
fi

# Create organized directory structure
mkdir -p "$OUTPUT_DIR/images"
mkdir -p "$OUTPUT_DIR/projects"
mkdir -p "$OUTPUT_DIR/zips"

# Get export status
echo "Fetching export status..."
STATUS=$(curl -s "$API_BASE/api/export/status/$EXPORT_ID")

# Check if completed
if [ "$(echo "$STATUS" | jq -r '.status.status')" != "completed" ]; then
  echo "Export not completed yet. Status: $(echo "$STATUS" | jq -r '.status.status')"
  exit 1
fi

# Download ZIP
echo "Downloading ZIP archive..."
ZIP_PATH=$(echo "$STATUS" | jq -r '.status.downloadPath')
curl -o "$OUTPUT_DIR/zips/export.zip" "$API_BASE$ZIP_PATH"

# Download individual images
echo "Downloading individual images..."
echo "$STATUS" | jq -r '.status.imageFiles[]?.url' | while read url; do
  filename=$(basename "$url")
  curl -o "$OUTPUT_DIR/images/$filename" "$API_BASE$url"
  echo "  ✓ $filename"
done

# Download project files
if [ "$(echo "$STATUS" | jq '.status.projectFiles | length')" -gt 0 ]; then
  echo "Downloading project files..."
  echo "$STATUS" | jq -r '.status.projectFiles[]?.url' | while read url; do
    filename=$(basename "$url")
    curl -o "$OUTPUT_DIR/projects/$filename" "$API_BASE$url"
    echo "  ✓ $filename"
  done
fi

# Summary
IMAGE_COUNT=$(echo "$STATUS" | jq '.status.imageFiles | length')
PROJECT_COUNT=$(echo "$STATUS" | jq '.status.projectFiles | length')

echo ""
echo "📦 Download Complete!"
echo "  Images: $IMAGE_COUNT files in $OUTPUT_DIR/images/"
echo "  Projects: $PROJECT_COUNT files in $OUTPUT_DIR/projects/"
echo "  ZIP: $OUTPUT_DIR/zips/export.zip"
```

**Usage:**
```bash
chmod +x download-export.sh
./download-export.sh export_1760803409714_xecxxxez9
```

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
  -d '{"userId":"21294"}'
```

**How it works:**
- `$LIVE_API_KEY` automatically expands to the secret value stored in Replit
- The key is never exposed in command history or scripts
- Anyone running this command will use their own secret value

---

### Scenario 2: External Usage (n8n, Zapier, Make, etc.)

When calling the API from **external services** outside the Replit environment, you cannot access Replit secrets. Instead, use the external service's own credential management system.

#### n8n Complete Workflow Example

**Workflow:** Fetch config → Execute export → Poll status → Download files

**Node 1: HTTP Request (Get Configuration)**
```json
{
  "method": "POST",
  "url": "https://shape-studio-nsdesign.replit.app/api/live/sets/enabled",
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "httpHeaderAuth",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "userId": "21294"
  }
}
```

**Node 2: HTTP Request (Execute Export)**
```json
{
  "method": "POST",
  "url": "https://shape-studio-nsdesign.replit.app/api/live/sets/execute",
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "httpHeaderAuth",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "data": "={{ $json.data }}"
  }
}
```

**Node 3: Code (Wait for Completion)**
```javascript
// Wait 10 seconds for export to complete
return new Promise(resolve => {
  setTimeout(() => {
    resolve({ exportId: $input.item.json.data.exportId });
  }, 10000);
});
```

**Node 4: HTTP Request (Check Status)**
```json
{
  "method": "GET",
  "url": "https://shape-studio-nsdesign.replit.app/api/export/status/={{ $json.exportId }}",
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "httpHeaderAuth"
}
```

**Node 5: HTTP Request (Download ZIP)**
```json
{
  "method": "GET",
  "url": "https://shape-studio-nsdesign.replit.app={{ $json.status.downloadPath }}",
  "responseFormat": "file"
}
```

**Node 6: Move Binary Data (Save File)**
- Move the downloaded file to your desired storage location

---

### Scenario 3: Production Server

```bash
#!/bin/bash

# Store API key securely on your server
export LIVE_API_KEY="your-api-key-value"
API_BASE="https://shape-studio-nsdesign.replit.app"
USER_ID="21294"

# Function to check export status with timeout
wait_for_export() {
  local export_id=$1
  local max_attempts=30
  local attempt=0
  
  while [ $attempt -lt $max_attempts ]; do
    status=$(curl -s "$API_BASE/api/export/status/$export_id" | jq -r '.status.status')
    
    if [ "$status" = "completed" ]; then
      echo "✅ Export completed!"
      return 0
    elif [ "$status" = "failed" ]; then
      echo "❌ Export failed!"
      return 1
    fi
    
    echo "⏳ Status: $status (attempt $((attempt + 1))/$max_attempts)"
    sleep 2
    attempt=$((attempt + 1))
  done
  
  echo "⏰ Timeout waiting for export"
  return 1
}

# Execute workflow
echo "1. Fetching configuration..."
config=$(curl -s -X POST "$API_BASE/api/live/sets/enabled" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $LIVE_API_KEY" \
  -d "{\"userId\":\"$USER_ID\"}")

echo "2. Executing export..."
response=$(echo "$config" | jq -c '{data}' | \
  curl -s -X POST "$API_BASE/api/live/sets/execute" \
    -H "Content-Type: application/json" \
    -H "x-api-key: $LIVE_API_KEY" \
    -d @-)

export_id=$(echo "$response" | jq -r '.data.exportId')
echo "   Export ID: $export_id"

echo "3. Waiting for completion..."
if wait_for_export "$export_id"; then
  echo "4. Downloading files..."
  curl -JO "$API_BASE$(curl -s "$API_BASE/api/export/status/$export_id" | jq -r '.status.downloadPath')"
  echo "✨ Done!"
else
  echo "❌ Export workflow failed"
  exit 1
fi
```

---

## Request & Response Formats

### POST `/api/live/sets/enabled`

**Request Body:**
```json
{
  "userId": "21294"
}
```

**Request Headers:**
```json
{
  "Content-Type": "application/json",
  "x-api-key": "your-api-key"
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "generationSets": [...],
    "currentSetId": "set-...",
    "exportSettings": {...},
    "artboardSettings": {...},
    "batchExportSettings": {...}
  }
}
```

---

### POST `/api/live/sets/execute`

**Request Body:**
```json
{
  "data": {
    "generationSets": [...],
    "exportSettings": {...},
    "artboardSettings": {...},
    "batchExportSettings": {...}
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "exportId": "export_1760803409714_xecxxxez9",
    "status": "pending",
    "message": "Export job created successfully"
  }
}
```

---

### GET `/api/export/status/:exportId`

**Success Response (Completed):**
```json
{
  "success": true,
  "status": {
    "id": "export_1760803409714_xecxxxez9",
    "status": "completed",
    "progress": 100,
    "totalImages": 4,
    "completedImages": 4,
    "downloadPath": "/api/export/download/export_1760803409714_xecxxxez9",
    "imageFiles": [
      {
        "filename": "batch-export-001.png",
        "url": "/api/export/files/export_1760803409714_xecxxxez9/batch-export-001.png",
        "size": 18432
      },
      {
        "filename": "batch-export-002.png",
        "url": "/api/export/files/export_1760803409714_xecxxxez9/batch-export-002.png",
        "size": 18521
      }
    ],
    "projectFiles": [
      {
        "filename": "project-001.json",
        "url": "/api/projects/download/project-001.json",
        "size": 2048
      }
    ],
    "createdAt": "2025-10-18T16:03:29.714Z",
    "completedAt": "2025-10-18T16:03:34.821Z"
  }
}
```

---

### POST `/api/projects/save`

**Request Body (Complete Example):**
```json
{
  "projectName": "my-shape-project",
  "includeTimestamp": true,
  "shapes": [
    {
      "id": "shape-1",
      "type": "circle",
      "x": 200,
      "y": 200,
      "radius": 50,
      "fill": "#ff6b6b",
      "stroke": "#000000",
      "strokeWidth": 2
    }
  ],
  "groups": [],
  "canvasSettings": {
    "width": 800,
    "height": 600,
    "zoom": 1,
    "panX": 0,
    "panY": 0,
    "backgroundColor": "#1e293b",
    "showGrid": false
  },
  "batchConfigSettings": {
    "properties": {
      "position": { "enabled": true },
      "rotation": { "enabled": true },
      "scale": { "enabled": true }
    }
  },
  "generationSets": [],
  "enabledShapeTypes": ["circle", "rectangle", "polygon"]
}
```

**Success Response:**
```json
{
  "success": true,
  "filePath": "/tmp/projects/my-shape-project-2025-10-20T22-30-15.json",
  "filename": "my-shape-project-2025-10-20T22-30-15.json",
  "message": "Project saved successfully"
}
```

**curl Example:**
```bash
curl -X POST "https://shape-studio-nsdesign.replit.app/api/projects/save" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $LIVE_API_KEY" \
  -d '{
    "projectName": "my-shape-project",
    "shapes": [{"id": "s1", "type": "circle", "x": 200, "y": 200, "radius": 50}],
    "canvasSettings": {"width": 800, "height": 600},
    "enabledShapeTypes": ["circle"]
  }'
```

---

## Advanced Examples

### Example: Selective Image Download

Download only images matching a pattern:

```bash
# Get status
STATUS=$(curl -s "https://shape-studio-nsdesign.replit.app/api/export/status/$EXPORT_ID")

# Download only images 1-5
echo "$STATUS" | jq -r '.status.imageFiles[] | select(.filename | test("00[1-5]")) | .url' | \
  while read url; do
    curl -JO "https://shape-studio-nsdesign.replit.app$url"
  done
```

### Example: Parallel Downloads

Download all files in parallel (requires GNU parallel):

```bash
# Get all URLs
STATUS=$(curl -s "https://shape-studio-nsdesign.replit.app/api/export/status/$EXPORT_ID")

# Extract all file URLs
echo "$STATUS" | jq -r '.status.imageFiles[]?.url, .status.projectFiles[]?.url' | \
  parallel -j 4 "curl -JO https://shape-studio-nsdesign.replit.app{}"
```

### Example: Webhook Notification on Completion

```bash
#!/bin/bash

API_BASE="https://shape-studio-nsdesign.replit.app"
WEBHOOK_URL="https://your-webhook-endpoint.com/notify"

# Execute export
EXPORT_ID=$(curl -s -X POST "$API_BASE/api/live/sets/execute" \
  -H "x-api-key: $LIVE_API_KEY" \
  -H "Content-Type: application/json" \
  -d @config.json | jq -r '.data.exportId')

# Poll and notify
while true; do
  status=$(curl -s "$API_BASE/api/export/status/$EXPORT_ID")
  current=$(echo "$status" | jq -r '.status.status')
  
  if [ "$current" = "completed" ]; then
    # Send webhook notification
    curl -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{\"exportId\":\"$EXPORT_ID\",\"status\":\"completed\",\"downloadPath\":\"$(echo "$status" | jq -r '.status.downloadPath')\"}"
    break
  elif [ "$current" = "failed" ]; then
    curl -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{\"exportId\":\"$EXPORT_ID\",\"status\":\"failed\"}"
    break
  fi
  
  sleep 2
done
```

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
   - For published apps, use `https://shape-studio-nsdesign.replit.app`

4. **Export stuck in "processing"**
   - Check server logs for errors
   - Verify node-canvas is properly installed
   - Ensure sufficient memory/CPU resources

5. **File not found (404) on download**
   - Files expire after a certain period
   - Check that export completed successfully
   - Verify exportId is correct

### Debug Steps

1. **Verify Environment Variable:**
   ```bash
   echo $LIVE_API_KEY
   ```

2. **Test with Hardcoded Key (temporarily):**
   ```bash
   curl -X POST https://shape-studio-nsdesign.replit.app/api/live/sets/enabled \
     -H "x-api-key: 3211d3f332fsss4t4tbebw5r653765h6brb4" \
     -H "Content-Type: application/json" \
     -d '{"userId":"21294"}'
   ```

3. **Check Server Logs:**
   - View Replit console for error messages
   - Add console.log statements in `server/routes/liveApi.ts`

4. **Test Endpoint Availability:**
   ```bash
   curl -X POST https://shape-studio-nsdesign.replit.app/api/live/sets/enabled \
     -H "x-api-key: $LIVE_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"userId":"21294"}' -v
   ```

5. **Inspect Export Status:**
   ```bash
   # Get detailed status
   curl -s "https://shape-studio-nsdesign.replit.app/api/export/status/$EXPORT_ID" | jq
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

## OpenAPI / Swagger Documentation

### Overview

OpenAPI (formerly Swagger) provides interactive API documentation with a web UI where users can test endpoints directly. While not yet implemented in Shape Editor, here's how to add it:

### Implementation Guide

#### 1. Install Dependencies

```bash
npm install swagger-ui-express swagger-jsdoc --save
npm install @types/swagger-ui-express --save-dev
```

#### 2. Create OpenAPI Configuration

Create `server/swagger.ts`:

```typescript
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Shape Editor API',
      version: '1.0.0',
      description: 'Live API for server-side shape generation and export',
      contact: {
        name: 'API Support',
        email: '21294'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://shape-studio-nsdesign.replit.app',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key'
        }
      }
    },
    security: [{
      ApiKeyAuth: []
    }]
  },
  apis: ['./server/routes/*.ts'] // Path to API route files
};

export const swaggerSpec = swaggerJsdoc(options);
```

#### 3. Add to Express Server

In `server/index.ts`:

```typescript
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

// Add after other routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

#### 4. Annotate API Routes

Add JSDoc comments to `server/routes/liveApi.ts`:

```typescript
/**
 * @swagger
 * /api/live/sets/enabled:
 *   post:
 *     summary: Get enabled generation sets
 *     description: Returns configuration for all enabled generation sets with filtered batch settings
 *     tags:
 *       - Live API
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 example: 21294
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized - Invalid API key
 */
app.post('/api/live/sets/enabled', async (req, res) => {
  // ... existing code
});
```

#### 5. Access Documentation

Once implemented, visit:
- **Local:** http://localhost:5000/api-docs
- **Production:** https://shape-studio-nsdesign.replit.app/api-docs

### Benefits of OpenAPI/Swagger

✅ **Interactive Testing** - Test endpoints directly in browser
✅ **Auto-Generated Docs** - Always up-to-date with code
✅ **Client Code Generation** - Generate API clients for multiple languages
✅ **Type Safety** - Define schemas once, use everywhere
✅ **Team Collaboration** - Easy onboarding for new developers

### Alternative: Postman Collections

Another option is exporting a Postman collection:

```json
{
  "info": {
    "name": "Shape Editor API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get Enabled Sets",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "x-api-key",
            "value": "{{API_KEY}}"
          }
        ],
        "url": "{{BASE_URL}}/api/live/sets/enabled",
        "body": {
          "mode": "raw",
          "raw": "{\"userId\":\"21294\"}"
        }
      }
    }
  ]
}
```

---

## Performance & Optimization

### Recommended Practices

1. **Batch Size Limits**
   - Keep exports under 50 images for faster processing
   - Use higher batch counts only when necessary

2. **Image Quality**
   - PNG: Lossless but larger files (recommended for graphics)
   - JPEG: Smaller files, quality 85-92 recommended
   - Adjust quality based on use case

3. **Polling Strategy**
   - Poll status every 2-3 seconds
   - Implement exponential backoff for long exports
   - Set reasonable timeout (30-60 seconds)

4. **Concurrent Requests**
   - Limit parallel export requests to avoid resource exhaustion
   - Queue requests if processing multiple users

---

## Rate Limiting (Future Enhancement)

Consider implementing rate limiting to prevent abuse:

```typescript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP'
});

app.use('/api/live/', apiLimiter);
```

---

## Next Steps

- ✅ **Individual File Downloads** - Implemented in this guide
- ✅ **Complete Workflow Examples** - Provided with real URLs
- ⏳ **OpenAPI/Swagger Docs** - Implementation guide provided
- ⏳ **Webhooks** - Add webhook support for real-time updates
- ⏳ **Rate Limiting** - Implement to prevent abuse
- ⏳ **API Versioning** - Consider `/api/v1/live/sets/enabled`
- ⏳ **Monitoring** - Track API usage and performance metrics

---

## Support

For issues or questions:

1. Check this documentation first
2. Review troubleshooting section
3. Check server logs in Replit console
4. Test with the provided example scripts
5. Contact support with error messages and request details

**API Endpoints Summary:**
- Production: `https://shape-studio-nsdesign.replit.app`
- Development: `http://localhost:5000`
- User: `21294`
- Auth: `x-api-key` header required
