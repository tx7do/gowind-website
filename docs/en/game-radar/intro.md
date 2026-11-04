# GoWind Game Radar

GoWind Game Radar is the "development quantitative brain" for small and mid-sized game studios: using objective community big data, streaming viewership, rankings, and competitor review data, it **computes** the next development direction, hit concept, and market gap in the overseas game market — addressing the pain of "strong execution, but idea selection by gut feeling".

25 data sources merge into hourly "game candlesticks"; six R&D signal types are auto-scanned and pushed; the niche-survival scan and same-tier survival math answer the two questions small studios care about most — "where do we stand" and "can we survive there"; the greenlight sandbox turns signals into "which games to build, how much to invest in each, and when to start".

> The same product paradigm as GoWind Quant and GoWind Trade Radar — "collect → data foundation → signals → backtest → decision → feedback loop" — applied to game greenlight decisions.

## Core Highlights

- **25 sources, 24 credential-free**: Steam (concurrents/charts/reviews/upcoming), App Store top charts, Twitch, Reddit, YouTube, itch.io and Game Jams, Discord, Roblox, TapTap, Bilibili, Google Trends, and more — collecting out of the box
- **Six signal types covering every greenlight judgment**: genre momentum, cross-platform arbitrage, competitor pain points, trend forecast, competitor downswing, UA poison
- **Backtest first, use later**: parameter-grid backtesting for momentum/downswing/arbitrage strategies, with hit rate and payoff multiples verified up front
- **A small-studio lens**: the niche-survival scan answers "where do we stand"; same-tier survival math answers "can we survive"; the sandbox's single-bet mode answers "should we go all-in"
- **Deep player-sentiment mining**: negative-review clustering yields pain points and micro-innovation hooks; delight-point deep-dives extract competitors' core experience loops and delight maps — pain points tell you what players curse; delight points tell you why players can't stop
- **Sharper with use**: signal annotation → accuracy stats → entity trustworthiness ranking, with the feedback loop built in

## Feature Overview

### 1. Intelligence Collection

| Feature | Description |
|---|---|
| 25 sources covered | Steam (concurrent players/official most-played/news/reviews/CN bestsellers/groups/upcoming/pricing & discounts), Apple App Store free + grossing charts (CN/US), Twitch, Reddit, YouTube, itch.io rankings + Game Jams, Discord community size, Roblox concurrents, Epic free games, TapTap, Bilibili game zone, HackerNews, Google News, Wikipedia pageviews, Google Trends interest index, and more |
| Page-managed game library | You decide which games to monitor — each entity carries cross-platform footprints (Steam AppID/Apple track id/TapTap/wiki page); saved settings take effect immediately |
| Source operations | Per-source health status, last success time, and freshness badges, with automatic alerts on consecutive failures |

### 2. Data Foundation

| Feature | Description |
|---|---|
| Hourly "game candlesticks" | Raw data validated/normalized/hourly-aggregated into 13 metric time series: concurrents/rankings/mentions/rating/community size/search interest/current price & discounts, and more |
| Long-term retention | Aggregated time series are retained long term, so backtests and reviews always have history to draw on |

### 3. Six Signal Types (auto-scan + multi-channel push)

| Signal | Question it answers |
|---|---|
| Genre momentum | What's starting to be discussed |
| Cross-platform arbitrage | It's hot on PC but nobody's making the mobile version yet |
| Competitor pain point | What are players complaining about |
| Trend forecast | Where will this genre be in 6-12 months |
| Competitor downswing | Who is slipping — where's our window |
| UA poison | Who is burning money to climb the charts — false prosperity, stay away |

Signals are deduplicated on disk and pushed to Feishu / DingTalk (with signing) / Slack / Telegram / email / webhook, with page-managed channels routed by type and severity.

### 4. Verification Deep-Dive

| Feature | Description |
|---|---|
| Backtest tuning | Momentum/downswing/arbitrage strategies × 9-point parameter grid heatmaps, hit rate + payoff P50/P90 — strategies are validated on history before use |
| Pain-point reports | Negative-review clustering (pain index/share/typical quotes/micro-innovation hooks) |
| Delight-point deep-dive (AI) | One-click extraction of competitors' core experience loops, delight maps, player sentiment, and lessons for your own greenlight |
| Fake-ad concept tests | Validate genre momentum before committing: register concept creatives → AI creative brief → backfill impressions/clicks per channel → auto CTR comparison |
| AI analysis buttons | Signal interpretation/pain-point analysis/backtest review/watch brief, one click inside the page |

### 5. Decision Output

| Feature | Description |
|---|---|
| Opportunity scorecard | Pain point × downswing × arbitrage joint scoring (0-100 entry-window score) for cross-project scheduling |
| Greenlight sandbox | Enter total budget and planning horizon; get "which games, how much each, when to start" — portfolio/single-bet modes, UA poison auto-excluded |
| Niche-survival scan | A 0-100 survival score per genre root: demand heat × supply gap × head-brand breakability × small-team-won evidence |
| Same-tier survival math | Budget → break-even units → break-even review count × same-tier benchmark distribution → CLEAR/TIGHT/BELOW verdict |
| Decision weekly | Scorecard top/UA competition/genre landscape/pain-point moves in one report, with a dedicated "small-studio greenlight lens", headed by an AI editor's note (publishing-director persona): who to【launch now】and who to【avoid】this week |
| Competitor release calendar | Competitor launch timelines — supply floods at a glance |

### 6. AI Assistant Platform

| Feature | Description |
|---|---|
| Radar-context chat | Streaming chat that can attach the current page's data to the conversation |
| Natural-language queries | Ask for business data in plain language, guarded by a table allowlist, read-only transactions, timeouts, and row limits |
| AI morning report | Daily auto-summary of yesterday's metrics/signals/pain points, synthesized by LLM and pushed |
| Knowledge-base RAG | Document chunking and vector retrieval; chat answers cite the knowledge base automatically |
| Provider management | OpenAI-compatible protocol — DeepSeek/OpenAI/Qwen/GLM all work; page-managed with encrypted credentials |

### 7. Feedback Loop

| Feature | Description |
|---|---|
| Signal annotation | One-click useful/false-alarm labels, per-type accuracy stats and false-alarm attribution |
| Entity trustworthiness ranking | How accurate a genre's historical signals have been, visible at a glance |
| Data export | Signal streams/metric time series exported as CSV/Excel |

## Use Cases

- **Small/mid-studio greenlight reviews**: survival score × survival math × sandbox — turning gut-feeling greenlights into debatable, data-backed decisions
- **Indie teams choosing genres**: emerging terms and survival scans find the gaps "too small for the big studios, but with rising demand"
- **Publishers evaluating candidates**: use same-tier survival math to assess a partner team's survival odds
- **UA teams**: UA poison identifies money-burning chart climbers — don't pour ad budgets into a red ocean

## Learn More

- For the full logic of the niche-survival scan, same-tier survival math, and the greenlight sandbox, see [Small-Studio Greenlight Math](/en/game-radar/survival.md).

## Contact

- WeChat: `yang_lin_bo` (please note: Game Radar - company - name - requirement)
- Email: <yanglinbo@gmail.com>
- Ecosystem home: <https://www.gowind.cloud>
