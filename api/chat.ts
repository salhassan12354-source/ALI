import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { model, contents, config } = request.body;

    if (!apiKey) {
      return response.status(500).json({ 
        error: "API key is missing on the server.",
        message: "عذراً، مفتاح التشغيل غير متوفر حالياً." 
      });
    }

    const genResponse = await ai.models.generateContent({
      model: model || "gemini-3.1-pro-preview",
      contents,
      config: config || { temperature: 0.7 }
    });

    return response.status(200).json({ text: genResponse.text });
  } catch (error: any) {
    console.error("Vercel Gemini Error:", error);
    return response.status(500).json({ 
      error: error.message || "Internal Server Error",
      message: "عذراً، حدث خطأ في معالجة طلبك."
    });
  }
}
