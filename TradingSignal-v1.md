import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown, X, Check, RefreshCw, BarChart2, AlertTriangle, ChevronDown, Settings, Info, TrendingUp, TrendingDown, DollarSign, Clock, Percent, Activity, Target, Zap, Layers } from 'lucide-react';
import styles from './TradingSignal.module.css'; // Nếu IDE vẫn báo lỗi types, tạo thêm src/declarations.d.ts với: declare module '*.module.css';

const TradingSignal = () => {
  // Danh sách các cặp giao dịch được hỗ trợ
  const supportedPairs = [
    { symbol: 'BTCUSDT', name: 'Bitcoin' },
    { symbol: 'THETAUSDT', name: 'Theta' },
    { symbol: 'SOLUSDT', name: 'Solana' },
    { symbol: 'ETHUSDT', name: 'Ethereum' },
    { symbol: 'BNBUSDT', name: 'BNB' }
  ];

  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [signalType, setSignalType] = useState('LONG'); // LONG hoặc SHORT
  const [activeTab, setActiveTab] = useState('overview'); // overview, technical, advanced
  type SectionKey = 'entryLevels' | 'technicalIndicators' | 'marketData' | 'orderFlow';
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    entryLevels: true,
    technicalIndicators: false,
    marketData: false,
    orderFlow: false,
  });
  
  type MarketData = {
    price: number;
    priceChangePercent: number;
    high24h: number;
    low24h: number;
    volume: number;
    lastUpdate: Date | null;
  };
  
  const [marketData, setMarketData] = useState<MarketData>({
    price: 0,
    priceChangePercent: 0,
    high24h: 0,
    low24h: 0,
    volume: 0,
    lastUpdate: null,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const historicalDataRef = useRef<{
    prices: {[timeframe: string]: number[][]},
    volumes: {[timeframe: string]: number[]},
  }>({
    prices: {
      '5m': [],
      '15m': [],
      '1h': [],
      '4h': [],
      '1d': [],
    },
    volumes: {
      '5m': [],
      '15m': [],
      '1h': [],
      '4h': [],
      '1d': [],
    }
  });
  
  // Dữ liệu phân tích cho từng cặp giao dịch
  type Analytics = {
    rsi: {[timeframe: string]: number};
    ema: {[timeframe: string]: number};
    macd: {
      line: number;
      signal: number;
      histogram: number;
    };
    bb: {
      upper: number;
      middle: number;
      lower: number;
    };
    vwap: number;
    entryRangeLow: number;
    entryRangeHigh: number;
    stopLoss: number;
    takeProfitOne: number;
    takeProfitTwo: number;
    whaleFlow: string;
    rvol: string;
    deltaVolume: number;
    orderBookPressure: string;
    takerFlowAggression: string;
    fundingRate: string;
    fundingTrend: string;
    oiDelta: string;
    atrVolatility: number;
    confidence: number;
    trends: { [key: string]: boolean };
    support4h: number[];
    support1d: number[];
    liquidations: { buy: number; sell: number };
    riskRewardRatio: { r1: number; r2: number };
    signalStrength: number;
    lastSignalTime: Date | null;
  };

  const [pairAnalytics, setPairAnalytics] = useState<Record<string, Analytics>>({
    'BTCUSDT': {
      rsi: {'5m': 42.18, '15m': 45.32, '1h': 47.65, '4h': 51.23, '1d': 55.78},
      ema: {'5m': 63150.45, '15m': 63180.75, '1h': 63250.45, '4h': 62980.75, '1d': 62750.25},
      macd: {
        line: 120.5,
        signal: 110.2,
        histogram: 10.3
      },
      bb: {
        upper: 64500.25,
        middle: 63250.45,
        lower: 62000.65
      },
      vwap: 63180.35,
      entryRangeLow: 62850.50,
      entryRangeHigh: 63350.25,
      stopLoss: 62100.00,
      takeProfitOne: 64200.00,
      takeProfitTwo: 65500.00,
      whaleFlow: 'Inflow > Outflow',
      rvol: '1.25x',
      deltaVolume: 2458.32,
      orderBookPressure: '2.15x',
      takerFlowAggression: '62.38%',
      fundingRate: '0.0021%',
      fundingTrend: '0.0018%',
      oiDelta: '0.12%',
      atrVolatility: 1250.50,
      confidence: 82,
      trends: { '5m': true, '15m': true, '1h': true, '4h': true, '1d': false },
      support4h: [61200, 64800],
      support1d: [58500, 66500],
      liquidations: { buy: 1250000, sell: 850000 },
      riskRewardRatio: { r1: 2.1, r2: 3.4 },
      signalStrength: 78,
      lastSignalTime: new Date(Date.now() - 1800000) // 30 minutes ago
    },
    'THETAUSDT': {
      rsi: {'5m': 58.75, '15m': 56.32, '1h': 54.65, '4h': 52.23, '1d': 48.78},
      ema: {'5m': 1.448, '15m': 1.450, '1h': 1.452, '4h': 1.438, '1d': 1.425},
      macd: {
        line: 0.003,
        signal: 0.001,
        histogram: 0.002
      },
      bb: {
        upper: 1.52,
        middle: 1.45,
        lower: 1.38
      },
      vwap: 1.447,
      entryRangeLow: 1.425,
      entryRangeHigh: 1.465,
      stopLoss: 1.38,
      takeProfitOne: 1.52,
      takeProfitTwo: 1.58,
      whaleFlow: 'Inflow > Outflow',
      rvol: '1.85x',
      deltaVolume: 1258432.45,
      orderBookPressure: '1.72x',
      takerFlowAggression: '59.12%',
      fundingRate: '0.0045%',
      fundingTrend: '0.0038%',
      oiDelta: '0.28%',
      atrVolatility: 0.085,
      confidence: 78,
      trends: { '5m': true, '15m': true, '1h': false, '4h': true, '1d': true },
      support4h: [1.32, 1.62],
      support1d: [1.15, 1.75],
      liquidations: { buy: 125000, sell: 95000 },
      riskRewardRatio: { r1: 2.5, r2: 3.8 },
      signalStrength: 72,
      lastSignalTime: new Date(Date.now() - 3600000) // 1 hour ago
    },
    'SOLUSDT': {
      rsi: {'5m': 27.52, '15m': 29.32, '1h': 32.65, '4h': 35.23, '1d': 38.78},
      ema: {'5m': 146.25, '15m': 146.58, '1h': 146.91, '4h': 147.82, '1d': 148.25},
      macd: {
        line: -0.85,
        signal: -0.35,
        histogram: -0.5
      },
      bb: {
        upper: 152.35,
        middle: 147.82,
        lower: 143.29
      },
      vwap: 146.75,
      entryRangeLow: 145.33,
      entryRangeHigh: 145.92,
      stopLoss: 144.17,
      takeProfitOne: 146.35,
      takeProfitTwo: 147.08,
      whaleFlow: 'Outflow > Inflow',
      rvol: '0.22x',
      deltaVolume: -413061.10,
      orderBookPressure: '1.50x',
      takerFlowAggression: '57.57%',
      fundingRate: '-0.0067%',
      fundingTrend: '-0.0053%',
      oiDelta: '-0.04%',
      atrVolatility: 0.985,
      confidence: 75,
      trends: { '5m': false, '15m': true, '1h': true, '4h': false, '1d': false },
      support4h: [140.25, 153.88],
      support1d: [95.19, 157.24],
      liquidations: { buy: 0, sell: 0 },
      riskRewardRatio: { r1: 1.8, r2: 2.7 },
      signalStrength: 65,
      lastSignalTime: new Date(Date.now() - 7200000) // 2 hours ago
    },
    'ETHUSDT': {
      rsi: {'5m': 45.32, '15m': 47.32, '1h': 48.65, '4h': 46.23, '1d': 49.78},
      ema: {'5m': 3048.75, '15m': 3050.25, '1h': 3052.45, '4h': 3048.75, '1d': 3035.25},
      macd: {
        line: 5.25,
        signal: 3.75,
        histogram: 1.5
      },
      bb: {
        upper: 3120.35,
        middle: 3052.45,
        lower: 2984.55
      },
      vwap: 3049.85,
      entryRangeLow: 3025.50,
      entryRangeHigh: 3075.25,
      stopLoss: 2980.00,
      takeProfitOne: 3120.00,
      takeProfitTwo: 3200.00,
      whaleFlow: 'Inflow > Outflow',
      rvol: '0.95x',
      deltaVolume: 1258.32,
      orderBookPressure: '1.85x',
      takerFlowAggression: '58.38%',
      fundingRate: '0.0011%',
      fundingTrend: '0.0008%',
      oiDelta: '0.08%',
      atrVolatility: 75.50,
      confidence: 70,
      trends: { '5m': true, '15m': false, '1h': true, '4h': true, '1d': false },
      support4h: [2950, 3150],
      support1d: [2800, 3250],
      liquidations: { buy: 450000, sell: 320000 },
      riskRewardRatio: { r1: 2.3, r2: 3.6 },
      signalStrength: 68,
      lastSignalTime: new Date(Date.now() - 5400000) // 1.5 hours ago
    },
    'BNBUSDT': {
      rsi: {'5m': 52.18, '15m': 53.32, '1h': 51.65, '4h': 49.23, '1d': 47.78},
      ema: {'5m': 576.25, '15m': 577.35, '1h': 578.45, '4h': 575.75, '1d': 572.25},
      macd: {
        line: 1.25,
        signal: 0.95,
        histogram: 0.3
      },
      bb: {
        upper: 590.35,
        middle: 578.45,
        lower: 566.55
      },
      vwap: 577.85,
      entryRangeLow: 572.50,
      entryRangeHigh: 582.25,
      stopLoss: 565.00,
      takeProfitOne: 590.00,
      takeProfitTwo: 605.00,
      whaleFlow: 'Inflow > Outflow',
      rvol: '1.05x',
      deltaVolume: 3258.32,
      orderBookPressure: '1.65x',
      takerFlowAggression: '56.38%',
      fundingRate: '0.0015%',
      fundingTrend: '0.0012%',
      oiDelta: '0.10%',
      atrVolatility: 12.50,
      confidence: 68,
      trends: { '5m': false, '15m': true, '1h': true, '4h': false, '1d': true },
      support4h: [560, 595],
      support1d: [540, 610],
      liquidations: { buy: 350000, sell: 280000 },
      riskRewardRatio: { r1: 2.0, r2: 3.2 },
      signalStrength: 62,
      lastSignalTime: new Date(Date.now() - 10800000) // 3 hours ago
    }
  });

  // Các hàm tính toán chỉ báo kỹ thuật
  const calculateRSI = (prices: number[], periods = 14) => {
    if (prices.length < periods + 1) {
      return 50;
    }
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= periods; i++) {
      const difference = prices[i] - prices[i-1];
      if (difference >= 0) {
        gains += difference;
      } else {
        losses -= difference;
      }
    }
    
    let avgGain = gains / periods;
    let avgLoss = losses / periods;
    
    for (let i = periods + 1; i < prices.length; i++) {
      const difference = prices[i] - prices[i-1];
      
      if (difference >= 0) {
        avgGain = (avgGain * (periods - 1) + difference) / periods;
        avgLoss = (avgLoss * (periods - 1)) / periods;
      } else {
        avgGain = (avgGain * (periods - 1)) / periods;
        avgLoss = (avgLoss * (periods - 1) - difference) / periods;
      }
    }
    
    if (avgLoss === 0) {
      return 100;
    }
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  };

  const calculateEMA = (prices: number[], periods: number, previousEMA?: number) => {
    if (!previousEMA && prices.length < periods) {
      return prices.reduce((sum, price) => sum + price, 0) / prices.length;
    }
    
    const multiplier = 2 / (periods + 1);
    
    if (!previousEMA) {
      const sma = prices.slice(0, periods).reduce((sum, price) => sum + price, 0) / periods;
      return sma;
    }
    
    return (prices[prices.length - 1] - previousEMA) * multiplier + previousEMA;
  };

  const calculateMACD = (prices: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
    if (prices.length < Math.max(fastPeriod, slowPeriod) + signalPeriod) {
      return { line: 0, signal: 0, histogram: 0 };
    }
    
    const fastEMA = calculateEMA(prices, fastPeriod);
    const slowEMA = calculateEMA(prices, slowPeriod);
    const macdLine = fastEMA - slowEMA;
    
    const macdValues = [];
    for (let i = 0; i < prices.length - Math.max(fastPeriod, slowPeriod); i++) {
      const slicedPrices = prices.slice(0, Math.max(fastPeriod, slowPeriod) + i);
      const fastEMA = calculateEMA(slicedPrices, fastPeriod);
      const slowEMA = calculateEMA(slicedPrices, slowPeriod);
      macdValues.push(fastEMA - slowEMA);
    }
    
    const signalLine = calculateEMA(macdValues, signalPeriod);
    const histogram = macdLine - signalLine;
    
    return { line: macdLine, signal: signalLine, histogram };
  };

  const calculateBollingerBands = (prices: number[], periods = 20, multiplier = 2) => {
    if (prices.length < periods) {
      return { upper: prices[prices.length-1] * 1.05, middle: prices[prices.length-1], lower: prices[prices.length-1] * 0.95 };
    }
    
    const slicedPrices = prices.slice(prices.length - periods);
    const sma = slicedPrices.reduce((sum, price) => sum + price, 0) / periods;
    
    const squaredDifferences = slicedPrices.map(price => Math.pow(price - sma, 2));
    const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / periods;
    const stdDev = Math.sqrt(variance);
    
    return {
      upper: sma + (multiplier * stdDev),
      middle: sma,
      lower: sma - (multiplier * stdDev)
    };
  };

  const calculateVWAP = (prices: number[][], volumes: number[]) => {
    if (prices.length === 0 || volumes.length === 0) {
      return 0;
    }
    
    let cumulativeTPV = 0;
    let cumulativeVolume = 0;
    
    for (let i = 0; i < Math.min(prices.length, volumes.length); i++) {
      const typicalPrice = (prices[i][1] + prices[i][2] + prices[i][4]) / 3;
      cumulativeTPV += typicalPrice * volumes[i];
      cumulativeVolume += volumes[i];
    }
    
    return cumulativeVolume === 0 ? prices[prices.length-1][4] : cumulativeTPV / cumulativeVolume;
  };

  const calculateATR = (prices: number[][], periods = 14) => {
    if (prices.length < 2) {
      return 0;
    }
    
    const trueRanges = [];
    
    for (let i = 1; i < prices.length; i++) {
      const high = prices[i][2];
      const low = prices[i][3];
      const previousClose = prices[i-1][4];
      
      const tr1 = high - low;
      const tr2 = Math.abs(high - previousClose);
      const tr3 = Math.abs(low - previousClose);
      
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    
    if (trueRanges.length < periods) {
      return trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length;
    }
    
    let atr = trueRanges.slice(0, periods).reduce((sum, tr) => sum + tr, 0) / periods;
    
    for (let i = periods; i < trueRanges.length; i++) {
      atr = ((atr * (periods - 1)) + trueRanges[i]) / periods;
    }
    
    return atr;
  };

  // WebSocket và các hàm xử lý dữ liệu
  const connectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${selectedSymbol.toLowerCase()}@trade/${selectedSymbol.toLowerCase()}@depth10@100ms`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.e === 'trade') {
        setMarketData(prev => ({
          ...prev,
          price: parseFloat(data.p),
          lastUpdate: new Date()
        }));
      }
      
      if (data.e === 'depthUpdate') {
        let bidVolume = 0;
        let askVolume = 0;
        
        data.b.forEach((bid: string[]) => {
          bidVolume += parseFloat(bid[0]) * parseFloat(bid[1]);
        });
        
        data.a.forEach((ask: string[]) => {
          askVolume += parseFloat(ask[0]) * parseFloat(ask[1]);
        });
        
        const orderBookPressure = askVolume === 0 ? 99 : bidVolume / askVolume;
        
        updateOrderBookPressure(selectedSymbol, orderBookPressure);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('WebSocket connection error. Falling back to REST API.');
      
      fetchBinanceData();
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
    
    wsRef.current = ws;
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  };

  // Các hàm fetch dữ liệu
  const fetchHistoricalData = async () => {
    try {
      const timeframes = ['5m', '15m', '1h', '4h', '1d'];
      const promises = timeframes.map(timeframe => 
        fetch(`https://api.binance.com/api/v3/klines?symbol=${selectedSymbol}&interval=${timeframe}&limit=100`)
          .then(res => res.json())
      );
      
      const results = await Promise.all(promises);
      
      results.forEach((data, index) => {
        const timeframe = timeframes[index];
        
        historicalDataRef.current.prices[timeframe] = data;
        historicalDataRef.current.volumes[timeframe] = data.map((candle: any[]) => parseFloat(candle[5]));
        
        const closePrices = data.map((candle: any[]) => parseFloat(candle[4]));
        
        const rsi = calculateRSI(closePrices, timeframe === '1d' ? 14 : timeframe === '4h' ? 14 : timeframe === '1h' ? 14 : 14);
        
        const ema = calculateEMA(
          closePrices, 
          timeframe === '1d' ? 21 : timeframe === '4h' ? 21 : timeframe === '1h' ? 21 : timeframe === '15m' ? 21 : 21,
          pairAnalytics[selectedSymbol]?.ema[timeframe]
        );
        
        setPairAnalytics(prev => ({
          ...prev,
          [selectedSymbol]: {
            ...prev[selectedSymbol],
            rsi: {
              ...prev[selectedSymbol].rsi,
              [timeframe]: parseFloat(rsi.toFixed(2))
            },
            ema: {
              ...prev[selectedSymbol].ema,
              [timeframe]: parseFloat(ema.toFixed(selectedSymbol === 'BTCUSDT' ? 2 : 4))
            }
          }
        }));
      });
      
      const data1h = results[2];
      if (data1h && data1h.length > 0) {
        const closePrices = data1h.map((candle: any[]) => parseFloat(candle[4]));
        const highPrices = data1h.map((candle: any[]) => parseFloat(candle[2]));
        const lowPrices = data1h.map((candle: any[]) => parseFloat(candle[3]));
        const volumes = data1h.map((candle: any[]) => parseFloat(candle[5]));
        
        const macd = calculateMACD(closePrices);
        const bb = calculateBollingerBands(closePrices);
        const vwap = calculateVWAP(data1h, volumes);
        const atr = calculateATR(data1h);
        
        setPairAnalytics(prev => ({
          ...prev,
          [selectedSymbol]: {
            ...prev[selectedSymbol],
            macd: {
              line: parseFloat(macd.line.toFixed(selectedSymbol === 'BTCUSDT' ? 2 : 4)),
              signal: parseFloat(macd.signal.toFixed(selectedSymbol === 'BTCUSDT' ? 2 : 4)),
              histogram: parseFloat(macd.histogram.toFixed(selectedSymbol === 'BTCUSDT' ? 2 : 4))
            },
            bb: {
              upper: parseFloat(bb.upper.toFixed(selectedSymbol === 'BTCUSDT' ? 2 : 4)),
              middle: parseFloat(bb.middle.toFixed(selectedSymbol === 'BTCUSDT' ? 2 : 4)),
              lower: parseFloat(bb.lower.toFixed(selectedSymbol === 'BTCUSDT' ? 2 : 4))
            },
            vwap: parseFloat(vwap.toFixed(selectedSymbol === 'BTCUSDT' ? 2 : 4)),
            atrVolatility: parseFloat(atr.toFixed(selectedSymbol === 'BTCUSDT' ? 2 : 4))
          }
        }));
      }
      
    } catch (err) {
      console.error('Error fetching historical data:', err);
      setError('Failed to fetch historical data for technical indicators.');
    }
  };

  const fetchBinanceData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const tickerResponse = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${selectedSymbol}`);
      if (!tickerResponse.ok) throw new Error('Failed to fetch ticker data');
      
      const tickerData = await tickerResponse.json();
      
      setMarketData({
        price: parseFloat(tickerData.lastPrice),
        priceChangePercent: parseFloat(tickerData.priceChangePercent),
        high24h: parseFloat(tickerData.highPrice),
        low24h: parseFloat(tickerData.lowPrice),
        volume: parseFloat(tickerData.volume),
        lastUpdate: new Date()
      });
      
      await fetchHistoricalData();
      
      updateTradeParameters(selectedSymbol, parseFloat(tickerData.lastPrice));
      
      const orderBookResponse = await fetch(`https://api.binance.com/api/v3/depth?symbol=${selectedSymbol}&limit=100`);
      if (orderBookResponse.ok) {
        const orderBookData = await orderBookResponse.json();
        
        const bidVolume = orderBookData.bids.reduce((sum: number, bid: string[]) => sum + (parseFloat(bid[0]) * parseFloat(bid[1])), 0);
        const askVolume = orderBookData.asks.reduce((sum: number, ask: string[]) => sum + (parseFloat(ask[0]) * parseFloat(ask[1])), 0);
        
        const orderBookPressure = askVolume === 0 ? 99 : bidVolume / askVolume;
        
        updateOrderBookPressure(selectedSymbol, orderBookPressure);
      }
      
      try {
        const fundingResponse = await fetch(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${selectedSymbol}&limit=1`);
        if (fundingResponse.ok) {
          const fundingData = await fundingResponse.json();
          if (fundingData.length > 0) {
            updateFundingRate(selectedSymbol, parseFloat(fundingData[0].fundingRate) * 100);
          }
        }
      } catch (fundingErr) {
        console.log('Funding rate fetch failed, might not be a futures market');
      }
      
      updateSignalStrength(selectedSymbol);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch market data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const updateTradeParameters = (symbol: string, currentPrice: number) => {
    const analytics = {...pairAnalytics[symbol]};
    const atr = analytics.atrVolatility;
    
    if (signalType === 'LONG') {
      analytics.entryRangeLow = parseFloat((currentPrice - 0.5 * atr).toFixed(symbol === 'BTCUSDT' ? 2 : 4));
      analytics.entryRangeHigh = parseFloat((currentPrice + 0.2 * atr).toFixed(symbol === 'BTCUSDT' ? 2 : 4));
      
      analytics.stopLoss = parseFloat((currentPrice - 2 * atr).toFixed(symbol === 'BTCUSDT' ? 2 : 4));
      
      const risk = currentPrice - analytics.stopLoss;
      analytics.takeProfitOne = parseFloat((currentPrice + risk * analytics.riskRewardRatio.r1).toFixed(symbol === 'BTCUSDT' ? 2 : 4));
      analytics.takeProfitTwo = parseFloat((currentPrice + risk * analytics.riskRewardRatio.r2).toFixed(symbol === 'BTCUSDT' ? 2 : 4));
    } else {
      analytics.entryRangeLow = parseFloat((currentPrice - 0.2 * atr).toFixed(symbol === 'BTCUSDT' ? 2 : 4));
      analytics.entryRangeHigh = parseFloat((currentPrice + 0.5 * atr).toFixed(symbol === 'BTCUSDT' ? 2 : 4));
      
      analytics.stopLoss = parseFloat((currentPrice + 2 * atr).toFixed(symbol === 'BTCUSDT' ? 2 : 4));
      
      const risk = analytics.stopLoss - currentPrice;
      analytics.takeProfitOne = parseFloat((currentPrice - risk * analytics.riskRewardRatio.r1).toFixed(symbol === 'BTCUSDT' ? 2 : 4));
      analytics.takeProfitTwo = parseFloat((currentPrice - risk * analytics.riskRewardRatio.r2).toFixed(symbol === 'BTCUSDT' ? 2 : 4));
    }
    
    analytics.support4h = [
      parseFloat((analytics.bb.lower).toFixed(symbol === 'BTCUSDT' ? 2 : 4)),
      parseFloat((analytics.bb.upper).toFixed(symbol === 'BTCUSDT' ? 2 : 4))
    ];
    
    setPairAnalytics((prev) => ({
      ...prev,
      [symbol]: analytics
    }));
  };
  
  const updateOrderBookPressure = (symbol: string, pressure: number) => {
    setPairAnalytics((prev) => ({
      ...prev,
      [symbol]: {
        ...prev[symbol],
        orderBookPressure: pressure.toFixed(2) + 'x',
        takerFlowAggression: (pressure > 1 ? 
          (50 + Math.min(pressure * 5, 30)).toFixed(2) : 
          (50 - Math.min((1/pressure) * 5, 30)).toFixed(2)) + '%'
      }
    }));
  };
  
  const updateFundingRate = (symbol: string, rate: number) => {
    const fundingTrend = rate * 0.85;
    
    setPairAnalytics((prev) => ({
      ...prev,
      [symbol]: {
        ...prev[symbol],
        fundingRate: rate.toFixed(4) + '%',
        fundingTrend: fundingTrend.toFixed(4) + '%',
        oiDelta: ((rate - fundingTrend) * 10).toFixed(2) + '%'
      }
    }));
  };
  
  const updateSignalStrength = (symbol: string) => {
    const analytics = pairAnalytics[symbol];
    
    const timeframes = ['5m', '15m', '1h', '4h', '1d'];
    let timeframeConfirmations = 0;
    
    timeframes.forEach(tf => {
      const isLongSignal = signalType === 'LONG';
      const rsiConfirms = isLongSignal ? 
        (analytics.rsi[tf] < 40 && analytics.rsi[tf] > 20) : 
        (analytics.rsi[tf] > 60 && analytics.rsi[tf] < 80);
      
      const emaConfirms = isLongSignal ?
        (analytics.ema[tf] < marketData.price) : 
        (analytics.ema[tf] > marketData.price);
      
      if (rsiConfirms && emaConfirms) {
        timeframeConfirmations++;
      }
    });
    
    const macdConfirms = signalType === 'LONG' ?
      (analytics.macd.histogram > 0 && analytics.macd.histogram > analytics.macd.histogram) :
      (analytics.macd.histogram < 0 && analytics.macd.histogram < analytics.macd.histogram);
    
    const bbConfirms = signalType === 'LONG' ?
      (marketData.price < analytics.bb.lower * 1.01) : 
      (marketData.price > analytics.bb.upper * 0.99);
    
    const volumeConfirms = parseFloat(analytics.rvol) > 1.2;
    
    const obConfirms = signalType === 'LONG' ?
      (parseFloat(analytics.orderBookPressure) > 1.2) :
      (parseFloat(analytics.orderBookPressure) < 0.8);
    
    const whaleConfirms = signalType === 'LONG' ?
      analytics.whaleFlow.includes('Inflow > Outflow') :
      analytics.whaleFlow.includes('Outflow > Inflow');
    
    const signalStrength = (
      (timeframeConfirmations / timeframes.length) * 40 + 
      (macdConfirms ? 15 : 0) +                          
      (bbConfirms ? 10 : 0) +                            
      (volumeConfirms ? 10 : 0) +                        
      (obConfirms ? 15 : 0) +                            
      (whaleConfirms ? 10 : 0)                           
    );
    
    const confidence = Math.min(Math.max(Math.round(signalStrength), 0), 100);
    
    setPairAnalytics((prev) => ({
      ...prev,
      [symbol]: {
        ...prev[symbol],
        signalStrength: parseFloat(signalStrength.toFixed(1)),
        confidence,
        lastSignalTime: confidence > 75 && Math.abs(confidence - prev[symbol].confidence) > 10 ?
          new Date() : prev[symbol].lastSignalTime
      }
    }));
  };
  
  useEffect(() => {
    fetchBinanceData();
    connectWebSocket();
    
    const intervalId = setInterval(() => {
      fetchHistoricalData();
    }, 60000);
    
    return () => {
      clearInterval(intervalId);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [selectedSymbol, signalType]);
  
  // Các hàm tiện ích
  const formatNumber = (num: number, decimals = 2) => {
    return num?.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) || '0';
  };
  
  const formatLargeNumber = (num: number) => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(2) + 'B';
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  };
  
  // Lấy dữ liệu phân tích hiện tại
  const currentAnalytics = pairAnalytics[selectedSymbol] || {};
  
  // Xác định giá so với EMA
  const isPriceAboveEma1h = marketData.price > currentAnalytics.ema?.['1h'];
  const isPriceAboveEma4h = marketData.price > currentAnalytics.ema?.['4h'];
  
  // Tính toán tỷ lệ rủi ro/lợi nhuận
  const calculateRiskReward = () => {
    const entry = (currentAnalytics.entryRangeLow + currentAnalytics.entryRangeHigh) / 2;
    const stopLoss = currentAnalytics.stopLoss;
    const tp1 = currentAnalytics.takeProfitOne;
    const tp2 = currentAnalytics.takeProfitTwo;
    
    const risk = Math.abs(entry - stopLoss);
    const reward1 = Math.abs(entry - tp1);
    const reward2 = Math.abs(entry - tp2);
    
    const rr1 = (reward1 / risk).toFixed(2);
    const rr2 = (reward2 / risk).toFixed(2);
    
    return { rr1, rr2 };
  };
  
  const { rr1, rr2 } = calculateRiskReward();
  
  // Tạo tóm tắt giao dịch
  const generateTradingSummary = () => {
    const analytics = currentAnalytics;
    const price = marketData.price;
    
    const timeframes = ['5m', '15m', '1h', '4h', '1d'];
    const trendCount = timeframes.reduce((count, tf) => {
      return count + (analytics.trends?.[tf] ? 1 : 0);
    }, 0);
    
    const overallTrend = trendCount >= 3 ? 'bullish' : trendCount <= 2 ? 'bearish' : 'neutral';
    
    const bbWidth = (analytics.bb?.upper - analytics.bb?.lower) / analytics.bb?.middle;
    const isVolatilityLow = bbWidth < 0.03;
    
    const rsiDivergence = 
      (price > analytics.ema?.['1h'] && analytics.rsi?.['1h'] < 50) || 
      (price < analytics.ema?.['1h'] && analytics.rsi?.['1h'] > 50);
    
    const macdCrossover = 
      (analytics.macd?.histogram > 0 && analytics.macd?.histogram < 0.1) || 
      (analytics.macd?.histogram < 0 && analytics.macd?.histogram > -0.1);
    
    let summary = '';
    
    if (signalType === 'LONG') {
      if (overallTrend === 'bullish') {
        summary = `${supportedPairs.find(p => p.symbol === selectedSymbol)?.name || selectedSymbol} đang cho thấy xu hướng tăng mạnh trên ${trendCount}/${timeframes.length} khung thời gian. `;
        
        if (analytics.rsi?.['1h'] < 40) {
          summary += `RSI đang ở vùng quá bán (${analytics.rsi?.['1h']}), cho thấy cơ hội mua tốt. `;
        } else if (analytics.rsi?.['1h'] > 60) {
          summary += `RSI đang ở mức cao (${analytics.rsi?.['1h']}), cần thận trọng với khả năng điều chỉnh. `;
        }
        
        if (price < analytics.bb?.lower) {
          summary += `Giá đang dưới dải Bollinger dưới, có thể phục hồi. `;
        } else if (price > analytics.bb?.upper) {
          summary += `Giá đang trên dải Bollinger trên, có thể chịu áp lực bán. `;
        }
        
        if (parseFloat(analytics.orderBookPressure) > 1.5) {
          summary += `Áp lực mua trong order book mạnh (${analytics.orderBookPressure}). `;
        }
        
        if (analytics.macd?.histogram > 0) {
          summary += `MACD tích cực với histogram dương. `;
        }
      } else {
        summary = `Mặc dù tín hiệu LONG, ${supportedPairs.find(p => p.symbol === selectedSymbol)?.name || selectedSymbol} chỉ tăng trên ${trendCount}/${timeframes.length} khung thời gian. `;
        
        if (rsiDivergence) {
          summary += `Có dấu hiệu phân kỳ RSI, cần thận trọng. `;
        }
        
        if (isVolatilityLow) {
          summary += `Biến động thấp, có thể sắp có bùng nổ giá. `;
        }
      }
    } else { // SHORT
      if (overallTrend === 'bearish') {
        summary = `${supportedPairs.find(p => p.symbol === selectedSymbol)?.name || selectedSymbol} đang cho thấy xu hướng giảm trên ${5-trendCount}/${timeframes.length} khung thời gian. `;
        
        if (analytics.rsi?.['1h'] > 60) {
          summary += `RSI đang ở vùng quá mua (${analytics.rsi?.['1h']}), cho thấy cơ hội bán tốt. `;
        } else if (analytics.rsi?.['1h'] < 40) {
          summary += `RSI đang ở mức thấp (${analytics.rsi?.['1h']}), cần thận trọng với khả năng phục hồi. `;
        }
        
        if (price > analytics.bb?.upper) {
          summary += `Giá đang trên dải Bollinger trên, có thể điều chỉnh. `;
        } else if (price < analytics.bb?.lower) {
          summary += `Giá đang dưới dải Bollinger dưới, có thể phục hồi. `;
        }
        
        if (parseFloat(analytics.orderBookPressure) < 0.7) {
          summary += `Áp lực bán trong order book mạnh (${analytics.orderBookPressure}). `;
        }
        
        if (analytics.macd?.histogram < 0) {
          summary += `MACD tiêu cực với histogram âm. `;
        }
      } else {
        summary = `Mặc dù tín hiệu SHORT, ${supportedPairs.find(p => p.symbol === selectedSymbol)?.name || selectedSymbol} chỉ giảm trên ${5-trendCount}/${timeframes.length} khung thời gian. `;
        
        if (rsiDivergence) {
          summary += `Có dấu hiệu phân kỳ RSI, cần thận trọng. `;
        }
        
        if (isVolatilityLow) {
          summary += `Biến động thấp, có thể sắp có bùng nổ giá. `;
        }
      }
    }
    
    summary += `Tỷ lệ risk/reward: R1=${rr1}, R2=${rr2}. `;
    
    if (analytics.fundingRate) {
      summary += `Funding rate: ${analytics.fundingRate} (${parseFloat(analytics.fundingRate) > 0 ? "longs trả shorts" : "shorts trả longs"}). `;
    }
    
    return summary;
  };

  // Toggle section expansion
  const toggleSection = (section: SectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  
  // Render indicator status with color coding
  const renderIndicatorStatus = (value: number | string, type: 'rsi' | 'macd' | 'bb' | 'trend' | 'pressure' | 'volume') => {
    if (type === 'rsi') {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (signalType === 'LONG') {
        return numValue < 30 ? styles.textGreen : numValue > 70 ? styles.textRed : styles.textGray;
      } else {
        return numValue > 70 ? styles.textGreen : numValue < 30 ? styles.textRed : styles.textGray;
      }
    } else if (type === 'macd') {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (signalType === 'LONG') {
        return numValue > 0 ? styles.textGreen : styles.textRed;
      } else {
        return numValue < 0 ? styles.textGreen : styles.textRed;
      }
    } else if (type === 'bb') {
      return styles.textBlue;
    } else if (type === 'trend') {
      return value ? styles.textGreen : styles.textRed;
    } else if (type === 'pressure') {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (signalType === 'LONG') {
        return numValue > 1 ? styles.textGreen : styles.textRed;
      } else {
        return numValue < 1 ? styles.textGreen : styles.textRed;
      }
    } else if (type === 'volume') {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      return numValue > 1 ? styles.textGreen : styles.textGray;
    }
    return styles.textGray;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={`${styles.statusDot} ${
              currentAnalytics.confidence >= 75 ? styles.statusGreen : 
              currentAnalytics.confidence >= 60 ? styles.statusYellow : 
              styles.statusRed
            }`}></div>
            <h2 className={styles.headerTitle}>Trading Signal</h2>
          </div>
          <div className={styles.headerRight}>
            <button 
              className={styles.iconButton}
              onClick={fetchBinanceData}
              disabled={loading}
            >
              <RefreshCw size={18} className={loading ? styles.spin : ""} />
            </button>
            <button className={styles.iconButton}>
              <Settings size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Symbol and Type Selector */}
      <div className={styles.selectorBar}>
        <div className={styles.selectorLeft}>
          <select 
            className={styles.symbolSelector}
            value={selectedSymbol}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedSymbol(e.target.value)}
          >
            {supportedPairs.map(pair => (
              <option key={pair.symbol} value={pair.symbol}>{pair.symbol}</option>
            ))}
          </select>
          
          <div className={styles.signalTypeSelector}>
            <button 
              className={`${styles.signalTypeButton} ${signalType === 'LONG' ? styles.signalTypeLong : ''}`}
              onClick={() => setSignalType('LONG')}
            >
              LONG
            </button>
            <button 
              className={`${styles.signalTypeButton} ${signalType === 'SHORT' ? styles.signalTypeShort : ''}`}
              onClick={() => setSignalType('SHORT')}
            >
              SHORT
            </button>
          </div>
        </div>
        
        <div className={`${styles.confidenceBadge} ${
          currentAnalytics.confidence >= 75 ? styles.confidenceHigh : 
          currentAnalytics.confidence >= 60 ? styles.confidenceMedium : 
          styles.confidenceLow
        }`}>
          {currentAnalytics.confidence || 0}% CONFIDENCE
        </div>
      </div>

      {/* Price and Change */}
      <div className={styles.priceBar}>
        <div>
          <div className={styles.pairName}>
            {supportedPairs.find(p => p.symbol === selectedSymbol)?.name || selectedSymbol}
          </div>
          <div className={styles.priceDisplay}>
            ${formatNumber(marketData.price, selectedSymbol === 'BTCUSDT' ? 2 : 4)}
            <span className={`${styles.priceChange} ${marketData.priceChangePercent >= 0 ? styles.textGreen : styles.textRed}`}>
              {marketData.priceChangePercent >= 0 ? "+" : ""}{formatNumber(marketData.priceChangePercent, 2)}%
            </span>
          </div>
        </div>
        
        <div className={styles.signalStrengthContainer}>
          <div className={styles.signalStrengthLabel}>Signal Strength</div>
          <div className={styles.signalStrengthBar}>
            <div 
              className={`${styles.signalStrengthFill} ${
                currentAnalytics.signalStrength >= 75 ? styles.strengthHigh : 
                currentAnalytics.signalStrength >= 50 ? styles.strengthMedium : 
                styles.strengthLow
              }`}
              style={{ width: `${currentAnalytics.signalStrength}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className={styles.errorMessage}>
          <AlertTriangle size={16} className={styles.errorIcon} />
          <span>{error}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className={styles.tabNav}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'overview' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'technical' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('technical')}
        >
          Technical
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'advanced' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          Advanced
        </button>
      </div>

      {/* Content based on active tab */}
      <div className={styles.tabContent}>
        {activeTab === 'overview' && (
          <>
            {/* Entry Levels */}
            <div className={styles.section}>
              <div 
                className={styles.sectionHeader} 
                onClick={() => toggleSection('entryLevels')}
              >
                <div className={styles.sectionTitle}>
                  <Target size={16} className={styles.sectionIcon} />
                  <h3 className={styles.sectionHeading}>Entry & Exit Levels</h3>
                </div>
                <ChevronDown 
                  size={18} 
                  className={`${styles.chevron} ${expandedSections.entryLevels ? styles.chevronUp : ''}`} 
                />
              </div>
              
              {expandedSections.entryLevels && (
                <div className={styles.sectionBody}>
                  <div className={styles.levelsGrid}>
                    <div className={styles.levelItem}>
                      <div className={styles.levelLabel}>Entry Range</div>
                      <div className={styles.levelValue}>
                        {formatNumber(currentAnalytics.entryRangeLow, selectedSymbol === 'BTCUSDT' ? 2 : 4)} - {formatNumber(currentAnalytics.entryRangeHigh, selectedSymbol === 'BTCUSDT' ? 2 : 4)}
                      </div>
                    </div>
                    <div className={styles.levelItem}>
                      <div className={styles.levelLabel}>Stop Loss</div>
                      <div className={`${styles.levelValue} ${styles.textRed}`}>
                        {formatNumber(currentAnalytics.stopLoss, selectedSymbol === 'BTCUSDT' ? 2 : 4)}
                      </div>
                    </div>
                    <div className={styles.levelItem}>
                      <div className={styles.levelLabel}>Take Profit 1</div>
                      <div className={`${styles.levelValue} ${styles.textGreen}`}>
                        {formatNumber(currentAnalytics.takeProfitOne, selectedSymbol === 'BTCUSDT' ? 2 : 4)}
                      </div>
                    </div>
                    <div className={styles.levelItem}>
                      <div className={styles.levelLabel}>Take Profit 2</div>
                      <div className={`${styles.levelValue} ${styles.textGreen}`}>
                        {formatNumber(currentAnalytics.takeProfitTwo, selectedSymbol === 'BTCUSDT' ? 2 : 4)}
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.riskReward}>
                    <div className={styles.riskRewardLabel}>Risk/Reward:</div>
                    <span className={parseFloat(rr1) >= 2 ? styles.textGreen : styles.textYellow}>
                      {rr1}R, {rr2}R
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Market Data */}
            <div className={styles.section}>
              <div 
                className={styles.sectionHeader} 
                onClick={() => toggleSection('marketData')}
              >
                <div className={styles.sectionTitle}>
                  <BarChart2 size={16} className={styles.sectionIcon} />
                  <h3 className={styles.sectionHeading}>Market Data</h3>
                </div>
                <ChevronDown 
                  size={18} 
                  className={`${styles.chevron} ${expandedSections.marketData ? styles.chevronUp : ''}`} 
                />
              </div>
              
              {expandedSections.marketData && (
                <div className={styles.sectionBody}>
                  <div className={styles.marketDataGrid}>
                    <div className={styles.marketDataItem}>
                      <div className={styles.marketDataLabel}>24h High</div>
                      <div className={`${styles.marketDataValue} ${styles.textGreen}`}>
                        ${formatNumber(marketData.high24h, selectedSymbol === 'BTCUSDT' ? 2 : 4)}
                      </div>
                    </div>
                    <div className={styles.marketDataItem}>
                      <div className={styles.marketDataLabel}>24h Low</div>
                      <div className={`${styles.marketDataValue} ${styles.textRed}`}>
                        ${formatNumber(marketData.low24h, selectedSymbol === 'BTCUSDT' ? 2 : 4)}
                      </div>
                    </div>
                    <div className={styles.marketDataItem}>
                      <div className={styles.marketDataLabel}>24h Volume</div>
                      <div className={styles.marketDataValue}>
                        ${formatLargeNumber(marketData.volume)}
                      </div>
                    </div>
                    <div className={styles.marketDataItem}>
                      <div className={styles.marketDataLabel}>Volume Change</div>
                      <div className={`${styles.marketDataValue} ${currentAnalytics.deltaVolume >= 0 ? styles.textGreen : styles.textRed}`}>
                        {currentAnalytics.deltaVolume >= 0 ? "+" : ""}{formatLargeNumber(currentAnalytics.deltaVolume)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Signal Summary */}
            <div className={styles.section}>
              <div className={styles.sectionTitleSimple}>
                <Info size={16} className={styles.sectionIcon} />
                <h3 className={styles.sectionHeading}>Signal Summary</h3>
              </div>
              <div className={styles.summaryBox}>
                <p>{generateTradingSummary()}</p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className={styles.quickStats}>
              <div className={styles.statBox}>
                <div className={styles.statLabel}>ATR (Volatility)</div>
                <div className={styles.statValue}>
                  {formatNumber(currentAnalytics.atrVolatility, selectedSymbol === 'BTCUSDT' ? 2 : 4)}
                  <span className={styles.statSubtext}>
                    ({formatNumber(currentAnalytics.atrVolatility / marketData.price * 100, 2)}%)
                  </span>
                </div>
              </div>
              
              <div className={styles.statBox}>
                <div className={styles.statLabel}>RVOL</div>
                <div className={`${styles.statValue} ${renderIndicatorStatus(currentAnalytics.rvol, 'volume')}`}>
                  {currentAnalytics.rvol}
                </div>
              </div>
              
              <div className={styles.statBox}>
                <div className={styles.statLabel}>Order Book Pressure</div>
                <div className={`${styles.statValue} ${renderIndicatorStatus(parseFloat(currentAnalytics.orderBookPressure), 'pressure')}`}>
                  {currentAnalytics.orderBookPressure}
                </div>
              </div>
              
              <div className={styles.statBox}>
              <div className={styles.statLabel}>Funding Rate</div>
                <div className={`${styles.statValue} ${parseFloat(currentAnalytics.fundingRate) < 0 ? styles.textGreen : styles.textRed}`}>
                  {currentAnalytics.fundingRate}
                </div>
              </div>
            </div>
          </>
        )}
        
        {activeTab === 'technical' && (
          <>
            {/* Technical Indicators */}
            <div className={styles.section}>
              <div 
                className={styles.sectionHeader} 
                onClick={() => toggleSection('technicalIndicators')}
              >
                <div className={styles.sectionTitle}>
                  <Activity size={16} className={styles.sectionIcon} />
                  <h3 className={styles.sectionHeading}>Technical Indicators</h3>
                </div>
                <ChevronDown 
                  size={18} 
                  className={`${styles.chevron} ${expandedSections.technicalIndicators ? styles.chevronUp : ''}`} 
                />
              </div>
              
              {expandedSections.technicalIndicators && (
                <div className={styles.sectionBody}>
                  {/* RSI Values */}
                  <div className={styles.indicatorGroup}>
                    <div className={styles.indicatorLabel}>RSI</div>
                    <div className={styles.timeframeGrid}>
                      {Object.entries(currentAnalytics.rsi || {}).map(([timeframe, value]) => (
                        <div key={timeframe} className={styles.timeframeItem}>
                          <div className={styles.timeframeLabel}>{timeframe}</div>
                          <div className={`${styles.timeframeValue} ${renderIndicatorStatus(value, 'rsi')}`}>
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* MACD */}
                  <div className={styles.indicatorGroup}>
                    <div className={styles.indicatorLabel}>MACD</div>
                    <div className={styles.macdGrid}>
                      <div className={styles.macdItem}>
                        <div className={styles.macdLabel}>Line</div>
                        <div className={styles.macdValue}>
                          {formatNumber(currentAnalytics.macd?.line, 2)}
                        </div>
                      </div>
                      <div className={styles.macdItem}>
                        <div className={styles.macdLabel}>Signal</div>
                        <div className={styles.macdValue}>
                          {formatNumber(currentAnalytics.macd?.signal, 2)}
                        </div>
                      </div>
                      <div className={styles.macdItem}>
                        <div className={styles.macdLabel}>Hist</div>
                        <div className={`${styles.macdValue} ${renderIndicatorStatus(currentAnalytics.macd?.histogram, 'macd')}`}>
                          {formatNumber(currentAnalytics.macd?.histogram, 2)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bollinger Bands */}
                  <div className={styles.indicatorGroup}>
                    <div className={styles.indicatorLabel}>Bollinger Bands</div>
                    <div className={styles.bbGrid}>
                      <div className={styles.bbItem}>
                        <div className={styles.bbLabel}>Upper</div>
                        <div className={styles.bbValue}>
                          {formatNumber(currentAnalytics.bb?.upper, selectedSymbol === 'BTCUSDT' ? 2 : 4)}
                        </div>
                      </div>
                      <div className={styles.bbItem}>
                        <div className={styles.bbLabel}>Middle</div>
                        <div className={styles.bbValue}>
                          {formatNumber(currentAnalytics.bb?.middle, selectedSymbol === 'BTCUSDT' ? 2 : 4)}
                        </div>
                      </div>
                      <div className={styles.bbItem}>
                        <div className={styles.bbLabel}>Lower</div>
                        <div className={styles.bbValue}>
                          {formatNumber(currentAnalytics.bb?.lower, selectedSymbol === 'BTCUSDT' ? 2 : 4)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* VWAP */}
                  <div className={styles.indicatorRow}>
                    <div className={styles.indicatorRowLabel}>VWAP</div>
                    <div className={`${styles.indicatorRowValue} ${marketData.price > currentAnalytics.vwap ? styles.textGreen : styles.textRed}`}>
                      {formatNumber(currentAnalytics.vwap, selectedSymbol === 'BTCUSDT' ? 2 : 4)}
                    </div>
                  </div>
                  
                  {/* Multi-Timeframe Trend */}
                  <div className={styles.indicatorGroup}>
                    <div className={styles.indicatorLabel}>Trend Confirmation</div>
                    <div className={styles.trendGrid}>
                      {Object.entries(currentAnalytics.trends || {}).map(([timeframe, value]) => (
                        <div key={timeframe} className={styles.trendItem}>
                          <span className={styles.trendTimeframe}>{timeframe}</span>
                          <span className={`${styles.trendIndicator} ${renderIndicatorStatus(value ? 1 : 0, 'trend')}`}>
                            {value ? <Check size={14} /> : <X size={14} />}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Support/Resistance */}
            <div className={styles.section}>
              <div className={styles.sectionTitleSimple}>
                <Layers size={16} className={styles.sectionIcon} />
                <h3 className={styles.sectionHeading}>Support/Resistance</h3>
              </div>
              <div className={styles.srGrid}>
                <div className={styles.srItem}>
                  <div className={styles.srLabel}>4H Support</div>
                  <div className={styles.srValue}>
                    {formatNumber(currentAnalytics.support4h?.[0], selectedSymbol === 'BTCUSDT' ? 2 : 4)}
                  </div>
                </div>
                <div className={styles.srItem}>
                  <div className={styles.srLabel}>4H Resistance</div>
                  <div className={styles.srValue}>
                    {formatNumber(currentAnalytics.support4h?.[1], selectedSymbol === 'BTCUSDT' ? 2 : 4)}
                  </div>
                </div>
                <div className={styles.srItem}>
                  <div className={styles.srLabel}>1D Support</div>
                  <div className={styles.srValue}>
                    {formatNumber(currentAnalytics.support1d?.[0], selectedSymbol === 'BTCUSDT' ? 2 : 4)}
                  </div>
                </div>
                <div className={styles.srItem}>
                  <div className={styles.srLabel}>1D Resistance</div>
                  <div className={styles.srValue}>
                    {formatNumber(currentAnalytics.support1d?.[1], selectedSymbol === 'BTCUSDT' ? 2 : 4)}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Price Position Indicator */}
            <div className={styles.section}>
              <div className={styles.sectionTitleSimple}>
                <Percent size={16} className={styles.sectionIcon} />
                <h3 className={styles.sectionHeading}>Price Position</h3>
              </div>
              <div className={styles.pricePositionContainer}>
                <div className={styles.pricePositionBar}>
                  {/* Support/Resistance range visualization */}
                  <div className={styles.pricePositionLabels}>
                    <span>{formatNumber(currentAnalytics.support4h?.[0], 0)}</span>
                    <span>{formatNumber(currentAnalytics.support4h?.[1], 0)}</span>
                  </div>
                  
                  {/* Current price marker */}
                  <div 
                    className={styles.pricePositionMarker}
                    style={{ 
                      left: `${Math.min(Math.max(((marketData.price - (currentAnalytics.support4h?.[0] || 0)) / 
                        ((currentAnalytics.support4h?.[1] || 1) - (currentAnalytics.support4h?.[0] || 0))) * 100, 0), 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </>
        )}
        
        {activeTab === 'advanced' && (
          <>
            {/* Order Flow */}
            <div className={styles.section}>
              <div 
                className={styles.sectionHeader} 
                onClick={() => toggleSection('orderFlow')}
              >
                <div className={styles.sectionTitle}>
                  <Zap size={16} className={styles.sectionIcon} />
                  <h3 className={styles.sectionHeading}>Order Flow Analysis</h3>
                </div>
                <ChevronDown 
                  size={18} 
                  className={`${styles.chevron} ${expandedSections.orderFlow ? styles.chevronUp : ''}`} 
                />
              </div>
              
              {expandedSections.orderFlow && (
                <div className={styles.sectionBody}>
                  <div className={styles.orderFlowGrid}>
                    <div className={styles.orderFlowItem}>
                      <div className={styles.orderFlowLabel}>Order Book Pressure</div>
                      <div className={`${styles.orderFlowValue} ${renderIndicatorStatus(parseFloat(currentAnalytics.orderBookPressure), 'pressure')}`}>
                        {currentAnalytics.orderBookPressure}
                      </div>
                    </div>
                    <div className={styles.orderFlowItem}>
                      <div className={styles.orderFlowLabel}>Taker Flow</div>
                      <div className={styles.orderFlowValue}>
                        {currentAnalytics.takerFlowAggression}
                      </div>
                    </div>
                    <div className={styles.orderFlowItem}>
                      <div className={styles.orderFlowLabel}>Whale Flow</div>
                      <div className={`${styles.orderFlowValue} ${currentAnalytics.whaleFlow.includes('Inflow') ? styles.textGreen : styles.textRed}`}>
                        {currentAnalytics.whaleFlow}
                      </div>
                    </div>
                    <div className={styles.orderFlowItem}>
                      <div className={styles.orderFlowLabel}>OI Delta</div>
                      <div className={`${styles.orderFlowValue} ${parseFloat(currentAnalytics.oiDelta) >= 0 ? styles.textGreen : styles.textRed}`}>
                        {currentAnalytics.oiDelta}
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.liquidationsContainer}>
                    <div className={styles.liquidationsLabel}>Liquidations (24h)</div>
                    <div className={styles.liquidationsValues}>
                      <div className={styles.liquidationItem}>
                        <span className={styles.liquidationLabel}>Buy:</span>
                        <span className={styles.textGreen}>${formatLargeNumber(currentAnalytics.liquidations?.buy || 0)}</span>
                      </div>
                      <div className={styles.liquidationItem}>
                        <span className={styles.liquidationLabel}>Sell:</span>
                        <span className={styles.textRed}>${formatLargeNumber(currentAnalytics.liquidations?.sell || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Funding Rate Details */}
            <div className={styles.section}>
              <div className={styles.sectionTitleSimple}>
                <DollarSign size={16} className={styles.sectionIcon} />
                <h3 className={styles.sectionHeading}>Funding Rate Details</h3>
              </div>
              <div className={styles.fundingRateContainer}>
                <div className={styles.fundingRateGrid}>
                  <div className={styles.fundingRateItem}>
                    <div className={styles.fundingRateLabel}>Current Rate</div>
                    <div className={`${styles.fundingRateValue} ${parseFloat(currentAnalytics.fundingRate) < 0 ? styles.textGreen : styles.textRed}`}>
                      {currentAnalytics.fundingRate}
                    </div>
                  </div>
                  <div className={styles.fundingRateItem}>
                    <div className={styles.fundingRateLabel}>Trend</div>
                    <div className={`${styles.fundingRateValue} ${parseFloat(currentAnalytics.fundingTrend) < 0 ? styles.textGreen : styles.textRed}`}>
                      {currentAnalytics.fundingTrend}
                    </div>
                  </div>
                </div>
                
                <div className={styles.fundingRateNote}>
                  {parseFloat(currentAnalytics.fundingRate) > 0 ? 
                    "Positive funding: Longs pay shorts" : 
                    "Negative funding: Shorts pay longs"}
                </div>
              </div>
            </div>
            
            {/* Last Signal */}
            <div className={styles.section}>
              <div className={styles.sectionTitleSimple}>
                <Clock size={16} className={styles.sectionIcon} />
                <h3 className={styles.sectionHeading}>Signal Timing</h3>
              </div>
              <div className={styles.timingContainer}>
                <div className={styles.timingRow}>
                  <div className={styles.timingLabel}>Last Update</div>
                  <div className={styles.timingValue}>
                    {marketData.lastUpdate ? new Date(marketData.lastUpdate).toLocaleTimeString() : 'N/A'}
                  </div>
                </div>
                <div className={styles.timingRow}>
                  <div className={styles.timingLabel}>Last Signal</div>
                  <div className={styles.timingValue}>
                    {currentAnalytics.lastSignalTime ? 
                      new Date(currentAnalytics.lastSignalTime).toLocaleTimeString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.footerText}>
          Data refreshes automatically
        </div>
        
        <button 
          className={styles.chartButton}
          onClick={() => window.open(`https://www.binance.com/en/trade/${selectedSymbol}`, '_blank')}
        >
          <BarChart2 size={14} className={styles.chartButtonIcon} />
          Open Chart
        </button>
      </div>
      
      {/* Disclaimer */}
      <div className={styles.disclaimer}>
        Disclaimer: Signals are for informational purposes only. Always conduct your own analysis before trading.
      </div>
    </div>
  );
};

export default TradingSignal;
