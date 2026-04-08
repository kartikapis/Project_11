import { useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './App.css';

// ── MOCK DATA ─────────────────────────────────────────
const MOCK_DB = {
  ukraine: {
    cluster_label: 'Military conflict / geopolitical crisis',
    confidence: 0.91, total_articles: 284,
    keywords: ['NATO','military aid','sanctions','ceasefire','Zelensky'],
    stance: { left:52, centre:29, right:19 },
    volume: [
      {w:'Jan W1',USA:42,UK:30,Russia:55,India:15,China:25},{w:'Jan W2',USA:45,UK:32,Russia:58,India:16,China:27},
      {w:'Jan W3',USA:50,UK:35,Russia:62,India:18,China:30},{w:'Jan W4',USA:118,UK:84,Russia:96,India:32,China:58},
      {w:'Feb W1',USA:68,UK:50,Russia:70,India:22,China:38},{w:'Feb W2',USA:55,UK:42,Russia:65,India:18,China:32},
      {w:'Feb W3',USA:60,UK:45,Russia:68,India:20,China:35},{w:'Feb W4',USA:58,UK:44,Russia:65,India:19,China:33},
      {w:'Mar W1',USA:52,UK:40,Russia:60,India:18,China:30},{w:'Mar W2',USA:70,UK:55,Russia:80,India:24,China:42},
      {w:'Mar W3',USA:65,UK:50,Russia:75,India:22,China:38},{w:'Mar W4',USA:60,UK:48,Russia:70,India:21,China:36},
    ],
    matrix: [
      {country:'USA',lean:'Left-centre',dir:'left',sentiment:-0.18,articles:312},
      {country:'UK',lean:'Left-centre',dir:'left',sentiment:-0.21,articles:264},
      {country:'Russia',lean:'Far-right',dir:'right',sentiment:+0.41,articles:358},
      {country:'India',lean:'Centre',dir:'centre',sentiment:-0.08,articles:148},
      {country:'China',lean:'Right',dir:'right',sentiment:+0.12,articles:228},
    ],
    divergence: [{pair:'Russia vs USA',score:0.91},{pair:'Russia vs UK',score:0.87},{pair:'China vs UK',score:0.82},{pair:'India vs USA',score:0.44},{pair:'India vs Russia',score:0.38}],
    finding: 'Russian press averaged +0.41 tone vs US −0.18 on identical days (Cohen\'s d = 1.84, p < 0.001). India maintained statistical neutrality across all 12 weeks.',
  },
  tariff: {
    cluster_label: 'Trade policy / economic nationalism',
    confidence: 0.87, total_articles: 207,
    keywords: ['tariffs','trade war','WTO','supply chain','decoupling'],
    stance: { left:31, centre:44, right:25 },
    volume: [
      {w:'Jan W1',USA:38,UK:22,Russia:18,India:28,China:48},{w:'Jan W2',USA:40,UK:24,Russia:20,India:30,China:52},
      {w:'Jan W3',USA:55,UK:32,Russia:28,India:40,China:70},{w:'Jan W4',USA:88,UK:60,Russia:42,India:68,China:115},
      {w:'Feb W1',USA:60,UK:40,Russia:30,India:48,China:78},{w:'Feb W2',USA:48,UK:30,Russia:24,India:38,China:62},
      {w:'Feb W3',USA:52,UK:34,Russia:26,India:42,China:68},{w:'Feb W4',USA:50,UK:32,Russia:25,India:40,China:65},
      {w:'Mar W1',USA:45,UK:28,Russia:22,India:36,China:58},{w:'Mar W2',USA:62,UK:42,Russia:34,India:50,China:80},
      {w:'Mar W3',USA:58,UK:38,Russia:30,India:46,China:74},{w:'Mar W4',USA:55,UK:36,Russia:28,India:44,China:70},
    ],
    matrix: [
      {country:'USA',lean:'Right',dir:'right',sentiment:+0.22,articles:280},
      {country:'UK',lean:'Left',dir:'left',sentiment:-0.13,articles:198},
      {country:'Russia',lean:'Right',dir:'right',sentiment:+0.31,articles:162},
      {country:'India',lean:'Centre',dir:'centre',sentiment:-0.05,articles:241},
      {country:'China',lean:'Far-right',dir:'right',sentiment:+0.39,articles:326},
    ],
    divergence: [{pair:'China vs USA',score:0.89},{pair:'Russia vs USA',score:0.83},{pair:'Germany vs China',score:0.55},{pair:'UK vs USA',score:0.51},{pair:'India vs USA',score:0.38}],
    finding: 'China and USA share zero common top-20 keywords (Jaccard = 0.00). India coverage correlates with export exposure (r = 0.74, p = 0.004).',
  },
  climate: {
    cluster_label: 'Climate policy / energy transition',
    confidence: 0.83, total_articles: 164,
    keywords: ['net zero','carbon tax','renewables','emissions','energy security'],
    stance: { left:58, centre:27, right:15 },
    volume: [
      {w:'Jan W1',USA:25,UK:30,Russia:20,India:12,China:18},{w:'Jan W2',USA:28,UK:33,Russia:22,India:13,China:20},
      {w:'Jan W3',USA:32,UK:38,Russia:26,India:15,China:24},{w:'Jan W4',USA:62,UK:74,Russia:42,India:29,China:45},
      {w:'Feb W1',USA:44,UK:52,Russia:30,India:20,China:32},{w:'Feb W2',USA:36,UK:42,Russia:24,India:16,China:26},
      {w:'Feb W3',USA:40,UK:46,Russia:26,India:18,China:28},{w:'Feb W4',USA:38,UK:44,Russia:25,India:17,China:27},
      {w:'Mar W1',USA:34,UK:40,Russia:22,India:15,China:24},{w:'Mar W2',USA:48,UK:56,Russia:158,India:22,China:36},
      {w:'Mar W3',USA:44,UK:52,Russia:26,India:20,China:32},{w:'Mar W4',USA:42,UK:50,Russia:26,India:19,China:30},
    ],
    matrix: [
      {country:'USA',lean:'Right',dir:'right',sentiment:+0.18,articles:218},
      {country:'UK',lean:'Left',dir:'left',sentiment:-0.24,articles:254},
      {country:'Russia',lean:'Far-right',dir:'right',sentiment:+0.44,articles:162},
      {country:'India',lean:'Centre',dir:'centre',sentiment:-0.08,articles:138},
      {country:'China',lean:'Right',dir:'right',sentiment:+0.14,articles:192},
    ],
    divergence: [{pair:'Russia vs Germany',score:0.84},{pair:'USA vs UK',score:0.76},{pair:'China vs Germany',score:0.68},{pair:'India vs Germany',score:0.41},{pair:'Brazil vs India',score:0.28}],
    finding: 'Right outlets used "economic burden" 5.8× more than left (d = 0.88). Germany–UK cosine similarity = 0.69 — highest pair in dataset.',
  },
};

const HEATMAP = {
  outlets:['Reuters','BBC','The Guardian','Fox News','CGTN','RT (English)','NDTV','Hindustan Times','Doordarshan'],
  topics:['Ukraine war','US–China tariffs','Climate policy'],
  scores:[[-0.9,-0.7,-1.1],[-2.2,-1.0,-2.5],[-3.1,-1.4,-3.2],[1.8,2.4,1.5],[3.6,3.4,1.3],[4.3,3.9,3.2],[-0.7,-0.5,-0.8],[-0.4,-0.2,-0.5],[2.1,1.8,0.9]],
};

const TOPICS = [
  {id:1,label:'Military conflict / geopolitical crisis',articles:284},
  {id:2,label:'Economic sanctions / financial pressure',articles:196},
  {id:3,label:'Trade policy / economic nationalism',articles:207},
  {id:4,label:'Energy security / fossil fuel dependency',articles:178},
  {id:5,label:'Climate policy / energy transition',articles:164},
  {id:6,label:'Inflation / cost of living crisis',articles:221},
  {id:7,label:'Election interference / democracy threat',articles:143},
  {id:8,label:'Refugee / migration crisis',articles:119},
  {id:9,label:'Nuclear threat / proliferation',articles:98},
  {id:10,label:'Diplomatic negotiations / peace talks',articles:134},
  {id:11,label:'Humanitarian aid / civilian casualties',articles:162},
  {id:12,label:'Tech decoupling / chip export controls',articles:88},
  {id:13,label:'Currency war / dollar hegemony',articles:74},
  {id:14,label:'Press freedom / media censorship',articles:61},
];

// ── HELPERS ───────────────────────────────────────────
function getMock(t) {
  const s = t.toLowerCase();
  if (s.includes('ukraine')||s.includes('nato')||s.includes('war')||s.includes('russia')||s.includes('military')) return MOCK_DB.ukraine;
  if (s.includes('tariff')||s.includes('trade')||s.includes('china')||s.includes('import')||s.includes('export'))  return MOCK_DB.tariff;
  if (s.includes('climate')||s.includes('carbon')||s.includes('emission')||s.includes('zero'))                      return MOCK_DB.climate;
  const k = Object.keys(MOCK_DB);
  return MOCK_DB[k[Math.floor(Math.random()*k.length)]];
}
const leanStyle = d => d==='left'?{bg:'#eff6ff',color:'#1d4ed8'}:d==='right'?{bg:'#fef2f2',color:'#dc2626'}:{bg:'#f9fafb',color:'#374151'};
const sentColor = v => v>0.1?'#15803d':v<-0.1?'#b91c1c':'#6b7280';
const divColor  = s => s>=0.8?'#dc2626':s>=0.5?'#d97706':'#16a34a';
const heatStyle = v => v>2.5?{bg:'#dcfce7',color:'#15803d'}:v>0.8?{bg:'#f0fdf4',color:'#16a34a'}:v>-0.8?{bg:'#f9fafb',color:'#9ca3af'}:v>-2.5?{bg:'#fff7ed',color:'#c2410c'}:{bg:'#fef2f2',color:'#dc2626'};
const LC = {USA:'#2563eb',UK:'#059669',Russia:'#dc2626',India:'#d97706',China:'#7c3aed'};

// ── LOOKUP VIEW ───────────────────────────────────────
function LookupView() {
  const [q,setQ]         = useState('');
  const [loading,setL]   = useState(false);
  const [d,setD]         = useState(null);

  const go = useCallback(()=>{
    if(!q.trim()) return;
    setL(true); setD(null);
    setTimeout(()=>{ setD(getMock(q)); setL(false); }, 1000);
  },[q]);

  return (
    <div className="view">

      {/* Search */}
      <div className="card search-card">
        <div className="search-row">
          <input
            className="search-input"
            value={q}
            onChange={e=>setQ(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&go()}
            placeholder="Enter a headline or topic to analyse…"
            autoFocus
          />
          <button className="btn-primary" onClick={go} disabled={loading||!q.trim()}>
            {loading?<><span className="spin"/>Analysing…</>:'Analyse →'}
          </button>
        </div>
        <div className="presets">
          <span className="label-sm grey">Quick test:</span>
          {['NATO military aid Ukraine','US tariffs on Chinese chips','EU 2035 net zero targets'].map((p,i)=>(
            <button key={i} className="preset-btn" onClick={()=>setQ(p)}>
              {['Ukraine','Tariffs','Climate'][i]}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="loading-row">
          <span className="spin" style={{width:16,height:16}}/>
          <span className="grey label-sm">Embedding → clustering → classifying stance…</span>
        </div>
      )}

      {d && !loading && <>

        {/* Row 1: Cluster + Stance */}
        <div className="grid-2">
          <div className="card">
            <div className="section-label">Narrative cluster</div>
            <div className="cluster-title">{d.cluster_label}</div>
            <div className="stat-row">
              <Stat val={(d.confidence*100).toFixed(0)+'%'} label="confidence" />
              <Stat val={d.total_articles}                  label="articles matched" />
              <Stat val={d.divergence[0].score.toFixed(2)}  label="max divergence" color={divColor(d.divergence[0].score)} />
            </div>
            <div className="kw-list">
              {d.keywords.map((k,i)=><span key={i} className="kw">{k}</span>)}
            </div>
          </div>

          <div className="card">
            <div className="section-label">Political stance</div>
            {[{l:'Left-leaning',v:d.stance.left,c:'#2563eb'},{l:'Centre',v:d.stance.centre,c:'#6b7280'},{l:'Right-leaning',v:d.stance.right,c:'#dc2626'}].map(s=>(
              <div key={s.l} className="stance-row">
                <span className="stance-label">{s.l}</span>
                <div className="bar-bg"><div className="bar-fg" style={{width:`${s.v}%`,background:s.c}}/></div>
                <span className="stance-pct" style={{color:s.c}}>{s.v}%</span>
              </div>
            ))}
            <div className="finding">{d.finding}</div>
          </div>
        </div>

        {/* Volume chart */}
        <div className="card">
          <div className="section-label">Weekly article volume by country</div>
          <div className="chart-legend">
            {Object.entries(LC).map(([c,col])=>(
              <span key={c} className="legend-item">
                <span className="legend-dot" style={{background:col}}/>
                <span className="label-sm grey">{c}</span>
              </span>
            ))}
          </div>
          <div style={{height:200,marginTop:8}}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={d.volume} margin={{top:4,right:4,bottom:0,left:-24}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                <XAxis dataKey="w" tick={{fontSize:10,fill:'#9ca3af'}} tickLine={false} axisLine={{stroke:'#e5e7eb'}}/>
                <YAxis tick={{fontSize:10,fill:'#9ca3af'}} tickLine={false} axisLine={false}/>
                <Tooltip contentStyle={{fontSize:12,borderRadius:6,border:'1px solid #e5e7eb'}}/>
                {Object.entries(LC).map(([c,col])=>(
                  <Line key={c} type="monotone" dataKey={c} stroke={col} strokeWidth={1.5} dot={false}/>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 3: Matrix + Divergence */}
        <div className="grid-2">
          <div className="card">
            <div className="section-label">Country × lean matrix</div>
            <table className="tbl">
              <thead><tr><th>Country</th><th>Lean</th><th>Sentiment</th><th>Articles</th></tr></thead>
              <tbody>
                {d.matrix.map(r=>{
                  const ls = leanStyle(r.dir);
                  return (
                    <tr key={r.country}>
                      <td className="td-bold">{r.country}</td>
                      <td><span className="lean-tag" style={{background:ls.bg,color:ls.color}}>{r.lean}</span></td>
                      <td style={{color:sentColor(r.sentiment),fontWeight:500,fontVariantNumeric:'tabular-nums'}}>
                        {r.sentiment>0?'+':''}{r.sentiment.toFixed(2)}
                      </td>
                      <td className="td-grey">{r.articles}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="section-label">Narrative divergence scores</div>
            {d.divergence.map(item=>(
              <div key={item.pair} className="div-row">
                <span className="div-pair">{item.pair}</span>
                <div className="div-track"><div className="div-fill" style={{width:`${item.score*100}%`,background:divColor(item.score)}}/></div>
                <span className="div-score" style={{color:divColor(item.score)}}>{item.score.toFixed(2)}</span>
              </div>
            ))}
            <div className="div-scale grey label-sm">
              <span>0.0 identical framing</span><span>1.0 maximally different</span>
            </div>
          </div>
        </div>

      </>}

      {!d && !loading && (
        <div className="empty grey">Enter a headline above to run the analysis pipeline.</div>
      )}
    </div>
  );
}

function Stat({val,label,color}) {
  return (
    <div className="stat">
      <div className="stat-val" style={color?{color}:{}}>{val}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// ── TOPICS VIEW ───────────────────────────────────────
function TopicsView() {
  const [sel,setSel] = useState(null);
  return (
    <div className="view">
      <h2 className="page-title">Topic Cluster Browser</h2>
      <p className="page-sub grey">14 narrative clusters auto-detected by BERTopic · 4,690 articles</p>
      <div className="topics-grid">
        {TOPICS.map(t=>(
          <div key={t.id} className={`topic-card ${sel?.id===t.id?'topic-active':''}`} onClick={()=>setSel(t===sel?null:t)}>
            <div className="topic-id grey">#{String(t.id).padStart(2,'0')}</div>
            <div className="topic-label">{t.label}</div>
            <div className="topic-count grey">{t.articles} articles</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── HEATMAP VIEW ──────────────────────────────────────
function HeatmapView() {
  return (
    <div className="view">
      <h2 className="page-title">Source Bias Heatmap</h2>
      <p className="page-sub grey">Average tone score per outlet per topic. −5 = strongly critical · +5 = strongly supportive.</p>
      <div className="card" style={{overflowX:'auto'}}>
        <table className="tbl heat-tbl">
          <thead>
            <tr>
              <th style={{textAlign:'left'}}>Outlet</th>
              {HEATMAP.topics.map(t=><th key={t}>{t}</th>)}
            </tr>
          </thead>
          <tbody>
            {HEATMAP.outlets.map((o,i)=>(
              <tr key={o}>
                <td className="td-bold">{o}</td>
                {HEATMAP.scores[i].map((v,j)=>{
                  const hs = heatStyle(v);
                  return (
                    <td key={j} style={{textAlign:'center'}}>
                      <span className="heat-cell" style={{background:hs.bg,color:hs.color}}>{v>0?'+':''}{v.toFixed(1)}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="label-sm grey" style={{marginTop:12}}>Reuters ≈ 0 across all topics — use as baseline sanity check on real data.</p>
      </div>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────
export default function App() {
  const [view,setView] = useState('lookup');
  const tabs = [{id:'lookup',label:'Lookup'},{id:'topics',label:'Topics'},{id:'heatmap',label:'Heatmap'}];
  return (
    <div className="app">
      <header className="nav">
        <span className="nav-logo">NarrativeIntel <span className="nav-badge">MVP</span></span>
        <nav className="nav-tabs">
          {tabs.map(t=>(
            <button key={t.id} className={`nav-tab ${view===t.id?'nav-tab-active':''}`} onClick={()=>setView(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <span className="label-sm grey" style={{marginLeft:'auto'}}>GDELT · Jan–Mar 2025</span>
      </header>
      {view==='lookup'  && <LookupView/>}
      {view==='topics'  && <TopicsView/>}
      {view==='heatmap' && <HeatmapView/>}
    </div>
  );
}