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
  // Define section keys for expandable sections
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
  const reconnectAttemptsRef = useRef<number>(0);
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
    stochRsi: {[timeframe: string]: {k: number; d: number}}; // Stochastic RSI
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
      width: number;
      percentB: number;
    };
    vwap: number;
    obv: number; // On-Balance Volume
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
    // Improved support/resistance levels
    pivotPoints: {
      p: number;    // Pivot Point
      r1: number;   // Resistance 1
      r2: number;   // Resistance 2
      r3: number;   // Resistance 3
      s1: number;   // Support 1
      s2: number;   // Support 2
      s3: number;   // Support 3
    };
    fibonacci: {
      trend: string;       // "up" or "down"
      levels: {
        ext1618: number;   // 1.618 extension
        ext1: number;      // 1.0 extension
        ret786: number;    // 0.786 retracement
        ret618: number;    // 0.618 retracement
        ret5: number;      // 0.5 retracement
        ret382: number;    // 0.382 retracement
        ret236: number;    // 0.236 retracement
      };
      swingHigh: number;
      swingLow: number;
    };
    volumeProfile: {
      poc: number;         // Point of Control
      valueAreaHigh: number;
      valueAreaLow: number;
    };
    ichimoku: {
      tenkanSen: number;   // Conversion Line
      kijunSen: number;    // Base Line
      senkouSpanA: number; // Leading Span A
      senkouSpanB: number; // Leading Span B
      chikouSpan: number;  // Lagging Span
    };
    support4h: number[];
    support1d: number[];
    liquidations: { buy: number; sell: number };
    riskRewardRatio: { r1: number; r2: number };
    signalStrength: number;
    lastSignalTime: Date | null;
    calculationLog: string[]; // For debugging and validation
  };

  const [pairAnalytics, setPairAnalytics] = useState<Record<string, Analytics>>({
    'BTCUSDT': {
      rsi: {'5m': 42.18, '15m': 45.32, '1h': 47.65, '4h': 51.23, '1d': 55.78},
      stochRsi: {
        '5m': {k: 65.5, d: 60.2},
        '15m': {k: 58.3, d: 55.7},
        '1h': {k: 45.8, d: 48.2},
        '4h': {k: 52.1, d: 50.5},
        '1d': {k: 60.4, d: 58.9}
      },
      ema: {'5m': 63150.45, '15m': 63180.75, '1h': 63250.45, '4h': 62980.75, '1d': 62750.25},
      macd: {
        line: 120.5,
        signal: 110.2,
        histogram: 10.3
      },
      bb: {
        upper: 64500.25,
        middle: 63250.45,
        lower: 62000.65,
        width: 0.039,
        percentB: 0.48
      },
      vwap: 63180.35,
      obv: 15680450,
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
      pivotPoints: {
        p: 63200.50,
        r1: 64350.75,
        r2: 65200.25,
        r3: 66400.50,
        s1: 62050.25,
        s2: 61200.50,
        s3: 60100.25
      },
      fibonacci: {
        trend: 'up',
        levels: {
          ext1618: 66850.25,
          ext1: 65200.50,
          ret786: 62450.75,
          ret618: 61800.50,
          ret5: 61200.25,
          ret382: 60600.75,
          ret236: 59800.25
        },
        swingHigh: 65200.50,
        swingLow: 57200.25
      },
      volumeProfile: {
        poc: 63150.25,
        valueAreaHigh: 64200.50,
        valueAreaLow: 62100.25
      },
      ichimoku: {
        tenkanSen: 63250.50,
        kijunSen: 62800.25,
        senkouSpanA: 63050.75,
        senkouSpanB: 61800.50,
        chikouSpan: 64200.25
      },
      support4h: [61200, 64800],
      support1d: [58500, 66500],
      liquidations: { buy: 1250000, sell: 850000 },
      riskRewardRatio: { r1: 2.1, r2: 3.4 },
      signalStrength: 78,
      lastSignalTime: new Date(Date.now() - 1800000), // 30 minutes ago
      calculationLog: []
    },
    'THETAUSDT': {
      rsi: {'5m': 58.75, '15m': 56.32, '1h': 54.65, '4h': 52.23, '1d': 48.78},
      stochRsi: {
        '5m': {k: 70.2, d: 65.8},
        '15m': {k: 62.5, d: 60.1},
        '1h': {k: 55.3, d: 53.7},
        '4h': {k: 48.6, d: 50.2},
        '1d': {k: 45.8, d: 47.5}
      },
      ema: {'5m': 1.448, '15m': 1.450, '1h': 1.452, '4h': 1.438, '1d': 1.425},
      macd: {
        line: 0.015,
        signal: 0.012,
        histogram: 0.003
      },
      bb: {
        upper: 1.52,
        middle: 1.45,
        lower: 1.38,
        width: 0.048,
        percentB: 0.58
      },
      vwap: 1.446,
      obv: 2580450,
      entryRangeLow: 1.425,
      entryRangeHigh: 1.455,
      stopLoss: 1.38,
      takeProfitOne: 1.52,
      takeProfitTwo: 1.58,
      whaleFlow: 'Neutral',
      rvol: '0.95x',
      deltaVolume: 125.45,
      orderBookPressure: '1.05x',
      takerFlowAggression: '52.50%',
      fundingRate: '0.0015%',
      fundingTrend: '0.0012%',
      oiDelta: '0.08%',
      atrVolatility: 0.035,
      confidence: 65,
      trends: { '5m': true, '15m': true, '1h': false, '4h': false, '1d': false },
      pivotPoints: {
        p: 1.445,
        r1: 1.48,
        r2: 1.52,
        r3: 1.56,
        s1: 1.41,
        s2: 1.38,
        s3: 1.35
      },
      fibonacci: {
        trend: 'down',
        levels: {
          ext1618: 1.28,
          ext1: 1.32,
          ret786: 1.38,
          ret618: 1.42,
          ret5: 1.45,
          ret382: 1.48,
          ret236: 1.51
        },
        swingHigh: 1.58,
        swingLow: 1.32
      },
      volumeProfile: {
        poc: 1.445,
        valueAreaHigh: 1.47,
        valueAreaLow: 1.42
      },
      ichimoku: {
        tenkanSen: 1.445,
        kijunSen: 1.435,
        senkouSpanA: 1.44,
        senkouSpanB: 1.42,
        chikouSpan: 1.46
      },
      support4h: [1.38, 1.52],
      support1d: [1.25, 1.65],
      liquidations: { buy: 85000, sell: 120000 },
      riskRewardRatio: { r1: 1.8, r2: 2.9 },
      signalStrength: 62,
      lastSignalTime: new Date(Date.now() - 3600000), // 1 hour ago
      calculationLog: []
    },
    'SOLUSDT': {
      rsi: {'5m': 27.52, '15m': 29.32, '1h': 32.65, '4h': 35.23, '1d': 38.78},
      stochRsi: {
        '5m': {k: 25.5, d: 28.2},
        '15m': {k: 30.3, d: 32.7},
        '1h': {k: 35.8, d: 38.2},
        '4h': {k: 40.1, d: 42.5},
        '1d': {k: 45.4, d: 47.9}
      },
      ema: {'5m': 146.25, '15m': 146.58, '1h': 146.91, '4h': 147.82, '1d': 148.25},
      macd: {
        line: -0.85,
        signal: -0.35,
        histogram: -0.5
      },
      bb: {
        upper: 152.35,
        middle: 147.82,
        lower: 143.29,
        width: 0.061,
        percentB: 0.38
      },
      vwap: 146.75,
      obv: 8450250,
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
      pivotPoints: {
        p: 146.50,
        r1: 152.75,
        r2: 158.25,
        r3: 165.50,
        s1: 140.25,
        s2: 134.50,
        s3: 128.25
      },
      fibonacci: {
        trend: 'down',
        levels: {
          ext1618: 120.25,
          ext1: 125.50,
          ret786: 135.75,
          ret618: 140.50,
          ret5: 145.25,
          ret382: 150.75,
          ret236: 155.25
        },
        swingHigh: 165.50,
        swingLow: 125.50
      },
      volumeProfile: {
        poc: 146.25,
        valueAreaHigh: 150.50,
        valueAreaLow: 142.25
      },
      ichimoku: {
        tenkanSen: 145.50,
        kijunSen: 147.25,
        senkouSpanA: 146.75,
        senkouSpanB: 142.50,
        chikouSpan: 144.25
      },
      support4h: [140.25, 153.88],
      support1d: [95.19, 157.24],
      liquidations: { buy: 0, sell: 0 },
      riskRewardRatio: { r1: 1.8, r2: 2.7 },
      signalStrength: 65,
      lastSignalTime: new Date(Date.now() - 7200000), // 2 hours ago
      calculationLog: []
    },
    'ETHUSDT': {
      rsi: {'5m': 45.32, '15m': 47.32, '1h': 48.65, '4h': 46.23, '1d': 49.78},
      stochRsi: {
        '5m': {k: 52.5, d: 48.2},
        '15m': {k: 55.3, d: 53.7},
        '1h': {k: 58.8, d: 56.2},
        '4h': {k: 49.1, d: 47.5},
        '1d': {k: 51.4, d: 50.9}
      },
      ema: {'5m': 3048.75, '15m': 3050.25, '1h': 3052.45, '4h': 3048.75, '1d': 3035.25},
      macd: {
        line: 5.25,
        signal: 3.75,
        histogram: 1.5
      },
      bb: {
        upper: 3120.35,
        middle: 3052.45,
        lower: 2984.55,
        width: 0.044,
        percentB: 0.45
      },
      vwap: 3049.85,
      obv: 25680450,
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
      pivotPoints: {
        p: 3050.50,
        r1: 3120.75,
        r2: 3180.25,
        r3: 3250.50,
        s1: 2980.25,
        s2: 2920.50,
        s3: 2850.25
      },
      fibonacci: {
        trend: 'up',
        levels: {
          ext1618: 3350.25,
          ext1: 3250.50,
          ret786: 3150.75,
          ret618: 3100.50,
          ret5: 3050.25,
          ret382: 3000.75,
          ret236: 2950.25
        },
        swingHigh: 3250.50,
        swingLow: 2850.25
      },
      volumeProfile: {
        poc: 3050.25,
        valueAreaHigh: 3100.50,
        valueAreaLow: 3000.25
      },
      ichimoku: {
        tenkanSen: 3050.50,
        kijunSen: 3030.25,
        senkouSpanA: 3040.75,
        senkouSpanB: 3020.50,
        chikouSpan: 3070.25
      },
      support4h: [2950, 3150],
      support1d: [2800, 3250],
      liquidations: { buy: 450000, sell: 320000 },
      riskRewardRatio: { r1: 2.3, r2: 3.6 },
      signalStrength: 68,
      lastSignalTime: new Date(Date.now() - 5400000), // 1.5 hours ago
      calculationLog: []
    },
    'BNBUSDT': {
      rsi: {'5m': 52.18, '15m': 53.32, '1h': 51.65, '4h': 49.23, '1d': 47.78},
      stochRsi: {
        '5m': {k: 55.5, d: 52.2},
        '15m': {k: 57.3, d: 55.7},
        '1h': {k: 53.8, d: 52.2},
        '4h': {k: 50.1, d: 48.5},
        '1d': {k: 48.4, d: 47.9}
      },
      ema: {'5m': 576.25, '15m': 577.35, '1h': 578.45, '4h': 575.75, '1d': 572.25},
      macd: {
        line: 1.25,
        signal: 0.95,
        histogram: 0.3
      },
      bb: {
        upper: 590.35,
        middle: 578.45,
        lower: 566.55,
        width: 0.041,
        percentB: 0.47
      },
      vwap: 577.85,
      obv: 12580450,
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
      pivotPoints: {
        p: 578.50,
        r1: 588.75,
        r2: 598.25,
        r3: 608.50,
        s1: 568.25,
        s2: 558.50,
        s3: 548.25
      },
      fibonacci: {
        trend: 'up',
        levels: {
          ext1618: 620.25,
          ext1: 610.50,
          ret786: 595.75,
          ret618: 590.50,
          ret5: 585.25,
          ret382: 580.75,
          ret236: 575.25
        },
        swingHigh: 610.50,
        swingLow: 550.25
      },
      volumeProfile: {
        poc: 578.25,
        valueAreaHigh: 585.50,
        valueAreaLow: 570.25
      },
      ichimoku: {
        tenkanSen: 578.50,
        kijunSen: 575.25,
        senkouSpanA: 576.75,
        senkouSpanB: 570.50,
        chikouSpan: 582.25
      },
      support4h: [560, 595],
      support1d: [540, 610],
      liquidations: { buy: 350000, sell: 280000 },
      riskRewardRatio: { r1: 2.0, r2: 3.2 },
      signalStrength: 62,
      lastSignalTime: new Date(Date.now() - 10800000), // 3 hours ago
      calculationLog: []
    }
  });

  // Các hàm tính toán chỉ báo kỹ thuật
  const calculateStochRSI = (prices: number[], periods = 14, kPeriods = 3, dPeriods = 3) => {
    // First calculate RSI
    const rsiValues = [];
    for (let i = 0; i < prices.length; i++) {
      rsiValues.push(calculateRSI(prices.slice(0, i + 1), periods));
    }
    
    // We need at least 'periods' RSI values to calculate Stochastic RSI
    if (rsiValues.length < periods) {
      return { k: 50, d: 50 }; // Default values if not enough data
    }
    
    // Calculate Stochastic RSI
    const stochRsi = [];
    for (let i = periods - 1; i < rsiValues.length; i++) {
      const rsiSlice = rsiValues.slice(i - periods + 1, i + 1);
      const highestRsi = Math.max(...rsiSlice);
      const lowestRsi = Math.min(...rsiSlice);
      const currentRsi = rsiValues[i];
      
      // Calculate %K value
      const k = lowestRsi === highestRsi ? 50 : ((currentRsi - lowestRsi) / (highestRsi - lowestRsi)) * 100;
      stochRsi.push(k);
    }
    
    // Calculate %K (simple moving average of Stochastic RSI)
    const kValues = [];
    for (let i = kPeriods - 1; i < stochRsi.length; i++) {
      const kSlice = stochRsi.slice(i - kPeriods + 1, i + 1);
      const kAvg = kSlice.reduce((sum, val) => sum + val, 0) / kPeriods;
      kValues.push(kAvg);
    }
    
    // Calculate %D (simple moving average of %K)
    const dValues = [];
    for (let i = dPeriods - 1; i < kValues.length; i++) {
      const dSlice = kValues.slice(i - dPeriods + 1, i + 1);
      const dAvg = dSlice.reduce((sum, val) => sum + val, 0) / dPeriods;
      dValues.push(dAvg);
    }
    
    // Return the latest K and D values
    return {
      k: kValues.length > 0 ? kValues[kValues.length - 1] : 50,
      d: dValues.length > 0 ? dValues[dValues.length - 1] : 50
    };
  };
  
  const calculateRSI = (prices: number[], periods = 14) => {
    if (prices.length < periods + 1) {
      return 50; // Default value if not enough data
    }
    
    // Calculate price changes
    const priceChanges = [];
    for (let i = 1; i < prices.length; i++) {
      priceChanges.push(prices[i] - prices[i-1]);
    }
    
    // Initial average gains and losses
    let gains = 0;
    let losses = 0;
    
    for (let i = 0; i < periods; i++) {
      const change = priceChanges[i];
      if (change >= 0) {
        gains += change;
      } else {
        losses -= change; // Make losses positive
      }
    }
    
    let avgGain = gains / periods;
    let avgLoss = losses / periods;
    
    // Wilder's smoothing method for subsequent values
    for (let i = periods; i < priceChanges.length; i++) {
      const change = priceChanges[i];
      
      // Smoothed calculation
      if (change >= 0) {
        avgGain = ((avgGain * (periods - 1)) + change) / periods;
        avgLoss = (avgLoss * (periods - 1)) / periods;
      } else {
        avgGain = (avgGain * (periods - 1)) / periods;
        avgLoss = ((avgLoss * (periods - 1)) - change) / periods;
      }
    }
    
    if (avgLoss === 0) {
      return 100; // Prevent division by zero
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

  const calculateOBV = (prices: number[], volumes: number[]) => {
    if (prices.length < 2 || volumes.length < 2) {
      return 0; // Not enough data
    }
    
    let obv = 0;
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > prices[i-1]) {
        // Price up, add volume
        obv += volumes[i];
      } else if (prices[i] < prices[i-1]) {
        // Price down, subtract volume
        obv -= volumes[i];
      }
      // If prices are equal, OBV remains the same
    }
    
    return obv;
  };

  const calculateMACD = (prices: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
    if (prices.length < Math.max(fastPeriod, slowPeriod) + signalPeriod) {
      return { line: 0, signal: 0, histogram: 0 };
    }
    
    // Calculate EMA values for the entire price series
    const fastEMAs = [];
    const slowEMAs = [];
    
    // Initialize with SMA for more accurate starting point
    let fastSMA = prices.slice(0, fastPeriod).reduce((sum, price) => sum + price, 0) / fastPeriod;
    let slowSMA = prices.slice(0, slowPeriod).reduce((sum, price) => sum + price, 0) / slowPeriod;
    
    fastEMAs.push(fastSMA);
    slowEMAs.push(slowSMA);
    
    // Calculate all EMAs
    const fastMultiplier = 2 / (fastPeriod + 1);
    const slowMultiplier = 2 / (slowPeriod + 1);
    
    // Start from the period length to calculate EMAs
    for (let i = fastPeriod; i < prices.length; i++) {
      const prevFastEMA = fastEMAs[fastEMAs.length - 1];
      const fastEMA: number = (prices[i] - prevFastEMA) * fastMultiplier + prevFastEMA;
      fastEMAs.push(fastEMA);
    }
    
    for (let i = slowPeriod; i < prices.length; i++) {
      const prevSlowEMA = slowEMAs[slowEMAs.length - 1];
      const slowEMA: number = (prices[i] - prevSlowEMA) * slowMultiplier + prevSlowEMA;
      slowEMAs.push(slowEMA);
    }
    
    // Calculate MACD line values (fast EMA - slow EMA)
    const macdValues = [];
    // Align the arrays properly - we need to start from where both EMAs are available
    const startIdx = slowPeriod - fastPeriod; // Offset for the fast EMA array
    
    for (let i = 0; i < slowEMAs.length; i++) {
      const fastEMAIdx = i + startIdx;
      if (fastEMAIdx >= 0 && fastEMAIdx < fastEMAs.length) {
        macdValues.push(fastEMAs[fastEMAIdx] - slowEMAs[i]);
      }
    }
    
    // Calculate signal line (EMA of MACD line)
    const signalValues = [];
    let signalSMA = macdValues.slice(0, signalPeriod).reduce((sum, val) => sum + val, 0) / signalPeriod;
    signalValues.push(signalSMA);
    
    const signalMultiplier = 2 / (signalPeriod + 1);
    for (let i = signalPeriod; i < macdValues.length; i++) {
      const prevSignalEMA = signalValues[signalValues.length - 1];
      const signalEMA: number = (macdValues[i] - prevSignalEMA) * signalMultiplier + prevSignalEMA;
      signalValues.push(signalEMA);
    }
    
    // Get the most recent values
    const macdLine = macdValues[macdValues.length - 1];
    const signalLine = signalValues[signalValues.length - 1];
    const histogram = macdLine - signalLine;
    
    return { line: macdLine, signal: signalLine, histogram };
  };

  const calculateBollingerBands = (prices: number[], periods = 20, multiplier = 2) => {
    if (prices.length < periods) {
      return { 
        upper: prices[prices.length-1] * 1.05, 
        middle: prices[prices.length-1], 
        lower: prices[prices.length-1] * 0.95,
        width: 0.1, // Default width
        percentB: 0.5 // Default %B
      };
    }
    
    // Use the most recent prices for calculation
    const slicedPrices = prices.slice(prices.length - periods);
    
    // Calculate SMA for middle band
    const sma = slicedPrices.reduce((sum, price) => sum + price, 0) / periods;
    
    // Calculate standard deviation with improved precision
    const squaredDifferences = slicedPrices.map(price => Math.pow(price - sma, 2));
    const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / (periods - 1); // Using n-1 for sample
    const stdDev = Math.sqrt(variance);
    
    // Calculate bands
    const upper = sma + (multiplier * stdDev);
    const lower = sma - (multiplier * stdDev);
    
    // Calculate additional metrics
    const width = (upper - lower) / sma; // Normalized width
    
    // Calculate %B (price location within the bands: 0 = lower band, 1 = upper band)
    const currentPrice = prices[prices.length - 1];
    const percentB = (currentPrice - lower) / (upper - lower);
    
    return {
      upper,
      middle: sma,
      lower,
      width,
      percentB
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
  const connectWebSocket = (): void => {
    // Close existing connection if open
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (err) {
        console.warn('Error closing WebSocket:', err);
      }
      // Small delay to ensure previous connection is fully closed
      setTimeout(() => {
        initializeWebSocket();
      }, 300);
    } else {
      initializeWebSocket();
    }
  };
  
  const initializeWebSocket = (): void => {
    try {
      // Close any existing connection first to prevent multiple connections
      if (wsRef.current) {
        try {
          wsRef.current.close();
          wsRef.current = null;
        } catch (err) {
          console.warn('Error closing existing WebSocket:', err);
        }
      }
      
      // Create a connection timeout to handle connection failures
      const connectionTimeout = setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
          console.warn('WebSocket connection timeout, falling back to REST API');
          try {
            wsRef.current.close();
          } catch (e) {}
          wsRef.current = null;
          fetchBinanceData();
        }
      }, 10000); // 10 second timeout
      
      // Create the WebSocket connection
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${selectedSymbol.toLowerCase()}@trade/${selectedSymbol.toLowerCase()}@depth10@100ms`);
      
      ws.onopen = (): void => {
        console.log('WebSocket connected');
        clearTimeout(connectionTimeout);
        
        // Send a ping every 30 seconds to keep the connection alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ method: 'ping' }));
          } else {
            clearInterval(pingInterval);
          }
        }, 30000);
        
        // Clear interval when connection closes
        ws.addEventListener('close', () => clearInterval(pingInterval));
      };
      
      ws.onmessage = (event: MessageEvent): void => {
        try {
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
            
            setMarketData(prev => ({
              ...prev,
              orderBookRatio: orderBookPressure
            }));
            
            // Update order book pressure in analytics
            updateOrderBookPressure(selectedSymbol, orderBookPressure);
          }
        } catch (err) {
          console.warn('Error processing WebSocket message:', err);
        }
      };
      
      ws.onerror = (error: Event): void => {
        console.error('WebSocket error:', error);
        clearTimeout(connectionTimeout);
        // Fallback to REST API if WebSocket fails
        fetchBinanceData();
      };
      
      ws.onclose = (event: CloseEvent): void => {
        console.log('WebSocket disconnected', event.code, event.reason);
        clearTimeout(connectionTimeout);
        
        // Retry connection after a delay if not intentionally closed
        if (event.code !== 1000 && wsRef.current === ws) {
          wsRef.current = null;
          
          // Use exponential backoff for reconnection attempts
          const backoffDelay = Math.min(30000, 5000 * Math.pow(2, reconnectAttemptsRef.current));
          console.log(`Will attempt to reconnect in ${backoffDelay/1000} seconds`);
          
          setTimeout(() => {
            if (document.visibilityState !== 'hidden') {
              console.log('Attempting to reconnect WebSocket...');
              reconnectAttemptsRef.current++;
              connectWebSocket();
            }
          }, backoffDelay);
        }
      };
      
      wsRef.current = ws;
    } catch (err) {
      console.error('Error initializing WebSocket:', err);
      // Fallback to REST API
      fetchBinanceData();
    }
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
        
        // Calculate Stochastic RSI
        const stochRsi = calculateStochRSI(closePrices, 14, 3, 3);
        
        // Calculate On-Balance Volume (OBV)
        const volumes = data.map((candle: any[]) => parseFloat(candle[5]));
        const obv = calculateOBV(closePrices, volumes);
        
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
            stochRsi: {
              ...prev[selectedSymbol].stochRsi,
              [timeframe]: {
                k: parseFloat(stochRsi.k.toFixed(2)),
                d: parseFloat(stochRsi.d.toFixed(2))
              }
            },
            obv: timeframe === '1h' ? parseFloat(obv.toFixed(0)) : prev[selectedSymbol].obv,
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
              lower: parseFloat(bb.lower.toFixed(selectedSymbol === 'BTCUSDT' ? 2 : 4)),
              width: parseFloat(bb.width.toFixed(3)),
              percentB: parseFloat(bb.percentB.toFixed(2))
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
    const decimals = symbol === 'BTCUSDT' ? 2 : 4;
    
    // Entry range calculation
    let entryRangeLow, entryRangeHigh, stopLoss, takeProfitOne, takeProfitTwo;
    let entryPrice; // Average entry price for calculations
    
    // Log calculation steps for debugging
    const log: string[] = [];
    log.push(`Trade parameters calculation for ${symbol} at ${currentPrice}`);
    log.push(`ATR: ${atr}`);
    
    if (signalType === 'LONG') {
      // Entry range calculation - more conservative for long positions
      entryRangeLow = parseFloat((currentPrice - 0.3 * atr).toFixed(decimals));
      entryRangeHigh = parseFloat((currentPrice + 0.1 * atr).toFixed(decimals));
      entryPrice = (entryRangeLow + entryRangeHigh) / 2;
      log.push(`Entry range: ${entryRangeLow} - ${entryRangeHigh}, Avg: ${entryPrice}`);
      
      // Calculate stop loss with 5% maximum risk limit
      const maxRiskPercent = 0.05; // 5% maximum risk
      const atrBasedStopLoss = parseFloat((entryPrice - 1.5 * atr).toFixed(decimals));
      const percentBasedStopLoss = parseFloat((entryPrice * (1 - maxRiskPercent)).toFixed(decimals));
      
      // Use the higher of the two stop loss values (less risk)
      stopLoss = Math.max(atrBasedStopLoss, percentBasedStopLoss);
      log.push(`ATR-based SL: ${atrBasedStopLoss}, Percent-based SL: ${percentBasedStopLoss}`);
      log.push(`Selected SL: ${stopLoss} (${((entryPrice - stopLoss) / entryPrice * 100).toFixed(2)}% risk)`);
      
      // Calculate risk in absolute terms
      const risk = entryPrice - stopLoss;
      
      // Calculate take profit targets with proper R:R ratios
      // TP1: 1.5-2R, TP2: 2.5-3R
      const r1 = Math.max(1.5, Math.min(analytics.riskRewardRatio.r1, 2.0));
      const r2 = Math.max(2.5, Math.min(analytics.riskRewardRatio.r2, 3.0));
      
      takeProfitOne = parseFloat((entryPrice + risk * r1).toFixed(decimals));
      takeProfitTwo = parseFloat((entryPrice + risk * r2).toFixed(decimals));
      
      log.push(`Risk: ${risk}, R1: ${r1}, R2: ${r2}`);
      log.push(`TP1: ${takeProfitOne} (${r1}R), TP2: ${takeProfitTwo} (${r2}R)`);
    } else { // SHORT
      // Entry range calculation - more conservative for short positions
      entryRangeLow = parseFloat((currentPrice - 0.1 * atr).toFixed(decimals));
      entryRangeHigh = parseFloat((currentPrice + 0.3 * atr).toFixed(decimals));
      entryPrice = (entryRangeLow + entryRangeHigh) / 2;
      log.push(`Entry range: ${entryRangeLow} - ${entryRangeHigh}, Avg: ${entryPrice}`);
      
      // Calculate stop loss with 5% maximum risk limit
      const maxRiskPercent = 0.05; // 5% maximum risk
      const atrBasedStopLoss = parseFloat((entryPrice + 1.5 * atr).toFixed(decimals));
      const percentBasedStopLoss = parseFloat((entryPrice * (1 + maxRiskPercent)).toFixed(decimals));
      
      // Use the lower of the two stop loss values (less risk)
      stopLoss = Math.min(atrBasedStopLoss, percentBasedStopLoss);
      log.push(`ATR-based SL: ${atrBasedStopLoss}, Percent-based SL: ${percentBasedStopLoss}`);
      log.push(`Selected SL: ${stopLoss} (${((stopLoss - entryPrice) / entryPrice * 100).toFixed(2)}% risk)`);
      
      // Calculate risk in absolute terms
      const risk = stopLoss - entryPrice;
      
      // Calculate take profit targets with proper R:R ratios
      // TP1: 1.5-2R, TP2: 2.5-3R
      const r1 = Math.max(1.5, Math.min(analytics.riskRewardRatio.r1, 2.0));
      const r2 = Math.max(2.5, Math.min(analytics.riskRewardRatio.r2, 3.0));
      
      takeProfitOne = parseFloat((entryPrice - risk * r1).toFixed(decimals));
      takeProfitTwo = parseFloat((entryPrice - risk * r2).toFixed(decimals));
      
      log.push(`Risk: ${risk}, R1: ${r1}, R2: ${r2}`);
      log.push(`TP1: ${takeProfitOne} (${r1}R), TP2: ${takeProfitTwo} (${r2}R)`);
    }
    
    // Validate results for reasonability
    let isValid = true;
    
    if (signalType === 'LONG') {
      if (stopLoss >= entryPrice) {
        log.push('ERROR: Stop loss is above or equal to entry price for LONG position');
        isValid = false;
      }
      if (takeProfitOne <= entryPrice) {
        log.push('ERROR: Take profit 1 is below or equal to entry price for LONG position');
        isValid = false;
      }
      if (takeProfitTwo <= takeProfitOne) {
        log.push('ERROR: Take profit 2 is below or equal to take profit 1 for LONG position');
        isValid = false;
      }
    } else { // SHORT
      if (stopLoss <= entryPrice) {
        log.push('ERROR: Stop loss is below or equal to entry price for SHORT position');
        isValid = false;
      }
      if (takeProfitOne >= entryPrice) {
        log.push('ERROR: Take profit 1 is above or equal to entry price for SHORT position');
        isValid = false;
      }
      if (takeProfitTwo >= takeProfitOne) {
        log.push('ERROR: Take profit 2 is above or equal to take profit 1 for SHORT position');
        isValid = false;
      }
    }
    
    if (!isValid) {
      // Use fallback values if validation fails
      log.push('Using fallback values due to validation errors');
      
      if (signalType === 'LONG') {
        entryRangeLow = parseFloat((currentPrice * 0.995).toFixed(decimals));
        entryRangeHigh = parseFloat((currentPrice * 1.005).toFixed(decimals));
        stopLoss = parseFloat((currentPrice * 0.95).toFixed(decimals));
        takeProfitOne = parseFloat((currentPrice * 1.075).toFixed(decimals));
        takeProfitTwo = parseFloat((currentPrice * 1.15).toFixed(decimals));
      } else { // SHORT
        entryRangeLow = parseFloat((currentPrice * 0.995).toFixed(decimals));
        entryRangeHigh = parseFloat((currentPrice * 1.005).toFixed(decimals));
        stopLoss = parseFloat((currentPrice * 1.05).toFixed(decimals));
        takeProfitOne = parseFloat((currentPrice * 0.925).toFixed(decimals));
        takeProfitTwo = parseFloat((currentPrice * 0.85).toFixed(decimals));
      }
      
      log.push(`Fallback values - Entry: ${entryRangeLow}-${entryRangeHigh}, SL: ${stopLoss}, TP1: ${takeProfitOne}, TP2: ${takeProfitTwo}`);
    }
    
    // Update analytics with calculated values
    analytics.entryRangeLow = entryRangeLow;
    analytics.entryRangeHigh = entryRangeHigh;
    analytics.stopLoss = stopLoss;
    analytics.takeProfitOne = takeProfitOne;
    analytics.takeProfitTwo = takeProfitTwo;
    analytics.calculationLog = log;
    
    // Update support/resistance levels using improved methods
    updateSupportResistanceLevels(symbol, currentPrice, analytics);
    
    setPairAnalytics((prev) => ({
      ...prev,
      [symbol]: analytics
    }));
  };
  
  // New function to calculate support/resistance levels using multiple methods
  const updateSupportResistanceLevels = (symbol: string, currentPrice: number, analytics: Analytics) => {
    const decimals = symbol === 'BTCUSDT' ? 2 : 4;
    const prices4h = historicalDataRef.current.prices['4h'].map(candle => candle[4]); // Close prices
    const prices1d = historicalDataRef.current.prices['1d'].map(candle => candle[4]); // Close prices
    
    if (prices4h.length < 20 || prices1d.length < 20) {
      // Fallback to Bollinger Bands if not enough historical data
      analytics.support4h = [
        parseFloat((analytics.bb.lower).toFixed(decimals)),
        parseFloat((analytics.bb.upper).toFixed(decimals))
      ];
      analytics.support1d = [
        parseFloat((analytics.bb.lower * 0.95).toFixed(decimals)),
        parseFloat((analytics.bb.upper * 1.05).toFixed(decimals))
      ];
      return;
    }
    
    // 1. Use Pivot Points for 4h timeframe
    const high4h = Math.max(...prices4h.slice(-20));
    const low4h = Math.min(...prices4h.slice(-20));
    const close4h = prices4h[prices4h.length - 1];
    
    // Calculate pivot points
    const pivot4h = parseFloat(((high4h + low4h + close4h) / 3).toFixed(decimals));
    const r1_4h = parseFloat((2 * pivot4h - low4h).toFixed(decimals));
    const s1_4h = parseFloat((2 * pivot4h - high4h).toFixed(decimals));
    
    // 2. Use Volume Profile POC for additional support/resistance
    const poc4h = analytics.volumeProfile.poc;
    
    // 3. Use Fibonacci levels from recent swing high/low
    const fib618 = analytics.fibonacci.levels.ret618;
    
    // Combine methods for 4h support/resistance
    // Filter levels that are too far from current price (max ±10%)
    const maxDistance4h = currentPrice * 0.10; // 10% max distance
    
    const potentialSupport4h = [s1_4h, poc4h, analytics.bb.lower, fib618, analytics.ichimoku.kijunSen]
      .filter(level => level < currentPrice && level > currentPrice - maxDistance4h)
      .sort((a, b) => b - a); // Sort descending
    
    const potentialResistance4h = [r1_4h, poc4h, analytics.bb.upper, fib618, analytics.ichimoku.kijunSen]
      .filter(level => level > currentPrice && level < currentPrice + maxDistance4h)
      .sort((a, b) => a - b); // Sort ascending
    
    // Ensure we have at least one level in each direction
    const support4h = potentialSupport4h.length > 0 ? 
      potentialSupport4h[0] : parseFloat((currentPrice * 0.95).toFixed(decimals));
    
    const resistance4h = potentialResistance4h.length > 0 ? 
      potentialResistance4h[0] : parseFloat((currentPrice * 1.05).toFixed(decimals));
    
    // Daily timeframe - similar approach but with wider range (±20%)
    const high1d = Math.max(...prices1d.slice(-20));
    const low1d = Math.min(...prices1d.slice(-20));
    const close1d = prices1d[prices1d.length - 1];
    
    const pivot1d = parseFloat(((high1d + low1d + close1d) / 3).toFixed(decimals));
    const r1_1d = parseFloat((2 * pivot1d - low1d).toFixed(decimals));
    const s1_1d = parseFloat((2 * pivot1d - high1d).toFixed(decimals));
    
    const maxDistance1d = currentPrice * 0.20; // 20% max distance
    
    const potentialSupport1d = [s1_1d, analytics.fibonacci.levels.ret786, analytics.volumeProfile.valueAreaLow]
      .filter(level => level < currentPrice && level > currentPrice - maxDistance1d)
      .sort((a, b) => b - a); // Sort descending
    
    const potentialResistance1d = [r1_1d, analytics.fibonacci.levels.ret236, analytics.volumeProfile.valueAreaHigh]
      .filter(level => level > currentPrice && level < currentPrice + maxDistance1d)
      .sort((a, b) => a - b); // Sort ascending
    
    const support1d = potentialSupport1d.length > 0 ? 
      potentialSupport1d[0] : parseFloat((currentPrice * 0.85).toFixed(decimals));
    
    const resistance1d = potentialResistance1d.length > 0 ? 
      potentialResistance1d[0] : parseFloat((currentPrice * 1.15).toFixed(decimals));
    
    // Update analytics with calculated support/resistance levels
    analytics.support4h = [support4h, resistance4h];
    analytics.support1d = [support1d, resistance1d];
    
    // Also update pivot points for reference
    analytics.pivotPoints = {
      p: pivot1d,
      r1: r1_1d,
      r2: parseFloat((pivot1d + (r1_1d - s1_1d)).toFixed(decimals)),
      r3: parseFloat((high1d + 2 * (pivot1d - low1d)).toFixed(decimals)),
      s1: s1_1d,
      s2: parseFloat((pivot1d - (r1_1d - s1_1d)).toFixed(decimals)),
      s3: parseFloat((low1d - 2 * (high1d - pivot1d)).toFixed(decimals))
    };
  };
  
  const updateOrderBookPressure = (symbol: string, pressure: number): void => {
    setPairAnalytics((prev: Record<string, any>) => ({
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
    const currentPrice = marketData.price;
    
    // Define timeframes with weights (higher weight for longer timeframes)
    const timeframes = [
      { tf: '5m', weight: 0.10 },
      { tf: '15m', weight: 0.15 },
      { tf: '1h', weight: 0.20 },
      { tf: '4h', weight: 0.25 },
      { tf: '1d', weight: 0.30 }
    ];
    
    // Calculate weighted timeframe score with improved trend detection
    let timeframeScore = 0;
    let totalWeight = 0;
    let trendConsistency = 0; // Measure how consistent trends are across timeframes
    
    timeframes.forEach(({ tf, weight }) => {
      totalWeight += weight;
      const isLongSignal = signalType === 'LONG';
      
      // RSI confirmation with dynamic ranges based on market conditions
      // For long signals: lower RSI values are better in oversold conditions
      // For short signals: higher RSI values are better in overbought conditions
      let rsiConfirmStrength = 0;
      if (isLongSignal) {
        if (analytics.rsi[tf] < 30) rsiConfirmStrength = 1.0; // Strong oversold
        else if (analytics.rsi[tf] < 40) rsiConfirmStrength = 0.8; // Moderately oversold
        else if (analytics.rsi[tf] < 45) rsiConfirmStrength = 0.5; // Mildly oversold
        else if (analytics.rsi[tf] > 70) rsiConfirmStrength = -0.5; // Contradicts long signal
      } else {
        if (analytics.rsi[tf] > 70) rsiConfirmStrength = 1.0; // Strong overbought
        else if (analytics.rsi[tf] > 60) rsiConfirmStrength = 0.8; // Moderately overbought
        else if (analytics.rsi[tf] > 55) rsiConfirmStrength = 0.5; // Mildly overbought
        else if (analytics.rsi[tf] < 30) rsiConfirmStrength = -0.5; // Contradicts short signal
      }
      
      // Stochastic RSI analysis - adds more sensitivity to RSI
      let stochRsiStrength = 0;
      const stochK = analytics.stochRsi[tf]?.k || 50;
      const stochD = analytics.stochRsi[tf]?.d || 50;
      
      if (isLongSignal) {
        // For long signals
        if (stochK < 20 && stochD < 20) {
          stochRsiStrength = 1.0; // Extremely oversold
        } else if (stochK < 20 && stochK > stochD) {
          stochRsiStrength = 0.8; // Oversold with bullish crossover
        } else if (stochK > stochD && stochK < 50) {
          stochRsiStrength = 0.5; // Bullish momentum building
        } else if (stochK > 80 && stochK < stochD) {
          stochRsiStrength = -0.5; // Overbought with bearish crossover
        }
      } else {
        // For short signals
        if (stochK > 80 && stochD > 80) {
          stochRsiStrength = 1.0; // Extremely overbought
        } else if (stochK > 80 && stochK < stochD) {
          stochRsiStrength = 0.8; // Overbought with bearish crossover
        } else if (stochK < stochD && stochK > 50) {
          stochRsiStrength = 0.5; // Bearish momentum building
        } else if (stochK < 20 && stochK > stochD) {
          stochRsiStrength = -0.5; // Oversold with bullish crossover
        }
      }
      
      // EMA confirmation with trend strength and slope consideration
      const emaDiff = Math.abs(analytics.ema[tf] - currentPrice) / currentPrice;
      const emaConfirms = isLongSignal ?
        (analytics.ema[tf] < currentPrice) : 
        (analytics.ema[tf] > currentPrice);
      
      // Calculate trend strength based on EMA difference and direction
      const trendStrength = Math.min(emaDiff * 150, 1.5) * (emaConfirms ? 1 : -0.5);
      
      // Track trend consistency across timeframes
      if (emaConfirms) {
        trendConsistency += weight;
      }
      
      // Combine confirmations with strength factors
      const timeframeContribution = weight * (rsiConfirmStrength + stochRsiStrength + trendStrength);
      timeframeScore += Math.max(timeframeContribution, 0); // Ensure non-negative contribution
    });
    
    // Normalize timeframe score to a 0-40 scale with trend consistency bonus
    const trendConsistencyBonus = (trendConsistency / totalWeight) * 10; // Up to 10 bonus points
    const normalizedTimeframeScore = (timeframeScore / totalWeight) * 35 + trendConsistencyBonus;
    
    // MACD confirmation with improved histogram trend analysis
    let macdScore = 0;
    if (signalType === 'LONG') {
      // For long signals
      if (analytics.macd.histogram > 0) {
        // Positive histogram - bullish
        macdScore += 8;
        
        // Check if histogram is expanding (increasing momentum)
        if (analytics.macd.histogram > analytics.macd.line * 0.1) {
          macdScore += 4; // Strong positive momentum
        }
        
        // Check if MACD line is above signal line and rising
        if (analytics.macd.line > analytics.macd.signal) {
          macdScore += 3; // Confirmed uptrend
        }
      } else if (analytics.macd.histogram > -0.1 * Math.abs(analytics.macd.line)) {
        // Near crossover - potential bullish signal
        macdScore += 5;
        
        // Check if histogram is improving (becoming less negative)
        if (analytics.macd.histogram > -0.05 * Math.abs(analytics.macd.line)) {
          macdScore += 2; // Very close to crossing over
        }
      }
    } else { 
      // For short signals
      if (analytics.macd.histogram < 0) {
        // Negative histogram - bearish
        macdScore += 8;
        
        // Check if histogram is expanding negatively (increasing downward momentum)
        if (analytics.macd.histogram < -0.1 * Math.abs(analytics.macd.line)) {
          macdScore += 4; // Strong negative momentum
        }
        
        // Check if MACD line is below signal line and falling
        if (analytics.macd.line < analytics.macd.signal) {
          macdScore += 3; // Confirmed downtrend
        }
      } else if (analytics.macd.histogram < 0.1 * Math.abs(analytics.macd.line)) {
        // Near crossover - potential bearish signal
        macdScore += 5;
        
        // Check if histogram is deteriorating (becoming less positive)
        if (analytics.macd.histogram < 0.05 * Math.abs(analytics.macd.line)) {
          macdScore += 2; // Very close to crossing over
        }
      }
    }
    
    // Bollinger Bands with improved percentB and width analysis
    let bbScore = 0;
    const bbWidth = analytics.bb.width;
    const bbPercentB = analytics.bb.percentB;
    
    if (signalType === 'LONG') {
      // For long signals
      if (bbPercentB < 0.05) {
        bbScore = 15; // Extremely oversold, strong buy signal
      } else if (bbPercentB < 0.2) {
        bbScore = 10; // Significantly oversold
      } else if (bbPercentB < 0.4) {
        bbScore = 5; // Moderately oversold
      }
      
      // Add bonus for narrow bands (potential breakout) in oversold conditions
      if (bbPercentB < 0.3 && bbWidth < 0.03) {
        bbScore += 5; // Compressed bands in oversold territory - high potential energy
      }
      
      // Penalize overbought conditions for long signals
      if (bbPercentB > 0.9) {
        bbScore -= 5; // Extremely overbought, not ideal for long entry
      }
    } else { 
      // For short signals
      if (bbPercentB > 0.95) {
        bbScore = 15; // Extremely overbought, strong sell signal
      } else if (bbPercentB > 0.8) {
        bbScore = 10; // Significantly overbought
      } else if (bbPercentB > 0.6) {
        bbScore = 5; // Moderately overbought
      }
      
      // Add bonus for narrow bands (potential breakout) in overbought conditions
      if (bbPercentB > 0.7 && bbWidth < 0.03) {
        bbScore += 5; // Compressed bands in overbought territory - high potential energy
      }
      
      // Penalize oversold conditions for short signals
      if (bbPercentB < 0.1) {
        bbScore -= 5; // Extremely oversold, not ideal for short entry
      }
    }
    
    // Ensure bbScore is within reasonable bounds
    bbScore = Math.max(Math.min(bbScore, 15), 0);
    
    // Volume analysis with improved relative volume and trend confirmation
    const rVol = parseFloat(analytics.rvol);
    let volumeScore = 0;
    
    // Base volume score on relative volume
    if (rVol > 2.0) volumeScore = 10; // Extremely high volume
    else if (rVol > 1.5) volumeScore = 8; // Very high volume
    else if (rVol > 1.2) volumeScore = 6; // Above average volume
    else if (rVol > 1.0) volumeScore = 4; // Average volume
    else if (rVol > 0.8) volumeScore = 2; // Below average but acceptable
    else volumeScore = 0; // Low volume, less reliable signals
    
    // Add bonus for volume confirming price direction
    if ((signalType === 'LONG' && marketData.priceChangePercent > 0 && rVol > 1.2) ||
        (signalType === 'SHORT' && marketData.priceChangePercent < 0 && rVol > 1.2)) {
      volumeScore += 2; // Volume confirms price direction
    }
    
    // Order book pressure with improved analysis and depth consideration
    let obScore = 0;
    const obPressure = parseFloat(analytics.orderBookPressure);
    const takerAggression = parseFloat(analytics.takerFlowAggression);
    
    if (signalType === 'LONG') {
      // For long signals
      if (obPressure > 2.0) obScore = 15; // Extremely strong buy pressure
      else if (obPressure > 1.5) obScore = 12; // Very strong buy pressure
      else if (obPressure > 1.2) obScore = 8; // Strong buy pressure
      else if (obPressure > 1.0) obScore = 4; // Mild buy pressure
      else if (obPressure < 0.8) obScore = -5; // Strong sell pressure (contradicts long)
      
      // Add bonus for aggressive buying
      if (takerAggression > 60) obScore += 3;
    } else {
      // For short signals
      if (obPressure < 0.5) obScore = 15; // Extremely strong sell pressure
      else if (obPressure < 0.7) obScore = 12; // Very strong sell pressure
      else if (obPressure < 0.8) obScore = 8; // Strong sell pressure
      else if (obPressure < 1.0) obScore = 4; // Mild sell pressure
      else if (obPressure > 1.2) obScore = -5; // Strong buy pressure (contradicts short)
      
      // Add bonus for aggressive selling
      if (takerAggression < 40) obScore += 3;
    }
    
    // Ensure obScore is within reasonable bounds
    obScore = Math.max(Math.min(obScore, 15), 0);
    
    // Whale flow analysis with improved weighting
    let whaleScore = 0;
    const whaleInflow = analytics.whaleFlow.includes('Inflow > Outflow');
    const whaleOutflow = analytics.whaleFlow.includes('Outflow > Inflow');
    
    if (signalType === 'LONG' && whaleInflow) {
      whaleScore = 10; // Whales are buying - good for long
    } else if (signalType === 'SHORT' && whaleOutflow) {
      whaleScore = 10; // Whales are selling - good for short
    } else if (signalType === 'LONG' && whaleOutflow) {
      whaleScore = -5; // Whales are selling - bad for long
    } else if (signalType === 'SHORT' && whaleInflow) {
      whaleScore = -5; // Whales are buying - bad for short
    }
    
    // Ensure whaleScore is non-negative for final calculation
    const finalWhaleScore = Math.max(whaleScore, 0);
    
    // Volatility analysis with improved context awareness
    let volatilityScore = 0;
    const volatilityPercent = analytics.atrVolatility / currentPrice * 100;
    
    if (signalType === 'LONG') {
      // For long signals
      if (volatilityPercent > 1.0 && volatilityPercent < 4.0) {
        volatilityScore = 5; // Healthy volatility for trend continuation
      } else if (volatilityPercent > 4.0) {
        volatilityScore = 2; // High volatility - more risk but potential reward
      } else if (volatilityPercent < 0.5) {
        volatilityScore = 3; // Low volatility - potential for volatility expansion
      }
    } else {
      // For short signals
      if (volatilityPercent > 3.0) {
        volatilityScore = 5; // High volatility favors shorts
      } else if (volatilityPercent > 1.5) {
        volatilityScore = 4; // Moderate volatility good for shorts
      } else if (volatilityPercent < 0.5) {
        volatilityScore = 1; // Low volatility - less favorable for shorts
      }
    }
    
    // Funding rate analysis for futures markets
    let fundingScore = 0;
    if (analytics.fundingRate) {
      const fundingRate = parseFloat(analytics.fundingRate);
      
      if (signalType === 'LONG' && fundingRate < -0.01) {
        // Negative funding rate is good for longs (shorts pay longs)
        fundingScore = Math.min(Math.abs(fundingRate) * 300, 5);
      } else if (signalType === 'SHORT' && fundingRate > 0.01) {
        // Positive funding rate is good for shorts (longs pay shorts)
        fundingScore = Math.min(fundingRate * 300, 5);
      }
    }
    
    // Enhanced market context awareness with multi-timeframe analysis and market regime detection
    let marketContextScore = 0;
    
    // 1. Market regime detection (trending vs ranging)
    const isRanging = Math.abs(analytics.bb.width - 0.03) < 0.015; // BB width around 0.03 indicates ranging market
    const isTrending = analytics.atrVolatility / currentPrice * 100 > 1.2; // Higher volatility indicates trending market
    
    // 2. Trend alignment across multiple timeframes with weighted importance
    const timeframeWeights = { '1d': 0.5, '4h': 0.3, '1h': 0.15, '15m': 0.05 };
    let trendAlignmentScore = 0;
    
    Object.entries(timeframeWeights).forEach(([timeframe, weight]) => {
      if ((signalType === 'LONG' && analytics.trends[timeframe]) || 
          (signalType === 'SHORT' && !analytics.trends[timeframe])) {
        trendAlignmentScore += 10 * weight; // Max 10 points weighted by timeframe importance
      }
    });
    
    marketContextScore += Math.round(trendAlignmentScore);
    
    // 3. Enhanced support/resistance analysis with dynamic zones
    // Define tighter zones for more precise entries
    const supportZone = {
      lower: analytics.support4h[0] * 0.995,
      upper: analytics.support4h[0] * 1.005
    };
    
    const resistanceZone = {
      lower: analytics.support4h[1] * 0.995,
      upper: analytics.support4h[1] * 1.005
    };
    
    // Volume confirmation at support/resistance
    const hasVolumeConfirmation = parseFloat(analytics.rvol) > 1.1;
    
    // Check for price action at support/resistance with volume confirmation
    if (signalType === 'LONG' && 
        currentPrice >= supportZone.lower && 
        currentPrice <= supportZone.upper) {
      // Price at support zone - good for long
      marketContextScore += hasVolumeConfirmation ? 7 : 4;
      
      // Add bonus for bullish divergence at support
      if (analytics.rsi['1h'] > analytics.rsi['4h'] && analytics.rsi['1h'] < 40) {
        marketContextScore += 3; // Potential bullish divergence
      }
    } else if (signalType === 'SHORT' && 
               currentPrice >= resistanceZone.lower && 
               currentPrice <= resistanceZone.upper) {
      // Price at resistance zone - good for short
      marketContextScore += hasVolumeConfirmation ? 7 : 4;
      
      // Add bonus for bearish divergence at resistance
      if (analytics.rsi['1h'] < analytics.rsi['4h'] && analytics.rsi['1h'] > 60) {
        marketContextScore += 3; // Potential bearish divergence
      }
    }
    
    // 4. Market structure analysis (higher highs/higher lows or lower highs/lower lows)
    const pivotPoints = analytics.pivotPoints;
    if (signalType === 'LONG' && 
        pivotPoints.s1 > pivotPoints.s2 && pivotPoints.s2 > pivotPoints.s3) {
      marketContextScore += 3; // Higher lows pattern - bullish structure
    } else if (signalType === 'SHORT' && 
               pivotPoints.r1 < pivotPoints.r2 && pivotPoints.r2 < pivotPoints.r3) {
      marketContextScore += 3; // Lower highs pattern - bearish structure
    }
    
    // 5. Adapt to current market regime (ranging vs trending)
    if (isRanging) {
      // In ranging markets, favor mean reversion signals
      if ((signalType === 'LONG' && bbPercentB < 0.2) || 
          (signalType === 'SHORT' && bbPercentB > 0.8)) {
        marketContextScore += 4; // Price likely to revert to mean in ranging market
      }
    } else if (isTrending) {
      // In trending markets, favor trend continuation signals
      if ((signalType === 'LONG' && analytics.macd.histogram > 0 && analytics.macd.histogram > analytics.macd.signal) || 
          (signalType === 'SHORT' && analytics.macd.histogram < 0 && analytics.macd.histogram < analytics.macd.signal)) {
        marketContextScore += 4; // Strong trend continuation signal
      }
    }
    
    // Ensure marketContextScore is within reasonable bounds
    marketContextScore = Math.min(Math.max(marketContextScore, 0), 15);
    
    // Ichimoku Cloud analysis
    let ichimokuScore = 0;
    const { tenkanSen, kijunSen, senkouSpanA, senkouSpanB, chikouSpan } = analytics.ichimoku;
    
    if (signalType === 'LONG') {
      // Bullish signals
      if (currentPrice > senkouSpanA && currentPrice > senkouSpanB) {
        ichimokuScore += 5; // Price above the cloud - bullish
      } else if (currentPrice > senkouSpanA && currentPrice < senkouSpanB) {
        ichimokuScore += 2; // Price in cloud but above Span A - moderately bullish
      }
      
      if (tenkanSen > kijunSen) {
        ichimokuScore += 3; // Tenkan-sen above Kijun-sen - bullish crossover
      }
      
      if (senkouSpanA > senkouSpanB) {
        ichimokuScore += 2; // Future cloud is bullish
      }
      
      if (chikouSpan > currentPrice) {
        ichimokuScore += 2; // Chikou span above price - bullish confirmation
      }
    } else {
      // Bearish signals
      if (currentPrice < senkouSpanA && currentPrice < senkouSpanB) {
        ichimokuScore += 5; // Price below the cloud - bearish
      } else if (currentPrice < senkouSpanA && currentPrice > senkouSpanB) {
        ichimokuScore += 2; // Price in cloud but below Span A - moderately bearish
      }
      
      if (tenkanSen < kijunSen) {
        ichimokuScore += 3; // Tenkan-sen below Kijun-sen - bearish crossover
      }
      
      if (senkouSpanA < senkouSpanB) {
        ichimokuScore += 2; // Future cloud is bearish
      }
      
      if (chikouSpan < currentPrice) {
        ichimokuScore += 2; // Chikou span below price - bearish confirmation
      }
    }
    
    // OBV (On-Balance Volume) analysis
    let obvScore = 0;
    const obvValue = analytics.obv;
    const obvThreshold = obvValue * 0.05; // 5% change threshold
    
    // Check if OBV is trending with price
    if (signalType === 'LONG' && marketData.priceChangePercent > 0 && obvValue > 0) {
      obvScore = 5; // Strong volume confirmation for uptrend
    } else if (signalType === 'SHORT' && marketData.priceChangePercent < 0 && obvValue < 0) {
      obvScore = 5; // Strong volume confirmation for downtrend
    } else if ((signalType === 'LONG' && obvValue > obvThreshold) || 
               (signalType === 'SHORT' && obvValue < -obvThreshold)) {
      obvScore = 3; // Moderate volume confirmation
    }
    
    // Combine all scores with optimized weighting for better accuracy
    // Adjusted weights based on indicator reliability and predictive power
    const signalStrength = (
      normalizedTimeframeScore * 1.0 + // 35-45 points max (with consistency bonus) - increased weight
      macdScore * 0.85 +               // 15 points max - slightly reduced
      bbScore * 1.0 +                  // 15 points max - increased weight for BB which is reliable
      volumeScore * 0.9 +              // 10 points max (9 with weight) - increased importance of volume
      obScore * 0.95 +                 // 15 points max - increased weight for order book data
      finalWhaleScore * 0.8 +          // 6 points max (4.8 with weight) - increased whale flow importance
      volatilityScore * 0.6 +          // 3.5 points max (2.1 with weight) - reduced volatility importance
      fundingScore * 0.8 +             // 3.5 points max (2.8 with weight) - increased funding rate importance
      marketContextScore * 0.9 +       // 7 points max (6.3 with weight) - increased market context importance
      ichimokuScore * 0.85 +           // 10 points max (8.5 with weight) - slightly increased
      obvScore * 0.8                   // 5 points max (4 with weight) - increased OBV importance
    );
    
    // Calculate confidence with improved scaling and floor/ceiling
    let confidence = Math.round(signalStrength);
    
    // Enhanced minimum confidence floor based on key indicators with more conditions
    if (confidence < 45 && 
        ((signalType === 'LONG' && 
          (bbPercentB < 0.1 && analytics.rsi['1h'] < 30) || 
          (analytics.rsi['4h'] < 25 && analytics.macd.histogram > 0) ||
          (currentPrice < analytics.support4h[0] * 1.01 && analytics.rsi['1h'] < 35)
        ) || 
         (signalType === 'SHORT' && 
          (bbPercentB > 0.9 && analytics.rsi['1h'] > 70) ||
          (analytics.rsi['4h'] > 75 && analytics.macd.histogram < 0) ||
          (currentPrice > analytics.support4h[1] * 0.99 && analytics.rsi['1h'] > 65)
         ))) {
      confidence = Math.max(confidence, 45); // Increased minimum floor for extreme conditions
    }
    
    // Enhanced maximum confidence ceiling for mixed signals with more precise conditions
    if (confidence > 85 && 
        ((signalType === 'LONG' && 
          ((bbPercentB > 0.8 && analytics.rsi['1d'] > 65) || 
           (analytics.macd.histogram < 0 && analytics.rsi['4h'] > 75) ||
           (whaleOutflow && analytics.rsi['1h'] > 70))
        ) || 
         (signalType === 'SHORT' && 
          ((bbPercentB < 0.2 && analytics.rsi['1d'] < 35) ||
           (analytics.macd.histogram > 0 && analytics.rsi['4h'] < 25) ||
           (whaleInflow && analytics.rsi['1h'] < 30))
         ))) {
      confidence = Math.min(confidence, 85); // Adjusted ceiling with more precise conditions
    }
    
    // Ensure confidence is within 0-100 range
    confidence = Math.min(Math.max(confidence, 0), 100);
    
    // Advanced signal detection system with multi-factor confirmation and false signal reduction
    // Signal quality assessment uses multiple factors to ensure high probability setups
    
    // 1. Multi-timeframe trend alignment with weighted importance
    const signalTimeframeWeights = { '15m': 0.15, '1h': 0.35, '4h': 0.35, '1d': 0.15 };
    let signalTrendAlignmentScore = 0;
    let alignedTimeframes = 0;
    
    Object.entries(signalTimeframeWeights).forEach(([timeframe, weight]) => {
      if ((signalType === 'LONG' && analytics.trends[timeframe]) || 
          (signalType === 'SHORT' && !analytics.trends[timeframe])) {
        signalTrendAlignmentScore += weight;
        alignedTimeframes++;
      }
    });
    
    // Require strong alignment across timeframes (at least 0.6 score and 3 timeframes aligned)
    const hasStrongTimeframeAlignment = signalTrendAlignmentScore >= 0.6 && alignedTimeframes >= 3;
    
    // 2. Volume confirmation - require above average volume for signal confirmation
    const signalVolumeConfirmation = parseFloat(analytics.rvol) >= 1.15;
    
    // 3. Price action confirmation
    // For longs: price should be above key EMAs on shorter timeframes
    // For shorts: price should be below key EMAs on shorter timeframes
    const hasPriceActionConfirmation = 
      (signalType === 'LONG' && 
       (analytics.ema['1h'] < currentPrice && analytics.ema['4h'] < currentPrice)) ||
      (signalType === 'SHORT' && 
       (analytics.ema['1h'] > currentPrice && analytics.ema['4h'] > currentPrice));
    
    // 4. Momentum confirmation - RSI and MACD alignment
    const hasMomentumConfirmation = 
      (signalType === 'LONG' && 
       ((analytics.rsi['1h'] > 40 && analytics.rsi['1h'] < 70) && analytics.macd.histogram > 0)) ||
      (signalType === 'SHORT' && 
       ((analytics.rsi['1h'] < 60 && analytics.rsi['1h'] > 30) && analytics.macd.histogram < 0));
    
    // 5. Order flow confirmation - check if order book pressure aligns with signal
    const orderBookPressure = parseFloat(analytics.orderBookPressure);
    const hasOrderFlowConfirmation = 
      (signalType === 'LONG' && orderBookPressure > 1.1) ||
      (signalType === 'SHORT' && orderBookPressure < 0.9);
    
    // 6. Risk-reward check - only generate signals with favorable R:R
    const riskReward = analytics.riskRewardRatio.r1;
    const hasGoodRiskReward = riskReward >= 1.8;
    
    // 7. Market structure alignment
    // For longs: check if we're in an uptrend structure (higher lows)
    // For shorts: check if we're in a downtrend structure (lower highs)
    const hasAlignedMarketStructure = 
      (signalType === 'LONG' && 
       analytics.pivotPoints.s1 > analytics.pivotPoints.s2) ||
      (signalType === 'SHORT' && 
       analytics.pivotPoints.r1 < analytics.pivotPoints.r2);
    
    // 8. Time-based filtering - avoid excessive signals
    const lastSignalTime = analytics.lastSignalTime || new Date(0);
    const timeSinceLastSignal = new Date().getTime() - lastSignalTime.getTime();
    
    // Dynamic time between signals based on timeframe
    // Higher timeframe signals need more time to develop
    let requiredTimeBetweenSignals = 15 * 60 * 1000; // 15 minutes default
    
    // If this is a high confidence signal (>85), reduce the waiting time
    if (confidence > 85) {
      requiredTimeBetweenSignals = 10 * 60 * 1000; // 10 minutes for high confidence
    }
    
    // If this is a very high confidence signal (>90), further reduce the waiting time
    if (confidence > 90) {
      requiredTimeBetweenSignals = 5 * 60 * 1000; // 5 minutes for very high confidence
    }
    
    const hasEnoughTimePassed = timeSinceLastSignal > requiredTimeBetweenSignals;
    
    // 9. Volatility check - avoid signals during extreme volatility
    const signalVolatilityPercent = analytics.atrVolatility / currentPrice * 100;
    const hasAcceptableVolatility = signalVolatilityPercent < 5.0; // Avoid extremely volatile conditions
    
    // Calculate confirmation score (0-10) based on how many confirmation factors are present
    let confirmationScore = 0;
    if (hasStrongTimeframeAlignment) confirmationScore += 2;
    if (signalVolumeConfirmation) confirmationScore += 1;
    if (hasPriceActionConfirmation) confirmationScore += 1.5;
    if (hasMomentumConfirmation) confirmationScore += 1.5;
    if (hasOrderFlowConfirmation) confirmationScore += 1;
    if (hasGoodRiskReward) confirmationScore += 1;
    if (hasAlignedMarketStructure) confirmationScore += 1;
    if (hasAcceptableVolatility) confirmationScore += 1;
    
    // Signal quality classification
    let signalQuality = 'Low';
    if (confirmationScore >= 7) signalQuality = 'Excellent';
    else if (confirmationScore >= 5) signalQuality = 'Good';
    else if (confirmationScore >= 3) signalQuality = 'Moderate';
    
    // Final signal detection logic - require high confidence AND good confirmation score
    const isNewSignal = 
      confidence >= 75 && 
      confirmationScore >= 5 && // At least 'Good' quality signals
      Math.abs(confidence - analytics.confidence) >= 8 && // Significant confidence change
      hasEnoughTimePassed; // Respect time between signals
    
    // Add signal to calculation log for debugging with enhanced details
    const calculationLog = [
      `Signal type: ${signalType}`,
      `Confidence: ${confidence}`,
      `Previous confidence: ${analytics.confidence}`,
      `Timeframe alignment score: ${signalTrendAlignmentScore.toFixed(2)} (${alignedTimeframes}/4 timeframes)`,
      `Volume confirmation: ${signalVolumeConfirmation ? 'Yes' : 'No'} (${analytics.rvol}x)`,
      `Price action confirmation: ${hasPriceActionConfirmation ? 'Yes' : 'No'}`,
      `Momentum confirmation: ${hasMomentumConfirmation ? 'Yes' : 'No'}`,
      `Order flow confirmation: ${hasOrderFlowConfirmation ? 'Yes' : 'No'} (${analytics.orderBookPressure})`,
      `Risk/Reward: ${hasGoodRiskReward ? 'Good' : 'Poor'} (${riskReward}:1)`,
      `Market structure aligned: ${hasAlignedMarketStructure ? 'Yes' : 'No'}`,
      `Volatility acceptable: ${hasAcceptableVolatility ? 'Yes' : 'No'} (${signalVolatilityPercent.toFixed(2)}%)`,
      `Confirmation score: ${confirmationScore.toFixed(1)}/10 (${signalQuality})`,
      `Time since last signal: ${Math.floor(timeSinceLastSignal / 60000)}min`,
      `New signal detected: ${isNewSignal ? 'Yes' : 'No'}`
    ];
    
    // Show browser notification if it's a new signal and notifications are supported
    if (isNewSignal) {
      showSignalNotification(symbol, signalType, confidence);
    }
    
    setPairAnalytics((prev) => ({
      ...prev,
      [symbol]: {
        ...prev[symbol],
        signalStrength: parseFloat(signalStrength.toFixed(1)),
        confidence,
        lastSignalTime: isNewSignal ? new Date() : prev[symbol].lastSignalTime,
        calculationLog: [...calculationLog]
      }
    }));
  };
  
  // Function to show browser notifications for new trading signals
  const showSignalNotification = (symbol: string, signalType: string, confidence: number) => {
    // Check if browser notifications are supported and permission is granted
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return;
    }
    
    // Request permission if needed
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
      return;
    }
    
    // Only show notification if permission is granted
    if (Notification.permission === 'granted') {
      const pairName = supportedPairs.find(pair => pair.symbol === symbol)?.name || symbol;
      const emoji = signalType === 'LONG' ? '🟢' : '🔴';
      const title = `${emoji} ${signalType} Signal: ${pairName}`;
      const body = `Confidence: ${confidence}% - Check entry levels now!`;
      
      // Use serviceWorker.showNotification if available (better for PWA), otherwise use regular Notification
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Service worker notifications are better for PWA as they can show even when the app is closed
        navigator.serviceWorker.ready.then(registration => {
          // Define notification options with proper typing for all ServiceWorkerRegistration.showNotification properties
          // Create a custom type that includes all the non-standard properties
          type ServiceWorkerNotificationOptions = NotificationOptions & { 
            vibrate?: number[]; 
            renotify?: boolean;
            data?: any;
          };
          
          const notificationOptions: ServiceWorkerNotificationOptions = {
            body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            tag: `signal-${symbol}-${Date.now()}`,
            renotify: true,
            data: { url: window.location.href },
            // Add vibrate pattern for mobile devices
            vibrate: [200, 100, 200]
          };
          
          registration.showNotification(title, notificationOptions);
        });
      } else {
        // Fallback to regular Notification API
        // Create a notification instance we can reference
        const notificationInstance = new Notification(title, {
          body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: `signal-${symbol}-${Date.now()}`
        });
        
        // Handle notification click for the standard Notification API
        notificationInstance.onclick = function() {
          window.focus();
          notificationInstance.close();
        };
        
        // Close notification after 30 seconds
        setTimeout(() => notificationInstance.close(), 30000);
      }
    }
  };
  
  // Request notification permission when component mounts
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);
  
  // Sử dụng useRef để lưu trữ thông tin trình duyệt mà không gây ra re-render
  const browserInfoRef = useRef({
    isSafari: false,
    isWebSocketSupported: false
  });
  
  // Log thông tin trình duyệt để debug - chỉ chạy một lần
  useEffect(() => {
    // Kiểm tra xem có phải Safari không
    browserInfoRef.current.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    browserInfoRef.current.isWebSocketSupported = 'WebSocket' in window;
    
    console.log('User Agent:', navigator.userAgent);
    console.log('Trình duyệt Safari:', browserInfoRef.current.isSafari);
    console.log('WebSocket supported:', browserInfoRef.current.isWebSocketSupported);
  }, []);
  
  useEffect(() => {
    // Sử dụng thông tin trình duyệt đã lưu trong useRef
    const { isSafari, isWebSocketSupported } = browserInfoRef.current;
    
    // Fetch initial data - thêm timeout để đảm bảo UI được render trước
    setTimeout(() => {
      fetchBinanceData();
    }, 500);
    
    // Connect to WebSocket if supported
    if (isWebSocketSupported && !isSafari) {
      // Đối với các trình duyệt không phải Safari, sử dụng WebSocket
      connectWebSocket();
    } else if (isWebSocketSupported && isSafari) {
      // Đối với Safari, thử kết nối WebSocket sau một khoảng thời gian ngắn
      setTimeout(() => {
        try {
          connectWebSocket();
        } catch (err) {
          console.error('Safari WebSocket error:', err);
          // Fallback to REST API
          setError('Kết nối WebSocket không thành công trên Safari. Đang sử dụng REST API.');
        }
      }, 1000);
    } else {
      console.warn('WebSocket không được hỗ trợ trong trình duyệt này. Sử dụng REST API thay thế.');
      setError('Trình duyệt của bạn không hỗ trợ WebSocket. Dữ liệu sẽ được cập nhật chậm hơn.');
    }
    
    // Set up interval for periodic data updates
    const intervalId = setInterval(() => {
      fetchHistoricalData();
      
      // Nếu không có WebSocket, cập nhật dữ liệu thường xuyên hơn
      if (!browserInfoRef.current.isWebSocketSupported || !wsRef.current) {
        fetchBinanceData();
      }
    }, browserInfoRef.current.isWebSocketSupported ? 60000 : 15000); // Cập nhật thường xuyên hơn nếu không có WebSocket
    
    // Clean up on unmount or when dependencies change
    return () => {
      clearInterval(intervalId);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [selectedSymbol, signalType]); // Re-run when symbol or signal type changes
  
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
  
  // Tính toán tỷ lệ rủi ro/lợi nhuận với phương pháp tối ưu hóa dựa trên ATR và volatility
  const calculateRiskReward = (): {
    rr1: string;
    rr2: string;
    optimizedEntry: number;
    optimizedValues: {
      entryRangeLow: number;
      entryRangeHigh: number;
      stopLoss: number;
      takeProfitOne: number;
      takeProfitTwo: number;
      riskRewardRatio: { r1: number; r2: number };
    };
  } => {
    // Get more precise entry point using weighted average of range
    // Give more weight to price closer to current market conditions
    const entryWeight = currentAnalytics.confidence >= 75 ? 0.7 : 0.5; // Higher confidence = tighter entry
    const entry = currentAnalytics.entryRangeLow * (1 - entryWeight) + currentAnalytics.entryRangeHigh * entryWeight;
    
    // Get current volatility as percentage
    const volatilityPercent = currentAnalytics.atrVolatility / marketData.price * 100;
    
    // Dynamic stop loss based on volatility and support/resistance levels
    let stopLoss = currentAnalytics.stopLoss;
    
    // For high volatility markets, use wider stops to avoid getting stopped out by noise
    if (volatilityPercent > 3.0) {
      // In high volatility, use a wider stop that's at least 1.5x ATR from entry
      const minStopDistance = currentAnalytics.atrVolatility * 1.5;
      const dynamicStop = signalType === 'LONG' 
        ? entry - minStopDistance
        : entry + minStopDistance;
      
      // Use the more conservative stop (further from entry)
      stopLoss = signalType === 'LONG'
        ? Math.min(stopLoss, dynamicStop)
        : Math.max(stopLoss, dynamicStop);
    } else if (volatilityPercent < 1.0) {
      // In low volatility, tighten stops to improve R:R ratio
      const maxStopDistance = currentAnalytics.atrVolatility * 1.2;
      const dynamicStop = signalType === 'LONG'
        ? entry - maxStopDistance
        : entry + maxStopDistance;
      
      // Use the tighter stop (closer to entry)
      stopLoss = signalType === 'LONG'
        ? Math.max(stopLoss, dynamicStop)
        : Math.min(stopLoss, dynamicStop);
    }
    
    // Dynamic take profit levels based on volatility and key resistance/support levels
    let tp1 = currentAnalytics.takeProfitOne;
    let tp2 = currentAnalytics.takeProfitTwo;
    
    // Adjust take profit levels based on market conditions
    if (signalType === 'LONG') {
      // For long positions, check if we can target higher levels
      if (currentAnalytics.pivotPoints.r1 > tp1 && currentAnalytics.pivotPoints.r1 < tp2) {
        // Use pivot resistance as first target if it's between tp1 and tp2
        tp1 = currentAnalytics.pivotPoints.r1;
      }
      
      // For second target, use Fibonacci extension if available
      if (currentAnalytics.fibonacci.trend === 'up' && 
          currentAnalytics.fibonacci.levels.ext1618 > entry * 1.01) {
        tp2 = currentAnalytics.fibonacci.levels.ext1618;
      }
    } else {
      // For short positions, check if we can target lower levels
      if (currentAnalytics.pivotPoints.s1 < tp1 && currentAnalytics.pivotPoints.s1 > tp2) {
        // Use pivot support as first target if it's between tp1 and tp2
        tp1 = currentAnalytics.pivotPoints.s1;
      }
      
      // For second target, use Fibonacci extension if available
      if (currentAnalytics.fibonacci.trend === 'down' && 
          currentAnalytics.fibonacci.levels.ext1618 < entry * 0.99) {
        tp2 = currentAnalytics.fibonacci.levels.ext1618;
      }
    }
    
    // Calculate risk and reward with the optimized levels
    const risk = Math.abs(entry - stopLoss);
    const reward1 = Math.abs(entry - tp1);
    const reward2 = Math.abs(entry - tp2);
    
    // Calculate R:R ratios with 2 decimal precision
    const rr1 = (reward1 / risk).toFixed(2);
    const rr2 = (reward2 / risk).toFixed(2);
    
    // Return the calculated values without updating state during render
    return { 
      rr1, 
      rr2, 
      optimizedEntry: entry,
      optimizedValues: {
        entryRangeLow: Math.min(entry, currentAnalytics.entryRangeLow),
        entryRangeHigh: Math.max(entry, currentAnalytics.entryRangeHigh),
        stopLoss,
        takeProfitOne: tp1,
        takeProfitTwo: tp2,
        riskRewardRatio: { r1: parseFloat(rr1), r2: parseFloat(rr2) }
      }
    };
  };
  
  // Sử dụng useRef để lưu trữ optimizedValues mà không gây ra re-render
  const optimizedValuesRef = useRef<any>(null);
  const previousSymbolRef = useRef<string>(selectedSymbol);
  const previousSignalTypeRef = useRef<string>(signalType);
  
  // Tính toán risk/reward ratios
  const { rr1, rr2, optimizedValues } = calculateRiskReward();
  
  // Cập nhật optimizedValuesRef khi có thay đổi
  useEffect(() => {
    // Chỉ cập nhật khi symbol hoặc signalType thay đổi
    const symbolChanged = previousSymbolRef.current !== selectedSymbol;
    const signalTypeChanged = previousSignalTypeRef.current !== signalType;
    
    if (symbolChanged || signalTypeChanged) {
      // Cập nhật tham chiếu
      previousSymbolRef.current = selectedSymbol;
      previousSignalTypeRef.current = signalType;
      
      // Lưu optimizedValues vào ref
      if (optimizedValues && Object.keys(optimizedValues).length > 0) {
        optimizedValuesRef.current = optimizedValues;
        
        // Cập nhật state
        setPairAnalytics((prev: Record<string, any>) => {
          const currentValues = prev[selectedSymbol] || {};
          
          return {
            ...prev,
            [selectedSymbol]: {
              ...currentValues,
              ...optimizedValues
            }
          };
        });
      }
    }
  }, [selectedSymbol, signalType]);
  
  // Tạo tóm tắt giao dịch với phân tích chi tiết và chất lượng hơn
  const generateTradingSummary = () => {
    const analytics = currentAnalytics;
    const price = marketData.price;
    
    // Phân tích xu hướng theo khung thời gian với trọng số
    const timeframes = [
      { tf: '5m', name: '5 phút', weight: 0.1 },
      { tf: '15m', name: '15 phút', weight: 0.15 },
      { tf: '1h', name: '1 giờ', weight: 0.2 },
      { tf: '4h', name: '4 giờ', weight: 0.25 },
      { tf: '1d', name: '1 ngày', weight: 0.3 }
    ];
    
    // Tính điểm xu hướng có trọng số
    let trendScore = 0;
    let trendCount = 0;
    let strongestTrend = '';
    let strongestWeight = 0;
    
    timeframes.forEach(({ tf, name, weight }) => {
      if (analytics.trends?.[tf]) {
        trendCount++;
        trendScore += weight;
        
        if (weight > strongestWeight) {
          strongestWeight = weight;
          strongestTrend = name;
        }
      }
    });
    
    // Xác định xu hướng tổng thể dựa trên điểm có trọng số
    const overallTrend = trendScore >= 0.6 ? 'bullish' : trendScore <= 0.3 ? 'bearish' : 'neutral';
    
    // Phân tích độ rộng Bollinger Bands để đánh giá biến động
    const bbWidth = analytics.bb.width;
    const bbPercentB = analytics.bb.percentB;
    const isVolatilityLow = bbWidth < 0.03;
    const isVolatilityHigh = bbWidth > 0.06;
    const isOverbought = bbPercentB > 0.9;
    const isOversold = bbPercentB < 0.1;
    
    // Phân tích phân kỳ RSI
    const rsiDivergence = 
      (price > analytics.ema?.['1h'] && analytics.rsi?.['1h'] < 45) || 
      (price < analytics.ema?.['1h'] && analytics.rsi?.['1h'] > 55);
    
    // Phân tích MACD
    const macdCrossoverNear = 
      (analytics.macd?.histogram > 0 && analytics.macd?.histogram < 0.1 * Math.abs(analytics.macd?.line)) || 
      (analytics.macd?.histogram < 0 && analytics.macd?.histogram > -0.1 * Math.abs(analytics.macd?.line));
    
    const macdCrossoverRecent = 
      (analytics.macd?.histogram > 0 && analytics.macd?.histogram < 0.3 * Math.abs(analytics.macd?.line)) || 
      (analytics.macd?.histogram < 0 && analytics.macd?.histogram > -0.3 * Math.abs(analytics.macd?.line));
    
    // Phân tích áp lực order book
    const obPressure = parseFloat(analytics.orderBookPressure);
    const strongBuyPressure = obPressure > 1.5;
    const strongSellPressure = obPressure < 0.7;
    
    // Phân tích khối lượng giao dịch
    const rVol = parseFloat(analytics.rvol);
    const isHighVolume = rVol > 1.5;
    const isLowVolume = rVol < 0.8;
    
    // Phân tích funding rate
    const fundingRate = parseFloat(analytics.fundingRate);
    const isFundingPositive = fundingRate > 0.01;
    const isFundingNegative = fundingRate < -0.01;
    
    // Create summary based on analysis
    let summary = '';
    const coinName = supportedPairs.find(p => p.symbol === selectedSymbol)?.name || selectedSymbol;
    
    if (signalType === 'LONG') {
      // LONG signal
      if (overallTrend === 'bullish') {
        // Strong bullish trend
        summary = `${coinName} is showing a strong bullish trend across ${trendCount}/${timeframes.length} timeframes, especially on the ${strongestTrend} timeframe. `;
        
        // RSI analysis
        if (analytics.rsi?.['1h'] < 40 && analytics.rsi?.['1h'] > 20) {
          summary += `RSI is in oversold territory (${analytics.rsi?.['1h']}) on the 1-hour timeframe, indicating a good buying opportunity. `;
        } else if (analytics.rsi?.['1h'] > 60) {
          summary += `RSI is at high levels (${analytics.rsi?.['1h']}) on the 1-hour timeframe, caution advised for potential short-term corrections. `;
        }
        
        // Bollinger Bands analysis
        if (isOversold) {
          summary += `Price is in oversold territory (${(bbPercentB * 100).toFixed(0)}%) according to Bollinger Bands, strong recovery potential. `;
        } else if (price < analytics.bb?.lower * 1.01) {
          summary += `Price is below the lower Bollinger Band, showing recovery signals. `;
        } else if (isOverbought) {
          summary += `Price is in overbought territory (${(bbPercentB * 100).toFixed(0)}%) according to Bollinger Bands, caution advised. `;
        }
        
        // Buy/sell pressure analysis
        if (strongBuyPressure) {
          summary += `Buy pressure in the order book is very strong (${analytics.orderBookPressure}x), supporting the uptrend. `;
        }
        
        // MACD analysis
        if (analytics.macd?.histogram > 0 && analytics.macd?.histogram > analytics.macd?.histogram * 0.1) {
          summary += `MACD is positive with expanding histogram, confirming the uptrend. `;
        } else if (macdCrossoverRecent) {
          summary += `MACD recently crossed above the signal line, showing new bullish momentum. `;
        }
        
        // Volume analysis
        if (isHighVolume) {
          summary += `Trading volume is high (${analytics.rvol}x), confirming trend strength. `;
        }
      } else {
        // Unclear or sideways trend
        summary = `${coinName} is showing neutral signals, only bullish on ${trendCount}/${timeframes.length} timeframes. `;
        
        if (rsiDivergence) {
          summary += `RSI divergence with price detected, caution advised when entering positions. `;
        }
        
        if (isVolatilityLow) {
          summary += `Low volatility (${(bbWidth * 100).toFixed(1)}%), potential price breakout ahead. `;
        } else if (isVolatilityHigh) {
          summary += `High volatility (${(bbWidth * 100).toFixed(1)}%), market is unstable. `;
        }
        
        if (macdCrossoverNear) {
          summary += `MACD approaching crossover point, new signal may emerge soon. `;
        }
        
        if (isLowVolume) {
          summary += `Trading volume is low (${analytics.rvol}x), lacking confirmation for the trend. `;
        }
      }
    } else { 
      // SHORT signal
      if (overallTrend === 'bearish') {
        // Strong bearish trend
        summary = `${coinName} is showing a bearish trend across ${5-trendCount}/${timeframes.length} timeframes, especially on the ${strongestTrend} timeframe. `;
        
        // RSI analysis
        if (analytics.rsi?.['1h'] > 60 && analytics.rsi?.['1h'] < 80) {
          summary += `RSI is in overbought territory (${analytics.rsi?.['1h']}) on the 1-hour timeframe, indicating a good selling opportunity. `;
        } else if (analytics.rsi?.['1h'] < 40) {
          summary += `RSI is at low levels (${analytics.rsi?.['1h']}) on the 1-hour timeframe, caution advised for potential short-term rebounds. `;
        }
        
        // Bollinger Bands analysis
        if (isOverbought) {
          summary += `Price is in overbought territory (${(bbPercentB * 100).toFixed(0)}%) according to Bollinger Bands, potential for downward correction. `;
        } else if (price > analytics.bb?.upper * 0.99) {
          summary += `Price is above the upper Bollinger Band, showing correction signals. `;
        } else if (isOversold) {
          summary += `Price is in oversold territory (${(bbPercentB * 100).toFixed(0)}%) according to Bollinger Bands, caution advised. `;
        }
        
        // Buy/sell pressure analysis
        if (strongSellPressure) {
          summary += `Sell pressure in the order book is very strong (${analytics.orderBookPressure}x), supporting the downtrend. `;
        }
        
        // MACD analysis
        if (analytics.macd?.histogram < 0 && analytics.macd?.histogram < analytics.macd?.histogram * 0.1) {
          summary += `MACD is negative with expanding histogram, confirming the downtrend. `;
        } else if (macdCrossoverRecent) {
          summary += `MACD recently crossed below the signal line, showing new bearish momentum. `;
        }
        
        // Volume analysis
        if (isHighVolume) {
          summary += `Trading volume is high (${analytics.rvol}x), confirming strength of the downtrend. `;
        }
      } else {
        // Unclear or sideways trend
        summary = `${coinName} is showing neutral signals, only bearish on ${5-trendCount}/${timeframes.length} timeframes. `;
        
        if (rsiDivergence) {
          summary += `RSI divergence with price detected, caution advised when entering positions. `;
        }
        
        if (isVolatilityLow) {
          summary += `Low volatility (${(bbWidth * 100).toFixed(1)}%), potential price breakout ahead. `;
        } else if (isVolatilityHigh) {
          summary += `High volatility (${(bbWidth * 100).toFixed(1)}%), market is unstable. `;
        }
        
        if (macdCrossoverNear) {
          summary += `MACD approaching crossover point, new signal may emerge soon. `;
        }
        
        if (isLowVolume) {
          summary += `Trading volume is low (${analytics.rvol}x), lacking confirmation for the trend. `;
        }
      }
    }
    
    // Add risk/reward ratio information
    summary += `Risk/reward ratio: R1=${rr1}, R2=${rr2}. `;
    
    // Add funding rate information if available
    if (analytics.fundingRate) {
      if (isFundingPositive && signalType === 'SHORT') {
        summary += `Positive funding rate (${analytics.fundingRate}) indicates market is biased towards longs, favorable for short positions. `;
      } else if (isFundingNegative && signalType === 'LONG') {
        summary += `Negative funding rate (${analytics.fundingRate}) indicates market is biased towards shorts, favorable for long positions. `;
      } else {
        summary += `Funding rate: ${analytics.fundingRate} (${parseFloat(analytics.fundingRate) > 0 ? "longs pay shorts" : "shorts pay longs"}). `;
      }
    }
    
    // Add overall assessment of signal reliability
    if (analytics.confidence >= 80) {
      summary += `Signal has very high confidence (${analytics.confidence}%), recommended to monitor closely for optimal entry points.`;
    } else if (analytics.confidence >= 65) {
      summary += `Signal has moderate confidence (${analytics.confidence}%), consider entering positions with appropriate risk management.`;
    } else {
      summary += `Signal has low confidence (${analytics.confidence}%), wait for additional confirmation before entering positions.`;
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
