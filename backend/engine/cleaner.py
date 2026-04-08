# cleaner.py
import re
import pandas as pd


def clean_text(text: str) -> str:
    if not isinstance(text, str) or not text.strip():
        return ""

    text = text.lower()
    text = re.sub(r"<[^>]+>",  " ", text)   # remove HTML tags
    text = re.sub(r"http\S+",  " ", text)   # remove URLs
    text = re.sub(r"\[.*?\]",  " ", text)   # remove [+N chars] truncation markers NewsAPI adds
    text = re.sub(r"[^a-z\s]", " ", text)   # keep only letters + spaces
    text = re.sub(r"\s+",      " ", text)   # collapse spaces
    return text.strip()


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean a DataFrame of articles from fetch_newsapi or fetch_all_countries.
    Adds clean_text column, drops useless rows and duplicate URLs.
    Preserves the country column for downstream analysis.
    """
    if df.empty:
        print("  Warning: empty DataFrame passed to cleaner.")
        return df

    df = df.copy()

    # Combine title + description — more context = better embeddings
    df["clean_text"] = df.apply(
        lambda r: clean_text(
            str(r.get("title", "")) + " " + str(r.get("description", ""))
        ),
        axis=1
    )

    before = len(df)

    # Drop rows where clean_text is too short to be meaningful
    df = df[df["clean_text"].str.len() > 15]

    # Drop duplicate URLs — same article from two fetches
    df = df.drop_duplicates(subset="url")

    df = df.reset_index(drop=True)

    removed = before - len(df)
    print(f"  Cleaned: {before} → {len(df)} articles  (removed {removed} empty/dupes)")

    # Show per-country breakdown if country column exists
    if "country" in df.columns:
        print("\n  Articles per country after cleaning:")
        breakdown = df.groupby("country")["title"].count().rename("articles")
        for country, count in breakdown.items():
            print(f"    {country:<20} {count}")

    return df


def preview(df: pd.DataFrame, n: int = 5) -> None:
    """
    Print a before/after preview of the cleaning for the first n rows.
    Call this after clean_dataframe to verify the output looks right.
    """
    print(f"\n  --- Preview: first {n} articles ---")
    for i, row in df.head(n).iterrows():
        country = row.get("country", "?")
        source  = row.get("source", "?")
        print(f"\n  [{i+1}] {source} ({country})")
        print(f"  Original : {str(row.get('title',''))[:80]}")
        print(f"  Cleaned  : {row['clean_text'][:80]}")


# ── Test ─────────────────────────────────────────────────
if __name__ == "__main__":
    from fetcher import fetch_all_countries, fetch_newsapi

    # Test 1: single country
    print("=" * 55)
    print("TEST 1: Clean single country fetch")
    print("=" * 55)
    df_raw   = fetch_newsapi("Donald Trump", country="india", days_back=3)
    df_clean = clean_dataframe(df_raw)
    preview(df_clean, n=3)

    # Test 2: all countries combined
    print("\n" + "=" * 55)
    print("TEST 2: Clean all countries combined")
    print("=" * 55)
    df_all       = fetch_all_countries("Donald Trump", days_back=3, max_per_country=15)
    df_all_clean = clean_dataframe(df_all)
    preview(df_all_clean, n=5)

    # Final summary
    print("\n" + "=" * 55)
    print("SUMMARY")
    print("=" * 55)
    print(f"  Shape    : {df_all_clean.shape}")
    print(f"  Columns  : {df_all_clean.columns.tolist()}")
    print(f"\n  Ready for embedder.py — {len(df_all_clean)} articles with clean_text column")