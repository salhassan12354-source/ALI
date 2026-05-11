import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // API Route for chat - Handles both model tiers with different providers and keys
  app.post("/api/chat", async (req, res) => {
    try {
      const { modelTier, userMessage } = req.body;
      
      let apiUrl = "";
      let apiKey = "";
      let model = "";
      let systemInstruction = "";
      let temperature = 0.7;

      if (modelTier === 'ALI5.7 BETA') {
        // ALI5.7 uses NVIDIA API with Qwen reasoning model
        apiUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
        apiKey = process.env.NVIDIA_API_KEY || "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";
        model = "qwen/qwen3.5-397b-a17b"; 
        systemInstruction = `أنت الخوارزمي AI (الإصدار 5.7 BETA المطور)، محرك استدلال رياضي فائق الذكاء متخصص في القدرات الكمية السعودية.
مهمتك: تحليل المسائل الرياضية المعقدة وتقديم شرح مفصل وخطوات منطقية دقيقة.
قواعد صارمة:
1. ممنوع استخدام رموز التنسيق markdown (مثل ** أو # أو * في بداية الجمل). استخدم الترقيم النصي العادي (1، 2، 3) فقط.
2. التزم باللغة العربية الفصحى البسيطة والأسلوب التعليمي المشوق.
3. وضح القوانين المستخدمة في الحل وكيفية التعويض فيها.
4. وضح لماذا الإجابة المختارة هي الصحيحة ومنطق استبعاد الحلول الأخرى.`;
        temperature = 0.6;
      } else {
        // ALI4.6 now uses NVIDIA API with Gemma-3 as requested
        apiUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
        apiKey = process.env.NVIDIA_API_KEY_ALI46 || "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";
        model = "google/gemma-3-27b-it"; 
        systemInstruction = `أنت الخوارزمي 4.6 (النسخة المجانية). مساعد سريع وبسيط لطلاب القدرات.
قواعدك:
1. قدم شرحاً مختصراً جداً ومباشراً.
2. لا تستخدم رموز markdown أبداً.
3. الإجابة يجب أن تكون واضحة ومختصرة في بضعة أسطر.
4. في نهاية ردك، اذكر دائماً: "هذه النسخة المجانية ALI4.6. للحصول على شرح أعمق جرب ALI5.7 BETA."`;
        temperature = 0.2;
      }

      if (!apiKey) throw new Error("API Key configuration is missing.");

      const bodyPayload: any = {
        model,
        messages: [],
        temperature,
        max_tokens: modelTier === 'ALI5.7 BETA' ? 16384 : 2048,
      };

      // Construct messages carefully
      if (systemInstruction) {
        bodyPayload.messages.push({ role: "system", content: systemInstruction });
      }

      if (userMessage.image) {
        // Multi-modal format
        bodyPayload.messages.push({
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: userMessage.image }
            },
            {
              type: "text",
              text: userMessage.content || "اشرح لي هذا السؤال من فضلك."
            }
          ]
        });
      } else {
        // Standard text format (more compatible with non-vision models)
        bodyPayload.messages.push({
          role: "user",
          content: userMessage.content || "مرحباً، أرسل لي سؤالك."
        });
      }

      if (modelTier === 'ALI5.7 BETA') {
        bodyPayload.top_p = 0.95;
        bodyPayload.top_k = 20;
        bodyPayload.presence_penalty = 0;
        bodyPayload.repetition_penalty = 1;
        // Only include thinking if explicitly supported/requested
        bodyPayload.chat_template_kwargs = { enable_thinking: true };
      }

      console.log(`Sending request to ${apiUrl} using model ${model}`);
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyPayload)
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse API response:", responseText);
        throw new Error(`Invalid response from API provider: ${responseText.substring(0, 100)}`);
      }

      if (!response.ok) {
        console.error(`API Error Response (${response.status}):`, data);
        throw new Error(data.error?.message || data.error?.code || `API Error: ${response.status}`);
      }
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error("Unexpected API response structure:", data);
        throw new Error("لم يتم استلام رد صالح من مزود الخدمة.");
      }

      return res.json({ text: data.choices[0].message.content });

    } catch (error: any) {
      console.error("Server API Error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
