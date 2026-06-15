import { BRANDS, CHANNELS, LOCATIONS, MENU_ITEMS } from "./data.js";

const channelById = Object.fromEntries(CHANNELS.map((channel) => [channel.id, channel]));
const locationById = Object.fromEntries(LOCATIONS.map((location) => [location.id, location]));
const brandById = Object.fromEntries(BRANDS.map((brand) => [brand.id, brand]));
const itemById = Object.fromEntries(MENU_ITEMS.map((item) => [item.id, item]));
const EMPTY_ORDERS = Object.freeze([]);
const EMPTY_LABOR = Object.freeze([]);
const DATA_CACHES = new WeakMap();
const SUMMARY_CACHES = new WeakMap();
const CHANNEL_MIX_CACHES = new WeakMap();

export const formatters = {
  currency(value, compact = false) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 2 : 0
    }).format(value || 0);
  },
  number(value) {
    return new Intl.NumberFormat("en-US").format(Math.round(value || 0));
  },
  percent(value, digits = 1) {
    return `${((value || 0) * 100).toFixed(digits)}%`;
  },
  points(value, digits = 1) {
    const sign = value > 0 ? "+" : "";
    return `${sign}${((value || 0) * 100).toFixed(digits)} pts`;
  }
};

export function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function orderNetRevenue(order) {
  return order.grossSales - order.discount - order.merchantPromo - order.refundMerchant;
}

export function orderContribution(order) {
  return (
    orderNetRevenue(order) -
    order.platformFee -
    order.paymentFee -
    order.foodCost -
    order.packagingCost
  );
}

export function laborCost(row) {
  return row.actualHours * row.hourlyRate * (1 + row.payrollBurdenRate);
}

function cacheForData(data) {
  const cacheKey = data?.orders || data;
  let cache = DATA_CACHES.get(cacheKey);
  if (!cache) {
    cache = {
      filtered: new Map(),
      comparisons: new Map(),
      locations: new Map(),
      menus: new Map(),
      forecasts: new Map()
    };
    DATA_CACHES.set(cacheKey, cache);
  }
  return cache;
}

function filterKey(filters = {}) {
  const range = filters.range || {};
  return [
    range.start || "",
    range.end || "",
    filters.market || "all",
    filters.district || "all",
    filters.locationId || "all",
    filters.brandId || "all",
    filters.channelId || "all"
  ].join("|");
}

function scenarioKey(scenario = {}, weeks = "") {
  return [
    weeks,
    Number(scenario.directMixLift || 0),
    Number(scenario.foodInflation || 0),
    Number(scenario.volumeGrowth || 0),
    Number(scenario.laborEfficiency || 0),
    Number(scenario.refundReduction || 0)
  ].join("|");
}

/*
 * Support rows are exported by date/service area, while product-line and channel filters
 * are flight-leg-level. Allocate base support to the filtered flight-leg set by
 * modeled dispatch minutes so scoped P&Ls stay credible instead of charging one
 * product line or channel for the entire operating desk.
 */
export function filterData(data, filters) {
  const cache = cacheForData(data);
  const key = filterKey(filters);
  if (cache.filtered.has(key)) return cache.filtered.get(key);

  const baseOrders = [];
  const orders = [];
  const baseMinutesByKey = new Map();
  const selectedMinutesByKey = new Map();

  for (const order of data.orders) {
    const location = locationById[order.locationId];
    if (!location) continue;
    if (
      (!filters.range || isDateInRange(order.date, filters.range)) &&
      matches(filters.market, location.market) &&
      matches(filters.district, location.district) &&
      matches(filters.locationId, order.locationId)
    ) {
      baseOrders.push(order);
      addMinutes(baseMinutesByKey, order);
      if (
        matches(filters.brandId, order.brandId) &&
        matches(filters.channelId, order.channelId)
      ) {
        orders.push(order);
        addMinutes(selectedMinutesByKey, order);
      }
    }
  }

  const labor = data.labor.flatMap((row) => {
    const location = locationById[row.locationId];
    if (!location) return [];
    const dateOk = !filters.range || isDateInRange(row.date, filters.range);
    const locationOk =
      dateOk &&
      matches(filters.market, location.market) &&
      matches(filters.district, location.district) &&
      matches(filters.locationId, row.locationId);
    if (!locationOk) return [];

    const key = laborKey(row);
    const selectedMinutes = selectedMinutesByKey.get(key) || 0;
    if (!selectedMinutes) return [];

    const share = safeDivide(selectedMinutes, baseMinutesByKey.get(key) || selectedMinutes);
    return [{
      ...row,
      scheduledHours: row.scheduledHours * share,
      actualHours: row.actualHours * share,
      allocatedShare: share
    }];
  });

  const result = { ...data, orders, labor };
  cache.filtered.set(key, result);
  return result;
}

