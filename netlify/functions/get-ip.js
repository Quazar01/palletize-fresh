/**
 * Copyright (c) 2025 Quazar01. All Rights Reserved.
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

exports.handler = async (event, context) => {
  // Get IP address from Netlify's context
  const ip = event.headers['x-nf-client-connection-ip'] || 
             event.headers['x-forwarded-for'] || 
             context.clientContext?.custom?.netlify?.ip ||
             'Unknown';
  
  // Get additional information
  const userAgent = event.headers['user-agent'] || 'Unknown';
  const referer = event.headers['referer'] || 'Direct';
  const country = event.headers['x-country'] || 'Unknown';
  const city = event.headers['x-city'] || 'Unknown';
  
  // Get timestamp
  const timestamp = new Date().toISOString();

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    },
    body: JSON.stringify({
      ip: ip,
      userAgent: userAgent,
      referer: referer,
      country: country,
      city: city,
      timestamp: timestamp
    })
  };
};
