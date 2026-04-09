import { useState, useEffect, useRef } from "react";

const DEFAULT_CATEGORIES = ["📚 Read", "🎬 Watch", "🎧 Listen", "🎮 Play", "📝 Learn", "🔧 Build", "🌐 Explore"];

const GRADIENT_PHOTOS = ["linear-gradient(135deg, #667eea 0%, #764ba2 100%)","linear-gradient(135deg, #f093fb 0%, #f5576c 100%)","linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)","linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)","linear-gradient(135deg, #fa709a 0%, #fee140 100%)","linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)","linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)","linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)","linear-gradient(135deg, #f5576c 0%, #ff9068 100%)","linear-gradient(160deg, #0093E9 0%, #80D0C7 100%)"];

// Real AI processing via Claude API
const processLink = async (url, note, userCategory, categoriesList) => {
  let domainKey = "";
  try {
    domainKey = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace("www.", "");
  } catch { domainKey = url.slice(0, 30); }

  const needsCategory = !userCategory;
  const categoryInstruction = needsCategory
    ? `Pick the single best category from this exact list: ${JSON.stringify(categoriesList)}. Return it exactly as written.`
    : `The user already chose the category "${userCategory}". Return that exact string as the category.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: `Analyze this URL and generate metadata for a content feed card.

URL: ${url}
${note ? `User note: ${note}` : ""}

Instructions:
1. Search the web for this URL to understand what the content is about.
2. Generate a compelling, concise title (max 60 chars).
3. Generate a short summary of what this content is about (max 300 chars). Be specific about what the reader/viewer/listener will get from this content.
4. ${categoryInstruction}

Respond with ONLY valid JSON, no markdown backticks, no preamble:
{"title": "...", "summary": "...", "category": "..."}` }],
      }),
    });

    const data = await response.json();

    // Extract text from response (may have multiple content blocks due to tool use)
    const textBlock = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
    const clean = textBlock.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      // Try to find JSON in the response
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : clean);
    } catch {
      // Fallback if JSON parsing fails
      parsed = {
        title: domainKey,
        summary: `Content from ${domainKey}. Add a note to remind yourself what this is about.`,
        category: userCategory || categoriesList[0] || "🌐 Explore",
      };
    }

    return {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      url,
      title: (parsed.title || domainKey).slice(0, 80),
      summary: (parsed.summary || "").slice(0, 300),
      photo: GRADIENT_PHOTOS[Math.floor(Math.random() * GRADIENT_PHOTOS.length)],
      category: parsed.category || userCategory || categoriesList[0] || "🌐 Explore",
      note: note || null,
      starred: false, hidden: false, hiddenUntil: null, archived: false,
      comments: [], createdAt: Date.now(), domain: domainKey,
    };
  } catch (err) {
    console.error("AI processing failed:", err);
    // Fallback: create post with basic info
    return {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      url,
      title: domainKey || url.slice(0, 60),
      summary: note || `Content from ${domainKey}. AI processing unavailable.`,
      photo: GRADIENT_PHOTOS[Math.floor(Math.random() * GRADIENT_PHOTOS.length)],
      category: userCategory || categoriesList[0] || "🌐 Explore",
      note: note || null,
      starred: false, hidden: false, hiddenUntil: null, archived: false,
      comments: [], createdAt: Date.now(), domain: domainKey,
    };
  }
};

const SAMPLE_POSTS = [
  { id: "s1", url: "https://arxiv.org/abs/2401.00001", title: "Attention Is All You Need — Revisited", summary: "A modern reexamination of the transformer architecture, exploring how recent modifications have pushed the boundaries of what's possible with self-attention mechanisms.", photo: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", category: "📝 Learn", note: "Revisit after finishing the Stanford CS224N lectures", starred: true, hidden: false, hiddenUntil: null, archived: false, comments: ["Key insight: sparse attention patterns reduce compute by 60%"], createdAt: Date.now() - 86400000 * 2, domain: "arxiv.org" },
  { id: "s2", url: "https://youtube.com/watch?v=example1", title: "The Art of Game Design — Full Documentary", summary: "Explores how legendary game designers craft experiences that keep players engaged for hundreds of hours, featuring interviews with creators of iconic titles.", photo: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", category: "🎬 Watch", note: null, starred: false, hidden: false, hiddenUntil: null, archived: false, comments: [], createdAt: Date.now() - 86400000, domain: "youtube.com" },
  { id: "s3", url: "https://github.com/example/cool-project", title: "Building a Local-First Sync Engine", summary: "A practical guide to implementing CRDTs for offline-capable applications, with a working reference implementation in Rust and TypeScript.", photo: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", category: "🔧 Build", note: "Try forking this for the side project", starred: true, hidden: false, hiddenUntil: null, archived: false, comments: ["Uses Automerge under the hood", "Check the /examples folder first"], createdAt: Date.now() - 86400000 * 3, domain: "github.com" },
  { id: "s4", url: "https://medium.com/example/digital-gardens", title: "Digital Gardens and the Future of Personal Knowledge", summary: "Why treating your notes like a garden — something you tend and grow over time — produces better thinking than traditional linear note-taking.", photo: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)", category: "📚 Read", note: null, starred: false, hidden: false, hiddenUntil: null, archived: false, comments: [], createdAt: Date.now() - 86400000 * 4, domain: "medium.com" },
  { id: "s5", url: "https://spotify.com/playlist/example", title: "Ambient Coding Playlist — 4 Hours Deep Focus", summary: "A carefully curated mix of ambient electronic, lo-fi, and minimal techno designed to maintain flow state during long coding sessions.", photo: "linear-gradient(160deg, #0093E9 0%, #80D0C7 100%)", category: "🎧 Listen", note: "Perfect for late night sessions", starred: false, hidden: false, hiddenUntil: null, archived: false, comments: [], createdAt: Date.now() - 86400000 * 5, domain: "spotify.com" },
  { id: "s6", url: "https://en.wikipedia.org/wiki/Fermi_paradox", title: "The Fermi Paradox — Where Is Everybody?", summary: "A comprehensive overview of the apparent contradiction between the lack of evidence for extraterrestrial civilizations and high probability estimates for their existence.", photo: "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)", category: "📝 Learn", note: "Good rabbit hole for a slow weekend", starred: false, hidden: false, hiddenUntil: null, archived: true, comments: ["Finished reading — the Great Filter section was the best part"], createdAt: Date.now() - 86400000 * 12, domain: "wikipedia.org" },
  { id: "s7", url: "https://youtube.com/watch?v=example2", title: "How To Think Like a Grandmaster", summary: "A chess grandmaster breaks down pattern recognition, intuition, and the mental models that separate amateurs from experts in any domain.", photo: "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)", category: "🎬 Watch", note: null, starred: false, hidden: false, hiddenUntil: null, archived: true, comments: ["Great video, shared with Alex"], createdAt: Date.now() - 86400000 * 20, domain: "youtube.com" },
];

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const timeAgo = (ts) => {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
};

// ─── Post Card ──────────────────────────────────────────────
function PostCard({ post, onStar, onHide, onRemove, onArchive, onRestore, onAddComment, isArchiveView }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [dismissed, setDismissed] = useState(null); // "left" | "right" | "done" | null
  const menuRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Swipe handlers
  const handleSwipeStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  };
  const handleSwipeMove = (e) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    // Lock into horizontal swipe if moved more horizontally than vertically
    if (!isSwiping.current && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      isSwiping.current = true;
    }
    if (isSwiping.current) {
      e.preventDefault();
      setSwipeX(dx);
    }
  };
  const handleSwipeEnd = () => {
    const threshold = 120;
    if (swipeX < -threshold) {
      // Swipe left → delete
      setDismissed("left");
      setTimeout(() => onRemove(post.id), 350);
    } else if (swipeX > threshold) {
      // Swipe right → hide for a week
      setDismissed("right");
      setTimeout(() => onHide(post.id), 350);
    } else {
      setSwipeX(0);
    }
    isSwiping.current = false;
  };

  // "Done" consumed animation
  const handleDone = () => {
    setDismissed("done");
    setTimeout(() => onArchive(post.id), 600);
  };

  // Compute visual state
  const swipeProgress = Math.min(Math.abs(swipeX) / 120, 1);
  const isSwipingLeft = swipeX < -10;
  const isSwipingRight = swipeX > 10;

  if (dismissed === "left" || dismissed === "right") {
    return (
      <div style={{
        overflow: "hidden",
        animation: "shrinkOut 0.35s ease forwards",
      }}>
        <div style={{
          transform: `translateX(${dismissed === "left" ? "-110%" : "110%"})`,
          transition: "transform 0.3s ease",
          borderRadius: "16px",
          overflow: "hidden",
        }}>
          {/* ghost placeholder, card is flying off */}
        </div>
      </div>
    );
  }

  if (dismissed === "done") {
    return (
      <div style={{
        overflow: "hidden",
        animation: "consumedShrink 0.6s ease forwards",
      }}>
        <div style={{
          background: "var(--card-bg)", borderRadius: "16px",
          border: "1px solid var(--border)",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "32px 20px",
          animation: "consumedPulse 0.6s ease forwards",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "linear-gradient(135deg, #10b981, #34d399)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "28px", color: "#fff",
            animation: "consumedCheck 0.4s ease 0.05s both",
            boxShadow: "0 4px 20px rgba(16,185,129,0.4)",
          }}>✓</div>
          <div style={{
            marginTop: "10px", fontSize: "14px", fontWeight: 600,
            color: "var(--text-secondary)",
            animation: "consumedCheck 0.3s ease 0.15s both",
          }}>Done! Archived.</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={cardRef} style={{ position: "relative", overflow: "visible" }}>
      {/* Swipe background indicators */}
      {swipeX !== 0 && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: "16px",
          background: isSwipingLeft
            ? `rgba(239, 68, 68, ${swipeProgress * 0.9})`
            : `rgba(99, 102, 241, ${swipeProgress * 0.9})`,
          display: "flex", alignItems: "center",
          justifyContent: isSwipingLeft ? "flex-end" : "flex-start",
          padding: "0 24px",
          transition: "background 0.1s ease",
        }}>
          <div style={{
            color: "#fff", fontWeight: 700, fontSize: "14px",
            opacity: swipeProgress,
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            {isSwipingLeft ? (
              <><span style={{ fontSize: "20px" }}>🗑</span> Delete</>
            ) : (
              <><span style={{ fontSize: "20px" }}>🕐</span> Hide 1 week</>
            )}
          </div>
        </div>
      )}

      {/* Card */}
      <div
        onTouchStart={handleSwipeStart}
        onTouchMove={handleSwipeMove}
        onTouchEnd={handleSwipeEnd}
        style={{
          background: "var(--card-bg)", borderRadius: "16px", overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)",
          transition: swipeX === 0 ? "transform 0.25s ease, box-shadow 0.2s ease" : "box-shadow 0.2s ease",
          border: "1px solid var(--border)",
          opacity: isArchiveView ? 0.85 : 1,
          transform: `translateX(${swipeX}px) rotate(${swipeX * 0.02}deg)`,
          position: "relative", zIndex: 1,
          cursor: "grab",
        }}
        onMouseEnter={e => { if (swipeX === 0) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12), 0 12px 32px rgba(0,0,0,0.08)"; }}}
        onMouseLeave={e => { if (swipeX === 0) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)"; }}}
      >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "14px 16px 10px", gap: "10px" }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%", background: post.photo,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "14px", fontWeight: 700, color: "#fff",
          textShadow: "0 1px 2px rgba(0,0,0,0.3)", flexShrink: 0,
        }}>{post.category.split(" ")[0]}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>{post.domain}</div>
          <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "1px" }}>
            {timeAgo(post.createdAt)} · {post.category}
            {isArchiveView && <span style={{ color: "var(--accent)", marginLeft: 6, fontWeight: 600 }}>Archived</span>}
          </div>
        </div>
        <div ref={menuRef} style={{ position: "relative" }}>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            background: "none", border: "none", cursor: "pointer", padding: "6px",
            fontSize: "18px", color: "var(--text-tertiary)", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32,
          }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--hover-bg)"}
          onMouseLeave={e => e.currentTarget.style.background = "none"}
          >⋯</button>
          {menuOpen && (
            <div style={{
              position: "absolute", right: 0, top: "100%", background: "var(--card-bg)",
              borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              border: "1px solid var(--border)", zIndex: 100, overflow: "hidden", minWidth: 200,
            }}>
              {isArchiveView ? (
                <>
                  <button onClick={async () => {
                    try { await navigator.share({ title: post.title, text: post.summary, url: post.url }); } catch {}
                    setMenuOpen(false);
                  }} style={menuItemStyle}>
                    🔗 Share link
                  </button>
                  <button onClick={() => { onRestore(post.id); setMenuOpen(false); }} style={menuItemStyle}>
                    ↩ Restore to feed
                  </button>
                  <button onClick={() => { onRemove(post.id); setMenuOpen(false); }} style={{ ...menuItemStyle, color: "#ef4444" }}>
                    🗑 Delete permanently
                  </button>
                </>
              ) : (
                <>
                  <button onClick={async () => {
                    try { await navigator.share({ title: post.title, text: post.summary, url: post.url }); } catch {}
                    setMenuOpen(false);
                  }} style={menuItemStyle}>
                    🔗 Share link
                  </button>
                  <button onClick={() => { handleDone(); setMenuOpen(false); }} style={menuItemStyle}>
                    📦 Archive (mark done)
                  </button>
                  <button onClick={() => { onHide(post.id); setMenuOpen(false); }} style={menuItemStyle}>
                    🕐 Hide for a week
                  </button>
                  <button onClick={() => { onRemove(post.id); setMenuOpen(false); }} style={{ ...menuItemStyle, color: "#ef4444" }}>
                    🗑 Remove post
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Photo */}
      <div style={{
        height: 200, background: post.photo,
        display: "flex", alignItems: "flex-end", padding: "16px",
        cursor: "pointer", position: "relative",
      }}
      onClick={() => window.open(post.url.startsWith("http") ? post.url : `https://${post.url}`, "_blank")}
      >
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 40%, rgba(0,0,0,0.5))" }} />
        <span style={{
          position: "relative", color: "#fff", fontSize: "11px", fontWeight: 600,
          background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)",
          padding: "4px 10px", borderRadius: "20px", letterSpacing: "0.3px",
        }}>Open Link ↗</span>
      </div>

      {/* Content */}
      <div style={{ padding: "14px 16px 4px" }}>
        <h3 style={{
          fontSize: "16px", fontWeight: 700, lineHeight: 1.35,
          color: "var(--text-primary)", margin: "0 0 6px", fontFamily: "'DM Sans', sans-serif",
        }}>{post.title}</h3>
        <p style={{ fontSize: "14px", lineHeight: 1.55, color: "var(--text-secondary)", margin: 0 }}>{post.summary}</p>
        {post.note && (
          <div style={{
            marginTop: "10px", padding: "10px 12px", background: "var(--note-bg)",
            borderRadius: "10px", fontSize: "13px", color: "var(--text-secondary)",
            borderLeft: "3px solid var(--accent)", lineHeight: 1.5,
          }}>📌 {post.note}</div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", padding: "8px 12px 12px", gap: "4px" }}>
        <button onClick={() => onStar(post.id)} style={{
          ...actionBtnStyle,
          color: post.starred ? "#f59e0b" : "var(--text-tertiary)",
          fontWeight: post.starred ? 700 : 400,
        }}>
          {post.starred ? "★" : "☆"} {post.starred ? "Starred" : "Star"}
        </button>
        <button onClick={() => setShowComments(!showComments)}
          style={{ ...actionBtnStyle, color: "var(--text-tertiary)" }}>
          💬 Notes {post.comments.length > 0 && `(${post.comments.length})`}
        </button>
        {!isArchiveView && (
          <button onClick={handleDone}
            style={{ ...actionBtnStyle, color: "var(--text-tertiary)", marginLeft: "auto" }}>
            ✓ Done
          </button>
        )}
        {isArchiveView && (
          <button onClick={() => onRestore(post.id)}
            style={{ ...actionBtnStyle, color: "var(--accent)", marginLeft: "auto" }}>
            ↩ Restore
          </button>
        )}
      </div>

      {/* Comments / Notes */}
      {showComments && (
        <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--border)" }}>
          {post.comments.map((c, i) => (
            <div key={i} style={{
              padding: "8px 0", fontSize: "13px", color: "var(--text-secondary)",
              borderBottom: i < post.comments.length - 1 ? "1px solid var(--border)" : "none", lineHeight: 1.5,
            }}>{c}</div>
          ))}
          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
            <input value={commentText} onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && commentText.trim()) { onAddComment(post.id, commentText.trim()); setCommentText(""); } }}
              placeholder="Add a note..." style={inputBaseStyle} />
            <button onClick={() => { if (commentText.trim()) { onAddComment(post.id, commentText.trim()); setCommentText(""); } }}
              style={{ ...pillBtnStyle, opacity: commentText.trim() ? 1 : 0.4, pointerEvents: commentText.trim() ? "auto" : "none" }}>Post</button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// ─── Search Overlay ─────────────────────────────────────────
