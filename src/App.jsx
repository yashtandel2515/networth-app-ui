import React, { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft, RefreshCw, Plus, Building2, Landmark, LineChart, PiggyBank, Home, Coins, ShieldCheck, Car, Package,
  ChevronRight, AlertTriangle, CheckCircle2, Clock, Pencil, Trash2, Download, Bell, Sparkles, Link2, Wallet,
  TrendingUp, CalendarClock, Users, Eye, EyeOff, ArrowLeftRight, X, Briefcase, Globe, Layers, FileText, Info, BarChart3, Gem, Receipt, HelpCircle
} from "lucide-react";

/* ============================================================================
   CLOCK · formatting
   ========================================================================== */
const NOW = new Date("2026-09-04T14:14:00+05:30");
const iso = (d) => new Date(d).toISOString();
const daysAgo = (n, h = 10) => { const d = new Date(NOW); d.setDate(d.getDate() - n); d.setHours(h, 0, 0, 0); return iso(d); };
const daysAhead = (n) => { const d = new Date(NOW); d.setDate(d.getDate() + n); return iso(d); };
const ageDays = (s) => (NOW - new Date(s)) / 864e5;
const PERIODS = ["Today", "This week", "This month", "All time"];
function changeFor(snapshots, period, current) {
  if (!snapshots.length) return null;
  let cutoff = new Date(NOW);
  if (period === "Today") cutoff.setHours(0, 0, 0, 0);
  else if (period === "This week") cutoff.setDate(cutoff.getDate() - 7);
  else if (period === "This month") cutoff.setDate(cutoff.getDate() - 30);
  else cutoff = new Date(0);
  const before = snapshots.filter((x) => new Date(x.at) <= cutoff);
  const base = before.length ? before[before.length - 1] : snapshots[0];
  if (base === snapshots[snapshots.length - 1] && snapshots.length < 2) return null;
  const cat = (c, v) => (base.byCategory ? v - (base.byCategory[c] ?? 0) : null);
  const liab = (id, v) => (base.byLiability ? v - (base.byLiability[id] ?? v) : null);
  return { netWorth: current.netWorth - base.netWorth, assets: current.assets - base.assets, liabilities: current.liabilities - base.liabilities, since: base.at, cat, liab };
}
let _id = 100; const uid = (p) => `${p}_${_id++}`;
const inr = (n) => "₹" + Math.round(Math.abs(n)).toLocaleString("en-IN");
const short = (n) => { const a = Math.abs(n), s = n < 0 ? "−" : ""; if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(2)} Cr`; if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(2)} L`; return `${s}₹${Math.round(a).toLocaleString("en-IN")}`; };
const fmtTime = (s) => { if (!s) return "—"; const d = new Date(s); const t = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toLowerCase(); if (d.toDateString() === NOW.toDateString()) return `${t} today`; const y = new Date(NOW); y.setDate(y.getDate() - 1); if (d.toDateString() === y.toDateString()) return `yesterday ${t}`; return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }); };
const fmtDate = (s) => !s ? "—" : new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: new Date(s).getFullYear() !== NOW.getFullYear() ? "numeric" : undefined });
const USDINR = 83.9;

/* ============================================================================
   DOMAIN · every asset class from the INDmoney + smallcase analysis
   fetch:  aa (Account Aggregator) · aa_limited (AA FI type exists, few FIPs live)
           link (non-AA connector: UAN, broker) · manual (user enters)
   valuation: how currentValue is produced. This is the field backend cares about.
   ========================================================================== */
const CATEGORIES = {
  bank:        { label: "Bank accounts",   icon: Landmark,    fetch: "aa",         valuation: "balance",     group: "Cash & deposits",   growth: [2.5, 2.5] },
  deposit:     { label: "Fixed & recurring deposits", icon: PiggyBank, fetch: "aa", valuation: "principal_accrual", group: "Cash & deposits", growth: [7, 7] },
  mf:          { label: "Mutual funds",    icon: LineChart,   fetch: "aa",         valuation: "units_nav",   group: "Market-linked",     growth: [8, 12] },
  equity:      { label: "Stocks",          icon: TrendingUp,  fetch: "aa",         valuation: "qty_price",   group: "Market-linked",     growth: [8, 13] },
  etf:         { label: "ETFs",            icon: BarChart3,   fetch: "aa",         valuation: "qty_price",   group: "Market-linked",     growth: [8, 12] },
  us_stocks:   { label: "US stocks",       icon: Globe,       fetch: "manual",     valuation: "qty_price_fx",group: "Market-linked",     growth: [7, 10] },
  bonds:       { label: "Bonds & G-Secs",  icon: FileText,    fetch: "aa_limited", valuation: "face_accrual",group: "Market-linked",     growth: [7, 7] },
  nps:         { label: "NPS",             icon: Building2,   fetch: "aa",         valuation: "units_nav",   group: "Retirement",        growth: [8, 10] },
  epf:         { label: "EPF",             icon: Briefcase,   fetch: "link",       valuation: "balance",     group: "Retirement",        growth: [8.25, 8.25] },
  ppf:         { label: "PPF",             icon: Briefcase,   fetch: "manual",     valuation: "balance_accrual", group: "Retirement",    growth: [7.1, 7.1] },
  esops:       { label: "ESOPs / RSUs",    icon: Layers,      fetch: "manual",     valuation: "vested_fmv",  group: "Market-linked",     growth: [0, 0] },
  aif_pms:     { label: "AIF / PMS",       icon: Layers,      fetch: "aa_limited", valuation: "entered",     group: "Alternatives",      growth: [8, 12] },
  smallcase:   { label: "Wealthy portfolios", icon: Sparkles, fetch: "wealthy",    valuation: "qty_price",   group: "Market-linked",     growth: [8, 12] },
  real_estate: { label: "Real estate",     icon: Home,        fetch: "manual",     valuation: "entered",     group: "Physical",          growth: [4, 6.9] },
  gold:        { label: "Gold",            icon: Coins,       fetch: "manual",     valuation: "weight_rate", group: "Physical",          growth: [6, 9] },
  silver:      { label: "Silver",          icon: Gem,         fetch: "manual",     valuation: "weight_rate", group: "Physical",          growth: [5, 8] },
  vehicle:     { label: "Vehicles",        icon: Car,         fetch: "manual",     valuation: "depreciation",group: "Physical",          growth: [-15, -15] },
  insurance:   { label: "Insurance",       icon: ShieldCheck, fetch: "manual",     valuation: "entered",     group: "Protection",        growth: [6, 6] },
  other:       { label: "Other assets",    icon: Package,     fetch: "manual",     valuation: "entered",     group: "Alternatives",      growth: [4, 4] },
};
const COUNT_NOUN = { bank: ["account", "accounts"], deposit: ["deposit", "deposits"], mf: ["holding", "holdings"], equity: ["stock", "stocks"], etf: ["ETF", "ETFs"], us_stocks: ["holding", "holdings"], bonds: ["bond", "bonds"], nps: ["account", "accounts"], epf: ["account", "accounts"], ppf: ["account", "accounts"], esops: ["grant", "grants"], aif_pms: ["fund", "funds"], smallcase: ["portfolio", "portfolios"], real_estate: ["property", "properties"], gold: ["item", "items"], silver: ["item", "items"], vehicle: ["vehicle", "vehicles"], insurance: ["policy", "policies"], other: ["item", "items"] };
const countText = (cat, n) => `${n} ${COUNT_NOUN[cat]?.[n === 1 ? 0 : 1] || "items"}`;
const ENABLED = ["bank", "deposit", "mf", "equity", "nps", "ppf", "aif_pms", "real_estate", "gold", "silver", "insurance"];
const GROUP_ORDER = ["Cash & deposits", "Market-linked", "Retirement", "Physical", "Alternatives", "Protection"];
const LIABILITY_TYPES = ["Home loan", "Car loan", "Personal loan", "Education loan", "Loan against securities", "Credit card outstanding", "Other"];
const METAL_RATE = { gold: { "24K": 15201, "22K": 13935, "18K": 11401 }, silver: { "999": 182, "925": 168 } };

/* AA FIP catalogue and mock responses (post-parsing, per FI-type schema) */
const FIP_CATALOG = [
  { fipId: "HDFC-FIP",  name: "HDFC Bank",        fiTypes: ["DEPOSIT", "TERM_DEPOSIT", "RECURRING_DEPOSIT"] },
  { fipId: "ICICI-FIP", name: "ICICI Bank",       fiTypes: ["DEPOSIT"] },
  { fipId: "KOTAK-FIP", name: "Kotak Bank",       fiTypes: ["DEPOSIT"] },
  { fipId: "CAMS-RTA",  name: "CAMS (MF RTA)",    fiTypes: ["MUTUAL_FUNDS"] },
  { fipId: "KFIN-RTA",  name: "KFintech (MF RTA)",fiTypes: ["MUTUAL_FUNDS"] },
  { fipId: "NSDL-DP",   name: "NSDL",             fiTypes: ["EQUITIES", "ETF", "BONDS"] },
  { fipId: "NPS-CRA",   name: "NPS (KFin CRA)",   fiTypes: ["NPS"] },
];
const h = (o) => ({ ...o, valueAsOf: o.valueAsOf || daysAgo(0, 9), fetchedAt: daysAgo(0, 9) });
const FIP_DATA = {
  "HDFC-FIP": [
    h({ fiType: "DEPOSIT", category: "bank", name: "HDFC Bank ••4412", meta: { bank: "HDFC Bank", accountType: "Savings", balance: 482310, ifsc: "HDFC0001234", branch: "Koregaon Park, Pune", changes: { Today: 0, "This week": 12400, "This month": -29235 }, seed: 11 }, currentValue: 482310, heldWith: "external" }),
    h({ fiType: "TERM_DEPOSIT", category: "deposit", name: "HDFC FD ••9081", meta: { principal: 500000, rate: 7.1, start: "2025-10-12", maturity: daysAhead(38) }, currentValue: 521400, heldWith: "external" }),
    h({ fiType: "RECURRING_DEPOSIT", category: "deposit", name: "HDFC RD ••2201", meta: { principal: 120000, rate: 6.8, monthly: 10000, maturity: daysAhead(210) }, currentValue: 124100, heldWith: "external" }),
  ],
  "ICICI-FIP": [h({ fiType: "DEPOSIT", category: "bank", name: "ICICI Bank ••7730", meta: { bank: "ICICI Bank", accountType: "Savings", balance: 120455, ifsc: "ICIC0000771", branch: "Baner, Pune", changes: { Today: -623, "This week": -4210, "This month": 8100 }, seed: 23 }, currentValue: 120455, heldWith: "external" })],
  "KOTAK-FIP": [h({ fiType: "DEPOSIT", category: "bank", name: "Kotak Bank ••2210", meta: { bank: "Kotak Bank", accountType: "Current", balance: 264900, ifsc: "KKBK0000221", branch: "Aundh, Pune", changes: { Today: 0, "This week": 0, "This month": 41000 }, seed: 37 }, currentValue: 264900, heldWith: "external" })],
  "CAMS-RTA": [
    h({ fiType: "MUTUAL_FUNDS", category: "mf", name: "Parag Parikh Flexi Cap Fund Direct Growth", meta: { units: 1240.5, nav: 82.14, navDate: daysAgo(1, 23), folio: "1299••8812", plan: "Direct", sip: true, invested: 92000, avgNav: 74.16, since: "2024-04-05", d1: 0.42, category: "Flexi Cap", risk: "Very High", ret3y: 18.4, cat3y: 15.1, vol: 13.2, ter: 0.63, sectors: { Financials: 28, IT: 14, Healthcare: 9, Energy: 8, Others: 41 } }, currentValue: 101894, heldWith: "wealthy", valueAsOf: daysAgo(1, 23) }),
    h({ fiType: "MUTUAL_FUNDS", category: "mf", name: "HDFC Mid Cap Opportunities Fund Direct Growth", meta: { units: 610.2, nav: 178.3, navDate: daysAgo(1, 23), folio: "9107••3390", plan: "Direct", sip: false, invested: 95000, avgNav: 155.69, since: "2023-11-20", d1: -0.31, category: "Mid Cap", risk: "Very High", ret3y: 17.6, cat3y: 21.4, vol: 16.8, ter: 0.78, sectors: { Financials: 18, Industrials: 22, Healthcare: 12, IT: 8, Others: 40 } }, currentValue: 108799, heldWith: "external", valueAsOf: daysAgo(1, 23) }),
    h({ fiType: "MUTUAL_FUNDS", category: "mf", name: "SBI Liquid Fund Direct Growth", meta: { units: 92.4, nav: 3980.1, navDate: daysAgo(1, 23), folio: "9107••3390", plan: "Direct", sip: false, invested: 350000, avgNav: 3787.9, since: "2025-12-02", d1: 0.02, category: "Liquid", risk: "Low", ret3y: 6.9, cat3y: 6.8, vol: 0.3, ter: 0.18, sectors: { Debt: 100 } }, currentValue: 367761, heldWith: "external", valueAsOf: daysAgo(1, 23) }),
  ],
  "KFIN-RTA": [
    h({ fiType: "MUTUAL_FUNDS", category: "mf", name: "Motilal Oswal Midcap Fund Direct Growth", meta: { units: 2210.8, nav: 104.6, navDate: daysAgo(1, 23), folio: "5521••0074", plan: "Direct", sip: true, invested: 198000, avgNav: 89.56, since: "2024-02-12", d1: 0.88, category: "Mid Cap", risk: "Very High", ret3y: 26.3, cat3y: 21.4, vol: 17.1, ter: 0.66, sectors: { Financials: 24, Industrials: 20, IT: 10, Auto: 9, Others: 37 } }, currentValue: 231250, heldWith: "wealthy", valueAsOf: daysAgo(1, 23) }),
    h({ fiType: "MUTUAL_FUNDS", category: "mf", name: "Nippon India Small Cap Fund Regular Growth", meta: { units: 1850.2, nav: 168.9, navDate: daysAgo(1, 23), folio: "4019••0197", plan: "Regular", sip: false, invested: 260000, avgNav: 140.53, since: "2022-08-30", d1: -0.55, category: "Small Cap", risk: "Very High", ret3y: 17.2, cat3y: 24.6, vol: 21.5, ter: 1.72, sectors: { Industrials: 26, Financials: 15, Healthcare: 11, Chemicals: 10, Others: 38 } }, currentValue: 312500, heldWith: "external", valueAsOf: daysAgo(1, 23) }),
  ],
  "NSDL-DP": [
    h({ fiType: "EQUITIES", category: "equity", name: "HDFC Bank", meta: { qty: 120, ltp: 1640, isin: "INE040A01034", avgPrice: 1512, d1: -0.02, broker: "Zerodha", sector: "Financials" }, currentValue: 196800, heldWith: "external" }),
    h({ fiType: "EQUITIES", category: "equity", name: "Infosys", meta: { qty: 80, ltp: 1725, avgPrice: 1488, d1: 0.47, broker: "Zerodha", sector: "IT" }, currentValue: 138000, heldWith: "external" }),
    h({ fiType: "EQUITIES", category: "equity", name: "TCS", meta: { qty: 25, ltp: 4110, avgPrice: 3890, d1: 0.42, broker: "Groww", sector: "IT" }, currentValue: 102750, heldWith: "external" }),
    h({ fiType: "EQUITIES", category: "equity", name: "Reliance", meta: { qty: 60, ltp: 2890, avgPrice: 2610, d1: -0.24, broker: "Groww", sector: "Energy" }, currentValue: 173400, heldWith: "external" }),
    h({ fiType: "ETF", category: "etf", name: "Nippon Nifty BeES", meta: { qty: 400, ltp: 268.4 }, currentValue: 107360, heldWith: "external" }),
    h({ fiType: "BONDS", category: "bonds", name: "7.26% GS 2033", meta: { faceValue: 200000, coupon: 7.26, maturity: "2033-02-06" }, currentValue: 203800, heldWith: "external" }),
  ],
  "NPS-CRA": [h({ fiType: "NPS", category: "nps", name: "NPS Tier I ••6274", meta: { schemes: [{ n: "Scheme E", units: 4120, nav: 46.2 }, { n: "Scheme C", units: 2310, nav: 41.1 }, { n: "Scheme G", units: 1180, nav: 38.7 }] }, currentValue: 331200, heldWith: "external" })],
};

/* Wealthy's own products (not AA) — held on our books */
const WEALTHY_PORTFOLIOS = [
  { id: "wp_2", source: "WEALTHY", category: "equity", name: "ITC", meta: { qty: 300, ltp: 452, avgPrice: 418, d1: 0.31, broker: "Wealthy", sector: "FMCG" }, currentValue: 135600, heldWith: "wealthy", valueAsOf: daysAgo(0, 15, 30), fetchedAt: daysAgo(0, 15, 30) },
  { id: "wp_1", source: "WEALTHY", category: "smallcase", name: "Wealthy Multi-Asset Core", meta: { units: 118, nav: 2410.5 }, currentValue: 284439, heldWith: "wealthy", valueAsOf: daysAgo(0, 15, 30), fetchedAt: daysAgo(0, 15, 30) },
];

/* ============================================================================
   INITIAL STATES — Mock 1 (fresh sign-in) and Mock 2 (populated client)
   ========================================================================== */
const baseUser = () => ({ id: "usr_priya", name: "Priya Mehta", phone: "+91 98xxxx4410", wealthyClientSince: "2024-03-11", rm: "Arjun Sethi" });

const freshState = () => ({
  user: baseUser(),
  aa: { status: "not_connected", provider: "Finvu", consentId: null, consentValidTill: null, fips: [], lastSyncAt: null, nextRefreshAt: null },
  links: { epf: { status: "not_linked" }, mfcentral: { status: "not_linked" }, brokers: [] },
  connectedHoldings: [],
  wealthyHoldings: [],
  manualAssets: [],
  liabilities: [],
  family: { view: "personal", members: [] },
  snapshots: [],
  events: [{ id: uid("ev"), at: iso(NOW), type: "system", title: "Net Worth switched on", detail: "Connect an account or add assets to start building your financial picture.", source: "WEALTHY" }],
  prefs: { autoRefresh: "daily", staleReminderDays: 30, annualIncome: null, monthlyExpense: null, goal: null },
});

const populatedState = () => {
  const fips = FIP_CATALOG.filter((f) => f.fipId !== "KOTAK-FIP").map((f) => ({ ...f, status: "linked", accounts: FIP_DATA[f.fipId].length, error: null }));
  const holdings = fips.flatMap((f) => FIP_DATA[f.fipId].filter((x) => ENABLED.includes(x.category)).map((x) => (x.category === "equity" ? { id: uid("h"), source: "BROKER", fipId: "BROKER-" + x.meta.broker, fipName: x.meta.broker, ...x } : { id: uid("h"), source: "AA", fipId: f.fipId, fipName: f.name, ...x })));
  const manual = [
    { category: "real_estate", name: "2BHK, Baner, Pune", currentValue: 12000000, purchaseValue: 8200000, purchaseDate: "2019-06-14", updatedAt: daysAgo(31, 18), meta: { kind: "Apartment", address: "Baner, Pune" } },
    { category: "real_estate", name: "Plot, Nashik", currentValue: 3500000, purchaseValue: 2100000, purchaseDate: "2021-02-01", updatedAt: daysAgo(94, 18), meta: { kind: "Land" } },
    { category: "gold", name: "Family jewellery", currentValue: 0, purchaseValue: 160 * 3200, purchaseDate: "2016-11-02", updatedAt: daysAgo(0, 6), meta: { grams: 160, purity: "22K", kind: "Jewellery", pricePerGram: 3200, ratePerGram: 13935, rateAsOf: daysAgo(0, 6), city: "Mumbai" } },
    { category: "gold", name: "Diwali coins", currentValue: 0, purchaseValue: 40 * 6100, purchaseDate: "2021-11-04", updatedAt: daysAgo(0, 6), meta: { grams: 40, purity: "24K", kind: "Coin", pricePerGram: 6100, ratePerGram: 15201, rateAsOf: daysAgo(0, 6), city: "Mumbai" } },
    { category: "silver", name: "Silver coins", currentValue: 0, purchaseValue: 1500 * 120, purchaseDate: "2022-10-24", updatedAt: daysAgo(0, 6), meta: { grams: 1500, purity: "999", kind: "Coin", pricePerGram: 120, ratePerGram: 182, rateAsOf: daysAgo(0, 6), city: "Mumbai" } },
    { category: "vehicle", name: "Honda City ZX", currentValue: 0, purchaseValue: 1450000, purchaseDate: "2022-08-10", updatedAt: daysAgo(0, 6), meta: { depreciation: 15, floorPct: 10, auto: true, regNo: "MH12PQ4471", owner: "PRIYA MEHTA", regDate: "2022-08-10", regExpiry: "2037-08-09", make: "Honda", model: "Honda City ZX", cls: "4-Wheeler", km: 31000, fuel: "PETROL", engine: "1498cc", exShowroom: 1450000, insurer: "HDFC ERGO", policyNo: "2311/00/HT-99123/00", insuranceValid: "2027-08-09", challans: 0, challanList: [], puc: "2027-02-10", pucNo: "MH1220260001", rto: "PUNE RTO, Maharashtra", changeMonth: -1810, policyType: "Comprehensive" } },
    { category: "insurance", name: "HDFC Life ULIP (fund value)", currentValue: 650000, purchaseValue: null, purchaseDate: null, updatedAt: daysAgo(12, 11), meta: { kind: "ULIP", cover: 5000000, premium: 48000, premiumDue: daysAhead(16) } },
    { category: "insurance", name: "ICICI iProtect term plan", currentValue: 0, purchaseValue: null, purchaseDate: null, updatedAt: daysAgo(12, 11), meta: { kind: "Term", cover: 20000000, premium: 21500, premiumDue: daysAhead(120) } },
    { category: "ppf", name: "PPF – SBI ••0455", currentValue: 620000, purchaseValue: null, purchaseDate: null, updatedAt: daysAgo(35, 9), meta: { rate: 7.1, balanceAsOf: "2026-03-31", maturity: "2033-03-31" } },
    { category: "us_stocks", name: "Apple (AAPL)", currentValue: 0, purchaseValue: 380000, purchaseDate: "2023-05-12", updatedAt: daysAgo(0, 6), meta: { qty: 22, priceUsd: 231.4, fx: USDINR, auto: true } },
    { category: "us_stocks", name: "Vanguard S&P 500 (VOO)", currentValue: 0, purchaseValue: 610000, purchaseDate: "2023-05-12", updatedAt: daysAgo(0, 6), meta: { qty: 14, priceUsd: 552.1, fx: USDINR, auto: true } },
    { category: "esops", name: "Zylo Labs ESOPs", currentValue: 0, purchaseValue: null, purchaseDate: null, updatedAt: daysAgo(20, 11), meta: { vested: 1800, unvested: 1200, fmv: 620, nextVest: daysAhead(60), fmvAsOf: "2026-06-30" } },
    { category: "aif_pms", name: "ASK Emerging Opportunities PMS", currentValue: 2740000, purchaseValue: 2500000, purchaseDate: "2024-01-15", updatedAt: daysAgo(4, 11), meta: { statementDate: "2026-08-31", manager: "ASK" } },
    { category: "other", name: "Loan given to Rahul (friend)", currentValue: 300000, purchaseValue: null, purchaseDate: null, updatedAt: daysAgo(60, 11), meta: { kind: "Receivable" } },
  ].filter((m) => ENABLED.includes(m.category)).map((m) => ({ id: uid("m"), source: "MANUAL", isDeleted: false, ...m }));
  const liabilities = [
    { type: "Home loan", name: "HDFC home loan ••3390", lender: "HDFC Bank", outstanding: 6840000, originalAmount: 9000000, emi: 72400, rate: 8.6, endDate: "2039-06-01", updatedAt: daysAgo(1, 9) },
    { type: "Car loan", name: "Axis car loan ••1188", lender: "Axis Bank", outstanding: 410000, originalAmount: 800000, emi: 14900, rate: 9.2, endDate: "2028-08-01", updatedAt: daysAgo(31, 18) },
    { type: "Credit card outstanding", name: "HDFC Regalia ••4008", lender: "HDFC Bank", outstanding: 38200, originalAmount: null, emi: null, rate: null, endDate: null, updatedAt: daysAgo(2, 9) },
  ].map((l) => ({ id: uid("l"), source: "MANUAL", isDeleted: false, ...l }));
  const state = {
    user: baseUser(),
    aa: { status: "connected", provider: "Finvu", consentId: "cst_7f3a9c", consentValidTill: daysAhead(335), fips, lastSyncAt: daysAgo(0, 9), nextRefreshAt: daysAhead(1) },
    links: { epf: { status: "not_linked" }, mfcentral: { status: "not_linked" }, brokers: [{ name: "Zerodha", clientId: "AB1234", fetchedAt: daysAgo(0, 9), holdings: 2 }, { name: "Groww", clientId: "yash••@gmail.com", fetchedAt: daysAgo(0, 9), holdings: 2 }] },
    connectedHoldings: holdings,
    wealthyHoldings: WEALTHY_PORTFOLIOS.filter((w) => ENABLED.includes(w.category)).map((w) => ({ ...w, id: uid("w") })),
    manualAssets: manual, liabilities,
    family: { view: "personal", members: [{ id: "usr_rohan", name: "Rohan Mehta", relation: "Spouse", status: "sharing", assets: 4120000, liabilities: 0, byCategory: { mf: 2400000, bank: 620000, epf: 1100000 }, lastSyncAt: daysAgo(0, 9) }] },
    snapshots: [], events: [],
    prefs: { autoRefresh: "daily", staleReminderDays: 30, annualIncome: 3600000, monthlyExpense: 95000, goal: { age: 38, retireAge: 55, targetCorpus: 100000000, extraMonthly: 12500 } },
  };
  const d0 = derive(state);
  const drift = { "Market-linked": 0.022, "Retirement": 0.007, "Physical": 0.004, "Alternatives": 0.012, "Cash & deposits": 0, "Protection": 0.005 };
  state.snapshots = [180, 150, 120, 90, 60, 30, 7, 1, 0].map((dd, i, arr) => {
    const k = arr.length - 1 - i;
    const byCategory = Object.fromEntries(d0.categories.map((c) => [c.category, Math.round(c.value * (1 - k * drift[c.group] * (dd === 1 ? 0.35 : 1)))]));
    const byLiability = Object.fromEntries(d0.liabs.map((l) => [l.id, Math.round(l.outstanding + (l.emi ? l.emi * 0.7 * (k / 1.0) : l.type.startsWith("Credit") ? -l.outstanding * 0.1 * k : 0))]));
    const a = Object.values(byCategory).reduce((x, y) => x + y, 0), l = Object.values(byLiability).reduce((x, y) => x + y, 0);
    return { at: daysAgo(dd, 9), assets: a, liabilities: l, netWorth: a - l, trigger: "scheduled_refresh", byCategory, byLiability };
  });
  state.events = [
    { at: daysAgo(0, 9), type: "sync", title: "Connected accounts refreshed", detail: "6 institutions · balances and prices updated", source: "AA" },
    { at: daysAgo(0, 6), type: "price", title: "Gold price updated", detail: "Daily rate refresh", source: "WEALTHY" },
    { at: daysAgo(1, 23), type: "nav", title: "Mutual fund NAVs updated", detail: "5 funds · 3 Sep NAV", source: "AA" },
    { at: daysAgo(1, 9), type: "debit", title: "Home loan EMI debited", detail: `${inr(72400)} · HDFC Bank`, source: "AA" },
    { at: daysAgo(4, 11), type: "manual", title: "PMS statement value updated", detail: "You set it to ₹27,40,000 (31 Aug statement)", source: "MANUAL" },
    { at: daysAgo(0, 8), type: "upcoming", title: "SIP due", detail: `${inr(25000)} · Parag Parikh Flexi Cap · via Wealthy`, source: "WEALTHY", upcoming: true, when: daysAhead(1) },
    { at: daysAgo(0, 8), type: "upcoming", title: "Credit card bill due", detail: `${inr(38200)} · HDFC Regalia · 9 Sep`, source: "MANUAL", upcoming: true, when: daysAhead(5) },
    { at: daysAgo(0, 8), type: "upcoming", title: "ULIP premium due", detail: `${inr(48000)} · HDFC Life · 20 Sep`, source: "MANUAL", upcoming: true, when: daysAhead(16) },
    { at: daysAgo(0, 8), type: "upcoming", title: "FD matures", detail: `${inr(521400)} · HDFC ••9081 · 12 Oct`, source: "AA", upcoming: true, when: daysAhead(38) },
    { at: daysAgo(0, 8), type: "upcoming", title: "Term insurance premium due", detail: `${inr(21500)} · ICICI · 2 Jan`, source: "MANUAL", upcoming: true, when: daysAhead(120) },
  ].map((e) => ({ id: uid("ev"), ...e }));
  return state;
};

/* ============================================================================
   VALUATION · computed manual assets. Backend runs this on read / on price tick.
   ========================================================================== */
function valueOf(m) {
  const v = CATEGORIES[m.category].valuation;
  if (v === "weight_rate" && m.meta?.grams) return Math.round(m.meta.grams * m.meta.ratePerGram);
  if (v === "depreciation" && m.meta?.auto && m.purchaseValue) return vehicleValue(m.meta, m.purchaseValue, m.purchaseDate);
  if (v === "qty_price_fx" && m.meta?.auto) return Math.round(m.meta.qty * m.meta.priceUsd * m.meta.fx);
  if (v === "vested_fmv") return Math.round((m.meta?.vested || 0) * (m.meta?.fmv || 0));
  if (v === "balance_accrual" && m.meta?.rate && m.meta?.balanceAsOf) { const yrs = ageDays(m.meta.balanceAsOf) / 365.25; return Math.round(m.currentValue * (1 + (m.meta.rate / 100) * yrs)); }
  return m.currentValue;
}
const asOfOf = (x) => x.valueAsOf || (x.meta?.rateAsOf) || x.updatedAt;

/* ============================================================================
   DERIVE · the read model. Totals are never stored on the user.
   ========================================================================== */
