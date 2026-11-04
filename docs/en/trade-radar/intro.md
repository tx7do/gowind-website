# GoWind Trade Radar

GoWind Trade Radar is the "product-selection quantitative brain" for export and cross-border e-commerce teams: using objective search trends, marketplace rankings, competitor reviews, and supply-chain pricing data, it **computes** the next hit category, differentiation angle, and entry window in overseas markets — turning "picking products by gut feeling" into a verifiable, data-driven decision.

Demand, competition, and cost data from three sides merge into hourly "product candlesticks"; ten product-selection signal types are auto-scanned and pushed through multiple channels; every signal strategy is backtested against historical data before daily use; and the opportunity scorecard, selection sandbox, and project tracking carry a signal all the way to "which products to build, how much to invest in each, and when to start".

> The same product paradigm as GoWind Quant — "collect → data foundation → signals → backtest → decision → feedback loop" — extended from securities markets to export product selection.

## Core Highlights

- **Three-sided data, computed product choices**: demand side (search/news/video/community buzz), competition side (rankings/prices/reviews/sellers), and cost side (1688 sourcing/FX rates/ocean freight) pooled together with hourly aggregation
- **Ten signal types covering every selection judgment**: from "what's starting to get searched" to "can we legally sell it" and "does AI recommend you"
- **Backtest first, use later**: parameter-grid backtesting for momentum/arbitrage/downswing/poison strategies, with hit rate and payoff multiples verified up front; signals get auto-settled fulfillment labels alongside manual annotations as dual ground truth
- **One line from signal to project**: opportunity scorecard → selection sandbox → one-click project adoption → seven-stage project tracking → frozen conclusion review — a closed loop in business terms
- **AI-native**: the AI answer prober tests "when overseas buyers ask AI, is it you?"; the GEO content workshop produces English content that makes AI recommend you; 22 MCP tools let AI clients like Claude/Cursor query radar data directly
- **Sharper with use**: signal annotation → accuracy stats → entity trustworthiness ranking → evidence-based tuning, with the feedback loop built in

## Feature Overview

### 1. Intelligence Collection

| Feature | Description |
|---|---|
| Demand-side sources | Google Trends interest index, Google News industry buzz, YouTube review/unboxing heat, HackerNews cross-border discussions, Wikipedia category pageviews — credential-free, ready out of the box |
| Competition-side sources | Amazon BSR bestseller rankings/prices/review streams, AliExpress hot sellers, eBay trends, TikTok commerce tag heat — all through pluggable compliant endpoints (self-built compliant collection services or data vendors) |
| Cost-side sources | 1688 offer counts/MOQ/factory prices, daily FX rates (credential-free), ocean freight indices |
| AI answer prober | Batch-questions LLMs in the voice of overseas buyers (category- and brand-level question sets) to measure "who does AI recommend, at what rank, with what sentiment", harvesting competitor leads from the recommendation lists |
| Page-managed watchlist | You decide what products/keywords to monitor — each entity carries cross-platform footprints (Amazon ASIN/AliExpress/eBay/1688/TikTok); saved settings take effect immediately; exclusion words disambiguate keywords |
| Discovery scan | Full-volume buzz scanning across a 60+ category-root library, producing an "emerging terms board" with zero configuration — claim a term into the watchlist with one click |
| Source operations | Per-source health status, last success time, and freshness badges, with automatic alerts on consecutive failures |

### 2. Data Foundation

| Feature | Description |
|---|---|
| Hourly "product candlesticks" | Raw data validated/normalized/hourly-aggregated into three time-series groups: demand (search interest/buzz/sales estimates/rankings), competition (review stock/rating/seller count/active ads), and cost (price/discount/offer count/FX/freight) |
| Long-term retention | Aggregated time series are retained long term, so backtests and reviews always have history to draw on |

### 3. Ten Signal Types (auto-scan + multi-channel push)

| Signal | Question it answers |
|---|---|
| Momentum | What's starting to be searched/discussed |
| Arbitrage | 1688 factory price × marketplace price — is the margin enough |
| Pain point | What are buyers complaining about |
| Trend forecast | Where will this category be in 6-12 months |
| Downswing | Who is slipping, leaving a market vacuum |
| Red-ocean poison | Which category is in a price war — false prosperity, stay away |
| Black hole | When do top sellers/platform private labels move in |
| Cross-market migration | Which market should we watch next |
| Compliance | Can we sell it (recall/certification red lines) |
| AI visibility | When overseas buyers ask AI, is it you |

