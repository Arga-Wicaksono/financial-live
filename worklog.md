---
Task ID: 1
Agent: Main
Task: Implement ALL priority data additions to the financial dashboard

Work Log:
- Analyzed existing codebase: 7 crypto pairs (Indodax), 8 forex pairs (ExchangeRate-API), Gold (fawazahmed0)
- Created 4 new API routes: stocks, indices, commodities, sentiment
- Updated existing forex API with MYR, SAR, USD/IDR change%, high/low via Yahoo Finance
- Created 4 new UI components: StocksPanel, GlobalIndices, CommoditiesGrid, SentimentBar
- Updated ForexGrid component for new data fields (3-column grid)
- Refactored page.tsx layout: 3-row layout (Crypto 45% | Stocks+Forex+Gold 35% | Global+Commodities 20%)
- Fixed Yahoo Finance API: single-symbol queries, range=5d for chartPreviousClose
- Fixed IDX30 symbol: ^IDX30 -> IDX30.JK
- Replaced CPO (FCPO=F, delisted) with Paladium (PL=F)
- Added SentimentBar with Fear & Greed gauge + BI Rate
- Build successful, all APIs returning real verified data

Stage Summary:
- All data verified real: IHSG=6332, BBCA=5975, S&P=7353, Nikkei=59755, WTI=103, Gold=4474, Fear&Greed=27(Fear), BI Rate=5.75%
- 10 forex currencies (added MYR, SAR), USD/IDR with change% and high/low
- 6 commodities: WTI, Brent, Emas, Perak, Paladium, Tembaga
- 5 global indices: S&P 500, Dow Jones, Nasdaq, Nikkei 225, Hang Seng
- Layout: no-scroll 1920x1080, 3 rows with glow separators
