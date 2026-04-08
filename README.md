# Narrative Intelligence — Project Roadmap

> **Project Roadmap · Narrative Intelligence System**

## From *Raw News* to Research-Grade Analysis

A complete end-to-end pipeline: fetch international news, clean it, embed it into vectors, cluster it into narratives, classify political stance, store everything, serve it through Flask, and visualise it in a React dashboard.

---

## Full Pipeline — Data Flows Left to Right

```
Fetch       →  Clean      →  Embed       →  Cluster      →  Stance        →  Store          →  Flask API  →  React UI
────────────   ─────────     ──────────     ──────────       ─────────────    ─────────────     ─────────     ──────────
NewsAPI        regex          SBERT          BERTopic         BART-MNLI        PostgreSQL         REST          Recharts
GDELT          pandas         384-dim        UMAP             zero-shot        SQLAlchemy         JSON          Dashboard
```

---

## PHASE 01 — Data Collection

**Fetch real news articles**

Pull international articles from NewsAPI. Each article comes with title, description, source, date. This raw data feeds everything downstream.

### Tasks

- [ ] **Register at newsapi.org and get API key**
  Free tier: 100 requests/day · Takes 2 minutes · No credit card
  `newsapi.org`

- [ ] **Write fetcher.py with NewsAPI client**
  `fetch_articles(topic, country, days_back)` → DataFrame with `title`, `url`, `source`, `published_at`
  `newsapi-python` · `pandas`

- [ ] **Test: run `python fetcher.py` and see 20+ articles**
  Try `topic="Donald Trump"`, `country="india"` · Verify DataFrame has real titles
  `terminal`

- [ ] **Fetch for all 5 countries and combine into one DataFrame**
  USA · UK · India · Russia · China · combine with `pd.concat()` · tag each row with country
  `pandas`

### ELI5 — What is happening here

You are asking NewsAPI: **"give me every English article about Ukraine from the last 7 days."** It returns a JSON list. You turn that into a table (DataFrame) where each row is one article. Think of it as downloading a stack of newspaper clippings and laying them flat on a table. Nothing smart yet — just collecting raw material.

### Outputs

- DataFrame: ~200 rows
- Columns: `title`, `source`, `country`, `published_at`
- File: `fetcher.py` ✓

---

## PHASE 02 — Text Cleaning

**Make text usable for NLP**

Raw titles contain HTML tags, URLs, punctuation, and noise. The embedding model treats every character as meaningful — clean text produces better vectors.

### Tasks

- [ ] **Write `clean_text()` function**
  lowercase → remove HTML → remove URLs → keep letters only → collapse spaces
  `re (regex)`

- [ ] **Combine title + description into one `clean_text` column**
  Title alone = 8 words. Title + description = 35 words. More context → better embeddings
  `pandas`

- [ ] **Drop empty rows and duplicate URLs**
  Articles with no text are useless · Same article from two sources is noise
  `pandas`

- [ ] **Test: run `python cleaner.py` standalone on fake data**
  Verify `"<b>Trump WINS!</b> https://cnn.com"` → `"trump wins"`
  `terminal`

### ELI5 — What is happening here

Imagine you are preparing ingredients before cooking. You don't throw a muddy carrot into the pan — you wash it, peel it, chop it. Cleaning text is exactly that. **`"<b>Trump WINS!</b> — Read at https://cnn.com"`** becomes **`"trump wins"`**. The embedding model now works on pure meaning, not noise.

### Outputs

- New column: `clean_text`
- ~180 rows after dedup
- File: `cleaner.py` ✓

---

## PHASE 03 — Embedding

**Turn words into numbers**

Each article becomes a list of 384 numbers — a vector. Articles about the same topic land near each other in this 384-dimensional space, even if they use different words.

### Tasks

- [ ] **Install `sentence-transformers` and load `all-MiniLM-L6-v2`**
  `pip install sentence-transformers` · Model loads from HuggingFace automatically (~80MB)
  `sentence-transformers`

- [ ] **Write `embed_texts()` — returns numpy array shape `(n, 384)`**
  `model.encode(list_of_strings)` → one 384-number row per article
  `sentence-transformers` · `numpy`

- [ ] **Test: verify similar articles have cosine similarity > 0.7**
  *"NATO sends weapons to Ukraine"* and *"US approves arms package for Kyiv"* should be close
  `sklearn`

- [ ] **Compute divergence scores between countries**
  Average all Indian article vectors → one point. Average all Russian vectors → one point. Cosine distance between them = divergence score
  `sklearn` · `numpy`

### ELI5 — What is happening here

Think of each article as a GPS coordinate — but instead of 2 numbers (lat, lon) you have **384 numbers**. *"Russia attacks Ukraine"* and *"Moscow launches military operation"* end up at nearby coordinates even though the words differ. *"Stock market rises"* ends up far away. This **semantic geometry** is what makes clustering and divergence measurement possible. Without this step, you are just counting words. With it, you understand meaning.

