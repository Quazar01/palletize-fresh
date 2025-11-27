/**
 * Copyright (c) 2025 Quazar01. All Rights Reserved.
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    
    // Get IP and visitor info
    const ip = event.headers['x-nf-client-connection-ip'] || 
               event.headers['x-forwarded-for'] || 
               'Unknown';
    
    const visitorInfo = {
      ip: ip,
      timestamp: new Date().toISOString(),
      userAgent: event.headers['user-agent'] || 'Unknown',
      country: event.headers['x-country'] || 'Unknown',
      city: event.headers['x-city'] || 'Unknown',
      page: data.page || 'Unknown',
      action: data.action || 'Visit',
      kund: data.kund || null,
      mode: data.mode || null
    };

    // Log to console (you can later integrate with a database or analytics service)
    console.log('Visitor tracked:', JSON.stringify(visitorInfo, null, 2));

    // In production, you might want to:
    // - Store in Firebase
    // - Store in Netlify Blobs
    // - Send to analytics service
    // - Store in a database

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        success: true,
        tracked: visitorInfo
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to track visitor' })
    };
  }
};
