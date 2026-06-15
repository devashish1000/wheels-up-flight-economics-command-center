import { BRANDS, CHANNELS, LOCATIONS, MENU_ITEMS, createSampleData, toSampleCsv } from "./data.js";
import {
  channelMix,
  comparePeriods,
  filterData,
  forecastSeries,
  formatters,
  locationPerformance,
  menuPerformance,
  summarize,
  varianceBridge,
  weeklySummary
} from "./calculations.js";
import { renderBarTrend, renderDonut, renderForecast, renderSparkline, renderWaterfall } from "./charts.js";
import { parseCsv, validateUpload } from "./csv.js";
import { buildActionCsv, copySummary, downloadSummary, exportRows, exportWorkbook } from "./export.js";

const app = document.querySelector("#app");
const sampleData = createSampleData();
const storedActions = JSON.parse(localStorage.getItem("wheels-up-actions") || "{}");
const TOUR_DISMISSED_KEY = "wheels-up-tour-dismissed-v1";
const TOUR_COMPLETED_KEY = "wheels-up-tour-completed-v1";
const DEFAULT_SAVED_VIEWS = [
  { name: "CFO weekly readout", type: "preset" },
  { name: "East service-area reliability", type: "preset" },
  { name: "dispatch daily queue", type: "preset" },
  { name: "fleet economics - low yield", type: "preset" }
];
const customSavedViews = JSON.parse(localStorage.getItem("wheels-up-saved-views") || "[]");

const DATE_RANGES = {
  current: { start: "2026-05-05", end: "2026-05-11", label: "May 5 - May 11, 2026" },
  prior: { start: "2026-04-28", end: "2026-05-04", label: "Apr 28 - May 4, 2026" },
  last4: { start: "2026-04-14", end: "2026-05-11", label: "Last 4 weeks" },
  last8: { start: "2026-03-17", end: "2026-05-11", label: "Last 8 weeks" },
  last13: { start: "2026-02-10", end: "2026-05-11", label: "Last 13 weeks" },
  last26: { start: "2025-11-11", end: "2026-05-11", label: "Last 26 weeks" },
  last52: { start: "2025-05-13", end: "2026-05-11", label: "Last 52 weeks" },
  last78: { start: "2024-11-12", end: "2026-05-11", label: "Last 78 weeks" },
  last104: { start: "2024-05-14", end: "2026-05-11", label: "Last 104 weeks" }
};

const DATE_OPTIONS = Object.entries(DATE_RANGES).map(([key, range]) => [key, range.label]);
const FORECAST_WEEK_OPTIONS = [8, 13, 26, 52, 78, 104];
const TOUR_STEPS = [
  {
    target: "overview-filters",
    title: "Set the operating lens",
    body: "Choose the date range, market, service region, service area, product line, sales channel, and forecast horizon for the full workspace.",
    why: "Keeps finance and operations aligned on the same scoped readout.",
    view: "overview"
  },
  {
    target: "overview-kpis",
    title: "Read the week at a glance",
    body: "Start with total gross bookings, adjusted contribution, flight legs, app + website mix, and service credit rate. Each card pairs current performance with movement versus the comparison period.",
    why: "Shows whether margin moved because of demand, mix, cost, recovery, or fleet efficiency.",
    view: "overview"
  },
  {
    target: "overview-variance-bridge",
    title: "Isolate the margin drivers",
    body: "The bridge decomposes CM% movement into controllable drivers and highlights the largest contributors in the callout below.",
    why: "Turns a margin change into an explainable operating story.",
    view: "overview"
  },
  {
    target: "overview-channel-mix",
    title: "Check channel economics",
    body: "The donut and legend show where gross bookings are coming from by sales channel, including flight-leg count and booking contribution.",
    why: "Channel shift can materially change partner lift, service recovery, and adjusted contribution.",
    view: "overview"
  },
  {
    target: "overview-location-attention",
    title: "Focus the market review",
    body: "This panel surfaces service areas above the watch threshold with CM%, movement versus prior, risk level, and top driver.",
    why: "Prioritizes leadership attention without scanning every service-area focus.",
    view: "overview"
  },
  {
    target: "overview-forecast",
    title: "Preview forward margin",
    body: "The rolling forecast compares actuals, base forecast, and the selected scenario preset over the active horizon.",
    why: "Connects current performance to forward margin expectations.",
    view: "overview"
  },
  {
    target: "overview-weekly-summary",
    title: "Package the leadership readout",
    body: "The weekly summary turns the analysis into a send-ready finance brief, with copy and Excel export paths close at hand.",
    why: "Closes the loop from diagnosis to a practical leadership handoff.",
    view: "overview"
  }
];

const state = {
  view: "overview",
  filters: {
    range: rangeForKey("current"),
    market: "all",
    district: "all",
    locationId: "all",
    brandId: "all",
    channelId: "all"
  },
  scenario: {
    directMixLift: 5,
    foodInflation: 0,
    volumeGrowth: 2,
    laborEfficiency: 1,
    refundReduction: 0.7
  },
  scenarioPreset: "custom",
  menuSort: "marginAsc",
  forecastWeeks: 104,
  uploadRows: [],
  uploadKind: "orders",
  uploadMeta: { attempted: false, fileName: "", rowCount: 0 },
  moreOpen: false,
  tour: {
    active: false,
    promptOpen: false,
    step: 0,
    focusPending: false
  },
  toast: ""
};
let renderFrame = 0;
let chartFrame = 0;
let tourFrame = 0;
let globalEventsBound = false;

const nav = [
  { id: "overview", label: "executive overview", icon: "home" },
  { id: "pnl", label: "service-area P&L", icon: "ledger" },
  { id: "menu", label: "fleet economics", icon: "grid" },
  { id: "forecast", label: "rolling forecast", icon: "trend" },
  { id: "actions", label: "operating actions", icon: "user" },
  { id: "summary", label: "weekly summary", icon: "calendar" },
  { id: "upload", label: "data upload", icon: "upload" },
  { id: "dictionary", label: "data dictionary", icon: "book" }
];

const locationById = Object.fromEntries(LOCATIONS.map((location) => [location.id, location]));
const brandById = Object.fromEntries(BRANDS.map((brand) => [brand.id, brand]));
const channelById = Object.fromEntries(CHANNELS.map((channel) => [channel.id, channel]));
const LEGACY_LOCATION_MAP = {
  "aus-south": "aus-frontage",
  "chi-west": "chi-rockwell",
  "hou-midtown": "hou-blodgett",
  "dal-north": "dal-commerce",
  "phx-central": "tempe-alton",
  "mia-beach": "la-culver",
  "den-rino": "sf-soma"
};
const LEGACY_REGION_MAP = {
  ATX: "Texas",
  DAL: "Texas",
  HOU: "Texas",
  CHI: "Illinois",
  LA1: "Southern California",
  PHX: "Arizona",
  MIA: "Southern California",
  DEN: "Northern California"
};

function currentActions() {
  return sampleData.actions
    .filter((action) => locationMatchesFilters(locationById[action.locationId], state.filters))
    .map((action) => ({
      ...action,
      status: storedActions[action.id] || action.status,
      locationName: locationById[action.locationId]?.name || action.locationId
    }));
}

function savedViews() {
  return [...DEFAULT_SAVED_VIEWS, ...customSavedViews];
}

function render() {
  app.innerHTML = `
    <aside class="sidebar">
      <div class="brand-block">
        <div class="wordmark">wheels up</div>
        <div class="product-name">flight economics command center</div>
      </div>
      <nav class="nav-list" aria-label="Primary">
        ${nav.map((item) => `
          <button class="nav-item ${state.view === item.id ? "active" : ""}" data-nav-view="${item.id}" data-view="${item.id}" aria-label="${item.label}" title="${item.label}">
            ${icon(item.icon)}
            <span>${item.label}</span>
          </button>
        `).join("")}
      </nav>
      <div class="saved-views">
        <div class="saved-heading">saved views <span>⌃</span></div>
        ${savedViews().map((item) => `
          <button class="saved-view" data-saved="${escapeHtml(item.name)}">${icon("dot")}${escapeHtml(item.name)}</button>
        `).join("")}
      </div>
      <div class="profile-block">
        <div class="avatar">AO</div>
        <div>
          <strong>aviation ops</strong>
          <span>finance + reliability workspace</span>
        </div>
        ${icon("chevron")}
      </div>
    </aside>
    <main class="main">
      ${renderTopbar()}
      <section class="disclosure" aria-label="Prototype data disclosure">
        Public-source-aligned Wheels Up service areas, offerings, channels, fleet categories, and key metric scale; financial and operating values are modeled sample data, not actual Wheels Up data.
      </section>
      <section id="view-root" class="view-root">${renderView()}</section>
    </main>
    <div class="toast ${state.toast ? "show" : ""}">${escapeHtml(state.toast)}</div>
    ${renderTourPrompt()}
    ${renderTourLayer()}
  `;
  bindShellEvents();
  queueTourPosition();
  if (chartFrame) window.cancelAnimationFrame(chartFrame);
  chartFrame = window.requestAnimationFrame(() => {
    chartFrame = 0;
    try {
      renderCharts();
    } catch (error) {
      console.error("Chart render failed", error);
    }
  });
}

function scheduleRender() {
  if (renderFrame) return;
  renderFrame = window.requestAnimationFrame(() => {
    renderFrame = 0;
    render();
  });
}

function hydrateStateFromUrl() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");
  if (view && nav.some((item) => item.id === view)) {
    state.view = view;
  }

  const rangeKey = params.get("range");
  if (rangeKey && DATE_OPTIONS.some(([key]) => key === rangeKey)) {
    state.filters.range = rangeForKey(rangeKey);
  }

  const rangeStart = params.get("rangeStart");
  const rangeEnd = params.get("rangeEnd");
  if (rangeStart && rangeEnd && /^\d{4}-\d{2}-\d{2}$/.test(rangeStart) && /^\d{4}-\d{2}-\d{2}$/.test(rangeEnd)) {
    state.filters.range = { start: rangeStart, end: rangeEnd };
  }

  const forecastWeeks = Number(params.get("forecastWeeks"));
  if (Number.isFinite(forecastWeeks) && FORECAST_WEEK_OPTIONS.includes(forecastWeeks)) {
    state.forecastWeeks = forecastWeeks;
  }

  const filters = [
    ["market", "all", ["market"]],
    ["district", "all", ["region", "district"]],
    ["locationId", "all", ["location", "locationId"]],
    ["brandId", "all", ["brand", "brandId"]],
    ["channelId", "all", ["channel", "channelId"]]
  ];
  filters.forEach(([key, fallback, paramNames]) => {
    const value = paramNames.map((param) => params.get(param)).find(Boolean);
    if (value) state.filters[key] = value;
    if (!state.filters[key]) state.filters[key] = fallback;
  });
  normalizePublicFilters();

  const validMarkets = new Set(LOCATIONS.map((location) => location.market));
  const validDistricts = new Set(
    LOCATIONS
      .filter((location) => state.filters.market === "all" || location.market === state.filters.market)
      .map((location) => location.district)
  );
  const validLocations = new Set(
    LOCATIONS
      .filter((location) =>
        (state.filters.market === "all" || location.market === state.filters.market) &&
        (state.filters.district === "all" || location.district === state.filters.district)
      )
      .map((location) => location.id)
  );
  const validBrands = new Set(BRANDS.map((brand) => brand.id));
  const validChannels = new Set(CHANNELS.map((channel) => channel.id));

  if (!validMarkets.has(state.filters.market)) state.filters.market = "all";
  if (!validDistricts.has(state.filters.district)) state.filters.district = "all";
  if (!validLocations.has(state.filters.locationId)) state.filters.locationId = "all";
  if (!validBrands.has(state.filters.brandId)) state.filters.brandId = "all";
  if (!validChannels.has(state.filters.channelId)) state.filters.channelId = "all";
  if (state.filters.locationId !== "all" && locationById[state.filters.locationId]) {
    state.filters.market = locationById[state.filters.locationId].market;
    state.filters.district = locationById[state.filters.locationId].district;
  }
  if (params.get("tour") === "1") {
    state.view = "overview";
    state.tour = { ...state.tour, active: true, promptOpen: false, step: 0, focusPending: true };
  } else if (!storedFlag(TOUR_DISMISSED_KEY) && !storedFlag(TOUR_COMPLETED_KEY)) {
    state.tour.promptOpen = true;
  }
  state.filters = {
    ...state.filters,
    market: state.filters.market || "all",
    district: state.filters.district || "all",
    locationId: state.filters.locationId || "all",
    brandId: state.filters.brandId || "all",
    channelId: state.filters.channelId || "all"
  };
}

