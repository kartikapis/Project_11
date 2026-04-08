# test_fetch_and_clean.py
# Run this to verify fetcher + cleaner work together before moving to embedder.py

from fetcher import fetch_newsapi, fetch_all_countries
from cleaner import clean_dataframe, preview

# ── CONFIG ────────────────────────────────────────────────
TOPIC       = "Donald Trump"
DAYS_BACK   = 3
PER_COUNTRY = 15

# ═════════════════════════════════════════════════════════
# TEST 1 — Single country
# ═════════════════════════════════════════════════════════
print("=" * 60)
print("TEST 1 — Single country (India)")
print("=" * 60)

df_india     = fetch_newsapi(TOPIC, country="india", days_back=DAYS_BACK)
df_india_c   = clean_dataframe(df_india)
preview(df_india_c, n=3)

# ═════════════════════════════════════════════════════════
# TEST 2 — Another country
# ═════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("TEST 2 — Single country (United States)")
print("=" * 60)

df_us    = fetch_newsapi(TOPIC, country="united states", days_back=DAYS_BACK)
df_us_c  = clean_dataframe(df_us)
preview(df_us_c, n=3)

# ═════════════════════════════════════════════════════════
# TEST 3 — All countries combined (the real pipeline input)
# ═════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("TEST 3 — All countries combined")
print("=" * 60)

df_all   = fetch_all_countries(TOPIC, days_back=DAYS_BACK, max_per_country=PER_COUNTRY)
df_clean = clean_dataframe(df_all)
preview(df_clean, n=5)

# ═════════════════════════════════════════════════════════
# FINAL CHECKS
# ═════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("FINAL CHECKS")
print("=" * 60)

# 1. Shape
print(f"\n  Total articles ready   : {len(df_clean)}")
print(f"  Columns                : {df_clean.columns.tolist()}")

# 2. No missing clean_text
missing = df_clean["clean_text"].isna().sum()
empty   = (df_clean["clean_text"].str.len() == 0).sum()
print(f"\n  Missing clean_text     : {missing}")
print(f"  Empty clean_text       : {empty}")

# 3. Country coverage
print(f"\n  Countries in dataset:")
for country, count in df_clean["country"].value_counts().items():
    status = "✓" if count >= 5 else "⚠ low"
    print(f"    {country:<22} {count:>3} articles  {status}")

# 4. Source diversity
print(f"\n  Unique sources         : {df_clean['source'].nunique()}")
print(f"  Top 5 sources:")
for src, cnt in df_clean["source"].value_counts().head(5).items():
    print(f"    {src:<30} {cnt}")

# 5. Date range
print(f"\n  Date range:")
print(f"    Oldest  : {df_clean['published_at'].min()}")
print(f"    Newest  : {df_clean['published_at'].max()}")

# 6. Sample clean_text lengths (proxy for quality)
lengths = df_clean["clean_text"].str.len()
print(f"\n  clean_text length:")
print(f"    Min     : {lengths.min()} chars")
print(f"    Max     : {lengths.max()} chars")
print(f"    Average : {lengths.mean():.0f} chars")

# ═════════════════════════════════════════════════════════
# PASS / FAIL
# ═════════════════════════════════════════════════════════
print("\n" + "=" * 60)

issues = []

if len(df_clean) < 20:
    issues.append(f"Too few articles ({len(df_clean)}) — check API key or increase days_back")
if missing + empty > 0:
    issues.append(f"{missing + empty} rows have empty clean_text — inspect those rows")
if df_clean["country"].nunique() < 2:
    issues.append("Only 1 country in dataset — fetch_all_countries may have failed")
if df_clean["source"].nunique() < 3:
    issues.append("Fewer than 3 unique sources — results may be biased")

if issues:
    print("  ISSUES FOUND:")
    for issue in issues:
        print(f"    ✗  {issue}")
else:
    print("  ALL CHECKS PASSED")
    print(f"  {len(df_clean)} clean articles ready → next step: embedder.py")

print("=" * 60)