/**
 * Copyright (c) 2025 Quazar01. All Rights Reserved.
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

// Visitor tracking utility
export const trackVisitor = async (page, action = 'Visit', additionalData = {}) => {
  try {
    const response = await fetch('/.netlify/functions/track-visitor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page,
        action,
        ...additionalData,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error('Failed to track visitor:', error);
  }
  return null;
};

// Get visitor IP and info
export const getVisitorInfo = async () => {
  try {
    const response = await fetch('/.netlify/functions/get-ip');
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error('Failed to get visitor info:', error);
  }
  return null;
};