function SearchOverlay({ posts, onClose, onStar, onHide, onRemove, onArchive, onRestore, onAddComment }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const q = query.toLowerCase().trim();
  const results = q.length < 2 ? [] : posts.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.summary.toLowerCase().includes(q) ||
    p.domain.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    (p.note && p.note.toLowerCase().includes(q)) ||
    p.url.toLowerCase().includes(q) ||
    p.comments.some(c => c.toLowerCase().includes(q))
  );

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 200,
      background: "var(--bg)", display: "flex", flexDirection: "column",
    }}>
      <div style={{
        padding: "12px 12px 12px 16px", background: "var(--card-bg)",
        borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "10px",
        flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: "20px", color: "var(--text-tertiary)", padding: "4px",
          display: "flex", alignItems: "center",
        }}>←</button>
        <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search titles, notes, domains..."
          style={{
            flex: 1, padding: "10px 14px", borderRadius: "12px",
            border: "1px solid var(--border)", background: "var(--input-bg)",
            fontSize: "15px", color: "var(--text-primary)", outline: "none", fontFamily: "inherit",
          }} />
        {query && (
          <button onClick={() => setQuery("")} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: "16px", color: "var(--text-tertiary)", padding: "4px",
          }}>✕</button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 20px" }}>
        {q.length < 2 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-tertiary)", fontSize: "14px" }}>
            <div style={{ fontSize: "32px", marginBottom: "10px" }}>🔍</div>
            Type at least 2 characters to search
          </div>
        ) : results.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-tertiary)", fontSize: "14px" }}>
            <div style={{ fontSize: "32px", marginBottom: "10px" }}>🤷</div>
            No results for "{query}"
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 600, padding: "0 4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {results.length} result{results.length !== 1 ? "s" : ""}
            </div>
            {results.map(post => (
              <PostCard key={post.id} post={post} isArchiveView={post.archived}
                onStar={onStar} onHide={onHide} onRemove={onRemove}
                onArchive={onArchive} onRestore={onRestore} onAddComment={onAddComment} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────
export default function DoScrollApp() {
  const [tab, setTab] = useState("feed");
  const [posts, setPosts] = useState([]);
  const [linkInput, setLinkInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [filterCat, setFilterCat] = useState(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loaded, setLoaded] = useState(false);
  const feedRef = useRef(null);
  const touchStartY = useRef(0);

  // Load persisted data on mount
  useEffect(() => {
    const load = async () => {
      try {
        const stored = await window.storage.get("doscroll-data");
        if (stored && stored.value) {
          const data = JSON.parse(stored.value);
          if (data.posts && data.posts.length > 0) setPosts(shuffleArray(data.posts));
          else setPosts(shuffleArray(SAMPLE_POSTS));
          if (data.categories) setCategories(data.categories);
        } else {
          setPosts(shuffleArray(SAMPLE_POSTS));
        }
      } catch {
        setPosts(shuffleArray(SAMPLE_POSTS));
      }
      setLoaded(true);
    };
    load();
  }, []);

  // Save to storage whenever posts or categories change
  useEffect(() => {
    if (!loaded) return;
    const save = async () => {
      try {
        await window.storage.set("doscroll-data", JSON.stringify({ posts, categories }));
      } catch (err) { console.error("Save failed:", err); }
    };
    save();
  }, [posts, categories, loaded]);

  const isPulling = useRef(false);

  const handleTouchStart = (e) => {
    const atTop = feedRef.current && feedRef.current.scrollTop <= 1;
    if (atTop) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = false;
    }
  };
  const handleTouchMoveRef = useRef(null);
  handleTouchMoveRef.current = (e) => {
    const atTop = feedRef.current && feedRef.current.scrollTop <= 1;
    if (!atTop && !isPulling.current) return;
    const d = e.touches[0].clientY - touchStartY.current;
    if (d > 5) {
      isPulling.current = true;
      e.preventDefault();
      setPullDistance(Math.min(d * 0.4, 80));
    }
  };
  const [refreshing, setRefreshing] = useState(false);

  const handleTouchEnd = () => {
    if (isPulling.current && pullDistance > 50) {
      setRefreshing(true);
      setPullDistance(60); // hold at a nice position
      setTimeout(() => {
        setPosts(prev => shuffleArray(prev));
        setRefreshing(false);
        setPullDistance(0);
      }, 500);
    } else {
      setPullDistance(0);
    }
    isPulling.current = false;
  };

  // Attach non-passive touchmove to allow preventDefault on mobile
  useEffect(() => {
    if (tab !== "feed") return;
    // Small delay to ensure ref is attached after render
    const timer = setTimeout(() => {
      const el = feedRef.current;
      if (!el) return;
      const handler = (e) => handleTouchMoveRef.current?.(e);
      el.addEventListener("touchmove", handler, { passive: false });
      // Store for cleanup
      el._pullHandler = handler;
    }, 50);
    return () => {
      clearTimeout(timer);
      const el = feedRef.current;
      if (el && el._pullHandler) {
        el.removeEventListener("touchmove", el._pullHandler);
        delete el._pullHandler;
      }
    };
  }, [tab, loaded]);

  const handleSubmit = async () => {
    if (!linkInput.trim()) return;
    setProcessing(true);
    try {
      const newPost = await processLink(linkInput.trim(), noteInput.trim(), categoryInput || null, categories);
      setPosts(prev => [newPost, ...prev]);
      setLinkInput(""); setNoteInput(""); setCategoryInput("");
      setTab("feed");
    } catch (err) { console.error(err); }
    setProcessing(false);
  };

  const toggleStar = (id) => setPosts(prev => prev.map(p => p.id === id ? { ...p, starred: !p.starred } : p));
  const hidePost = (id) => setPosts(prev => prev.map(p => p.id === id ? { ...p, hidden: true, hiddenUntil: Date.now() + 7 * 86400000 } : p));
  const removePost = (id) => setPosts(prev => prev.filter(p => p.id !== id));
  const archivePost = (id) => setPosts(prev => prev.map(p => p.id === id ? { ...p, archived: true } : p));
  const restorePost = (id) => setPosts(prev => prev.map(p => p.id === id ? { ...p, archived: false } : p));
  const addComment = (id, text) => setPosts(prev => prev.map(p => p.id === id ? { ...p, comments: [...p.comments, text] } : p));

  const renameCategory = (index, newName) => {
    setCategories(prev => {
      const updated = [...prev];
      const oldName = updated[index];
      updated[index] = newName;
      // Update all posts that had the old category
      setPosts(pp => pp.map(p => p.category === oldName ? { ...p, category: newName } : p));
      // Update active filter if it matched
      if (filterCat === oldName) setFilterCat(newName);
      return updated;
    });
  };

  const feedPosts = posts
    .filter(p => !p.archived)
    .filter(p => !p.hidden || (p.hiddenUntil && Date.now() > p.hiddenUntil))
    .filter(p => !filterCat || p.category === filterCat)
    .sort((a, b) => {
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;
      return 0;
    });

  const archivedPosts = posts
    .filter(p => p.archived)
    .filter(p => !filterCat || p.category === filterCat)
    .sort((a, b) => b.createdAt - a.createdAt);

  const displayPosts = tab === "archive" ? archivedPosts : feedPosts;

  // Merge settings categories with any categories found on posts (handles AI-assigned or custom ones)
  const allCategories = [...new Set([...categories, ...posts.map(p => p.category)])].filter(Boolean);

  if (!loaded) {
    return (
      <div style={{
        width: "100%", maxWidth: 480, margin: "0 auto", height: "100vh",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "#f0f2f5", fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        <div style={{ fontSize: "28px", fontWeight: 700, marginBottom: "12px", color: "#1a1a2e" }}>
          do<span style={{ color: "#6366f1" }}>Scroll</span>
        </div>
        <div style={{ fontSize: "13px", color: "#8e8ea0" }}>Loading your feed...</div>
      </div>
    );
  }

  return (
    <div style={{
      width: "100%", maxWidth: 480, margin: "0 auto", height: "100vh",
      display: "flex", flexDirection: "column", background: "var(--bg)",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap');
        :root {
          --bg: #f0f2f5; --card-bg: #ffffff; --text-primary: #1a1a2e;
          --text-secondary: #4a4a68; --text-tertiary: #8e8ea0; --border: #e4e4e8;
          --accent: #6366f1; --accent-light: #eef2ff; --hover-bg: rgba(0,0,0,0.04);
          --note-bg: #fef9ef; --input-bg: #f5f5f7; --tab-active: #6366f1;
          --tab-inactive: #8e8ea0; --success: #10b981;
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --bg: #0f0f14; --card-bg: #1a1a24; --text-primary: #e8e8ed;
            --text-secondary: #a0a0b4; --text-tertiary: #5a5a6e; --border: #2a2a38;
            --accent: #818cf8; --accent-light: #1e1e3a; --hover-bg: rgba(255,255,255,0.06);
            --note-bg: #1e1d16; --input-bg: #12121a; --tab-active: #818cf8;
            --tab-inactive: #5a5a6e;
          }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); }
        input::placeholder, textarea::placeholder { color: var(--text-tertiary); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shrinkOut {
          0% { max-height: 500px; opacity: 1; margin-bottom: 0; }
          100% { max-height: 0; opacity: 0; margin-bottom: -12px; overflow: hidden; }
        }
        @keyframes consumedPulse {
          0% { transform: scale(1); opacity: 1; }
          30% { transform: scale(1.03); }
          100% { transform: scale(0.95); opacity: 0.6; }
        }
        @keyframes consumedShrink {
          0% { max-height: 500px; opacity: 1; }
          50% { max-height: 150px; opacity: 1; }
          100% { max-height: 0; opacity: 0; margin-bottom: -12px; overflow: hidden; }
        }
        @keyframes consumedCheck {
          0% { transform: scale(0) rotate(-45deg); opacity: 0; }
          60% { transform: scale(1.2) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: "16px 20px 12px", background: "var(--card-bg)",
        borderBottom: "1px solid var(--border)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{
            fontSize: "24px", fontFamily: "'Playfair Display', serif",
            fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.5px",
          }}>
            do<span style={{ color: "var(--accent)" }}>Scroll</span>
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 500 }}>
              {displayPosts.length} items
            </span>
            <button onClick={() => setSearchOpen(true)} style={{
              background: "var(--input-bg)", border: "1px solid var(--border)",
              borderRadius: "10px", padding: "7px 12px", cursor: "pointer",
              fontSize: "13px", color: "var(--text-tertiary)", display: "flex",
              alignItems: "center", gap: "5px", fontFamily: "inherit",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
            >
              🔍 Search
            </button>
          </div>
        </div>

        {(tab === "feed" || tab === "archive") && (
          <div style={{
            display: "flex", gap: "6px", marginTop: "12px",
            overflowX: "auto", paddingBottom: "4px", scrollbarWidth: "none",
          }}>
            <button onClick={() => setFilterCat(null)}
              style={{ ...chipStyle, background: !filterCat ? "var(--accent)" : "var(--input-bg)", color: !filterCat ? "#fff" : "var(--text-secondary)" }}>
              All
            </button>
            {allCategories.map(c => (
              <button key={c} onClick={() => setFilterCat(filterCat === c ? null : c)}
                style={{ ...chipStyle, background: filterCat === c ? "var(--accent)" : "var(--input-bg)", color: filterCat === c ? "#fff" : "var(--text-secondary)" }}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Feed / Archive content */}
      {(tab === "feed" || tab === "archive") ? (
        <div
          ref={feedRef}
          onTouchStart={tab === "feed" ? handleTouchStart : undefined}
          onTouchEnd={tab === "feed" ? handleTouchEnd : undefined}
          style={{
            flex: 1, overflowY: "auto",
            display: "flex", flexDirection: "column",
            overscrollBehavior: "none", WebkitOverflowScrolling: "touch",
            position: "relative",
          }}
        >
          {/* Pull-to-refresh indicator */}
          {tab === "feed" && (
            <div style={{
              height: pullDistance > 0 ? pullDistance + "px" : "0px",
              transition: isPulling.current ? "none" : "height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", flexShrink: 0,
            }}>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                opacity: Math.min(pullDistance / 40, 1),
                transition: isPulling.current ? "none" : "opacity 0.3s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                transform: refreshing
                  ? "scale(1)"
                  : `scale(${0.5 + Math.min(pullDistance / 100, 0.5)}) rotate(${pullDistance * 3}deg)`,
              }}>
                <span style={{
                  fontSize: "22px",
                  animation: refreshing ? "spin 0.5s linear infinite" : "none",
                }}>↻</span>
                <span style={{
                  fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)",
                  letterSpacing: "0.3px",
                }}>
                  {refreshing ? "Shuffling..." : pullDistance > 50 ? "Release!" : "Pull to shuffle"}
                </span>
              </div>
            </div>
          )}

          <div style={{
            padding: "12px 12px 80px",
            display: "flex", flexDirection: "column", gap: "12px",
          }}>

          {tab === "archive" && archivedPosts.length > 0 && (
            <div style={{
              padding: "8px 6px 4px", fontSize: "13px", color: "var(--text-tertiary)",
              display: "flex", alignItems: "center", gap: "6px",
            }}>
              <span style={{ fontSize: "16px" }}>📦</span>
              Consumed & completed — {archivedPosts.length} item{archivedPosts.length !== 1 ? "s" : ""}
            </div>
          )}

          {displayPosts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-tertiary)", fontSize: "14px" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>{tab === "archive" ? "📦" : "📭"}</div>
              {tab === "archive" ? "No archived items yet. Mark things as done!" : "Nothing here yet. Add something to your feed!"}
            </div>
          ) : (
            displayPosts.map((post, i) => (
              <div key={post.id} style={{ animation: `fadeIn 0.3s ease ${i * 0.04}s both` }}>
                <PostCard
                  post={post}
                  isArchiveView={tab === "archive"}
                  onStar={toggleStar} onHide={hidePost} onRemove={removePost}
                  onArchive={archivePost} onRestore={restorePost} onAddComment={addComment}
                />
              </div>
            ))
          )}
          </div>
        </div>
      ) : tab === "add" ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 100px" }}>
          <div style={{
            background: "var(--card-bg)", borderRadius: "16px",
            padding: "24px 20px", border: "1px solid var(--border)",
          }}>
            <h2 style={{
              fontSize: "18px", fontWeight: 700, color: "var(--text-primary)",
              marginBottom: "20px", fontFamily: "'DM Sans', sans-serif",
            }}>Add to Feed</h2>

            <label style={labelStyle}>Link *</label>
            <input value={linkInput} onChange={e => setLinkInput(e.target.value)}
              placeholder="https://..." style={{ ...formInputStyle, marginBottom: "16px" }} />

            <label style={labelStyle}>Note</label>
            <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)}
              placeholder="Why does this interest you?" rows={3}
              style={{ ...formInputStyle, marginBottom: "16px", resize: "vertical", lineHeight: 1.6 }} />

            <label style={labelStyle}>Category</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "24px" }}>
              {categories.map(c => (
                <button key={c} onClick={() => setCategoryInput(categoryInput === c ? "" : c)}
                  style={{
                    ...chipStyle, padding: "8px 14px", fontSize: "13px",
                    background: categoryInput === c ? "var(--accent)" : "var(--input-bg)",
                    color: categoryInput === c ? "#fff" : "var(--text-secondary)",
                  }}>{c}</button>
              ))}
            </div>

            <button onClick={handleSubmit} disabled={!linkInput.trim() || processing}
              style={{
                width: "100%", padding: "14px", borderRadius: "12px", border: "none",
                background: linkInput.trim() ? "var(--accent)" : "var(--input-bg)",
                color: linkInput.trim() ? "#fff" : "var(--text-tertiary)",
                fontSize: "15px", fontWeight: 600,
                cursor: linkInput.trim() ? "pointer" : "not-allowed",
                transition: "all 0.2s ease", fontFamily: "'DM Sans', sans-serif",
              }}>
              {processing ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <span style={{
                    width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff", borderRadius: "50%",
                    animation: "spin 0.6s linear infinite", display: "inline-block",
                  }} />
                  AI Processing...
                </span>
              ) : "Add to Feed →"}
            </button>

            {processing && (
              <div style={{
                marginTop: "16px", padding: "14px", background: "var(--accent-light)",
                borderRadius: "12px", fontSize: "12px", color: "var(--accent)", lineHeight: 1.6,
              }}>
                <div style={{ fontWeight: 600, marginBottom: "4px" }}>🤖 AI is analyzing your link...</div>
                Searching the web · Reading content · {categoryInput ? "Generating title & summary" : "Generating title, summary & category"}
              </div>
            )}
          </div>
        </div>
      ) : tab === "settings" ? (
        /* Settings tab */
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 100px" }}>
          <div style={{
            background: "var(--card-bg)", borderRadius: "16px",
            padding: "24px 20px", border: "1px solid var(--border)",
          }}>
            <h2 style={{
              fontSize: "18px", fontWeight: 700, color: "var(--text-primary)",
              marginBottom: "6px", fontFamily: "'DM Sans', sans-serif",
            }}>Categories</h2>
            <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "20px", lineHeight: 1.5 }}>
              Rename categories below. Changes apply to all existing posts in that category.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {categories.map((cat, i) => {
                const emoji = cat.split(" ")[0];
                const label = cat.split(" ").slice(1).join(" ");
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                      value={emoji}
                      onChange={e => {
                        const val = e.target.value;
                        const newEmoji = [...val].slice(-1).join("") || emoji;
                        renameCategory(i, `${newEmoji} ${label}`);
                      }}
                      style={{
                        width: 36, height: 36, borderRadius: "10px",
                        background: "var(--input-bg)", display: "flex",
                        textAlign: "center", fontSize: "16px",
                        flexShrink: 0, border: "1px solid var(--border)",
                        padding: 0, outline: "none", fontFamily: "inherit",
                        color: "var(--text-primary)", cursor: "pointer",
                      }}
                    />
                    <input
                      value={label}
                      onChange={e => renameCategory(i, `${emoji} ${e.target.value}`)}
                      style={{
                        ...formInputStyle,
                        padding: "10px 12px",
                        fontSize: "14px",
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <button onClick={() => setCategories(DEFAULT_CATEGORIES)}
              style={{
                marginTop: "20px", padding: "10px 16px", borderRadius: "10px",
                border: "1px solid var(--border)", background: "none",
                color: "var(--text-tertiary)", fontSize: "13px", fontWeight: 500,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
            >
              Reset to defaults
            </button>

            <div style={{ marginTop: "32px", paddingTop: "20px", borderTop: "1px solid var(--border)" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                Export
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "12px", lineHeight: 1.5 }}>
                Download all your links as a CSV spreadsheet, organized by status.
              </p>
              <button onClick={() => {
                const current = posts.filter(p => !p.archived);
                const archived = posts.filter(p => p.archived);
                const escCSV = (s) => {
                  if (!s) return "";
                  const str = String(s).replace(/"/g, '""');
                  return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
                };
                const header = "Status,Title,URL,Category,Summary,Note,Starred,Comments,Date Added";
                const toRow = (p, status) => [
                  status,
                  escCSV(p.title),
                  escCSV(p.url),
                  escCSV(p.category),
                  escCSV(p.summary),
                  escCSV(p.note || ""),
                  p.starred ? "Yes" : "No",
                  escCSV((p.comments || []).join(" | ")),
                  new Date(p.createdAt).toLocaleDateString(),
                ].join(",");
                const rows = [
                  header,
                  ...current.map(p => toRow(p, "Current")),
                  ...archived.map(p => toRow(p, "Archived")),
                ].join("\n");
                const blob = new Blob(["\uFEFF" + rows], { type: "text/csv;charset=utf-8;" });
                const reader = new FileReader();
                reader.onload = () => {
                  const link = document.createElement("a");
                  link.href = reader.result;
                  link.download = `doscroll-export-${new Date().toISOString().split("T")[0]}.csv`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                };
                reader.readAsDataURL(blob);
              }}
                style={{
                  padding: "10px 16px", borderRadius: "10px",
                  border: "1px solid var(--border)", background: "none",
                  color: "var(--text-secondary)", fontSize: "13px", fontWeight: 500,
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease",
                  display: "flex", alignItems: "center", gap: "6px",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                📥 Export as CSV ({posts.filter(p => !p.archived).length} current, {posts.filter(p => p.archived).length} archived)
              </button>
            </div>

            <div style={{ marginTop: "32px", paddingTop: "20px", borderTop: "1px solid var(--border)" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                Data
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "12px", lineHeight: 1.5 }}>
                Your feed is saved automatically and persists between sessions.
              </p>
              <button onClick={async () => {
                if (confirm("This will delete all posts and reset everything. Are you sure?")) {
                  try { await window.storage.delete("doscroll-data"); } catch {}
                  setPosts(shuffleArray(SAMPLE_POSTS));
                  setCategories(DEFAULT_CATEGORIES);
                }
              }}
                style={{
                  padding: "10px 16px", borderRadius: "10px",
                  border: "1px solid rgba(239,68,68,0.3)", background: "none",
                  color: "#ef4444", fontSize: "13px", fontWeight: 500,
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
              >
                Clear all data & reset
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab Bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "var(--card-bg)", borderTop: "1px solid var(--border)",
        display: "flex", padding: "8px 0 env(safe-area-inset-bottom, 8px)", zIndex: 50,
      }}>
        {[
          { key: "feed", icon: "⚡", label: "Feed" },
          { key: "add", icon: "＋", label: "Add" },
          { key: "archive", icon: "📦", label: "Archive" },
          { key: "settings", icon: "⚙", label: "Settings" },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setFilterCat(null); }}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", gap: "2px", padding: "8px 0",
              background: "none", border: "none", cursor: "pointer",
              color: tab === t.key ? "var(--tab-active)" : "var(--tab-inactive)",
              transition: "color 0.15s ease",
            }}>
            <span style={{ fontSize: "20px", lineHeight: 1 }}>{t.icon}</span>
            <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.3px" }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Search Overlay */}
      {searchOpen && (
        <SearchOverlay
          posts={posts}
          onClose={() => setSearchOpen(false)}
          onStar={toggleStar} onHide={hidePost} onRemove={removePost}
          onArchive={archivePost} onRestore={restorePost} onAddComment={addComment}
        />
      )}
    </div>
  );
}

// ─── Shared Styles ──────────────────────────────────────────
const menuItemStyle = {
  display: "block", width: "100%", padding: "12px 16px",
  background: "none", border: "none", cursor: "pointer",
  fontSize: "14px", textAlign: "left", color: "var(--text-primary)",
  fontFamily: "inherit", transition: "background 0.1s",
};
const actionBtnStyle = {
  background: "none", border: "none", cursor: "pointer",
  padding: "8px 12px", borderRadius: "8px", fontSize: "13px",
  fontFamily: "inherit", transition: "background 0.1s",
  display: "flex", alignItems: "center", gap: "4px",
};
const inputBaseStyle = {
  flex: 1, padding: "8px 12px", borderRadius: "20px",
  border: "1px solid var(--border)", background: "var(--input-bg)",
  fontSize: "13px", color: "var(--text-primary)", outline: "none", fontFamily: "inherit",
};
const pillBtnStyle = {
  padding: "8px 16px", borderRadius: "20px", border: "none",
  background: "var(--accent)", color: "#fff", fontSize: "13px",
  fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "opacity 0.15s",
};
const chipStyle = {
  padding: "6px 12px", borderRadius: "20px", border: "none",
  fontSize: "12px", fontWeight: 500, cursor: "pointer",
  whiteSpace: "nowrap", transition: "all 0.15s ease", fontFamily: "inherit",
};
const labelStyle = {
  display: "block", fontSize: "12px", fontWeight: 600,
  color: "var(--text-tertiary)", marginBottom: "6px",
  textTransform: "uppercase", letterSpacing: "0.5px",
};
const formInputStyle = {
  width: "100%", padding: "12px 14px", borderRadius: "12px",
  border: "1px solid var(--border)", background: "var(--input-bg)",
  fontSize: "14px", color: "var(--text-primary)", outline: "none", fontFamily: "inherit",
};
