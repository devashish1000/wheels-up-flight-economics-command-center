import assert from "node:assert/strict";
import { createSampleData } from "../src/data.js";
import {
  channelMix,
  comparePeriods,
  filterData,
  forecastSeries,
  locationPerformance,
  menuPerformance,
  orderContribution,
  orderNetRevenue,
  summarize,
  varianceBridge,
  weeklySummary
} from "../src/calculations.js";
import { parseCsv, toCsv, validateUpload } from "../src/csv.js";

const data = createSampleData();
const filters = {
  range: { start: "2026-05-05", end: "2026-05-11" },
  market: "all",
  district: "all",
  locationId: "all",
  brandId: "all",
  channelId: "all"
};

assert.ok(data.orders.length > 1000, "sample flight legs should be dense enough for dashboards");
assert.ok(data.labor.length > 100, "sample support rows should exist");
assert.ok(
  data.orders.every((order) => order.date <= data.generatedAt.slice(0, 10)),
  "sample actuals should not extend past the visible data-as-of timestamp"
);

const sampleOrder = data.orders[0];
assert.equal(
  Number(orderNetRevenue(sampleOrder).toFixed(2)),
  Number((sampleOrder.grossSales - sampleOrder.discount - sampleOrder.merchantPromo - sampleOrder.refundMerchant).toFixed(2)),
  "net revenue formula should subtract concessions, recovery credits, and service credits"
);
assert.equal(
  Number(orderContribution(sampleOrder).toFixed(2)),
  Number((orderNetRevenue(sampleOrder) - sampleOrder.platformFee - sampleOrder.paymentFee - sampleOrder.foodCost - sampleOrder.packagingCost).toFixed(2)),
  "flight-leg contribution should subtract channel costs, payment/admin costs, variable flight cost, and FBO/handling"
);

const summary = summarize(data.orders, data.labor);
assert.ok(summary.grossSales > 0, "summary gross bookings should be positive");
assert.ok(summary.contributionMargin > 0, "summary contribution margin should be positive");
assert.ok(summary.marginPct > 0.05 && summary.marginPct < 0.5, "margin percent should be realistic");
assert.ok(summary.directOrderMix > 0.05 && summary.directOrderMix < 0.35, "app + website mix should be realistic");

const comparison = comparePeriods(data, filters);
const bridge = varianceBridge(comparison.currentSummary, comparison.previousSummary);
assert.equal(bridge.at(0).type, "start", "variance bridge should start with prior value");
assert.equal(bridge.at(-1).type, "end", "variance bridge should end with current value");

const locations = locationPerformance(data, filters);
assert.equal(locations.length, data.locations.length, "all service areas should appear in performance table");
assert.ok(locations.some((location) => location.risk !== "low"), "risk model should flag at least one attention service area");

const eastServiceAreas = locationPerformance(data, { ...filters, market: "New York", district: "East Primary Service Area" });
assert.ok(eastServiceAreas.length > 0, "filtered P&L should retain matching service areas with activity");
assert.ok(eastServiceAreas.every((location) => location.market === "New York" && location.district === "East Primary Service Area"), "filtered P&L should not show zero-leg nonmatching markets");

const allFiltered = filterData(data, filters);
const brandFiltered = filterData(data, { ...filters, brandId: "signature" });
const allLaborExpense = summarize(allFiltered.orders, allFiltered.labor).laborExpense;
const brandLaborExpense = summarize(brandFiltered.orders, brandFiltered.labor).laborExpense;
assert.ok(brandLaborExpense > 0, "product-line-filtered P&L should include allocated support cost");
assert.ok(brandLaborExpense < allLaborExpense, "product-line-filtered P&L should not absorb full base support cost");
assert.strictEqual(filterData(data, filters), filterData(data, filters), "filtered operating data should be cached by stable filter key");
assert.strictEqual(comparePeriods(data, filters), comparePeriods(data, filters), "period comparisons should be cached by stable filter key");