function addMinutes(totals, order) {
  const key = laborKey(order);
  totals.set(key, (totals.get(key) || 0) + order.laborMinutes);
}

function laborKey(row) {
  return `${row.date}|${row.locationId}`;
}

export function actionLocationMatches(action, filters) {
  const location = locationById[action.locationId];
  return Boolean(
    location &&
      matches(filters.market, location.market) &&
      matches(filters.district, location.district) &&
      matches(filters.locationId, action.locationId)
  );
}

export function matchingLocations(filters) {
  return LOCATIONS.filter((location) =>
    matches(filters.market, location.market) &&
    matches(filters.district, location.district) &&
    matches(filters.locationId, location.id)
  );
}

function matches(filterValue, actualValue) {
  return !filterValue || filterValue === "all" || filterValue === actualValue;
}

function isDateInRange(date, range) {
  return date >= range.start && date <= range.end;
}

function cachedSummary(orders, labor) {
  const laborMap = SUMMARY_CACHES.get(orders);
  return laborMap?.get(labor);
}

function setCachedSummary(orders, labor, summary) {
  let laborMap = SUMMARY_CACHES.get(orders);
  if (!laborMap) {
    laborMap = new WeakMap();
    SUMMARY_CACHES.set(orders, laborMap);
  }
  laborMap.set(labor, summary);
}

export function summarize(orders = EMPTY_ORDERS, labor = EMPTY_LABOR) {
  const orderRows = orders || EMPTY_ORDERS;
  const laborRows = labor || EMPTY_LABOR;
  const cached = cachedSummary(orderRows, laborRows);
  if (cached) return cached;

  let grossSales = 0;
  let discounts = 0;
  let merchantPromo = 0;
  let merchantRefunds = 0;
  let platformRefunds = 0;
  let netSales = 0;
  let platformFees = 0;
  let paymentFees = 0;
  let foodCost = 0;
  let packagingCost = 0;
  let directGrossBookings = 0;
  let quantity = 0;

  for (const order of orderRows) {
    const netRevenue = orderNetRevenue(order);
    grossSales += Number(order.grossSales) || 0;
    discounts += Number(order.discount) || 0;
    merchantPromo += Number(order.merchantPromo) || 0;
    merchantRefunds += Number(order.refundMerchant) || 0;
    platformRefunds += Number(order.refundPlatform) || 0;
    netSales += netRevenue;
    platformFees += Number(order.platformFee) || 0;
    paymentFees += Number(order.paymentFee) || 0;
    foodCost += Number(order.foodCost) || 0;
    packagingCost += Number(order.packagingCost) || 0;
    quantity += Number(order.quantity) || 0;
    if (order.channelId === "direct") directGrossBookings += Number(order.grossSales) || 0;
  }

  let laborExpense = 0;
  for (const row of laborRows) {
    laborExpense += laborCost(row);
  }

  const contributionBeforeLabor = netSales - platformFees - paymentFees - foodCost - packagingCost;
  const contributionMargin = contributionBeforeLabor - laborExpense;
  const orderCount = orderRows.length;

  const summary = {
    grossSales,
    discounts,
    merchantPromo,
    merchantRefunds,
    platformRefunds,
    netSales,
    platformFees,
    paymentFees,
    foodCost,
    packagingCost,
    laborExpense,
    contributionBeforeLabor,
    contributionMargin,
    marginPct: safeDivide(contributionMargin, netSales),
    orderCount,
    quantity,
    directOrderMix: safeDivide(directGrossBookings, grossSales),
    refundRate: safeDivide(merchantRefunds, grossSales),
    effectiveFeeRate: safeDivide(platformFees + paymentFees, netSales),
    laborPerOrder: safeDivide(laborExpense, orderCount),
    cogsRate: safeDivide(foodCost, netSales),
    packagingPerOrder: safeDivide(packagingCost, orderCount),
    aov: safeDivide(netSales, orderCount)
  };
  setCachedSummary(orderRows, laborRows, summary);
  return summary;
}

