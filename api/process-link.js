export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url, note, userCategory, categoriesList } = req.body;

  const needsCategory = !userCategory;
  const categoryInstruction = needsCategory
    ? `Pick the single best category from this exact list: ${JSON.stringify(categoriesList)}. Return it exactly as written.`
    : `The user already chose the category "${userCategory}". Return that exact string as the category.`;

  const fetchedUrl = url.startsWith("http") ? url : `https://${url}`;

  const ytMatch = fetchedUrl.match(
    /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  const ytVideoId = ytMatch ? ytMatch[1] : null;

  const ogImagePromise = ytVideoId
    ? Promise.resolve(`https://img.youtube.com/vi/${ytVideoId}/hqdefault.jpg`)
    : fetch(fetchedUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; DoScroll/1.0)" },
    signal: AbortSignal.timeout(5000),
    redirect: "follow",
  }).then(r => r.text()).then(html => {
    const m =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    return m ? m[1] : null;
  }).catch(() => null);

  const ytOembedPromise = ytVideoId
    ? fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(fetchedUrl)}&format=json`, { signal: AbortSignal.timeout(5000) })
        .then(r => r.json()).catch(() => null)
    : Promise.resolve(null);

  const microlinkPromise = ytVideoId
    ? Promise.resolve(null)
    : fetch(
        `https://api.microlink.io?url=${encodeURIComponent(fetchedUrl)}&screenshot=true`,
        { signal: AbortSignal.timeout(10000) }
      ).then(r => r.json())
        .then(d => d?.data?.screenshot?.url || d?.data?.image?.url || null)
        .catch(() => null);

  const anthropicPromise = fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "web-search-2025-03-05",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{
        role: "user",
        content: `Analyze this URL and generate metadata for a content feed card.\n\nURL: ${url}\n${note ? `User note: ${note}\n` : ""}\nInstructions:\n1. Search the web for this URL to understand what the content is about.\n2. Generate a compelling, concise title (max 60 chars).\n3. Generate a short summary of what this content is about (max 300 chars). Be specific about what the reader/viewer/listener will get from this content.\n4. ${categoryInstruction}\n\nRespond with ONLY valid JSON, no markdown backticks, no preamble:\n{"title": "...", "summary": "...", "category": "..."}`,
      }],
    }),
  });

  try {
    const [apiRes, ogImage, mlImage, ytOembed] = await Promise.all([anthropicPromise, ogImagePromise, microlinkPromise, ytOembedPromise]);
    const data = await apiRes.json();
    data.ogImage = ogImage || mlImage;
    data.ytFallback = ytOembed ? { title: ytOembed.title, author: ytOembed.author_name } : null;
    res.status(apiRes.status).json(data);
  } catch (err) {
    console.error("Anthropic API error:", err);
    res.status(500).json({ error: "Failed to process link" });
  }
}
