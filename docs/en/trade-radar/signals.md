# Reading the Signals: Trade Radar's Verification Loop

> This page is written for sourcing, operations, and procurement teammates. It walks through Trade Radar's ten signal types one by one and explains the "backtest first, use later, sharper with use" verification mechanism. It contains no category-specific conclusions and no performance figures.

## 1. Three Sides of Data: the Raw Material for Signals

| Side | Sources | Availability |
|---|---|---|
| Demand side | Google Trends interest index, Google News industry buzz, YouTube review/unboxing heat, HackerNews cross-border discussions, Wikipedia category pageviews | Credential-free, ready out of the box |
| Competition side | Amazon BSR bestseller rankings/prices/review streams, AliExpress hot sellers, eBay trends, TikTok commerce tag heat | Through pluggable compliant endpoints (self-built compliant collection services or data vendors) |
| Cost side | 1688 offer counts/MOQ/factory prices, daily FX rates, ocean freight indices | FX credential-free; others pluggable |

Data from all three sides is validated, normalized, and hourly-aggregated into each product's "candlesticks": demand (search interest/buzz/sales estimates/rankings), competition (review stock/rating/seller count/active ads), and cost (price/discount/offer count/FX/freight). Raw envelopes roll over 7 days; aggregated time series are retained long term — backtests and reviews always have history to draw on.

## 2. The Ten Signals, One by One

### 1. Momentum

**Answers**: what's starting to be searched and discussed?

**Logic**: 48-hour baseline z-score breakout + 6-hour slope confirmation — not a one-off spike, but sustained upward energy.

**How to use**: the sentinel for early-stage entry windows. Pair it with the emerging-terms board from the discovery scan; claim a term into your watchlist to keep monitoring it.

### 2. Arbitrage

**Answers**: 1688 factory price × marketplace price — is the margin enough?

**Logic**: primary-platform momentum × sourcing price spread, corrected for FX and ocean freight.

**How to use**: answers "does this product actually make money". Factory-type sellers should watch it closely — the factory price is the hardest data they own.

### 3. Pain point

**Answers**: what are buyers complaining about?

**Logic**: LLM classification + clustering of negative reviews, producing a pain index, shares, and typical quotes, plus differentiation suggestions.

**How to use**: the evidence chain for differentiated projects. Pain points tell you what buyers curse; pair with the selling-point deep-dive to learn why hits succeed.

### 4. Trend forecast

**Answers**: where will this category be in 6-12 months?

**Logic**: lifecycle model (emerging/rising/mature/declining) + a multi-source confidence score fusing discussion/search/sales/video; divergences between sources are flagged separately.

**How to use**: answers "if we enter now, will demand still be there when we finish". A must-read before long-cycle decisions like tooling and stocking.

### 5. Downswing

**Answers**: who is slipping, leaving a market vacuum?

**Logic**: sliding-window deterioration in sales/rating/seller count.

**How to use**: a follow-up window hint. A competitor collapsing doesn't mean you can catch it — run your own cost and compliance checks before adopting.

### 6. Red-ocean poison

**Answers**: which category is in a price war — false prosperity to avoid?

**Logic**: sales surge × price collapse; with category crowding (launch calendar × category dictionary).

**How to use**: a veto item. The hottest-looking category may be the one to avoid — the selection sandbox automatically excludes poisoned categories from portfolios.

### 7. Black hole

**Answers**: when do top sellers/platform private labels move in?

**Logic**: dense ad periods × ranking domination — the window in which traffic costs are being sucked dry.

**How to use**: timing hints for avoiding a head-on fight with giants. A small team staggers around them, not against them.

### 8. Cross-market migration

**Answers**: which market should we watch next?

**Logic**: volume confirmed in the baseline market × target market still flat — the time-lag window between markets.

**How to use**: a leading indicator for multi-site sellers. A product taking off in one market often leaves a quiet window in another.

### 9. Compliance

**Answers**: can we sell it at all?

**Logic**: CPSC recall-window thresholds; with certification-requirement dictionaries and sandbox red lines.

**How to use**: a one-vote project review. Recalled categories and certification-heavy categories get stopped before adoption.

### 10. AI visibility

**Answers**: when overseas buyers ask AI, is it you?

**Logic**: bidirectional detection — collapse (recommendation slot slipping/dropping out) and surge (significant lift above a water-level threshold), distinguished by a direction field, with direction-specific settlement definitions.

**How to use**: the "search ranking" of the AI era. A collapse means auditing what content actions are missing; a surge means confirming whose actions worked. The GEO content workshop produces the English content that makes AI recommend you (FAQs/spec & certification pages/company fact pages/llms.txt), with differential attribution of publishing effects.

## 3. Backtest First, Use Later

- **Parameter-grid backtesting**: momentum/downswing/arbitrage/poison strategies × 9-point parameter grid heatmaps, hit rate + payoff P50/P90, stratified by category — signal strategies are validated on history before daily use
- **Auto settlement**: after T+N, signals automatically receive fulfillment labels per metric definitions (8 of the 10 types settle automatically), alongside manual annotations as dual ground truth
- **AI analysis buttons**: signal interpretation/pain-point analysis/backtest review/watch brief, one click inside the page; the signal digest officer merges and deduplicates the day's signals, ranks them, and suggests actions

## 4. A Feedback Loop That Sharpens with Use

Annotate useful/false-alarm → per-type accuracy stats + false-alarm attribution → entity trustworthiness ranking → evidence-based backtest tuning. Signal detail pages show the post-hoc fulfillment rate of the same entity's historical signals — how accurate a product's signals have been, visible at a glance.

## 5. Pushed to People, Backstopped by the List

After deduplication, signals route by type and severity to Feishu / DingTalk (with signing) / Slack / Telegram / email / webhook (page-managed channels). The dashboard pins "Today's action list": seven kinds of to-dos — new signals, active alerts, stocking deadlines, pending tests, stalled projects, and more — in one column. The decision weekly is generated on schedule, headed by an AI editor's note (head-of-selection persona): who to【launch now】and who to【avoid】this week, a one-sentence scheduling verdict.

## 6. Data Compliance Red Lines

Marketplace ranking data (Amazon/AliExpress/eBay/TikTok Shop/1688) goes exclusively through pluggable compliant endpoints — self-built compliant collection services (respecting robots and rate limits) or data vendors, never direct page scraping; community data uses OAuth in production; Google Trends stays low-frequency. Compliance red lines are built into the collection architecture, not patched on afterwards.