export function comparePeriods(data, filters) {
  const cache = cacheForData(data);
  const key = filterKey(filters);
  if (cache.comparisons.has(key)) return cache.comparisons.get(key);
  const current = filterData(data, filters);
  const previousRange = shiftRange(filters.range, -rangeLengthDays(filters.range));
  const previous = filterData(data, { ...filters, range: previousRange });
  const comparison = {
    current,
    previous,
    currentSummary: summarize(current.orders, current.labor),
    previousSummary: summarize(previous.orders, previous.labor)
  };
  cache.comparisons.set(key, comparison);
  return comparison;
}

function shiftRange(range, days) {
  if (!range) return null;
  return {
    start: addDays(range.start, days),
    end: addDays(range.end, days)
  };
}

function rangeLengthDays(range) {
  if (!range) return 7;
  const start = new Date(`${range.start}T00:00:00`).getTime();
  const end = new Date(`${range.end}T00:00:00`).getTime();
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

function addDays(date, days) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

export function varianceBridge(currentSummary, previousSummary) {
  const start = previousSummary.marginPct || 0;
  const channelMix = currentSummary.directOrderMix - previousSummary.directOrderMix;
  const feeRate = -(currentSummary.effectiveFeeRate - previousSummary.effectiveFeeRate);
  const refunds = -(currentSummary.refundRate - previousSummary.refundRate);
  const cogs = -(currentSummary.cogsRate - previousSummary.cogsRate);
  const labor = -(safeDivide(currentSummary.laborExpense, currentSummary.netSales) - safeDivide(previousSummary.laborExpense, previousSummary.netSales));
  const end = currentSummary.marginPct || 0;
  const rawDrivers = [
    { id: "channel", label: "channel mix", value: channelMix, driver: channelMix >= 0 ? "app + website mix improved" : "operator network mix increased" },
    { id: "fees", label: "partner selling cost", value: feeRate, driver: feeRate >= 0 ? "effective selling cost improved" : "partner selling cost increased" },
    { id: "refunds", label: "service recovery credits", value: refunds, driver: refunds >= 0 ? "service credit rate improved" : "service recovery credits increased" },
    { id: "cogs", label: "fuel + aircraft cost", value: cogs, driver: cogs >= 0 ? "fleet mix and variable cost improved" : "fuel, crew, or aircraft cost worsened" },
    { id: "labor", label: "dispatch support efficiency", value: labor, driver: labor >= 0 ? "support efficiency improved" : "support hours per flight leg increased" }
  ];
  const residual = end - start - rawDrivers.reduce((total, item) => total + item.value, 0);
  return [
    { id: "start", label: "prior period", value: start, type: "start" },
    ...rawDrivers,
    { id: "other", label: "other", value: residual, driver: "utilization, route mix, yield, and rounding effects" },
    { id: "end", label: "current period", value: end, type: "end" }
  ];
}

export function channelMix(orders) {
  const orderRows = orders || EMPTY_ORDERS;
  if (CHANNEL_MIX_CACHES.has(orderRows)) return CHANNEL_MIX_CACHES.get(orderRows);
  const grouped = orderRows.reduce((groups, order) => {
    const grossBookings = Number(order.grossSales) || 0;
    const row = groups[order.channelId] || {
      id: order.channelId,
      label: channelById[order.channelId]?.name || order.channelId,
      value: 0,
      color: channelById[order.channelId]?.color || "#777",
      orders: 0
    };
    row.value += grossBookings;
    row.orders += 1;
    groups[order.channelId] = row;
    return groups;
  }, {});
  const totalGrossBookings = Object.values(grouped).reduce((total, row) => total + row.value, 0);
  const result = Object.values(grouped)
    .map((row) => ({
      ...row,
      pct: safeDivide(row.value, totalGrossBookings)
    }))
    .sort((a, b) => b.value - a.value);
  CHANNEL_MIX_CACHES.set(orderRows, result);
  return result;
}

export function locationPerformance(data, filters) {
  const cache = cacheForData(data);
  const key = filterKey(filters);
  if (cache.locations.has(key)) return cache.locations.get(key);

  const locations = matchingLocations(filters);
  const previousRange = shiftRange(filters.range, -rangeLengthDays(filters.range));
  const current = filterData(data, filters);
  const previous = filterData(data, { ...filters, range: previousRange });
  const currentOrdersByLocation = groupBy(current.orders, (order) => order.locationId);
  const previousOrdersByLocation = groupBy(previous.orders, (order) => order.locationId);
  const currentLaborByLocation = groupBy(current.labor, (row) => row.locationId);
  const previousLaborByLocation = groupBy(previous.labor, (row) => row.locationId);

  const result = locations.map((location) => {
    const currentOrders = currentOrdersByLocation[location.id] || EMPTY_ORDERS;
    const previousOrders = previousOrdersByLocation[location.id] || EMPTY_ORDERS;
    const currentSummary = summarize(currentOrders, currentLaborByLocation[location.id] || EMPTY_LABOR);
    const previousSummary = summarize(previousOrders, previousLaborByLocation[location.id] || EMPTY_LABOR);
    const delta = currentSummary.marginPct - previousSummary.marginPct;
    const bridge = varianceBridge(currentSummary, previousSummary).filter((item) => item.type !== "start" && item.type !== "end");
    const topDriver = bridge.sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0];
    const riskScore =
      (currentSummary.marginPct < 0.045 ? 3 : currentSummary.marginPct < 0.07 ? 1 : 0) +
      (delta < -0.02 ? 3 : delta < -0.012 ? 1 : 0) +
      (currentSummary.refundRate > 0.012 ? 2 : currentSummary.refundRate > 0.006 ? 1 : 0);
    return {
      ...location,
      summary: currentSummary,
      delta,
      topDriver,
      risk: riskScore >= 5 ? "high" : riskScore >= 2 ? "medium" : "low",
      orders: currentOrders.length,
      previousOrders: previousOrders.length
    };
  }).filter((location) => location.orders + location.previousOrders > 0).sort((a, b) => {
    const order = { high: 3, medium: 2, low: 1 };
    return order[b.risk] - order[a.risk] || a.summary.marginPct - b.summary.marginPct;
  });
  cache.locations.set(key, result);
  return result;
}

