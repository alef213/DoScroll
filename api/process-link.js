export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url, note, userCategory, categoriesList } = req.body;

  let domainKey = "";
  try {
    domainKey = new URL(url.startsWith("http") ? url : `https://${url}`)
      .hostname.replace("www.", "");
  } catch {
    domainKey = url.slice(0, 30);
  }

  const needsCategory = !userCategory;
  const categoryInstruction = needsCategory
    ? `Pick the single best category from this exact list: ${JSON.stringify(categoriesList)}. Return it exactly as written.`
    : `The user already chose the category "${userCategory}". Return that exact string as the category.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{
          role: "user",
          content: `Analyze this URL and generate metadata for a content feed card.

URL: ${url}
${note ? `User note: ${note}` : ""}

Instructions:
1. Search the web for this URL to understand what the content is about.
2. Generate a compelling, concise title (max 60 chars).
3. Generate a short summary of what this content is about (max 300 chars). Be specific about what the reader/viewer/listener will get from this content.
4. ${categoryInstruction}

Respond with ONLY valid JSON, no markdown backticks, no preamble:
{"title": "...", "summary": "...", "category": "..."}`,
        }],
      }),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error("Anthropic API error:", err);
    res.status(500).json({ error: "Failed to process link" });
  }
}