function normalizePublicFilters(filters = state.filters) {
  filters.locationId = LEGACY_LOCATION_MAP[filters.locationId] || filters.locationId || "all";
  filters.district = LEGACY_REGION_MAP[filters.district] || filters.district || "all";
  const location = locationById[filters.locationId];
  if (location) {
    filters.market = location.market;
    filters.district = location.district;
  }
  return filters;
}

function renderTopbar() {
  const districts = districtOptionsForFilters(state.filters);
  const locations = locationOptionsForFilters(state.filters);
  const showForecastWeeks = ["overview", "forecast", "summary"].includes(state.view);
  return `
    <header class="topbar">
      <div class="filters" data-tour="overview-filters">
        ${selectControl("date range", "range", rangeKey(), DATE_OPTIONS)}
        ${selectControl("market", "market", state.filters.market, [["all", "all"], ...uniqueOptions(LOCATIONS, "market")])}
        ${selectControl("service region", "district", state.filters.district, [["all", "all"], ...districts.map((district) => [district, district])])}
        ${selectControl("service area", "locationId", state.filters.locationId, [["all", "all"], ...locations.map((l) => [l.id, l.name])])}
        ${selectControl("product line", "brandId", state.filters.brandId, [["all", "all"], ...BRANDS.map((b) => [b.id, b.name])])}
        ${selectControl("sales channel", "channelId", state.filters.channelId, [["all", "all"], ...CHANNELS.map((c) => [c.id, c.name])])}
        ${showForecastWeeks ? selectControl("forecast horizon", "forecastWeeks", String(state.forecastWeeks), FORECAST_WEEK_OPTIONS.map((weeks) => [String(weeks), `${weeks}-week`])) : ""}
      </div>
      <div class="top-actions">
        <span class="fresh-dot"></span>
        <div class="as-of">data as of<br><strong>May 11, 2026 8:30 AM</strong></div>
        <button class="utility-btn" data-action="reset">${icon("refresh")} reset</button>
        <button class="utility-btn" data-action="save">${icon("bookmark")} save view</button>
        <button class="utility-btn guide-btn" data-action="start-tour" aria-label="Start guided tour" title="Start guided tour">${icon("info")}<span>guide</span></button>
        <div class="more-wrap">
          <button class="utility-btn icon-only" data-action="more" title="More options" aria-expanded="${state.moreOpen ? "true" : "false"}">${icon("more")}</button>
          ${state.moreOpen ? `
            <div class="more-menu" role="menu" aria-label="More actions">
              <button data-action="copy-summary" role="menuitem">${icon("copy")} Copy weekly readout</button>
              <button data-action="download-summary" role="menuitem">${icon("download")} Download readout Excel</button>
              <button data-action="download-samples" role="menuitem">${icon("download")} Download sample workbook</button>
              <button data-action="start-tour" role="menuitem">${icon("info")} Start guided tour</button>
              <button data-link-view="upload" data-view="upload" role="menuitem">${icon("upload")} Open data upload</button>
              <button data-link-view="dictionary" data-view="dictionary" role="menuitem">${icon("book")} Open dictionary</button>
            </div>
          ` : ""}
        </div>
      </div>
    </header>
  `;
}

function renderView() {
  const views = {
    overview: renderOverview,
    pnl: renderPnl,
    menu: renderMenu,
    forecast: renderForecastView,
    actions: renderActions,
    summary: renderSummary,
    upload: renderUpload,
    dictionary: renderDictionary
  };
  return views[state.view]();
}

function renderTourPrompt() {
  if (!state.tour.promptOpen || state.tour.active) return "";
  return `
    <section class="tour-welcome" role="dialog" aria-modal="false" aria-labelledby="tour-welcome-title" aria-describedby="tour-welcome-body">
      <button class="tour-close" data-action="dismiss-tour" aria-label="Close guided tour prompt">${icon("close")}</button>
      <span class="tour-kicker">guided tour</span>
      <h2 id="tour-welcome-title">Want a 90-second walkthrough?</h2>
      <p id="tour-welcome-body">See how the filters, margin bridge, channel mix, forecast, and flight economics readout work together. You can skip it and reopen it anytime from Guide.</p>
      <div class="tour-actions">
        <button class="primary-btn" data-action="start-tour">${icon("info")} Start tour</button>
        <button class="utility-btn" data-action="dismiss-tour">Explore myself</button>
      </div>
    </section>
  `;
}

function renderTourLayer() {
  if (!state.tour.active) return "";
  const step = activeTourStep();
  const isLast = state.tour.step === TOUR_STEPS.length - 1;
  return `
    <div class="tour-layer" data-tour-layer>
      <div class="tour-highlight" data-tour-highlight aria-hidden="true"></div>
      <section class="tour-card" data-tour-card role="dialog" aria-modal="false" aria-labelledby="tour-title" aria-describedby="tour-body">
        <button class="tour-close" data-action="close-tour" aria-label="Close guided tour">${icon("close")}</button>
        <div class="tour-card-header">
          <span class="tour-kicker" aria-live="polite">Step ${state.tour.step + 1} of ${TOUR_STEPS.length}</span>
          <div class="tour-progress" aria-hidden="true">
            ${TOUR_STEPS.map((_, index) => `<i class="${index === state.tour.step ? "active" : ""}"></i>`).join("")}
          </div>
        </div>
        <h2 id="tour-title">${step.title}</h2>
        <p id="tour-body">${step.body}</p>
        <p class="tour-why"><strong>Why it matters:</strong> ${step.why}</p>
        <div class="tour-actions">
          <button class="utility-btn" data-action="skip-tour">Skip</button>
          <button class="utility-btn" data-action="tour-back" ${state.tour.step === 0 ? "disabled" : ""}>Back</button>
          <button class="primary-btn" data-action="tour-next">${isLast ? "Done" : "Next"}</button>
        </div>
      </section>
    </div>
  `;
}

function renderOverview() {
  const comparison = comparePeriods(sampleData, state.filters);
  const { currentSummary, previousSummary } = comparison;
  const bridge = varianceBridge(currentSummary, previousSummary);
  const locations = locationPerformance(sampleData, state.filters);
  const actions = currentActions();
  const summary = weeklySummary(
    { ...sampleData, actions },
    state.filters,
    state.scenario,
    { forecastWeeks: state.forecastWeeks }
  );
  const forecast = forecastSeries(sampleData, state.filters, state.scenario, {
    forecastWeeks: state.forecastWeeks
  });
  const menuRows = menuPerformance(sampleData, state.filters);
  const mixRows = channelMix(comparison.current.orders);
  const attentionRows = locations.filter((location) => location.risk !== "low");
  const hasCurrentActivity = comparison.current.orders.length > 0;
  const comparisonText = comparisonLabel();

  return `
    <div class="metric-row" data-tour="overview-kpis">
      ${metricCard("total gross bookings", currentSummary.grossSales, previousSummary.grossSales, "currency", "bad", false, comparisonText)}
      ${metricCard("adjusted contribution", currentSummary.contributionMargin, previousSummary.contributionMargin, "currency", "good", false, comparisonText)}
      ${metricCard("adjusted CM %", currentSummary.marginPct, previousSummary.marginPct, "percent", "bad", false, comparisonText)}
      ${metricCard("flight legs", currentSummary.orderCount, previousSummary.orderCount, "number", "bad", false, comparisonText)}
      ${metricCard("app + website mix", currentSummary.directOrderMix, previousSummary.directOrderMix, "percent", "good", false, comparisonText)}
      ${metricCard("service credit rate", currentSummary.refundRate, previousSummary.refundRate, "percent", "bad", true, comparisonText)}
    </div>
    <div class="dashboard-grid overview-grid">
      <article class="panel span-5" data-tour="overview-variance-bridge">
        <div class="panel-header">
          <div><h2>margin variance bridge <span>(adjusted CM %)</span></h2><p>${comparisonText}</p></div>
          ${icon("info")}
        </div>
        <div id="waterfall" class="chart-host"></div>
        <div class="insight-callout">
          ${icon("arrowDown")}
          <div><strong>Adjusted contribution ${currentSummary.marginPct < previousSummary.marginPct ? "decreased" : "improved"} ${formatters.points(currentSummary.marginPct - previousSummary.marginPct)}.</strong><br>
          Main drivers: ${bridge.filter((b) => !b.type).sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 2).map((d) => `${d.label} ${formatters.points(d.value)}`).join(", ")}.</div>
          <button class="link-btn" data-link-view="pnl" data-view="pnl">view full bridge</button>
        </div>
      </article>
      <article class="panel span-4" data-tour="overview-channel-mix">
        <div class="panel-header"><div><h2>gross bookings mix by channel</h2><p>% of modeled total gross bookings</p></div></div>
        <div class="donut-layout">
          <div id="donut" class="chart-host"></div>
          ${channelLegend(mixRows)}
        </div>
        <div class="note-line">${icon("search")} App + website mix ${currentSummary.directOrderMix > previousSummary.directOrderMix ? "improved" : "declined"} ${formatters.points(currentSummary.directOrderMix - previousSummary.directOrderMix)} ${comparisonText}.</div>
      </article>
      <article class="panel span-3" data-tour="overview-location-attention">
        <div class="panel-header">
          <div><h2>service areas needing attention <span class="badge danger">${attentionRows.length}</span></h2></div>
          <button class="link-btn" data-link-view="pnl" data-view="pnl">view all</button>
        </div>
        ${attentionList(attentionRows.slice(0, 4), hasCurrentActivity)}
      </article>
      <article class="panel span-5" data-tour="overview-forecast">
        <div class="panel-header">
          <div><h2>${forecast.length ? `${forecast.length}-week rolling forecast` : "rolling forecast"}</h2><p>actual, base forecast, and scenario</p></div>
          <select class="mini-select" data-scenario-preset>
            <option value="custom" ${state.scenarioPreset === "custom" ? "selected" : ""}>scenario</option>
            <option value="base" ${state.scenarioPreset === "base" ? "selected" : ""}>base</option>
            <option value="direct" ${state.scenarioPreset === "direct" ? "selected" : ""}>+direct mix</option>
            <option value="cost" ${state.scenarioPreset === "cost" ? "selected" : ""}>cost pressure</option>
          </select>
        </div>
        <div class="forecast-layout">
          <div id="forecast-chart" class="chart-host"></div>
          ${forecastCard(forecast)}
        </div>
      </article>
      <article class="panel span-4" data-tour="overview-actions">
        <div class="panel-header">
          <div><h2>operating action queue <span class="badge danger">${actions.filter((a) => a.status !== "done").length}</span></h2></div>
          <button class="link-btn" data-link-view="actions" data-view="actions">view all</button>
        </div>
        ${compactActionList(actions.slice(0, 5))}
      </article>
      <article class="panel span-3" data-tour="overview-weekly-summary">
        ${summaryPanel(summary)}
      </article>
      <article class="panel span-12" data-tour="overview-menu-spotlight">
        <div class="panel-header"><div><h2>fleet economics spotlight</h2><p>high-yield missions vs. margin pressure</p></div><button class="link-btn" data-link-view="menu" data-view="menu">view full fleet economics -></button></div>
        ${menuSpotlight(menuRows)}
      </article>
    </div>
  `;
}

