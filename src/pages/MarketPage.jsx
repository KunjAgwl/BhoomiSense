import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import './MarketPage.css';

const BASE_PRICES = {
  Wheat:2318,Rice:2100,Maize:1860,Cotton:6200,
  Soybean:4450,Potato:1100,Onion:2800,Tomato:1600,
};
const MARKETS = {
  Wheat:'Khanna Mandi, Punjab',Rice:'Hapur Mandi, UP',
  Maize:'Davangere APMC, Karnataka',Cotton:'Rajkot APMC, Gujarat',
  Soybean:'Indore APMC, MP',Potato:'Agra Mandi, UP',
  Onion:'Lasalgaon APMC, Maharashtra',Tomato:'Kolar APMC, Karnataka',
};
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function seedPriceHistory(crop) {
  const base = BASE_PRICES[crop] || 2000;
  let seed = [...crop].reduce((a,c)=>a+c.charCodeAt(0),0);
  const rng = () => { seed=(seed*16807+0)%2147483647; return (seed/2147483647)-0.5; };
  const history = DAYS.map((day,i)=>{
    const noise=rng()*base*0.04;
    const trend=i*rng()*base*0.008;
    return {day,price:Math.round(base+trend+noise)};
  });
  const prices=history.map(h=>h.price);
  const current=prices[prices.length-1];
  const first=prices[0];
  const avg=Math.round(prices.reduce((a,b)=>a+b,0)/prices.length);
  const high=Math.max(...prices);
  const low=Math.min(...prices);
  const trendPct=(((current-first)/first)*100).toFixed(1);
  const trendAbs=current-first;
  const rising=current>=first;
  return {history,current,avg,high,low,trendPct,trendAbs,rising,market:MARKETS[crop]||'Local Mandi'};
}

const TICKER_CROPS=[
  {name:'WHEAT',pct:'+5.8%',rising:true},{name:'RICE',pct:'+2.1%',rising:true},
  {name:'MAIZE',pct:'-1.2%',rising:false},{name:'COTTON',pct:'+3.4%',rising:true},
  {name:'SOYBEAN',pct:'+0.8%',rising:true},{name:'POTATO',pct:'-2.3%',rising:false},
  {name:'ONION',pct:'+7.1%',rising:true},{name:'TOMATO',pct:'-4.5%',rising:false},
];

function ChartTooltip({active,payload,label}){
  if(!active||!payload?.length) return null;
  return(
    <div className="chart-tooltip">
      <div className="ct-day mono">{label}</div>
      <div className="ct-price">&#8377;{payload[0].value.toLocaleString('en-IN')}/qtl</div>
    </div>
  );
}

function getSellDayClass(i,rising){
  if(i===6||i===13) return 'day-avoid';
  if((i<2||( i>=2&&i<=5))&&rising) return 'day-good';
  return 'day-neutral';
}
function getSellDayLabel(i){
  const d=new Date();d.setDate(d.getDate()+i);
  return d.toLocaleDateString('en-IN',{weekday:'short',month:'short',day:'numeric'});
}
function getForwardDayLabel(i){
  const d=new Date();d.setDate(d.getDate()+i);
  return d.toLocaleDateString('en-IN',{weekday:'short'});
}