const menuRows = menuPerformance(data, filters);
assert.equal(menuRows.length, data.menuItems.length, "fleet economics table should include all mission profiles with activity");
assert.ok(menuRows.some((row) => row.recommendation !== "monitor"), "mission recommendations should not be inert");

const forecast = forecastSeries(data, filters, {
  directMixLift: 5,
  foodInflation: 0,
  volumeGrowth: 2,
  laborEfficiency: 1,
  refundReduction: 0.7
});
assert.equal(forecast.length, 104, "forecast should return 104 weeks");
assert.ok(forecast.at(-1).scenarioMarginPct > forecast.at(-1).baseMarginPct, "recommended scenario should improve final week margin");

const summaryText = weeklySummary(data, filters, {
  directMixLift: 5,
  foodInflation: 0,
  volumeGrowth: 2,
  laborEfficiency: 1,
  refundReduction: 0.7
});
assert.ok(summaryText.changed.length >= 3, "weekly summary should include what changed");
assert.ok(summaryText.why.length >= 3, "weekly summary should include variance drivers");

const parityFilters = [
  filters,
  { ...filters, market: "Illinois" },
  { ...filters, market: "New York", district: "East Primary Service Area", locationId: "east-new-york" },
  { ...filters, brandId: "signature" },
  { ...filters, channelId: "direct" },
  { ...filters, range: { start: "2024-05-14", end: "2026-05-11" } }
];

for (const scopedFilters of parityFilters) {
  const scoped = filterData(data, scopedFilters);
  const scopedSummary = summarize(scoped.orders, scoped.labor);
  assert.ok(scopedSummary.netSales >= 0, "scoped summary should never produce negative net sales");
  assert.ok(scopedSummary.marginPct > -0.2 && scopedSummary.marginPct < 0.7, "scoped summary should stay in realistic margin bounds");

  const scopedMix = channelMix(scoped.orders);
  const mixTotal = scopedMix.reduce((total, row) => total + row.value, 0);
  assert.equal(Number(mixTotal.toFixed(2)), Number(scopedSummary.grossSales.toFixed(2)), "channel mix should reconcile to scoped gross bookings");

  const scopedLocations = locationPerformance(data, scopedFilters);
  assert.ok(scopedLocations.every((location) => scopedFilters.market === "all" || location.market === scopedFilters.market), "service-area rows should respect market filters");
  assert.ok(scopedLocations.every((location) => scopedFilters.locationId === "all" || location.id === scopedFilters.locationId), "service-area rows should respect service-area filters");

  const scopedMenu = menuPerformance(data, scopedFilters);
  assert.ok(scopedMenu.every((row) => row.summary.netSales >= 0), "fleet economics rows should retain valid mission economics after filtering");

  const scopedForecast = forecastSeries(data, scopedFilters, {
    directMixLift: 5,
    foodInflation: 0,
    volumeGrowth: 2,
    laborEfficiency: 1,
    refundReduction: 0.7
  });
  assert.ok(scopedForecast.length > 0 && scopedForecast.length <= 104, "forecast should remain populated for scoped filters");
}

const csv = toCsv([{ date: "2026-05-11", service_area: "New York service area", product_line: "Wheels Up Signature Membership", channel: "Wheels Up app + website", aircraft_mission: "Phenom 300 series Signature flight", flight_legs: 1, gross_bookings: 24800 }]);
const parsed = parseCsv(csv);
assert.equal(parsed[0].gross_bookings, 24800, "CSV parser should coerce numeric fields");
assert.equal(validateUpload("orders", parsed).ok, true, "sample flight-leg CSV should validate");
const formulaSafeCsv = toCsv([{ date: "2026-05-11", gross_bookings: 24800, service_area: "=New York", channel: "+Wheels Up app" }]);
assert.ok(/'=New York/.test(formulaSafeCsv) && /'\+Wheels Up app/.test(formulaSafeCsv), "CSV exporter should neutralize formula-like values");

console.log("calculation smoke tests passed");