function renderPnl() {
  const comparison = comparePeriods(sampleData, state.filters);
  const locations = locationPerformance(sampleData, state.filters);
  const bridge = varianceBridge(comparison.currentSummary, comparison.previousSummary);
  const locationPanel = locations.length
    ? locationTable(locations, false)
    : emptyState("No service-area activity found for this filter set.");
  return `
    <div class="section-heading"><div><h1>service area + region P&L</h1><p>Transparent adjusted contribution by public service area, market, channel, and controllable flight-cost driver.</p></div>${exportButton("service-area-performance")}</div>
    <div class="dashboard-grid">
      <article class="panel span-8"><div class="panel-header"><div><h2>variance bridge</h2><p>Current period vs prior period</p></div></div><div id="pnl-waterfall" class="chart-host large"></div></article>
      <article class="panel span-4">${driverStack(bridge)}</article>
      <article class="panel span-12"><div class="panel-header"><div><h2>service-area operating table</h2><p>Risk uses adjusted CM%, margin movement, and service-credit spikes.</p></div></div>${locationPanel}</article>
    </div>
  `;
}

function renderMenu() {
  let rows = menuPerformance(sampleData, state.filters);
  rows = sortMenu(rows);
  const menuPanel = rows.length
    ? menuTable(rows)
    : emptyState("No mission rows match the selected filters.");
  return `
    <div class="section-heading"><div><h1>aircraft + mission economics</h1><p>Find high-volume low-margin missions, recovery-heavy trip profiles, and yield opportunities.</p></div>${exportButton("fleet-economics")}</div>
    <div class="menu-hero panel">
      <img src="./assets/aviation-strip.png" alt="Synthetic private aviation operating scenes used as sample fleet context" />
      <div><strong>Aviation imagery is synthetic and non-official.</strong><span>All economics are calculated from modeled flight-leg data.</span></div>
      <select class="mini-select" data-menu-sort>
        <option value="marginAsc" ${state.menuSort === "marginAsc" ? "selected" : ""}>lowest margin first</option>
        <option value="volumeDesc" ${state.menuSort === "volumeDesc" ? "selected" : ""}>most flight legs first</option>
        <option value="refundDesc" ${state.menuSort === "refundDesc" ? "selected" : ""}>recovery-heavy first</option>
      </select>
    </div>
    <div class="dashboard-grid menu-page-grid">
      <article class="panel span-5"><div class="panel-header"><div><h2>margin by mission</h2><p>Net contribution before base support allocation</p></div></div><div id="menu-bars" class="chart-host"></div></article>
      <article class="panel span-7"><div class="panel-header"><div><h2>mission economics</h2><p>Revenue, variable flight cost, FBO/handling, channel cost, and recommendations.</p></div></div>${menuPanel}</article>
    </div>
  `;
}

function renderForecastView() {
  const series = forecastSeries(sampleData, state.filters, state.scenario, {
    forecastWeeks: state.forecastWeeks
  });
  const weekSpan = series.length || 0;
  return `
    <div class="section-heading"><div><h1>rolling forecast</h1><p>${weekSpan ? `${weekSpan}-week` : "long-horizon"} forecast with scenario controls for app + website mix, fuel cost, flight-leg volume, support efficiency, and service-credit improvement.</p></div>${exportButton("rolling-forecast")}</div>
    <div class="dashboard-grid">
      <article class="panel span-8"><div class="panel-header"><div><h2>base vs scenario adjusted CM%</h2><p>Modeled trajectory from current sample aviation operating drivers.</p></div></div><div id="forecast-detail-chart" class="chart-host large"></div></article>
      <article class="panel span-4">${scenarioControls(series)}</article>
      <article class="panel span-12">${forecastTable(series)}</article>
    </div>
  `;
}

function renderActions() {
  const actions = currentActions();
  const actionsPanel = actions.length ? actionTable(actions, true) : emptyState("No actions match the current filter set.");
  return `
    <div class="section-heading"><div><h1>operating action queue</h1><p>Modeled evidence actions that tie P&L movement to fleet reliability, dispatch, and member service execution.</p></div>${exportButton("operating-actions")}</div>
    <div class="dashboard-grid">
      <article class="panel span-12 action-summary-panel">${actionStats(actions)}</article>
      <article class="panel span-12">${actionsPanel}</article>
    </div>
  `;
}

function renderSummary() {
  const summary = weeklySummary(
    { ...sampleData, actions: currentActions() },
    state.filters,
    state.scenario,
    { forecastWeeks: state.forecastWeeks }
  );
  return `
    <div class="section-heading"><div><h1>weekly flight economics summary</h1><p>A send-ready internal summary for finance, operations, dispatch, and market leaders.</p></div><div class="section-actions"><button class="utility-btn" data-action="copy-summary">${icon("copy")} copy summary</button><button class="primary-btn" data-action="download-summary">${icon("download")} Excel report</button></div></div>
    <div class="dashboard-grid">
      <article class="panel span-12 summary-meta-panel">${summaryMetaStrip(summary)}</article>
      <article class="panel span-8 summary-document">${summaryDocument(summary)}</article>
      <article class="panel span-4">${forecastUpdate(summary)}</article>
    </div>
  `;
}

function renderUpload() {
  const validation = state.uploadRows.length
    ? validateUpload(state.uploadKind, state.uploadRows)
    : {
        ok: false,
        missing: [],
        invalid: state.uploadMeta.attempted ? ["No data rows found after the header row. Add at least one data row before mapping."] : [],
        rowCount: 0
      };
  const hasUploadAttempt = state.uploadMeta.attempted;
  const validationSubtitle = hasUploadAttempt
    ? `${state.uploadMeta.rowCount} rows parsed${state.uploadMeta.fileName ? ` from ${state.uploadMeta.fileName}` : ""}`
    : "No file uploaded yet";
  return `
    <div class="section-heading"><div><h1>data upload</h1><p>Validate CSV exports before connecting real booking, flight-leg, dispatch-support, cost, and forecast files.</p></div><button class="primary-btn" data-action="download-samples">${icon("download")} sample workbook</button></div>
    <div class="dashboard-grid">
      <article class="panel span-5">
        <div class="panel-header"><div><h2>upload CSV</h2><p>Prototype parser validates schema and previews rows.</p></div></div>
        <label class="field-label">data type</label>
        <select class="input" data-upload-kind>
          ${[
            ["orders", "flight legs"],
            ["labor", "support hours"],
            ["forecast", "forecast"],
            ["menu", "aircraft economics"]
          ].map(([value, label]) => `<option value="${value}" ${state.uploadKind === value ? "selected" : ""}>${label}</option>`).join("")}
        </select>
        <label class="upload-zone">
          ${icon("upload")}
          <strong>Choose CSV file</strong>
          <span>Flight legs, aircraft economics, support hours, or forecast exports</span>
          <input type="file" accept=".csv,text/csv" data-upload-file />
        </label>
        ${uploadGuide(state.uploadKind)}
      </article>
      <article class="panel span-7">
        <div class="panel-header"><div><h2>validation result</h2><p>${validationSubtitle}</p></div></div>
        ${hasUploadAttempt ? `
          <div class="validation ${validation.ok ? "ok" : "bad"}">${validation.ok ? "Schema ready for mapping." : validationMessage(validation)}</div>
          ${state.uploadRows.length ? previewTable(state.uploadRows.slice(0, 8)) : uploadNoRowsState()}
        ` : emptyState("Upload a CSV to verify headers, row count, and sample values before mapping.")}
      </article>
    </div>
  `;
}

function renderDictionary() {
  const groups = [
    {
      title: "finance",
      rows: [
        ["Total Gross Bookings", "Modeled gross spend for private jet, group charter, cargo, and related flight services before internal cost allocation."],
        ["Adjusted contribution", "Modeled gross bookings minus partner selling cost, payment/admin cost, fuel/crew/aircraft cost, FBO/handling, and allocated support."],
        ["Service credit rate", "Modeled service credits divided by gross flight-leg bookings."],
        ["Effective selling cost", "Operator-network, referral, sales, service, and payment/admin cost divided by gross bookings."]
      ]
    },
    {
      title: "forecast",
      rows: [
        ["Rolling forecast", "Weekly revenue, flight-leg, variable cost, support cost, and margin targets over the selected horizon."],
        ["Scenario CM%", "Forecast margin adjusted for app + website mix lift, fuel cost pressure, flight-leg growth, support efficiency, and service-credit improvement."],
        ["Upside", "Scenario CM% minus base CM% for the active forecast horizon."]
      ]
    },
    {
      title: "operations",
      rows: [
        ["App + website mix", "Wheels Up app + website gross bookings divided by total modeled gross bookings."],
        ["Variance bridge", "Change in adjusted CM% decomposed into channel mix, selling cost, service credits, variable flight cost, support efficiency, and residual drivers."],
        ["Operating action", "A service-area recommendation with owner, due date, evidence, and modeled margin impact."]
      ]
    }
  ];
  return `
    <div class="section-heading"><div><h1>data dictionary</h1><p>Finance and operating definitions are visible so dispatch, finance, and market leaders can trust the recommendations.</p></div></div>
    <div class="dashboard-grid">
      <article class="panel span-12">${definitionGroups(groups)}</article>
    </div>
  `;
}

