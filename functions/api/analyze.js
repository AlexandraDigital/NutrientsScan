/**
 * Cloudflare Pages Function — POST /api/analyze
 *
 * Proxies requests to the Groq API so the key never reaches the browser.
 * Set GROQ_API_KEY in Cloudflare Pages → Settings → Environment variables.
 */

const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

export async function onRequestPost({ request, env }) {
  // ── CORS pre-flight ──────────────────────────────────────────────
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  const apiKey = env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GROQ_API_KEY environment variable is not set." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body." }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const { imageDataURL, mode } = body;
  if (!imageDataURL || !mode) {
    return new Response(
      JSON.stringify({ error: "Missing imageDataURL or mode." }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const prompt =
    mode === "calories"
      ? `You are a professional nutritionist. Analyze the food in this image carefully and accurately. Return ONLY valid JSON with no markdown fences or extra text:
{"foodName":"string","totalCalories":number,"servingSize":"string","macros":{"protein":number,"carbs":number,"fat":number,"fiber":number},"items":[{"name":"string","calories":number}],"healthScore":number,"tips":["string","string"]}`
      : `You are a professional chef. Identify every visible ingredient in this image (could be a fridge, pantry shelf, or ingredients laid out). Then suggest 3 great recipes using primarily those ingredients. Return ONLY valid JSON with no markdown fences or extra text:
{"ingredients":["string"],"recipes":[{"name":"string","time":"string","difficulty":"string","calories":number,"description":"string","steps":["string"]}],"missingCommon":["string"]}`;

  const groqRes = await fetch(GROQ_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageDataURL } },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });

  const groqData = await groqRes.json();

  if (!groqRes.ok) {
    return new Response(
      JSON.stringify({ error: groqData?.error?.message || `Groq error ${groqRes.status}` }),
      { status: groqRes.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const raw = groqData.choices?.[0]?.message?.content || "";
  const clean = raw.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(clean);
    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "AI returned invalid JSON. Try again." }),
      { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
}

// Handle CORS pre-flight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
