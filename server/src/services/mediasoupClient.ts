// src/services/mediasoupClient.ts

import { config } from '../config'; // <-- 1. Import config

// 2. Use the URL directly from the config object.
// No fallback is needed because config.ts ensures it exists.
const MEDIASOUP_API_URL = config.MEDIASOUP_API_URL;

export async function forwardToMediasoup(action: string, payload: object): Promise<any> {
  const url = `${MEDIASOUP_API_URL}/${action}`;
  console.log(`Forwarding to Mediasoup: POST ${url}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": config.MEDIASOUP_INTERNAL_SECRET,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Mediasoup service responded with status ${response.status}: ${errorText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to communicate with Mediasoup service at ${url}:`, error);
    throw error;
  }
}