# Visitor IP Tracking with Netlify

## Overview

Your application now tracks visitor IP addresses and activity using Netlify Functions. This provides insights into who is using your application and how they're using it.

## Features Implemented

### 1. **IP Address Collection**
   - Automatically captures visitor IP addresses via Netlify's built-in headers
   - Records location data (country, city)
   - Captures user agent (browser/device info)

### 2. **Activity Tracking**
   - Tracks page visits
   - Records when orders are processed
   - Logs customer names and processing modes used
   - Timestamps all activities

### 3. **Netlify Functions Created**

   - **`get-ip.js`** - Returns visitor's IP and location info
   - **`track-visitor.js`** - Logs visitor activity with details
   - **`get-visitor-logs.js`** - Admin endpoint to view logs (requires password)

## How It Works

### Automatic Tracking

The application automatically tracks:
- When someone visits the home page
- When someone processes an order (with details)

### Data Collected

For each visitor/action:
```json
{
  "ip": "123.45.67.89",
  "timestamp": "2025-11-27T10:30:00.000Z",
  "userAgent": "Mozilla/5.0...",
  "country": "Sweden",
  "city": "Stockholm",
  "page": "Home",
  "action": "Order Processed",
  "kund": "Customer Name",
  "mode": "combo"
}
```

## Viewing Visitor Logs

### Method 1: Netlify Dashboard (Real-time)

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site
3. Go to **Functions** tab
4. Click on **track-visitor** function
5. Click **View Logs**
6. See all tracked visitors in real-time

### Method 2: Via API (Future Enhancement)

You can call the admin endpoint:
```javascript
fetch('/.netlify/functions/get-visitor-logs', {
  headers: {
    'x-admin-password': 'your-admin-password'
  }
})
```

## Security & Privacy

### Current Implementation
- Logs are stored in Netlify's function logs (7 days retention on free tier)
- No personally identifiable information beyond IP address
- IP addresses are collected for security monitoring

### Privacy Compliance
- Consider adding a privacy policy mentioning IP collection
- IP addresses are considered personal data under GDPR
- Inform users about tracking (cookie notice/privacy policy)

### Recommended Additions
1. Add privacy policy page
2. Add cookie consent banner (if required in your jurisdiction)
3. Implement data retention policy

## Upgrading to Persistent Storage

For long-term storage, integrate with a database:

### Option 1: Netlify Blobs (Recommended for Netlify)
```javascript
import { getStore } from '@netlify/blobs';

const store = getStore('visitor-logs');
await store.set(timestamp, JSON.stringify(visitorData));
```

### Option 2: Firebase (Already in your project)
```javascript
import { db } from './firebase-config';
import { collection, addDoc } from 'firebase/firestore';

await addDoc(collection(db, 'visitors'), visitorData);
```

### Option 3: External Service
- Use analytics services like Google Analytics, Plausible, etc.
- Use logging services like Logtail, Papertrail

## Testing Locally

To test locally with Netlify CLI:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Run dev server with functions
netlify dev
```

Then visit: http://localhost:8888

## Environment Variables

To set an admin password for viewing logs:

1. In Netlify Dashboard:
   - Go to Site settings > Environment variables
   - Add: `ADMIN_PASSWORD` = `your-secure-password`

2. For local testing, create `.env`:
```
ADMIN_PASSWORD=your-secure-password
```

## API Reference

### GET `/.netlify/functions/get-ip`
Returns current visitor's IP and info.

**Response:**
```json
{
  "ip": "123.45.67.89",
  "userAgent": "Mozilla/5.0...",
  "country": "Sweden",
  "city": "Stockholm",
  "timestamp": "2025-11-27T10:30:00.000Z"
}
```

### POST `/.netlify/functions/track-visitor`
Tracks a visitor action.

**Request Body:**
```json
{
  "page": "Home",
  "action": "Order Processed",
  "kund": "Customer Name",
  "mode": "combo"
}
```

**Response:**
```json
{
  "success": true,
  "tracked": { /* visitor info */ }
}
```

### GET `/.netlify/functions/get-visitor-logs`
Admin endpoint to retrieve logs.

**Headers:**
```
x-admin-password: your-admin-password
```

## Next Steps

1. ✅ IP tracking is active
2. ⚠️ Add persistent storage (Firebase/Netlify Blobs)
3. ⚠️ Add privacy policy
4. ⚠️ Create admin dashboard to view logs
5. ⚠️ Set up email alerts for suspicious activity

## Support

For issues or questions about visitor tracking, check:
- Netlify Functions documentation
- Function logs in Netlify dashboard
- Browser console for any errors