function metricCard(label, current, previous, type, tone, inverse = false, comparisonText = "vs prior period") {
  const hasComparablePeriod = type === "percent" || previous > 0;
  const delta = type === "percent" ? current - previous : (previous > 0 ? (current - previous) / previous : 0);
  const good = hasComparablePeriod ? (inverse ? delta < 0 : delta >= 0) : false;
  const value = type === "currency" ? formatters.currency(current, true) : type === "percent" ? formatters.percent(current) : formatters.number(current);
  const previousValue = type === "currency" ? formatters.currency(previous, true) : type === "percent" ? formatters.percent(previous) : formatters.number(previous);
  const deltaText = hasComparablePeriod
    ? (type === "percent" ? formatters.points(delta) : `${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(1)}%`)
    : "N/A";
  const trend = Array.from({ length: 16 }, (_, i) => current * (0.88 + Math.sin(i / 2 + label.length) * 0.03 + i * (good ? 0.008 : -0.005)));
  return `
    <article class="metric-card">
      <div><span>${label}</span><strong>${value}</strong><em class="${good ? "good" : hasComparablePeriod ? "bad" : "muted"}">${deltaText}</em> <small>${comparisonText}</small></div>
      <div
        class="spark-host"
        data-spark="${trend.join("|")}"
        data-tone="${good ? "good" : "bad"}"
        data-spark-title="${escapeHtml(label)}"
        data-spark-current="${escapeHtml(value)}"
        data-spark-previous="${escapeHtml(previousValue)}"
        data-spark-delta="${escapeHtml(deltaText)}"
        data-spark-comparison="${escapeHtml(comparisonText)}"
      ></div>
    </article>
  `;
}