function derive(s) {
  const manual = s.manualAssets.filter((m) => !m.isDeleted).map((m) => ({ ...m, currentValue: valueOf(m) }));
  const liabs = s.liabilities.filter((l) => !l.isDeleted);
  const epf = s.links?.epf?.status === "linked" ? [{ id: "epf_1", source: "LINK", category: "epf", name: `EPF · UAN ${s.links.epf.uan}`, currentValue: s.links.epf.balance, valueAsOf: s.links.epf.fetchedAt, meta: { lastContribution: s.links.epf.lastContribution } }] : [];
  const all = [...s.connectedHoldings, ...s.wealthyHoldings, ...epf, ...manual];
  const assets = all.reduce((a, x) => a + x.currentValue, 0);
  const liabilities = liabs.reduce((a, x) => a + x.outstanding, 0);
  const netWorth = assets - liabilities;
  const byCat = {};
  all.forEach((x) => { const c = byCat[x.category] || (byCat[x.category] = { category: x.category, value: 0, count: 0, items: [], sources: new Set(), oldest: null }); c.value += x.currentValue; c.count++; c.items.push(x); c.sources.add(x.source); const a = asOfOf(x); if (!c.oldest || a < c.oldest) c.oldest = a; });
  const categories = Object.values(byCat).map((c) => ({ ...c, sources: [...c.sources], pct: assets ? (c.value / assets) * 100 : 0, group: CATEGORIES[c.category].group })).sort((a, b) => b.value - a.value);
  const groups = GROUP_ORDER.map((g) => ({ group: g, cats: categories.filter((c) => c.group === g), value: categories.filter((c) => c.group === g).reduce((a, c) => a + c.value, 0) })).filter((g) => g.cats.length);
  const prev = s.snapshots.length >= 2 ? s.snapshots[s.snapshots.length - 2] : null;
  const change = prev ? netWorth - prev.netWorth : null;
  const cover = manual.filter((m) => m.category === "insurance").reduce((a, m) => a + (m.meta?.cover || 0), 0);
  const staleManual = manual.filter((m) => !m.meta?.auto && ageDays(m.updatedAt) > (s.prefs?.staleReminderDays || 30));

  // Family (consented summaries only — we never pull a member's line items into the primary's view)
  const fam = s.family?.members?.filter((m) => m.status === "sharing") || [];
  const famAssets = fam.reduce((a, m) => a + m.assets, 0), famLiab = fam.reduce((a, m) => a + m.liabilities, 0);

  // Judgements — whole-portfolio rules. Each: what we see, why it matters, what to do. Partner signs off before any recommendation.
  const pf = s.prefs || {};
  const income = pf.annualIncome || 0, monthlyExpense = pf.monthlyExpense || 0;
  const emis = liabs.reduce((a, l) => a + (l.emi || 0), 0), sips = s.connectedHoldings.filter((x) => x.category === "mf" && x.meta?.sip).length * 25000, premiums = manual.filter((m) => m.category === "insurance").reduce((a, m) => a + (m.meta?.premium || 0), 0) / 12;
  const outflow = monthlyExpense + emis + sips + premiums;
  const liquid = (byCat.bank?.value || 0) + s.connectedHoldings.filter((x) => x.category === "mf" && x.meta?.category === "Liquid").reduce((a, x) => a + x.currentValue, 0);
  const emergencyMonths = outflow ? liquid / outflow : null;
  const signals = [];
  const cash = byCat.bank?.value || 0;
  const efTarget = outflow * 6;
  if (outflow && emergencyMonths < 6) signals.push({ code: "EMERGENCY_FUND", kind: "judgement", severity: "high", amount: efTarget - liquid, user: `Emergency fund covers ${emergencyMonths.toFixed(1)} months; you need 6`, reason: `Liquid money (bank + liquid funds) is ${short(liquid)} against monthly outflow of ${short(outflow)} — EMIs, SIPs, premiums and spends.`, suggest: `Keep ${short(efTarget)} in a liquid fund or sweep FD before adding to equity.`, consequence: `If income stops, you have ${emergencyMonths.toFixed(1)} months before selling investments at whatever the market gives.`, actions: [["Move to liquid fund", "detail:mf"], ["Talk to " + (s.user.rm || "partner").split(" ")[0], "events"]], business: "Liquid fund / sweep FD", cta: "Fix the gap" });
  if (outflow && cash > efTarget * 1.2) signals.push({ code: "IDLE_CASH", kind: "judgement", severity: "medium", amount: cash - efTarget, user: `${short(cash - efTarget)} in bank above your emergency fund, earning ~3%`, reason: `Bank balance ${short(cash)}; 6 months of outflow is ${short(efTarget)}. The excess loses to 6.5% inflation every year.`, suggest: `Move the excess to a liquid or arbitrage fund now, and into your SIPs over 3 months.`, consequence: `Left in savings, ${short(cash - efTarget)} loses about ${short((cash - efTarget) * 0.035)} a year in real terms.`, actions: [["Invest the excess", "detail:mf"], ["Remind me next month", "events"]], business: "Liquid / arbitrage, then STP", cta: "Invest the excess" });
  if (!outflow) signals.push({ code: "NEED_INCOME", kind: "setup", severity: "info", amount: null, user: "Add your income and monthly spend so we can size your emergency fund and insurance", reason: "These two numbers unlock emergency fund, idle cash and cover-gap checks.", suggest: "Takes 20 seconds in Preferences.", business: "Onboarding completeness", cta: "Add now" });
  const top = categories[0];
  if (top && top.pct > 55) signals.push({ code: "CONCENTRATION", kind: "judgement", severity: "info", amount: top.value, user: `${CATEGORIES[top.category].label} is ${top.pct.toFixed(0)}% of everything you own`, reason: `One asset class this large means your net worth moves with it. ${top.category === "real_estate" ? "Property is also illiquid — it can't fund an emergency." : ""}`, suggest: `New money should go to other categories until this is under 50%.`, consequence: `A 10% move in ${CATEGORIES[top.category].label.toLowerCase()} changes your net worth by ${short(top.value * 0.1)}.`, actions: [["Rebalance plan with " + (s.user.rm || "partner").split(" ")[0], "events"]], business: "Diversification review", cta: "Rebalance plan" });
  const eq = byCat.equity; if (eq) { const big = eq.items.find((x) => x.currentValue / eq.value > 0.2); if (big && eq.items.length > 2) { const pct = (big.currentValue / eq.value) * 100; signals.push({ code: "STOCK_CONCENTRATION", kind: "judgement", severity: "medium", amount: big.currentValue, user: `${big.name} is ${pct.toFixed(0)}% of your stocks`, reason: "A single stock above 20% of equity is company risk, not market risk — one bad quarter for this company moves your whole equity book.", consequence: `A 20% fall in ${big.name} alone would cut your stocks by ${(pct * 0.2).toFixed(1)}% (${short(big.currentValue * 0.2)}). Until it's trimmed, new money into other stocks barely diversifies you.`, suggest: `Trim ${big.name} to about 10% (${short(big.currentValue - eq.value * 0.1)}) and put the proceeds into a diversified fund, or route your next 6 months of SIPs there instead.`, actions: [["Set up a diversified SIP", "detail:mf"], ["Plan the trim", "events"]], business: "Single-stock risk", cta: "Discuss" }); } }
  const weak = s.connectedHoldings.filter((x) => x.category === "mf" && x.meta?.ret3y != null && x.meta.ret3y < x.meta.cat3y - 2);
  if (weak.length) { const amt = weak.reduce((a, f) => a + f.currentValue, 0); const lag = weak.reduce((a, f) => a + f.currentValue * (f.meta.cat3y - f.meta.ret3y) / 100, 0); signals.push({ code: "FUND_UNDERPERFORM", kind: "judgement", severity: "medium", amount: amt, user: weak.length === 1 ? `${weak[0].name.replace(/ Fund.*$/, "")} is underperforming its category` : `${weak.length} funds are underperforming their category`, items: weak.map((f) => `${f.name.replace(/ Fund.*$/, "")} · ${(f.meta.cat3y - f.meta.ret3y).toFixed(1)}%/yr behind`), reason: `3-year returns are below the category average by more than 2% a year.`, consequence: `On ${short(amt)}, that lag costs about ${short(lag)} a year compared with an average fund in the same category.`, suggest: `Switch to a consistent performer in the same category${weak.some((f) => f.meta.plan === "Regular") ? ", and to the direct plan" : ""}. No tax event if done via STP over a few months.`, actions: [["Plan the switch", "events"], ["See the funds", "detail:mf"]], business: "Fund review / switch", cta: "Review fund" }); }
  const regular = s.connectedHoldings.filter((x) => x.category === "mf" && x.meta?.plan === "Regular").reduce((a, x) => a + x.currentValue, 0);
  if (regular > 0) signals.push({ code: "REGULAR_PLAN", kind: "judgement", severity: "medium", amount: regular, user: `${short(regular)} in regular plans costs you about ${short(regular * 0.01)} a year`, reason: "Regular plans carry ~1% higher expense ratio than the same fund's direct plan.", suggest: "Switch to direct on Wealthy; same fund, lower cost.", consequence: `Over 10 years that is roughly ${short(regular * 0.01 * 10)} in fees you don\u2019t need to pay.`, actions: [["Switch to direct", "detail:mf"]], business: "Switch to direct", cta: "Switch to direct" });
  const extMf = s.connectedHoldings.filter((x) => x.category === "mf" && x.heldWith === "external").reduce((a, x) => a + x.currentValue, 0);
  if (extMf > 0) signals.push({ code: "EXTERNAL_MF", kind: "judgement", severity: "low", amount: extMf, user: `${short(extMf)} in mutual funds held outside Wealthy`, reason: "Your partner can't see or act on these today.", suggest: "Transfer the folios in — no redemption, no tax event.", consequence: "Until then, these funds are outside every check on this page except performance.", actions: [["Transfer folios", "detail:mf"]], business: "Transfer-in", cta: "Bring to Wealthy" });
  const term = manual.filter((m) => m.category === "insurance" && m.meta?.kind === "Term").reduce((a, m) => a + (m.meta?.cover || 0), 0);
  if (income) { const need = Math.max(income * 10, liabilities); if (term < need) signals.push({ code: "COVER_GAP", kind: "judgement", severity: term ? "medium" : "high", amount: need - term, user: term ? `Term cover ${short(term)} is below the ${short(need)} you need` : `No term life cover found; you need about ${short(need)}`, reason: `Rule: at least 10× annual income (${short(income * 10)}) and never less than outstanding loans (${short(liabilities)}).`, suggest: `A pure term plan for ${short(need - term)} at your age costs roughly ${short(((need - term) / 10000000) * 12000)} a year.`, consequence: `Without it, your family would have to sell ${short(Math.min(need - term, assets))} of assets or carry the loans.`, actions: [["Get a term quote", "events"]], business: "Term insurance", cta: "Check cover" }); }
  const fd = s.connectedHoldings.find((x) => x.category === "deposit" && x.meta?.maturity);
  if (fd) signals.push({ code: "FD_MATURING", kind: "judgement", severity: "low", amount: fd.currentValue, user: `FD of ${short(fd.currentValue)} matures on ${fmtDate(fd.meta.maturity)}`, reason: "Banks auto-renew at the prevailing rate unless you decide.", suggest: "Decide before maturity: renew, ladder, or move to debt funds for better post-tax return.", consequence: "Auto-renewal locks the money for another term at whatever rate the bank sets that day.", actions: [["Plan reinvestment", "events"], ["Remind me a week before", "events"]], business: "Reinvestment", cta: "Plan reinvestment" });
  const esop = manual.find((m) => m.category === "esops");
  if (esop) signals.push({ code: "ESOP_CONCENTRATION", kind: "judgement", severity: "info", amount: esop.currentValue, user: `${short(esop.currentValue)} vested in one private company`, reason: "Your salary and this asset depend on the same employer.", suggest: "Plan liquidity at the next secondary or buyback; don't count unvested.", consequence: "If the company stumbles, both your income and this asset fall together.", actions: [["Plan liquidity", "events"]], business: "Liquidity planning", cta: "Plan liquidity" });
  if (staleManual.length) signals.push({ code: "STALE_MANUAL", kind: "setup", severity: "low", amount: staleManual.reduce((a, m) => a + m.currentValue, 0), user: `${staleManual.length} value${staleManual.length > 1 ? "s" : ""} you entered ${staleManual.length > 1 ? "are" : "is"} over a month old`, reason: "Property and PMS values drift; your net worth is only as fresh as these.", suggest: "Update them now.", consequence: "Every check on this page uses these numbers.", actions: [["Update values", "detail:assets"]], business: "Data quality", cta: "Update now" });
  // Sector allocation across stocks + equity funds (look-through)
  const sectorMap = {};
  s.connectedHoldings.filter((x) => x.category === "equity").concat(s.wealthyHoldings.filter((x) => x.category === "equity")).forEach((x) => { const k = x.meta?.sector || "Others"; sectorMap[k] = (sectorMap[k] || 0) + x.currentValue; });
  s.connectedHoldings.filter((x) => x.category === "mf" && x.meta?.sectors).forEach((f) => Object.entries(f.meta.sectors).forEach(([k, pct]) => { if (k !== "Debt") sectorMap[k] = (sectorMap[k] || 0) + f.currentValue * pct / 100; }));
  const sectorTotal = Object.values(sectorMap).reduce((a, v) => a + v, 0);
  const sectors = Object.entries(sectorMap).map(([k, v]) => ({ sector: k, value: v, pct: sectorTotal ? (v / sectorTotal) * 100 : 0 })).sort((a, b) => b.value - a.value);
  const bigSector = sectors.find((x) => x.sector !== "Others" && x.pct > 35);
  if (bigSector) signals.push({ code: "SECTOR_CONCENTRATION", kind: "judgement", severity: "medium", amount: bigSector.value, user: `${bigSector.sector} is ${bigSector.pct.toFixed(0)}% of your equity, across stocks and funds`, reason: "Your funds and your direct stocks overlap in the same sector — diversifying across funds hasn't diversified the sector.", consequence: `A sector downturn hits ${short(bigSector.value)} at once, not just the stocks you picked.`, suggest: `Route new equity money to funds light on ${bigSector.sector} (index or multi-cap) until it's under 30%.`, actions: [["Pick a fund light on " + bigSector.sector, "detail:mf"]], business: "Sector overlap", cta: "Rebalance" });
  // Fund category split (large / mid / small / flexi / debt)
  const mfCats = {}; s.connectedHoldings.filter((x) => x.category === "mf").forEach((f) => { const k = f.meta?.category || "Other"; const c = mfCats[k] || (mfCats[k] = { category: k, value: 0, count: 0, weak: 0 }); c.value += f.currentValue; c.count++; if (f.meta?.ret3y != null && f.meta.ret3y < f.meta.cat3y - 2) c.weak++; });
  const mfTotal = Object.values(mfCats).reduce((a, c) => a + c.value, 0);
  const mfSplit = Object.values(mfCats).map((c) => ({ ...c, pct: mfTotal ? (c.value / mfTotal) * 100 : 0 })).sort((a, b) => b.value - a.value);
  const sevRank = { high: 0, medium: 1, low: 2, info: 3 }; signals.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);
  const health = { emergencyMonths, liquid, outflow, income, termCover: term, sectors, mfSplit };

  // Retirement goal — inflation-adjusted target, projected corpus, required monthly investment
  const g = pf.goal; let goal = null;
  if (g && g.retireAge > g.age) { const yrs = g.retireAge - g.age, infl = 0.06, r = 0.10; const targetToday = g.targetCorpus || (monthlyExpense ? monthlyExpense * 12 * 25 : 0); const target = Math.round(targetToday * Math.pow(1 + infl, yrs)); const fv = (pmt) => pmt * 12 * ((Math.pow(1 + r, yrs) - 1) / r); const monthlyInvest = sips + (g.extraMonthly || 0); const projected = Math.round(netWorth * Math.pow(1 + r, yrs) + fv(monthlyInvest)); const need = Math.max(0, Math.round((target - netWorth * Math.pow(1 + r, yrs)) / (12 * ((Math.pow(1 + r, yrs) - 1) / r)))); goal = { ...g, yrs, targetToday, target, projected, gap: target - projected, requiredMonthly: need, onTrack: projected >= target, monthlyInvest, sips, sipCount: s.connectedHoldings.filter((x) => x.category === "mf" && x.meta?.sip).length }; }

  // Forecast (smallcase pattern): per-category growth, conservative & aggressive, liabilities net of EMI
  const yrs = 3;
  const proj = (idx) => categories.reduce((a, c) => a + c.value * Math.pow(1 + CATEGORIES[c.category].growth[idx] / 100, yrs), 0);
  const liabProj = liabs.reduce((a, l) => a + Math.max(0, l.outstanding - (l.emi || 0) * 12 * yrs * 0.7), 0); // ~70% of EMI goes to principal over 3 yrs
  const forecast = { years: yrs, conservative: Math.round(proj(0) - liabProj), aggressive: Math.round(proj(1) - liabProj), liabilities: Math.round(liabProj) };

  return { assets, liabilities, netWorth, categories, groups, change, signals, staleManual, manual, liabs, cover, all, health, goal, family: { members: fam, assets: famAssets, liabilities: famLiab, netWorth: netWorth + famAssets - famLiab }, forecast, connectedCount: s.connectedHoldings.length + epf.length + s.wealthyHoldings.length };
}

/* ============================================================================
   UI atoms
   ========================================================================== */
