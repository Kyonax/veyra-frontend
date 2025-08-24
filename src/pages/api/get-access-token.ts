import type { NextApiRequest, NextApiResponse } from "next";
import { ERROR_MSG } from "@/constants/Error";

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!HEYGEN_API_KEY) {
      return res.status(401).json({ error: ERROR_MSG.API_KEY_MISSING });
    }

    const baseApiUrl = process.env.NEXT_PUBLIC_BASE_API_URL;
    if (!baseApiUrl) {
      return res.status(500).json({ error: ERROR_MSG.BASE_API_URL_MISSING });
    }

    const apiRes = await fetch(`${baseApiUrl}/v1/streaming.create_token`, {
      method: "POST",
      headers: {
        "x-api-key": HEYGEN_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}) // some APIs require a body, even if empty
    });

    if (!apiRes.ok) {
      const errorData = await apiRes.json().catch(() => ({}));
      return res.status(apiRes.status).json({ 
        error: errorData.message || ERROR_MSG.API_REQUEST_FAILED 
      });
    }

    const data = await apiRes.json();
    if (!data.data?.token) {
      return res.status(500).json({ error: ERROR_MSG.INVALID_RESPONSE });
    }

    return res.status(200).send(data.data.token);

  } catch (error) {
    console.error("Error in API route:", error);
    const errorMessage = error instanceof Error ? error.message : ERROR_MSG.GENERIC_ERROR;
    return res.status(500).json({ error: errorMessage });
  }
}