function channelLegend(rows) {
  if (!rows.length) {
    return `<div class="legend-empty">No channel revenue in the selected filter.</div>`;
  }
  return `
    <div class="legend-list">
      ${rows.map((row) => `
        <div class="legend-row" title="${row.label} · ${formatters.number(row.orders)} flight legs · ${formatters.percent(row.pct)} · ${formatters.currency(row.value, true)}">
          <span class="legend-dot" style="background:${row.color}" aria-hidden="true"></span>
          <div class="legend-copy">
            <div class="legend-title">
              <strong>${row.label}</strong>
            </div>
            <div class="legend-values">
              <span class="legend-pct">${formatters.percent(row.pct)}</span>
              <span class="legend-divider" aria-hidden="true">·</span>
              <span class="legend-amount">${formatters.currency(row.value, true)}</span>
              <span class="legend-divider legend-order-divider" aria-hidden="true">·</span>
              <span class="legend-order">${formatters.number(row.orders)} legs</span>
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function locationTable(rows, compact) {
  return `
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>service area</th><th>service region</th><th>CM %</th><th>Δ vs prior</th><th>risk</th>${compact ? "<th>top driver</th>" : "<th>gross bookings</th><th>service credit</th><th>top driver</th>"}</tr></thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td><strong>${row.name}</strong><span>${row.manager}</span></td>
            <td>${row.district}</td>
            <td>${formatters.percent(row.summary.marginPct)}</td>
            <td class="${row.delta >= 0 ? "good" : "bad"}">${formatters.points(row.delta)}</td>
            <td><span class="status ${row.risk}">${row.risk}</span></td>
            ${compact ? `<td>${row.topDriver?.label || "stable"} ${row.topDriver?.value < 0 ? "↑" : "↓"}</td>` : `<td>${formatters.currency(row.summary.grossSales, true)}</td><td>${formatters.percent(row.summary.refundRate)}</td><td>${row.topDriver?.driver || "stable"}</td>`}
          </tr>
        `).join("")}
      </tbody>
    </table></div>
  `;
}

function attentionList(rows, hasCurrentActivity = true) {
  if (!rows.length) {
    const title = hasCurrentActivity ? "No service areas above watch threshold." : "No service-area activity in selected filters.";
    const detail = hasCurrentActivity ? "Current filters are inside normal margin and service-credit bands." : "Broaden or adjust filters to show active service areas.";
    return `
      <div class="attention-list">
        <div class="attention-empty">
          <strong>${title}</strong>
          <span>${detail}</span>
        </div>
      </div>
    `;
  }
  return `
    <div class="attention-list">
      ${rows.map((row) => `
        <div class="attention-row" title="${escapeHtml(`${row.name}: ${row.topDriver?.driver || "stable operating mix"}`)}">
          <div class="attention-main">
            <strong>${row.name}</strong>
            <span class="attention-meta"><span>${row.district}</span> <span>·</span> <span>${row.manager}</span></span>
            <small>${row.topDriver?.driver || "stable operating mix"}</small>
          </div>
          <div class="attention-metrics">
            <div class="attention-kpi"><span>CM</span><strong>${formatters.percent(row.summary.marginPct)}</strong></div>
            <div class="attention-kpi"><span>vs prior</span><em class="${row.delta >= 0 ? "good" : "bad"}">${formatters.points(row.delta)}</em></div>
            <i class="status ${row.risk}">${row.risk}</i>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function actionTable(actions, editable = false) {
  return `
    <div class="table-wrap"><table class="data-table action-table">
      <thead><tr><th>action</th><th>priority</th><th>est. impact</th><th>owner</th><th>due</th><th>status</th></tr></thead>
      <tbody>
        ${actions.map((action) => `
          <tr>
            <td><strong>${action.issue}</strong><span>${action.evidence}</span></td>
            <td><span class="priority ${action.priority}">${action.priority}</span></td>
            <td class="good">+${action.estimatedImpactPts.toFixed(1)} pts</td>
            <td>${action.owner}</td>
            <td>${formatShortDate(action.due)}</td>
            <td>${editable ? statusSelect(action) : `<span class="status ${statusClass(action.status)}">${action.status}</span>`}</td>
          </tr>
        `).join("")}
      </tbody>
    </table></div>
  `;
}

function compactActionList(actions) {
  return `
    <div class="compact-actions">
      ${actions.map((action) => `
        <div class="compact-action" title="${escapeHtml(`${action.issue}: ${action.evidence}`)}">
          <div><strong>${action.issue}</strong><span>${locationById[action.locationId]?.district || ""} · ${action.owner}</span></div>
          <span class="priority ${action.priority}">${action.priority}</span>
          <em class="good">+${action.estimatedImpactPts.toFixed(1)} pts</em>
          <span class="status ${statusClass(action.status)}">${action.status}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function menuTable(rows) {
  return `
    <div class="table-wrap menu-table-wrap"><table class="data-table menu-table">
      <thead><tr><th>mission</th><th>product line</th><th>economics</th><th>CM %</th><th>service credit</th><th>rank</th><th>recommendation</th></tr></thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td><strong>${row.name}</strong><span>${row.category}</span></td>
            <td>${row.brandName}</td>
            <td>
              <div class="economics-cell">
                <span><b>Revenue</b> ${formatters.currency(row.price)}</span>
                <span><b>Flight cost</b> ${formatters.currency(row.foodCost)}</span>
                <span><b>FBO</b> ${formatters.currency(row.packaging)}</span>
                <span><b>Unit CM</b> ${formatters.currency(row.unitContribution)}</span>
              </div>
            </td>
            <td class="${row.marginPct < 0.34 ? "bad" : row.marginPct > 0.52 ? "good" : ""}">${formatters.percent(row.marginPct)}</td>
            <td class="${row.summary.refundRate > 0.035 ? "bad" : ""}">${formatters.percent(row.summary.refundRate)}</td>
            <td>#${row.volumeRank}</td>
            <td><span class="status ${row.recommendation.includes("yield") || row.recommendation.includes("audit") ? "medium" : "low"}">${row.recommendation}</span></td>
          </tr>
        `).join("")}
      </tbody>
    </table></div>
  `;
}

function actionStats(actions) {
  const open = actions.filter((action) => action.status !== "done").length;
  const high = actions.filter((action) => action.priority === "high").length;
  const inProgress = actions.filter((action) => action.status === "in progress").length;
  const done = actions.filter((action) => action.status === "done").length;
  const impact = actions.reduce((total, action) => total + (action.status === "done" ? 0 : action.estimatedImpactPts), 0);
  return `
    <div class="action-stats">
      ${statChip("open actions", formatters.number(open), "medium")}
      ${statChip("high priority", formatters.number(high), high ? "danger" : "neutral")}
      ${statChip("in progress", formatters.number(inProgress), "neutral")}
      ${statChip("completed", formatters.number(done), "good")}
      ${statChip("modeled upside", `+${impact.toFixed(1)} pts`, "good")}
    </div>
  `;
}

function summaryMetaStrip(summary) {
  const filtered = filterData(sampleData, state.filters);
  const current = summarize(filtered.orders, filtered.labor);
  const actions = currentActions();
  return `
    <div class="summary-meta-strip">
      ${statChip("period", summary.period, "neutral")}
      ${statChip("gross bookings", formatters.currency(current.grossSales, true), "neutral")}
      ${statChip("CM %", formatters.percent(current.marginPct), current.marginPct >= 0.2 ? "good" : "medium")}
      ${statChip("open actions", formatters.number(actions.filter((action) => action.status !== "done").length), "medium")}
      ${statChip("forecast upside", formatters.points(summary.forecast.upside), summary.forecast.upside >= 0 ? "good" : "danger")}
    </div>
  `;
}

function statChip(label, value, tone = "neutral") {
  return `<div class="stat-chip ${tone}"><span>${label}</span><strong>${value}</strong></div>`;
}

function uploadGuide(kind) {
  const guides = {
    orders: ["date", "service_area", "product_line", "channel", "aircraft_mission", "flight_legs", "gross_bookings"],
    labor: ["date", "service_area", "actual_hours", "hourly_rate"],
    forecast: ["week", "service_area", "gross_bookings_forecast", "flight_legs_forecast", "margin_forecast"],
    menu: ["product_line", "aircraft_mission", "revenue", "fuel_crew_aircraft_cost", "fbo_handling_cost"]
  };
  const labels = {
    orders: "flight-leg export",
    labor: "daily support-hours export",
    forecast: "weekly forecast export",
    menu: "aircraft economics export"
  };
  return `
    <div class="upload-guide">
      <strong>${labels[kind] || "CSV export"} required fields</strong>
      <div>${(guides[kind] || []).map((field) => `<span>${field}</span>`).join("")}</div>
      <p>Download the sample workbook for formatted templates and example values before mapping a real export.</p>
    </div>
  `;
}

function forecastTable(series) {
  if (!series.length) {
    return `
      <div class="panel-header">
        <div><h2>forecast detail</h2><p>No forecast rows match the selected filters.</p></div>
      </div>
      <div class="empty-state"><strong>No forecast data yet</strong><span>Adjust filters to a service area/product line/channel that has forecast history.</span></div>
    `;
  }
  return `
    <div class="panel-header"><div><h2>forecast detail</h2><p>Base and scenario margin by week.</p></div></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>week</th><th>gross bookings</th><th>flight legs</th><th>flight cost</th><th>support cost</th><th>base CM%</th><th>scenario CM%</th><th>upside</th></tr></thead>
        <tbody>${series.map((row) => `<tr><td><strong>${row.week}</strong></td><td>${formatters.currency(row.revenue, true)}</td><td>${formatters.number(row.orders)}</td><td>${formatters.currency(row.cogs, true)}</td><td>${formatters.currency(row.labor, true)}</td><td>${formatters.percent(row.baseMarginPct)}</td><td class="good">${formatters.percent(row.scenarioMarginPct)}</td><td class="good">${formatters.points(row.scenarioMarginPct - row.baseMarginPct)}</td></tr>`).join("")}</tbody>
      </table></div>
  `;
}

function summaryPanel(summary) {
  return `
    <div class="panel-header">
      <div><h2>weekly flight economics summary</h2><p>${summary.period}</p></div>
      <div class="button-row"><button class="utility-btn icon-only" data-action="copy-summary" title="Copy">${icon("copy")}</button><button class="primary-btn" data-action="download-summary">Excel report</button></div>
    </div>
    ${summaryDigest(summary)}
    ${summaryForecastStrip(summary)}
  `;
}

function summaryDigest(summary) {
  const rows = [
    ["what changed", summary.changed[0], "good"],
    ["why it changed", summary.why[0], "info"],
    ["what to do next", summary.next[0], "warn"]
  ];
  return `
    <div class="summary-digest">
      ${rows.map(([title, line, tone]) => `
        <section>
          <h3><span class="dot ${tone}"></span>${title}</h3>
          <p>${line}</p>
        </section>
      `).join("")}
    </div>
  `;
}

function summaryForecastStrip(summary) {
  return `
    <div class="forecast-strip">
      <div><span>base</span><strong>${formatters.percent(summary.forecast.base)}</strong></div>
      <div><span>scenario</span><strong class="good">${formatters.percent(summary.forecast.scenario)}</strong></div>
      <div><span>upside</span><strong class="good">${formatters.points(summary.forecast.upside)}</strong></div>
    </div>
  `;
}

function summaryDocument(summary, compact = false) {
  const sections = [
    ["what changed", summary.changed, "good"],
    ["why it changed", summary.why, "info"],
    ["what to do next", summary.next, "warn"],
    ["risks for next", summary.risks, "bad"]
  ];
  return `<div class="${compact ? "summary-compact" : "summary-body"}">${sections.map(([title, lines, tone]) => `<section><h3><span class="dot ${tone}"></span>${title}</h3><ul>${lines.map((line) => `<li>${line}</li>`).join("")}</ul></section>`).join("")}</div>`;
}

function forecastUpdate(summary) {
  return `
    <div class="forecast-card">
      <span>forecast update</span>
      <strong>${summary.forecast.week || "Week forecast"} CM%</strong>
      <dl><dt>base</dt><dd>${formatters.percent(summary.forecast.base)}</dd><dt>scenario</dt><dd class="good">${formatters.percent(summary.forecast.scenario)}</dd><dt>upside</dt><dd class="good">${formatters.points(summary.forecast.upside)}</dd></dl>
    </div>
  `;
}

function menuSpotlight(rows) {
  if (!rows.length) {
    return `
      <div class="menu-spotlight">
        <div class="empty-state">
          <strong>No fleet economics activity for this filter</strong>
          <span>Choose a wider date range, market, or channel to preview top-performing and risk mission profiles.</span>
        </div>
      </div>
    `;
  }
  const spotlight = [...rows].sort((a, b) => b.summary.quantity - a.summary.quantity).slice(0, 5);
  return `
    <div class="menu-spotlight">
      ${spotlight.map((item) => `
        <div class="menu-tile">
          <div class="thumb slot-${item.imageSlot}"></div>
          <div><strong>${item.name}</strong><span>${item.recommendation}</span></div>
          <dl><dt>CM %</dt><dd class="${item.marginPct < 0.34 ? "bad" : "good"}">${formatters.percent(item.marginPct, 0)}</dd><dt>leg rank</dt><dd>#${item.volumeRank}</dd></dl>
        </div>
      `).join("")}
    </div>
  `;
}

function driverStack(bridge) {
  const rows = bridge.filter((item) => !item.type).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  return `
    <div class="panel-header"><div><h2>driver evidence</h2><p>Operator-controllable vs market-driven movement.</p></div></div>
    <div class="driver-list">
      ${rows.map((row) => `<div class="driver-row"><span class="${row.value >= 0 ? "good" : "bad"}">${formatters.points(row.value)}</span><div><strong>${row.label}</strong><em>${row.driver}</em></div></div>`).join("")}
    </div>
  `;
}

function scenarioControls(series) {
  if (!series.length) {
    return `
      <div class="panel-header"><div><h2>scenario controls</h2><p>No forecast rows for this selection.</p></div></div>
      <div class="scenario-empty">${icon("info")} Select another market/region/base or channel with forecast coverage.</div>
    `;
  }
  const last = series.at(-1);
  const controls = [
    ["directMixLift", "app + website mix lift", "%", 0, 12],
    ["foodInflation", "fuel + aircraft cost pressure", "%", -3, 8],
    ["volumeGrowth", "flight-leg volume growth", "%", -5, 10],
    ["laborEfficiency", "support efficiency gain", "%", 0, 8],
    ["refundReduction", "service-credit rate improvement", "pts", 0, 2]
  ];
  return `
    <div class="panel-header">
      <div><h2>scenario controls</h2><p>Model practical operating levers.</p></div>
      <select class="mini-select" data-scenario-preset>
        <option value="custom" ${state.scenarioPreset === "custom" ? "selected" : ""}>scenario</option>
        <option value="base" ${state.scenarioPreset === "base" ? "selected" : ""}>base</option>
        <option value="direct" ${state.scenarioPreset === "direct" ? "selected" : ""}>+direct mix</option>
        <option value="cost" ${state.scenarioPreset === "cost" ? "selected" : ""}>cost pressure</option>
      </select>
    </div>
    <div class="scenario-list">
      ${controls.map(([key, label, unit, min, max]) => `
        <label><span>${label}<em>${state.scenario[key]}${unit}</em></span><input type="range" min="${min}" max="${max}" step="0.1" value="${state.scenario[key]}" data-scenario="${key}" /></label>
      `).join("")}
    </div>
    <div class="scenario-result"><span>week ${series.length} scenario CM%</span><strong>${formatters.percent(last.scenarioMarginPct)}</strong><em>${formatters.points(last.scenarioMarginPct - last.baseMarginPct)} vs base</em></div>
  `;
}

function forecastCard(series) {
  if (!series.length) {
    return `
      <div class="forecast-side">
        <span>${series.length ? `${series.length}-week forecast` : "forecast"}</span>
        <div class="forecast-empty">No forecast rows for this filter slice.</div>
      </div>
    `;
  }
  const last = series.at(-1);
  return `
    <div class="forecast-side">
      <span>week ${series.length} forecast</span>
      <dl><dt>base scenario</dt><dd>${formatters.percent(last.baseMarginPct)}</dd><dt>scenario</dt><dd class="good">${formatters.percent(last.scenarioMarginPct)}</dd></dl>
      <strong class="good">↑ ${formatters.points(last.scenarioMarginPct - last.baseMarginPct)}</strong>
      <button class="link-btn" data-link-view="forecast" data-view="forecast">view scenarios</button>
    </div>
  `;
}

function previewTable(rows) {
  const headers = Object.keys(rows[0] || {}).slice(0, 7);
  return `<div class="table-wrap"><table class="data-table"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((h) => `<td>${escapeHtml(row[h])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function simpleDefinitionTable(rows) {
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th>metric</th><th>definition</th></tr></thead><tbody>${rows.map(([metric, definition]) => `<tr><td><strong>${metric}</strong></td><td>${definition}</td></tr>`).join("")}</tbody></table></div>`;
}

function definitionGroups(groups) {
  return `
    <div class="dictionary-grid">
      ${groups.map((group) => `
        <section class="definition-group">
          <h2>${group.title}</h2>
          ${simpleDefinitionTable(group.rows)}
        </section>
      `).join("")}
    </div>
  `;
}

function emptyState(text) {
  return `<div class="empty-state">${icon("upload")}<strong>No data loaded</strong><span>${text}</span></div>`;
}

function uploadNoRowsState() {
  return `
    <div class="empty-state upload-empty">
      ${icon("info")}
      <strong>CSV header detected</strong>
      <span>Add at least one data row beneath the headers, then upload again to validate sample values.</span>
    </div>
  `;
}

function selectControl(label, key, value, options) {
  return `
    <label class="filter-control">
      <span>${label}</span>
      <select data-filter="${key}">
        ${options.map(([optionValue, optionLabel]) => `<option value="${optionValue}" ${value === optionValue ? "selected" : ""}>${optionLabel}</option>`).join("")}
      </select>
    </label>
  `;
}

function uniqueOptions(rows, key) {
  return [...new Set(rows.map((row) => row[key]))].map((value) => [value, value]);
}

function bindShellEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.tour.active) closeTour({ completed: false, silent: true });
      state.view = button.dataset.view;
      state.moreOpen = false;
      scheduleRender();
    });
  });
  document.querySelectorAll("[data-filter]").forEach((select) => {
    select.addEventListener("change", () => updateFilter(select.dataset.filter, select.value));
  });
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action));
  });
  document.querySelectorAll("[data-status]").forEach((select) => {
    select.addEventListener("change", () => {
      storedActions[select.dataset.status] = select.value;
      localStorage.setItem("wheels-up-actions", JSON.stringify(storedActions));
      notify("Action status updated.");
    });
  });
  document.querySelectorAll("[data-saved]").forEach((button) => {
    button.addEventListener("click", () => applySavedView(button.dataset.saved));
  });
  document.querySelectorAll("[data-scenario]").forEach((input) => {
    input.addEventListener("input", () => {
      state.scenario[input.dataset.scenario] = Number(input.value);
      state.scenarioPreset = "custom";
      scheduleRender();
    });
    input.addEventListener("keydown", (event) => {
      const direction = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
      if (!direction && event.key !== "Home" && event.key !== "End") return;
      event.preventDefault();
      const min = Number(input.min);
      const max = Number(input.max);
      const step = Number(input.step) || 1;
      const current = Number(input.value);
      const next = event.key === "Home" ? min : event.key === "End" ? max : current + direction * step;
      state.scenario[input.dataset.scenario] = Number(Math.min(max, Math.max(min, next)).toFixed(2));
      state.scenarioPreset = "custom";
      scheduleRender();
    });
  });
  const preset = document.querySelector("[data-scenario-preset]");
  if (preset) preset.addEventListener("change", () => applyPreset(preset.value));
  const menuSort = document.querySelector("[data-menu-sort]");
  if (menuSort) menuSort.addEventListener("change", () => {
    state.menuSort = menuSort.value;
    notify(`Fleet economics sorted by ${menuSort.selectedOptions[0]?.textContent || "selected option"}.`);
  });
  const uploadKind = document.querySelector("[data-upload-kind]");
  if (uploadKind) uploadKind.addEventListener("change", () => {
    state.uploadKind = uploadKind.value;
    state.uploadRows = [];
    state.uploadMeta = { attempted: false, fileName: "", rowCount: 0 };
    notify(`Upload schema set to ${uploadKind.selectedOptions[0]?.textContent || uploadKind.value}.`);
  });
  const uploadFile = document.querySelector("[data-upload-file]");
  if (uploadFile) uploadFile.addEventListener("change", handleUpload);
  bindGlobalEvents();
}

function renderCharts() {
  const waterfallNode = document.getElementById("waterfall");
  const pnlWaterfallNode = document.getElementById("pnl-waterfall");
  const donutNode = document.getElementById("donut");
  const forecastChartNode = document.getElementById("forecast-chart");
  const forecastDetailNode = document.getElementById("forecast-detail-chart");
  const menuChartNode = document.getElementById("menu-bars");

  let comparison;
  let bridge;
  let mix;
  if (waterfallNode || pnlWaterfallNode || donutNode) {
    comparison = comparePeriods(sampleData, state.filters);
    if (waterfallNode || pnlWaterfallNode) {
      bridge = varianceBridge(comparison.currentSummary, comparison.previousSummary);
    }
    if (donutNode) {
      mix = channelMix(comparison.current.orders);
    }
  }

  const hasForecastChart = forecastChartNode || forecastDetailNode;
  const forecast = hasForecastChart ? forecastSeries(sampleData, state.filters, state.scenario, {
    forecastWeeks: state.forecastWeeks
  }) : [];
  const menuRows = menuChartNode ? menuPerformance(sampleData, state.filters).slice(0, 8) : [];

  if (waterfallNode) renderWaterfall(waterfallNode, bridge);
  if (pnlWaterfallNode) renderWaterfall(pnlWaterfallNode, bridge);
  if (donutNode) renderDonut(donutNode, mix);
  if (forecastChartNode) renderForecast(forecastChartNode, forecast, { labelMode: "compact" });
  if (forecastDetailNode) renderForecast(forecastDetailNode, forecast, { labelMode: "full" });
  if (menuChartNode) renderBarTrend(menuChartNode, menuRows, (row) => row.marginPct, (row) => row.name);
  document.querySelectorAll("[data-spark]").forEach((host) => {
    const values = host.dataset.spark.split("|").map(Number);
    renderSparkline(host, values, {
      color: host.dataset.tone === "good" ? "#2f8a4d" : "#ef4b3d",
      title: host.dataset.sparkTitle,
      current: host.dataset.sparkCurrent,
      previous: host.dataset.sparkPrevious,
      delta: host.dataset.sparkDelta,
      comparison: host.dataset.sparkComparison
    });
  });
}

function activeTourStep() {
  return TOUR_STEPS[Math.min(Math.max(state.tour.step, 0), TOUR_STEPS.length - 1)];
}

function startTour() {
  state.view = "overview";
  state.moreOpen = false;
  state.tour = { active: true, promptOpen: false, step: 0, focusPending: true };
  setStoredFlag(TOUR_DISMISSED_KEY, true);
  scheduleRender();
}

function dismissTourPrompt() {
  state.tour.promptOpen = false;
  setStoredFlag(TOUR_DISMISSED_KEY, true);
  notify("Guide is available anytime from the top bar.");
}

function closeTour({ completed = false, silent = false } = {}) {
  state.tour.active = false;
  state.tour.promptOpen = false;
  state.tour.focusPending = false;
  setStoredFlag(TOUR_DISMISSED_KEY, true);
  if (completed) setStoredFlag(TOUR_COMPLETED_KEY, true);
  if (!silent) notify(completed ? "Guided tour complete. Reopen it anytime from Guide." : "Guided tour closed. Reopen it anytime from Guide.");
  else scheduleRender();
}

function goToTourStep(step) {
  const nextStep = clamp(step, 0, TOUR_STEPS.length - 1);
  state.tour.step = nextStep;
  state.tour.active = true;
  state.tour.promptOpen = false;
  state.tour.focusPending = true;
  state.view = TOUR_STEPS[nextStep].view;
  scheduleRender();
}

function bindGlobalEvents() {
  if (globalEventsBound) return;
  globalEventsBound = true;
  document.addEventListener("keydown", handleGlobalKeydown);
  window.addEventListener("resize", () => queueTourPosition());
  window.addEventListener("scroll", () => queueTourPosition(), true);
}

function handleGlobalKeydown(event) {
  if (event.key !== "Escape") return;
  if (state.tour.active) {
    event.preventDefault();
    closeTour({ completed: false });
    return;
  }
  if (state.tour.promptOpen) {
    event.preventDefault();
    dismissTourPrompt();
  }
}

function queueTourPosition() {
  if (!state.tour.active) return;
  if (tourFrame) window.cancelAnimationFrame(tourFrame);
  tourFrame = window.requestAnimationFrame(() => {
    tourFrame = 0;
    positionTour();
  });
}

function positionTour() {
  if (!state.tour.active) return;
  const step = activeTourStep();
  const layer = document.querySelector("[data-tour-layer]");
  const highlight = document.querySelector("[data-tour-highlight]");
  const card = document.querySelector("[data-tour-card]");
  if (!layer || !highlight || !card) return;

  const target = document.querySelector(`[data-tour="${step.target}"]`);
  if (!target) {
    if (state.view !== step.view) {
      state.view = step.view;
      scheduleRender();
      return;
    }
    highlight.hidden = true;
    card.classList.add("is-unanchored");
    focusTourControl(card);
    return;
  }

  card.classList.remove("is-unanchored");
  highlight.hidden = false;

  let rect = target.getBoundingClientRect();
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  const needsScroll = rect.top < 72 || rect.bottom > window.innerHeight - (mobile ? 330 : 36);
  if (needsScroll && typeof target.scrollIntoView === "function") {
    target.scrollIntoView({ block: mobile ? "center" : "nearest", inline: "nearest" });
    rect = target.getBoundingClientRect();
  }

  const pad = mobile ? 5 : 7;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const left = clamp(rect.left - pad, 8, Math.max(8, viewportWidth - 24));
  const top = clamp(rect.top - pad, 8, Math.max(8, viewportHeight - 24));
  const right = clamp(rect.right + pad, 16, viewportWidth - 8);
  const bottom = clamp(rect.bottom + pad, 16, viewportHeight - 8);
  highlight.style.left = `${left}px`;
  highlight.style.top = `${top}px`;
  highlight.style.width = `${Math.max(24, right - left)}px`;
  highlight.style.height = `${Math.max(24, bottom - top)}px`;

  if (mobile) {
    card.style.left = "";
    card.style.top = "";
    card.style.right = "";
    card.style.bottom = "";
    focusTourControl(card);
    return;
  }

  const cardRect = card.getBoundingClientRect();
  const gap = 14;
  let cardLeft = rect.right + gap;
  if (cardLeft + cardRect.width > viewportWidth - 12) cardLeft = rect.left - cardRect.width - gap;
  if (cardLeft < 12) cardLeft = clamp(rect.left, 12, viewportWidth - cardRect.width - 12);
  const cardTop = clamp(rect.top, 12, viewportHeight - cardRect.height - 12);
  card.style.left = `${cardLeft}px`;
  card.style.top = `${cardTop}px`;
  card.style.right = "auto";
  card.style.bottom = "auto";
  focusTourControl(card);
}

function focusTourControl(card) {
  if (!state.tour.focusPending) return;
  const target = card.querySelector("[data-action='tour-next']") || card.querySelector("button");
  if (target) target.focus({ preventScroll: true });
  state.tour.focusPending = false;
}

function updateFilter(key, value) {
  state.moreOpen = false;
  if (key === "range") {
    state.filters.range = rangeForKey(value);
  } else if (key === "forecastWeeks") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && FORECAST_WEEK_OPTIONS.includes(parsed)) {
      state.forecastWeeks = parsed;
    }
  } else {
    state.filters[key] = value;
    if (key === "market") {
      state.filters.district = "all";
      state.filters.locationId = "all";
    }
    if (key === "district") {
      state.filters.locationId = "all";
    }
    if (key === "locationId" && value !== "all") {
      const location = locationById[value];
      if (location) {
        state.filters.market = location.market;
        state.filters.district = location.district;
      }
    }
  }
  scheduleRender();
}

function handleAction(action) {
  if (action !== "more") state.moreOpen = false;
  if (action === "start-tour") {
    startTour();
    return;
  }
  if (action === "dismiss-tour") {
    dismissTourPrompt();
    return;
  }
  if (action === "close-tour" || action === "skip-tour") {
    closeTour({ completed: false });
    return;
  }
  if (action === "tour-back") {
    goToTourStep(state.tour.step - 1);
    return;
  }
  if (action === "tour-next") {
    if (state.tour.step >= TOUR_STEPS.length - 1) {
      closeTour({ completed: true });
    } else {
      goToTourStep(state.tour.step + 1);
    }
    return;
  }
  if (action === "reset") {
    state.filters = { range: rangeForKey("current"), market: "all", district: "all", locationId: "all", brandId: "all", channelId: "all" };
    state.forecastWeeks = 104;
    state.moreOpen = false;
    notify("Filters reset.");
    return;
  }
  if (action === "save") {
    saveCurrentView();
    return;
  }
  if (action === "more") {
    state.moreOpen = !state.moreOpen;
    scheduleRender();
    return;
  }
  const summary = () => weeklySummary(
    { ...sampleData, actions: currentActions() },
    state.filters,
    state.scenario,
    { forecastWeeks: state.forecastWeeks }
  );
  const locations = () => locationPerformance(sampleData, state.filters);
  const menuRows = () => menuPerformance(sampleData, state.filters);
  const forecast = () => forecastSeries(sampleData, state.filters, state.scenario, {
    forecastWeeks: state.forecastWeeks
  });
  if (action === "copy-summary") {
    copySummary(summary(), notify);
    return;
  }
  if (action === "download-summary") {
    downloadSummary(summary());
    notify("Weekly flight economics Excel report downloaded.");
    return;
  }
  if (action === "download-samples") {
    downloadSamples();
    return;
  }
  if (action === "export-service-area-performance.xls") {
    exportWorkbook("wheels-up-service-area-performance.xls", workbookConfig("location", locations().map(locationExportRow), summary()));
    notify("Service-area P&L Excel export downloaded.");
    return;
  }
  if (action === "export-fleet-economics.xls") {
    exportWorkbook("wheels-up-fleet-economics.xls", workbookConfig("menu", menuRows().map(menuExportRow), summary()));
    notify("Fleet economics Excel export downloaded.");
    return;
  }
  if (action === "export-rolling-forecast.xls") {
    exportWorkbook("wheels-up-rolling-forecast.xls", workbookConfig("forecast", forecast().map(forecastExportRow), summary()));
    notify("Rolling forecast Excel export downloaded.");
    return;
  }
  if (action === "export-operating-actions.xls") {
    exportWorkbook("wheels-up-operating-actions.xls", workbookConfig("actions", buildActionCsv(currentActions()), summary()));
    notify("Operating actions Excel export downloaded.");
    return;
  }
  if (action === "export-service-area-performance.csv") {
    exportRows("service-area-performance.csv", locations().map(locationExportRow));
    notify("Service-area P&L CSV export downloaded.");
    return;
  }
  if (action === "export-fleet-economics.csv") {
    exportRows("fleet-economics.csv", menuRows().map(menuExportRow));
    notify("Fleet economics CSV export downloaded.");
    return;
  }
  if (action === "export-rolling-forecast.csv") {
    exportRows("rolling-forecast.csv", forecast().map(forecastExportRow));
    notify("Rolling forecast CSV export downloaded.");
    return;
  }
  if (action === "export-operating-actions.csv") {
    exportRows("operating-actions.csv", buildActionCsv(currentActions()));
    notify("Operating actions CSV export downloaded.");
  }
}

function exportButton(baseName) {
  return `
    <div class="export-actions">
      <button class="primary-btn" data-action="export-${baseName}.xls">${icon("download")} Excel</button>
      <button class="utility-btn" data-action="export-${baseName}.csv">CSV</button>
    </div>
  `;
}

function workbookConfig(kind, rows, summary) {
  const forecastWeekLabel = summary.forecast?.week || "Rolling Forecast";
  const configs = {
    location: {
      title: "Service Area + Region P&L",
      tableTitle: "Service-Area Operating Table",
      columns: [
        { key: "location", label: "Service Area", type: "text", width: 230 },
        { key: "region", label: "Service Region", type: "text", width: 180 },
        { key: "market", label: "Market", type: "text", width: 140 },
        { key: "net_sales", label: "Gross Bookings", type: "currency", width: 135 },
        { key: "contribution_margin", label: "Adjusted Contribution", type: "currency", width: 170 },
        { key: "margin_pct", label: "CM %", type: "percent", width: 90, tone: (value) => value < 0.18 ? "bad" : value > 0.22 ? "good" : "" },
        { key: "delta_vs_prior", label: "Δ vs Prior", type: "points", width: 100 },
        { key: "risk_driver", label: "Risk / Driver", type: "longText", width: 260 }
      ]
    },
    menu: {
      title: "Aircraft + Mission Economics",
      tableTitle: "Mission Economics",
      columns: [
        { key: "item", label: "Aircraft / Mission", type: "text", width: 240 },
        { key: "brand", label: "Product Line", type: "text", width: 190 },
        { key: "price", label: "Gross Bookings", type: "currency", width: 125 },
        { key: "food_cost", label: "Flight Cost", type: "currency", width: 105 },
        { key: "packaging", label: "FBO / Handling", type: "currency", width: 110 },
        { key: "unit_contribution", label: "Unit CM", type: "currency", width: 95 },
        { key: "margin_pct", label: "CM %", type: "percent", width: 90, tone: (value) => value < 0.34 ? "bad" : value > 0.52 ? "good" : "" },
        { key: "refund_rate", label: "Service Credit Rate", type: "percent", width: 130, tone: (value) => value > 0.035 ? "bad" : "" },
        { key: "volume_rank", label: "Volume Rank", type: "rank", width: 105 },
        { key: "recommendation", label: "Recommendation", type: "recommendation", width: 230 }
      ]
    },
    forecast: {
      title: `${forecastWeekLabel} Rolling Forecast`,
      tableTitle: "Forecast Detail",
      columns: [
        { key: "week", label: "Week", type: "text", width: 90 },
        { key: "revenue", label: "Gross Bookings", type: "currency", width: 135 },
        { key: "orders", label: "Flight Legs", type: "number", width: 105 },
        { key: "cogs", label: "Flight Cost", type: "currency", width: 115 },
        { key: "labor", label: "Support Cost", type: "currency", width: 115 },
        { key: "base_margin_pct", label: "Base CM %", type: "percent", width: 105 },
        { key: "scenario_margin_pct", label: "Scenario CM %", type: "percent", width: 125, tone: () => "good" },
        { key: "upside_pts", label: "Upside", type: "points", width: 100 }
      ]
    },
    actions: {
      title: "Operating Action Queue",
      tableTitle: "Prioritized Actions",
      columns: [
        { key: "priority", label: "Priority", type: "risk", width: 90 },
        { key: "location", label: "Service Area", type: "text", width: 190 },
        { key: "issue", label: "Issue", type: "longText", width: 300 },
        { key: "evidence", label: "Evidence", type: "longText", width: 390 },
        { key: "estimated_margin_impact_pts", label: "Modeled Impact", type: "text", width: 120, format: (value) => `${Number(value) >= 0 ? "+" : ""}${Number(value).toFixed(1)} pts`, tone: () => "good" },
        { key: "owner", label: "Owner", type: "text", width: 160 },
        { key: "status", label: "Status", type: "status", width: 120 },
        { key: "due", label: "Due Date", type: "text", width: 110 }
      ]
    }
  };
  const config = configs[kind];
  return {
    ...config,
    subtitle: periodLabel(),
    rows,
    summaryCards: [
      ["Rows", formatters.number(rows.length), "neutral"],
      [`Scenario ${summary.forecast.week || "Week"} CM%`, formatters.percent(summary.forecast.scenario), "good"],
      ["Modeled Upside", formatters.points(summary.forecast.upside), "good"]
    ]
  };
}

function applyPreset(value) {
  state.scenarioPreset = value;
  if (value === "base") state.scenario = { directMixLift: 0, foodInflation: 0, volumeGrowth: 0, laborEfficiency: 0, refundReduction: 0 };
  if (value === "direct") state.scenario = { directMixLift: 6, foodInflation: 0, volumeGrowth: 2, laborEfficiency: 1, refundReduction: 0.7 };
  if (value === "cost") state.scenario = { directMixLift: 2, foodInflation: 4, volumeGrowth: 1, laborEfficiency: 0.5, refundReduction: 0.2 };
  notify(`Scenario preset applied: ${value}.`);
}

async function handleUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  state.uploadKind = detectUploadKind(file.name, state.uploadKind);
  const text = await file.text();
  state.uploadRows = parseCsv(text);
  state.uploadMeta = { attempted: true, fileName: file.name, rowCount: state.uploadRows.length };
  notify(state.uploadRows.length ? `${state.uploadRows.length} CSV rows parsed.` : "CSV parsed, but no data rows were found.");
}

function detectUploadKind(filename, fallback) {
  const name = filename.toLowerCase();
  if (name.includes("fleet") || name.includes("aircraft") || name.includes("mission") || name.includes("menu")) return "menu";
  if (name.includes("forecast")) return "forecast";
  if (name.includes("support") || name.includes("labor")) return "labor";
  if (name.includes("flight") || name.includes("leg") || name.includes("booking") || name.includes("order")) return "orders";
  return fallback;
}

function downloadSamples() {
  const { orderRows, laborRows } = toSampleCsv(sampleData);
  const forecastRows = sampleData.forecast.map((row) => ({
    week: row.week,
    service_area: locationById[row.locationId].name,
    gross_bookings_forecast: row.revenueForecast,
    flight_legs_forecast: row.ordersForecast,
    flight_cost_forecast: row.cogsForecast,
    support_cost_forecast: row.laborForecast,
    margin_forecast: row.marginForecast
  }));
  const menuRows = MENU_ITEMS.map((item) => ({
    product_line: brandById[item.brand].name,
    aircraft_mission: item.name,
    gross_bookings: item.price,
    fuel_crew_aircraft_cost: item.foodCost,
    fbo_handling_cost: item.packaging,
    dispatch_minutes: item.laborMinutes,
    category: item.category
  }));
  exportWorkbook("wheels-up-sample-data-templates.xls", {
    title: "Sample Data Templates",
    subtitle: "Connector-ready CSV schemas",
    summaryCards: [
      ["Flight Leg Rows", formatters.number(orderRows.length), "neutral"],
      ["Support Rows", formatters.number(laborRows.length), "neutral"],
      ["Forecast Rows", formatters.number(forecastRows.length), "neutral"],
      ["Mission Rows", formatters.number(menuRows.length), "neutral"]
    ],
    sections: [
      ["Import Notes", [
        "Use these sample schemas to map booking, flight-leg, partner lift, support-cost, aircraft economics, and forecast exports into the prototype.",
        "CSV exports remain available from operating views; this workbook is designed for human review and handoff."
      ]]
    ],
    tables: [
      {
        title: "Template Guide",
        rows: [
          {
            dataset: "Flight Legs",
            purpose: "Gross bookings, sales channel, product line, aircraft/mission type, recovery credits, and variable flight cost by service area.",
            required_fields: "date, service area, product line, channel, aircraft mission, flight legs, gross bookings, recovery credits, service credits, partner selling cost",
            format_note: "One row per booked flight-leg or mission economics line."
          },
          {
            dataset: "Support Hours",
            purpose: "Scheduled vs actual dispatch/support hours and fully loaded hourly cost.",
            required_fields: "date, service area, scheduled hours, actual hours, hourly rate, payroll burden",
            format_note: "Daily rows by public service-area focus."
          },
          {
            dataset: "Forecast",
            purpose: "104-week gross bookings, flight-leg, variable cost, support cost, and margin targets.",
            required_fields: "week, service area, gross bookings forecast, flight legs forecast, flight cost forecast, support cost forecast, margin forecast",
            format_note: "Weekly rows by public service-area focus."
          },
          {
            dataset: "Aircraft Economics",
            purpose: "Aircraft/mission gross bookings, fuel/crew/aircraft cost, FBO/handling cost, and dispatch assumptions.",
            required_fields: "product line, aircraft mission, gross bookings, fuel crew aircraft cost, FBO handling cost, dispatch minutes, category",
            format_note: "One row per mission or fleet economics profile."
          }
        ],
        columns: [
          { key: "dataset", label: "Dataset", type: "text", width: 170 },
          { key: "purpose", label: "Business Purpose", type: "longText", width: 300 },
          { key: "required_fields", label: "Required Fields", type: "longText", width: 420 },
          { key: "format_note", label: "Format Note", type: "longText", width: 240 }
        ]
      },
      {
        title: "Flight Legs CSV Template",
        rows: orderRows.slice(0, 30),
        columns: [
          { key: "date", label: "Date", type: "text", width: 105 },
          { key: "service_area", label: "Service Area", type: "text", width: 180 },
          { key: "product_line", label: "Product Line", type: "text", width: 190 },
          { key: "channel", label: "Channel", type: "text", width: 135 },
          { key: "aircraft_mission", label: "Aircraft / Mission", type: "text", width: 230 },
          { key: "flight_legs", label: "Legs", type: "number", width: 70 },
          { key: "gross_bookings", label: "Gross Bookings", type: "currency", width: 120 },
          { key: "recovery_credit", label: "Recovery Credit", type: "currency", width: 120 },
          { key: "service_credit", label: "Service Credit", type: "currency", width: 110 },
          { key: "partner_selling_cost", label: "Partner Selling Cost", type: "currency", width: 135 }
        ]
      },
      {
        title: "Support Hours CSV Template",
        rows: laborRows.slice(0, 30),
        columns: [
          { key: "date", label: "Date", type: "text", width: 105 },
          { key: "service_area", label: "Service Area", type: "text", width: 180 },
          { key: "scheduled_hours", label: "Scheduled Hours", type: "number", width: 125 },
          { key: "actual_hours", label: "Actual Hours", type: "number", width: 110 },
          { key: "hourly_rate", label: "Hourly Rate", type: "currency", width: 105 },
          { key: "payroll_burden_rate", label: "Payroll Burden", type: "percent", width: 120 }
        ]
      },
      {
        title: "Forecast CSV Template",
        rows: forecastRows,
        columns: [
          { key: "week", label: "Week", type: "text", width: 95 },
          { key: "service_area", label: "Service Area", type: "text", width: 180 },
          { key: "gross_bookings_forecast", label: "Gross Bookings Forecast", type: "currency", width: 150 },
          { key: "flight_legs_forecast", label: "Flight Legs Forecast", type: "number", width: 140 },
          { key: "flight_cost_forecast", label: "Flight Cost Forecast", type: "currency", width: 135 },
          { key: "support_cost_forecast", label: "Support Cost Forecast", type: "currency", width: 135 },
          { key: "margin_forecast", label: "CM Forecast", type: "percent", width: 110 }
        ]
      },
      {
        title: "Aircraft Economics CSV Template",
        rows: menuRows,
        columns: [
          { key: "product_line", label: "Product Line", type: "text", width: 190 },
          { key: "aircraft_mission", label: "Aircraft / Mission", type: "text", width: 230 },
          { key: "gross_bookings", label: "Gross Bookings", type: "currency", width: 120 },
          { key: "fuel_crew_aircraft_cost", label: "Fuel/Crew/Aircraft", type: "currency", width: 140 },
          { key: "fbo_handling_cost", label: "FBO/Handling", type: "currency", width: 120 },
          { key: "dispatch_minutes", label: "Dispatch Minutes", type: "number", width: 125 },
          { key: "category", label: "Category", type: "text", width: 150 }
        ]
      }
    ]
  });
  notify("Styled sample workbook downloaded.");
}

function saveCurrentView() {
  const name = savedViewName();
  const entry = {
    name,
    type: "custom",
    view: state.view,
    filters: JSON.parse(JSON.stringify(state.filters)),
    forecastWeeks: state.forecastWeeks,
    scenario: JSON.parse(JSON.stringify(state.scenario)),
    scenarioPreset: state.scenarioPreset,
    menuSort: state.menuSort,
    savedAt: new Date().toISOString()
  };
  const existingIndex = customSavedViews.findIndex((view) => view.name === name);
  if (existingIndex >= 0) {
    customSavedViews.splice(existingIndex, 1, entry);
  } else {
    customSavedViews.unshift(entry);
  }
  customSavedViews.splice(6);
  localStorage.setItem("wheels-up-saved-views", JSON.stringify(customSavedViews));
  notify(`Saved view: ${name}.`);
}

function savedViewName() {
  const viewLabel = nav.find((item) => item.id === state.view)?.label || state.view;
  const filters = [
    state.filters.locationId !== "all" ? locationById[state.filters.locationId]?.name : "",
    state.filters.district !== "all" ? state.filters.district : "",
    state.filters.market !== "all" ? state.filters.market : "",
    state.filters.brandId !== "all" ? brandById[state.filters.brandId]?.name : "",
    state.filters.channelId !== "all" ? channelById[state.filters.channelId]?.name : ""
  ].filter(Boolean);
  const scope = filters[0] || periodLabel();
  return `${viewLabel} - ${scope}`;
}

function applySavedView(name) {
  const customView = customSavedViews.find((view) => view.name === name);
  if (customView) {
    state.view = customView.view;
    state.filters = normalizePublicFilters(JSON.parse(JSON.stringify(customView.filters)));
    state.forecastWeeks = customView.forecastWeeks;
    state.scenario = JSON.parse(JSON.stringify(customView.scenario));
    state.scenarioPreset = customView.scenarioPreset;
    state.menuSort = customView.menuSort;
    state.moreOpen = false;
    notify(`Loaded saved view: ${name}.`);
    return;
  }
  if (name === "CFO weekly readout") {
    state.view = "summary";
    state.filters = { ...state.filters, market: "all", district: "all", locationId: "all", brandId: "all", channelId: "all" };
  }
  if (name === "East service-area reliability" || name === "Northeast reliability") {
    state.view = "pnl";
    state.filters = { ...state.filters, market: "New York", district: "East Primary Service Area", locationId: "all", brandId: "all", channelId: "all" };
  }
  if (name === "dispatch daily queue") {
    state.view = "actions";
    state.filters = { ...state.filters, market: "all", district: "all", locationId: "all", brandId: "all", channelId: "all" };
  }
  if (name === "fleet economics - low yield") {
    state.view = "menu";
    state.menuSort = "marginAsc";
  }
  state.moreOpen = false;
  notify(`Loaded saved view: ${name}.`);
}

function validationMessage(validation) {
  const parts = [];
  if (validation.missing.length) parts.push(`Missing required fields: ${validation.missing.join(", ")}`);
  if (validation.invalid.length) parts.push(`Invalid values: ${validation.invalid.slice(0, 3).join("; ")}${validation.invalid.length > 3 ? "..." : ""}`);
  return parts.join(" ");
}

function sortMenu(rows) {
  const sorted = [...rows];
  if (state.menuSort === "volumeDesc") return sorted.sort((a, b) => b.summary.quantity - a.summary.quantity);
  if (state.menuSort === "refundDesc") return sorted.sort((a, b) => b.summary.refundRate - a.summary.refundRate);
  return sorted.sort((a, b) => a.marginPct - b.marginPct);
}

function rangeKey() {
  return Object.entries(DATE_RANGES).find(([, range]) =>
    state.filters.range.start === range.start && state.filters.range.end === range.end
  )?.[0] || "current";
}

function rangeForKey(key) {
  const range = DATE_RANGES[key] || DATE_RANGES.current;
  return { start: range.start, end: range.end };
}

function rangeLengthDays(range = state.filters.range) {
  const start = new Date(`${range.start}T00:00:00`).getTime();
  const end = new Date(`${range.end}T00:00:00`).getTime();
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

function comparisonLabel() {
  const days = rangeLengthDays();
  return days === 7 ? "vs prior 7 days" : `vs prior ${days} days`;
}

function districtOptionsForFilters(filters) {
  return [...new Set(
    LOCATIONS
      .filter((location) => matchesFilter(filters.market, location.market))
      .map((location) => location.district)
  )];
}

function locationOptionsForFilters(filters) {
  return LOCATIONS.filter((location) =>
    matchesFilter(filters.market, location.market) &&
    matchesFilter(filters.district, location.district)
  );
}

function locationMatchesFilters(location, filters) {
  if (!location) return false;
  return (
    matchesFilter(filters.market, location.market) &&
    matchesFilter(filters.district, location.district) &&
    matchesFilter(filters.locationId, location.id)
  );
}

function matchesFilter(filterValue, actualValue) {
  return !filterValue || filterValue === "all" || filterValue === actualValue;
}

function storedFlag(key) {
  try {
    return localStorage.getItem(key) === "true";
  } catch (error) {
    return false;
  }
}

function setStoredFlag(key, value) {
  try {
    localStorage.setItem(key, value ? "true" : "false");
  } catch (error) {
    // Tour state is helpful but not required for the app to operate.
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function statusSelect(action) {
  return `<select class="status-select" data-status="${action.id}">${["open", "queued", "in progress", "done"].map((status) => `<option value="${status}" ${action.status === status ? "selected" : ""}>${status}</option>`).join("")}</select>`;
}

function statusClass(status) {
  return status === "done" ? "low" : status === "in progress" ? "medium" : "high";
}

function notify(message) {
  state.toast = message;
  scheduleRender();
  window.clearTimeout(notify.timer);
  notify.timer = window.setTimeout(() => {
    state.toast = "";
    scheduleRender();
  }, 2200);
}

function formatShortDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function periodLabel() {
  const start = new Date(`${state.filters.range.start}T00:00:00`);
  const end = new Date(`${state.filters.range.end}T00:00:00`);
  const includeStartYear = start.getFullYear() !== end.getFullYear();
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(includeStartYear ? { year: "numeric" } : {}) });
  const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startLabel} - ${endLabel}`;
}

function locationExportRow(row) {
  return {
    location: row.name,
    region: row.district,
    market: row.market,
    net_sales: row.summary.grossSales,
    contribution_margin: row.summary.contributionMargin,
    margin_pct: row.summary.marginPct,
    delta_vs_prior: row.delta,
    risk: row.risk,
    top_driver: row.topDriver?.driver || "",
    risk_driver: `${row.risk} - ${row.topDriver?.driver || "No current exception"}`
  };
}

function menuExportRow(row) {
  return {
    item: row.name,
    brand: row.brandName,
    price: row.price,
    food_cost: row.foodCost,
    packaging: row.packaging,
    unit_contribution: row.unitContribution,
    margin_pct: row.marginPct,
    refund_rate: row.summary.refundRate,
    volume_rank: row.volumeRank,
    recommendation: row.recommendation
  };
}

function forecastExportRow(row) {
  return {
    week: row.week,
    revenue: row.revenue,
    orders: row.orders,
    cogs: row.cogs,
    labor: row.labor,
    base_margin_pct: row.baseMarginPct,
    scenario_margin_pct: row.scenarioMarginPct,
    upside_pts: row.scenarioMarginPct - row.baseMarginPct
  };
}

function icon(name) {
  const icons = {
    home: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
    ledger: "M5 3h14v18H5z M8 7h8 M8 11h8 M8 15h5",
    grid: "M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z",
    trend: "M4 16l5-5 4 4 7-8 M16 7h4v4",
    user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0",
    calendar: "M5 4h14v17H5z M8 2v4 M16 2v4 M5 9h14",
    upload: "M12 16V4 M7 9l5-5 5 5 M5 20h14",
    book: "M5 4h11a3 3 0 0 1 3 3v14H8a3 3 0 0 0-3 3z M5 4v17",
    refresh: "M20 6v5h-5 M4 18v-5h5 M18 9a6 6 0 0 0-10-3 M6 15a6 6 0 0 0 10 3",
    bookmark: "M6 4h12v17l-6-4-6 4z",
    more: "M5 12h.01 M12 12h.01 M19 12h.01",
    chevron: "M8 10l4 4 4-4",
    dot: "M12 12h.01",
    info: "M12 17v-6 M12 7h.01 M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20",
    search: "M10 18a8 8 0 1 1 5.3-14M15 15l6 6",
    copy: "M8 8h11v11H8z M5 16H4a1 1 0 0 1-1-1V4h11v1",
    download: "M12 3v12 M7 10l5 5 5-5 M5 21h14",
    arrowDown: "M12 5v14 M6 13l6 6 6-6",
    close: "M6 6l12 12 M18 6L6 18"
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name] || icons.dot}" /></svg>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

hydrateStateFromUrl();
render();
