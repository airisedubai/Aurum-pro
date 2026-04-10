import { useState, useRef, useEffect } from "react";

const USD_AED = 3.673;
const API_URL = "https://your-backend.onrender.com/api/analysis"; // Replace later

// Asset configuration
const ASSETS = [
  { id: "gold", label: "Gold", sym: "XAUUSD", emoji: "🥇", color: "#F59E0B", unit: "pts" },
  { id: "btc", label: "Bitcoin", sym: "BTCUSD", emoji: "₿", color: "#F97316", unit: "USD" },
  { id: "eth", label: "Ether", sym: "ETHUSD", emoji: "Ξ", color: "#8B5CF6", unit: "USD" },
  { id: "sol", label: "Solana", sym: "SOLUSD", emoji: "◎", color: "#10B981", unit: "USD" },
  { id: "xrp", label: "XRP", sym: "XRPUSD", emoji: "✕", color: "#3B82F6", unit: "USD" },
];

// Initial prices (fallback if API fails)
const INIT_PRICES = { gold: 4532.44, btc: 66870.60, eth: 1808.95, sol: 123.45, xrp: 2.1347 };
const VOLATILITY = { gold: 0.0003, btc: 0.0006, eth: 0.0008, sol: 0.0012, xrp: 0.0012 };
function formatPrice(id, price) {
  if (id === "gold") return price.toFixed(2);
  if (id === "xrp") return price.toFixed(4);
  if (id === "sol") return price.toFixed(2);
  return price >= 1000 ? price.toLocaleString() : price.toFixed(2);
}

