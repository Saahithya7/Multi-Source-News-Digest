

import feedparser
from fastapi import FastAPI, HTTPException, Security, Request
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from groq import Groq
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import time
from collections import defaultdict
import os
from dotenv import load_dotenv

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
# ──────────────────────────────────────────────
# CONFIG
# ──────────────────────────────────────────────
# GROQ_API_KEY   = "YOUR_GROQ_API_KEY"        # ← paste your gsk_... key here
VALID_API_KEYS = {"newsdigest-demo-key-123"}      # ← frontend uses this



# ──────────────────────────────────────────────
# APP + RATE LIMITER
# ──────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="NewsDigest API",
    description="""
## 📰 NewsDigest API

Fetches news from **BBC**, **CNN**, and **Reuters**, generates AI summaries using Groq (LLaMA 3.3),
clusters articles by topic, and tags sentiment.

### Authentication
All endpoints require an `X-API-Key` header.
**Demo key:** `newsdigest-demo-key-123`

### Rate Limits
- `/digest` → 10 requests/minute
- `/topic/:name` → 20 requests/minute
    """,
    version="1.0.0",
    contact={"name": "NewsDigest", "email": "saahithyapac@gmail.com"},
    license_info={"name": "MIT"},
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# API KEY AUTH
# ──────────────────────────────────────────────
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def require_api_key(api_key: str = Security(api_key_header)):
    if api_key not in VALID_API_KEYS:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing API key. Pass X-API-Key header."
        )
    return api_key

# ──────────────────────────────────────────────
# STORED STATE
# ──────────────────────────────────────────────
stored_news  = []
last_updated = None

# ──────────────────────────────────────────────
# LLM SUMMARY + SENTIMENT
# ──────────────────────────────────────────────
def generate_summary_and_sentiment(text: str) -> dict:
    if not text or not text.strip():
        return {"summary": "No content available", "sentiment": "neutral"}

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{
                "role": "user",
                "content": (
                    f"Summarize this news in EXACTLY 2 short lines.\n"
                    f"Then on a NEW line write only one word — the sentiment: positive, neutral, or negative.\n"
                    f"No extra text, no labels, no punctuation after the sentiment word.\n\n{text[:1000]}"
                )
            }],
            max_tokens=120,
        )

        raw   = response.choices[0].message.content.strip()
        lines = [l.strip() for l in raw.splitlines() if l.strip()]

        sentiment_word = lines[-1].lower() if lines else "neutral"
        if sentiment_word not in ("positive", "neutral", "negative"):
            sentiment_word = "neutral"

        summary_lines = lines[:-1] if len(lines) > 1 else lines
        summary       = " ".join(summary_lines) or "Summary unavailable"

        return {"summary": summary, "sentiment": sentiment_word}

    except Exception as e:
        print(f"🚨 Groq Error: {type(e).__name__}: {e}")
        return {"summary": "Summary unavailable", "sentiment": "neutral"}

# ──────────────────────────────────────────────
# TEXT EXTRACTION
# ──────────────────────────────────────────────
def extract_text(entry) -> str:
    text = entry.get("summary", "") or entry.get("description", "")
    if not text or not text.strip():
        text = entry.get("title", "")
    return text.strip()

# ──────────────────────────────────────────────
# SOURCES + FETCHER
# ──────────────────────────────────────────────
SOURCES = {
    "BBC":      "https://feeds.bbci.co.uk/news/rss.xml",
    "BBC Tech": "https://feeds.bbci.co.uk/news/technology/rss.xml",
    "CNN":      "http://rss.cnn.com/rss/edition.rss",
}

def fetch_source(name: str, url: str) -> list:
    try:
        feed     = feedparser.parse(url)
        articles = []
        for entry in feed.entries[:10]:
            raw_text = extract_text(entry)
            result   = generate_summary_and_sentiment(raw_text)
            articles.append({
                "title":     entry.get("title", "No title"),
                "summary":   result["summary"],
                "sentiment": result["sentiment"],
                "link":      entry.get("link", ""),
                "source":    name,
            })
        return articles
    except Exception as e:
        print(f"🚨 Feed error ({name}): {e}")
        return []

