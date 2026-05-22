export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify Supabase JWT
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const { createClient } = await import("@supabase/supabase-js");
  const sbClient = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  const { data: { user } } = await sbClient.auth.getUser(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { url, note, userCategory, categoriesList } = req.body;

  if (!url || typeof url !== "string" || url.length > 2048) {
    return res.status(400).json({ error: "Invalid URL" });
  }
  if (note !== undefined && note !== null && (typeof note !== "string" || note.length > 500)) {
    return res.status(400).json({ error: "Note too long" });
  }
  if (!Array.isArray(categoriesList) || categoriesList.length > 50 ||
      categoriesList.some(c => typeof c !== "string" || c.length > 50)) {
    return res.status(400).json({ error: "Invalid categories" });
  }

  const needsCategory = !userCategory;
  const categoryInstruction = needsCategory
    ? `Pick the single best category from this exact list: ${JSON.stringify(categoriesList)}. Return it exactly as written.`
    : `The user already chose the category "${userCategory}". Return that exact string as the category.`;

  const rawUrl = url.startsWith("http") ? url : `https://${url}`;

  // Detect Wikipedia early so we can skip the slow redirect-resolution fetch
  const isWikiUrl = /^https?:\/\/[a-z]{2,}\.wikipedia\.org\/wiki\//i.test(rawUrl);

  // For Wikipedia skip redirect resolution (saves 3-5s and avoids timeouts).
  // For everything else use HEAD (no body download) to follow redirects quickly.
  let fetchedUrl = rawUrl;
  if (!isWikiUrl) {
    try {
      const r = await fetch(rawUrl, {
        method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(3000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; DoScroll/1.0)" },
      });
      if (r.url && r.url !== rawUrl) fetchedUrl = r.url;
    } catch { /* keep original */ }
  }

  const ytMatch = fetchedUrl.match(
    /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  const ytVideoId = ytMatch ? ytMatch[1] : null;

  const wikiMatch = fetchedUrl.match(/^https?:\/\/([a-z]{2,})\.wikipedia\.org\/wiki\/([^?#]+)/i);
  const wikiLang = wikiMatch ? wikiMatch[1] : null;
  const wikiTitle = wikiMatch ? decodeURIComponent(wikiMatch[2]) : null;

  // Run YouTube oEmbed and Wikipedia REST API in parallel
  const [ytOembed, wikiData] = await Promise.all([
    ytVideoId
      ? fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(fetchedUrl)}&format=json`,
          { signal: AbortSignal.timeout(5000) }).then(r => r.json()).catch(() => null)
      : Promise.resolve(null),
    wikiTitle
      ? fetch(`https://${wikiLang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`,
          { headers: { "User-Agent": "DoScroll/1.0" }, signal: AbortSignal.timeout(5000) })
          .then(r => r.json()).catch(() => null)
      : Promise.resolve(null),
  ]);

  const sentenceTrunc = (text, max) => {
    if (!text || text.length <= max) return text || "";
    const cut = text.slice(0, max);
    const lastEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
    return lastEnd > max * 0.5 ? text.slice(0, lastEnd + 1) : cut.trimEnd() + "…";
  };

  // validWiki requires both title and extract (guards against Wikipedia error responses)
  const validWiki = wikiData?.extract && wikiData?.title ? wikiData : null;
  const wikiSummary = validWiki ? sentenceTrunc(validWiki.extract, 400) : null;
  const wikiPageTitle = validWiki?.title || null;

  // Fallback: if Wikipedia URL but REST API gave no extract, use article name from URL
  const wikiArticleName = !validWiki && wikiTitle
    ? wikiTitle.replace(/_/g, " ").replace(/\(.*?\)/g, "").trim()
    : null;

  const isWikiPath = !!(validWiki || wikiArticleName);
  const ytContext = ytOembed ? `\nVideo title: "${ytOembed.title}" by ${ytOembed.author_name}` : "";

  // All three promises run in parallel from here
  const ogImagePromise = ytVideoId
    ? Promise.resolve(`https://img.youtube.com/vi/${ytVideoId}/hqdefault.jpg`)
    : validWiki?.thumbnail?.source
    ? Promise.resolve(validWiki.thumbnail.source)
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

  const microlinkPromise = ytVideoId || isWikiPath
    ? Promise.resolve(null)
    : fetch(
        `https://api.microlink.io?url=${encodeURIComponent(fetchedUrl)}&screenshot=true`,
        { signal: AbortSignal.timeout(8000) }
      ).then(r => r.json())
        .then(d => d?.data?.screenshot?.url || d?.data?.image?.url || null)
        .catch(() => null);

  const anthropicPromise = fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      ...(!isWikiPath ? { "anthropic-beta": "web-search-2025-03-05" } : {}),
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: isWikiPath ? 400 : 1000,
      ...(!isWikiPath ? { tools: [{ type: "web_search_20250305", name: "web_search" }] } : {}),
      messages: [{
        role: "user",
        content: validWiki
          ? `Given this Wikipedia article extract, pick the best category.\n\nTitle: ${validWiki.title}\nExtract: ${validWiki.extract.slice(0, 300)}\n\n${categoryInstruction}\n\nRespond with ONLY valid JSON: {"category": "..."}`
          : wikiArticleName
          ? `Generate metadata for a Wikipedia article about "${wikiArticleName}" for a content feed card.\n\n${note ? `User note: ${note}\n\n` : ""}Instructions:\n1. Use your knowledge of this topic to write a compelling, concise title (max 60 chars).\n2. Write a short summary of what this Wikipedia article covers (max 300 chars). Be specific.\n3. ${categoryInstruction}\n\nRespond with ONLY valid JSON, no markdown backticks:\n{"title": "...", "summary": "...", "category": "..."}`
          : `Analyze this URL and generate metadata for a content feed card.\n\nURL: ${fetchedUrl}${ytContext}\n${note ? `User note: ${note}\n` : ""}\nInstructions:\n1. Search the web for this URL to understand what the content is about.\n2. Generate a compelling, concise title (max 60 chars).\n3. Generate a short summary of what this content is about (max 300 chars). Be specific about what the reader/viewer/listener will get from this content.\n4. ${categoryInstruction}\n\nRespond with ONLY valid JSON, no markdown backticks, no preamble:\n{"title": "...", "summary": "...", "category": "..."}`,
      }],
    }),
  });

  try {
    const [apiRes, ogImage, mlImage] = await Promise.all([anthropicPromise, ogImagePromise, microlinkPromise]);
    const data = await apiRes.json();
    data.ogImage = ogImage || mlImage;
    data.ytFallback = ytOembed ? { title: ytOembed.title, author: ytOembed.author_name } : null;
    data.wikiTitle = wikiPageTitle;
    data.wikiSummary = wikiSummary;
    res.status(apiRes.status).json(data);
  } catch (err) {
    console.error("process-link error:", err);
    res.status(500).json({ error: "Failed to process link" });
  }
}
