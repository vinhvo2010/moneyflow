import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, X, Check, RefreshCw, BarChart2, AlertTriangle } from 'lucide-react';

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
  
  // Dữ liệu phân tích cho từng cặp giao dịch
  type Analytics = {
  rsi: number;
  ema1h: number;
  ema4h: number;
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
};

const [pairAnalytics, setPairAnalytics] = useState<Record<string, Analytics>>({
    'BTCUSDT': {
      rsi: 42.18,
      ema1h: 63250.45,
      ema4h: 62980.75,
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
      trends: { '5m': true, '15m': true, '1h': true },
      support4h: [61200, 64800],
      support1d: [58500, 66500],
      liquidations: { buy: 1250000, sell: 850000 }
    },
    'THETAUSDT': {
      rsi: 58.75,
      ema1h: 1.452,
      ema4h: 1.438,
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
      trends: { '5m': true, '15m': true, '1h': false },
      support4h: [1.32, 1.62],
      support1d: [1.15, 1.75],
      liquidations: { buy: 125000, sell: 95000 }
    },
    'SOLUSDT': {
      rsi: 27.52,
      ema1h: 146.91,
      ema4h: 147.82,
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
      trends: { '5m': false, '15m': true, '1h': true },
      support4h: [140.25, 153.88],
      support1d: [95.19, 157.24],
      liquidations: { buy: 0, sell: 0 }
    },
    'ETHUSDT': {
      rsi: 45.32,
      ema1h: 3052.45,
      ema4h: 3048.75,
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
      trends: { '5m': true, '15m': false, '1h': true },
      support4h: [2950, 3150],
      support1d: [2800, 3250],
      liquidations: { buy: 450000, sell: 320000 }
    },
    'BNBUSDT': {
      rsi: 52.18,
      ema1h: 578.45,
      ema4h: 575.75,
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
      trends: { '5m': false, '15m': true, '1h': true },
      support4h: [560, 595],
      support1d: [540, 610],
      liquidations: { buy: 350000, sell: 280000 }
    }
  });

  // Fetch data from Binance API
  const fetchBinanceData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch ticker price
      const tickerResponse = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${selectedSymbol}`);
      if (!tickerResponse.ok) throw new Error('Failed to fetch ticker data');
      
      const tickerData = await tickerResponse.json();
      
      // Update market data
      setMarketData({
        price: parseFloat(tickerData.lastPrice),
        priceChangePercent: parseFloat(tickerData.priceChangePercent),
        high24h: parseFloat(tickerData.highPrice),
        low24h: parseFloat(tickerData.lowPrice),
        volume: parseFloat(tickerData.volume),
        lastUpdate: new Date()
      });
      
      // Update analytics based on current price
      updateAnalytics(selectedSymbol, parseFloat(tickerData.lastPrice));
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch market data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Update analytics based on current price
  const updateAnalytics = (symbol: string, currentPrice: number) => {
    const analytics = {...pairAnalytics[symbol as keyof typeof pairAnalytics]};
    
    // Adjust entry range based on current price
    analytics.entryRangeLow = parseFloat((currentPrice * 0.995).toFixed(symbol === 'BTCUSDT' ? 2 : 4));
    analytics.entryRangeHigh = parseFloat((currentPrice * 1.002).toFixed(symbol === 'BTCUSDT' ? 2 : 4));
    
    // Adjust stop loss and take profit
    analytics.stopLoss = parseFloat((currentPrice * 0.99).toFixed(symbol === 'BTCUSDT' ? 2 : 4));
    analytics.takeProfitOne = parseFloat((currentPrice * 1.005).toFixed(symbol === 'BTCUSDT' ? 2 : 4));
    analytics.takeProfitTwo = parseFloat((currentPrice * 1.01).toFixed(symbol === 'BTCUSDT' ? 2 : 4));
    
    // Update EMAs
    analytics.ema1h = parseFloat((currentPrice * (1 + (Math.random() * 0.01 - 0.005))).toFixed(symbol === 'BTCUSDT' ? 2 : 4));
    analytics.ema4h = parseFloat((currentPrice * (1 + (Math.random() * 0.015 - 0.005))).toFixed(symbol === 'BTCUSDT' ? 2 : 4));
    
    // Update ATR volatility
    analytics.atrVolatility = parseFloat((currentPrice * 0.02).toFixed(symbol === 'BTCUSDT' ? 2 : 4));
    
    // Update support/resistance levels
    analytics.support4h = [
      parseFloat((currentPrice * 0.96).toFixed(symbol === 'BTCUSDT' ? 2 : 4)),
      parseFloat((currentPrice * 1.06).toFixed(symbol === 'BTCUSDT' ? 2 : 4))
    ];
    
    analytics.support1d = [
      parseFloat((currentPrice * 0.92).toFixed(symbol === 'BTCUSDT' ? 2 : 4)),
      parseFloat((currentPrice * 1.08).toFixed(symbol === 'BTCUSDT' ? 2 : 4))
    ];
    
    // Update pairAnalytics
    setPairAnalytics((prev: typeof pairAnalytics) => ({
      ...prev,
      [symbol]: analytics
    }));
  };
  
  // Fetch data on component mount and when symbol changes
  useEffect(() => {
    fetchBinanceData();
    
    // Set up interval to fetch data every 30 seconds
    const intervalId = setInterval(fetchBinanceData, 30000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [selectedSymbol]);
  
  // Format number with thousands separator
  const formatNumber = (num: number, decimals = 2) => {
    return num?.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) || '0';
  };
  
  // Format large numbers with K, M, B suffix
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
  
  // Get current analytics for selected pair
  const currentAnalytics = pairAnalytics[selectedSymbol] || {};
  
  // Determine if price is above or below EMAs
  const isPriceAboveEma1h = marketData.price > currentAnalytics.ema1h;
  const isPriceAboveEma4h = marketData.price > currentAnalytics.ema4h;
  
  // Determine signal strength based on indicators
  const getSignalStrength = () => {
    const indicators = [
      currentAnalytics.rsi < 30 || currentAnalytics.rsi > 70, // Extreme RSI
      currentAnalytics.trends['1h'], // 1h trend matches signal
      currentAnalytics.trends['15m'], // 15m trend matches signal
      currentAnalytics.orderBookPressure > 1.5, // Strong order book pressure
      currentAnalytics.takerFlowAggression > 55, // Strong taker flow
      currentAnalytics.whaleFlow.includes('Inflow > Outflow'), // Positive whale flow
    ];
    
    const positiveCount = indicators.filter(Boolean).length;
    return (positiveCount / indicators.length) * 100;
  };
  
  return (
    <div className="flex flex-col bg-black text-white font-mono p-6 rounded-lg max-w-2xl">
      <div className="flex items-center mb-4">
        <span className="text-xl font-bold">[SIGNAL]</span>
        <div className="ml-2">
          <select 
            className="bg-gray-800 text-white text-xl border-none outline-none p-1 rounded"
            value={selectedSymbol}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedSymbol(e.target.value)}
          >
            {supportedPairs.map(pair => (
              <option key={pair.symbol} value={pair.symbol}>{pair.symbol}</option>
            ))}
          </select>
          <span className="text-xl ml-1">→</span>
          <select
            className="bg-gray-800 text-white text-xl border-none outline-none p-1 ml-1 rounded"
            value={signalType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSignalType(e.target.value)}
          >
            <option value="LONG">LONG</option>
            <option value="SHORT">SHORT</option>
          </select>
        </div>
        <span className="ml-auto bg-green-800 px-2 py-1 rounded">
          CONFIDENCE: {currentAnalytics.confidence || 0}%
        </span>
      </div>
      
      <div className="flex items-center mb-4">
        <div>
          <span className="text-lg font-semibold">
            {supportedPairs.find(p => p.symbol === selectedSymbol)?.name || selectedSymbol}:&nbsp;
            <span className={marketData.priceChangePercent >= 0 ? "text-green-500" : "text-red-500"}>
              ${formatNumber(marketData.price, selectedSymbol === 'BTCUSDT' ? 2 : 4)}
            </span>
          </span>
          <span className={`ml-2 ${marketData.priceChangePercent >= 0 ? "text-green-500" : "text-red-500"}`}>
            ({marketData.priceChangePercent >= 0 ? "+" : ""}{formatNumber(marketData.priceChangePercent, 2)}%)
          </span>
        </div>
        <button 
          className="ml-auto flex items-center bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-sm"
          onClick={fetchBinanceData}
          disabled={loading}
        >
          <RefreshCw size={16} className={`mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
      
      {error && (
        <div className="bg-red-900/50 text-red-200 p-2 mb-4 rounded flex items-center">
          <AlertTriangle size={16} className="mr-2" />
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-900/50 p-3 rounded">
          <div className="text-sm text-gray-400 mb-1">24h High/Low</div>
          <div className="flex justify-between">
            <span className="text-green-500">${formatNumber(marketData.high24h, selectedSymbol === 'BTCUSDT' ? 2 : 4)}</span>
            <span className="text-red-500">${formatNumber(marketData.low24h, selectedSymbol === 'BTCUSDT' ? 2 : 4)}</span>
          </div>
        </div>
        
        <div className="bg-gray-900/50 p-3 rounded">
          <div className="text-sm text-gray-400 mb-1">24h Volume</div>
          <div className="flex justify-between items-center">
            <span>${formatLargeNumber(marketData.volume)}</span>
            <span className={currentAnalytics.deltaVolume >= 0 ? "text-green-500" : "text-red-500"}>
              Δ {currentAnalytics.deltaVolume >= 0 ? "+" : ""}{formatLargeNumber(currentAnalytics.deltaVolume)}
            </span>
          </div>
        </div>
      </div>
      
      <div className="space-y-2 text-lg">
        <div className="flex">
          <span className="w-64">Entry Range:</span>
          <span>({formatNumber(currentAnalytics.entryRangeLow, selectedSymbol === 'BTCUSDT' ? 2 : 4)} - {formatNumber(currentAnalytics.entryRangeHigh, selectedSymbol === 'BTCUSDT' ? 2 : 4)})</span>
        </div>
        
        <div className="flex">
          <span className="w-64">Stop Loss:</span>
          <span className="text-red-500">{formatNumber(currentAnalytics.stopLoss, selectedSymbol === 'BTCUSDT' ? 2 : 4)}</span>
        </div>
        
        <div className="flex">
          <span className="w-64">Take Profit:</span>
          <span className="text-green-500">({formatNumber(currentAnalytics.takeProfitOne, selectedSymbol === 'BTCUSDT' ? 2 : 4)}, {formatNumber(currentAnalytics.takeProfitTwo, selectedSymbol === 'BTCUSDT' ? 2 : 4)})</span>
        </div>
        
        <div className="flex">
          <span className="w-64">RSI:</span>
          <span className={currentAnalytics.rsi < 30 ? "text-red-400" : currentAnalytics.rsi > 70 ? "text-green-400" : ""}>
            {currentAnalytics.rsi}
          </span>
        </div>
        
        <div className="flex">
          <span className="w-64">Whale Flow:</span>
          <span className={currentAnalytics.whaleFlow.includes('Inflow') ? "text-green-400" : "text-red-400"}>
            {currentAnalytics.whaleFlow}
          </span>
        </div>
        
        <div className="flex">
          <span className="w-64">RVOL:</span>
          <span className={parseFloat(currentAnalytics.rvol) > 1 ? "text-green-400" : "text-gray-400"}>
            {currentAnalytics.rvol}
          </span>
        </div>
        
        <div className="flex">
          <span className="w-64">ΔVolume:</span>
          <span className={currentAnalytics.deltaVolume >= 0 ? "text-green-400" : "text-red-400"}>
            {currentAnalytics.deltaVolume >= 0 ? "+" : ""}{formatNumber(currentAnalytics.deltaVolume, 2)}
          </span>
        </div>
        
        <div className="flex">
          <span className="w-64">Liquidations:</span>
          <span>
            Buy {formatLargeNumber(currentAnalytics.liquidations?.buy || 0)} | 
            Sell {formatLargeNumber(currentAnalytics.liquidations?.sell || 0)}
          </span>
        </div>
        
        <div className="flex">
          <span className="w-64">Order Book Pressure:</span>
          <span className="text-green-500">{currentAnalytics.orderBookPressure}</span>
        </div>
        
        <div className="flex">
          <span className="w-64">Taker Flow Aggression:</span>
          <span className="text-green-500">{currentAnalytics.takerFlowAggression}</span>
        </div>
        
        <div className="flex">
          <span className="w-64">Funding Rate:</span>
          <span>
            {currentAnalytics.fundingRate} | Funding Trend: {currentAnalytics.fundingTrend}
          </span>
        </div>
        
        <div className="flex">
          <span className="w-64">OI Delta:</span>
          <span className={parseFloat(currentAnalytics.oiDelta) >= 0 ? "text-green-400" : "text-red-400"}>
            {currentAnalytics.oiDelta}
          </span>
        </div>
        
        <div className="flex">
          <span className="w-64">EMA Trend:</span>
          <span>
            1h={formatNumber(currentAnalytics.ema1h, selectedSymbol === 'BTCUSDT' ? 2 : 4)}, 
            4h={formatNumber(currentAnalytics.ema4h, selectedSymbol === 'BTCUSDT' ? 2 : 4)}, 
            Price={formatNumber(marketData.price, selectedSymbol === 'BTCUSDT' ? 2 : 4)}
          </span>
        </div>
        
        <div className="flex">
          <span className="w-64">ATR Volatility:</span>
          <span>
            {formatNumber(currentAnalytics.atrVolatility, selectedSymbol === 'BTCUSDT' ? 2 : 4)} 
            ({formatNumber(currentAnalytics.atrVolatility / marketData.price * 100, 2)}% of price)
          </span>
        </div>
        
        <div className="flex items-center">
          <span className="w-64">Trend:</span>
          <span className="flex items-center">
            <span className="mr-2">5m=</span>
            <span className={`${currentAnalytics.trends?.['5m'] ? "bg-green-600" : "bg-red-600"} rounded-full p-1`}>
              {currentAnalytics.trends?.['5m'] ? <Check size={16} /> : <X size={16} />}
            </span>
            <span className="mx-2">|</span>
            <span className="mr-2">15m=</span>
            <span className={`${currentAnalytics.trends?.['15m'] ? "bg-green-600" : "bg-red-600"} rounded-full p-1`}>
              {currentAnalytics.trends?.['15m'] ? <Check size={16} /> : <X size={16} />}
            </span>
            <span className="mx-2">|</span>
            <span className="mr-2">1h=</span>
            <span className={`${currentAnalytics.trends?.['1h'] ? "bg-green-600" : "bg-red-600"} rounded-full p-1`}>
              {currentAnalytics.trends?.['1h'] ? <Check size={16} /> : <X size={16} />}
            </span>
          </span>
        </div>
        
        <div className="flex">
          <span className="w-64">Support/Resistance 4h:</span>
          <span>
            {formatNumber(currentAnalytics.support4h?.[0], selectedSymbol === 'BTCUSDT' ? 2 : 4)}-
            {formatNumber(currentAnalytics.support4h?.[1], selectedSymbol === 'BTCUSDT' ? 2 : 4)}
          </span>
        </div>
        
        <div className="flex">
          <span className="w-64">Support/Resistance 1D:</span>
          <span>
            {formatNumber(currentAnalytics.support1d?.[0], selectedSymbol === 'BTCUSDT' ? 2 : 4)}-
            {formatNumber(currentAnalytics.support1d?.[1], selectedSymbol === 'BTCUSDT' ? 2 : 4)}
          </span>
        </div>
      </div>
      
      <div className="mt-6 bg-gray-900/50 p-3 rounded">
        <h3 className="text-lg font-semibold mb-2 flex items-center">
          <BarChart2 size={18} className="mr-2" />
          {supportedPairs.find(p => p.symbol === selectedSymbol)?.name || selectedSymbol} Market Analysis
        </h3>
        <p className="text-sm">
          {selectedSymbol === 'BTCUSDT' && (
            <>
              Bitcoin đang cho thấy xu hướng tích cực với áp lực mua mạnh (Order Book Pressure: {currentAnalytics.orderBookPressure}). 
              Dòng tiền cá voi đang vào thị trường ({currentAnalytics.whaleFlow}) và chỉ số RSI ở mức {currentAnalytics.rsi} cho thấy 
              còn dư địa tăng giá. Khối lượng giao dịch tăng {currentAnalytics.rvol} so với trung bình, 
              với áp lực mua từ người giao dịch chủ động ({currentAnalytics.takerFlowAggression}).
            </>
          )}
          
          {selectedSymbol === 'THETAUSDT' && (
            <>
              THETA đang cho thấy động lực tăng giá mạnh với RSI ở mức {currentAnalytics.rsi}. 
              Khối lượng giao dịch cao hơn trung bình ({currentAnalytics.rvol}) và dòng tiền cá voi đang vào thị trường ({currentAnalytics.whaleFlow}).
              Áp lực mua từ người giao dịch chủ động ({currentAnalytics.takerFlowAggression}) và áp lực sổ lệnh ({currentAnalytics.orderBookPressure}) 
              đều ủng hộ xu hướng tăng giá ngắn hạn.
            </>
          )}
          
          {selectedSymbol === 'SOLUSDT' && (
            <>
              Solana hiện đang trong vùng quá bán với RSI ở mức {currentAnalytics.rsi}. 
              Dòng tiền cá voi đang rút ra khỏi thị trường ({currentAnalytics.whaleFlow}) nhưng áp lực sổ lệnh ({currentAnalytics.orderBookPressure}) 
              vẫn cho thấy dấu hiệu tích cực. Funding rate âm (-0.0067%) có thể là dấu hiệu cho đảo chiều sắp tới.
            </>
          )}
          
          {(selectedSymbol !== 'BTCUSDT' && selectedSymbol !== 'THETAUSDT' && selectedSymbol !== 'SOLUSDT') && (
            <>
              {supportedPairs.find(p => p.symbol === selectedSymbol)?.name || selectedSymbol} đang cho thấy các dấu hiệu 
              {currentAnalytics.rsi > 50 ? " tích cực " : " tiêu cực "}
              với RSI ở mức {currentAnalytics.rsi}. 
              {currentAnalytics.whaleFlow.includes('Inflow') ? 
                " Dòng tiền cá voi đang vào thị trường và " : 
                " Dòng tiền cá voi đang rút ra khỏi thị trường nhưng "}
              áp lực sổ lệnh ({currentAnalytics.orderBookPressure}) 
              {parseFloat(currentAnalytics.orderBookPressure) > 1.5 ? 
                " cho thấy dấu hiệu tích cực." : 
                " đang yếu."}
            </>
          )}
        </p>
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>Last updated: {marketData.lastUpdate instanceof Date ? marketData.lastUpdate.toLocaleTimeString() : 'N/A'}</span>
          <span>@CryptoNai</span>
        </div>
      </div>
    </div>
  );
};

export default TradingSignal;