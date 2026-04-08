from newsapi import NewsApiClient
import pandas as pd
from datetime import datetime, timedelta

API_KEY = "3f420bba56624904bba18a6c93a033ae"   # paste from newsapi.org

def fetch_newsapi(topic: str, days_back: int = 7, max_results: int = 50) -> pd.DataFrame:

    client    = NewsApiClient(api_key=API_KEY)
    from_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")

    print(f"  Fetching: '{topic}' from NewsAPI...")

    response  = client.get_everything(
        q           = topic,
        from_param  = from_date,
        language    = "en",
        sort_by     = "publishedAt",
        page_size   = min(max_results, 100),
    )

    articles = response.get("articles", [])
    if not articles:
        print("  No articles found.")
        return pd.DataFrame()

    rows = []
    for a in articles:
        rows.append({
            "title":        a.get("title",""),
            "url":          a.get("url",""),
            "published_at": pd.to_datetime(a.get("publishedAt"), errors="coerce"),
            "source":       a.get("source",{}).get("name",""),
            "description":  a.get("description",""),
            "topic":        topic,
            "fetched_at":   datetime.now(),
        })

    df = pd.DataFrame(rows)
    print(f"  Got {len(df)} articles from {df['source'].nunique()} sources.")
    return df


if __name__ == "__main__":
    df = fetch_newsapi("Donald Trump", days_back=3)
    print(df[["title","source","published_at"]].head(10))