export function menuPerformance(data, filters) {
  const cache = cacheForData(data);
  const key = filterKey(filters);
  if (cache.menus.has(key)) return cache.menus.get(key);

  const filtered = filterData(data, filters);
  const grouped = groupBy(filtered.orders, (order) => order.itemId);
  const previous = filterData(data, { ...filters, range: shiftRange(filters.range, -7) });
  const previousGrouped = groupBy(previous.orders, (order) => order.itemId);
  const rows = Object.entries(grouped).map(([itemId, rowsForItem]) => {
    const item = itemById[itemId];
    const previousSummary = summarize(previousGrouped[itemId] || [], []);
    const summary = summarize(rowsForItem, []);
    const unitContribution = safeDivide(summary.contributionBeforeLabor, summary.quantity);
    const marginPct = summary.marginPct || safeDivide(summary.contributionBeforeLabor, summary.netSales);
    return {
      ...item,
      brandName: brandById[item.brand]?.name || item.brand,
      summary,
      unitContribution,
      marginPct,
      delta: marginPct - (previousSummary.marginPct || 0),
      volumeRank: 0,
      recommendation: recommendationForItem(summary, marginPct, rowsForItem.length)
    };
  });

  rows.sort((a, b) => b.summary.quantity - a.summary.quantity).forEach((row, index) => {
    row.volumeRank = index + 1;
  });

  const result = rows.sort((a, b) => a.marginPct - b.marginPct);
  cache.menus.set(key, result);
  return result;
}