Signals are deduplicated on disk and pushed to Feishu / DingTalk (with signing) / Slack / Telegram / email / webhook, with page-managed channels routed by type and severity.

### 4. Verification Deep-Dive

| Feature | Description |
|---|---|
| Backtest tuning | Momentum/downswing/arbitrage/poison strategies × 9-point parameter grid heatmaps, hit rate + payoff P50/P90, stratified by category — strategies are validated on history before use |
| Auto settlement | After T+N, signals automatically receive fulfillment labels per metric definitions, alongside manual annotations as dual ground truth |
| Pain-point reports | Negative-review clustering (pain index/share/typical quotes/differentiation suggestions) |
| Selling-point deep-dive (AI) | One-click extraction of competitors' core selling-point maps, buyer sentiment, and follow strategies — pain points tell you what buyers curse; selling points tell you why hits succeed |
| AI Listing drafts | Review evidence chains (avoid pitfalls from negatives + leverage positives) → title/bullet points/backend search-term drafts, with evidence provenance and compliance reminders |
| Ad-based concept tests | Validate demand with low-budget ads before committing: AI creative brief → one-click Meta/TikTok placement → 48h CTR auto-comparison |

### 5. Decision Output

| Feature | Description |
|---|---|
| Opportunity scorecard | Pain point × downswing × arbitrage joint scoring (0-100 window score) for cross-project scheduling |
| Selection sandbox | Enter total budget and planning horizon; get "which products, how much each, when to start" — red-ocean poison auto-excluded, per-category caps, launch staggering, 80-20 budget allocation; adopt a sandbox item into a project with one click |
| Project tracking | Seven-stage lifecycle (adopt → test → source → first order → launch → review/shelve); frozen conclusions turn evidence snapshots into immutable records |
| Today's action list | Seven kinds of to-dos (new signals, active alerts, stocking deadlines, pending tests, stalled projects…) in one prioritized column, pinned atop the dashboard |
| Stocking clock | Peak-season start minus production + freight lead time = latest order date, with on-time reminders |
| Decision weekly | Scorecard top/competitive landscape/pain-point moves/AI recommendation slot/project progress/stocking clock in one report, headed by an AI editor's note (head-of-selection persona): who to【launch now】and who to【avoid】this week |

### 6. AI Assistant Platform

| Feature | Description |
|---|---|
| Radar-context chat | Streaming chat that can attach the current page's data to the conversation |
| Natural-language queries | Ask for business data in plain language, with multiple read-only guardrails |
| AI morning report | Daily auto-summary of yesterday's metrics/signals/pain points, synthesized by LLM and pushed |
| Knowledge-base RAG | Document chunking and vector retrieval; chat answers cite the knowledge base automatically |
| MCP Server | 22 MCP tools (signals/metrics/weeklies/sandbox/projects/visibility…) — any AI client such as Claude Desktop, Cursor, or ZCode can query radar data directly via API keys |
| GEO content workshop | Generates English FAQs/spec & certification pages/company fact pages/site llms.txt from entity evidence chains, with differential attribution of publishing effects — "making AI recommend you" becomes a content action |

### 7. Feedback Loop

| Feature | Description |
|---|---|
| Signal annotation | One-click useful/false-alarm labels, per-type accuracy stats and false-alarm attribution |
| Entity trustworthiness ranking | How accurate a product's historical signals have been, visible at a glance |
| Conclusion calibration | Estimated margins frozen at adoption, compared against actuals at conclusion to calibrate future sandbox scoring |
| Data export | Signal streams/metric time series exported as CSV/Excel |

## Use Cases

- **Export and cross-border e-commerce teams**: product selection from gut feeling to data, with signals and sandbox scheduling on one line
- **Factories/supply chains going global**: factory prices are your strongest data — compute the margin before tooling up
- **Brands going global**: manage your "AI recommendation slot" — monitor your and competitors' AI visibility and keep improving with the GEO content workshop
- **Product-selection agencies**: multi-category discovery scanning + scorecard scheduling + project tracking as a selection pipeline

## Learn More

- For a signal-by-signal walkthrough and the "backtest first, use later, sharper with use" verification mechanism, see [Reading the Signals](/en/trade-radar/signals.md).

## Contact

- WeChat: `yang_lin_bo` (please note: Trade Radar - company - name - requirement)
- Email: <yanglinbo@gmail.com>
- Ecosystem home: <https://www.gowind.cloud>
