// import { useEffect, useState } from "react";

// function App() {
//   const [data, setData] = useState([]);

//   useEffect(() => {
//     fetch("http://127.0.0.1:8000/digest")
//       .then((res) => res.json())
//       .then((data) => setData(data))
//       .catch((err) => console.error("Error fetching:", err));
//   }, []);

//   return (
//     <div style={styles.container}>
//       <h1 style={styles.title}>📰 Multi-Source News Digest</h1>

//       {data.map((topic, index) => (
//         <div key={index} style={styles.topicSection}>
//           <h2 style={styles.topicTitle}>
//             {topic.topic === "Politics" && "🏛️ "}
//             {topic.topic === "Business" && "💰 "}
//             {topic.topic === "AI" && "🤖 "}
//             {topic.topic === "Sports" && "🏏 "}
//             {topic.topic}
//           </h2>

//           {topic.articles.map((article, i) => (
//             <div key={i} style={styles.card}>
//               <h3>{article.title}</h3>
//               <p>{article.summary}</p>
//               <small>Source: {article.source}</small>
//             </div>
//           ))}
//         </div>
//       ))}
//     </div>
//   );
// }

// const styles = {
//   container: {
//     padding: "20px",
//     fontFamily: "Arial, sans-serif",
//     backgroundColor: "#f4f6f8",
//     minHeight: "100vh",
//   },
//   title: {
//     textAlign: "center",
//     color: "#2c3e50",
//   },
//   topicSection: {
//     marginTop: "20px",
//   },
//   topicTitle: {
//     color: "#34495e",
//     borderBottom: "2px solid #ccc",
//     paddingBottom: "5px",
//   },
//   card: {
//     backgroundColor: "#fff",
//     padding: "15px",
//     marginTop: "10px",
//     borderRadius: "10px",
//     boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
//   },
// };

// export default App;

import { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";
const API_KEY = "newsdigest-demo-key-123";

const headers = { "X-API-Key": API_KEY };

const TOPIC_ICONS = {
  "Politics":  "🏛️",
  "AI & Tech": "🤖",
  "Sports":    "🏆",
  "Business":  "📈",
  "Health":    "🩺",
  "Climate":   "🌍",
  "General":   "📰",
};

const SENTIMENT_CONFIG = {
  positive: { label: "Positive", color: "#16a34a", bg: "#dcfce7", icon: "▲" },
  negative: { label: "Negative", color: "#dc2626", bg: "#fee2e2", icon: "▼" },
  neutral:  { label: "Neutral",  color: "#6b7280", bg: "#f3f4f6", icon: "●" },
};

const SOURCE_COLORS = {
  BBC: { bg: "#b91c1c", text: "#fff" },
  CNN: { bg: "#c2410c", text: "#fff" },
};

export default function App() {
  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activeTopic, setActive]  = useState("All");
  const [activeSent, setActiveSent] = useState("All");
  const [search, setSearch]       = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchDigest = () => {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/digest`, { headers })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setData(d.clusters); setLastUpdated(new Date()); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { fetchDigest(); }, []);

  const allTopics  = ["All", ...data.map(t => t.topic)];
  const allSents   = ["All", "positive", "neutral", "negative"];

  const filtered = data
    .filter(cluster => activeTopic === "All" || cluster.topic === activeTopic)
    .map(cluster => ({
      ...cluster,
      articles: cluster.articles.filter(a => {
        const sentOk = activeSent === "All" || a.sentiment === activeSent;
        const q      = search.toLowerCase();
        const textOk = !q || a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q);
        return sentOk && textOk;
      }),
    }))
    .filter(c => c.articles.length > 0);

  const totalArticles = data.reduce((s, c) => s + c.articles.length, 0);

  return (
    <div style={s.page}>
      {/* ── Header ── */}
      <header style={s.header}>
        <div style={s.headerInner}>
          <div>
            <h1 style={s.logo}>📰 NewsDigest</h1>
            <p style={s.tagline}>Live · AI-Summarised · Multi-Source</p>
          </div>
          <div style={s.headerMeta}>
            {lastUpdated && (
              <span style={s.updated}>
                Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button style={s.refreshBtn} onClick={fetchDigest}>
              ⟳ Refresh
            </button>
          </div>
        </div>
      </header>

      {/* ── Stats bar ── */}
      <div style={s.statsBar}>
        <Stat label="Topics"   value={data.length} />
        <Stat label="Articles" value={totalArticles} />
        <Stat label="Sources"  value="BBC + CNN" />
      </div>

      {/* ── Controls ── */}
      <div style={s.controls}>
        <input
          style={s.searchInput}
          type="text"
          placeholder="🔍  Search headlines or summaries…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div style={s.filterRow}>
          {allTopics.map(t => (
            <button
              key={t}
              style={{ ...s.pill, ...(activeTopic === t ? s.pillActive : {}) }}
              onClick={() => setActive(t)}
            >
              {TOPIC_ICONS[t] ?? ""} {t}
            </button>
          ))}
        </div>

        <div style={s.filterRow}>
          {allSents.map(s2 => {
            const cfg = SENTIMENT_CONFIG[s2];
            const active = activeSent === s2;
            return (
              <button
                key={s2}
                onClick={() => setActiveSent(s2)}
                style={{
                  ...s.sentPill,
                  background: active && cfg ? cfg.bg : "transparent",
                  color:      active && cfg ? cfg.color : "#6b7280",
                  border:     `1px solid ${active && cfg ? cfg.color : "#d1d5db"}`,
                  fontWeight: active ? 600 : 400,
                }}
              >
                {cfg ? `${cfg.icon} ${cfg.label}` : "All Sentiments"}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <main style={s.main}>
        {loading && (
          <div style={s.center}>
            <div style={s.spinner} />
            <p style={{ color: "#6b7280", marginTop: 16 }}>Fetching & summarising news…</p>
          </div>
        )}

        {error && (
          <div style={s.errorBox}>
            <strong>⚠️ Could not reach API</strong>
            <p style={{ margin: "4px 0 0", fontSize: 14 }}>
              Make sure the FastAPI server is running at <code>{API_BASE}</code>.
              <br />Error: {error}
            </p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div style={s.center}>
            <p style={{ color: "#6b7280" }}>No articles match your filters.</p>
          </div>
        )}

        {!loading && !error && filtered.map((cluster, ci) => (
          <section key={ci} style={s.section}>
            <h2 style={s.sectionTitle}>
              <span style={s.topicBadge}>
                {TOPIC_ICONS[cluster.topic] ?? "📰"} {cluster.topic}
              </span>
              <span style={s.articleCount}>{cluster.articles.length} article{cluster.articles.length !== 1 ? "s" : ""}</span>
            </h2>
            <div style={s.grid}>
              {cluster.articles.map((article, ai) => (
                <ArticleCard key={ai} article={article} />
              ))}
            </div>
          </section>
        ))}
      </main>

      <footer style={s.footer}>
        NewsDigest · Built with FastAPI + Groq LLaMA 3 · BBC & CNN RSS
      </footer>
    </div>
  );
}

function ArticleCard({ article }) {
  const sent   = SENTIMENT_CONFIG[article.sentiment] ?? SENTIMENT_CONFIG.neutral;
  const srcClr = SOURCE_COLORS[article.source] ?? { bg: "#374151", text: "#fff" };

  return (
    <div style={s.card}>
      <div style={s.cardTop}>
        <span style={{ ...s.sourceBadge, background: srcClr.bg, color: srcClr.text }}>
          {article.source}
        </span>
        <span style={{ ...s.sentBadge, background: sent.bg, color: sent.color }}>
          {sent.icon} {sent.label}
        </span>
      </div>
      <h3 style={s.cardTitle}>{article.title}</h3>
      <p style={s.cardSummary}>{article.summary}</p>
      {article.link && (
        <a href={article.link} target="_blank" rel="noopener noreferrer" style={s.readMore}>
          Read full article →
        </a>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={s.stat}>
      <span style={s.statValue}>{value}</span>
      <span style={s.statLabel}>{label}</span>
    </div>
  );
}

const s = {
  page: {
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    background: "#f8fafc",
    minHeight: "100vh",
  },
  header: {
    background: "#0f172a",
    color: "#fff",
    padding: "0 24px",
  },
  headerInner: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "20px 0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    margin: 0,
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: "-0.5px",
  },
  tagline: {
    margin: "4px 0 0",
    fontSize: 13,
    color: "#94a3b8",
  },
  headerMeta: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  updated: {
    fontSize: 13,
    color: "#94a3b8",
  },
  refreshBtn: {
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 8,
    padding: "6px 14px",
    fontSize: 14,
    cursor: "pointer",
  },
  statsBar: {
    background: "#1e293b",
    display: "flex",
    justifyContent: "center",
    gap: 48,
    padding: "14px 24px",
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: 700,
    color: "#f1f5f9",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  controls: {
    maxWidth: 960,
    margin: "24px auto 0",
    padding: "0 24px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  searchInput: {
    width: "100%",
    padding: "10px 16px",
    fontSize: 15,
    border: "1.5px solid #e2e8f0",
    borderRadius: 10,
    background: "#fff",
    boxSizing: "border-box",
    outline: "none",
  },
  filterRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    padding: "5px 14px",
    borderRadius: 20,
    border: "1px solid #e2e8f0",
    background: "#fff",
    fontSize: 14,
    cursor: "pointer",
    color: "#374151",
    transition: "all 0.15s",
  },
  pillActive: {
    background: "#0f172a",
    color: "#fff",
    border: "1px solid #0f172a",
    fontWeight: 600,
  },
  sentPill: {
    padding: "5px 14px",
    borderRadius: 20,
    fontSize: 14,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  main: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "24px",
  },
  section: {
    marginBottom: 36,
  },
  sectionTitle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottom: "2px solid #e2e8f0",
  },
  topicBadge: {
    fontSize: 20,
    fontWeight: 700,
    color: "#0f172a",
  },
  articleCount: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: 400,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16,
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  },
  cardTop: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  sourceBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 4,
    letterSpacing: "0.05em",
  },
  sentBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 4,
    marginLeft: "auto",
  },
  cardTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 600,
    color: "#0f172a",
    lineHeight: 1.45,
  },
  cardSummary: {
    margin: 0,
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 1.6,
    flexGrow: 1,
  },
  readMore: {
    fontSize: 13,
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 500,
    marginTop: 4,
  },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "60px 0",
  },
  spinner: {
    width: 36,
    height: 36,
    border: "3px solid #e2e8f0",
    borderTopColor: "#0f172a",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 10,
    padding: "16px 20px",
    color: "#991b1b",
    marginBottom: 24,
  },
  footer: {
    textAlign: "center",
    padding: "24px",
    fontSize: 13,
    color: "#94a3b8",
    borderTop: "1px solid #e2e8f0",
    marginTop: 24,
  },
};