function recommendationForItem(summary, marginPct, orderCount) {
  if (orderCount > 35 && marginPct < 0.08) return "review yield / lift mix";
  if (summary.refundRate > 0.006) return "audit recovery";
  if (marginPct > 0.12 && orderCount > 60) return "prioritize demand";
  return "monitor";
}

function forecastWeekIndex(label) {
  const value = Number(String(label).replace(/\D+/g, ""));
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

export function forecastSeries(data, filters, scenario = {}, options = {}) {
  const weeks = Number.isFinite(Number(options.forecastWeeks)) ? Number(options.forecastWeeks) : Number.MAX_SAFE_INTEGER;
  const cache = cacheForData(data);
  const key = `${filterKey(filters)}|${scenarioKey(scenario, weeks)}`;
  if (cache.forecasts.has(key)) return cache.forecasts.get(key);

  const locationIds = new Set(
    LOCATIONS.filter((location) =>
      matches(filters.market, location.market) &&
      matches(filters.district, location.district) &&
      matches(filters.locationId, location.id)
    ).map((location) => location.id)
  );
  const baseActual = filterData(data, { ...filters, brandId: "all", channelId: "all" });
  const segmentActual = matches(filters.brandId, "all") && matches(filters.channelId, "all")
    ? baseActual
    : filterData(data, filters);
  const baseSummary = summarize(baseActual.orders, baseActual.labor);
  const segmentSummary = summarize(segmentActual.orders, segmentActual.labor);
  const revenueShare = boundedShare(segmentSummary.netSales, baseSummary.netSales);
  const orderShare = boundedShare(segmentSummary.orderCount, baseSummary.orderCount);
  const cogsShare = boundedShare(segmentSummary.foodCost, baseSummary.foodCost);
  const laborShare = boundedShare(segmentSummary.laborExpense, baseSummary.laborExpense);
  const segmentMarginOffset = clamp(segmentSummary.marginPct - baseSummary.marginPct, -0.22, 0.22);
  const grouped = groupBy(data.forecast.filter((row) => locationIds.has(row.locationId)), (row) => row.week);
  const scenarioDirectLift = matches(filters.channelId, "all") ? Number(scenario.directMixLift || 0) / 100 : 0;
  const scenarioFoodInflation = Number(scenario.foodInflation || 0) / 100;
  const scenarioVolumeGrowth = Number(scenario.volumeGrowth || 0) / 100;
  const scenarioLaborEfficiency = Number(scenario.laborEfficiency || 0) / 100;
  const scenarioRefundReduction = Number(scenario.refundReduction || 0) / 100;

  const orderedWeeks = Object.entries(grouped).sort(([left], [right]) => forecastWeekIndex(left) - forecastWeekIndex(right));

  const result = orderedWeeks.slice(0, Math.max(1, Math.min(weeks, orderedWeeks.length))).map(([week, rows], index) => {
    const revenue = sum(rows, (row) => row.revenueForecast) * revenueShare * (1 + scenarioVolumeGrowth);
    const baseRevenue = sum(rows, (row) => row.revenueForecast) * revenueShare;
    const orders = sum(rows, (row) => row.ordersForecast) * orderShare * (1 + scenarioVolumeGrowth);
    const cogs = sum(rows, (row) => row.cogsForecast) * cogsShare * (1 + scenarioFoodInflation);
    const baseCogs = sum(rows, (row) => row.cogsForecast) * cogsShare;
    const labor = sum(rows, (row) => row.laborForecast) * laborShare * (1 - scenarioLaborEfficiency);
    const baseLabor = sum(rows, (row) => row.laborForecast) * laborShare;
    const aggregateMarginPct = safeDivide(sum(rows, (row) => row.marginForecast), sum(rows, (row) => row.revenueForecast));
    const baseMarginPct = clamp(aggregateMarginPct + segmentMarginOffset, -0.05, 0.62);
    const baseMargin = baseRevenue * baseMarginPct;
    const scenarioMargin =
      baseMargin +
      revenue * scenarioDirectLift * 0.17 +
      revenue * scenarioRefundReduction * 0.8 -
      (cogs - baseCogs) -
      (labor - baseLabor);
    return {
      week,
      index: index + 1,
      revenue,
      orders,
      cogs,
      labor,
      baseMargin,
      scenarioMargin,
      baseMarginPct,
      scenarioMarginPct: safeDivide(scenarioMargin, revenue),
      confidenceLow: sum(rows, (row) => row.confidenceLow),
      confidenceHigh: sum(rows, (row) => row.confidenceHigh)
    };
  });
  cache.forecasts.set(key, result);
  return result;
}

export function weeklySummary(data, filters, scenario, options = {}) {
  const { currentSummary, previousSummary } = comparePeriods(data, filters);
  const bridge = varianceBridge(currentSummary, previousSummary);
  const drivers = bridge
    .filter((item) => !item.type)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 3);
  const forecast = forecastSeries(data, filters, scenario, {
    forecastWeeks: options.forecastWeeks
  });
  const week13 = forecast.at(-1);
  const forecastWeek = forecast.length ? `week ${forecast.length}` : "upcoming week";
  const actions = data.actions.filter((action) => actionLocationMatches(action, filters));
  const next = actions.length
    ? actions.slice(0, 3).map((action) => `${action.issue} (${formatters.points(action.estimatedImpactPts / 100)} modeled impact).`)
    : ["No operating action is scoped to the current filter; monitor variance drivers before assigning fleet or member-service work."];
  return {
    title: "Weekly flight economics summary",
    period: formatRange(filters.range),
    changed: [
      `Total gross bookings ${deltaText(currentSummary.grossSales, previousSummary.grossSales)} vs ${comparisonNoun(filters.range)}.`,
      `Adjusted contribution margin moved ${formatters.points(currentSummary.marginPct - previousSummary.marginPct)} to ${formatters.percent(currentSummary.marginPct)}.`,
      `App + website mix is ${formatters.percent(currentSummary.directOrderMix)} (${formatters.points(currentSummary.directOrderMix - previousSummary.directOrderMix)}).`
    ],
    why: drivers.map((driver) => `${driver.driver}: ${formatters.points(driver.value)} impact.`),
    next,
    risks: [
      "Partner lift and owner-recovery cost pressure expected over the next 3 weeks.",
      "Fuel, crew, FBO, and handling cost volatility remains elevated.",
      laborRiskLine(filters)
    ],
    forecast: {
      week: forecastWeek,
      base: week13?.baseMarginPct || 0,
      scenario: week13?.scenarioMarginPct || 0,
      upside: (week13?.scenarioMarginPct || 0) - (week13?.baseMarginPct || 0)
    }
  };
}