function ProfitCalc({currentPrice}){
  const [qty,setQty]=useState(10);
  const [cost,setCost]=useState(Math.round(currentPrice*0.72));
  const [pulse,setPulse]=useState(false);
  const prevRef=useRef(null);
  const revenue=qty*currentPrice;
  const totalCost=qty*cost;
  const profit=revenue-totalCost;

  useEffect(()=>{
    if(prevRef.current!==null&&prevRef.current!==profit){
      setPulse(true);
      const t=setTimeout(()=>setPulse(false),300);
      return ()=>clearTimeout(t);
    }
    prevRef.current=profit;
  },[profit]);

  useEffect(()=>{ setCost(Math.round(currentPrice*0.72)); },[currentPrice]);

  return(
    <div className="profit-calc">
      <div className="calc-label mono">ESTIMATE YOUR PROFIT</div>
      <div className="calc-inputs">
        <div className="calc-row">
          <span className="calc-field-label mono">Quantity</span>
          <input className="calc-input mono" type="number" min="1" value={qty}
            onChange={e=>setQty(Math.max(1,parseInt(e.target.value)||1))} />
          <span className="calc-unit mono">qtl</span>
        </div>
        <div className="calc-row">
          <span className="calc-field-label mono">My cost</span>
          <span className="calc-rupee mono">&#8377;</span>
          <input className="calc-input mono" type="number" min="1" value={cost}
            onChange={e=>setCost(Math.max(1,parseInt(e.target.value)||1))} />
          <span className="calc-unit mono">/qtl</span>
        </div>
      </div>
      <div className="calc-divider" />
      <div className="calc-results">
        <div className="calc-result-row">
          <span className="mono">Revenue</span>
          <span className="mono">&#8377;{revenue.toLocaleString('en-IN')}</span>
        </div>
        <div className="calc-result-row dim">
          <span className="mono">Cost</span>
          <span className="mono">&#8377;{totalCost.toLocaleString('en-IN')}</span>
        </div>
        <div className="calc-divider" />
        <div className="calc-result-row">
          <span className="mono result-label">Net Profit</span>
          <span className={`mono result-num${pulse?' pulse':''}`}
            style={{color:profit>=0?'#4ADE80':'#F43F5E'}}>
            {profit>=0?'+':''}&#8377;{profit.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
}

const CROPS=['Wheat','Rice','Maize','Cotton','Soybean','Potato','Onion','Tomato'];

export default function MarketPage(){
  const [searchParams]=useSearchParams();
  const lastCrop=useStore(s=>s.selectedCrop);
  const initCrop=searchParams.get('crop')||lastCrop||'Wheat';
  const [activeCrop,setActiveCrop]=useState(CROPS.includes(initCrop)?initCrop:'Wheat');
  const [chartOpacity,setChartOpacity]=useState(1);
  const data=useMemo(()=>seedPriceHistory(activeCrop),[activeCrop]);

  const handleCropChange=(crop)=>{
    if(crop===activeCrop) return;
    setChartOpacity(0);
    setTimeout(()=>{ setActiveCrop(crop); setChartOpacity(1); },200);
  };

  const signal=data.rising?'sell':'hold';
  const signalText=data.rising
    ?{strong:'Sell Now',sub:'Prices rising · clear weather window'}
    :{strong:'Wait 3 Days',sub:'Prices declining · hold for recovery'};
  const fwdLabels=Array.from({length:14},(_,i)=>getForwardDayLabel(i));
  const pctFromAvg=Math.abs(((data.current-data.avg)/data.avg)*100).toFixed(1);

  return(
    <div className="market-page">

      {/* ZONE 1 — TICKER */}
      <div className="ticker-bar">
        <div className="ticker-inner">
          {[...TICKER_CROPS,...TICKER_CROPS].map((c,i)=>(
            <span className="ticker-chip" key={i}>
              <span className="ticker-crop">{c.name}</span>
              <span className="ticker-price">&#8377;{BASE_PRICES[c.name.charAt(0)+c.name.slice(1).toLowerCase()]?.toLocaleString('en-IN')||'—'}</span>
              <span className={`ticker-trend ${c.rising?'rising':'falling'}`}>
                {c.rising?'▲':'▼'} {c.pct}
              </span>
              <span className="ticker-sep mono">·</span>
            </span>
          ))}
        </div>
      </div>

      <div className="market-body">

        {/* ZONE 2 — CHART ARENA */}
        <div className="chart-arena">
          <div className="crop-pills-row">
            {CROPS.map(c=>(
              <button key={c} className={`market-pill${activeCrop===c?' active':''}`}
                onClick={()=>handleCropChange(c)}>{c}</button>
            ))}
          </div>
          <div className="arena-main">
            <div className="chart-col" style={{opacity:chartOpacity,transition:'opacity 0.2s ease'}}>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.history} margin={{top:10,right:12,left:0,bottom:0}}>
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={data.rising?'#4ADE80':'#F43F5E'} stopOpacity={0.35}/>
                      <stop offset="100%" stopColor={data.rising?'#4ADE80':'#F43F5E'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day"
                    tick={{fontFamily:'var(--font-mono)',fontSize:11,fill:'rgba(255,255,255,0.35)'}}
                    axisLine={false} tickLine={false}/>
                  <YAxis
                    tick={{fontFamily:'var(--font-mono)',fontSize:11,fill:'rgba(255,255,255,0.35)'}}
                    axisLine={false} tickLine={false} width={72}
                    tickFormatter={v=>`\u20B9${v.toLocaleString('en-IN')}`}/>
                  <ReferenceLine y={data.avg}
                    stroke={data.rising?'#4ADE80':'#F43F5E'}
                    strokeDasharray="4 2" strokeOpacity={0.3}
                    label={{value:'7-day avg',position:'insideRight',fontSize:10,
                      fontFamily:'var(--font-mono)',fill:'rgba(255,255,255,0.35)'}}/>
                  <Tooltip content={<ChartTooltip/>}
                    cursor={{stroke:'rgba(255,255,255,0.1)',strokeWidth:1}}/>
                  <Area type="monotone" dataKey="price"
                    stroke={data.rising?'#4ADE80':'#F43F5E'} strokeWidth={2}
                    fill="url(#priceGrad)" dot={false}
                    activeDot={{r:5,fill:data.rising?'#4ADE80':'#F43F5E',strokeWidth:0}}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="price-stat-col">
              <div className="price-block">
                <span className="stat-label mono">CURRENT PRICE</span>
                <div className="price-hero">&#8377;{data.current.toLocaleString('en-IN')}</div>
                <div className="price-market mono">{data.market}</div>
              </div>
              <div className="price-divider"/>
              <div className="trend-block">
                <span className="stat-label mono">7-DAY TREND</span>
                <div className={`trend-display ${data.rising?'rising':'falling'}`}>
                  <span className="trend-arrow">{data.rising?'▲':'▼'}</span>
                  <span className="trend-pct">{data.rising?'+':''}{data.trendPct}%</span>
                  <span className="trend-abs">{data.trendAbs>=0?'+':''}&#8377;{data.trendAbs}</span>
                </div>
              </div>
              <div className="price-divider"/>
              <div className="key-stats-block">
                <span className="stat-label mono">WEEK RANGE</span>
                <div className="key-stats-row">
                  <div className="ks-item">
                    <span className="ks-label mono">HIGH</span>
                    <span className="ks-val">&#8377;{data.high.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="ks-sep"/>
                  <div className="ks-item">
                    <span className="ks-label mono">LOW</span>
                    <span className="ks-val">&#8377;{data.low.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="ks-sep"/>
                  <div className="ks-item">
                    <span className="ks-label mono">AVG</span>
                    <span className="ks-val">&#8377;{data.avg.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
              <div className="price-divider"/>
              <div className={`signal-badge signal-${signal}`}>
                <div className="signal-icon">{data.rising?'↑':'⏸'}</div>
                <div className="signal-text">
                  <strong>{signalText.strong}</strong>
                  <span>{signalText.sub}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ZONE 3 — INTELLIGENCE ROW */}
        <div className="intel-row">

          {/* Card A */}
          <div className="intel-card glass">
            <div className="ic-label mono">SELL WINDOW · 14 DAYS</div>
            <div className="sell-window-bar">
              {Array.from({length:14},(_,i)=>(
                <div key={i} className={`sell-day ${getSellDayClass(i,data.rising)}`}
                  title={getSellDayLabel(i)}/>
              ))}
            </div>
            <div className="sw-day-labels mono">
              {fwdLabels.map((l,i)=>(
                <span key={i} className="sw-day-label">{l}</span>
              ))}
            </div>
            <p className="sw-recommendation mono">
              {data.rising
                ?'🟢 Strong sell window — act in the next 5 days'
                :'🟡 Prices soft — hold for 3–5 days'}
            </p>
          </div>

          {/* Card B */}
          <div className="intel-card glass">
            <ProfitCalc currentPrice={data.current}/>
          </div>

          {/* Card C */}
          <div className="intel-card glass">
            <div className="ic-label mono">MARKET SIGNALS</div>
            <div className="market-signals">
              <div className="market-signal">
                <div className="signal-bar" style={{background:data.rising?'#4ADE80':'#F59E0B'}}/>
                <div>
                  <span className="ms-label mono">PRICE VS AVERAGE</span>
                  <strong className="ms-val" style={{color:data.rising?'#4ADE80':'#F59E0B'}}>
                    {pctFromAvg}% {data.rising?'above':'below'} 7-day average
                  </strong>
                </div>
              </div>
              <div className="market-signal">
                <div className="signal-bar" style={{background:data.rising?'#4ADE80':'#F43F5E'}}/>
                <div>
                  <span className="ms-label mono">WEATHER WINDOW</span>
                  <strong className="ms-val" style={{color:data.rising?'#4ADE80':'#F43F5E'}}>
                    {data.rising?'Clear 7-day forecast — safe to sell':'Rain in 3 days — harvest risk'}
                  </strong>
                </div>
              </div>
              <div className="market-signal" style={{borderBottom:'none'}}>
                <div className="signal-bar" style={{background:'#38BDF8'}}/>
                <div>
                  <span className="ms-label mono">MANDI ACTIVITY</span>
                  <strong className="ms-val" style={{color:'#38BDF8'}}>
                    {data.rising?'Active buyers · High trade volume':'Low buyer activity · Wait for demand surge'}
                  </strong>
                </div>
              </div>
            </div>
            <p className="ms-footer mono">&#9889; Indicative · Agmarknet seeded · Updates daily</p>
          </div>

        </div>
      </div>
    </div>
  );
}