# ──────────────────────────────────────────────
# CLUSTERING
# ──────────────────────────────────────────────
TOPIC_KEYWORDS = {
    "Technology & AI": [
        "artificial intelligence", " ai ", "machine learning", "chatgpt",
        "openai", "tech", "software", "robot", "cyber", "data", "google",
        "microsoft", "apple", "startup", "digital",
    ],
    "Politics": [
        "election", "government", "president", "minister", "parliament",
        "senate", "congress", "vote", "policy", "diplomat", "democrat",
        "republican", "trump", "biden", "modi", "sanction", "nato", "war",
    ],
    "Sports": [
        "match", "cricket", "football", "soccer", "tennis", "olympic",
        "tournament", "league", "player", "championship", "score", "goal",
        "nba", "fifa", "formula", "wimbledon",
    ],
    "Business": [
        "economy", "market", "stock", "trade", "inflation", "gdp",
        "bank", "finance", "investment", "oil", "price", "fuel", "revenue",
    ],
    "Health": [
        "health", "covid", "vaccine", "hospital", "disease", "cancer",
        "mental", "drug", "medical", "pandemic", "who", "nhs",
    ],
}

def classify_article(title: str) -> str:
    padded = f" {title.lower()} "
    for topic, keywords in TOPIC_KEYWORDS.items():
        if any(kw in padded for kw in keywords):
            return topic
    return "General"

def cluster_news(articles: list) -> list:
    clusters: dict = defaultdict(list)
    for article in articles:
        topic = classify_article(article["title"])
        clusters[topic].append(article)
    return [{"topic": t, "articles": a} for t, a in clusters.items()]

# ──────────────────────────────────────────────
# REFRESH
# ──────────────────────────────────────────────
def update_news():
    global stored_news, last_updated
    all_articles = []
    for name, url in SOURCES.items():
        all_articles.extend(fetch_source(name, url))
    stored_news  = cluster_news(all_articles)
    last_updated = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    total        = sum(len(c["articles"]) for c in stored_news)
    print(f"✅ News updated — {total} articles across {len(stored_news)} topics")

scheduler = BackgroundScheduler()
scheduler.add_job(update_news, "interval", minutes=30)
scheduler.start()

# ──────────────────────────────────────────────
# ENDPOINTS
# ──────────────────────────────────────────────

@app.on_event("startup")
def startup_event():
    try:
        update_news()
    except Exception as e:
        print(f"🚨 Startup error: {e}")


@app.get("/status", summary="API health check", tags=["Meta"])
def get_status():
    """Public endpoint — no API key required."""
    return {
        "status":       "ok",
        "last_updated": last_updated,
        "topics":       len(stored_news),
        "articles":     sum(len(c["articles"]) for c in stored_news),
    }

# /digest — remove the api_key parameter
@app.get("/digest", summary="All clustered news", tags=["News"])
@limiter.limit("10/minute")
def get_digest(request: Request):
    return {"last_updated": last_updated, "clusters": stored_news}


# /topic — remove the api_key parameter  
@app.get("/topic/{name}", summary="News by topic", tags=["News"])
@limiter.limit("20/minute")
def get_topic(name: str, request: Request):
    result = [t for t in stored_news if t["topic"].lower() == name.lower()]
    if not result:
        available = [t["topic"] for t in stored_news]
        raise HTTPException(
            status_code=404,
            detail={"error": f"Topic '{name}' not found", "available": available},
        )
    return result


# /sources — remove the api_key parameter
@app.get("/sources", summary="List active news sources", tags=["Meta"])
def get_sources():
    return {"sources": list(SOURCES.keys())}