### Outputs

- `embeddings`: numpy array `(n, 384)`
- divergence matrix: countries × countries
- File: `embedder.py` ✓

---

## PHASE 04 — Topic Modeling / Clustering

**Group articles into narratives**

BERTopic finds natural clusters in your embedding space. Each cluster is a narrative — "military aid", "sanctions", "ceasefire talks". Articles assign themselves automatically.

### Tasks

- [ ] **Install `bertopic` and run `fit_transform(texts, embeddings)`**
  `pip install bertopic` · Returns `topics[]` list and `probs[]` list, one per article
  `bertopic`

- [ ] **Print `topic_info()` and read the auto-generated cluster names**
  Each cluster gets a name like `"nato_military_war_aid"` from its top keywords. Read them — do they make sense?
  `bertopic`

- [ ] **Add `topic_id` and `topic_label` columns to DataFrame**
  `-1` = noise (no cluster found) · `0,1,2...` = cluster IDs · Store label as human-readable string
  `pandas`

- [ ] **Compute narrative dominance: volume per cluster per country per day**
  `groupby(country, topic_id, date).count()` → `dominance = cluster_count / total_daily_count`
  `pandas`

### ELI5 — What is happening here

Remember those 384-dimensional GPS coordinates from the embedding step? Now imagine dropping 1000 coloured dots on a table — some naturally clump together. **UMAP** squashes the 384 dimensions down to 2D (like zooming out on Google Maps). **HDBSCAN** finds the natural clumps. **c-TF-IDF** names each clump by its most distinctive words. You give it articles → it gives back named narrative groups. No labels needed.

### Outputs

- 10–20 narrative clusters
- `topic_id` per article
- File: `clusterer.py` ✓

---

## PHASE 05 — Stance Detection

**Classify left · centre · right**

Zero-shot classification using BART-MNLI. No training data needed — the model already understands language well enough to classify stance from just a text description.

### Tasks

- [ ] **Load `facebook/bart-large-mnli` pipeline from `transformers`**
  `pip install transformers torch` · Model is ~1.6GB · Load once, reuse · Warning: first load is slow
  `transformers` · `torch`

- [ ] **Write `classify_stance(text)` → returns label + three probability scores**
  Labels: `"left-leaning"`, `"centre"`, `"right-leaning"` · `hypothesis_template: "This news article is {}."`
  `transformers`

- [ ] **Run on 3 test sentences and verify labels make sense**
  *"Strong military response needed"* → right · *"Ceasefire negotiations continue"* → centre · *"Government fuel hike sparks protests"* → left
  `terminal`

- [ ] **Run `classify_dataframe()` on all articles · Add 4 new columns**
  `stance_label` · `stance_left` · `stance_centre` · `stance_right` · Slow on CPU: ~2s per article
  `pandas` · `transformers`

### ELI5 — What is happening here

**Zero-shot** means the model never saw your labels during training — you just describe them in plain English. You give it a sentence and three hypotheses: *"This article is left-leaning."* / *"...centre."* / *"...right-leaning."* It was trained on natural language inference (NLI): deciding if one sentence implies another. It answers: probability of each hypothesis given the article. No labelled dataset required.

### Outputs

- `stance_label` per article
- left/centre/right probabilities
- File: `stance.py` ✓

---

## PHASE 06 — Storage

**Persist everything to PostgreSQL**

DataFrames in memory disappear when Python closes. PostgreSQL stores everything permanently. Flask reads from here. All 5 pipeline steps write to the same database.

### Tasks

- [ ] **Install PostgreSQL locally and create `narrative_db` database**
  `brew install postgresql` (Mac) · `sudo apt install postgresql` (Linux) · pgAdmin GUI optional
  `PostgreSQL` · `pgAdmin`

- [ ] **Create 4 tables: `articles`, `embeddings`, `topics`, `sentiment`**
  All joined on `article_id` · Run `schema.sql` once · Use `flask db migrate` for future changes
  `SQL` · `flask-migrate`

- [ ] **Write save functions using SQLAlchemy `df.to_sql()`**
  `if_exists='append'` + deduplication on `article_id` · Never overwrite existing rows
  `sqlalchemy` · `psycopg2`

- [ ] **Run full `pipeline.py` end-to-end and verify rows in pgAdmin**
  `SELECT count(*) FROM articles;` → should match what pipeline printed · Check no duplicates
  `pgAdmin`

### Outputs

- 4 database tables populated
- All joined on `article_id`
- Files: `schema.sql` + `db.py` ✓

---

## PHASE 07 — Flask API

**Serve data to the frontend**

Flask sits between the database and the React UI. It reads from PostgreSQL, runs on-demand NLP inference, and returns clean JSON. Extensions handle connection pooling, caching, CORS.

### Tasks

- [ ] **Set up Flask app with SQLAlchemy, CORS, Caching, Migrate**
  `create_app()` factory · all extensions in `extensions.py` · config from `.env` file
  `flask` · `flask-sqlalchemy` · `flask-cors`

