# Strategy Research

> This page describes the four strategy research paradigms supported by GoWind Quant and the research backing the platform provides for each. Everything here takes the researcher's perspective and involves no specific strategy parameters and no performance data.

Strategy research starts with an idea: "Can riding a strengthening market make money?" "When the spread between two highly correlated stocks widens, will it revert?" GoWind Quant productizes the path from idea to conclusion: **idea → codified rules → backtest validation → robustness checks → paper-trading rehearsal**, with a dedicated workbench for every step.

## 1. Four Strategy Paradigms

### 1. Trend Following

**Core idea**: identify market direction, hold with the trend, and use stop-losses to control the cost of being wrong.

| Common research challenge | Platform support |
|---|---|
| Signals on daily bars, entries on minute bars, constant switching between timeframes | Multi-timeframe market data compared side by side, with historical data aligned automatically |
| Over-idealized stop-loss assumptions distort validation results | Backtests include a slippage model and realistic fill constraints |
| Many instruments — how to allocate capital | Multi-instrument portfolio backtests with portfolio-level evaluation |

### 2. Statistical Arbitrage

**Core idea**: find pairs of highly correlated instruments and bet on reversion when the spread deviates from its historical pattern.

| Common research challenge | Platform support |
|---|---|
| Correlations break down — how do you detect it | Mean-reversion metrics and status monitoring, with automatic alerts when a relationship breaks |
| How much spread deviation counts as "enough" | Statistical measures (such as Z-Score) computed natively, with thresholds as parameters |
| Legs enter at different paces | Portfolio backtests proceed on a single timeline, reproducing the real rhythm |

### 3. Market Making

**Core idea**: quote both bid and ask prices and earn the spread; the keys are inventory management and quoting rhythm.

| Common research challenge | Platform support |
|---|---|
| The order book moves too fast to follow | Order book depth and tick trades pushed in real time — a high-frequency view without delay |
| Inventory build-up is the main risk | The paper-trading workbench shows positions and funds in real time, with configurable risk rules |
| Quoting strategies are latency-sensitive | An event-driven backtest engine reproduces market rhythm tick by tick |

### 4. Machine Learning

**Core idea**: use models to learn patterns from historical data and output buy/sell signals.

| Common research challenge | Platform support |
|---|---|
| The model "memorizes" history and fails on a new segment | Walk-forward rolling validation + Monte Carlo permutation tests |
| Too many factors — which ones actually work | 16 classic factors + IC/IR analysis + layered backtesting |
| Bridging from model to strategy | AI strategy generation turns research conclusions into backtestable strategy drafts |

## 2. From Idea to Conclusion: A Complete Research Journey

1. **Pose the idea** — observe market patterns in the data panel and use the AI assistant to check data against your intuition;
2. **Codify** — turn the idea into executable rules with strategy scripts or AI strategy generation;
3. **Quick backtest** — run a basic backtest first to check the big picture, with AI interpretation locating obvious problems fast;
4. **Parameter optimization** — grid sweeps + heatmaps: observe parameter sensitivity rather than just the best point;
5. **Robustness checks** — walk-forward validation and Monte Carlo confidence intervals filter out "overfitted" parameters;
6. **Paper-trading rehearsal** — move into the paper-trading workbench and rehearse at live pace with risk rules enabled;
7. **Daily review** — the AI daily trading report summarizes automatically, folding in sentiment and data quality changes.

## 3. Guarding Against Self-Deception: Why Robustness Checks Are Standard

The most expensive lesson in backtesting is "it only looked good in the backtest". The platform makes three lines of defense the default flow, not an option:

- **Out-of-sample validation (walk-forward)**: roll through "train on one segment, validate on the next" to reject parameters that only work in a particular window;
- **Randomized control (Monte Carlo permutation)**: shuffle the signal sequence and evaluate whether returns genuinely beat randomness;
- **Parameter stability surface (optimization heatmaps)**: genuinely robust strategies perform smoothly near the optimum; a sharp "best point" is usually overfitting.

::: tip Research discipline
The platform provides no investment advice and displays no live-trading performance; all research and rehearsal are based on historical data and simulated environments.
:::

---

- Back to the [GoWind Quant home page](/en/quant/intro.md)
