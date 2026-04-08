# fetcher.py
from newsapi import NewsApiClient
import pandas as pd
from datetime import datetime, timedelta

API_KEY = "3f420bba56624904bba18a6c93a033ae"

# Map country names → NewsAPI country codes + known sources
COUNTRIES = {
    "india":          {"code": "in", "sources": "the-hindu,the-times-of-india,ndtv"},
    "united states":  {"code": "us", "sources": "cnn,fox-news,the-wall-street-journal,reuters"},
    "united kingdom": {"code": "gb", "sources": "bbc-news,the-guardian,independent"},
    "russia":         {"code": None, "sources": None},   # NewsAPI has no Russian sources in free tier
    "china":          {"code": None, "sources": None},   # same — use topic search only
    "pakistan":       {"code": "pk", "sources": None},
    "australia":      {"code": "au", "sources": None},
    "germany":        {"code": "de", "sources": None},
}


def fetch_newsapi(
    topic:       str,
    country:     str  = None,   # e.g. "india", "united states"
    days_back:   int  = 7,
    max_results: int  = 50
) -> pd.DataFrame:
    """
    Fetch articles for a topic, optionally filtered by country.

    Strategy:
      - If country has known sources → filter by those sources (most accurate)
      - If country has a code but no sources → use get_top_headlines with country code
      - If no country given → broad search across all sources
    """

    client    = NewsApiClient(api_key=API_KEY)
    from_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")

    label = f"'{topic}'" + (f" from {country}" if country else " (all countries)")
    print(f"\n  Fetching: {label}...")

    # ── Resolve country config ─────────────────────────────
    country_cfg = COUNTRIES.get(country.lower(), {}) if country else {}
    country_code    = country_cfg.get("code")
    country_sources = country_cfg.get("sources")

    articles = []

    try:
        if country_sources:
            # Best option: filter by known sources for that country
            response = client.get_everything(
                q          = topic,
                sources    = country_sources,
                from_param = from_date,
                language   = "en",
                sort_by    = "publishedAt",
                page_size  = min(max_results, 100),
            )
            articles = response.get("articles", [])

        elif country_code:
            # Fallback: use top-headlines with country code
            response = client.get_top_headlines(
                q         = topic,
                country   = country_code,
                page_size = min(max_results, 100),
            )
            articles = response.get("articles", [])

            # If top-headlines returns too few, supplement with get_everything
            if len(articles) < 10:
                response2 = client.get_everything(
                    q          = topic,
                    from_param = from_date,
                    language   = "en",
                    sort_by    = "publishedAt",
                    page_size  = min(max_results, 100),
                )
                articles += response2.get("articles", [])

        else:
            # No country filter — broad search
            response = client.get_everything(
                q          = topic,
                from_param = from_date,
                language   = "en",
                sort_by    = "publishedAt",
                page_size  = min(max_results, 100),
            )
            articles = response.get("articles", [])

    except Exception as e:
        print(f"  Error: {e}")
        return pd.DataFrame()

    if not articles:
        print(f"  No articles found.")
        return pd.DataFrame()

    # ── Build DataFrame ────────────────────────────────────
    rows = []
    for a in articles:
        rows.append({
            "title":        a.get("title", ""),
            "url":          a.get("url", ""),
            "published_at": pd.to_datetime(a.get("publishedAt"), errors="coerce"),
            "source":       a.get("source", {}).get("name", ""),
            "description":  a.get("description", ""),
            "topic":        topic,
            "country":      country if country else "global",
            "fetched_at":   datetime.now(),
        })

    df = pd.DataFrame(rows)
    df = df[df["title"].notna() & (df["title"] != "")].reset_index(drop=True)
    df = df.drop_duplicates(subset="url").reset_index(drop=True)

    print(f"  Got {len(df)} articles from {df['source'].nunique()} sources.")
    return df


def fetch_all_countries(topic: str, days_back: int = 7, max_per_country: int = 30) -> pd.DataFrame:
    """
    Fetch the same topic across all configured countries and combine.
    Use this to build the full country comparison dataset.
    """
    all_dfs = []

    for country in COUNTRIES:
        df = fetch_newsapi(topic, country=country, days_back=days_back, max_results=max_per_country)
        if not df.empty:
            all_dfs.append(df)

    if not all_dfs:
        return pd.DataFrame()

    combined = pd.concat(all_dfs, ignore_index=True)
    combined = combined.drop_duplicates(subset="url").reset_index(drop=True)

    print(f"\n  Total: {len(combined)} articles across {combined['country'].nunique()} countries")
    print(combined.groupby("country")["title"].count().rename("articles").to_string())

    return combined


# ── Test ──────────────────────────────────────────────────
if __name__ == "__main__":

    # Test 1: single country
    print("=" * 50)
    print("TEST 1: Single country fetch")
    print("=" * 50)
    df_india = fetch_newsapi("Donald Trump", country="india", days_back=3)
    print(df_india[["title", "source", "country", "published_at"]].head(5))

    # Test 2: different country
    print("\n" + "=" * 50)
    print("TEST 2: Different country")
    print("=" * 50)
    df_us = fetch_newsapi("Donald Trump", country="united states", days_back=3)
    print(df_us[["title", "source", "country", "published_at"]].head(5))

    # Test 3: all countries combined
    print("\n" + "=" * 50)
    print("TEST 3: All countries combined")
    print("=" * 50)
    df_all = fetch_all_countries("Donald Trump", days_back=3, max_per_country=15)
    print(df_all[["title", "source", "country"]].head(10))

    # Show country breakdown
    print("\nArticles per country:")
    print(df_all["country"].value_counts().to_string())