- [ ] **Build `NarrativeLookup` service class — loads models at startup**
  Singleton pattern: embed + match cluster + classify stance + fetch history → return dict
  `sentence-transformers` · `transformers`

- [ ] **Write 3 API endpoints: `/api/lookup` · `/api/topics` · `/api/divergence`**
  `POST /api/lookup body:{headline}` → full analysis · `GET /api/topics` → cluster list · `GET /api/divergence?topic_id=3`
  `flask-restx`

- [ ] **Test all endpoints in Swagger UI at `localhost:5000/docs`**
  Flask-RESTX generates this automatically · Try each endpoint · Verify JSON response shape matches what React expects
  `Swagger UI`

### Outputs

- 3 working API endpoints
- Swagger docs at `/docs`
- Files: `app.py`, `routes.py`, `services.py` ✓

---

## PHASE 08 — React Frontend

**Visualise the outputs**

The React app calls Flask endpoints, renders charts, and lets users type any headline to trigger a full analysis. Recharts handles all visualisations.

### Tasks

- [ ] **Replace mock `fetch()` with real Flask API calls**
  In `LookupView`: replace `setTimeout` mock with `fetch('http://localhost:5000/api/lookup', POST)`
  `React` · `fetch API`

- [ ] **Wire Topics view to `GET /api/topics`**
  Replace `ALL_TOPICS` constant with a `useEffect` fetch on component mount
  `React`

- [ ] **Wire Heatmap view to `GET /api/divergence` for real outlet scores**
  Replace `HEATMAP` constant with real data from Flask · Add loading states
  `React` · `Recharts`

- [ ] **End-to-end test: type headline → see real data populate all panels**
  Flask running on `:5000` · React on `:3000` · CORS configured · Full flow works without mock data
  `browser`

### Outputs

- Lookup · Topics · Heatmap views live
- Real data, no mocks
- Files: `App.js`, `App.css` ✓

> **Research paper milestone:** Once this phase is complete, you have a working system producing real outputs. Now extract **one finding with a real statistic** — for example: *"Russian press framed Ukraine coverage 4.2× more positively than US press across 284 articles (Mann-Whitney U, p < 0.001, Cohen's d = 1.84)."* That one sentence, backed by real data from your system, is the core of your research contribution.

---

## Reference — Full Tech Stack

| Library | Role |
|---|---|
| `newsapi-python` | Fetch articles from 70,000+ sources worldwide. Free tier: 100 req/day. |
| `pandas` | DataFrame operations: clean, filter, groupby, merge. Used in every step. |
| `sentence-transformers` | Convert text → 384-dim vectors. Model: `all-MiniLM-L6-v2`. CPU-friendly. |
| `BERTopic` | Auto-cluster articles into narrative groups using UMAP + HDBSCAN. |
| `transformers` | Zero-shot stance classification. Model: `facebook/bart-large-mnli`. |
| `PostgreSQL` | Persistent storage for all pipeline outputs. 4 tables joined on `article_id`. |
| `SQLAlchemy` | Python ORM. All DB reads/writes go through here. No raw SQL in app code. |
| `Flask` | Minimal web framework. Handles HTTP routing and JSON responses. |
| `Flask-RESTX` | Auto-generates Swagger docs at `/docs`. Structures API into namespaces. |
| `Flask-Caching` | Caches NLP inference results for 1h. Turns 3s responses into instant. |
| `React` | Frontend UI. 3 views: Lookup, Topics, Heatmap. |
| `Recharts` | Line charts for volume timelines. Composable, React-native. |
| `scipy` | Statistical tests: Mann-Whitney U, t-test, chi-square. p-values for findings. |
| `scikit-learn` | Cosine similarity for divergence scores. Preprocessing utilities. |
| `statsmodels` | Granger causality tests for agenda-setting analysis. *(v2 feature)* |
| `networkx` | Media influence graph. Nodes = outlets, edges = co-coverage. *(v2 feature)* |

---

## Timeline — 6-Week Delivery Plan

| Week | Focus | Tasks |
|---|---|---|
| **Week 1** | Data pipeline | `fetcher.py` · `cleaner.py` · PostgreSQL schema · 500+ articles stored and tagged |
| **Week 2** | NLP preprocessing | `embedder.py` · 384-dim vectors stored · similarity matrix · divergence scores between countries |
| **Week 3** | Topic modeling + stance | `clusterer.py` · 10–20 narrative clusters · `stance.py` · left/centre/right labels per article |
| **Week 4** | Flask API | `app.py` · 3 endpoints · Swagger docs · Flask-Caching · APScheduler for daily ingestion |
| **Week 5** | React dashboard live | Wire all views to Flask · Recharts volume chart · Country matrix · Divergence bars |
| **Week 6** | Polish + research paper | Extract 1 real finding with stats · GitHub README · Deploy to Render · Paper outline |

---

*Narrative Intelligence System · Project Roadmap*