function Sparkline({ data, width = 64, height = 20 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 2)}`).join(" ");
  const isUp = data[data.length - 1] >= data[0];
  return <svg width={width} height={height}><polyline points={points} fill="none" stroke={isUp ? "#10B981" : "#EF4444"} strokeWidth="1.5" /></svg>;
}

// Trading data for each asset
function getAssetData(assetId, currentPrice) {
  const dataMap = {
    gold: {
      action: "BUY", confidence: "HIGH", confidencePct: 82,
      entry: [4500, 4516], stopLoss: 4444, target1: 4623, target2: 4725,
      predict1d: 0.6, predict1w: 2.1, predict1m: 4.8,
      bullish: 78, bearish: 14,
      reasons: ["Central banks buying at record pace", "DXY trending down", "Tariff fears driving safe-haven demand", "Dubai Gold Souk premiums widening", "RSI at 64 - momentum intact"],
      risks: ["Surprise Fed hawkish pivot", "Rapid risk-on rally", "DXY reversal above 104.5"],
      options: [
        { type: "CALL", strike: 4580, expiry: "Apr 18", premium: "~42 pts", strategy: "Buy Call — ride breakout to T1", risk: "Limited to premium" },
        { type: "CALL SPREAD", strike: "4,500/4,650", expiry: "Apr 18", premium: "~28 pts", strategy: "Bull Call Spread", risk: "Max loss = net premium" }
      ],
      macro: "Fed on hold. DXY weak. Gulf CB buying accelerating.",
      dubai: "XM gold CFD highly liquid in Dubai session (06:00-14:00 GMT+4)."
    },
    btc: {
      action: "BUY", confidence: "MEDIUM", confidencePct: 61,
      entry: [66500, 67200], stopLoss: 64800, target1: 69500, target2: 72000,
      predict1d: 1.2, predict1w: 3.8, predict1m: 7.2,
      bullish: 58, bearish: 28,
      reasons: ["BTC bounced off $66,500 demand zone", "ETF outflows slowing", "On-chain: LTH supply rising", "Halving cycle tailwind", "VARA Dubai volumes healthy"],
      risks: ["Macro risk-off to $64K", "ETF outflows resume", "Regulatory surprise"],
      options: [
        { type: "CALL", strike: 68000, expiry: "Apr 11", premium: "~$820", strategy: "Buy Call", risk: "Limited to premium" }
      ],
      macro: "Risk-on improving. ETF flows stabilizing.",
      dubai: "BTC active on XM 23/5. Best liquidity 10:00-22:00 GMT+4."
    },
    eth: {
      action: "HOLD", confidence: "MEDIUM", confidencePct: 52,
      entry: [1880, 1920], stopLoss: 1620, target1: 2100, target2: 2450,
      predict1d: -0.4, predict1w: 1.1, predict1m: 8.5,
      bullish: 44, bearish: 32,
      reasons: ["ETH/BTC ratio near 2-year lows", "Pectra upgrade testnet live", "Long-term holders accumulating"],
      risks: ["ETH drops to $1,500", "Pectra delay"],
      options: [{ type: "CALL", strike: 1950, expiry: "Apr 18", premium: "~$48", strategy: "Buy Call on Pectra", risk: "Limited to premium" }],
      macro: "ETH underperforming. Waiting for Pectra catalyst.",
      dubai: "Available on XM. Smaller size recommended."
    },
    sol: {
      action: "BUY", confidence: "MEDIUM", confidencePct: 64,
      entry: [120, 126], stopLoss: 112, target1: 145, target2: 168,
      predict1d: 0.8, predict1w: 4.2, predict1m: 11.3,
      bullish: 60, bearish: 22,
      reasons: ["SOL held $118 support", "DEX volumes hit $8B weekly", "Firedancer mainnet Q3 2026"],
      risks: ["BTC-led selloff", "April token unlocks"],
      options: [{ type: "CALL", strike: 128, expiry: "Apr 11", premium: "~$3.80", strategy: "Buy Call", risk: "Limited to premium" }],
      macro: "Risk-on sentiment benefits SOL.",
      dubai: "Higher volatility — use tighter position sizing."
    },
    xrp: {
      action: "HOLD", confidence: "LOW", confidencePct: 38,
      entry: [2.35, 2.45], stopLoss: 1.85, target1: 2.80, target2: 3.20,
      predict1d: -0.2, predict1w: 0.8, predict1m: 3.1,
      bullish: 35, bearish: 38,
      reasons: ["SEC case stalled", "XRP rangebound $1.90-2.30", "RLUSD adoption growing"],
      risks: ["SEC appeal negative", "Broader crypto risk-off"],
      options: [{ type: "CALL", strike: 2.40, expiry: "Apr 18", premium: "~$0.06", strategy: "Buy Call on breakout", risk: "Limited to premium" }],
      macro: "Neutral. Waiting for SEC clarity.",
      dubai: "Useful for Dubai-Pakistan/India remittance corridor."
    }
  };
  
  const data = dataMap[assetId];
  return {
    ...data,
    currentPrice: currentPrice,
    targetDistance: ((data.target1 - currentPrice) / currentPrice * 100).toFixed(1)
  };
}
const actionColors = { BUY: "#10B981", SELL: "#EF4444", HOLD: "#F59E0B" };
const confidenceColors = { HIGH: "#10B981", MEDIUM: "#F59E0B", LOW: "#EF4444" };

export default function App() {
  const [asset, setAsset] = useState("gold");
  const [prices, setPrices] = useState(INIT_PRICES);
  const [priceHistory, setPriceHistory] = useState(() => Object.fromEntries(Object.keys(INIT_PRICES).map(k => [k, [INIT_PRICES[k]]])));
  const [priceChange, setPriceChange] = useState({ gold: 0, btc: 0, eth: 0, sol: 0, xrp: 0 });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [alerts, setAlerts] = useState([]);
  const messagesEndRef = useRef(null);
  const pricesRef = useRef(prices);
  pricesRef.current = prices;
  const alertedRef = useRef({});

  // Simulate price updates (works without backend)
  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(prev => {
        const newPrices = { ...prev };
        Object.keys(newPrices).forEach(key => {
          const change = (Math.random() - 0.499) * VOLATILITY[key];
          newPrices[key] = +(prev[key] * (1 + change)).toFixed(key === "xrp" ? 4 : 2);
        });
        return newPrices;
      });
      
      setPriceHistory(prev => {
        const newHistory = { ...prev };
        Object.keys(newHistory).forEach(key => {
          const history = [...prev[key], pricesRef.current[key]];
          newHistory[key] = history.slice(-50);
        });
        return newHistory;
      });
      
      setPriceChange(() => {
        const changes = {};
        Object.keys(INIT_PRICES).forEach(key => {
          changes[key] = +(((pricesRef.current[key] - INIT_PRICES[key]) / INIT_PRICES[key]) * 100).toFixed(2);
        });
        return changes;
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // Check for alerts (stop loss / target hits)
  useEffect(() => {
    const currentPrice = prices[asset];
    const data = getAssetData(asset, currentPrice);
    
    if (currentPrice <= data.stopLoss && !alertedRef.current[`${asset}_sl`]) {
      alertedRef.current[`${asset}_sl`] = true;
      setAlerts(prev => [`⚠️ ${ASSETS.find(a => a.id === asset).sym} near Stop Loss ${data.stopLoss}!`, ...prev].slice(0, 3));
      setTimeout(() => setAlerts(prev => prev.slice(1)), 5000);
    }
    if (currentPrice >= data.target1 && !alertedRef.current[`${asset}_t1`]) {
      alertedRef.current[`${asset}_t1`] = true;
      setAlerts(prev => [`🎯 ${ASSETS.find(a => a.id === asset).sym} hit Target 1: ${data.target1}!`, ...prev].slice(0, 3));
      setTimeout(() => setAlerts(prev => prev.slice(1)), 5000);
    }
  }, [prices, asset]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const currentAsset = ASSETS.find(a => a.id === asset);
  const currentPrice = prices[asset];
  const currentData = getAssetData(asset, currentPrice);
  const changePercent = priceChange[asset];

  const sendMessage = (customQuery) => {
    const query = (customQuery !== undefined ? customQuery : input).trim();
    if (!query || isLoading) return;
    
    setInput("");
    const userMessage = { role: "user", text: query };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    setTimeout(() => {
      let reply = "";
      const lowerQuery = query.toLowerCase();
      const assetInfo = currentAsset;
      
      if (lowerQuery.includes("predict") || lowerQuery.includes("forecast")) {
        reply = `📈 ${assetInfo.sym} PRICE FORECAST\n\n1-Day: ${currentData.predict1d >= 0 ? "+" : ""}${currentData.predict1d}% → ${formatPrice(asset, currentPrice * (1 + currentData.predict1d / 100))}\n1-Week: ${currentData.predict1w >= 0 ? "+" : ""}${currentData.predict1w}% → ${formatPrice(asset, currentPrice * (1 + currentData.predict1w / 100))}\n1-Month: ${currentData.predict1m >= 0 ? "+" : ""}${currentData.predict1m}% → ${formatPrice(asset, currentPrice * (1 + currentData.predict1m / 100))}\n\nBullish: ${currentData.bullish}% | Bearish: ${currentData.bearish}%\n\n${currentData.reasons.slice(0, 3).join(". ")}`;
      } 
      else if (lowerQuery.includes("option") || lowerQuery.includes("call") || lowerQuery.includes("put")) {
        reply = `⚡ OPTIONS STRATEGIES — ${assetInfo.sym}\n\nCurrent: ${formatPrice(asset, currentPrice)} | Signal: ${currentData.action}\n\n${currentData.options.map(o => `► ${o.type} | Strike ${o.strike} | Exp ${o.expiry}\n   ${o.strategy}\n   Premium: ${o.premium} | Risk: ${o.risk}`).join("\n\n")}`;
      }
      else if (lowerQuery.includes("dubai") || lowerQuery.includes("uae")) {
        reply = `🏛️ DUBAI CONTEXT — ${assetInfo.sym}\n\n${currentData.dubai}\n\nCurrent: ${formatPrice(asset, currentPrice)} ${asset === "gold" ? "pts" : "USD"}\nSignal: ${currentData.action} | Confidence: ${currentData.confidencePct}%\n\nEntry: ${currentData.entry[0]}–${currentData.entry[1]}\nTarget: ${currentData.target1} | Stop: ${currentData.stopLoss}\n\n${currentData.macro}`;
      }
      else {
        reply = `📊 ${assetInfo.sym} — ${formatPrice(asset, currentPrice)} (${changePercent >= 0 ? "▲" : "▼"} ${Math.abs(changePercent)}%)\n\nANALYSIS\nAction: ${currentData.action} (${currentData.confidencePct}% confidence)\nEntry: ${currentData.entry[0]}–${currentData.entry[1]}\nTarget 1: ${currentData.target1}\nTarget 2: ${currentData.target2}\nStop Loss: ${currentData.stopLoss}\nRisk/Reward: ~1:2.5\n\nKEY REASONS\n${currentData.reasons.slice(0, 4).map((r, i) => `${i + 1}. ${r}`).join("\n")}\n\nRISKS\n${currentData.risks.map((r, i) => `${i + 1}. ${r}`).join("\n")}\n\n${currentData.macro}`;
      }
      
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
      setIsLoading(false);
    }, 800);
  };

  const quickQuestions = ["Full analysis", "Price prediction", "Option strategies", "Dubai context", "Key risks"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#07090f", color: "#e2e8f0", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(245,158,11,0.2); border-radius: 2px; }
      `}</style>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "8px 12px", pointerEvents: "none" }}>
          {alerts.map((alert, i) => (
            <div key={i} style={{ background: "#EF4444", borderRadius: 10, padding: "8px 14px", marginBottom: 5, fontSize: 12, fontWeight: 600, textAlign: "center", animation: "slideUp 0.3s ease" }}>{alert}</div>
          ))}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(245,158,11,0.1)", background: "rgba(7,9,15,0.98)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg,#f59e0b,#92400e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#000" }}>AU</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>AURUM PRO</div>
            <div style={{ fontSize: 9, color: "#334155" }}>DUBAI · GOLD & CRYPTO</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 9, color: "#10b981" }}>LIVE</span>
        </div>
      </div>

      {/* Asset Selector */}
      <div style={{ display: "flex", gap: 6, padding: "8px 12px", overflowX: "auto", background: "rgba(10,14,22,0.95)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {ASSETS.map(a => {
          const isActive = asset === a.id;
          return (
            <button key={a.id} onClick={() => { setAsset(a.id); setMessages([]); alertedRef.current = {}; }} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "6px 12px", borderRadius: 10, background: isActive ? `${a.color}20` : "rgba(255,255,255,0.03)", border: isActive ? `1px solid ${a.color}40` : "1px solid transparent", cursor: "pointer", minWidth: 85 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: isActive ? a.color : "#6b7280" }}><span>{a.emoji}</span><span>{a.label}</span></div>
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>{formatPrice(a.id, prices[a.id])}</div>
              <div style={{ fontSize: 9, color: priceChange[a.id] >= 0 ? "#10B981" : "#EF4444" }}>{priceChange[a.id] >= 0 ? "▲" : "▼"} {Math.abs(priceChange[a.id])}%</div>
              <Sparkline data={priceHistory[a.id]} width={70} height={18} />
            </button>
          );
        })}
      </div>

      {/* Current Price Bar */}
      <div style={{ padding: "10px 14px", background: "rgba(9,13,21,0.96)", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: "#475569" }}>{currentAsset.sym} · XM</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{formatPrice(asset, currentPrice)}<span style={{ fontSize: 11, color: "#475569", marginLeft: 4 }}>{currentAsset.unit === "pts" ? "pts" : "USD"}</span></div>
          {asset !== "gold" && <div style={{ fontSize: 10, color: "#334155" }}>AED {(currentPrice * USD_AED).toLocaleString()}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: changePercent >= 0 ? "#10B981" : "#EF4444" }}>{changePercent >= 0 ? "+" : ""}{changePercent}%</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: `${actionColors[currentData.action]}15`, padding: "4px 12px", borderRadius: 20, marginTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: actionColors[currentData.action] }}>{currentData.action}</span>
            <span style={{ fontSize: 9, color: confidenceColors[currentData.confidence] }}>{currentData.confidence} {currentData.confidencePct}%</span>
          </div>
          <div style={{ fontSize: 9, color: "#334155", marginTop: 3 }}>SL {currentData.stopLoss} · T1 {currentData.target1}</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: "flex", background: "rgba(8,12,20,0.98)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {[
          ["chat", "💬 CHAT"],
          ["predict", "📈 PREDICT"],
          ["options", "⚡ OPTIONS"],
          ["info", "ℹ️ INFO"]
        ].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{ flex: 1, padding: "10px 0", background: "none", border: "none", borderBottom: activeTab === id ? "2px solid #f59e0b" : "2px solid transparent", color: activeTab === id ? "#f59e0b" : "#4b5563", fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: "0.5px" }}>{label}</button>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
        
        {/* CHAT TAB */}
        {activeTab === "chat" && (
          <>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "30px 20px" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>{currentAsset.emoji}</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Ask me about {currentAsset.sym}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                  {quickQuestions.map(q => (
                    <button key={q} onClick={() => sendMessage(q)} style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 20, padding: "6px 14px", color: "#94a3b8", fontSize: 11, cursor: "pointer" }}>{q}</button>
                  ))}
                </div>
              </div>
            )}
            
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
                {msg.role === "assistant" && <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#f59e0b,#b45309)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#000", marginRight: 8, flexShrink: 0 }}>AU</div>}
                <div style={{ maxWidth: "85%", background: msg.role === "user" ? "rgba(245,158,11,0.12)" : "rgba(13,20,33,0.95)", border: msg.role === "user" ? "1px solid rgba(245,158,11,0.2)" : "1px solid rgba(255,255,255,0.06)", borderRadius: msg.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px", padding: "10px 14px" }}>
                  <pre style={{ fontSize: 12, lineHeight: "1.6", color: "#CBD5E1", whiteSpace: "pre-wrap", fontFamily: "system-ui, sans-serif", margin: 0 }}>{msg.text}</pre>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#f59e0b,#b45309)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#000" }}>AU</div>
                <div style={{ background: "rgba(13,20,33,0.95)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "4px 16px 16px 16px", padding: "10px 16px" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", animation: "pulse 1s infinite" }} />
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", animation: "pulse 1s 0.2s infinite" }} />
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", animation: "pulse 1s 0.4s infinite" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}

        {/* PREDICT TAB */}
        {activeTab === "predict" && (
          <div>
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 12, textTransform: "uppercase" }}>Price Forecast — {currentAsset.sym}</div>
            
            {[["1-Day", currentData.predict1d], ["1-Week", currentData.predict1w], ["1-Month", currentData.predict1m]].map(([period, pct]) => {
              const isUp = pct >= 0;
              const targetPrice = currentPrice * (1 + pct / 100);
              return (
                <div key={period} style={{ background: "rgba(13,20,33,0.9)", border: `1px solid ${isUp ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`, borderRadius: 12, padding: "14px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 9, color: "#475569", marginBottom: 4 }}>{period} FORECAST</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: isUp ? "#10B981" : "#EF4444" }}>{isUp ? "+" : ""}{pct}%</div>
                    <div style={{ fontSize: 10, color: "#334155", marginTop: 2 }}>→ {formatPrice(asset, targetPrice)}</div>
                  </div>
                  <div style={{ fontSize: 32 }}>{isUp ? "📈" : "📉"}</div>
                </div>
              );
            })}

            <div style={{ background: "rgba(13,20,33,0.9)", borderRadius: 12, padding: "14px", marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: "#475569", marginBottom: 10, textTransform: "uppercase" }}>Market Sentiment</div>
              <div style={{ marginBottom: 8 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontSize: 9 }}>Bullish</span><span style={{ fontSize: 9, color: "#10B981" }}>{currentData.bullish}%</span></div><div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}><div style={{ height: 4, width: `${currentData.bullish}%`, background: "#10B981", borderRadius: 2 }} /></div></div>
              <div><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontSize: 9 }}>Bearish</span><span style={{ fontSize: 9, color: "#EF4444" }}>{currentData.bearish}%</span></div><div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}><div style={{ height: 4, width: `${currentData.bearish}%`, background: "#EF4444", borderRadius: 2 }} /></div></div>
            </div>

            <div style={{ background: "rgba(13,20,33,0.9)", borderRadius: 12, padding: "14px" }}>
              <div style={{ fontSize: 9, color: "#475569", marginBottom: 8, textTransform: "uppercase" }}>Prediction Reasons</div>
              {currentData.reasons.slice(0, 5).map((reason, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}><span style={{ fontSize: 10, color: "#f59e0b" }}>{i + 1}.</span><span style={{ fontSize: 11, color: "#94A3B8", lineHeight: "1.5" }}>{reason}</span></div>
              ))}
            </div>
          </div>
        )}

        {/* OPTIONS TAB */}
        {activeTab === "options" && (
          <div>
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 8, textTransform: "uppercase" }}>Option Strategies — {currentAsset.sym}</div>
            <div style={{ background: "rgba(245,158,11,0.08)", borderRadius: 10, padding: "10px 12px", marginBottom: 12, fontSize: 10, color: "#94A3B8" }}>
              Signal: <span style={{ color: actionColors[currentData.action], fontWeight: 700 }}>{currentData.action}</span> · Entry: {currentData.entry[0]}–{currentData.entry[1]} · SL: {currentData.stopLoss} · T1: {currentData.target1}
            </div>
            {currentData.options.map((opt, i) => (
              <div key={i} style={{ background: "rgba(13,20,33,0.9)", borderLeft: `3px solid ${opt.type.includes("PUT") ? "#EF4444" : "#10B981"}`, borderRadius: 10, padding: "12px", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 11, fontWeight: 700, color: opt.type.includes("PUT") ? "#F87171" : "#10B981" }}>{opt.type}</span><span style={{ fontSize: 9, color: "#475569" }}>Exp: {opt.expiry}</span></div>
                <div style={{ fontSize: 11, color: "#CBD5E1", marginBottom: 6 }}>{opt.strategy}</div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 9, color: "#10B981" }}>Premium: {opt.premium}</span><span style={{ fontSize: 9, color: "#F87171" }}>Risk: {opt.risk}</span></div>
              </div>
            ))}
            <div style={{ background: "rgba(239,68,68,0.08)", borderRadius: 10, padding: "12px", marginTop: 4 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#F87171", marginBottom: 6 }}>KEY RISKS</div>
              {currentData.risks.map((risk, i) => <div key={i} style={{ fontSize: 10, color: "#94A3B8", marginBottom: 4 }}>• {risk}</div>)}
            </div>
          </div>
        )}

        {/* INFO TAB */}
        {activeTab === "info" && (
          <div>
            <div style={{ background: "rgba(13,20,33,0.9)", borderRadius: 12, padding: "16px", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", marginBottom: 10 }}>📊 Trade Setup</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><div style={{ fontSize: 9, color: "#475569" }}>Action</div><div style={{ fontSize: 14, fontWeight: 700, color: actionColors[currentData.action] }}>{currentData.action}</div></div>
                <div><div style={{ fontSize: 9, color: "#475569" }}>Confidence</div><div style={{ fontSize: 14, fontWeight: 700, color: confidenceColors[currentData.confidence] }}>{currentData.confidencePct}%</div></div>
                <div><div style={{ fontSize: 9, color: "#475569" }}>Entry Zone</div><div style={{ fontSize: 13 }}>{currentData.entry[0]} – {currentData.entry[1]}</div></div>
                <div><div style={{ fontSize: 9, color: "#475569" }}>Target 1 / 2</div><div style={{ fontSize: 13 }}>{currentData.target1} / {currentData.target2}</div></div>
                <div><div style={{ fontSize: 9, color: "#475569" }}>Stop Loss</div><div style={{ fontSize: 13, color: "#F87171" }}>{currentData.stopLoss}</div></div>
                <div><div style={{ fontSize: 9, color: "#475569" }}>Distance to T1</div><div style={{ fontSize: 13, color: "#10B981" }}>{currentData.targetDistance}%</div></div>
              </div>
            </div>
            
            <div style={{ background: "rgba(13,20,33,0.9)", borderRadius: 12, padding: "16px", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", marginBottom: 8 }}>🏛️ Dubai Context</div>
              <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: "1.6" }}>{currentData.dubai}</div>
            </div>
            
            <div style={{ background: "rgba(13,20,33,0.9)", borderRadius: 12, padding: "16px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", marginBottom: 8 }}>📈 Macro Outlook</div>
              <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: "1.6" }}>{currentData.macro}</div>
            </div>
          </div>
        )}
      </div>

      {/* Input Bar (Chat only) */}
      {activeTab === "chat" && (
        <div style={{ padding: "10px 12px", background: "rgba(7,9,15,0.98)", borderTop: "1px solid rgba(245,158,11,0.08)" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: "rgba(13,20,33,0.95)", borderRadius: 12, padding: "8px 12px", border: `1px solid ${isLoading ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.06)"}` }}>
            <textarea rows="1" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder={`Ask about ${currentAsset.sym}...`} style={{ flex: 1, background: "transparent", border: "none", color: "#e2e8f0", fontSize: 13, maxHeight: 80, fontFamily: "system-ui, sans-serif", outline: "none" }} />
            <button onClick={() => sendMessage()} disabled={!input.trim() || isLoading} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: input.trim() && !isLoading ? "linear-gradient(135deg,#f59e0b,#d97706)" : "rgba(255,255,255,0.05)", cursor: input.trim() && !isLoading ? "pointer" : "not-allowed" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke={input.trim() && !isLoading ? "#000" : "#334155"} strokeWidth="2.5" /></svg>
            </button>
          </div>
          <div style={{ textAlign: "center", marginTop: 6, fontSize: 8, color: "#1e293b" }}>NOT FINANCIAL ADVICE · DUBAI GMT+4</div>
        </div>
      )}
    </div>
  );
}