const SourceBadge = ({ source, heldWith }) => {
  const m = { AA: ["Connected", "bg-emerald-50 text-emerald-700 border-emerald-100"], MFC: ["Connected", "bg-emerald-50 text-emerald-700 border-emerald-100"], BROKER: ["Connected", "bg-emerald-50 text-emerald-700 border-emerald-100"], LINK: ["Linked", "bg-violet-50 text-violet-600 border-sky-100"], WEALTHY: ["Wealthy", "bg-slate-900 text-white border-slate-900"], MANUAL: ["You entered", "bg-amber-50 text-amber-700 border-amber-100"] }[source] || ["", ""];
  const label = source === "AA" && heldWith === "wealthy" ? "Wealthy" : m[0];
  const cls = source === "AA" && heldWith === "wealthy" ? "bg-slate-900 text-white border-slate-900" : m[1];
  return <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${cls}`}>{label}</span>;
};
const Freshness = ({ at, stale, prefix }) => <span style={{ fontSize: 11 }} className={`inline-flex items-center gap-1 ${stale ? "text-amber-600" : "text-slate-400"}`}><Clock size={10} /> {prefix}{fmtTime(at)}</span>;
const Btn = ({ children, onClick, kind = "primary", full, disabled, small }) => {
  const k = { primary: "bg-violet-600 text-white hover:bg-violet-700 disabled:bg-violet-200", ghost: "bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:text-slate-400", danger: "bg-rose-50 text-rose-700 hover:bg-rose-100" }[kind];
  return <button onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors ${small ? "px-3 py-1.5 text-xs" : "px-4 py-3 text-sm"} ${full ? "w-full" : ""} ${k}`}>{children}</button>;
};
const Header = ({ title, onBack, right, sub }) => (
  <div className="px-4 pt-4 pb-3 sticky top-0 bg-white z-10">
    <div className="flex items-center gap-3">{onBack && <button onClick={onBack} className="p-1 -ml-1 rounded-lg hover:bg-slate-100"><ArrowLeft size={20} /></button>}<div className="text-base font-semibold text-slate-900 flex-1">{title}</div>{right}</div>
    {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
  </div>
);
const Field = ({ label, children, hint }) => <label className="block mb-4"><div className="text-xs text-slate-600 mb-1.5">{label}</div>{children}{hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}</label>;
const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-slate-400";
const Note = ({ children, tone = "slate" }) => <div className={`rounded-xl border p-3 text-xs ${tone === "amber" ? "bg-amber-50 border-amber-100 text-amber-900" : tone === "green" ? "bg-emerald-50 border-emerald-100 text-emerald-900" : "bg-slate-50 border-slate-200 text-slate-600"}`}>{children}</div>;
const Row = ({ icon: I, title, sub, right, onClick, tone }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 ${onClick ? "" : "cursor-default"}`}>
    {I && <div className={`rounded-lg p-2 ${tone === "rose" ? "bg-rose-50" : "bg-slate-100"}`}><I size={16} className={tone === "rose" ? "text-rose-700" : "text-slate-700"} /></div>}
    <div className="flex-1 min-w-0"><div className="text-sm text-slate-900 truncate">{title}</div>{sub && <div className="mt-0.5">{sub}</div>}</div>
    {right}{onClick && <ChevronRight size={16} className="text-slate-300" />}
  </button>
);

/* ============================================================================
   SCREENS · onboarding & AA
   ========================================================================== */
function EmptyHome({ go, s, d }) {
  return (
    <div className="px-5 pt-8 pb-8 flex flex-col min-h-full">
      <div className="text-sm text-slate-500">Good afternoon, Priya</div>
      <h1 className="font-serif text-3xl leading-tight text-slate-900 mt-2">Everything you own, minus everything you owe.</h1>
      <p className="text-sm text-slate-600 mt-3 leading-relaxed">Net worth is one number that answers "where do I stand." Wealthy fetches balances you consent to through the RBI-regulated Account Aggregator, tracks the rest from what you enter, and keeps every value dated so you know how fresh it is.</p>

      <div className="mt-6 rounded-2xl border border-violet-100 p-4">
        <div className="text-xs text-slate-500">Already on Wealthy</div>
        <div className="flex items-baseline gap-2 mt-1"><div className="font-serif text-2xl text-slate-900">{short(d.assets)}</div><div className="text-xs text-slate-500">{s.wealthyHoldings.length} portfolio · as of {fmtTime(s.wealthyHoldings[0]?.valueAsOf)}</div></div>
        <div className="text-xs text-slate-500 mt-1">That's only what you hold with us. Most clients' net worth is 5–10× their Wealthy portfolio.</div>
      </div>

      <div className="mt-3 rounded-2xl bg-slate-900 text-white p-4">
        <div className="flex items-start gap-3"><Link2 size={18} className="text-emerald-300 mt-0.5" /><div className="flex-1"><div className="text-sm font-semibold">Connect bank, deposits, mutual funds, stocks, bonds, NPS</div><div className="text-xs text-slate-300 mt-0.5">One OTP. Read-only. About 2 minutes. Revoke anytime.</div></div></div>
        <div className="mt-3"><button onClick={() => go("aa_select")} className="w-full rounded-xl bg-white text-slate-900 text-sm font-medium py-3">Connect through Account Aggregator</button></div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => go("epf_link")} className="rounded-2xl border border-violet-100 p-3 text-left hover:bg-slate-50"><Briefcase size={16} className="text-slate-700" /><div className="text-sm text-slate-900 mt-2">Link EPF</div><div className="text-xs text-slate-500">With your UAN</div></button>
        <button onClick={() => go("add_pick")} className="rounded-2xl border border-violet-100 p-3 text-left hover:bg-slate-50"><Plus size={16} className="text-slate-700" /><div className="text-sm text-slate-900 mt-2">Add manually</div><div className="text-xs text-slate-500">Property, gold, ESOPs, loans…</div></button>
      </div>
      <button onClick={() => go("provenance")} className="mt-4 text-xs text-slate-500 underline underline-offset-2 text-left inline-flex items-center gap-1"><HelpCircle size={12} /> Where does each number come from?</button>
      <div className="mt-auto pt-6 text-xs text-slate-400 leading-relaxed">Data moves through Finvu, an RBI-licensed Account Aggregator, encrypted end to end. Wealthy can read balances you approve. It cannot move money.</div>
    </div>
  );
}

const FI_TYPES = [
  { k: "DEPOSIT", l: "Bank savings & current", note: "Balance and transactions" },
  { k: "TERM_DEPOSIT", l: "Fixed deposits", note: "Principal, rate, maturity" },
  { k: "RECURRING_DEPOSIT", l: "Recurring deposits", note: "Instalment, rate, maturity" },
  { k: "MUTUAL_FUNDS", l: "Mutual funds (all RTAs)", note: "Units × NAV, every folio incl. other platforms" },
  { k: "EQUITIES", l: "Stocks (demat)", note: "Holdings × last traded price" },
  { k: "NPS", l: "NPS", note: "Tier I & II, scheme-wise" },
];
function AASelect({ go, sel, setSel, s }) {
  const mfc = s?.links?.mfcentral?.status === "linked";
  const toggle = (k) => setSel((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]));
  return (
    <div className="flex flex-col min-h-full">
      <Header title="What should we fetch?" onBack={() => go("home")} sub="You approve this once on the Account Aggregator screen. Change it later in Connected accounts." />
      <div className="px-4 space-y-2">
        {FI_TYPES.filter((t) => !(mfc && t.k === "MUTUAL_FUNDS") && !((s?.links?.brokers || []).length && t.k === "EQUITIES")).map((t) => (
          <button key={t.k} onClick={() => toggle(t.k)} className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left ${sel.includes(t.k) ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}>
            <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${sel.includes(t.k) ? "bg-slate-900 border-slate-900" : "border-slate-300"}`}>{sel.includes(t.k) && <CheckCircle2 size={14} className="text-white" />}</div>
            <div className="flex-1"><div className="text-sm text-slate-900">{t.l}</div><div className="text-xs text-slate-400">{t.note}</div></div>
          </button>
        ))}
      </div>
      <div className="px-4 mt-4">{mfc && <div className="mb-2"><Note tone="green">Mutual funds are already synced through MF Central.</Note></div>}<Note>Not available through Account Aggregator today: loans, credit cards, EPF, PPF, insurance, property, gold, ESOPs, foreign assets, AIF/PMS statements. You'll link or enter those next.</Note></div>
      <div className="mt-auto p-4"><Btn full disabled={!sel.length} onClick={() => go("aa_otp")}>Continue to Finvu</Btn></div>
    </div>
  );
}
function AAOtp({ go, scope }) {
  const [otp, setOtp] = useState("");
  return (
    <div className="flex flex-col min-h-full">
      <Header title={scope === "bank" ? "Sync bank accounts" : scope === "equity" ? "Sync stocks" : "Verify your mobile"} onBack={() => go(scope === "all" ? "aa_select" : "home")} sub={scope === "bank" ? "We fetch balances for every account registered against your mobile number, through the Account Aggregator." : undefined} />
      <div className="px-4">
        <Note><div className="font-medium text-slate-800">Finvu · Account Aggregator</div>Wealthy (Buildwealth Technologies) requests read access to selected balances, refreshed daily, for 12 months. Purpose: wealth tracking. Revoke anytime in Connected accounts.</Note>
        <div className="mt-6 text-sm text-slate-700">Enter the OTP sent to +91 98xxxx4410</div>
        <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit OTP" className={inputCls + " mt-2 tracking-widest text-lg"} />
        <div className="text-xs text-slate-400 mt-2">Demo: any 6 digits. Resend in 25s · Use a different number</div>
      </div>
      <div className="mt-auto p-4"><Btn full disabled={otp.length < 6} onClick={() => go("aa_discover")}>Verify and find accounts</Btn></div>
    </div>
  );
}
function AADiscover({ go, sel, failKotak, onDiscovered }) {
  const [progress, setProgress] = useState(0);
  const fips = useMemo(() => FIP_CATALOG.filter((f) => f.fiTypes.some((t) => sel.includes(t))), [sel]);
  useEffect(() => { let i = 0; const t = setInterval(() => { i++; setProgress(i); if (i >= fips.length) { clearInterval(t); setTimeout(() => { onDiscovered(fips.map((f) => ({ ...f, status: failKotak && f.fipId === "KOTAK-FIP" ? "failed" : "discovered", accounts: FIP_DATA[f.fipId].length, error: failKotak && f.fipId === "KOTAK-FIP" ? "FIP did not respond (timeout after 30s)" : null }))); go("aa_accounts"); }, 400); } }, 450); return () => clearInterval(t); }, []); // eslint-disable-line
  return (
    <div className="flex flex-col min-h-full">
      <Header title="Finding your accounts" sub="We ask each institution whether it holds accounts against your mobile number. Up to a minute." />
      <div className="px-4 space-y-2">{fips.map((f, i) => <div key={f.fipId} className="flex items-center gap-3 rounded-xl border border-violet-100 p-3"><div className="flex-1 text-sm text-slate-900">{f.name}</div>{i < progress ? <CheckCircle2 size={16} className="text-emerald-600" /> : <RefreshCw size={14} className={`text-slate-300 ${i === progress ? "animate-spin" : ""}`} />}</div>)}</div>
    </div>
  );
}
function AAAccounts({ discovered, onFetch }) {
  const ok = discovered.filter((x) => x.status === "discovered"), failed = discovered.filter((x) => x.status === "failed");
  const [picked, setPicked] = useState(ok.map((x) => x.fipId));
  return (
    <div className="flex flex-col min-h-full">
      <Header title="Choose accounts to sync" sub="Everything found is selected. Untick anything you'd rather keep out of your net worth." />
      <div className="px-4 space-y-2">
        {ok.map((f) => <button key={f.fipId} onClick={() => setPicked((p) => (p.includes(f.fipId) ? p.filter((x) => x !== f.fipId) : [...p, f.fipId]))} className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left ${picked.includes(f.fipId) ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}><div className="flex-1"><div className="text-sm text-slate-900">{f.name}</div><div className="text-xs text-slate-400">{f.accounts} account{f.accounts > 1 ? "s" : ""} · {f.fiTypes.join(", ").toLowerCase().replace(/_/g, " ")}</div></div><div className={`w-5 h-5 rounded-md border flex items-center justify-center ${picked.includes(f.fipId) ? "bg-slate-900 border-slate-900" : "border-slate-300"}`}>{picked.includes(f.fipId) && <CheckCircle2 size={14} className="text-white" />}</div></button>)}
        {failed.map((f) => <Note key={f.fipId} tone="amber"><div className="flex items-center gap-2 text-sm"><AlertTriangle size={14} /> {f.name} didn't respond</div><div className="mt-1">{f.error}. Usually the bank's AA service is down. Continue without it; retry later from Connected accounts.</div></Note>)}
      </div>
      <div className="mt-auto p-4"><Btn full disabled={!picked.length} onClick={() => onFetch(picked)}>Link {picked.length} and fetch balances</Btn></div>
    </div>
  );
}
function AAFetching({ n }) {
  return <div className="flex flex-col min-h-full items-center justify-center px-8 text-center"><RefreshCw size={28} className="text-slate-400 animate-spin" /><div className="text-sm font-medium text-slate-900 mt-4">Fetching balances</div><div className="text-xs text-slate-500 mt-1">{n} institutions · encrypted end to end · the aggregator never sees your data</div></div>;
}
function AAResult({ go, s, d }) {
  const linked = s.aa.fips.filter((f) => f.status === "linked"), failed = s.aa.fips.filter((f) => f.status === "failed");
  const conn = d.categories.filter((c) => c.sources.includes("AA"));
  return (
    <div className="flex flex-col min-h-full">
      <div className="px-5 pt-8">
        <CheckCircle2 size={32} className="text-emerald-600" />
        <h2 className="font-serif text-2xl text-slate-900 mt-3 leading-tight">{s.connectedHoldings.length} holdings across {linked.length} institutions</h2>
        <div className="text-sm text-slate-600 mt-2">Worth <span className="font-semibold text-slate-900">{short(conn.reduce((a, c) => a + c.value, 0))}</span> as of {fmtTime(s.aa.lastSyncAt)}. Refreshes daily at 9 am; you can refresh anytime.</div>
        {failed.length > 0 && <div className="mt-3"><Note tone="amber">{failed.map((f) => f.name).join(", ")} could not be linked. Retry from Connected accounts.</Note></div>}
        <div className="mt-5 space-y-2">{conn.map((c) => { const I = CATEGORIES[c.category].icon; return <div key={c.category} className="flex items-center gap-3 text-sm"><I size={15} className="text-slate-400" /><div className="flex-1 text-slate-700">{CATEGORIES[c.category].label} <span className="text-slate-400">· {c.count}</span></div><div className="text-slate-900">{short(c.value)}</div></div>; })}</div>
        <div className="mt-5"><Note><div className="text-sm font-medium text-slate-900">This isn't everything you own</div>Loans, EPF, PPF, property, gold, ESOPs and insurance don't come through Account Aggregator. Add them to see your real net worth — most people's largest asset and largest debt are both on that list.</Note></div>
      </div>
      <div className="mt-auto p-4 space-y-2"><Btn full onClick={() => go("add_liability")}>Add a loan first (it's usually the biggest gap)</Btn><Btn full kind="ghost" onClick={() => go("home")}>See my dashboard</Btn></div>
    </div>
  );
}
function EpfLink({ go, onLinked }) {
  const [step, setStep] = useState(0); const [uan, setUan] = useState(""); const [otp, setOtp] = useState("");
  useEffect(() => { if (step === 2) { const t = setTimeout(() => { onLinked({ status: "linked", uan: uan.slice(0, 4) + "••••" + uan.slice(-4), balance: 842300, lastContribution: "2026-08-05", fetchedAt: iso(NOW) }); go("home"); }, 1400); return () => clearTimeout(t); } }, [step]); // eslint-disable-line
  return (
    <div className="flex flex-col min-h-full">
      <Header title="Link EPF" onBack={() => go("home")} sub="EPF isn't on Account Aggregator. We fetch your passbook balance with your UAN and the OTP EPFO sends you." />
      <div className="px-4">
        {step === 0 && <><Field label="UAN (12 digits)"><input value={uan} onChange={(e) => setUan(e.target.value.replace(/\D/g, "").slice(0, 12))} className={inputCls} placeholder="1001 xxxx xxxx" /></Field><Note>Balance is refreshed monthly after each contribution posts. We don't see your employer details beyond what the passbook shows.</Note></>}
        {step === 1 && <Field label="OTP from EPFO"><input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} className={inputCls + " tracking-widest text-lg"} placeholder="6-digit OTP" /></Field>}
        {step === 2 && <div className="text-center pt-10"><RefreshCw size={26} className="text-slate-400 animate-spin mx-auto" /><div className="text-sm text-slate-700 mt-3">Reading your passbook</div></div>}
      </div>
      {step < 2 && <div className="mt-auto p-4"><Btn full disabled={step === 0 ? uan.length < 12 : otp.length < 6} onClick={() => setStep(step + 1)}>{step === 0 ? "Send OTP" : "Verify and fetch balance"}</Btn></div>}
    </div>
  );
}

/* ============================================================================
   DASHBOARD
   ========================================================================== */
const WLogo = () => <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center font-serif text-lg leading-none">W</div>;
const Overlay = ({ open, onClose, children }) => open ? <div className="fixed inset-0 z-20" style={{ background: "rgba(15,23,42,0.45)" }} onClick={onClose}>{children}</div> : null;
const SheetPanel = ({ title, sub, onClose, children, footer }) => (
  <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl flex flex-col" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "86%" }}>
    <div className="pt-2.5 flex justify-center"><div className="w-10 h-1 rounded-full bg-slate-200" /></div>
    <div className="px-5 pt-3 pb-3 flex items-start gap-3 border-b border-violet-50"><div className="flex-1"><div className="text-base font-semibold text-slate-900">{title}</div>{sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}</div>{onClose && <button onClick={onClose} className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center text-slate-600"><X size={16} /></button>}</div>
    <div className="px-5 py-4 overflow-y-auto">{children}</div>
    {footer && <div className="px-5 pb-5 pt-2 border-t border-violet-50">{footer}</div>}
  </div>
);
const Section = ({ title, right, children, className = "" }) => <div className={`px-4 mt-5 ${className}`}><div className="flex items-baseline justify-between mb-2 px-1"><div className="text-sm font-semibold text-slate-900">{title}</div>{right}</div>{children}</div>;
function AddMore({ items, onAdd, label = "Add more" }) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % items.length), 1500); return () => clearInterval(t); }, [items.length]);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-3">
      <WLogo />
      <div className="flex-1 min-w-0"><div className="text-sm font-medium text-slate-900">{label}</div><div className="text-xs text-slate-500 truncate" key={i}>Tap to add {items[i]}</div></div>
      <button onClick={onAdd} className="inline-flex items-center gap-1 rounded-xl bg-slate-900 text-white text-xs font-medium px-3 py-2"><Plus size={14} /> Add</button>
    </div>
  );
}
const ASSET_ROTATION = Object.values(CATEGORIES).map((c) => c.label);
function EmptyDashboard({ user, go }) {
  return (
    <div className="min-h-full bg-white flex flex-col">
      <div className="px-5 pt-5 pb-4 flex items-center gap-3 border-b border-slate-100">
        <WLogo />
        <div><div className="text-sm font-semibold text-slate-900">Net Worth</div><div className="text-xs text-slate-500">{user.name}</div></div>
      </div>
      <main className="px-5 pt-9">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-violet-700"><Sparkles size={14} /> YOUR MONEY, IN ONE PLACE</div>
        <h1 className="font-serif text-3xl leading-tight text-slate-900 mt-4">Your full financial picture starts here.</h1>
        <p className="text-sm leading-relaxed text-slate-600 mt-3">Nothing has been added yet. Connect an account or enter an asset to build your net worth view.</p>
        <div className="mt-8 space-y-3">
          <button onClick={() => go("aa_select")} className="w-full min-h-12 rounded-lg bg-violet-700 px-4 py-3 text-left text-white flex items-center gap-3">
            <Link2 size={18} />
            <span className="flex-1 text-sm font-semibold">Connect accounts</span>
            <ChevronRight size={17} />
          </button>
          <button onClick={() => go("add_pick")} className="w-full min-h-12 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-slate-800 flex items-center gap-3">
            <Plus size={18} className="text-violet-700" />
            <span className="flex-1 text-sm font-semibold">Add assets manually</span>
            <ChevronRight size={17} className="text-slate-400" />
          </button>
        </div>
      </main>
      <div className="mt-auto px-5 pt-8 pb-6">
        <div className="border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">Choose what to include. You can add more accounts and assets whenever you're ready.</div>
      </div>
    </div>
  );
}
function Dashboard(props) {
  if (props.empty) return <EmptyDashboard user={props.s.user} go={props.go} />;
  return <PopulatedDashboard {...props} />;
}
function PopulatedDashboard({ go, s, d, onRefresh, refreshing, setFamilyView, hide, setHide, empty, startAA }) {
  const [period, setPeriod] = useState("Today");
  const chg = changeFor(s.snapshots, period, { netWorth: d.netWorth, assets: d.assets, liabilities: d.liabilities });
  const M = (n) => (empty ? "–" : hide ? "₹ ••••••" : inr(n));
  const Sh = (n) => (empty ? "–" : hide ? "••••" : short(n));
  const famView = s.family.view === "family" && d.family.members.length > 0;
  const nw = famView ? d.family.netWorth : d.netWorth, assets = famView ? d.assets + d.family.assets : d.assets, liab = famView ? d.liabilities + d.family.liabilities : d.liabilities;
  const up = chg && chg.netWorth >= 0;
  const pills = ["All", ...d.categories.map((c) => c.category)];
  const [filter, setFilter] = useState("All");
  const fc = filter !== "All" ? d.categories.find((c) => c.category === filter) : null;
  useEffect(() => { if (filter !== "All" && !fc) setFilter("All"); }, [fc, filter]);
  const placeholders = s.aa.status !== "connected" ? ["mf", "bank", "equity"].filter((k) => !d.categories.some((c) => c.category === k)) : [];
  const liabGroups = [["Loans", d.liabs.filter((l) => l.type !== "Credit card outstanding"), "active"], ["Credit cards", d.liabs.filter((l) => l.type === "Credit card outstanding"), "unpaid"]].filter(([, ls]) => ls.length);
  const partner = s.user.rm;
  const Card = ({ children, onClick, className = "" }) => onClick ? <button onClick={onClick} className={`w-full text-left rounded-2xl border border-violet-100 bg-white ${className}`}>{children}</button> : <div className={`rounded-2xl border border-violet-100 bg-white ${className}`}>{children}</div>;
  const H2 = ({ children, right }) => <div className="flex items-center justify-between mt-6 mb-3"><div className="text-base font-semibold text-slate-900">{children}</div>{right}</div>;
  const Delta = ({ v }) => empty || v == null ? <span className="text-slate-400">—</span> : <span className={v >= 0 ? "text-emerald-600" : "text-rose-500"}>{v >= 0 ? "+" : "−"} {hide ? "••••" : short(v)}</span>;

  return (
    <div className="bg-white min-h-full pb-24">
      {/* Header */}
      <div className="px-4 pt-4 flex items-center gap-2">
        <div className="text-xl font-semibold text-slate-900">Net Worth</div><div className="text-xs text-slate-500 border-l border-slate-200 pl-2">{s.user.name}</div>
        <div className="flex-1" />
        {d.family.members.length > 0 && <div className="flex rounded-full bg-violet-50 p-0.5 text-xs"><button onClick={() => setFamilyView("personal")} className={`px-2.5 py-1 rounded-full ${!famView ? "bg-white shadow-sm text-slate-900" : "text-violet-600"}`}>Me</button><button onClick={() => setFamilyView("family")} className={`px-2.5 py-1 rounded-full ${famView ? "bg-white shadow-sm text-slate-900" : "text-violet-600"}`}>Family</button></div>}
        <button onClick={() => setHide(!hide)} className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center text-violet-600">{hide ? <EyeOff size={15} /> : <Eye size={15} />}</button>
        <button onClick={() => go("events")} className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center text-violet-600 relative"><Bell size={15} />{s.events.some((e) => e.upcoming) && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />}</button>
      </div>

      {/* Category pills */}
      <div className="px-4 mt-3 flex gap-2 overflow-x-auto pb-1">{pills.map((k) => <button key={k} onClick={() => setFilter(k)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs border ${k === filter ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"}`}>{k === "All" ? "All" : CATEGORIES[k].label}</button>)}</div>

      {/* Overview card */}
      <div className="px-4 mt-3">
        <Card>
          <div className="px-4 pt-3 flex items-center justify-between"><div className="text-sm font-semibold text-slate-900 inline-flex items-center gap-1">Overview <Info size={12} className="text-slate-400" /></div><div className="text-xs text-slate-400">As of {fmtDate(iso(NOW))}</div></div>
          {fc ? (() => { const v = chg?.cat ? chg.cat(fc.category, fc.value) : null; const isBank = fc.category === "bank"; return (
            <>
              <div className="text-center pt-3 pb-3">
                <div className="text-xs text-slate-500">{CATEGORIES[fc.category].label} · Current Value</div>
                <div className="font-num text-slate-900 mt-1" style={{ fontSize: 28, lineHeight: "32px", fontWeight: 600 }}>{fc.category === "insurance" && fc.value === 0 ? "Cover only" : M(fc.value)}</div>
                {!isBank ? <button onClick={() => setPeriod(PERIODS[(PERIODS.indexOf(period) + 1) % PERIODS.length])} className="mt-2 text-xs text-slate-500 inline-flex items-center gap-1">Change as of <span className="text-violet-600 font-medium">{period}</span> <ArrowLeftRight size={11} className="text-violet-600" /> <span className="ml-1 font-num"><Delta v={v} /></span></button> : <div className="mt-2 text-xs text-slate-400">Balance as shared by bank</div>}
              </div>
              <div className="rounded-b-2xl px-4 py-2.5 flex items-center justify-between bg-violet-50">
                <div><div className="text-xs text-slate-500">Share of net worth</div><div className="font-num text-sm font-semibold text-slate-900">{fc.pct.toFixed(0)}%</div></div>
                <div className="text-right"><div className="text-xs text-slate-500">{countText(fc.category, fc.count)}</div><div className="font-num text-sm font-semibold text-slate-900">{fmtTime(fc.oldest)}</div></div>
              </div>
            </>
          ); })() : (
            <>
              <div className="text-center pt-3 pb-3">
                <div className="text-xs text-slate-500">{famView ? "Family net worth" : "Net Worth"}</div>
                <div className="font-num text-slate-900 mt-1" style={{ fontSize: 28, lineHeight: "32px", fontWeight: 600 }}>{M(nw)}</div>
                <button onClick={() => setPeriod(PERIODS[(PERIODS.indexOf(period) + 1) % PERIODS.length])} className="mt-2 text-xs text-slate-500 inline-flex items-center gap-1">Change as of <span className="text-violet-600 font-medium">{period}</span> <ArrowLeftRight size={11} className="text-violet-600" /> <span className="ml-1 font-num"><Delta v={chg?.netWorth} /></span></button>
              </div>
              <div className={`rounded-b-2xl px-4 py-2.5 flex items-center justify-between ${empty ? "bg-violet-50" : up ? "bg-emerald-50" : "bg-rose-50"}`} style={{ background: empty ? undefined : up ? "linear-gradient(180deg,#f3fbf7,#dff5ea)" : "linear-gradient(180deg,#fff5f5,#fde4e4)" }}>
                <button onClick={() => go("detail", "assets")} className="text-left"><div className="text-xs text-slate-500">You own</div><div className="font-num text-sm font-semibold text-slate-900">{M(assets)}</div></button>
                <button onClick={() => go("detail", "liabilities")} className="text-right"><div className="text-xs text-slate-500">You owe</div><div className="font-num text-sm font-semibold text-slate-900">{empty ? "–" : liab ? `− ${M(liab)}` : "₹0"}</div></button>
              </div>
            </>
          )}
        </Card>
        <div className="mt-1.5 flex items-center justify-between text-xs text-slate-400 px-1"><span className="inline-flex items-center gap-1"><Clock size={11} /> Synced {fmtTime(s.aa.lastSyncAt)}</span><button onClick={onRefresh} disabled={refreshing || s.aa.status !== "connected"} className="inline-flex items-center gap-1 text-violet-600 font-medium disabled:text-slate-300"><RefreshCw size={11} className={refreshing ? "animate-spin" : ""} /> {refreshing ? "Syncing…" : "Resync"}</button></div>
      </div>

      {/* Not yet added — horizontal */}
      {!famView && !fc && (() => { const ORDER = ["mf", "bank", "equity", "real_estate", "gold", "silver", "deposit", "insurance", "nps", "ppf", "epf", "aif_pms", "vehicle", "us_stocks", "esops", "etf", "bonds", "other"]; const missing = ORDER.filter((k) => CATEGORIES[k] && !d.categories.some((c) => c.category === k) && !placeholders.includes(k)).slice(0, 3); return missing.length ? (
        <div className="mt-4"><div className="px-4 text-sm font-semibold text-slate-900 mb-2">Add to your net worth</div><div className="flex gap-2 overflow-x-auto px-4 pb-1">{missing.map((k) => { const c = CATEGORIES[k], I = c.icon; const go2 = () => (c.fetch === "manual" ? go("add_form", { category: k }) : c.fetch === "link" ? go("epf_link") : k === "mf" ? go("mf_otp") : k === "equity" ? go("stk_import") : startAA(k)); return <button key={k} onClick={go2} className="shrink-0 rounded-2xl border border-violet-100 bg-white p-3 text-left" style={{ width: 132 }}><div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center"><I size={16} className="text-violet-600" /></div><div className="text-sm text-slate-900 mt-2 leading-tight">{c.label}</div><div className="text-xs text-violet-600 mt-1">{c.fetch === "manual" ? "Add" : "Sync"} →</div></button>; })}<button onClick={() => go("add_pick")} className="shrink-0 rounded-2xl border border-dashed border-violet-200 bg-violet-50 p-3 text-left" style={{ width: 132 }}><div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center"><Plus size={16} className="text-violet-600" /></div><div className="text-sm text-slate-900 mt-2 leading-tight">Add more assets</div><div className="text-xs text-violet-600 mt-1">All categories →</div></button></div></div>
      ) : null; })()}

      {fc ? (
        <div className="px-4">
          <H2 right={<button onClick={() => go("detail", fc.category)} className="text-xs text-violet-600">Open {CATEGORIES[fc.category].label.toLowerCase()}</button>}>{CATEGORIES[fc.category].label}</H2>
          <Card className="divide-y divide-violet-50">
            {[...fc.items].sort((a, b) => b.currentValue - a.currentValue).map((it) => <button key={it.id} onClick={() => go("detail", fc.category)} className="w-full flex items-center gap-3 px-4 py-3 text-left"><div className="flex-1 min-w-0"><div className="text-sm text-slate-900 truncate">{it.name}</div><div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2"><SourceBadge source={it.source} heldWith={it.heldWith} /><span>{fmtTime(asOfOf(it))}</span></div></div><div className="text-right"><div className="font-num text-sm font-semibold text-slate-900">{it.category === "insurance" && it.currentValue === 0 ? <span className="text-slate-400">Cover</span> : Sh(it.currentValue)}</div><div className="font-num text-xs text-slate-400">{fc.value ? ((it.currentValue / fc.value) * 100).toFixed(0) + "%" : ""}</div></div><ChevronRight size={16} className="text-slate-300" /></button>)}
          </Card>
          {CATEGORIES[fc.category].fetch === "manual" && <button onClick={() => go("add_form", { category: fc.category })} className="mt-3 w-full rounded-full bg-violet-50 text-violet-700 text-sm font-medium py-2.5">+ Add {CATEGORIES[fc.category].label.toLowerCase()}</button>}
        </div>
      ) : famView ? (
        <div className="px-4">
          <H2>By member</H2>
          <div className="space-y-2">
            <Card onClick={() => setFamilyView("personal")} className="p-3 flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-violet-100" /><div className="flex-1"><div className="text-sm text-slate-900">You</div><div className="text-xs text-slate-500">Owner</div></div><div className="font-num text-sm font-semibold">{Sh(d.netWorth)}</div><ChevronRight size={16} className="text-slate-300" /></Card>
            {d.family.members.map((m) => <Card key={m.id} onClick={() => go("family")} className="p-3 flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-violet-100" /><div className="flex-1"><div className="text-sm text-slate-900">{m.name}</div><div className="text-xs text-slate-500">{m.relation} · sharing summary</div></div><div className="font-num text-sm font-semibold">{Sh(m.assets - m.liabilities)}</div><ChevronRight size={16} className="text-slate-300" /></Card>)}
          </div>
        </div>
      ) : (
        <div className="px-4">
          {/* Breakdown */}
          <H2 right={!empty && <span className="font-num text-xs text-slate-500">{Sh(d.assets)}</span>}>What you own</H2>
          <div className="space-y-2">
            {d.categories.map((c) => { const v = chg?.cat ? chg.cat(c.category, c.value) : null; return (
              <Card key={c.category} onClick={() => go("detail", c.category)} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0"><div className="text-sm font-medium text-slate-900">{CATEGORIES[c.category].label} <span className="text-xs font-normal text-violet-600">{c.pct.toFixed(0)}%</span></div><div className="text-xs text-slate-500 mt-0.5">{countText(c.category, c.count)} · {fmtTime(c.oldest)}</div></div>
                <div className="text-right"><div className="text-xs text-slate-400">Current Value</div><div className="font-num text-base font-semibold text-slate-900">{c.category === "insurance" && c.value === 0 ? "Cover" : Sh(c.value)}</div>{c.category !== "bank" && !empty && v != null && v !== 0 && <div className="font-num text-xs"><Delta v={v} /></div>}</div>
                <ChevronRight size={16} className="text-slate-300" />
              </Card>
            ); })}
            {placeholders.map((k) => { const I = CATEGORIES[k].icon; return (
              <Card key={k} className="px-4 py-3 flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center"><I size={16} className="text-violet-600" /></div><div className="flex-1"><div className="text-sm font-medium text-slate-900">{CATEGORIES[k].label}</div><div className="text-xs text-slate-400">Not synced yet</div></div><button onClick={() => (k === "mf" ? go("mf_otp") : k === "equity" ? go("stk_import") : startAA(k))} className="rounded-full bg-violet-600 text-white text-xs font-medium px-3 py-1.5 inline-flex items-center gap-1"><Link2 size={12} /> Sync</button></Card>
            ); })}
            <Card className="px-4 py-3 flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center"><Plus size={16} className="text-violet-600" /></div><div className="flex-1"><div className="text-sm font-medium text-slate-900">Add more</div><Rotator items={ASSET_ROTATION} /></div><button onClick={() => go("add_pick")} className="rounded-full bg-violet-600 text-white text-xs font-medium px-4 py-1.5">+ Add</button></Card>
            {d.cover > 0 && <div className="text-xs text-slate-400 px-1">Life cover {Sh(d.cover)} is tracked but not counted as an asset.</div>}
          </div>

          <H2 right={!empty && d.liabilities > 0 && <span className="font-num text-xs text-rose-500">− {Sh(d.liabilities)}</span>}>What you owe</H2>
          <div className="space-y-2">
            {liabGroups.map(([label, ls, noun]) => { const total = ls.reduce((a, l) => a + l.outstanding, 0), v = chg?.liab ? ls.reduce((a, l) => a + (chg.liab(l.id, l.outstanding) || 0), 0) : null; return (
              <Card key={label} onClick={() => go("detail", "liabilities")} className="px-4 py-3 flex items-center gap-3"><div className="flex-1"><div className="text-sm font-medium text-slate-900">{label} <span className="text-xs font-normal text-violet-600">{d.liabilities ? ((total / d.liabilities) * 100).toFixed(0) : 0}%</span></div><div className="text-xs text-slate-500 mt-0.5">{ls.length} {noun}</div></div><div className="text-right"><div className="text-xs text-slate-400">Outstanding</div><div className="font-num text-base font-semibold text-rose-500">− {Sh(total)}</div>{v ? <div className={`font-num text-xs ${v <= 0 ? "text-emerald-600" : "text-rose-500"}`}>{v <= 0 ? "−" : "+"} {hide ? "••" : short(v)}</div> : null}</div><ChevronRight size={16} className="text-slate-300" /></Card>
            ); })}
            <Card className="px-4 py-3 flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center"><Wallet size={16} className="text-violet-600" /></div><div className="flex-1"><div className="text-sm font-medium text-slate-900">Add a loan or card</div><Rotator items={LIABILITY_TYPES} /></div><button onClick={() => go("add_liability")} className="rounded-full bg-violet-600 text-white text-xs font-medium px-4 py-1.5">+ Add</button></Card>
          </div>

          {/* Reminders */}
          {(() => { const up = s.events.filter((e) => e.upcoming).sort((a, b) => a.when.localeCompare(b.when)).slice(0, 3); return up.length ? <><H2 right={<button onClick={() => go("events")} className="text-xs text-violet-600">All</button>}>Coming up</H2><Card className="divide-y divide-violet-50">{up.map((e) => <button key={e.id} onClick={() => go("events")} className="w-full flex items-center gap-3 px-4 py-3 text-left"><div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600"><CalendarClock size={15} /></div><div className="flex-1 min-w-0"><div className="text-sm text-slate-900 truncate">{e.title}</div><div className="text-xs text-slate-500 truncate">{e.detail}</div></div><div className="font-num text-xs text-slate-500">{fmtDate(e.when)}</div></button>)}</Card></> : null; })()}

          {/* Review & retirement */}
          {!empty && <div className="mt-5 space-y-2">
            {(() => { const n = d.signals.filter((x) => x.kind !== "setup").length + (d.goal && !d.goal.onTrack ? 1 : 0); return (
              <Card onClick={() => go("insights")} className="px-4 py-3 flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600"><BarChart3 size={16} /></div><div className="flex-1"><div className="text-sm text-slate-900">{n ? <>Based on your net worth, <b>{n} action{n > 1 ? "s" : ""}</b> to take</> : "Your net worth review — nothing to fix right now"}</div><div className="text-xs text-slate-500 mt-0.5">Reviewed with {s.user.rm.split(" ")[0]}</div></div><ChevronRight size={16} className="text-slate-300" /></Card>
            ); })()}
            <Card onClick={() => go("goal")} className="px-4 py-3 flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600"><CalendarClock size={16} /></div><div className="flex-1"><div className="text-sm text-slate-900">{d.goal ? (d.goal.onTrack ? <>Retirement at {d.goal.retireAge}: <b>on track</b></> : <>To retire at {d.goal.retireAge}, you need SIP of <b className="font-num">{Sh(d.goal.requiredMonthly)}/mo</b></>) : "Set your retirement goal"}</div><div className="text-xs text-slate-500 mt-0.5">{d.goal ? `Target ${Sh(d.goal.target)} · you're at ${Sh(d.goal.monthlyInvest)}/mo` : "Two questions, we know your SIPs already"}</div></div><ChevronRight size={16} className="text-slate-300" /></Card>
          </div>}

          {/* Family card */}
          <button onClick={() => go("family")} className="w-full mt-5 rounded-2xl p-4 flex items-center gap-3 text-left" style={{ background: "linear-gradient(90deg,#fbe9dc,#f6e9f3)" }}><div className="w-10 h-10 rounded-full bg-white flex items-center justify-center"><Users size={18} className="text-rose-400" /></div><div className="flex-1"><div className="text-xs text-slate-500">Family Investments</div><div className="font-num text-base font-semibold text-slate-900">{d.family.members.length ? Sh(d.family.assets - d.family.liabilities) : "Add members"}</div></div><div className="w-7 h-7 rounded-full bg-white flex items-center justify-center"><ChevronRight size={14} className="text-slate-500" /></div></button>

          {/* Tracking promo (new users) or partner card */}
          {empty || placeholders.length > 0 ? (
            <div className="mt-5 rounded-2xl p-5 text-center" style={{ background: "linear-gradient(180deg,#efe9ff,#e4dbff)" }}>
              <div className="text-base font-semibold text-slate-900">Already have investments outside Wealthy?</div>
              <div className="text-xs text-slate-500 mt-1">Your Wealth Partner can help you invest beyond what's available in-app.</div>
              <div className="my-4 flex justify-center gap-3">{["🏦", "📈", "💰", "🏠"].map((e, i) => <div key={i} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-lg shadow-sm">{e}</div>)}</div>
              <div className="text-xs text-slate-500">with tracker you can</div>
              <div className="mt-2 rounded-xl bg-white py-2.5 text-sm text-slate-800 font-medium">Consolidate MFs & Stocks</div>
              <button onClick={() => go("add_pick")} className="mt-3 rounded-full bg-violet-600 text-white text-sm font-medium px-6 py-2.5">Start Tracking</button>
            </div>
          ) : null}
          <div className="mt-5 relative rounded-2xl border border-violet-100 bg-white p-3 pt-4 flex items-center gap-3">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs text-slate-500 bg-white border border-violet-100 rounded-full px-3">· Your Wealth Partner ·</span>
            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600"><Users size={18} /></div>
            <div className="flex-1"><div className="text-sm font-semibold text-slate-900">{partner}</div><div className="text-xs text-slate-500">Wealthy Partner</div></div>
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">✆</div><div className="w-8 h-8 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center text-sm">☏</div>
          </div>
          <div className="mt-2 text-center text-xs text-violet-600">Invite your Friends/Family to this Partner's circle</div>
        </div>
      )}

      {/* Bottom nav */}
      <div className="fixed-nav sticky bottom-3 mx-4 mt-6 rounded-full bg-white border border-violet-100 shadow-lg px-2 py-2 flex justify-between">{[["Home", Home], ["Explore", Sparkles], ["Portfolio", BarChart3], ["Orderbook", FileText], ["More", Layers]].map(([l, I], i) => <div key={l} className={`flex flex-col items-center gap-0.5 px-2 ${i === 2 ? "text-violet-700" : "text-slate-400"}`}><div className={`w-8 h-8 rounded-full flex items-center justify-center ${i === 2 ? "bg-violet-100" : ""}`}><I size={15} /></div><div style={{ fontSize: 10 }}>{l}</div></div>)}</div>
    </div>
  );
}
function Rotator({ items }) { const [i, setI] = useState(0); useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % items.length), 1500); return () => clearInterval(t); }, [items.length]); return <div className="text-xs text-slate-500 mt-0.5">Tap to add {items[i]}</div>; }
function Sparkline({ snapshots }) {
  const w = 320, hh = 70, vals = snapshots.map((x) => x.netWorth), min = Math.min(...vals), max = Math.max(...vals);
  const pts = vals.map((v, i) => [(i / (vals.length - 1)) * w, hh - ((v - min) / (max - min || 1)) * (hh - 10) - 5]);
  const p = pts.map((q, i) => (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1)).join(" ");
  return <svg viewBox={`0 0 ${w} ${hh}`} className="w-full h-16"><path d={p} fill="none" stroke="#5b2eea" strokeWidth="1.5" />{pts.map((q, i) => <circle key={i} cx={q[0]} cy={q[1]} r={i === pts.length - 1 ? 3 : 2} fill={i === pts.length - 1 ? "#5b2eea" : "#c4b5fd"} />)}<text x="0" y={hh} fontSize="9" fill="#94a3b8">{fmtDate(snapshots[0].at)}</text><text x={w} y={hh} fontSize="9" fill="#94a3b8" textAnchor="end">{fmtDate(snapshots[snapshots.length - 1].at)}</text></svg>;
}

/* ============================================================================
   DETAIL · per category. Bank: balances only, no transactions.
   ========================================================================== */
function itemSub(it) {
  const m = it.meta || {};
  switch (it.category) {
    case "bank": return `${m.accountType} · balance as shared by ${it.fipName}`;
    case "deposit": return m.monthly ? `RD ${inr(m.monthly)}/mo @ ${m.rate}% · matures ${fmtDate(m.maturity)}` : `${short(m.principal)} @ ${m.rate}% · matures ${fmtDate(m.maturity)}`;
    case "mf": return `${m.units} units × NAV ₹${m.nav} (${fmtDate(m.navDate)}) · folio ${m.folio}`;
    case "equity": case "etf": case "smallcase": return `${m.qty} units × ₹${m.ltp || m.nav}`;
    case "bonds": return `Face ${short(m.faceValue)} · ${m.coupon}% coupon · matures ${fmtDate(m.maturity)}`;
    case "nps": return `${m.schemes.length} schemes · ${m.schemes.map((x) => `${x.n} ${x.units}u × ₹${x.nav}`).join(", ")}`;
    case "epf": return `Passbook balance · last contribution ${fmtDate(m.lastContribution)}`;
    case "ppf": return `Balance ${inr(it.currentValue)} · ${m.rate}% accrued since ${fmtDate(m.balanceAsOf)} · matures ${fmtDate(m.maturity)}`;
    case "gold": case "silver": return `${m.kind || ""} · ${m.grams}g ${m.purity} × ₹${m.ratePerGram}/g (${m.city}, ${fmtDate(m.rateAsOf)})`;
    case "vehicle": return `${m.regNo || ""} · ${m.cls || ""} · ${m.auto ? "15%/yr depreciation + usage" : "value entered by you"}`;
    case "us_stocks": return `${m.qty} × $${m.priceUsd} × ₹${m.fx}/$`;
    case "esops": return `${m.vested} vested × ₹${m.fmv} FMV (${fmtDate(m.fmvAsOf)}) · ${m.unvested} unvested not counted · next vest ${fmtDate(m.nextVest)}`;
    case "aif_pms": return `As per ${m.manager} statement dated ${fmtDate(m.statementDate)}`;
    case "insurance": return m.kind === "Term" ? `Term · cover ${short(m.cover)} · no cash value · premium ${inr(m.premium)} due ${fmtDate(m.premiumDue)}` : `${m.kind} · fund value counted · cover ${short(m.cover)} · premium due ${fmtDate(m.premiumDue)}`;
    case "real_estate": return it.purchaseValue ? `${m.kind} · bought ${short(it.purchaseValue)} in ${new Date(it.purchaseDate).getFullYear()} · vs your entered value ${it.currentValue >= it.purchaseValue ? "▲" : "▼"} ${short(it.currentValue - it.purchaseValue)}` : `${m.kind} · value entered by you`;
    default: return it.purchaseValue ? `Bought ${short(it.purchaseValue)}` : "Value entered by you";
  }
}
function CategoryCard({ c, onEdit, onDelete, onRetry }) {
  const I = CATEGORIES[c.category].icon;
  return (
    <div className="rounded-2xl border border-violet-100">
      <div className="flex items-center gap-3 p-3 border-b border-slate-100"><I size={16} className="text-slate-600" /><div className="flex-1 text-sm font-medium text-slate-900">{CATEGORIES[c.category].label}</div><div className="text-sm font-medium">{short(c.value)}</div></div>
      
      <div className="divide-y divide-slate-100">
        {c.items.map((it) => (
          <div key={it.id} className="p-3">
            <div className="flex items-start gap-2"><div className="flex-1 min-w-0"><div className="text-sm text-slate-900">{it.name}</div><div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{itemSub(it)}</div></div><div className="text-sm text-slate-900 whitespace-nowrap">{it.category === "insurance" && it.currentValue === 0 ? <span className="text-slate-400">—</span> : short(it.currentValue)}</div></div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <SourceBadge source={it.source} heldWith={it.heldWith} /><Freshness at={asOfOf(it)} stale={it.source === "MANUAL" && !it.meta?.auto && ageDays(it.updatedAt) > 30} />
              {it.source === "MANUAL" && <><button onClick={() => onEdit(it)} className="ml-auto text-xs text-slate-700 inline-flex items-center gap-1"><Pencil size={12} /> {it.meta?.auto ? "Edit details" : "Update value"}</button><button onClick={() => onDelete(it)} className="text-xs text-rose-700"><Trash2 size={12} /></button></>}
              {(it.source === "AA" || it.source === "MFC" || it.source === "BROKER") && <span className="ml-auto text-xs text-slate-400">via {it.fipName}</span>}
              {it.source === "LINK" && <span className="ml-auto text-xs text-slate-400">via EPFO passbook</span>}
              {it.source === "WEALTHY" && <span className="ml-auto text-xs text-slate-400">held with Wealthy</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   MUTUAL FUNDS · MF Central sync (not AA) and holdings detail
   ========================================================================== */
const MF_UNIVERSE = () => [...FIP_DATA["CAMS-RTA"], ...FIP_DATA["KFIN-RTA"]];
function MfOtp({ go, s }) {
  const [otp, setOtp] = useState("");
  return (
    <div className="flex flex-col min-h-full">
      <Header title="Sync mutual funds" onBack={() => go("home")} sub="We fetch every folio against your PAN and mobile from MF Central — including funds bought on other platforms." />
      <div className="px-4">
        <Note><div className="font-medium text-slate-800">Registered mobile</div>{s.user.phone} · linked to your PAN with the RTAs</Note>
        <div className="mt-6 text-sm text-slate-700">Enter the OTP sent by MF Central</div>
        <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit OTP" className={inputCls + " mt-2 tracking-widest text-lg"} />
        <div className="text-xs text-slate-400 mt-2">Demo: any 6 digits · Resend in 25s</div>
      </div>
      <div className="mt-auto p-4"><Btn full disabled={otp.length < 6} onClick={() => go("mf_fetching")}>Verify and fetch folios</Btn></div>
    </div>
  );
}
function MfFetching({ go }) {
  useEffect(() => { const t = setTimeout(() => go("mf_select"), 1500); return () => clearTimeout(t); }, []); // eslint-disable-line
  return <div className="flex flex-col min-h-full items-center justify-center px-8 text-center"><RefreshCw size={28} className="text-slate-400 animate-spin" /><div className="text-sm font-medium text-slate-900 mt-4">Fetching from MF Central</div><div className="text-xs text-slate-500 mt-1">CAMS and KFintech · all folios under your PAN</div></div>;
}
function MfSelect({ go, onSync }) {
  const funds = MF_UNIVERSE();
  const [picked, setPicked] = useState(funds.map((_, i) => i));
  const toggle = (i) => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  const total = picked.reduce((a, i) => a + funds[i].currentValue, 0);
  return (
    <div className="flex flex-col min-h-full">
      <Header title={`${funds.length} funds found`} sub="All are selected. Untick any you don't want in your net worth." right={<button onClick={() => setPicked(picked.length === funds.length ? [] : funds.map((_, i) => i))} className="text-xs text-slate-600 underline underline-offset-2">{picked.length === funds.length ? "Clear" : "Select all"}</button>} />
      <div className="px-4 divide-y divide-slate-100 rounded-2xl border border-violet-100 mx-4">
        {funds.map((f, i) => (
          <button key={i} onClick={() => toggle(i)} className="w-full flex items-center gap-3 p-3 text-left">
            <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${picked.includes(i) ? "bg-slate-900 border-slate-900" : "border-slate-300"}`}>{picked.includes(i) && <CheckCircle2 size={14} className="text-white" />}</div>
            <div className="flex-1 min-w-0"><div className="text-sm text-slate-900">{f.name}</div><div className="text-xs text-slate-400 mt-0.5 flex gap-1.5 flex-wrap"><span>Folio {f.meta.folio}</span>{f.heldWith === "external" && <span className="px-1.5 rounded bg-slate-100 text-slate-600">External</span>}{f.meta.plan === "Regular" && <span className="px-1.5 rounded bg-amber-50 text-amber-700">Regular</span>}</div></div>
            <div className="text-sm text-slate-900">{short(f.currentValue)}</div>
          </button>
        ))}
      </div>
      <div className="mt-auto p-4"><Btn full disabled={!picked.length} onClick={() => onSync(picked.map((i) => funds[i]))}>Sync {picked.length} fund{picked.length > 1 ? "s" : ""} · {short(total)}</Btn></div>
    </div>
  );
}
const fundVerdict = (m) => { if (m.ret3y == null) return null; const diff = m.ret3y - m.cat3y; const status = diff >= 2 ? "Outperforming" : diff <= -2 ? "Underperforming" : "On par"; const cls = { Outperforming: "bg-emerald-50 text-emerald-700", Underperforming: "bg-rose-50 text-rose-700", "On par": "bg-slate-100 text-slate-600" }[status]; const vol = m.vol > 18 ? "high" : m.vol > 8 ? "moderate" : "low"; const cost = m.ter > 1.2 ? "expensive" : m.ter > 0.7 ? "average cost" : "low cost"; const text = status === "Outperforming" ? `Beat the ${m.category} average by ${diff.toFixed(1)}% a year over 3 years with ${vol} volatility; ${cost}.` : status === "Underperforming" ? `Behind the ${m.category} average by ${Math.abs(diff).toFixed(1)}% a year over 3 years with ${vol} volatility; ${cost}${m.plan === "Regular" ? " and a regular plan" : ""}.` : `Tracking the ${m.category} average (${diff >= 0 ? "+" : ""}${diff.toFixed(1)}% a year) with ${vol} volatility; ${cost}.`; return { status, diff, cls, text }; };
const xirr = (cur, inv, since) => { const y = Math.max(ageDays(since) / 365.25, 0.08); return (Math.pow(cur / inv, 1 / y) - 1) * 100; };
function MFDetail({ go, s, d, onRefresh, refreshing, hide, setHide }) {
  const c = d.categories.find((x) => x.category === "mf");
  const [mode, setMode] = useState("current");
  const [sheet, setSheet] = useState(null);
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState("All");
  const items = (c ? c.items : []).filter((x) => tab === "All" || (tab === "Internal" && x.heldWith === "wealthy") || (tab === "External" && x.heldWith === "external") || (tab === "Manual" && x.heldWith === "manual"));
  const tot = items.reduce((a, f) => a + f.currentValue, 0), inv = items.reduce((a, f) => a + (f.meta.invested || 0), 0), d1 = items.reduce((a, f) => a + f.currentValue * (f.meta.d1 || 0) / 100, 0);
  const external = (c ? c.items : []).filter((f) => f.heldWith === "external").length;
  const M = (n) => (hide ? "₹••••" : inr(n));
  const Ret = ({ v, base, pct }) => <span className={v >= 0 ? "text-emerald-700" : "text-rose-700"}>{v >= 0 ? "+" : "−"}{M(v)} ({v >= 0 ? "+" : ""}{(pct ?? (base ? (v / base) * 100 : 0)).toFixed(2)}%)</span>;
  const wxirr = inv ? items.reduce((a, f) => a + xirr(f.currentValue, f.meta.invested, f.meta.since) * f.meta.invested, 0) / inv : 0;

  if (detail) {
    const f = detail, m = f.meta, ret = f.currentValue - m.invested, oneD = f.currentValue * m.d1 / 100, months = Math.round(ageDays(m.since) / 30.4), lt = ageDays(m.since) > 365;
    return (
      <div className="min-h-full flex flex-col">
        <Header title="Investment details" onBack={() => setDetail(null)} right={<button onClick={() => setHide(!hide)} className="text-xs text-slate-700 underline decoration-dotted underline-offset-4">{hide ? "Show" : "Hide"}</button>} />
        <div className="px-4">
          <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">{f.name.split(" ")[0].slice(0, 3).toUpperCase()}</div><div className="flex-1"><div className="text-sm font-medium text-slate-900">{f.name}</div><div className="text-xs text-slate-500">Invested for {months < 12 ? `${months} months` : `${(months / 12).toFixed(1)} years`} · {m.category} · {m.risk} risk</div></div></div>
          <div className="mt-3 text-xs text-slate-700">Folio no. {m.folio} {f.heldWith === "external" && <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">External</span>}{m.plan === "Regular" && <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-xs">Regular</span>}</div>
          <div className="mt-4 rounded-2xl border border-violet-100 p-4">
            <div className="text-xs tracking-wide text-slate-500">CURRENT</div><div className="text-2xl font-semibold text-slate-900 mt-0.5">{M(f.currentValue)}</div>
            <div className="border-t border-dotted border-slate-200 mt-3 pt-3 space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">1D returns</span><Ret v={oneD} pct={m.d1} /></div>
              <div className="flex justify-between"><span className="text-slate-500">Total returns</span><Ret v={ret} base={m.invested} /></div>
              <div className="flex justify-between"><span className="text-slate-500">Invested</span><span className="text-slate-900">{M(m.invested)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">XIRR</span><span className="text-slate-900">{xirr(f.currentValue, m.invested, m.since).toFixed(2)}%</span></div>
              <div className="border-t border-slate-100 pt-2.5 flex justify-between"><span className="text-slate-500">Long term <span className="text-slate-400">(&gt;1Y)</span></span><span className="text-slate-900">{M(lt ? f.currentValue : 0)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Short term <span className="text-slate-400">(&lt;1Y)</span></span><span className="text-slate-900">{M(lt ? 0 : f.currentValue)}</span></div>
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-violet-100 p-4 space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Current NAV</span><span className="text-slate-900">₹{m.nav.toFixed(3)} <span className="text-xs text-slate-400">({fmtDate(m.navDate)})</span></span></div>
            <div className="flex justify-between"><span className="text-slate-500">Avg NAV</span><span className="text-slate-900">₹{m.avgNav.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Redeemable units</span><span className="text-slate-900">{m.units.toFixed(3)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Redeem to</span><span className="text-slate-900 underline decoration-dotted underline-offset-4">Bank linked to folio</span></div>
            <div className="border-t border-slate-100 pt-2.5 flex justify-between"><span className="text-slate-500">Nominee</span><span className="text-slate-900">{f.heldWith === "wealthy" ? "Registered" : "--"}</span></div>
          </div>
          {m.ret3y != null && <div className={`mt-3 rounded-2xl border p-4 ${fundVerdict(m).status === "Underperforming" ? "border-rose-200 bg-rose-50" : fundVerdict(m).status === "Outperforming" ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}`}><div className="flex items-center justify-between"><div className="text-sm font-medium text-slate-900">Fund review</div><span className={`text-xs px-1.5 py-0.5 rounded ${fundVerdict(m).cls}`}>{fundVerdict(m).status}</span></div><div className="text-xs text-slate-700 mt-2">{fundVerdict(m).text}</div><div className="grid grid-cols-3 gap-2 mt-3 text-center"><div><div className="text-xs text-slate-500">3Y return</div><div className="text-sm text-slate-900">{m.ret3y}%</div></div><div><div className="text-xs text-slate-500">{m.category} avg</div><div className="text-sm text-slate-900">{m.cat3y}%</div></div><div><div className="text-xs text-slate-500">Volatility</div><div className="text-sm text-slate-900">{m.vol}%</div></div></div><div className="text-xs text-slate-500 mt-2">Expense {m.ter}%{m.plan === "Regular" ? " · regular plan" : ""}. Drafted by Wealthy's review model; your partner confirms before any switch.</div></div>}
          <div className="mt-3 rounded-2xl border border-violet-100 p-3 grid grid-cols-3 text-center text-xs text-slate-700">{[["Switch", RefreshCw], ["STP", CalendarClock], ["Redeem", Download]].map(([l, I]) => <button key={l} className="py-2"><div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center"><I size={16} /></div><div className="mt-1.5">{l}</div></button>)}</div>
          <div className="mt-5 text-sm font-semibold text-slate-900 flex items-center gap-1">Transaction history <Info size={13} className="text-slate-400" /></div>
          <div className="mt-2 flex justify-between text-sm"><div><div className="text-slate-900">Invested{m.sip ? " (SIP)" : ""}</div><div className="text-xs text-slate-500">{fmtDate(m.since)}</div></div><div className="text-right"><div className="text-emerald-700">+{M(m.invested)}</div><div className="text-xs text-slate-500">{m.units.toFixed(3)} units / ₹{m.avgNav.toFixed(3)} NAV</div></div></div>
          <div className="mt-2 text-xs text-slate-400">Source: {f.source === "MFC" ? "MF Central" : f.fipName} · as of {fmtTime(f.valueAsOf)}</div>
        </div>
        <div className="sticky bottom-0 mt-auto pt-4 bg-white border-t border-slate-100 p-4">
          {m.plan === "Regular" && <div className="flex gap-2 text-xs text-slate-600 mb-3"><Info size={14} className="text-slate-400 shrink-0" />SIPs in regular funds are not allowed. Choose the direct version of the same fund at a much lower expense ratio.</div>}
          <Btn full>{m.plan === "Regular" ? "Switch to direct" : f.heldWith === "external" ? "Continue on Wealthy" : "Invest more"}</Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6 relative min-h-full">
      <Header title="Mutual funds" onBack={() => go("home")} />
      {sheet && (<Overlay open={true} onClose={() => setSheet(null)}>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl px-5 pb-5 pt-2" onClick={(e) => e.stopPropagation()}><div className="flex justify-center mb-3"><div className="w-10 h-1 rounded-full bg-slate-200" /></div>
            <button onClick={() => { setDetail(sheet); setSheet(null); }} className="w-full flex items-center gap-2 text-left"><div className="flex-1 text-sm font-medium text-slate-900">{sheet.name}</div><ChevronRight size={16} className="text-slate-400" /><div className="text-base font-semibold text-slate-900">{M(sheet.currentValue)}</div></button>
            <div className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
              <button className="w-full flex items-center gap-3 py-3 text-sm text-slate-900"><div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center"><Download size={14} /></div>Redeem</button>
              <button onClick={() => { setDetail(sheet); setSheet(null); }} className="w-full flex items-center gap-3 py-3 text-sm text-slate-900"><div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><FileText size={14} /></div>Investment details</button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3"><Btn full kind="ghost">One Time</Btn><Btn full disabled={sheet.meta.plan === "Regular"}>Start SIP</Btn></div>
            {sheet.meta.plan === "Regular" && <div className="mt-2 text-xs text-slate-500">SIPs in regular funds aren't allowed. Switch to the direct plan first.</div>}
          </div>
        </Overlay>)}
      <div className="px-4">
        <div className="rounded-2xl border border-violet-100 p-4">
          <div className="flex items-start justify-between"><div><div className="text-xs tracking-wide text-slate-500">HOLDINGS ({items.length})</div><div className="font-num text-2xl font-semibold text-slate-900 mt-0.5">{M(tot)}</div></div><div className="flex gap-2"><button onClick={() => setHide(!hide)} className="w-9 h-9 rounded-full bg-violet-50 flex items-center justify-center text-violet-600">{hide ? <EyeOff size={15} /> : <Eye size={15} />}</button><button onClick={() => go("forecast")} className="w-9 h-9 rounded-full bg-violet-50 flex items-center justify-center text-violet-600"><TrendingUp size={15} /></button></div></div>
          <div className="border-t border-dotted border-slate-200 mt-3 pt-3 space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">1D returns</span><Ret v={d1} base={tot} /></div>
            <div className="flex justify-between"><span className="text-slate-500">Total returns</span><Ret v={tot - inv} base={inv} /></div>
            <div className="flex justify-between"><span className="text-slate-500">Invested</span><span className="text-slate-900">{M(inv)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">XIRR</span><span className="text-slate-900">{wxirr.toFixed(2)}%</span></div>
          </div>
        </div>
        {(() => { const vs = items.map((f) => fundVerdict(f.meta)).filter(Boolean); const n = (k) => vs.filter((v) => v.status === k).length; return vs.length ? <div className="mt-3 rounded-2xl border border-violet-100 p-3"><div className="flex items-center justify-between"><div className="text-sm font-medium text-slate-900">Fund performance</div><span className="text-xs text-slate-400">3-yr vs category</span></div><div className="mt-2 grid grid-cols-3 gap-2 text-center">{[["Outperforming", n("Outperforming"), "text-emerald-700"], ["On par", n("On par"), "text-slate-700"], ["Underperforming", n("Underperforming"), "text-rose-700"]].map(([k, c, cls]) => <div key={k} className="rounded-xl bg-slate-50 py-2"><div className={`text-lg font-semibold ${cls}`}>{c}</div><div className="text-xs text-slate-500" style={{ fontSize: 11 }}>{k}</div></div>)}</div><div className="text-xs text-slate-400 mt-2" style={{ fontSize: 11 }}>Rule: more than 2% a year above the category average is outperforming; more than 2% below is underperforming. Your partner reviews before any switch.</div></div> : null; })()}
        <div className="mt-4 flex items-center justify-between"><div className="flex gap-1.5">{["All", "Internal", "External", "Manual"].map((b) => <button key={b} onClick={() => setTab(b)} className={`rounded-full px-2.5 py-1 text-xs ${tab === b ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>{b}</button>)}</div><button onClick={() => setMode(mode === "current" ? "1d" : "current")} className="text-xs text-slate-700 underline decoration-dotted underline-offset-4 inline-flex items-center gap-1"><ArrowLeftRight size={11} /> {mode === "current" ? "Current (Invested)" : "1D returns"}</button></div>
        <div className="mt-1 divide-y divide-slate-100">
          {items.map((f) => { const m = f.meta, oneD = f.currentValue * m.d1 / 100; return (
            <button key={f.id} onClick={() => setSheet(f)} className="w-full flex items-start justify-between gap-3 py-3.5 text-left">
              <div className="flex-1 min-w-0"><div className="text-sm text-slate-900 leading-snug">{f.name}</div><div className="mt-1.5 flex gap-1.5 flex-wrap">{m.sip && <span className="text-xs text-slate-500">SIP</span>}{f.heldWith === "wealthy" ? <span className="text-xs px-1.5 py-0.5 rounded bg-slate-900 text-white">Wealthy</span> : f.heldWith === "manual" ? <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">Manual</span> : <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">External</span>}{m.plan === "Regular" && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">Regular</span>}{(() => { const v = fundVerdict(m); return v ? <span className={`text-xs px-1.5 py-0.5 rounded ${v.cls}`}>{v.status}</span> : null; })()}</div>{(() => { const v = fundVerdict(m); return v ? <div className="text-xs text-slate-500 mt-1.5" style={{ fontSize: 11 }}>{v.text}</div> : null; })()}</div>
              <div className="text-right shrink-0">{mode === "current" ? <><div className={`text-sm ${f.currentValue >= m.invested ? "text-emerald-700" : "text-rose-700"}`}>{M(f.currentValue)}</div><div className="text-xs text-slate-500">({M(m.invested)})</div></> : <><div className={`text-sm ${oneD >= 0 ? "text-slate-900" : "text-slate-900"}`}>{oneD >= 0 ? "+" : "−"}{M(oneD)}</div><div className={`text-xs ${oneD >= 0 ? "text-emerald-700" : "text-rose-700"}`}>({oneD >= 0 ? "+" : ""}{m.d1.toFixed(2)}%)</div></>}</div>
            </button>
          ); })}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={onRefresh} disabled={refreshing || !external} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2.5 text-xs text-slate-800 disabled:text-slate-400"><RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Refresh external ({external})</button><button onClick={() => go("add_form", { category: "mf" })} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-700 px-2 py-2.5 text-xs font-medium text-white"><Plus size={14} /> Add manually</button></div><div className="text-xs text-slate-400 mt-2 text-center">Updated on {fmtDate(c?.oldest)}</div>
      </div>
      <div className="sticky bottom-0 mt-4 bg-white border-t border-slate-100 p-4 grid grid-cols-2 gap-3"><Btn full kind="ghost">Lumpsum</Btn><Btn full>Start SIP</Btn></div>

    </div>
  );
}


/* ============================================================================
   BANK ACCOUNTS · list, per-account overview + transactions (AA DEPOSIT type)
   ========================================================================== */
const MONTHS = [0, 1, 2, 3].map((k) => { const d = new Date(NOW); d.setMonth(d.getMonth() - k, 1); return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }), y: d.getFullYear(), m: d.getMonth() }; });
const DESC = ["UPI/313880462891/DR/Swiggy/AIRP/swiggyins/Pay", "UPI/624602464324/DR/Suhail/YESB/paytm.s26/Paid", "NEFT/HDFC0001234/Salary Aug", "UPI/624602362451/DR/MRS CH/YESB/q18965227/Paid v", "ACH/D/HDFCLTD/EMI 3390", "UPI/624602301702/DR/MEESE/YESB/q17293889/P", "IMPS/Rahul Sharma/loan repay", "UPI/CR/Zerodha/refund", "POS/AMAZON PAY/Bengaluru", "ATM WDL/Baner", "INT.PD:01-09-2026", "UPI/DR/BigBasket/grocery"];
function mkTxns(seed, y, m) {
  let x = seed * 9301 + y * 49297 + m * 233; const rnd = () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
  const days = m === NOW.getMonth() && y === NOW.getFullYear() ? NOW.getDate() : new Date(y, m + 1, 0).getDate();
  const n = 6 + Math.floor(rnd() * 5);
  return Array.from({ length: n }, () => { const credit = rnd() < 0.3; const amt = credit ? Math.round(2000 + rnd() * 40000) : Math.round(10 + rnd() * (rnd() < 0.2 ? 20000 : 900)); return { date: new Date(y, m, 1 + Math.floor(rnd() * days)), desc: DESC[Math.floor(rnd() * DESC.length)], amt: credit ? amt : -amt }; });
}
const BankLogo = ({ name }) => <div className="w-11 h-11 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-xs font-semibold text-slate-700">{name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</div>;
function BankDetail({ go, s, d, onRefresh, refreshing, hide, onAdd }) {
  const c = d.categories.find((x) => x.category === "bank");
  const items = c ? c.items : [];
  const connectedItems = items.filter((a) => a.source !== "MANUAL");
  const [period, setPeriod] = useState("This month");
  const [acct, setAcct] = useState(null);
  const M = (n) => (hide ? "₹••••" : inr(n));
  const total = items.reduce((a, x) => a + x.currentValue, 0), totalChg = items.reduce((a, x) => a + (x.meta.changes?.[period] || 0), 0);
  const Chg = ({ v }) => v === 0 ? <span className="text-slate-400">₹ 0</span> : <span className={v > 0 ? "text-emerald-700" : "text-rose-700"}>{v > 0 ? "▲" : "▼"} {v < 0 ? "- " : ""}{hide ? "••••" : short(Math.abs(v))}</span>;

  if (acct) return <BankAccount a={acct} onBack={() => setAcct(null)} hide={hide} />;

  return (
    <div className="min-h-full flex flex-col">
      <Header title="Bank Accounts" onBack={() => go("home")} />
      <div className="px-4">
        <div className="rounded-2xl border border-violet-100 p-4 flex items-start justify-between"><div><div className="text-base font-semibold text-slate-900">Current value</div><button onClick={() => go("provenance")} className="text-xs text-violet-600 mt-0.5">See overview</button></div><div className="text-right"><div className="text-base font-semibold text-slate-900">{M(total)}</div><div className="text-xs text-slate-400 mt-0.5">across {items.length} account{items.length > 1 ? "s" : ""}</div></div></div>
        <div className="mt-5 flex items-center justify-between"><div className="text-xs text-slate-500">Bank Accounts ({items.length})</div><div className="text-xs text-slate-400">{connectedItems.length ? "Connected and manually entered balances" : "Manually entered balances"}</div></div>
        <div className="mt-2 divide-y divide-slate-100">
          {items.map((a) => (
            <button key={a.id} onClick={() => setAcct(a)} className="w-full flex items-center gap-3 py-4 text-left">
              <BankLogo name={a.meta.bank} />
              <div className="flex-1 min-w-0"><div className="text-sm font-medium text-slate-900">{a.source === "MANUAL" ? a.name : `${(a.meta.bank || "Bank").toUpperCase()} **${a.name.slice(-4)}`}</div><div className="text-xs text-slate-500 mt-0.5">{a.source === "MANUAL" ? `${a.meta.bank || "Bank"} · Entered manually` : `Last synced ${fmtTime(a.fetchedAt).replace(/^\d.*today$/, "today")}`}</div></div>
              <div className="text-right"><div className="text-sm text-slate-900">{M(a.currentValue)}</div><div className="text-xs text-slate-400 mt-0.5">{a.meta.accountType}</div></div>
            </button>
          ))}
        </div>
        <div className="mt-2 rounded-2xl border border-violet-100 p-3 flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center"><Landmark size={18} className="text-slate-600" /></div><div className="flex-1"><div className="text-sm font-medium text-slate-900">Bank Accounts</div><div className="text-xs text-slate-500">{connectedItems.length ? `Last synced ${fmtTime(c.oldest)}` : "Includes manually entered balances"}</div></div><button onClick={onRefresh} disabled={refreshing || !connectedItems.length} className="text-xs text-violet-600 font-medium inline-flex items-center gap-1 disabled:text-slate-400"><RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Resync</button></div>
        <div className="mt-3 text-xs text-slate-400">Balances and transactions come through the Account Aggregator with your consent. Banks can take a few hours to share the latest data.</div>
      </div>
      <div className="sticky bottom-0 mt-auto pt-4 bg-white border-t border-slate-100 p-4 grid grid-cols-2 gap-2"><Btn full onClick={onAdd}>Connect bank</Btn><Btn full kind="ghost" onClick={() => go("add_form", { category: "bank" })}>Add manually</Btn></div>
    </div>
  );
}
function BankAccount({ a, onBack, hide }) {
  const m = a.meta;
  const [month, setMonth] = useState(MONTHS[0].key);
  const [type, setType] = useState("All transactions"); const [sort, setSort] = useState("Date (Latest first)");
  const [sheet, setSheet] = useState(null); const [draft, setDraft] = useState(null);
  const mo = MONTHS.find((x) => x.key === month);
  const txns = useMemo(() => mkTxns(m.seed, mo.y, mo.m), [m.seed, month]);
  const credit = txns.filter((t) => t.amt > 0).reduce((x, t) => x + t.amt, 0), debit = txns.filter((t) => t.amt < 0).reduce((x, t) => x - t.amt, 0);
  const shown = txns.filter((t) => type === "All transactions" || (type === "Debit only" ? t.amt < 0 : t.amt > 0)).sort((p, q) => sort === "Date (Latest first)" ? q.date - p.date : sort === "Date (Oldest first)" ? p.date - q.date : sort === "Amount (Highest first)" ? Math.abs(q.amt) - Math.abs(p.amt) : Math.abs(p.amt) - Math.abs(q.amt));
  const M = (n) => (hide ? "₹••••" : inr(n));
  const Sel = ({ label, value, onClick }) => <div><div className="text-xs text-slate-500 mb-1">{label}</div><button onClick={onClick} className="w-full flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800">{value}<ChevronRight size={14} className="rotate-90 text-slate-400" /></button></div>;
  const opts = sheet === "type" ? ["All transactions", "Debit only", "Credit only"] : ["Date (Latest first)", "Date (Oldest first)", "Amount (Highest first)", "Amount (Lowest first)"];
  const monthChg = m.changes?.["This month"] || 0;
  return (
    <div className="pb-6 relative min-h-full">
      <Header title="Bank Accounts" onBack={onBack} />
      {sheet && (<Overlay open={true} onClose={() => setSheet(null)}>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl pt-2" onClick={(e) => e.stopPropagation()}><div className="flex justify-center"><div className="w-10 h-1 rounded-full bg-slate-200" /></div>
            <div className="px-4 py-4 text-lg font-semibold text-slate-900 bg-slate-50 rounded-t-3xl">{sheet === "type" ? "Transaction Type" : "Sort by"}</div>
            <div className="px-4 divide-y divide-slate-100">{opts.map((o) => <button key={o} onClick={() => setDraft(o)} className="w-full flex items-center justify-between py-4 text-sm"><span className={draft === o ? "text-violet-600 font-medium" : "text-slate-700"}>{o}</span><span className={`w-5 h-5 rounded-full border-2 ${draft === o ? "border-violet-600 bg-violet-600 ring-2 ring-inset ring-white" : "border-slate-300"}`} /></button>)}</div>
            <div className="p-4"><button onClick={() => { (sheet === "type" ? setType : setSort)(draft); setSheet(null); }} className="w-full rounded-xl bg-violet-600 text-white text-sm font-medium py-3">Apply changes</button></div>
          </div>
        </Overlay>)}
      <div className="bg-slate-50 px-4 py-4"><div className="flex items-center gap-3"><BankLogo name={m.bank} /><div className="text-base font-semibold text-slate-900">{m.bank} **{a.name.slice(-4)}</div></div><div className="border-t border-slate-200 mt-3 pt-3 text-sm text-slate-500">Last synced {fmtTime(a.fetchedAt).endsWith("today") ? "today" : fmtTime(a.fetchedAt)}</div></div>
      <div className="px-4 mt-5">
        <div className="text-lg font-semibold text-slate-900">Overview</div>
        <div className="mt-3 flex justify-between items-end"><div><div className="text-xs text-slate-500">Current balance</div><div className="text-xl text-slate-900 mt-1">{M(a.currentValue)}</div></div><div className="text-right text-xs text-slate-400">as of {fmtTime(a.valueAsOf)}</div></div>
        <div className="mt-5 flex items-center gap-3"><div className="text-sm font-medium text-slate-900">Account details</div><div className="flex-1 border-t border-slate-200" /></div>
        <div className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><span className="text-slate-500">Account type</span><span className="text-slate-900">{m.accountType}</span></div><div className="flex justify-between"><span className="text-slate-500">IFSC code</span><span className="text-slate-900 inline-flex items-center gap-1"><FileText size={13} className="text-slate-500" /> {m.ifsc}</span></div><div className="flex justify-between"><span className="text-slate-500">Branch</span><span className="text-slate-900">{m.branch}</span></div></div>

        <div className="text-lg font-semibold text-slate-900 mt-7">Transactions</div>
        <div className="grid grid-cols-2 gap-3 mt-3"><Sel label="Type" value={type} onClick={() => { setSheet("type"); setDraft(type); }} /><Sel label="Sort by" value={sort} onClick={() => { setSheet("sort"); setDraft(sort); }} /></div>
        <div className="mt-4 flex gap-5 border-b border-slate-200 overflow-x-auto">{MONTHS.map((x) => <button key={x.key} onClick={() => setMonth(x.key)} className={`pb-2 text-sm whitespace-nowrap ${month === x.key ? "text-violet-600 font-medium border-b-2 border-violet-600" : "text-slate-600"}`}>{x.label}</button>)}</div>
        <div className="grid grid-cols-2 gap-3 mt-4"><div className="rounded-xl border border-violet-100 p-3 bg-gradient-to-b from-white to-emerald-50"><div className="text-base font-semibold text-slate-900">{M(credit)}</div><div className="text-xs text-slate-600 mt-1">↘ Credit</div></div><div className="rounded-xl border border-violet-100 p-3 bg-gradient-to-b from-white to-rose-50"><div className="text-base font-semibold text-slate-900">{M(debit)}</div><div className="text-xs text-slate-600 mt-1">↗ Debit</div></div></div>
        <div className="text-xs text-slate-500 mt-3">Latest transactions may not be visible as banks can take a few hours to share updated data</div>
        <div className="mt-2 divide-y divide-slate-100">{shown.map((t, i) => <div key={i} className="flex items-center gap-3 py-3.5"><div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.amt < 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>{t.amt < 0 ? "↗" : "↘"}</div><div className="flex-1 min-w-0 text-sm text-slate-800 leading-snug break-all">{t.desc.length > 44 ? t.desc.slice(0, 44) + "…" : t.desc}</div><div className="text-right shrink-0"><div className={`text-sm font-medium ${t.amt < 0 ? "text-slate-900" : "text-emerald-700"}`}>{t.amt < 0 ? "-" : "+"}{hide ? "₹••" : "₹ " + Math.abs(t.amt).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div><div className="text-xs text-slate-500">{t.date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div></div></div>)}{!shown.length && <div className="text-xs text-slate-400 py-4">No transactions match.</div>}</div>
      </div>

    </div>
  );
}


/* ============================================================================
   STOCKS · broker connect (gateway pattern), login, consent, holdings page
   ========================================================================== */
const BROKERS = ["ICICI Direct", "Groww", "Zerodha", "Upstox", "Angel One", "HDFC Sec", "SBI Sec", "Paytm Money", "AxisDirect", "Kotak Sec", "HDFC SKY", "5paisa", "Motilal Oswal", "IIFL Capital", "Dhan", "Nuvama", "Alice Blue", "FundzBazar", "Trustline", "SMC", "Stoxkart"];
const BROKER_COLOR = { "ICICI Direct": "bg-orange-600", Groww: "bg-emerald-500", Zerodha: "bg-blue-600", Upstox: "bg-purple-700", "Angel One": "bg-blue-500", "HDFC Sec": "bg-red-700", "SBI Sec": "bg-indigo-600", "Paytm Money": "bg-violet-600", AxisDirect: "bg-pink-700", "Kotak Sec": "bg-red-600", "HDFC SKY": "bg-blue-700", "5paisa": "bg-rose-600", "Motilal Oswal": "bg-indigo-800", "IIFL Capital": "bg-amber-600", Dhan: "bg-teal-600", Nuvama: "bg-blue-800", "Alice Blue": "bg-blue-500", FundzBazar: "bg-indigo-500", Trustline: "bg-sky-700", SMC: "bg-teal-700", Stoxkart: "bg-emerald-700" };
const BrokerLogo = ({ name, size = 10 }) => <div className={`w-${size} h-${size} rounded-full ${BROKER_COLOR[name] || "bg-slate-700"} text-white flex items-center justify-center text-xs font-semibold`}>{name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</div>;
// Which holdings each broker returns in the demo. Unlisted brokers return a generic set.
const BROKER_DATA = (name) => { const eq = FIP_DATA["NSDL-DP"].filter((x) => x.category === "equity"); const own = eq.filter((x) => x.meta.broker === name); return (own.length ? own : eq.slice(0, 2)).map((x) => ({ ...x, meta: { ...x.meta, broker: name } })); };

function StkImport({ go, s }) {
  const linked = s.links.brokers || [];
  return (
    <div className="flex flex-col min-h-full">
      <div className="flex justify-end px-4 pt-4"><button onClick={() => go("home")} className="p-1 rounded-lg hover:bg-slate-100"><X size={22} /></button></div>
      <div className="px-5"><div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center"><TrendingUp size={22} className="text-indigo-600" /></div><h2 className="text-xl font-semibold text-slate-900 mt-4">Import your investments</h2>
        <div className="mt-6 flex gap-3"><div className={`w-6 h-6 rounded-full flex items-center justify-center ${linked.length ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>{linked.length ? <CheckCircle2 size={14} /> : <Info size={14} />}</div><div><div className="text-sm font-medium text-slate-900">Stock holdings</div><div className="text-xs text-slate-500 mt-0.5">{linked.length ? `${linked.map((b) => b.name).join(", ")} connected` : "No broker account connected"}</div></div></div>
        <div className="mt-4 text-xs text-slate-400">We read holdings only. Wealthy never places orders or sees your funds balance.</div></div>
      <div className="mt-auto p-4"><Btn full onClick={() => go("stk_brokers")}>Connect broker account</Btn><button onClick={() => go("home")} className="w-full text-sm text-violet-600 font-medium py-3">Proceed anyway</button></div>
    </div>
  );
}
function StkBrokers({ go, onPick }) {
  return (
    <div className="pb-4 min-h-full">
      <div className="sticky top-0 bg-slate-50 px-4 py-4 flex items-start z-10"><div className="flex-1"><div className="text-lg font-semibold text-slate-900">Connect your broker account</div><div className="text-xs text-slate-500">Select a broker to continue</div></div><button onClick={() => go("stk_import")} className="p-1 rounded-lg hover:bg-slate-200"><X size={20} /></button></div>
      <div className="px-4 mt-3 grid grid-cols-4 gap-y-6 gap-x-2">{BROKERS.map((b) => <button key={b} onClick={() => onPick(b)} className="flex flex-col items-center gap-2"><div className="w-16 h-16 rounded-full border border-slate-200 bg-white flex items-center justify-center"><BrokerLogo name={b} /></div><div className="text-xs text-slate-700 text-center leading-tight">{b}</div></button>)}</div>
      <div className="px-4 mt-8 flex items-center gap-3 text-xs text-slate-500"><div className="flex-1 border-t border-slate-200" />Don't have a broker account?<div className="flex-1 border-t border-slate-200" /></div>
      <div className="px-4 mt-3"><button className="w-full rounded-xl border border-violet-600 text-violet-600 text-sm font-medium py-3">Open an account online</button></div>
    </div>
  );
}
const BrokerFrame = ({ broker, go, children }) => <div className="min-h-full flex flex-col"><div className={`px-4 py-3 flex items-center gap-3 text-white ${BROKER_COLOR[broker] || "bg-slate-700"}`}><button onClick={() => go("stk_brokers")}><X size={20} /></button><div className="text-sm flex-1">{broker.toLowerCase().replace(/\s+/g, "")}.in</div><div className="text-xs opacity-80">Secure · broker page</div></div>{children}</div>;
function StkLogin({ go, broker, onDone }) {
  const [step, setStep] = useState(0); const [id, setId] = useState(""); const [pw, setPw] = useState(""); const [otp, setOtp] = useState("");
  if (step === 0) return <BrokerFrame broker={broker} go={go}><div className="px-6 pt-8 flex flex-col flex-1"><div className="flex items-center gap-2"><BrokerLogo name={broker} /><div className="text-lg font-semibold text-slate-900">{broker}</div></div><div className="text-sm text-slate-500 mt-2">Log in to your {broker} account to share holdings with Wealthy</div>
    <div className="mt-6"><Field label={broker === "Groww" ? "Email" : "Client ID / mobile"}><input value={id} onChange={(e) => setId(e.target.value)} className={inputCls} placeholder={broker === "Groww" ? "you@email.com" : "AB1234 or mobile"} /></Field><Field label="Password"><input value={pw} onChange={(e) => setPw(e.target.value)} type="password" className={inputCls} placeholder="••••••••" /></Field></div>
    {broker === "Groww" && <button className="w-full rounded-xl border border-slate-200 py-3 text-sm text-slate-800 mb-3">Continue with Google</button>}
    <div className="mt-auto pb-6"><Btn full disabled={!id || !pw} onClick={() => setStep(1)}>Continue</Btn><div className="text-xs text-slate-400 mt-3 text-center">By proceeding, you agree to {broker}'s T&C and Privacy Policy. Wealthy never sees this password.</div></div></div></BrokerFrame>;
  if (step === 1) return <BrokerFrame broker={broker} go={go}><div className="px-6 pt-8 flex flex-col flex-1"><div className="text-lg font-semibold text-slate-900">Verify it's you</div><div className="text-sm text-slate-500 mt-1">Enter the OTP {broker} sent to your registered mobile{broker === "Zerodha" ? " (or your TOTP)" : ""}</div><input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit OTP" className={inputCls + " mt-6 tracking-widest text-lg"} /><div className="text-xs text-slate-400 mt-2">Demo: any 6 digits</div><div className="mt-auto pb-6"><Btn full disabled={otp.length < 6} onClick={() => setStep(2)}>Verify</Btn></div></div></BrokerFrame>;
  return <BrokerFrame broker={broker} go={go}><div className="px-5 pt-6 flex-1 flex flex-col"><div className="flex items-center justify-center gap-3"><BrokerLogo name={broker} /><ArrowLeftRight size={16} className="text-slate-400" /><WLogo /></div><h2 className="text-xl font-semibold text-slate-900 text-center mt-4">Authorize Wealthy to access {broker} API</h2>
    <div className="mt-5 rounded-2xl border border-violet-100 p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-purple-200" /><div className="flex-1"><div className="text-xs text-slate-500">User</div><div className="text-sm text-slate-900">{id}</div></div><button className="text-xs border border-slate-200 rounded-lg px-3 py-1.5">Logout</button></div>
      <div className="text-sm font-medium text-slate-900 mt-4">Grant access to the following resources:</div>
      <div className="mt-3 space-y-2.5 text-sm">{[["Holdings", "View stock portfolio holdings", true], ["Data", "Access live market data for instruments", true], ["Orders", "Create, modify, cancel orders", false], ["Positions", "View active trading positions", false], ["Margin", "Get available cash and margin", false]].map(([k, v, on]) => <div key={k} className="flex gap-2"><CheckCircle2 size={16} className={on ? "text-emerald-600 shrink-0" : "text-slate-300 shrink-0"} /><div className={on ? "text-slate-800" : "text-slate-400 line-through"}><b>{k}:</b> {v}</div></div>)}</div>
      <div className="text-xs text-slate-500 mt-3">Wealthy requests read access only. Orders, positions and margin are not requested.</div>
      <div className="border-t border-slate-100 mt-4 pt-3 flex justify-end gap-2"><button onClick={() => go("stk_brokers")} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm">Decline</button><button onClick={() => onDone(broker, id)} className="rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-sm font-medium">Allow</button></div></div>
    <div className="text-xs text-slate-400 text-center mt-4 pb-6">You can revoke this anytime from Connected accounts or from {broker}.</div></div></BrokerFrame>;
}
function StkFetching({ broker }) { return <div className="flex flex-col min-h-full items-center justify-center px-8 text-center"><RefreshCw size={28} className="text-slate-400 animate-spin" /><div className="text-sm font-medium text-slate-900 mt-4">Importing holdings from {broker}</div><div className="text-xs text-slate-500 mt-1">Quantity and average price · priced at last traded price</div></div>; }
function StocksDetail({ go, s, d, onRefresh, refreshing, hide }) {
  const c = d.categories.find((x) => x.category === "equity");
  const items = c ? c.items : [];
  const VIEWS = ["All", "Internal", "External", "Manual"];
  const [tab, setTab] = useState("All");
  const [q, setQ] = useState(""); const [search, setSearch] = useState(false);
  const shown = items.filter((x) => tab === "All" || (tab === "Internal" && x.heldWith === "wealthy") || (tab === "External" && x.heldWith === "external") || (tab === "Manual" && x.heldWith === "manual")).filter((x) => x.name.toLowerCase().includes(q.toLowerCase()));
  const n2 = (n) => (hide ? "••••" : Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const inv = shown.reduce((a, x) => a + x.meta.qty * (x.meta.avgPrice || x.meta.ltp), 0), cur = shown.reduce((a, x) => a + x.currentValue, 0), pnl = cur - inv;
  return (
    <div className="min-h-full bg-slate-50 flex flex-col">
      <div className="bg-white"><Header title="Stocks" onBack={() => go("home")} /></div>
      <div className="px-4 pt-3 bg-white">
        <div className="text-xl font-semibold text-slate-900">Portfolio</div>
        <div className="mt-2 flex border-b border-slate-200"><div className="pb-2 text-sm inline-flex items-center gap-1.5 text-violet-600 border-b-2 border-violet-600">Holdings <span className="text-xs bg-violet-100 text-violet-600 rounded-full px-1.5">{shown.length}</span></div></div>
      </div>
      {(
        <>
          <div className="px-4 pt-3 bg-white pb-3">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <div className="flex justify-between text-xs text-slate-500"><span>Invested</span><span>Current</span></div>
              <div className="flex justify-between text-base text-slate-900 mt-0.5"><span>{n2(inv)}</span><span>{n2(cur)}</span></div>
              <div className="border-t border-slate-200 mt-3 pt-2.5 flex items-center justify-between"><span className="text-sm text-slate-500">P&L</span><span className="inline-flex items-center gap-2"><span className={`text-base ${pnl >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{pnl < 0 ? "-" : "+"}{n2(pnl)}</span><span className={`text-xs px-1.5 py-0.5 rounded ${pnl >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{pnl < 0 ? "-" : "+"}{inv ? Math.abs((pnl / inv) * 100).toFixed(2) : "0.00"}%</span></span></div>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs">
              <button onClick={() => setSearch(!search)} className="text-slate-600"><HelpCircle size={16} className="hidden" /><span className="inline-flex items-center gap-1"><Layers size={15} /></span></button>
              <div className="flex gap-1.5 overflow-x-auto flex-1">{VIEWS.map((b) => <button key={b} onClick={() => setTab(b)} className={`shrink-0 rounded-full px-2.5 py-1 ${tab === b ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>{b}</button>)}</div>
              <button onClick={() => go("family")} className="text-violet-600 inline-flex items-center gap-1 shrink-0"><Users size={13} /> Family</button>
              <button onClick={() => go("forecast")} className="text-violet-600 inline-flex items-center gap-1 shrink-0"><BarChart3 size={13} /> Analytics</button>
            </div>
            {search && <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search holdings" className={inputCls + " mt-2"} />}
          </div>
          <div className="divide-y divide-slate-200 bg-white">
            {shown.map((x) => { const m = x.meta, avg = m.avgPrice || m.ltp, invested = m.qty * avg, p = x.currentValue - invested, pct = invested ? (p / invested) * 100 : 0, d1 = m.d1 || 0; return (
              <div key={x.id} className="px-4 py-3">
                <div className="flex justify-between text-xs"><span className="text-slate-500">Qty. <span className="text-slate-800">{m.qty.toLocaleString("en-IN")}</span> • Avg. <span className="text-slate-800">{avg.toFixed(2)}</span></span><span className={p >= 0 ? "text-emerald-700" : "text-rose-700"}>{p < 0 ? "-" : "+"}{Math.abs(pct).toFixed(2)}%</span></div>
                <div className="flex justify-between items-baseline mt-1"><span className="text-sm font-medium text-slate-900 inline-flex items-center gap-1.5">{x.name}{x.heldWith === "wealthy" ? <span className="text-xs px-1.5 py-0.5 rounded bg-slate-900 text-white font-normal">Wealthy</span> : x.heldWith === "manual" ? <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-normal">Manual</span> : <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-normal">External</span>}</span><span className={`text-sm ${p >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{p < 0 ? "-" : "+"}{n2(p)}</span></div>
                <div className="flex justify-between text-xs mt-1"><span className="text-slate-500">Invested <span className="text-slate-800">{n2(invested)}</span></span><span className="text-slate-500">LTP <span className="text-slate-800">{m.ltp.toFixed(2)}</span> <span className={d1 >= 0 ? "text-emerald-700" : "text-rose-700"}>({d1 >= 0 ? "+" : ""}{d1.toFixed(2)}%)</span></span></div>
              </div>
            ); })}
            {!shown.length && <div className="px-4 py-6 text-xs text-slate-400">No holdings{q ? " match" : " yet"}.</div>}
          </div>
          {(() => { const ext = items.filter((x) => x.heldWith === "external"); const last = ext.reduce((a, x) => (!a || x.fetchedAt > a ? x.fetchedAt : a), null); return ext.length ? (
            <div className="px-4 mt-3"><div className="relative rounded-2xl border border-violet-100 bg-white p-3 flex items-center gap-3"><span className="absolute -top-2 right-3 text-xs px-2 py-0.5 rounded-full bg-slate-900 text-white">external</span><div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center"><TrendingUp size={18} className="text-slate-600" /></div><div className="flex-1"><div className="text-sm font-medium text-slate-900">{ext.length} stock{ext.length > 1 ? "s" : ""}/ETFs</div><div className="text-xs text-slate-500">Last synced {fmtDate(last)}</div></div><button onClick={onRefresh} disabled={refreshing} className="text-xs text-violet-600 font-medium inline-flex items-center gap-1 disabled:text-slate-400"><RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Resync</button></div></div>
          ) : null; })()}
          <div className="px-4 mt-3 text-xs text-slate-400">Connected holdings refresh from your broker. Manually entered holdings stay separate; P&L uses the purchase price you provide.</div>
        </>
      )}
      <div className="sticky bottom-0 mt-auto pt-4 bg-white border-t border-slate-100 p-4 grid grid-cols-2 gap-2"><Btn full onClick={() => go("stk_brokers")}>Connect broker</Btn><Btn full kind="ghost" onClick={() => go("add_form", { category: "equity" })}>Add manually</Btn></div>
    </div>
  );
}


/* ============================================================================
   VEHICLE · registration-number lookup (Vahan/insurer), review, detail
   ========================================================================== */
const VEHICLE_DB = [
  { make: "TVS", model: "TVS Ronin", cls: "2-Wheeler", fuel: "PETROL(E20)", engine: "225cc", exShowroom: 174040, insurer: "ICICI Lombard" },
  { make: "Honda", model: "Honda City ZX", cls: "4-Wheeler", fuel: "PETROL", engine: "1498cc", exShowroom: 1450000, insurer: "HDFC ERGO" },
  { make: "Hyundai", model: "Hyundai Creta SX", cls: "4-Wheeler", fuel: "DIESEL", engine: "1493cc", exShowroom: 1690000, insurer: "Bajaj Allianz" },
  { make: "Royal Enfield", model: "Classic 350", cls: "2-Wheeler", fuel: "PETROL", engine: "349cc", exShowroom: 198000, insurer: "Tata AIG" },
  { make: "Tata", model: "Tata Nexon EV", cls: "4-Wheeler", fuel: "ELECTRIC", engine: "40.5 kWh", exShowroom: 1499000, insurer: "ICICI Lombard" },
];
function lookupVehicle(regNo, km) {
  const n = [...regNo].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const v = VEHICLE_DB[n % VEHICLE_DB.length];
  const yrsAgo = 1 + (n % 4); const reg = new Date(NOW); reg.setFullYear(reg.getFullYear() - yrsAgo); reg.setMonth(n % 12, 4);
  const regDate = reg.toISOString().slice(0, 10), exp = new Date(reg); exp.setFullYear(exp.getFullYear() + 15); exp.setDate(exp.getDate() - 1);
  const ins = new Date(NOW); ins.setDate(ins.getDate() + ((n % 3 === 0) ? -90 : 200 + (n % 200)));
  const puc = new Date(NOW); puc.setDate(puc.getDate() + 120);
  return { ...v, regNo, owner: "PRIYA MEHTA", regDate, regExpiry: exp.toISOString().slice(0, 10), km: km || Math.round(yrsAgo * 9000), policyNo: `3005/HT-${(n * 7919) % 9999999}/00/000`, insuranceValid: ins.toISOString().slice(0, 10), challans: n % 5 === 0 ? 1 : 0, challanList: n % 5 === 0 ? [{ no: `KA${(n * 31) % 900000 + 100000}`, offence: "Riding without helmet", amount: 1000, date: daysAgo(18).slice(0, 10), status: "Pending" }] : [], puc: (n % 2 === 0 ? (() => { const d = new Date(NOW); d.setDate(d.getDate() - 93); return d; })() : puc).toISOString().slice(0, 10), pucNo: `Newv${n % 9}`, policyType: n % 2 === 0 ? "Third Party" : "Comprehensive", rto: "PUNE RTO, Maharashtra", changeMonth: -Math.round(v.exShowroom * 0.0012) };
}
const vehicleValue = (m, purchaseValue, purchaseDate) => { const yrs = ageDays(purchaseDate) / 365.25; const kmPenalty = Math.max(0, (m.km || 0) - yrs * 10000) / 1000 * 0.004; const v = purchaseValue * Math.pow(1 - 0.15, yrs) * (1 - Math.min(kmPenalty, 0.15)); return Math.round(Math.max(v, purchaseValue * 0.1)); };
const KV = ({ k, v, ok }) => <div className="flex justify-between text-sm py-1.5"><span className="text-slate-500">{k}</span><span className="text-slate-900 text-right inline-flex items-center gap-1">{v}{ok && <CheckCircle2 size={14} className="text-emerald-600" />}</span></div>;
const Card = ({ icon: I, title, onEdit, children }) => <div className="rounded-2xl border border-violet-100 p-4"><div className="flex items-center gap-2 text-sm text-slate-500 border-b border-slate-100 pb-2 mb-1"><I size={15} /><span className="flex-1">{title}</span>{onEdit && <button onClick={onEdit} className="text-violet-600 font-medium text-sm">Edit</button>}</div>{children}</div>;
function VehicleAdd({ go, onSave }) {
  const [step, setStep] = useState(0); const [reg, setReg] = useState(""); const [km, setKm] = useState("");
  const [v, setV] = useState(null); const [cur, setCur] = useState(null); const [editVal, setEditVal] = useState(false);
  useEffect(() => { if (step === 1) { const t = setTimeout(() => { const f = lookupVehicle(reg, Number(km) || 0); setV(f); setCur(vehicleValue(f, f.exShowroom, f.regDate)); setStep(2); }, 1600); return () => clearTimeout(t); } }, [step]); // eslint-disable-line
  if (step === 0) return (
    <div className="flex flex-col min-h-full">
      <Header title="Add an asset" onBack={() => go("add_pick")} />
      <div className="px-4"><div className="flex items-center gap-3 rounded-2xl border border-violet-100 p-3"><div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center"><Car size={20} className="text-violet-600" /></div><div><div className="text-sm font-medium text-slate-900">Vehicle</div><div className="text-xs text-slate-500">1 step away from your new net worth</div></div></div>
        <div className="mt-5"><div className="flex justify-between text-xs text-slate-600 mb-1.5"><span>What is the registration number?</span><span className="text-slate-400">{reg.length}/10</span></div><input value={reg} onChange={(e) => setReg(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))} placeholder="E.g. KA00AA1234" className={inputCls} /></div>
        <div className="mt-4"><div className="text-xs text-slate-600 mb-1.5">How many kilometres has the vehicle driven? (optional)</div><div className="relative"><input value={km} onChange={(e) => setKm(e.target.value.replace(/\D/g, ""))} placeholder="E.g. 10,000" className={inputCls + " pr-12"} /><span className="absolute right-3 top-2.5 text-sm text-slate-500">kms</span></div><div className="text-xs text-slate-500 mt-1.5">This will help us to calculate your vehicle's current value</div></div>
        <div className="mt-4"><Note>We fetch registration, model, insurance, challan and PUC status from the Vahan and insurer records for this number. Nothing is stored until you confirm.</Note></div></div>
      <div className="mt-auto p-4"><Btn full disabled={reg.length < 9} onClick={() => setStep(1)}>Continue</Btn></div>
    </div>
  );
  if (step === 1) return <div className="flex flex-col min-h-full items-center justify-center px-8 text-center"><RefreshCw size={28} className="text-slate-400 animate-spin" /><div className="text-sm font-medium text-slate-900 mt-4">Fetching {reg}</div><div className="text-xs text-slate-500 mt-1">Registration · insurance · challans · PUC</div></div>;
  const insExpired = new Date(v.insuranceValid) < NOW;
  return (
    <div className="flex flex-col min-h-full">
      <div className="px-4 pt-6 text-center"><div className="w-14 h-14 mx-auto rounded-2xl bg-violet-50 flex items-center justify-center"><Car size={26} className="text-violet-600" /></div><div className="text-lg font-semibold text-slate-900 mt-3">Your vehicle has been fetched</div></div>
      <div className="px-4 mt-4 space-y-3">
        <Card icon={ShieldCheck} title="Registration Details"><KV k="Owner name" v={v.owner} ok /><KV k="Registration number" v={v.regNo} /><KV k="Registration date" v={fmtDate(v.regDate)} /><KV k="Registration expiry date" v={fmtDate(v.regExpiry)} /></Card>
        <Card icon={Car} title="Vehicle Details" onEdit={() => {}}><KV k="Model name" v={v.model} /><KV k="Manufacturer" v={v.make} /><KV k="Vehicle class" v={v.cls} /><KV k="Distance driven" v={`${v.km.toLocaleString("en-IN")} kms`} /></Card>
        <Card icon={ShieldCheck} title="Insurance Details" onEdit={() => {}}><KV k="Insurance partner" v={v.insurer} /><KV k="Policy number" v={v.policyNo} /><KV k="Insurance validity" v={<span className={insExpired ? "text-rose-700" : ""}>{fmtDate(v.insuranceValid)}{insExpired ? " · expired" : ""}</span>} /></Card>
        <Card icon={TrendingUp} title="Vehicle Value" onEdit={() => setEditVal(!editVal)}><KV k="Purchase Value" v={inr(v.exShowroom)} />{editVal ? <div className="py-1.5"><div className="text-xs text-slate-500 mb-1">Current value</div><input value={cur} onChange={(e) => setCur(Number(e.target.value.replace(/\D/g, "")))} className={inputCls} /><div className="text-xs text-slate-400 mt-1">Our estimate was {inr(vehicleValue(v, v.exShowroom, v.regDate))} — 15%/yr depreciation plus usage.</div></div> : <KV k="Current Value" v={inr(cur)} />}</Card>
      </div>
      <div className="sticky bottom-0 mt-auto bg-white border-t border-slate-100"><div className="px-4 py-3 text-xs text-slate-600 border-b border-slate-100">You can edit any inaccurate information about your vehicle or confirm the details to add it to your networth</div><div className="p-4"><Btn full onClick={() => onSave({ category: "vehicle", name: v.model, currentValue: cur, purchaseValue: v.exShowroom, purchaseDate: v.regDate, meta: { ...v, depreciation: 15, floorPct: 10, auto: cur === vehicleValue(v, v.exShowroom, v.regDate) } })}>Confirm & add vehicle</Btn></div></div>
    </div>
  );
}
function VehicleDetail({ go, d, onUpdate, onDelete, hide, onMeta }) {
  const c = d.categories.find((x) => x.category === "vehicle"); const items = c ? c.items : [];
  const [i, setI] = useState(0); const [editing, setEditing] = useState(false); const [val, setVal] = useState("");
  const [view, setView] = useState("main"); const [sheet, setSheet] = useState(null);
  const [od, setOd] = useState({ insurer: "", policyNo: "", expiry: "" });
  const it = items[i]; if (!it) return <div><Header title="Vehicle" onBack={() => go("home")} /><div className="px-4"><Note>No vehicle added yet.</Note><div className="mt-3"><Btn full onClick={() => go("add_form", { category: "vehicle" })}>Add vehicle</Btn></div></div></div>;
  const m = it.meta, M = (n) => (hide ? "₹••••" : inr(n)), ret = it.currentValue - it.purchaseValue, insExpired = new Date(m.insuranceValid) < NOW, pucExpired = new Date(m.puc) < NOW;
  const Status = ({ label, right, ok, tag, onClick }) => <button onClick={onClick} className="w-full flex items-center justify-between py-3 border-b border-slate-100 text-left"><div><div className="text-sm text-slate-800">{label}</div><span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded ${ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{tag}</span></div><div className="text-sm text-slate-900 inline-flex items-center gap-1">{right}<ChevronRight size={14} className="text-slate-400" /></div></button>;
  const Sec = ({ title }) => <div className="mt-6 flex items-center gap-3"><div className="text-sm font-medium text-slate-900">{title}</div><div className="flex-1 border-t border-slate-200" /></div>;
  const INSURERS = ["ICICI Lombard", "HDFC ERGO", "Bajaj Allianz", "Tata AIG", "New India Assurance", "Acko", "Digit", "Reliance General"];
  if (view === "od_form") return (
    <div className="min-h-full flex flex-col bg-slate-50">
      <div className="px-4 pt-4"><button onClick={() => setView("insurance")} className="p-1 -ml-1"><ArrowLeft size={22} /></button></div>
      <div className="mx-4 mt-3 rounded-2xl bg-white p-4"><div className="text-base font-semibold text-slate-900">Own Damage Policy Details</div><div className="text-xs text-slate-500">Covers damages caused to your vehicle</div>
        <div className="mt-4"><div className="text-xs text-slate-500 mb-1">Insurer</div><select value={od.insurer} onChange={(e) => setOd({ ...od, insurer: e.target.value })} className={inputCls}><option value="">Select Insurer</option>{INSURERS.map((x) => <option key={x}>{x}</option>)}</select></div>
        <div className="mt-4"><div className="text-xs text-slate-500 mb-1">Policy Number (Optional)</div><input value={od.policyNo} onChange={(e) => setOd({ ...od, policyNo: e.target.value })} placeholder="Enter Policy Number" className={inputCls} /></div>
        <div className="mt-4"><div className="text-xs text-slate-500 mb-1">Policy Expiry Date</div><input type="date" value={od.expiry} onChange={(e) => setOd({ ...od, expiry: e.target.value })} className={inputCls} /></div></div>
      <div className="sticky bottom-0 mt-auto bg-white border-t border-slate-100 p-4"><button disabled={!od.insurer || !od.expiry} onClick={() => { onMeta(it, { odPolicy: { ...od } }); setView("insurance"); }} className="w-full rounded-full bg-violet-600 disabled:bg-violet-200 text-white text-sm font-medium py-3.5">Confirm Details</button></div>
    </div>
  );
  if (view === "insurance") { const tp = m.policyType === "Third Party"; const odp = m.odPolicy; return (
    <div className="min-h-full flex flex-col">
      <div className="px-4 pt-4"><button onClick={() => setView("main")} className="p-1 -ml-1"><ArrowLeft size={22} /></button><div className="text-2xl font-semibold text-slate-900 mt-3">Insurance Details</div></div>
      <div className="px-4 mt-4 space-y-4">
        <div className="rounded-2xl bg-slate-50 p-4"><div className="text-sm text-slate-700">Your current policy: <b className="text-slate-900">{m.policyType}</b></div><div className="text-xs text-slate-500 mt-1">{tp ? "Covers damages to others and their property caused by your vehicle, excluding damages to your own vehicle." : "Covers third-party liability and damage to your own vehicle."}</div>{tp && !odp && <button onClick={() => setView("od_form")} className="text-xs text-violet-600 font-medium mt-2">Also have own Damage Insurance &gt;</button>}</div>
        <div><div className="text-lg font-semibold text-slate-900">{tp ? "Third Party Insurance" : "Comprehensive Insurance"}</div>
          <div className="mt-2 rounded-2xl bg-slate-50 p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700">{m.insurer.split(" ").map((w) => w[0]).join("").slice(0, 2)}</div><div><div className="text-sm font-medium text-slate-900">{m.insurer}</div><span className={`text-xs px-1.5 py-0.5 rounded ${insExpired ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{insExpired ? "Expired" : "Active"}</span></div></div><div className="grid grid-cols-2 gap-2 mt-3 text-xs"><div><div className="text-slate-500">Insurance Policy No</div><div className="text-slate-900 mt-0.5 break-all">{m.policyNo}</div></div><div className="text-right"><div className="text-slate-500">Valid Upto</div><div className="text-slate-900 mt-0.5">{fmtDate(m.insuranceValid)}</div></div></div></div></div>
        <button className="w-full rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm text-slate-700 flex items-center justify-between">Current Active policies as per Govt Record <ChevronRight size={16} className="text-slate-500" /></button>
        {odp ? <div><div className="text-lg font-semibold text-slate-900">Own Damage Insurance</div><div className="mt-2 rounded-2xl bg-slate-50 p-4"><div className="text-sm font-medium text-slate-900">{odp.insurer}</div><div className="grid grid-cols-2 gap-2 mt-2 text-xs"><div><div className="text-slate-500">Policy No</div><div className="text-slate-900">{odp.policyNo || "—"}</div></div><div className="text-right"><div className="text-slate-500">Valid Upto</div><div className="text-slate-900">{fmtDate(odp.expiry)}</div></div></div><div className="text-xs text-slate-400 mt-2">Entered by you</div></div></div>
        : tp && <div><div className="text-base font-semibold text-slate-900">Cover your own vehicle damages also</div><div className="mt-2 rounded-2xl bg-slate-50 p-4"><div className="flex gap-2">{["🚧", "⚙️", "🛡️", "🔧", "🌀", "🔑"].map((e, k) => <div key={k} className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center text-base">{e}</div>)}</div><div className="text-sm text-slate-500 mt-3">Get full protection for your own vehicle (own damage)</div><button onClick={() => setView("od_form")} className="w-full mt-3 pt-3 border-t border-slate-200 flex items-center gap-3 text-left"><div className="w-7 h-7 rounded-full border border-sky-500 text-violet-600 flex items-center justify-center"><Plus size={14} /></div><div className="flex-1"><div className="text-sm font-medium text-slate-900">Already have own damage insurance</div><div className="text-xs text-slate-500">Track your current policy with ease</div></div><ChevronRight size={16} className="text-slate-400" /></button></div></div>}
      </div>
      <div className="sticky bottom-0 mt-auto bg-white p-4"><button onClick={() => setView("main")} className="w-full rounded-full bg-violet-600 text-white text-sm font-medium py-3.5">Got it</button></div>
    </div>
  ); }
  return (
    <div className="min-h-full flex flex-col relative">
      <Header title="Vehicle" onBack={() => go("home")} />
      {sheet && (<Overlay open={true} onClose={() => setSheet(null)}>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl px-5 pb-5 pt-2" onClick={(e) => e.stopPropagation()}><div className="flex justify-center mb-3"><div className="w-10 h-1 rounded-full bg-slate-200" /></div>
            {sheet === "puc" && <>
              <div className="text-3xl">{pucExpired ? "📋" : "✅"}</div>
              <div className={`text-xl font-semibold mt-3 ${pucExpired ? "text-rose-600" : "text-slate-900"}`}>{pucExpired ? "Your Pollution is expired!" : "Your PUC is valid"}</div>
              <div className="text-sm text-slate-500 mt-1">{pucExpired ? "Renew it to drive freely on roads. Challan for expired pollution is ₹10,000" : "Keep the certificate in the vehicle. We'll remind you 15 days before it expires."}</div>
              <div className="mt-4 rounded-xl bg-slate-50 p-3 flex justify-between text-sm"><div><div className="text-xs text-slate-500">PUCC No.</div><div className="text-slate-900 font-medium">{m.pucNo || "—"}</div></div><div className="text-right"><div className="text-xs text-slate-500">PUCC Upto</div><div className="text-slate-900 font-medium">{fmtDate(m.puc)}</div></div></div>
              <button onClick={() => setSheet(null)} className="w-full mt-5 rounded-full bg-violet-600 text-white text-sm font-medium py-3.5">Got it</button>
            </>}
            {sheet === "challan" && <>
              <div className="text-3xl">{m.challans ? "🚨" : "✅"}</div>
              <div className={`text-xl font-semibold mt-3 ${m.challans ? "text-rose-600" : "text-slate-900"}`}>{m.challans ? `${m.challans} pending challan${m.challans > 1 ? "s" : ""}` : "No active challans"}</div>
              <div className="text-sm text-slate-500 mt-1">{m.challans ? "Unpaid challans can lead to RC blacklisting. Pay on Parivahan or your state portal." : `As per Parivahan records for ${m.regNo}, checked ${fmtTime(it.updatedAt)}.`}</div>
              {(m.challanList || []).map((ch) => <div key={ch.no} className="mt-4 rounded-xl bg-slate-50 p-3"><div className="flex justify-between text-sm"><div className="text-slate-900 font-medium">{ch.offence}</div><div className="text-rose-700 font-medium">{inr(ch.amount)}</div></div><div className="flex justify-between text-xs text-slate-500 mt-1"><span>Challan {ch.no} · {fmtDate(ch.date)}</span><span className="text-rose-600">{ch.status}</span></div></div>)}
              {m.challans ? <div className="mt-4 grid grid-cols-2 gap-3"><button onClick={() => setSheet(null)} className="rounded-full border border-slate-300 text-slate-800 text-sm font-medium py-3.5">Got it</button><button className="rounded-full bg-violet-600 text-white text-sm font-medium py-3.5">Pay on Parivahan</button></div> : <button onClick={() => setSheet(null)} className="w-full mt-5 rounded-full bg-violet-600 text-white text-sm font-medium py-3.5">Got it</button>}
            </>}
          </div>
        </Overlay>)}
      {items.length > 1 && <div className="px-4 flex gap-4 border-b border-slate-200">{items.map((x, k) => <button key={x.id} onClick={() => setI(k)} className={`pb-2 text-sm ${k === i ? "text-violet-600 border-b-2 border-violet-600" : "text-slate-600"}`}>{x.meta.regNo}</button>)}<button onClick={() => go("add_form", { category: "vehicle" })} className="ml-auto text-slate-400"><Plus size={16} /></button></div>}
      <div className="bg-slate-50 px-4 py-4"><div className="flex items-center gap-3"><div className="w-14 h-14 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700">{m.make.slice(0, 5)}</div><div className="flex-1 text-base font-semibold text-slate-900">{m.model}</div><button onClick={() => onDelete(it)} className="text-slate-400"><Trash2 size={16} /></button></div><div className="border-t border-slate-200 mt-3 pt-3 text-sm text-slate-500">{m.cls} • {m.regNo}</div></div>
      <div className="px-4">
        <div className="text-lg font-semibold text-slate-900 mt-5">Overview</div>
        <div className="grid grid-cols-2 gap-y-4 mt-3"><div><div className="text-xs text-slate-500">Current Value</div><div className="text-xl text-slate-900 mt-1">{M(it.currentValue)}</div></div><div className="text-right"><div className="text-xs text-slate-500">Total Returns</div><div className={`text-xl mt-1 ${ret < 0 ? "text-rose-700" : "text-emerald-700"}`}>₹ {ret < 0 ? "-" : ""}{hide ? "••••" : Math.abs(ret).toLocaleString("en-IN")}</div></div><div><div className="text-xs text-slate-500">Invested Value</div><div className="text-xl text-slate-900 mt-1">{M(it.purchaseValue)}</div></div><div className="text-right"><div className="text-xs text-slate-500">Change This Month</div><div className={`text-xl mt-1 ${(m.changeMonth || 0) < 0 ? "text-rose-700" : "text-emerald-700"}`}>₹ {(m.changeMonth || 0) < 0 ? "-" : ""}{hide ? "••" : Math.abs(m.changeMonth || 0).toLocaleString("en-IN")}</div></div></div>
        <div className="mt-5"><Status onClick={() => setView("insurance")} label="Insurance" right={fmtDate(m.insuranceValid)} ok={!insExpired} tag={insExpired ? "Expired" : "Active"} /><Status onClick={() => setSheet("challan")} label="Traffic Challan" right={`${m.challans} CHALLAN${m.challans === 1 ? "" : "S"}`} ok={!m.challans} tag={m.challans ? "ACTION NEEDED" : "NO ACTIVE CHALLAN"} /><Status onClick={() => setSheet("puc")} label="Pollution (PUC)" right={fmtDate(m.puc)} ok={!pucExpired} tag={pucExpired ? "Expired" : "Valid"} /></div>
        <Sec title="Registration details" /><KV k="Owner name" v={m.owner} ok /><KV k="Registered RTO" v={m.rto} /><KV k="Registration date" v={fmtDate(m.regDate)} /><KV k="Registration expiry" v={fmtDate(m.regExpiry)} /><KV k="Distance driven" v={`${(m.km || 0).toLocaleString("en-IN")} kms`} />
        <Sec title="Vehicle details" /><KV k="Fuel type" v={m.fuel} /><KV k="Engine capacity" v={m.engine} /><KV k="Ex-showroom value" v={inr(m.exShowroom)} />
        <Sec title="Insurance details" /><KV k="Insurance partner" v={m.insurer} /><KV k="Policy number" v={m.policyNo} /><KV k="Insurance validity" v={fmtDate(m.insuranceValid)} />
        <div className="mt-6"><div className="text-lg font-semibold text-slate-900">Documents</div><div className="text-sm text-slate-500 mt-0.5">Upload your vehicle documents for easy reference</div><button className="mt-3 w-full rounded-xl border border-violet-600 text-violet-600 text-sm font-medium py-3">Upload document</button><div className="text-xs text-slate-400 text-center mt-1.5">Supports multiple PDFs and images up to 10MB</div></div>
        <div className="mt-4 text-xs text-slate-400">Value: {m.auto ? "15%/yr depreciation on ex-showroom, adjusted for usage, recalculated monthly." : "entered by you."} Registration and insurance from Vahan / insurer records as of {fmtTime(it.updatedAt)}.</div>
      </div>
      <div className="sticky bottom-0 mt-auto bg-white border-t border-slate-100 p-4">{editing ? <div className="flex gap-2"><input value={val} onChange={(e) => setVal(e.target.value.replace(/\D/g, ""))} placeholder="₹ current value" className={inputCls} /><Btn disabled={!val} onClick={() => { onUpdate(it, Number(val)); setEditing(false); }}>Save</Btn></div> : <Btn full onClick={() => { setVal(String(it.currentValue)); setEditing(true); }}>Update current value</Btn>}</div>

    </div>
  );
}


/* ============================================================================
   GOLD / SILVER · two-step add (with receipt OCR), holdings page
   ========================================================================== */
const METAL_KINDS = ["Jewellery", "Coin", "Bar", "Digital", "Other"];
const METAL_ICON = { Jewellery: "📿", Coin: "🪙", Bar: "🧱", Digital: "📱", Other: "✨" };
function MetalAdd({ go, category, onSave }) {
  const isGold = category === "gold", rates = METAL_RATE[category], purities = Object.keys(rates);
  const [step, setStep] = useState(0); const [ocr, setOcr] = useState(null);
  const [f, setF] = useState({ name: "", kind: "", purity: "", grams: "", date: "", ppg: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const cur = f.grams && f.purity ? Math.round(Number(f.grams) * rates[f.purity]) : null;
  const inv = f.grams && f.ppg ? Math.round(Number(f.grams) * Number(f.ppg)) : null;
  const [up, setUp] = useState(null); // null | source | perm | gallery | files | drive | drive_auth
  const [src, setSrc] = useState(null); const [denied, setDenied] = useState(false);
  const runOcr = (fileName) => { setUp(null); setOcr("reading"); setTimeout(() => { setF({ name: isGold ? "Tanishq necklace" : "Silver bar", kind: isGold ? "Jewellery" : "Bar", purity: isGold ? "22K" : "999", grams: isGold ? "42.6" : "500", date: "2024-10-29", ppg: isGold ? "7150" : "92" }); setOcr("done"); setStep(1); }, 1400); };
  const pick = (source) => { setSrc(source); if (source === "drive") setUp("drive_auth"); else setUp("perm"); };
  const allow = () => { setDenied(false); setUp(src); };
  const GALLERY = ["🧾", "🖼️", "📷", "🧾", "🌅", "🧾", "📄", "🖼️", "🧾"];
  const FILES = [["Tanishq_invoice_Oct24.pdf", "Downloads · 412 KB"], ["Receipt_scan.jpg", "Camera · 2.1 MB"], ["ITR_FY25.pdf", "Downloads · 1.8 MB"], ["Gold_bill_2021.pdf", "WhatsApp · 220 KB"]];
  const DRIVE = [["Tanishq_invoice_Oct24.pdf", "My Drive / Bills"], ["Jewellery bills", "Folder"], ["Gold_bill_2021.pdf", "Shared with me"]];
  const Chip = ({ v, on, onClick }) => <button onClick={onClick} className={`rounded-full px-3 py-1.5 text-sm border ${on ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-700"}`}>{v}</button>;
  return (
    <div className="flex flex-col min-h-full relative">
      <Header title={`Add ${isGold ? "gold" : "silver"}`}
 onBack={() => (step ? setStep(0) : go("add_pick"))} sub={step === 0 ? "Step 1 of 2 · what is it" : "Step 2 of 2 · how much and when"} />
      {up && (<Overlay open={true} onClose={() => setUp(null)}>
          {up === "source" && <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl px-5 pb-5 pt-2" onClick={(e) => e.stopPropagation()}><div className="flex justify-center mb-3"><div className="w-10 h-1 rounded-full bg-slate-200" /></div><div className="text-base font-semibold text-slate-900">Upload receipt from</div><div className="text-xs text-slate-500 mb-3">PDF or image, up to 10 MB</div>
            <div className="divide-y divide-slate-100">{[["gallery", "Photo gallery", "Pick a photo of the bill", "🖼️"], ["files", "Files on this phone", "PDFs, downloads, WhatsApp", "📁"], ["drive", "Google Drive", "Connect once, pick from your Drive", "☁️"]].map(([k, l, s, e]) => <button key={k} onClick={() => pick(k)} className="w-full flex items-center gap-3 py-3.5 text-left"><div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg">{e}</div><div className="flex-1"><div className="text-sm text-slate-900">{l}</div><div className="text-xs text-slate-500">{s}</div></div><ChevronRight size={16} className="text-slate-400" /></button>)}</div></div>}
          {up === "perm" && <div className="absolute inset-x-8 top-1/3 bg-white rounded-2xl p-5 text-center shadow-xl" onClick={(e) => e.stopPropagation()}><div className="text-base font-semibold text-slate-900">Allow Wealthy to access your {src === "gallery" ? "photos" : "files"}?</div><div className="text-sm text-slate-500 mt-2">Only the receipt you choose is uploaded. Nothing else is read or stored.</div><div className="mt-5 grid grid-cols-2 gap-2"><button onClick={() => { setDenied(true); setUp(null); }} className="rounded-xl border border-slate-200 py-2.5 text-sm">Don't allow</button><button onClick={allow} className="rounded-xl bg-slate-900 text-white py-2.5 text-sm font-medium">Allow</button></div></div>}
          {up === "gallery" && <div className="absolute inset-0 bg-white flex flex-col" onClick={(e) => e.stopPropagation()}><div className="px-4 py-3 flex items-center border-b border-slate-100"><button onClick={() => setUp(null)}><X size={20} /></button><div className="flex-1 text-center text-sm font-medium">Recents</div><span className="text-xs text-slate-400">Photos</span></div><div className="grid grid-cols-3 gap-0.5 p-0.5">{GALLERY.map((e, i) => <button key={i} onClick={() => runOcr("IMG_" + (4210 + i))} className="aspect-square bg-slate-100 flex items-center justify-center text-3xl">{e}</button>)}</div><div className="text-xs text-slate-400 text-center mt-4">Tap a photo of the bill</div></div>}
          {up === "files" && <div className="absolute inset-0 bg-white flex flex-col" onClick={(e) => e.stopPropagation()}><div className="px-4 py-3 flex items-center border-b border-slate-100"><button onClick={() => setUp(null)}><ArrowLeft size={20} /></button><div className="flex-1 text-center text-sm font-medium">Files</div><span className="text-xs text-slate-400">Recent</span></div><div className="divide-y divide-slate-100">{FILES.map(([n, s]) => <button key={n} onClick={() => runOcr(n)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left"><div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><FileText size={18} className="text-slate-600" /></div><div className="flex-1 min-w-0"><div className="text-sm text-slate-900 truncate">{n}</div><div className="text-xs text-slate-500">{s}</div></div></button>)}</div></div>}
          {up === "drive_auth" && <div className="absolute inset-x-6 top-1/4 bg-white rounded-2xl p-5 shadow-xl" onClick={(e) => e.stopPropagation()}><div className="text-base font-semibold text-slate-900">Connect Google Drive</div><div className="text-sm text-slate-500 mt-2">Wealthy will be able to see files you pick. It can't see the rest of your Drive.</div><div className="mt-4 rounded-xl border border-violet-100 p-3 text-sm flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-purple-200" /><div><div className="text-slate-900">priya.mehta@gmail.com</div><div className="text-xs text-slate-500">Google account on this phone</div></div></div><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => setUp(null)} className="rounded-xl border border-slate-200 py-2.5 text-sm">Cancel</button><button onClick={() => setUp("drive")} className="rounded-xl bg-slate-900 text-white py-2.5 text-sm font-medium">Continue</button></div></div>}
          {up === "drive" && <div className="absolute inset-0 bg-white flex flex-col" onClick={(e) => e.stopPropagation()}><div className="px-4 py-3 flex items-center border-b border-slate-100"><button onClick={() => setUp(null)}><ArrowLeft size={20} /></button><div className="flex-1 text-center text-sm font-medium">Google Drive</div><span className="text-xs text-slate-400">☁️</span></div><input placeholder="Search in Drive" className={inputCls + " m-4 w-auto"} /><div className="divide-y divide-slate-100">{DRIVE.map(([n, s]) => <button key={n} onClick={() => (s === "Folder" ? null : runOcr(n))} className="w-full flex items-center gap-3 px-4 py-3.5 text-left"><div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">{s === "Folder" ? "📁" : <FileText size={18} className="text-slate-600" />}</div><div className="flex-1 min-w-0"><div className="text-sm text-slate-900 truncate">{n}</div><div className="text-xs text-slate-500">{s}</div></div></button>)}</div></div>}
        </Overlay>)}
      <div className="px-4">
        {step === 0 ? (
          <>
            <button onClick={() => setUp("source")} disabled={ocr === "reading"} className="w-full rounded-2xl border border-dashed border-slate-300 p-4 text-left flex items-center gap-3 mb-5"><div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><FileText size={18} className="text-slate-600" /></div><div className="flex-1"><div className="text-sm font-medium text-slate-900">{ocr === "reading" ? "Reading your receipt…" : "Upload the purchase receipt"}</div><div className="text-xs text-slate-500">From your phone or Google Drive. We read weight, purity, date and price; you check and save.</div>{denied && <div className="text-xs text-rose-700 mt-1">Photo access is off. Allow it in phone Settings, or use Files / Drive.</div>}</div>{ocr === "reading" ? <RefreshCw size={16} className="animate-spin text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}</button>
            <div className="text-xs text-slate-400 text-center mb-4">or enter the details yourself</div>
            <Field label="Asset name"><input value={f.name} onChange={set("name")} placeholder={isGold ? "E.g. Wedding necklace" : "E.g. Silver coins"} className={inputCls} maxLength={40} /></Field>
            <div className="mb-4"><div className="text-xs text-slate-600 mb-1.5">Category</div><div className="flex flex-wrap gap-2">{METAL_KINDS.map((k) => <Chip key={k} v={`${METAL_ICON[k]} ${k}`} on={f.kind === k} onClick={() => setF({ ...f, kind: k })} />)}</div></div>
            <div className="mb-4"><div className="text-xs text-slate-600 mb-1.5">{isGold ? "Carat" : "Purity"}</div><div className="flex gap-2">{purities.map((k) => <Chip key={k} v={k} on={f.purity === k} onClick={() => setF({ ...f, purity: k })} />)}</div>{f.purity && <div className="text-xs text-slate-400 mt-1.5">Today's rate ₹{rates[f.purity].toLocaleString("en-IN")}/g ({f.purity}, Mumbai, 4 Sep)</div>}</div>
          </>
        ) : (
          <>
            {ocr === "done" && <div className="mb-4"><Note tone="green">Extracted from your receipt — check each value before saving.</Note></div>}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 mb-4 text-sm flex items-center gap-2"><span className="text-lg">{METAL_ICON[f.kind]}</span><div><div className="text-slate-900">{f.name}</div><div className="text-xs text-slate-500">{f.kind} · {f.purity}</div></div></div>
            <Field label="Weight (grams)"><div className="relative"><input value={f.grams} onChange={set("grams")} type="number" placeholder="0" className={inputCls + " pr-10"} /><span className="absolute right-3 top-2.5 text-sm text-slate-500">g</span></div></Field>
            <Field label="Date of purchase"><input value={f.date} onChange={set("date")} type="date" className={inputCls} /></Field>
            <Field label="Purchase price per gram" hint="From your receipt. Making charges are not part of value."><div className="relative"><input value={f.ppg} onChange={set("ppg")} type="number" placeholder="0" className={inputCls + " pr-12"} /><span className="absolute right-3 top-2.5 text-sm text-slate-500">₹/g</span></div></Field>
            <div className="rounded-2xl border border-violet-100 p-3 text-sm space-y-2"><div className="flex justify-between"><span className="text-slate-500">Current value</span><span className="text-slate-900 font-medium">{cur ? inr(cur) : "—"}</span></div><div className="flex justify-between"><span className="text-slate-500">Invested amount</span><span className="text-slate-900">{inv ? inr(inv) : "—"}</span></div>{cur && inv && <div className="flex justify-between"><span className="text-slate-500">Unrealised returns</span><span className={cur - inv >= 0 ? "text-emerald-700" : "text-rose-700"}>{cur - inv >= 0 ? "+" : "−"}{inr(cur - inv)}</span></div>}<div className="text-xs text-slate-400">Current value = weight × today's {f.purity} rate. Updated daily.</div></div>
          </>
        )}
      </div>

      <div className="mt-auto p-4">{step === 0 ? <Btn full disabled={!f.name || !f.kind || !f.purity} onClick={() => setStep(1)}>Continue</Btn> : <Btn full disabled={!f.grams || !f.date || !f.ppg} onClick={() => onSave({ category, name: f.name, currentValue: cur, purchaseValue: inv, purchaseDate: f.date, meta: { grams: Number(f.grams), purity: f.purity, kind: f.kind, pricePerGram: Number(f.ppg), ratePerGram: rates[f.purity], rateAsOf: iso(NOW), city: "Mumbai", receipt: ocr === "done" } })}>Save asset</Btn>}</div>
    </div>
  );
}
function MetalDetail({ go, d, category, hide, setHide, onEdit, onDelete }) {
  const isGold = category === "gold", rates = METAL_RATE[category];
  const c = d.categories.find((x) => x.category === category); const items = c ? c.items : [];
  const M = (n) => (hide ? "₹••••" : inr(n));
  const cur = items.reduce((a, x) => a + x.currentValue, 0), inv = items.reduce((a, x) => a + (x.purchaseValue || 0), 0), grams = items.reduce((a, x) => a + x.meta.grams, 0);
  const byPurity = Object.keys(rates).map((k) => [k, items.filter((x) => x.meta.purity === k).reduce((a, x) => a + x.meta.grams, 0)]).filter(([, g]) => g > 0);
  const top = Object.keys(rates)[0];
  const Rw = ({ k, v, strong }) => <div className="flex justify-between py-3.5 border-b border-slate-100 text-sm"><span className="text-slate-500">{k}</span><span className={`text-slate-900 ${strong ? "font-medium" : ""}`}>{v}</span></div>;
  return (
    <div className="min-h-full flex flex-col relative">
      <Header title={isGold ? "Gold" : "Silver"} onBack={() => go("home")} />
      <div className="px-4">
        <div className="flex items-start justify-between"><div className="text-sm text-slate-500">Current Value</div><button onClick={() => setHide(!hide)} className="text-slate-400">{hide ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
        <div className="font-num text-3xl font-semibold text-slate-900 mt-1">{M(cur)}</div>
        <div className="text-xs text-slate-500 mt-1">{top} {isGold ? "gold" : "silver"} price/g: ₹{rates[top].toLocaleString("en-IN")} (04 Sep' 26, Mumbai)</div>
        <div className="mt-3">
          <Rw k="Invested Qty" v={`${grams.toLocaleString("en-IN")}g`} strong />
          {byPurity.map(([k, g]) => <div key={k} className="flex justify-between py-3.5 border-b border-slate-100 text-sm"><span className="text-slate-500 inline-flex items-center gap-2"><span className="w-2 h-3.5 rounded-sm bg-slate-500" />{k}</span><span className="text-slate-900">{g.toLocaleString("en-IN")}g</span></div>)}
          <Rw k="Invested Amount" v={M(inv)} strong />
          <div className="flex justify-between py-3.5 text-sm"><span className="text-slate-500">Unrealised Returns</span><span className={`font-medium ${cur - inv >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{cur - inv >= 0 ? "+" : "−"}{M(cur - inv)}</span></div>
        </div>
        <div className="mt-6 flex items-center gap-2"><span className="w-1 h-5 bg-emerald-600 rounded-r" /><div className="text-lg font-semibold text-slate-900">Assets</div></div>
        <div className="divide-y divide-slate-100">
          {items.map((x) => { const m = x.meta, ret = x.currentValue - (x.purchaseValue || 0); return (
            <div key={x.id} className="py-4">
              <div className="flex items-start gap-3"><div className="text-2xl">{METAL_ICON[m.kind] || "✨"}</div><div className="flex-1"><div className="text-base font-semibold text-slate-900">{x.name}</div><div className="text-sm text-slate-500 mt-0.5">{m.grams.toLocaleString("en-IN")}g <span className="text-slate-300 mx-1">|</span> <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs">{m.purity.toLowerCase()}</span>{m.receipt && <span className="ml-2 text-xs text-slate-400">receipt</span>}</div></div><div className="flex gap-2"><button onClick={() => onEdit(x)} className="text-slate-400"><Pencil size={14} /></button><button onClick={() => onDelete(x)} className="text-slate-400"><Trash2 size={14} /></button></div></div>
              <div className="grid grid-cols-3 gap-2 mt-3"><div><div className="text-xs text-slate-500">Current Value</div><div className="text-sm font-medium text-slate-900 mt-1">{M(x.currentValue)}</div></div><div><div className="text-xs text-slate-500">Invested Value</div><div className="text-sm font-medium text-slate-900 mt-1">{M(x.purchaseValue || 0)}</div></div><div><div className="text-xs text-slate-500">Returns</div><div className={`text-sm font-medium mt-1 ${ret >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{ret >= 0 ? "+" : "−"}{M(ret)}</div></div></div>
              <div className="text-xs text-slate-400 mt-2">Bought {fmtDate(x.purchaseDate)} at ₹{(m.pricePerGram || 0).toLocaleString("en-IN")}/g · today ₹{m.ratePerGram.toLocaleString("en-IN")}/g</div>
            </div>
          ); })}
          {!items.length && <div className="py-6 text-sm text-slate-400">Nothing added yet.</div>}
        </div>
        <div className="h-20" />
      </div>
      <div className="sticky bottom-4 mt-auto flex justify-center"><button onClick={() => go("add_form", { category })} className="inline-flex items-center gap-2 rounded-full bg-emerald-700 text-white text-base font-medium px-7 py-3.5 shadow-lg"><Plus size={20} className="rounded-full border-2 border-white" /> Add Asset</button></div>
    </div>
  );
}

function Detail({ go, s, d, cat, onEdit, onDelete }) {
  if (cat === "assets") return <div><Header title="What you own" onBack={() => go("home")} sub={`${short(d.assets)} across ${d.categories.length} types`} /><div className="px-4 space-y-3 pb-4">{d.categories.map((c) => <CategoryCard key={c.category} c={c} onEdit={onEdit} onDelete={onDelete} />)}</div></div>;
  if (cat === "liabilities") return (
    <div><Header title="What you owe" onBack={() => go("home")} sub={d.liabilities ? `−${short(d.liabilities)} across ${d.liabs.length}` : "Nothing yet"} />
      <div className="px-4 space-y-2 pb-4">
        {d.liabs.map((l) => <div key={l.id} className="rounded-xl border border-violet-100 p-3"><div className="flex items-center"><div className="flex-1 text-sm text-slate-900">{l.name}</div><div className="text-sm text-rose-700">−{short(l.outstanding)}</div></div><div className="text-xs text-slate-500 mt-1">{l.type} · {l.lender}{l.emi ? ` · EMI ${inr(l.emi)}/mo` : ""}{l.rate ? ` · ${l.rate}%` : ""}{l.originalAmount ? ` · ${Math.round((1 - l.outstanding / l.originalAmount) * 100)}% repaid` : ""}{l.endDate ? ` · ends ${fmtDate(l.endDate)}` : ""}</div><div className="mt-2 flex items-center gap-2"><SourceBadge source="MANUAL" /><Freshness at={l.updatedAt} stale={ageDays(l.updatedAt) > 30} /><button onClick={() => go("edit_liability", l)} className="ml-auto text-xs text-slate-700 inline-flex items-center gap-1"><Pencil size={12} /> Update</button></div></div>)}
        {!d.liabs.length && <Note>No loans added. Right now your net worth equals your assets — add loans and card dues so the number is honest.</Note>}
        <Note>Loans and credit cards aren't on Account Aggregator. Bureau-based fetch (CIBIL/Experian, monthly) is on the roadmap; until then we ask you for the outstanding from your latest statement.</Note>
        <Btn full kind="ghost" onClick={() => go("add_liability")}><Plus size={14} /> Add loan or card outstanding</Btn>
      </div></div>
  );
  const c = d.categories.find((x) => x.category === cat);
  if (!c) return <div><Header title={CATEGORIES[cat]?.label || "Not found"} onBack={() => go("home")} /><div className="px-4"><Note>Nothing here yet.</Note><div className="mt-3"><Btn full kind="ghost" onClick={() => go("add_pick")}>Add</Btn></div></div></div>;
  return <div><Header title={CATEGORIES[cat].label} onBack={() => go("home")} sub={`${c.pct.toFixed(1)}% of what you own`} /><div className="px-4 pb-4"><CategoryCard c={c} onEdit={onEdit} onDelete={onDelete} /><div className="mt-3"><Btn full kind="ghost" onClick={() => go("add_form", { category: cat })}><Plus size={14} /> {CATEGORIES[cat].fetch === "manual" ? "Add another" : "Add manually"}</Btn></div></div></div>;
}

/* ============================================================================
   ADD · category picker + forms per valuation type
   ========================================================================== */
function AddPick({ go, s }) {
  const badge = (c) => ({ aa: ["Fetched", "text-emerald-700"], aa_limited: ["Fetched · limited", "text-emerald-700"], link: ["Linked", "text-violet-600"], wealthy: ["Wealthy", "text-slate-900"], manual: ["You enter", "text-amber-700"] }[c.fetch]);
  const groups = GROUP_ORDER.map((g) => ({ g, cats: Object.entries(CATEGORIES).filter(([, c]) => c.group === g) })).filter((x) => x.cats.length);
  const target = (k, c) => { if (c.fetch === "aa" || c.fetch === "aa_limited") return s.aa.status === "connected" ? go("connections") : go("aa_select"); if (c.fetch === "link") return go("epf_link"); if (c.fetch === "wealthy") return go("detail", "smallcase"); return go("add_form", { category: k }); };
  const connectLabel = (c) => c.fetch === "link" ? "Link EPF" : c.fetch === "wealthy" ? "View portfolio" : s.aa.status === "connected" ? "Manage connection" : "Connect account";
  return (
    <div className="pb-4">
      <Header title="Add to your net worth" onBack={() => go("home")} sub="Connect supported accounts or add any asset manually." />
      {groups.map(({ g, cats }) => (
        <div key={g} className="px-4 mt-3"><div className="text-xs font-medium text-slate-700 mb-2">{g}</div>
          <div className="grid grid-cols-2 gap-2">{cats.map(([k, c]) => { const I = c.icon; const [b, cls] = badge(c); return (
            <div key={k} className="rounded-xl border border-violet-100 p-3">
              <I size={18} className="text-slate-700" /><div className="text-sm text-slate-900 mt-2">{c.label}</div><div className={`text-xs mt-0.5 ${cls}`}>{b}</div>
              <div className={`mt-3 grid gap-2 ${c.fetch === "manual" ? "grid-cols-1" : "grid-cols-2"}`}>
                {c.fetch !== "manual" && <button onClick={() => target(k, c)} className="rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-700">{connectLabel(c)}</button>}
                <button onClick={() => go("add_form", { category: k })} className="rounded-lg bg-violet-700 px-2 py-2 text-xs font-medium text-white">Add manually</button>
              </div>
            </div>
          ); })}</div>
        </div>
      ))}
      <div className="px-4 mt-4"><button onClick={() => go("add_liability")} className="w-full rounded-xl border border-rose-200 p-3 text-left hover:bg-rose-50"><Wallet size={18} className="text-rose-700" /><div className="text-sm text-slate-900 mt-2">A loan or card outstanding</div><div className="text-xs text-amber-700 mt-0.5">You enter · reduces net worth</div></button></div>
      <div className="px-4 mt-3 text-xs text-slate-400">"Fetched · limited" means the Account Aggregator supports it but few institutions share it yet. If yours doesn't, enter it manually.</div>
    </div>
  );
}
function AddForm({ go, category, existing, onSave }) {
  const c = CATEGORIES[category], v = c.valuation, m = existing?.meta || {};
  const [f, setF] = useState({ name: existing?.name || "", currentValue: existing?.currentValue || "", purchaseValue: existing?.purchaseValue || "", purchaseDate: existing?.purchaseDate || "", grams: m.grams || "", purity: m.purity || (category === "silver" ? "999" : "22K"), kind: m.kind || (category === "real_estate" ? "Apartment" : category === "insurance" ? "ULIP" : ""), address: m.address || "", cover: m.cover || "", premium: m.premium || "", premiumDue: m.premiumDue ? m.premiumDue.slice(0, 10) : "", depreciation: m.depreciation || 15, qty: m.qty || "", unitPrice: m.ltp || "", priceUsd: m.priceUsd || "", units: m.units ?? "", nav: m.nav ?? "", folio: m.folio || "", vested: m.vested || "", unvested: m.unvested || "", fmv: m.fmv || "", nextVest: m.nextVest ? m.nextVest.slice(0, 10) : "", rate: m.rate ?? (category === "ppf" ? 7.1 : ""), balanceAsOf: m.balanceAsOf || "", maturity: m.maturity || "", faceValue: m.faceValue || "", coupon: m.coupon || "", manager: m.manager || "", statementDate: m.statementDate || "", bankName: m.bank || "", accountType: m.accountType || "Savings", principal: m.principal || "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const rates = METAL_RATE[category];
  const computed = (() => {
    if (v === "weight_rate") return f.grams ? Math.round(Number(f.grams) * rates[f.purity]) : null;
    if (v === "depreciation") return f.purchaseValue && f.purchaseDate ? Math.round(Math.max(Number(f.purchaseValue) * Math.pow(1 - f.depreciation / 100, ageDays(f.purchaseDate) / 365.25), Number(f.purchaseValue) * 0.1)) : null;
    if (v === "qty_price_fx") return f.qty && f.priceUsd ? Math.round(Number(f.qty) * Number(f.priceUsd) * USDINR) : null;
    if (v === "vested_fmv") return f.vested && f.fmv ? Math.round(Number(f.vested) * Number(f.fmv)) : null;
    return null;
  })();
  const value = computed ?? Number(f.currentValue);
  const canSave = f.name && (value > 0 || (category === "insurance" && f.kind === "Term" && f.cover));
  const amountCategories = ["bank", "deposit", "mf", "equity", "etf", "nps", "epf", "smallcase"];
  const amountLabels = { bank: "Current balance", deposit: "Current value", mf: "Current fund value", equity: "Current market value", etf: "Current market value", nps: "Current balance", epf: "Current balance", smallcase: "Current portfolio value" };
  const build = () => {
    const meta = {};
    if (v === "weight_rate") Object.assign(meta, { grams: Number(f.grams), purity: f.purity, ratePerGram: rates[f.purity], rateAsOf: iso(NOW), city: "Mumbai" });
    if (v === "depreciation") Object.assign(meta, { depreciation: Number(f.depreciation), floorPct: 10, auto: true });
    if (v === "qty_price_fx") Object.assign(meta, { qty: Number(f.qty), priceUsd: Number(f.priceUsd), fx: USDINR, auto: true });
    if (v === "vested_fmv") Object.assign(meta, { vested: Number(f.vested), unvested: Number(f.unvested || 0), fmv: Number(f.fmv), nextVest: f.nextVest ? iso(f.nextVest) : null, fmvAsOf: iso(NOW) });
    if (category === "ppf") Object.assign(meta, { rate: Number(f.rate), balanceAsOf: f.balanceAsOf || iso(NOW).slice(0, 10), maturity: f.maturity || null });
    if (category === "bonds") Object.assign(meta, { faceValue: Number(f.faceValue), coupon: Number(f.coupon), maturity: f.maturity || null });
    if (category === "aif_pms") Object.assign(meta, { manager: f.manager, statementDate: f.statementDate || iso(NOW).slice(0, 10) });
    if (category === "real_estate") Object.assign(meta, { kind: f.kind, address: f.address });
    if (category === "insurance") Object.assign(meta, { kind: f.kind, cover: Number(f.cover || 0), premium: Number(f.premium || 0), premiumDue: f.premiumDue ? iso(f.premiumDue) : null });
    if (category === "other") Object.assign(meta, { kind: f.kind || "Other" });
    if (category === "bank") Object.assign(meta, { bank: f.bankName || f.name, accountType: f.accountType, balance: value, balanceAsOf: f.balanceAsOf || iso(NOW).slice(0, 10), changes: { Today: 0, "This week": 0, "This month": 0 } });
    if (category === "deposit") Object.assign(meta, { principal: Number(f.principal || f.purchaseValue || value), rate: Number(f.rate || 0), maturity: f.maturity || null });
    if (category === "mf") { const units = Number(f.units) || 0, invested = Number(f.purchaseValue) || value; Object.assign(meta, { units, nav: Number(f.nav) || (units ? value / units : value), navDate: iso(NOW), folio: f.folio || "Manual", plan: "Manual", sip: false, invested, avgNav: units ? invested / units : Number(f.nav) || value, since: f.purchaseDate ? iso(f.purchaseDate) : iso(NOW), d1: 0, category: "Other", risk: "Not rated", ret3y: null, cat3y: null, vol: 0, ter: 0, sectors: {} }); }
    if (["equity", "etf"].includes(category)) { const qty = Number(f.qty) || 1, ltp = Number(f.unitPrice) || value / qty; Object.assign(meta, { qty, ltp, avgPrice: f.purchaseValue ? Number(f.purchaseValue) / qty : ltp, broker: "Manual", sector: "Other", d1: 0 }); }
    if (["nps", "epf"].includes(category)) Object.assign(meta, { balanceAsOf: f.balanceAsOf || iso(NOW).slice(0, 10) });
    return { ...existing, category, name: f.name, currentValue: category === "insurance" && f.kind === "Term" ? 0 : value, purchaseValue: f.purchaseValue ? Number(f.purchaseValue) : null, purchaseDate: f.purchaseDate || null, heldWith: ["mf", "equity", "etf"].includes(category) ? "manual" : existing?.heldWith, meta };
  };
  const hint = { bank: "e.g. HDFC savings account", deposit: "e.g. HDFC fixed deposit", mf: "e.g. Parag Parikh Flexi Cap", equity: "e.g. HDFC Bank shares", etf: "e.g. Nifty 50 ETF", nps: "e.g. NPS Tier I", epf: "e.g. EPF account", smallcase: "e.g. Wealthy Multi-Asset", real_estate: "e.g. 2BHK, Baner, Pune", gold: "e.g. Family gold", silver: "e.g. Silver coins", insurance: "e.g. HDFC Life ULIP", vehicle: "e.g. Honda City 2022", us_stocks: "e.g. Apple (AAPL)", esops: "e.g. Zylo Labs ESOPs", ppf: "e.g. PPF – SBI", bonds: "e.g. 7.26% GS 2033", aif_pms: "e.g. ASK PMS", other: "e.g. Startup shares, art, money lent" }[category];
  return (
    <div className="flex flex-col min-h-full">
      <Header title={`${existing ? "Update" : "Add"} ${c.label.toLowerCase()}`} onBack={() => go(existing ? "detail" : "add_pick", existing ? category : null)} />
      <div className="px-4">
        {category === "aif_pms" && <div className="mb-4"><Note>AIF is an Account Aggregator FI type, but almost no fund houses share it yet. Enter the value from your latest statement; we'll switch to auto-fetch when your manager goes live.</Note></div>}
        {category === "bonds" && <div className="mb-4"><Note>Bonds held in demat come through your depository. Use this for bonds held outside demat (e.g. RBI Floating Rate Bonds, SGBs in physical form).</Note></div>}
        {category === "real_estate" && <Field label="Type"><select value={f.kind} onChange={set("kind")} className={inputCls}>{["Apartment", "House", "Land", "Commercial"].map((x) => <option key={x}>{x}</option>)}</select></Field>}
        {category === "insurance" && <Field label="Type of policy" hint="Only policies with a cash value (ULIP, endowment, money-back) count toward net worth. Term plans are tracked as cover."><select value={f.kind} onChange={set("kind")} className={inputCls}>{["ULIP", "Endowment", "Money-back", "Term", "Health"].map((x) => <option key={x}>{x}</option>)}</select></Field>}
        <Field label="What should we call it?"><input value={f.name} onChange={set("name")} placeholder={hint} className={inputCls} maxLength={40} /></Field>
        {category === "bank" && <><Field label="Bank"><input value={f.bankName} onChange={set("bankName")} className={inputCls} placeholder="Bank name" /></Field><Field label="Account type"><select value={f.accountType} onChange={set("accountType")} className={inputCls}>{["Savings", "Current", "Salary", "Other"].map((x) => <option key={x}>{x}</option>)}</select></Field></>}
        {category === "real_estate" && <Field label="Where is it? (optional)"><input value={f.address} onChange={set("address")} placeholder="Area, city" className={inputCls} /></Field>}
        {amountCategories.includes(category) && <Field label={amountLabels[category]}><input value={f.currentValue} onChange={set("currentValue")} type="number" min="0" className={inputCls} placeholder="₹ 0" /></Field>}
        {category === "mf" && <><div className="grid grid-cols-2 gap-3"><Field label="Units (optional)"><input value={f.units} onChange={set("units")} type="number" min="0" className={inputCls} /></Field><Field label="NAV (optional)"><input value={f.nav} onChange={set("nav")} type="number" min="0" className={inputCls} /></Field></div><Field label="Folio (optional)"><input value={f.folio} onChange={set("folio")} className={inputCls} /></Field></>}
        {["equity", "etf"].includes(category) && <div className="grid grid-cols-2 gap-3"><Field label="Quantity (optional)"><input value={f.qty} onChange={set("qty")} type="number" min="0" className={inputCls} /></Field><Field label="Price per unit (optional)"><input value={f.unitPrice} onChange={set("unitPrice")} type="number" min="0" className={inputCls} /></Field></div>}
        {category === "deposit" && <div className="grid grid-cols-2 gap-3"><Field label="Principal (optional)"><input value={f.principal} onChange={set("principal")} type="number" min="0" className={inputCls} /></Field><Field label="Rate (%)"><input value={f.rate} onChange={set("rate")} type="number" min="0" className={inputCls} /></Field></div>}

        {v === "weight_rate" && <><div className="grid grid-cols-2 gap-3"><Field label="Weight (grams)"><input value={f.grams} onChange={set("grams")} type="number" className={inputCls} placeholder="0" /></Field><Field label="Purity"><select value={f.purity} onChange={set("purity")} className={inputCls}>{Object.keys(rates).map((p) => <option key={p}>{p}</option>)}</select></Field></div><div className="mb-4"><Note>Today's rate ₹{rates[f.purity].toLocaleString("en-IN")}/g ({f.purity}, Mumbai, 4 Sep). {computed ? <>Current value <b className="text-slate-900">{inr(computed)}</b>. Updated daily.</> : "Enter weight to see value."}</Note></div></>}
        {v === "depreciation" && <><div className="grid grid-cols-2 gap-3"><Field label="Bought for"><input value={f.purchaseValue} onChange={set("purchaseValue")} type="number" className={inputCls} placeholder="₹ 0" /></Field><Field label="When"><input value={f.purchaseDate} onChange={set("purchaseDate")} type="date" className={inputCls} /></Field></div><Field label="Depreciation per year (%)"><input value={f.depreciation} onChange={set("depreciation")} type="number" className={inputCls} /></Field><div className="mb-4"><Note>{computed ? <>Estimated value today <b className="text-slate-900">{inr(computed)}</b>, floored at 10% of purchase price. Recalculated monthly.</> : "Enter purchase price and date to estimate."}</Note></div></>}
        {v === "qty_price_fx" && <><div className="grid grid-cols-2 gap-3"><Field label="Shares / units"><input value={f.qty} onChange={set("qty")} type="number" className={inputCls} /></Field><Field label="Price (USD)"><input value={f.priceUsd} onChange={set("priceUsd")} type="number" className={inputCls} /></Field></div><div className="mb-4"><Note>Converted at ₹{USDINR}/$ (RBI reference, 4 Sep). {computed ? <>Value <b className="text-slate-900">{inr(computed)}</b>. Price and FX refresh daily once you save.</> : ""}</Note></div></>}
        {v === "vested_fmv" && <><div className="grid grid-cols-2 gap-3"><Field label="Vested units"><input value={f.vested} onChange={set("vested")} type="number" className={inputCls} /></Field><Field label="Unvested units"><input value={f.unvested} onChange={set("unvested")} type="number" className={inputCls} /></Field></div><div className="grid grid-cols-2 gap-3"><Field label="FMV per unit (₹)" hint="From your last 409A / valuation"><input value={f.fmv} onChange={set("fmv")} type="number" className={inputCls} /></Field><Field label="Next vesting date"><input value={f.nextVest} onChange={set("nextVest")} type="date" className={inputCls} /></Field></div><div className="mb-4"><Note>Only vested units count: {computed ? <b className="text-slate-900">{inr(computed)}</b> : "—"}. Unvested is shown separately and never added to net worth.</Note></div></>}
        {category === "ppf" && <><Field label="Balance"><input value={f.currentValue} onChange={set("currentValue")} type="number" className={inputCls} placeholder="₹ 0" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Balance as of"><input value={f.balanceAsOf} onChange={set("balanceAsOf")} type="date" className={inputCls} /></Field><Field label="Rate (%)"><input value={f.rate} onChange={set("rate")} type="number" className={inputCls} /></Field></div><Field label="Maturity (optional)"><input value={f.maturity} onChange={set("maturity")} type="date" className={inputCls} /></Field><div className="mb-4"><Note>We accrue interest daily at the rate you enter so the number doesn't go stale between passbook updates.</Note></div></>}
        {category === "bonds" && <><div className="grid grid-cols-2 gap-3"><Field label="Face value"><input value={f.faceValue} onChange={set("faceValue")} type="number" className={inputCls} /></Field><Field label="Coupon (%)"><input value={f.coupon} onChange={set("coupon")} type="number" className={inputCls} /></Field></div><Field label="Maturity"><input value={f.maturity} onChange={set("maturity")} type="date" className={inputCls} /></Field><Field label="Current value"><input value={f.currentValue} onChange={set("currentValue")} type="number" className={inputCls} placeholder="₹ 0" /></Field></>}
        {category === "aif_pms" && <><Field label="Fund / manager"><input value={f.manager} onChange={set("manager")} className={inputCls} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Value per statement"><input value={f.currentValue} onChange={set("currentValue")} type="number" className={inputCls} placeholder="₹ 0" /></Field><Field label="Statement date"><input value={f.statementDate} onChange={set("statementDate")} type="date" className={inputCls} /></Field></div></>}
        {category === "insurance" && <>{f.kind !== "Term" && f.kind !== "Health" && <Field label="Current fund / surrender value"><input value={f.currentValue} onChange={set("currentValue")} type="number" className={inputCls} placeholder="₹ 0" /></Field>}<div className="grid grid-cols-2 gap-3"><Field label="Sum assured / cover"><input value={f.cover} onChange={set("cover")} type="number" className={inputCls} placeholder="₹ 0" /></Field><Field label="Annual premium"><input value={f.premium} onChange={set("premium")} type="number" className={inputCls} placeholder="₹ 0" /></Field></div><Field label="Next premium due"><input value={f.premiumDue} onChange={set("premiumDue")} type="date" className={inputCls} /></Field></>}
        {["real_estate", "other"].includes(category) && <Field label="What is it worth today?" hint="Your best estimate. Update anytime; we'll remind you after 30 days."><input value={f.currentValue} onChange={set("currentValue")} type="number" className={inputCls} placeholder="₹ 0" /></Field>}
        {category === "other" && <Field label="Kind (optional)"><input value={f.kind} onChange={set("kind")} placeholder="Startup equity, art, receivable…" className={inputCls} /></Field>}

        {!["vehicle", "insurance", "ppf", "esops"].includes(category) && <><div className="text-xs font-medium text-slate-700 mt-1 mb-2">Purchase details <span className="text-slate-400 font-normal">(optional — shows change vs what you paid, not a return)</span></div><div className="grid grid-cols-2 gap-3"><Field label="Bought for"><input value={f.purchaseValue} onChange={set("purchaseValue")} type="number" className={inputCls} placeholder="₹ 0" /></Field><Field label="When"><input value={f.purchaseDate} onChange={set("purchaseDate")} type="date" className={inputCls} /></Field></div></>}
      </div>
      <div className="mt-auto p-4"><Btn full disabled={!canSave} onClick={() => onSave(build())}>{existing ? "Save and recalculate" : "Add to net worth"}</Btn></div>
    </div>
  );
}
function LiabilityForm({ go, existing, onSave, onDelete }) {
  const [f, setF] = useState({ type: existing?.type || "Home loan", name: existing?.name || "", lender: existing?.lender || "", outstanding: existing?.outstanding || "", originalAmount: existing?.originalAmount || "", emi: existing?.emi || "", rate: existing?.rate || "", endDate: existing?.endDate || "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const isCard = f.type === "Credit card outstanding";
  return (
    <div className="flex flex-col min-h-full">
      <Header title={existing ? "Update loan" : "Add a loan"} onBack={() => go("home")} />
      <div className="px-4">
        <div className="mb-4"><Note>Loans and cards aren't on Account Aggregator yet, so we can't fetch this. Enter the outstanding from your latest statement. We'll remind you monthly.</Note></div>
        <Field label="Type"><select value={f.type} onChange={set("type")} className={inputCls}>{LIABILITY_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Name"><input value={f.name} onChange={set("name")} placeholder={isCard ? "e.g. HDFC Regalia ••4008" : "e.g. HDFC home loan"} className={inputCls} /></Field>
        <Field label="Lender / bank"><input value={f.lender} onChange={set("lender")} className={inputCls} /></Field>
        <Field label={isCard ? "Unpaid amount" : "Outstanding today"}><input value={f.outstanding} onChange={set("outstanding")} type="number" className={inputCls} placeholder="₹ 0" /></Field>
        {!isCard && <><div className="grid grid-cols-2 gap-3"><Field label="Original amount"><input value={f.originalAmount} onChange={set("originalAmount")} type="number" className={inputCls} /></Field><Field label="Monthly EMI"><input value={f.emi} onChange={set("emi")} type="number" className={inputCls} /></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Interest rate (%)"><input value={f.rate} onChange={set("rate")} type="number" className={inputCls} /></Field><Field label="Ends"><input value={f.endDate} onChange={set("endDate")} type="date" className={inputCls} /></Field></div></>}
        {existing && <button onClick={() => onDelete(existing)} className="text-xs text-rose-700 inline-flex items-center gap-1"><Trash2 size={12} /> Remove — it's closed or paid off</button>}
      </div>
      <div className="mt-auto p-4"><Btn full disabled={!f.name || !f.outstanding} onClick={() => onSave({ ...existing, ...f, outstanding: Number(f.outstanding), originalAmount: f.originalAmount ? Number(f.originalAmount) : null, emi: f.emi ? Number(f.emi) : null, rate: f.rate ? Number(f.rate) : null, endDate: f.endDate || null })}>{existing ? "Save and recalculate" : "Add to net worth"}</Btn></div>
    </div>
  );
}

/* ============================================================================
   EVENTS · INSIGHTS · FAMILY · FORECAST · CONNECTIONS · PROVENANCE · EXPORT · SETTINGS
   ========================================================================== */
function Events({ go, s, onAddEvent }) {
  const [filter, setFilter] = useState("all");
  const [adding, setAdding] = useState(false); const [ev, setEv] = useState({ title: "", amount: "", when: "" });
  const up = s.events.filter((e) => e.upcoming).sort((a, b) => a.when.localeCompare(b.when)), past = s.events.filter((e) => !e.upcoming).sort((a, b) => b.at.localeCompare(a.at));
  const src = (e) => ({ AA: "Connected", LINK: "Linked", WEALTHY: "Wealthy", MANUAL: "You" }[e.source] || "Wealthy");
  const show = (e) => filter === "all" || (filter === "money" && ["debit", "upcoming", "credit"].includes(e.type)) || (filter === "data" && ["sync", "nav", "price", "manual", "system"].includes(e.type));
  const R = ({ e }) => <div className="flex gap-3 py-3 border-b border-slate-100 last:border-0"><div className="text-xs text-slate-400 w-16 shrink-0 pt-0.5">{e.upcoming ? fmtDate(e.when) : fmtTime(e.at)}</div><div className="flex-1"><div className="text-sm text-slate-900">{e.title}</div><div className="text-xs text-slate-500">{e.detail}</div></div><div className="text-xs text-slate-400 self-start">{src(e)}</div></div>;
  return (
    <div className="pb-4">
      <Header title="Money events" onBack={() => go("home")} sub="Everything that moves your net worth, and what's coming: SIPs, EMIs, premiums, maturities, vesting." right={<button onClick={() => setAdding(!adding)} className="p-1 rounded-lg hover:bg-slate-100"><Plus size={18} /></button>} />
      <div className="px-4 flex gap-2 mb-2">{[["all", "All"], ["money", "Money in / out"], ["data", "Value updates"]].map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={`text-xs px-3 py-1 rounded-full ${filter === k ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>{l}</button>)}</div>
      {adding && <div className="px-4 mb-3"><div className="rounded-xl border border-violet-100 p-3"><div className="text-xs font-medium text-slate-700 mb-2">Add a reminder</div><input value={ev.title} onChange={(e) => setEv({ ...ev, title: e.target.value })} placeholder="e.g. Society maintenance" className={inputCls + " mb-2"} /><div className="grid grid-cols-2 gap-2"><input value={ev.amount} onChange={(e) => setEv({ ...ev, amount: e.target.value })} type="number" placeholder="₹" className={inputCls} /><input value={ev.when} onChange={(e) => setEv({ ...ev, when: e.target.value })} type="date" className={inputCls} /></div><div className="mt-2"><Btn small disabled={!ev.title || !ev.when} onClick={() => { onAddEvent({ type: "upcoming", title: ev.title, detail: ev.amount ? inr(ev.amount) : "Reminder", source: "MANUAL", upcoming: true, when: iso(ev.when) }); setAdding(false); setEv({ title: "", amount: "", when: "" }); }}>Save reminder</Btn></div></div></div>}
      {up.filter(show).length > 0 && <div className="px-4"><div className="text-xs font-semibold text-slate-700 mt-2">Coming up</div>{up.filter(show).map((e) => <R key={e.id} e={e} />)}</div>}
      <div className="px-4"><div className="text-xs font-semibold text-slate-700 mt-4">Happened</div>{past.filter(show).map((e) => <R key={e.id} e={e} />)}{!past.filter(show).length && <div className="text-xs text-slate-400 py-3">Nothing yet.</div>}</div>
    </div>
  );
}
function Insights({ go, s, d, showBiz, focus, onDismiss }) {
  const partner = s.user.rm, first = partner.split(" ")[0];
  const judg = d.signals.filter((x) => x.kind !== "setup"), setup = d.signals.filter((x) => x.kind === "setup");
  const h = d.health, G = d.goal;
  const [sheet, setSheet] = useState(null);
  const cat = (k) => d.categories.find((c) => c.category === k);
  const mf = cat("mf"), eq = cat("equity"), re = cat("real_estate");
  const has = (code) => judg.some((x) => x.code === code);
  const pal = ["#5b2eea", "#8b6cf5", "#b9a6fa", "#2db58a", "#7ed3b8", "#f2b544", "#f7d58c", "#60a5fa", "#cbd5e1"];
  const checks = [
    G ? ["Retirement", G.onTrack, G.onTrack ? `On track for ${G.retireAge}` : `${short(G.requiredMonthly)}/mo needed`] : null,
    h.outflow ? ["Emergency fund", !has("EMERGENCY_FUND"), h.emergencyMonths != null ? `${h.emergencyMonths.toFixed(1)} months of outflow` : ""] : null,
    h.outflow ? ["Idle cash", !has("IDLE_CASH"), "Bank balance vs 6-month need"] : null,
    ["Concentration", !has("CONCENTRATION") && !has("STOCK_CONCENTRATION"), "No asset or stock too large"],
    h.sectors.length ? ["Sector overlap", !has("SECTOR_CONCENTRATION"), "No sector above 35% of equity"] : null,
    mf ? ["Fund performance", !has("FUND_UNDERPERFORM"), "All funds within 2% of category"] : null,
    mf ? ["Fund cost", !has("REGULAR_PLAN"), "No regular plans"] : null,
    h.income ? ["Life cover", !has("COVER_GAP"), "≥ 10× income and loans"] : null,
    d.liabs.length ? ["Debt load", !has("LEVERAGE"), "Loans under 25% of assets"] : null,
    ["Data freshness", !has("STALE_MANUAL"), "Entered values under 30 days"],
  ].filter(Boolean);
  const passed = checks.filter((c) => c[1]);
  // Retirement as an action when off track
  const actions = [...judg];
  if (G && !G.onTrack) actions.unshift({ code: "RETIREMENT", severity: "high", amount: G.requiredMonthly - G.monthlyInvest, user: `Retirement at ${G.retireAge} needs ${short(G.requiredMonthly)}/mo; you invest ${short(G.monthlyInvest)}`, reason: `Target ${short(G.target)} (inflation-adjusted). On today's SIPs you reach ${short(G.projected)}.`, consequence: `The gap is ${short(G.gap)}. Every year you wait, the monthly amount needed goes up.`, suggest: `Add ${short(G.requiredMonthly - G.monthlyInvest)}/mo — start with the idle cash and any regular-plan savings above, then step up SIPs 10% a year.`, actions: [["Step up SIPs", "detail:mf"], ["See the plan", "goal"]] });
  const run = (target) => { if (target === "events") go("events"); else if (target === "goal") go("goal"); else if (target.startsWith("detail:")) go("detail", target.split(":")[1]); };
  const Action = ({ sg, i }) => { const top = i === 0; const sub = top ? { color: "#e4dbff" } : undefined; return (
    <div className={`rounded-2xl p-4 ${top ? "bg-violet-600 text-white" : "bg-white border border-violet-100"}`}>
      <div className="flex items-start gap-3"><div className={`font-num text-lg font-semibold ${top ? "text-white" : "text-violet-600"}`}>{i + 1}</div><div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${top ? "text-white" : "text-slate-900"}`}>{sg.user}</div>
        {sg.items && <div className={`text-xs mt-1.5 space-y-0.5 ${top ? "" : "text-slate-600"}`} style={sub}>{sg.items.map((t) => <div key={t}>· {t}</div>)}</div>}
        {sg.consequence && <div className={`text-xs mt-2 ${top ? "" : "text-slate-700"}`} style={sub}><span className={top ? "font-medium text-white" : "font-medium text-slate-900"}>Why it matters · </span>{sg.consequence}</div>}
        <div className={`text-xs mt-1.5 ${top ? "" : "text-slate-700"}`} style={sub}><span className={top ? "font-medium text-white" : "font-medium text-slate-900"}>Do this · </span>{sg.suggest}</div>
        <div className="mt-3 flex flex-wrap gap-2">{(sg.actions || [[sg.cta, "events"]]).map(([l, t]) => <button key={l} onClick={() => run(t)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${top ? "bg-white text-violet-700" : "bg-violet-600 text-white"}`}>{l}</button>)}<button onClick={() => (sg.code === "RETIREMENT" ? go("goal") : onDismiss(sg.code))} className={`rounded-full px-3 py-1.5 text-xs ${top ? "text-white" : "text-slate-500"}`} style={top ? { background: "rgba(255,255,255,0.15)" } : { background: "#f4f1ff" }}>{sg.code === "RETIREMENT" ? "Edit goal" : "Skip"}</button></div>
      </div></div>
    </div>
  ); };
  const Stat = ({ k, v, cls }) => <div><div className="text-xs text-slate-400">{k}</div><div className={`font-num text-sm font-semibold ${cls || "text-slate-900"}`}>{v}</div></div>;
  const mfV = mf ? mf.items.map((f) => ({ f, v: fundVerdict(f.meta) })).filter((x) => x.v) : [];
  const nV = (k) => mfV.filter((x) => x.v.status === k).length;
  const topStock = eq ? [...eq.items].sort((a, b) => b.currentValue - a.currentValue)[0] : null;
  const rows = [
    d.assets > 0 && ["alloc", "Allocation", `${d.categories[0] ? CATEGORIES[d.categories[0].category].label + " " + d.categories[0].pct.toFixed(0) + "%" : ""} · ${d.assets ? ((h.liquid / d.assets) * 100).toFixed(0) : 0}% liquid`],
    mf && ["mf", "Mutual funds", `${nV("Outperforming")} outperforming · ${nV("On par")} on par · ${nV("Underperforming")} underperforming`],
    eq && ["eq", "Stocks", `${eq.count} holdings · largest ${topStock ? ((topStock.currentValue / eq.value) * 100).toFixed(0) + "% " + topStock.name : "—"}`],
    h.sectors.length ? ["sector", "Sector allocation", `${h.sectors[0].sector} ${h.sectors[0].pct.toFixed(0)}% · across stocks and funds`] : null,
    ["ins", "Insurance", h.termCover ? `Term cover ${short(h.termCover)}` : "No term cover added"],
    d.liabs.length > 0 && ["loan", "Loans", `${short(d.liabilities)} · ${((d.liabilities / d.assets) * 100).toFixed(0)}% of assets`],
    re && ["re", "Property", `${short(re.value)} · ${re.pct.toFixed(0)}% of assets · updated ${fmtDate(re.oldest)}`],
  ].filter(Boolean);
  const Sheet = () => { if (!sheet) return null; const [id, title, summary] = rows.find((r) => r[0] === sheet); const ins = cat("insurance");
    const Bar = ({ pct, color }) => <div className="h-2 rounded-full bg-violet-50 mt-1.5"><div className="h-2 rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: color || "#5b2eea" }} /></div>;
    const Open = ({ label, to }) => <button onClick={() => { setSheet(null); go("detail", to); }} className="w-full rounded-full bg-violet-600 text-white text-sm font-medium py-3">{label}</button>;
    const stats = (arr) => <div className="grid grid-cols-3 gap-3 rounded-2xl bg-violet-50 p-3 mb-4">{arr.map(([k, v, cls]) => <div key={k}><div className="text-xs text-slate-500">{k}</div><div className={`font-num text-base font-semibold ${cls || "text-slate-900"}`}>{v}</div></div>)}</div>;
    return (
    <Overlay open={true} onClose={() => setSheet(null)}>
      <SheetPanel title={title} sub={summary} onClose={() => setSheet(null)} footer={id === "alloc" ? null : id === "mf" ? <Open label="Open mutual funds" to="mf" /> : id === "eq" || id === "sector" ? <Open label="Open stocks" to="equity" /> : id === "ins" ? <Open label="Open insurance" to="insurance" /> : id === "loan" ? <Open label="Open loans" to="liabilities" /> : id === "re" ? <Open label="Update property values" to="real_estate" /> : null}>
        {id === "alloc" && <>{stats([["Assets", short(d.assets)], ["Liquid", `${d.assets ? ((h.liquid / d.assets) * 100).toFixed(0) : 0}%`], ["Categories", d.categories.length]])}<div className="flex h-2.5 rounded-full overflow-hidden bg-violet-50">{d.categories.map((c, i) => <div key={c.category} style={{ width: `${c.pct}%`, background: pal[i % 9] }} />)}</div><div className="mt-4 space-y-3">{d.categories.map((c, i) => <div key={c.category} className="flex items-center gap-3 text-sm"><span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: pal[i % 9] }} /><span className="flex-1 text-slate-800">{CATEGORIES[c.category].label}</span><span className="font-num text-slate-500 text-xs">{short(c.value)}</span><span className="font-num w-10 text-right text-slate-900 font-medium">{c.pct.toFixed(0)}%</span></div>)}</div><div className="mt-4 text-xs text-slate-500">Liquid = bank balances and liquid funds; money you can use within a week without selling at a loss.</div></>}
        {id === "sector" && <>{stats([["Equity", short(h.sectors.reduce((a, x) => a + x.value, 0))], ["Largest", `${h.sectors[0].pct.toFixed(0)}%`, has("SECTOR_CONCENTRATION") ? "text-amber-600" : ""], ["Sectors", h.sectors.length]])}<div className="text-xs text-slate-500 mb-3">Look-through: your direct stocks plus what your equity funds hold.</div><div className="space-y-3">{h.sectors.map((x, i) => <div key={x.sector}><div className="flex justify-between text-sm"><span className="text-slate-800">{x.sector}</span><span className="font-num text-slate-900 font-medium">{x.pct.toFixed(0)}%</span></div><Bar pct={x.pct} color={x.pct > 35 && x.sector !== "Others" ? "#f2b544" : ["#5b2eea", "#8b6cf5", "#b9a6fa", "#2db58a", "#7ed3b8", "#f2b544", "#cbd5e1"][i % 7]} /></div>)}</div></>}
        {id === "mf" && <>{stats([["Value", short(mf.value)], ["Funds", mf.count], ["Underperforming", nV("Underperforming"), nV("Underperforming") ? "text-rose-500" : ""]])}<div className="text-sm font-medium text-slate-900 mb-2">By fund category</div><div className="space-y-3 mb-5">{h.mfSplit.map((c) => <div key={c.category}><div className="flex items-center justify-between text-sm"><span className="text-slate-800">{c.category} <span className="text-xs text-slate-400">· {c.count} fund{c.count > 1 ? "s" : ""}{c.weak ? ` · ${c.weak} underperforming` : ""}</span></span><span className="font-num text-slate-900 font-medium">{c.pct.toFixed(0)}%</span></div><Bar pct={c.pct} color={c.weak ? "#f2b544" : "#5b2eea"} /></div>)}</div><div className="text-sm font-medium text-slate-900 mb-2">By fund</div><div className="divide-y divide-violet-50">{mfV.map(({ f, v }) => <div key={f.id} className="py-3"><div className="flex items-start gap-2"><div className="flex-1 text-sm text-slate-900">{f.name.replace(/ Fund.*$/, "")}</div><span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${v.cls}`}>{v.status}</span></div><div className="text-xs text-slate-500 mt-1">{v.text}</div></div>)}</div></>}
        {id === "eq" && <>{stats([["Value", short(eq.value)], ["Largest", topStock ? `${((topStock.currentValue / eq.value) * 100).toFixed(0)}%` : "—", has("STOCK_CONCENTRATION") ? "text-amber-600" : ""], ["With Wealthy", `${eq.items.filter((x) => x.heldWith === "wealthy").length}/${eq.count}`]])}<div className="space-y-3">{[...eq.items].sort((a, b) => b.currentValue - a.currentValue).map((x, i) => <div key={x.id}><div className="flex items-center text-sm"><span className="flex-1 text-slate-800">{x.name} <span className="text-xs text-slate-400">· {x.meta.sector || ""}</span></span><span className="font-num text-slate-500 text-xs mr-3">{short(x.currentValue)}</span><span className="font-num w-10 text-right text-slate-900 font-medium">{((x.currentValue / eq.value) * 100).toFixed(0)}%</span></div><Bar pct={(x.currentValue / eq.value) * 100} color={(x.currentValue / eq.value) > 0.2 ? "#f2b544" : "#5b2eea"} /></div>)}</div></>}
        {id === "ins" && <>{stats([["Term cover", h.termCover ? short(h.termCover) : "None", h.termCover ? "" : "text-rose-500"], ["Needed", h.income ? short(Math.max(h.income * 10, d.liabilities)) : "—"], ["Policies", ins?.count || 0]])}{ins && <div className="divide-y divide-violet-50">{ins.items.map((x) => <div key={x.id} className="py-3 flex items-center gap-3"><div className="flex-1"><div className="text-sm text-slate-900">{x.name}</div><div className="text-xs text-slate-500">{x.meta.kind} · cover {short(x.meta.cover || 0)} · premium {inr(x.meta.premium || 0)}/yr</div></div><div className="font-num text-sm text-slate-900">{x.currentValue ? short(x.currentValue) : <span className="text-slate-400 text-xs">cover only</span>}</div></div>)}</div>}<div className="mt-3 text-xs text-slate-500">Need = 10× income or outstanding loans, whichever is higher. Fund-value policies count as assets; term policies count as cover.</div></>}
        {id === "loan" && <>{stats([["Outstanding", short(d.liabilities), "text-rose-500"], ["EMIs / month", short(d.liabs.reduce((a, l) => a + (l.emi || 0), 0))], ["Of assets", `${((d.liabilities / d.assets) * 100).toFixed(0)}%`]])}<div className="divide-y divide-violet-50">{d.liabs.map((l) => <div key={l.id} className="py-3"><div className="flex items-center gap-3"><div className="flex-1"><div className="text-sm text-slate-900">{l.name}</div><div className="text-xs text-slate-500">{l.type}{l.emi ? ` · EMI ${inr(l.emi)}` : ""}{l.rate ? ` · ${l.rate}%` : ""}{l.endDate ? ` · ends ${fmtDate(l.endDate)}` : ""}</div></div><div className="font-num text-sm text-rose-500">− {short(l.outstanding)}</div></div>{l.originalAmount && <Bar pct={(1 - l.outstanding / l.originalAmount) * 100} color="#2db58a" />}{l.originalAmount && <div className="text-xs text-slate-400 mt-1">{Math.round((1 - l.outstanding / l.originalAmount) * 100)}% repaid</div>}</div>)}</div></>}
        {id === "re" && <>{stats([["Value", short(re.value)], ["Of assets", `${re.pct.toFixed(0)}%`], ["Updated", fmtDate(re.oldest), ageDays(re.oldest) > 30 ? "text-amber-600" : ""]])}<div className="divide-y divide-violet-50">{re.items.map((x) => <div key={x.id} className="py-3 flex items-center gap-3"><div className="flex-1"><div className="text-sm text-slate-900">{x.name}</div><div className="text-xs text-slate-500">{x.meta.kind}{x.purchaseValue ? ` · bought ${short(x.purchaseValue)} in ${new Date(x.purchaseDate).getFullYear()}` : ""} · updated {fmtDate(x.updatedAt)}</div></div><div className="font-num text-sm text-slate-900">{short(x.currentValue)}</div></div>)}</div>{ageDays(re.oldest) > 30 && <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">The oldest value is over a month old. Property is {re.pct.toFixed(0)}% of your net worth, so a stale number here moves everything.</div>}</>}
      </SheetPanel>
    </Overlay>
  ); };

  return (
    <div className="bg-white min-h-full pb-6 relative">
      <Sheet />
      <Header title="Your net worth review" onBack={() => go("home")} sub={`${checks.length} checks on the whole portfolio · reviewed with ${first}`} />
      <div className="px-4">
        {setup.map((sg) => <button key={sg.code} onClick={() => go("settings")} className="w-full text-left mb-3 rounded-xl bg-violet-50 px-3 py-2.5"><div className="text-sm text-slate-900">{sg.user}</div><div className="text-xs text-slate-500 mt-0.5">{sg.suggest}</div></button>)}
        {G && G.onTrack && <div className="mb-3 rounded-2xl bg-emerald-50 p-4 flex items-center gap-3"><CheckCircle2 size={18} className="text-emerald-600" /><div className="flex-1"><div className="text-sm font-medium text-slate-900">Retirement at {G.retireAge}: on track</div><div className="text-xs text-slate-600">Projected {short(G.projected)} vs target {short(G.target)}</div></div><button onClick={() => go("goal")} className="text-xs text-violet-600">Plan</button></div>}
        <div className="text-base font-semibold text-slate-900 mb-2">{actions.length ? "Do these first" : "Nothing to fix right now"}</div>
        <div className="space-y-2">{actions.map((sg, i) => <Action key={sg.code} sg={sg} i={i} />)}</div>
        {passed.length > 0 && <div className="mt-5 rounded-2xl border border-violet-100 p-4"><div className="text-sm font-medium text-slate-900 mb-2">Looks fine · {passed.length} of {checks.length}</div><div className="grid grid-cols-2 gap-x-3 gap-y-1.5">{passed.map(([k, , why]) => <div key={k} className="flex items-start gap-1.5 text-xs"><CheckCircle2 size={13} className="text-emerald-500 mt-0.5 shrink-0" /><div><div className="text-slate-800">{k}</div><div className="text-slate-400">{why}</div></div></div>)}</div></div>}
        <div className="text-base font-semibold text-slate-900 mt-6 mb-2">By category</div>
        <div className="rounded-2xl border border-violet-100 divide-y divide-violet-50">{rows.map(([id, title, summary]) => <button key={id} onClick={() => setSheet(id)} className="w-full flex items-center gap-3 px-4 py-3 text-left"><div className="flex-1 min-w-0"><div className="text-sm font-medium text-slate-900">{title}</div><div className="text-xs text-slate-500 mt-0.5 truncate">{summary}</div></div><ChevronRight size={16} className="text-slate-300" /></button>)}</div>
        <div className="mt-6 rounded-2xl bg-violet-50 p-4"><div className="text-sm font-semibold text-slate-900">Send to {partner}</div><div className="text-xs text-slate-500 mt-1">Same page, your numbers. {first} reviews the actions and comes back with a plan.</div><button onClick={() => go("export")} className="mt-3 w-full rounded-full bg-violet-600 text-white text-sm font-medium py-2.5">Share with {first}</button></div>
      </div>
    </div>
  );
}
function GoalScreen({ go, s, d, onPref }) {
  const g = s.prefs.goal || { age: "", retireAge: "", targetCorpus: "", extraMonthly: "" };
  const [f, setF] = useState({ age: g.age || "", retireAge: g.retireAge || "", targetCorpus: g.targetCorpus || "", extraMonthly: g.extraMonthly || "" });
  const [editing, setEditing] = useState(!s.prefs.goal);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const sipFunds = s.connectedHoldings.filter((x) => x.category === "mf" && x.meta?.sip); const sipTotal = sipFunds.length * 25000;
  const ok = f.age && f.retireAge && Number(f.retireAge) > Number(f.age) && (f.targetCorpus || s.prefs.monthlyExpense);
  const G = d.goal;
  // projection series: current path vs required path vs target
  const series = G ? Array.from({ length: G.yrs + 1 }, (_, y) => { const r = 0.10; const grow = (pmt) => d.netWorth * Math.pow(1 + r, y) + pmt * 12 * ((Math.pow(1 + r, y) - 1) / r); return { y, cur: grow(G.monthlyInvest), need: grow(G.requiredMonthly), target: G.targetToday * Math.pow(1.06, y) }; }) : [];
  const Graph = () => { const w = 320, hh = 140, max = Math.max(...series.map((p) => Math.max(p.cur, p.need, p.target))); const X = (i) => (i / (series.length - 1)) * w, Y = (v) => hh - (v / max) * (hh - 12) - 4; const path = (k) => series.map((p, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p[k]).toFixed(1)).join(" "); return (
    <svg viewBox={`0 0 ${w} ${hh + 16}`} className="w-full" style={{ height: 156 }}>
      <path d={path("target")} fill="none" stroke="#f2b544" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d={path("need")} fill="none" stroke="#2db58a" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d={path("cur") + ` L ${w} ${hh} L 0 ${hh} Z`} fill="#efe9ff" />
      <path d={path("cur")} fill="none" stroke="#5b2eea" strokeWidth="2" />
      <circle cx={X(series.length - 1)} cy={Y(series[series.length - 1].cur)} r="3.5" fill="#5b2eea" />
      <text x="0" y={hh + 12} fontSize="10" fill="#94a3b8">Age {G.age}</text><text x={w} y={hh + 12} fontSize="10" fill="#94a3b8" textAnchor="end">Age {G.retireAge}</text>
    </svg>
  ); };
  return (
    <div className="bg-white min-h-full pb-6">
      <Header title="Retirement plan" onBack={() => go("home")} sub={G ? `Retire at ${G.retireAge} · ${G.yrs} years to go` : "Two questions. We already know your SIPs."} />
      <div className="px-4">
        {G && !editing && (
          <>
            <div className={`rounded-2xl p-4 ${G.onTrack ? "bg-emerald-50" : "bg-violet-600 text-white"}`}>
              <div className={`text-xs ${G.onTrack ? "text-slate-500" : ""}`} style={G.onTrack ? undefined : { color: "#e4dbff" }}>{G.onTrack ? "You're on track" : "To reach your goal, invest"}</div>
              <div className="font-num mt-1" style={{ fontSize: 28, lineHeight: "32px", fontWeight: 600 }}>{G.onTrack ? short(G.projected) : `${short(G.requiredMonthly)}/mo`}</div>
              <div className={`text-xs mt-1 ${G.onTrack ? "text-slate-600" : ""}`} style={G.onTrack ? undefined : { color: "#e4dbff" }}>{G.onTrack ? `projected at ${G.retireAge}, against a target of ${short(G.target)}` : `You invest ${short(G.monthlyInvest)}/mo today — ${short(G.requiredMonthly - G.monthlyInvest)}/mo more.`}</div>
            </div>
            <div className="mt-3 rounded-2xl border border-violet-100 p-4">
              <Graph />
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-violet-600 inline-block" />Current path</span><span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{ background: "#2db58a" }} />With {short(G.requiredMonthly)}/mo</span><span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{ background: "#f2b544" }} />Target (inflation-adjusted)</span></div>
              <div className="mt-3 grid grid-cols-3 gap-2"><div><div className="text-xs text-slate-400">Target at {G.retireAge}</div><div className="font-num text-sm font-semibold text-slate-900">{short(G.target)}</div></div><div><div className="text-xs text-slate-400">Projected</div><div className={`font-num text-sm font-semibold ${G.onTrack ? "text-emerald-600" : "text-rose-500"}`}>{short(G.projected)}</div></div><div><div className="text-xs text-slate-400">Gap</div><div className="font-num text-sm font-semibold text-slate-900">{G.gap > 0 ? short(G.gap) : "None"}</div></div></div>
              <div className="text-xs text-slate-400 mt-3">{short(G.targetToday)} in today's money, grown at 6% inflation. Assets and SIPs assumed to grow 10% a year. An estimate, not a promise — {s.user.rm.split(" ")[0]} turns this into an allocation.</div>
            </div>
            <div className="mt-3 rounded-2xl border border-violet-100 p-4 text-sm"><div className="flex justify-between"><span className="text-slate-500">SIPs we can see</span><span className="font-num text-slate-900">{short(G.sips)}/mo · {G.sipCount} active</span></div>{G.extraMonthly ? <div className="flex justify-between mt-1.5"><span className="text-slate-500">Other investments you told us</span><span className="font-num text-slate-900">{short(G.extraMonthly)}/mo</span></div> : null}</div>
            <div className="mt-3 flex gap-2"><Btn full kind="ghost" onClick={() => setEditing(true)}>Edit goal</Btn><Btn full onClick={() => go("events")}>Discuss with {s.user.rm.split(" ")[0]}</Btn></div>
          </>
        )}
        {editing && (
          <>
            <div className="grid grid-cols-2 gap-3"><Field label="Your age"><input value={f.age} onChange={set("age")} type="number" className={inputCls} /></Field><Field label="Retire at"><input value={f.retireAge} onChange={set("retireAge")} type="number" className={inputCls} /></Field></div>
            <Field label="Net worth you want at retirement (today's money)" hint={s.prefs.monthlyExpense ? `Leave blank to use 25× your yearly spend (${short(s.prefs.monthlyExpense * 12 * 25)}).` : "Or add your monthly spend in Preferences and we'll suggest 25× yearly spend."}><input value={f.targetCorpus} onChange={set("targetCorpus")} type="number" className={inputCls} placeholder="₹ 0" /></Field>
            <div className="mb-4 rounded-2xl border border-violet-100 p-3"><div className="flex justify-between text-sm"><span className="text-slate-500">SIPs we can see</span><span className="font-num text-slate-900 font-medium">{sipFunds.length ? `${short(sipTotal)}/month` : "None yet"}</span></div><div className="text-xs text-slate-400 mt-1">{sipFunds.length ? `${sipFunds.length} active SIP${sipFunds.length > 1 ? "s" : ""} from your synced folios.` : "Sync mutual funds and we'll pick your SIPs up automatically."}</div></div>
            <Field label="Other monthly investments we can't see (optional)" hint="RD, PPF, NPS contributions, or SIPs in accounts you haven't synced."><input value={f.extraMonthly} onChange={set("extraMonthly")} type="number" className={inputCls} placeholder="₹ 0" /></Field>
            <div className="flex gap-2">{s.prefs.goal && <Btn full kind="ghost" onClick={() => setEditing(false)}>Cancel</Btn>}<Btn full disabled={!ok} onClick={() => { onPref({ goal: { age: Number(f.age), retireAge: Number(f.retireAge), targetCorpus: f.targetCorpus ? Number(f.targetCorpus) : null, extraMonthly: Number(f.extraMonthly || 0) } }); setEditing(false); }}>See my plan</Btn></div>
          </>
        )}
      </div>
    </div>
  );
}
function Settings({ go, s, onPref }) {
  return <div className="pb-4"><Header title="Preferences" onBack={() => go("home")} /><div className="px-4 space-y-3">
    <div className="rounded-xl border border-violet-100 p-3"><div className="text-sm text-slate-900">About you <span className="text-xs text-slate-400 font-normal">— used for emergency fund, insurance and retirement checks</span></div><div className="grid grid-cols-2 gap-3 mt-2"><div><div className="text-xs text-slate-500 mb-1">Annual income</div><input type="number" defaultValue={s.prefs.annualIncome || ""} onBlur={(e) => onPref({ annualIncome: Number(e.target.value) || null })} placeholder="₹ 0" className={inputCls} /></div><div><div className="text-xs text-slate-500 mb-1">Monthly spend (excl. EMIs/SIPs)</div><input type="number" defaultValue={s.prefs.monthlyExpense || ""} onBlur={(e) => onPref({ monthlyExpense: Number(e.target.value) || null })} placeholder="₹ 0" className={inputCls} /></div></div></div>
    <div className="rounded-xl border border-violet-100 p-3"><div className="text-sm text-slate-900">Auto-refresh connected data</div><div className="flex gap-2 mt-2">{["daily", "weekly", "manual"].map((k) => <button key={k} onClick={() => onPref({ autoRefresh: k })} className={`text-xs px-3 py-1 rounded-full ${s.prefs.autoRefresh === k ? "bg-slate-900 text-white" : "bg-slate-100"}`}>{k}</button>)}</div></div>
    <div className="rounded-xl border border-violet-100 p-3"><div className="text-sm text-slate-900">Remind me to update entered values after</div><div className="flex gap-2 mt-2">{[30, 60, 90].map((k) => <button key={k} onClick={() => onPref({ staleReminderDays: k })} className={`text-xs px-3 py-1 rounded-full ${s.prefs.staleReminderDays === k ? "bg-slate-900 text-white" : "bg-slate-100"}`}>{k} days</button>)}</div></div>
    <div className="rounded-xl border border-violet-100 p-3"><div className="text-sm text-slate-900">Who can see this</div><div className="text-xs text-slate-500 mt-1">You, and your RM {s.user.rm} (summary and insights only, never bank balances by account). Family members see what you choose to share.</div></div>
    <div className="rounded-xl border border-violet-100 p-3"><div className="text-sm text-slate-900">Hide amounts on the home screen</div><div className="text-xs text-slate-500 mt-1">Tap the eye icon on the dashboard.</div></div>
  </div></div>;
}

/* ============================================================================
   APP SHELL
   ========================================================================== */
export default function App() {
  const debugMode = import.meta.env.DEV && new URLSearchParams(window.location.search).get("debug") === "1";
  const [mock, setMock] = useState("fresh");
  const [s, setS] = useState(freshState);
  const [screen, setScreen] = useState("home");
  const [arg, setArg] = useState(null);
  const [sel, setSel] = useState(FI_TYPES.map((t) => t.k));
  const [failKotak, setFailKotak] = useState(false);
  const [discovered, setDiscovered] = useState([]);
  const [picked, setPicked] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showState, setShowState] = useState(true);
  const [showBiz, setShowBiz] = useState(true);
  const [toast, setToast] = useState(null);
  const [hide, setHide] = useState(false);
  const [dismissed, setDismissed] = useState([]);
  const d0 = useMemo(() => derive(s), [s]);
  const d = useMemo(() => ({ ...d0, signals: d0.signals.filter((x) => !dismissed.includes(x.code)) }), [d0, dismissed]);
  const go = (sc, a = null) => { setScreen(sc); setArg(a); };
  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 1800); };
  const loadMock = (m) => { setMock(m); setS(m === "fresh" ? freshState() : populatedState()); setScreen("home"); setArg(null); setDiscovered([]); };
  const snap = (st, trigger) => { const dd = derive(st); return { ...st, snapshots: [...st.snapshots, { at: iso(NOW), assets: dd.assets, liabilities: dd.liabilities, netWorth: dd.netWorth, trigger, byCategory: Object.fromEntries(dd.categories.map((c) => [c.category, c.value])), byLiability: Object.fromEntries(dd.liabs.map((l) => [l.id, l.outstanding])) }] }; };
  const ev = (st, e) => ({ ...st, events: [{ id: uid("ev"), at: iso(NOW), ...e }, ...st.events] });
  const upsert = (list, rec) => (list.some((x) => x.id === rec.id) ? list.map((x) => (x.id === rec.id ? rec : x)) : [...list, rec]);

  const AA_SCOPES = { bank: ["DEPOSIT", "TERM_DEPOSIT", "RECURRING_DEPOSIT"], equity: ["EQUITIES"], all: FI_TYPES.map((t) => t.k) };
  const [aaCtx, setAaCtx] = useState("all");
  const startAA = (ctx) => { setAaCtx(ctx); setSel(AA_SCOPES[ctx] || AA_SCOPES.all); go("aa_otp"); };
  const doFetch = (ids) => {
    setPicked(ids); setScreen("aa_fetch");
    setTimeout(() => {
      setS((st) => {
        const fips = discovered.map((f) => ({ ...f, status: f.status === "failed" ? "failed" : ids.includes(f.fipId) ? "linked" : "skipped" }));
        const holdings = ids.flatMap((id) => FIP_DATA[id].map((x) => ({ id: uid("h"), source: "AA", fipId: id, fipName: FIP_CATALOG.find((f) => f.fipId === id).name, ...x, fetchedAt: iso(NOW), valueAsOf: x.meta.navDate || iso(NOW) })));
        let n = { ...st, aa: { ...st.aa, status: "connected", consentId: "cst_7f3a9c", consentValidTill: daysAhead(365), fips, lastSyncAt: iso(NOW), nextRefreshAt: daysAhead(1) }, connectedHoldings: [...st.connectedHoldings.filter((x) => !ids.includes(x.fipId)), ...holdings] };
        n = ev(n, { type: "sync", title: "Accounts connected", detail: `${holdings.length} holdings from ${ids.length} institutions`, source: "AA" });
        holdings.filter((x) => x.category === "deposit" && x.meta.maturity).forEach((fd) => { n = ev(n, { type: "upcoming", title: "Deposit matures", detail: `${short(fd.currentValue)} · ${fd.name}`, source: "AA", upcoming: true, when: fd.meta.maturity }); });
        return snap(n, "aa_link");
      });
      if (aaCtx === "bank") { setScreen("detail"); setArg("bank"); } else if (aaCtx === "equity") { setScreen("detail"); setArg("equity"); } else setScreen("aa_result");
      setAaCtx("all");
    }, 1500);
  };
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setS((st) => {
        const j = (x, p) => +(x * (1 + (Math.random() - 0.45) * p)).toFixed(2);
        const holdings = st.connectedHoldings.map((x) => { if (["equity", "etf"].includes(x.category)) { const ltp = j(x.meta.ltp, 0.02); return { ...x, meta: { ...x.meta, ltp }, currentValue: Math.round(ltp * x.meta.qty), valueAsOf: iso(NOW), fetchedAt: iso(NOW) }; } if (x.category === "mf") { const nav = j(x.meta.nav, 0.01); return { ...x, meta: { ...x.meta, nav, navDate: daysAgo(0, 23) }, currentValue: Math.round(nav * x.meta.units), valueAsOf: daysAgo(0, 23), fetchedAt: iso(NOW) }; } return { ...x, valueAsOf: iso(NOW), fetchedAt: iso(NOW) }; });
        const manual = st.manualAssets.map((m) => (m.meta?.ratePerGram ? { ...m, meta: { ...m.meta, ratePerGram: Math.round(j(m.meta.ratePerGram, 0.01)), rateAsOf: iso(NOW) } } : m.meta?.priceUsd ? { ...m, meta: { ...m.meta, priceUsd: j(m.meta.priceUsd, 0.02) }, updatedAt: iso(NOW) } : m));
        let n = { ...st, connectedHoldings: holdings, manualAssets: manual, aa: { ...st.aa, lastSyncAt: iso(NOW), nextRefreshAt: daysAhead(1) } };
        n = ev(n, { type: "sync", title: "Connected accounts refreshed", detail: `${holdings.length} holdings · balances, NAVs, prices, metal rates and FX updated`, source: "AA" });
        return snap(n, "manual_refresh");
      });
      setRefreshing(false); flash("Refreshed just now");
    }, 1400);
  };
  const saveAsset = (a) => { setS((st) => { const exists = !!a.id; const rec = { ...a, id: a.id || uid("m"), source: "MANUAL", updatedAt: iso(NOW), isDeleted: false }; let n = { ...st, manualAssets: upsert(st.manualAssets, rec) }; const val = valueOf(rec); n = ev(n, { type: "manual", title: exists ? `${rec.name} updated` : `${rec.name} added`, detail: rec.category === "insurance" && rec.meta.kind === "Term" ? `Cover ${short(rec.meta.cover)}` : `Now ${inr(val)}`, source: "MANUAL" }); if (rec.meta?.premiumDue && !exists) n = ev(n, { type: "upcoming", title: "Insurance premium due", detail: `${inr(rec.meta.premium)} · ${rec.name}`, source: "MANUAL", upcoming: true, when: rec.meta.premiumDue }); if (rec.category === "vehicle" && !exists && rec.meta?.insuranceValid) n = ev(n, { type: "upcoming", title: "Vehicle insurance renewal", detail: `${rec.name} · ${rec.meta.insurer}`, source: "MANUAL", upcoming: true, when: iso(rec.meta.insuranceValid) }); if (rec.meta?.nextVest && !exists) n = ev(n, { type: "upcoming", title: "ESOP vesting", detail: rec.name, source: "MANUAL", upcoming: true, when: rec.meta.nextVest }); return snap(n, exists ? "manual_edit" : "manual_add"); }); go("home"); flash("Net worth recalculated"); };
  const deleteAsset = (a) => { setS((st) => snap(ev({ ...st, manualAssets: st.manualAssets.map((m) => (m.id === a.id ? { ...m, isDeleted: true, updatedAt: iso(NOW) } : m)) }, { type: "manual", title: `${a.name} removed`, detail: "No longer counted", source: "MANUAL" }), "manual_delete")); go("home"); flash("Removed"); };
  const saveLiability = (l) => { setS((st) => { const exists = !!l.id; const rec = { ...l, id: l.id || uid("l"), source: "MANUAL", updatedAt: iso(NOW), isDeleted: false }; let n = { ...st, liabilities: upsert(st.liabilities, rec) }; n = ev(n, { type: "manual", title: exists ? `${rec.name} updated` : `${rec.name} added`, detail: `Outstanding ${inr(rec.outstanding)}`, source: "MANUAL" }); if (rec.emi && !exists) n = ev(n, { type: "upcoming", title: `${rec.type} EMI`, detail: `${inr(rec.emi)} · ${rec.lender || rec.name}`, source: "MANUAL", upcoming: true, when: daysAhead(3) }); return snap(n, exists ? "liability_edit" : "liability_add"); }); go("home"); flash("Net worth recalculated"); };
  const deleteLiability = (l) => { setS((st) => snap(ev({ ...st, liabilities: st.liabilities.map((x) => (x.id === l.id ? { ...x, isDeleted: true } : x)) }, { type: "manual", title: `${l.name} closed`, detail: "Removed from what you owe", source: "MANUAL" }), "liability_delete")); go("home"); flash("Removed"); };
  const retryFip = (fipId) => { setS((st) => { const hs = FIP_DATA[fipId].map((x) => ({ id: uid("h"), source: "AA", fipId, fipName: FIP_CATALOG.find((f) => f.fipId === fipId).name, ...x, fetchedAt: iso(NOW), valueAsOf: iso(NOW) })); return snap(ev({ ...st, aa: { ...st.aa, fips: st.aa.fips.map((f) => (f.fipId === fipId ? { ...f, status: "linked", error: null } : f)) }, connectedHoldings: [...st.connectedHoldings, ...hs] }, { type: "sync", title: `${hs[0].fipName} linked`, detail: `${hs.length} account${hs.length > 1 ? "s" : ""}`, source: "AA" }), "aa_retry"); }); flash("Linked"); };
  const revoke = () => { setS((st) => snap(ev({ ...st, aa: { ...st.aa, status: "not_connected", consentId: null, fips: [], lastSyncAt: null, nextRefreshAt: null }, connectedHoldings: st.connectedHoldings.filter((x) => x.source === "MFC" || x.source === "BROKER") }, { type: "system", title: "Consent revoked", detail: "Connected data deleted", source: "WEALTHY" }), "aa_revoke")); go("home"); flash("Consent revoked"); };
  const syncMf = (funds) => { setS((st) => { const hs = funds.map((f) => ({ id: uid("h"), source: "MFC", fipId: "MFCENTRAL", fipName: "MF Central", ...f, fetchedAt: iso(NOW) })); let n = { ...st, links: { ...st.links, mfcentral: { status: "linked", fetchedAt: iso(NOW), folios: hs.length } }, connectedHoldings: [...st.connectedHoldings.filter((x) => x.category !== "mf"), ...hs] }; n = ev(n, { type: "sync", title: "Mutual funds synced", detail: `${hs.length} folios from MF Central`, source: "AA" }); return snap(n, "mfcentral_link"); }); go("detail", "mf"); flash("Mutual funds synced"); };
  const linkBroker = (broker, clientId) => { go("stk_fetching", broker); setTimeout(() => { setS((st) => { const hs = BROKER_DATA(broker).map((x) => ({ id: uid("h"), source: "BROKER", fipId: "BROKER-" + broker, fipName: broker, ...x, fetchedAt: iso(NOW), valueAsOf: iso(NOW) })); const others = st.connectedHoldings.filter((x) => !(x.category === "equity" && (x.meta.broker === broker || x.source === "AA"))); let n = { ...st, links: { ...st.links, brokers: [...(st.links.brokers || []).filter((b) => b.name !== broker), { name: broker, clientId, fetchedAt: iso(NOW), holdings: hs.length }] }, connectedHoldings: [...others, ...hs] }; n = ev(n, { type: "sync", title: `${broker} connected`, detail: `${hs.length} holdings imported`, source: "AA" }); return snap(n, "broker_link"); }); go("detail", "equity"); flash(`${broker} connected`); }, 1500); };
  const linkEpf = (epf) => { setS((st) => snap(ev({ ...st, links: { ...st.links, epf } }, { type: "sync", title: "EPF linked", detail: `${inr(epf.balance)} · UAN ${epf.uan}`, source: "LINK" }), "epf_link")); flash("EPF linked"); };
  const unlinkEpf = () => { setS((st) => snap({ ...st, links: { ...st.links, epf: { status: "not_linked" } } }, "epf_unlink")); flash("EPF unlinked"); };
  const invite = (phone) => { setS((st) => ({ ...st, family: { ...st.family, members: [...st.family.members, { id: uid("usr"), name: phone, relation: "Invited", status: "pending", assets: 0, liabilities: 0, byCategory: {} }] } })); flash("Invite sent"); };
  const setFamilyView = (v) => setS((st) => ({ ...st, family: { ...st.family, view: v } }));
  const addEvent = (e) => { setS((st) => ev(st, e)); flash("Reminder saved"); };
  const onPref = (p) => setS((st) => ({ ...st, prefs: { ...st.prefs, ...p } }));

  const isEmpty = !s.connectedHoldings.length && !s.wealthyHoldings.length && !d.manual.length && !d.liabs.length && s.links.epf.status !== "linked";
  const screens = {
    home: () => <Dashboard go={go} s={s} d={d} onRefresh={onRefresh} refreshing={refreshing} setFamilyView={setFamilyView} hide={hide} setHide={setHide} empty={isEmpty} startAA={startAA} />,
    aa_otp: () => <AAOtp go={go} scope={aaCtx} />,
    aa_select: () => <AASelect go={go} sel={sel.filter((k) => !(s.links.mfcentral?.status === "linked" && k === "MUTUAL_FUNDS"))} setSel={setSel} s={s} />,
    aa_discover: () => <AADiscover go={go} sel={sel} failKotak={failKotak} onDiscovered={setDiscovered} />,
    aa_accounts: () => <AAAccounts discovered={discovered} onFetch={doFetch} />, aa_fetch: () => <AAFetching n={picked.length} />, aa_result: () => <AAResult go={go} s={s} d={d} />,
    epf_link: () => <EpfLink go={go} onLinked={linkEpf} />,
    mf_otp: () => <MfOtp go={go} s={s} />, mf_fetching: () => <MfFetching go={go} />, mf_select: () => <MfSelect go={go} onSync={syncMf} />,
    stk_import: () => <StkImport go={go} s={s} />, stk_brokers: () => <StkBrokers go={go} onPick={(b) => go("stk_login", b)} />, stk_login: () => <StkLogin key={arg} go={go} broker={arg} onDone={linkBroker} />, stk_fetching: () => <StkFetching broker={arg} />,
    detail: () => ["gold", "silver"].includes(arg) ? <MetalDetail go={go} d={d} category={arg} hide={hide} setHide={setHide} onEdit={(it) => go("add_form", { category: it.category, existing: s.manualAssets.find((m) => m.id === it.id) })} onDelete={deleteAsset} /> : arg === "vehicle" ? <VehicleDetail go={go} d={d} hide={hide} onDelete={deleteAsset} onUpdate={(it, v) => saveAsset({ ...s.manualAssets.find((m) => m.id === it.id), currentValue: v, meta: { ...it.meta, auto: false } })} onMeta={(it, extra) => { const base = s.manualAssets.find((m) => m.id === it.id); setS((st) => ({ ...st, manualAssets: st.manualAssets.map((m) => (m.id === base.id ? { ...m, meta: { ...m.meta, ...extra }, updatedAt: iso(NOW) } : m)) })); flash("Policy saved"); }} /> : arg === "equity" ? <StocksDetail go={go} s={s} d={d} onRefresh={onRefresh} refreshing={refreshing} hide={hide} /> : arg === "bank" ? <BankDetail go={go} s={s} d={d} onRefresh={onRefresh} refreshing={refreshing} hide={hide} onAdd={() => startAA("bank")} /> : arg === "mf" ? <MFDetail go={go} s={s} d={d} onRefresh={onRefresh} refreshing={refreshing} hide={hide} setHide={setHide} /> : <Detail go={go} s={s} d={d} cat={arg} onEdit={(it) => go("add_form", { category: it.category, existing: s.manualAssets.find((m) => m.id === it.id) })} onDelete={deleteAsset} />,
    add_pick: () => <AddPick go={go} s={s} />,
    add_form: () => arg.category === "vehicle" && !arg.existing ? <VehicleAdd go={go} onSave={saveAsset} /> : ["gold", "silver"].includes(arg.category) && !arg.existing ? <MetalAdd go={go} category={arg.category} onSave={saveAsset} /> : <AddForm key={arg?.existing?.id || arg?.category} go={go} category={arg.category} existing={arg.existing} onSave={saveAsset} />,
    add_liability: () => <LiabilityForm go={go} onSave={saveLiability} />, edit_liability: () => <LiabilityForm key={arg?.id} go={go} existing={arg} onSave={saveLiability} onDelete={deleteLiability} />,
    events: () => <Events go={go} s={s} onAddEvent={addEvent} />, insights: () => <Insights go={go} s={s} d={d} showBiz={showBiz} focus={arg} onDismiss={(code) => { setDismissed((x) => [...x, code]); flash("Hidden"); }} />, goal: () => <GoalScreen go={go} s={s} d={d} onPref={onPref} />, family: () => <Family go={go} s={s} onInvite={invite} />, forecast: () => <Forecast go={go} d={d} />,
    connections: () => <Connections go={go} s={s} onRetry={retryFip} onRevoke={revoke} onUnlinkEpf={unlinkEpf} />, provenance: () => <Provenance go={go} s={s} />, export: () => <ExportScreen go={go} d={d} />, settings: () => <Settings go={go} s={s} onPref={onPref} />,
  };
  const content = (screens[screen] || screens.home)();

  const stateView = {
    screen, mock,
    aa: { status: s.aa.status, provider: s.aa.provider, consentId: s.aa.consentId, lastSyncAt: s.aa.lastSyncAt, nextRefreshAt: s.aa.nextRefreshAt, fips: s.aa.fips.map((f) => ({ fipId: f.fipId, status: f.status, accounts: f.accounts, error: f.error })) },
    links: s.links, prefs: s.prefs, family: { view: s.family.view, members: s.family.members.map((m) => ({ id: m.id, status: m.status })) },
    counts: { connectedHoldings: s.connectedHoldings.length, wealthyHoldings: s.wealthyHoldings.length, manualAssets: d.manual.length, liabilities: d.liabs.length, snapshots: s.snapshots.length, events: s.events.length },
    derived: { assets: d.assets, liabilities: d.liabilities, netWorth: d.netWorth, changeSinceLastSnapshot: d.change, lifeCover: d.cover, byCategory: d.categories.map((c) => ({ category: c.category, group: c.group, value: c.value, pct: +c.pct.toFixed(1), count: c.count, sources: c.sources, oldestValueAsOf: c.oldest })), forecast: d.forecast, signals: d.signals.map((x) => ({ code: x.code, severity: x.severity, amount: x.amount, business: x.business })) },
    samples: { connectedHolding: s.connectedHoldings[0] || null, manualAsset: d.manual[0] || null, liability: d.liabs[0] || null, latestSnapshot: s.snapshots[s.snapshots.length - 1] || null, upcomingEvent: s.events.find((e) => e.upcoming) || null },
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900" style={{ fontFamily: "'Instrument Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Karla:wght@400;500;600;700&display=swap'); .font-num{font-family:'Karla','Instrument Sans',ui-sans-serif,system-ui,sans-serif;font-variant-numeric:tabular-nums}`}</style>
      <div className="max-w-6xl mx-auto px-4 py-5">
        <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="text-lg font-semibold sm:text-xl">Wealthy · Net Worth</div>
          <div role="group" aria-label="Net worth demo state" className="grid w-full grid-cols-2 overflow-hidden rounded-lg border border-slate-300 text-xs sm:ml-auto sm:w-auto sm:text-sm">
            <button aria-pressed={isEmpty} onClick={() => loadMock("fresh")} className={`px-3 py-2 sm:px-4 ${isEmpty ? "bg-slate-900 text-white" : "bg-white text-slate-800"}`}>
              <span className="md:hidden">Before sync</span><span className="hidden md:inline">Mock 1 · New sign-in, nothing synced</span>
            </button>
            <button aria-pressed={!isEmpty} onClick={() => loadMock("populated")} className={`px-3 py-2 sm:px-4 ${!isEmpty ? "bg-slate-900 text-white" : "bg-white text-slate-800"}`}>
              <span className="md:hidden">After sync</span><span className="hidden md:inline">Mock 2 · Populated client</span>
            </button>
          </div>
        </header>
        {debugMode && <div className="flex flex-wrap items-center gap-3 mb-4">
          <label className="text-xs inline-flex items-center gap-1.5"><input type="checkbox" checked={failKotak} onChange={(e) => setFailKotak(e.target.checked)} /> Simulate one institution failing</label>
          <label className="text-xs inline-flex items-center gap-1.5"><input type="checkbox" checked={showBiz} onChange={(e) => setShowBiz(e.target.checked)} /> Show RM/business signals</label>
          <label className="text-xs inline-flex items-center gap-1.5"><input type="checkbox" checked={showState} onChange={(e) => setShowState(e.target.checked)} /> State inspector</label>
          <button onClick={() => loadMock(isEmpty ? "fresh" : "populated")} className="text-xs underline underline-offset-2">Reset</button>
        </div>}
        <div className={debugMode ? "flex gap-5 items-start" : "flex justify-center"}>
          <div className="shrink-0" style={{ width: 390 }}>
            <div className="rounded-3xl border-8 border-slate-900 bg-white shadow-xl overflow-hidden relative" style={{ height: 800, transform: "translateZ(0)" }}>
              <div className="h-full overflow-y-auto flex flex-col">{content}</div>
              {toast && <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-2 rounded-full shadow">{toast}</div>}
            </div>
            {debugMode && <div className="text-xs text-slate-500 mt-2 px-1">Screen <span className="font-mono">{screen}</span> · clock fixed at 4 Sep 2026, 2:14 pm</div>}
          </div>
          {debugMode && showState && (
            <div className="flex-1 min-w-0">
              <div className="rounded-xl bg-slate-900 text-slate-100 p-4 text-xs font-mono overflow-auto" style={{ maxHeight: 480 }}><div className="text-slate-400 mb-2 font-sans">What the app renders from — backend read model</div><pre className="whitespace-pre-wrap break-words">{JSON.stringify(stateView, null, 2)}</pre></div>
              <div className="mt-3 rounded-xl bg-white border border-slate-200 p-4 text-xs text-slate-700 leading-relaxed">
                <div className="font-semibold text-slate-900 mb-1">Contract notes · FE / BE</div>
                <ul className="list-disc pl-4 space-y-1">
                  <li><b>Four sources</b>, one row shape: <b>AA</b> (Sahamati FIPs, by reference: fipId + fiType + identifier), <b>WEALTHY</b> (our books), <b>LINK</b> (non-AA connectors: EPFO now, bureau later), <b>MANUAL</b> (user). Every row carries <b>currentValue</b>, <b>valueAsOf</b> (NAV/balance date) and <b>fetchedAt</b>/<b>updatedAt</b>. UI always shows valueAsOf.</li>
                  <li><b>Bank</b>: DEPOSIT FI type returns summary + transactions. We store the balance for the net worth number and the transaction list for the per-account page (month-wise, type filter, sort). Consent scope must include transactions.</li>
                  <li><b>valuation</b> on each category tells the pricing job what to do: balance, units_nav, qty_price, qty_price_fx, weight_rate, depreciation, vested_fmv, balance_accrual, principal_accrual, entered. Computed manual assets (gold, silver, US stocks, vehicle, PPF, ESOPs) are re-priced by a daily job; "entered" assets are nudged after prefs.staleReminderDays.</li>
                  <li><b>Insurance</b>: term/health → currentValue 0, cover tracked in meta and reported separately (lifeCover). ULIP/endowment → fund value counts.</li>
                  <li><b>ESOPs</b>: vested × FMV counts; unvested stored, never summed. Vest dates generate upcoming events.</li>
                  <li><b>Totals are derived on read.</b> A <b>snapshot</b> row is written on every link, refresh, add, edit, delete (trigger recorded). That is the history chart and the "since last refresh" delta.</li>
                  <li><b>events</b>: happened (at) vs upcoming (when). Generated from AA (EMI debit, maturity), Wealthy (SIP), manual (premium, vesting, user reminders).</li>
                  <li><b>signals</b> computed server-side from the same state; one object with <b>user</b> and <b>business</b> strings. The RM tool consumes the same list. Users can dismiss ("Not relevant") — store per code.</li>
                  <li><b>family</b>: members share category totals only (consented, revocable). The primary never receives a member's line items.</li>
                  <li><b>forecast</b> is a pure function of byCategory and liabilities with published per-category rates — no stored projections.</li>
                  <li><b>AA lifecycle</b>: not_connected → consent_pending → discovering → fetching → connected. Per-FIP status: discovered / linked / skipped / failed(+error). Partial success is a normal outcome, not an error.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}