function laborRiskLine(filters) {
  if (filters.market && filters.market !== "all") return `Weekend dispatch and recovery coverage is below target in ${filters.market}.`;
  if (filters.district && filters.district !== "all") return `Weekend dispatch and recovery coverage is below target in the ${filters.district} region.`;
  return "Weekend dispatch and recovery coverage is below target in the Northeast and Florida.";
}

function comparisonNoun(range) {
  return rangeLengthDays(range) === 7 ? "prior week" : "the prior comparable period";
}

function formatRange(range) {
  if (!range) return "May 5 - May 11, 2026";
  const start = new Date(`${range.start}T00:00:00`);
  const end = new Date(`${range.end}T00:00:00`);
  const includeStartYear = start.getFullYear() !== end.getFullYear();
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(includeStartYear ? { year: "numeric" } : {}) });
  const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startLabel} - ${endLabel}`;
}

function boundedShare(numerator, denominator) {
  if (!denominator) return 1;
  return Math.min(1, Math.max(0.015, numerator / denominator));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function deltaText(current, previous) {
  const delta = safeDivide(current - previous, previous);
  const sign = delta >= 0 ? "increased" : "decreased";
  return `${sign} ${Math.abs(delta * 100).toFixed(1)}%`;
}

function sum(rows, accessor) {
  return rows.reduce((total, row) => total + (Number(accessor(row)) || 0), 0);
}

function groupBy(rows, keyFn) {
  return rows.reduce((groups, row) => {
    const key = keyFn(row);
    groups[key] ||= [];
    groups[key].push(row);
    return groups;
  }, {});
}

function safeDivide(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}
