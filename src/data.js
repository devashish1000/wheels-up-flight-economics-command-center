const START = new Date("2024-05-13T00:00:00");
const DAY_MS = 86400000;
const DATA_DAYS = 729;
const RECENT_PRESSURE_START = DATA_DAYS - 10;
const FORECAST_WEEKS = 104;

export const LOCATIONS = [
  { id: "teb-teterboro", name: "Teterboro / New York", market: "New York", district: "Northeast", manager: "Northeast dispatch", opened: "2024-05-20", capacity: "high" },
  { id: "hpn-westchester", name: "Westchester County", market: "New York", district: "Northeast", manager: "Member ops east", opened: "2024-06-10", capacity: "medium" },
  { id: "bed-bedford", name: "Boston Bedford", market: "Boston", district: "Northeast", manager: "Northeast fleet lead", opened: "2024-07-15", capacity: "medium" },
  { id: "ack-nantucket", name: "Nantucket seasonal", market: "Nantucket", district: "Northeast", manager: "Seasonal recovery desk", opened: "2025-05-12", capacity: "pilot" },
  { id: "pdk-atlanta", name: "Atlanta Peachtree-DeKalb", market: "Atlanta", district: "Southeast", manager: "Southeast ops", opened: "2024-05-27", capacity: "high" },
  { id: "opf-miami", name: "Miami Opa-locka", market: "Miami", district: "Southeast", manager: "Florida operations", opened: "2024-06-24", capacity: "high" },
  { id: "pbi-palm-beach", name: "Palm Beach", market: "Palm Beach", district: "Southeast", manager: "Florida member desk", opened: "2024-09-09", capacity: "medium" },
  { id: "bna-nashville", name: "Nashville", market: "Nashville", district: "Southeast", manager: "Corporate desk south", opened: "2025-02-03", capacity: "medium" },
  { id: "dal-love", name: "Dallas Love Field", market: "Dallas", district: "Central", manager: "Central operations", opened: "2024-08-05", capacity: "high" },
  { id: "mdw-chicago", name: "Chicago Midway", market: "Chicago", district: "Central", manager: "Central fleet desk", opened: "2024-10-14", capacity: "medium" },
  { id: "den-centennial", name: "Denver Centennial", market: "Denver", district: "Mountain", manager: "Mountain ops", opened: "2024-11-18", capacity: "medium" },
  { id: "ase-aspen", name: "Aspen seasonal", market: "Aspen", district: "Mountain", manager: "Mountain recovery desk", opened: "2025-01-06", capacity: "pilot" },
  { id: "sdl-scottsdale", name: "Scottsdale", market: "Scottsdale", district: "West", manager: "West member desk", opened: "2024-09-30", capacity: "medium" },
  { id: "vny-van-nuys", name: "Van Nuys / Los Angeles", market: "Los Angeles", district: "West", manager: "West coast ops", opened: "2024-06-17", capacity: "high" },
  { id: "las-henderson", name: "Las Vegas Henderson", market: "Las Vegas", district: "West", manager: "Event charter desk", opened: "2025-03-03", capacity: "medium" }
];

export const BRANDS = [
  { id: "signature", name: "Signature Membership", tone: "#1b4e7a" },
  { id: "on-demand", name: "On-Demand Charter", tone: "#315f72" },
  { id: "corporate", name: "Corporate Solutions", tone: "#4b6d8d" },
  { id: "delta", name: "Delta Partnership Travel", tone: "#7b2433" },
  { id: "group", name: "Group Charter", tone: "#7a5a23" },
  { id: "cargo", name: "Cargo / Air Partner", tone: "#3f5f58" }
];

export const CHANNELS = [
  { id: "direct", name: "Member app/web", commission: 0.018, payment: 0.012, fixed: 85, color: "#2467a6" },
  { id: "member-services", name: "Member services desk", commission: 0.028, payment: 0.012, fixed: 115, color: "#18364d" },
  { id: "delta-referral", name: "Delta referral", commission: 0.042, payment: 0.011, fixed: 125, color: "#8c2f39" },
  { id: "corporate-desk", name: "Corporate desk", commission: 0.024, payment: 0.01, fixed: 145, color: "#556a7f" },
  { id: "broker-partner", name: "Broker / partner network", commission: 0.095, payment: 0.012, fixed: 225, color: "#b8752a" },
  { id: "group-cargo", name: "Group / cargo desk", commission: 0.055, payment: 0.01, fixed: 260, color: "#4c6b63" }
];

export const MENU_ITEMS = [
  { id: "phenom-member-short", brand: "signature", name: "Phenom 300 member short hop", category: "light jet mission", price: 9400, foodCost: 3950, packaging: 720, laborMinutes: 42, imageSlot: 0 },
  { id: "citation-member-regional", brand: "signature", name: "Citation XLS regional member leg", category: "midsize mission", price: 12800, foodCost: 5450, packaging: 890, laborMinutes: 48, imageSlot: 1 },
  { id: "challenger-on-demand", brand: "on-demand", name: "Challenger 300/350 on-demand", category: "super-mid mission", price: 23800, foodCost: 10800, packaging: 1650, laborMinutes: 64, imageSlot: 0 },
  { id: "partner-large-cabin", brand: "on-demand", name: "Partner large-cabin charter", category: "partner aircraft", price: 35500, foodCost: 18200, packaging: 2450, laborMinutes: 72, imageSlot: 3 },
  { id: "corporate-shuttle", brand: "corporate", name: "Corporate shuttle series", category: "recurring corporate", price: 18400, foodCost: 8050, packaging: 1320, laborMinutes: 58, imageSlot: 2 },
  { id: "corporate-exec", brand: "corporate", name: "Executive roadshow itinerary", category: "multi-leg corporate", price: 28600, foodCost: 13200, packaging: 2100, laborMinutes: 78, imageSlot: 2 },
  { id: "delta-premium-hop", brand: "delta", name: "Delta premium connection hop", category: "airline connection", price: 11600, foodCost: 4850, packaging: 930, laborMinutes: 46, imageSlot: 1 },
  { id: "delta-recovery-leg", brand: "delta", name: "Delta disruption recovery leg", category: "recovery flight", price: 15400, foodCost: 7100, packaging: 1420, laborMinutes: 66, imageSlot: 1 },
  { id: "event-group-charter", brand: "group", name: "Event group charter", category: "group movement", price: 42600, foodCost: 22600, packaging: 3150, laborMinutes: 86, imageSlot: 3 },
  { id: "team-sports-charter", brand: "group", name: "Sports/team movement", category: "group movement", price: 51800, foodCost: 27800, packaging: 3820, laborMinutes: 96, imageSlot: 3 },
  { id: "air-partner-cargo", brand: "cargo", name: "Air Partner urgent cargo", category: "cargo charter", price: 33200, foodCost: 17400, packaging: 2950, laborMinutes: 82, imageSlot: 2 },
  { id: "special-mission", brand: "cargo", name: "Special mission charter", category: "special mission", price: 38600, foodCost: 20500, packaging: 3450, laborMinutes: 92, imageSlot: 2 }
];

export const ACTIONS = [
  {
    id: "act-001",
    priority: "high",
    locationId: "teb-teterboro",
    issue: "Reduce Northeast deadhead after Sunday member returns",
    evidence: "Teterboro recovery legs rose 1.6 pts and repositioning cost/flight leg is above the network median.",
    estimatedImpactPts: 1.4,
    owner: "Northeast dispatch",
    status: "open",
    due: "2026-05-14"
  },
  {
    id: "act-002",
    priority: "high",
    locationId: "opf-miami",
    issue: "Tighten Florida recovery playbook for weather disruption windows",
    evidence: "Service credits increased during PM convective weather while member app bookings held demand.",
    estimatedImpactPts: 1.1,
    owner: "Florida operations",
    status: "in progress",
    due: "2026-05-16"
  },
  {
    id: "act-003",
    priority: "high",
    locationId: "vny-van-nuys",
    issue: "Shift high-value West Coast demand from partner lift to controlled fleet",
    evidence: "Broker / partner network mix increased on super-mid missions with lower trip-level contribution.",
    estimatedImpactPts: 1.3,
    owner: "West coast ops",
    status: "open",
    due: "2026-05-18"
  },
  {
    id: "act-004",
    priority: "medium",
    locationId: "dal-love",
    issue: "Rebalance Phenom availability ahead of Monday corporate departures",
    evidence: "Corporate desk demand is forecast above seat-hour plan while light-jet availability is below target.",
    estimatedImpactPts: 0.7,
    owner: "Central operations",
    status: "queued",
    due: "2026-05-19"
  },
  {
    id: "act-005",
    priority: "medium",
    locationId: "ase-aspen",
    issue: "Audit FBO and handling cost variance in Aspen seasonal operations",
    evidence: "FBO/handling cost per leg is 14.8% above Mountain region median after seasonal ramp changes.",
    estimatedImpactPts: 0.5,
    owner: "Mountain recovery desk",
    status: "open",
    due: "2026-05-20"
  },
  {
    id: "act-006",
    priority: "medium",
    locationId: "pdk-atlanta",
    issue: "Protect Delta referral conversion during peak recovery periods",
    evidence: "Referral demand increased but service desk cycle time widened on disruption recovery legs.",
    estimatedImpactPts: 0.6,
    owner: "Southeast ops",
    status: "open",
    due: "2026-05-21"
  }
];

const itemById = Object.fromEntries(MENU_ITEMS.map((item) => [item.id, item]));
const channelById = Object.fromEntries(CHANNELS.map((channel) => [channel.id, channel]));
const PARTNER_CHANNELS = new Set(["broker-partner", "delta-referral", "group-cargo"]);

function seededRandom(seed) {
  let value = seed % 2147483647;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function isoDate(dayOffset) {
  return new Date(START.getTime() + dayOffset * DAY_MS).toISOString().slice(0, 10);
}

function weekLabel(dayOffset) {
  return `W${Math.floor(dayOffset / 7) + 1}`;
}

function weightedPick(items, random) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = random() * total;
  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) return item.value;
  }
  return items.at(-1).value;
}

function channelWeights(locationId, dayOffset) {
  const directLift = ["teb-teterboro", "pdk-atlanta", "dal-love"].includes(locationId) ? 0.04 : 0;
  const partnerPressure = ["vny-van-nuys", "teb-teterboro", "opf-miami"].includes(locationId) && dayOffset >= RECENT_PRESSURE_START ? 0.1 : 0;
  return [
    { value: "direct", weight: 24 + directLift * 100 },
    { value: "member-services", weight: 25 },
    { value: "delta-referral", weight: 11 },
    { value: "corporate-desk", weight: 17 },
    { value: "broker-partner", weight: 15 + partnerPressure * 95 },
    { value: "group-cargo", weight: 8 }
  ];
}

function locationDailyBase(location, dayOffset) {
  const capacity = location.capacity === "high" ? 1.28 : location.capacity === "pilot" ? 0.54 : 0.86;
  const weekend = [4, 5, 6].includes((dayOffset + 2) % 7) ? 1.16 : 1;
  const seasonal = location.market === "Aspen" || location.market === "Nantucket" ? 1 + Math.sin((dayOffset - 35) / 18) * 0.18 : 1 + Math.sin((dayOffset + location.id.length) / 11) * 0.05;
  const pressure = ["teb-teterboro", "opf-miami", "vny-van-nuys"].includes(location.id) && dayOffset >= RECENT_PRESSURE_START ? 0.94 : 1.01;
  return 8.5 * capacity * weekend * seasonal * pressure;
}

function itemForBrand(brandId, day, channelId, locationId) {
  const items = MENU_ITEMS.filter((item) => item.brand === brandId);
  const index = (day + channelId.length + locationId.length) % items.length;
  return items[index];
}

function buildOrder(day, location, index, channelId, item, random) {
  const channel = channelById[channelId];
  const isPartner = PARTNER_CHANNELS.has(channelId);
  const quantity = channelId === "group-cargo" && random() > 0.72 ? 2 : 1;
  const daypart = weightedPick(
    [
      { value: "morning departure", weight: 34 },
      { value: "midday turn", weight: 31 },
      { value: "evening return", weight: 26 },
      { value: "recovery", weight: 9 }
    ],
    random
  );
  const routeModifier = channelId === "group-cargo" ? 1.18 : channelId === "broker-partner" ? 1.08 : channelId === "direct" ? 0.98 : 1;
  const grossSales = round(item.price * quantity * routeModifier * (0.94 + random() * 0.14));
  const discountRate = channelId === "direct" ? 0.004 : channelId === "corporate-desk" ? 0.009 : isPartner ? 0.014 : 0.007;
  const merchantPromo = round(grossSales * discountRate);
  const platformPromoFunding = round(channelId === "delta-referral" && random() > 0.82 ? grossSales * 0.01 : 0);
  const recoveryStress = ["teb-teterboro", "opf-miami"].includes(location.id) && day >= RECENT_PRESSURE_START && daypart === "recovery" ? 0.075 : 0.018;
  const refundMerchant = round(random() < recoveryStress ? grossSales * (0.12 + random() * 0.22) : 0);
  const refundPlatform = round(random() < 0.004 ? grossSales * 0.05 : 0);
  const platformFee = round(channel.commission * grossSales + channel.fixed * quantity);
  const paymentFee = round(channel.payment * grossSales);
  const fuelInflation = item.category.includes("super") || item.category.includes("large") || item.category.includes("group") ? 1.055 : 1.024;
  const repositioningFactor = ["teb-teterboro", "vny-van-nuys", "ase-aspen"].includes(location.id) && day >= RECENT_PRESSURE_START ? 1.07 : 1;
  const foodCost = round(item.foodCost * quantity * fuelInflation * repositioningFactor * (0.96 + random() * 0.08));
  const packagingCost = round(item.packaging * quantity * (isPartner ? 1.1 : 1) * (daypart === "recovery" ? 1.08 : 1));

  return {
    id: `leg-${day}-${location.id}-${index}`,
    date: isoDate(day),
    week: weekLabel(day),
    locationId: location.id,
    brandId: item.brand,
    channelId,
    itemId: item.id,
    quantity,
    daypart,
    grossSales,
    discount: round(grossSales * 0.002),
    merchantPromo,
    platformPromoFunding,
    refundMerchant,
    refundPlatform,
    taxCollected: round(grossSales * 0.012),
    tipsCollected: 0,
    platformFee,
    paymentFee,
    foodCost,
    packagingCost,
    laborMinutes: round(item.laborMinutes * quantity * (daypart === "recovery" ? 1.18 : 1), 1)
  };
}

export function createSampleData() {
  const random = seededRandom(7319);
  const orders = [];
  const labor = [];

  for (let day = 0; day < DATA_DAYS; day += 1) {
    for (const location of LOCATIONS) {
      const dailyTarget = Math.max(4, Math.round(locationDailyBase(location, day) + random() * 4));
      const coverageTarget = CHANNELS.length * BRANDS.length;
      const projectedLegs = dailyTarget + coverageTarget;
      const laborBase = projectedLegs * (location.capacity === "high" ? 0.82 : location.capacity === "pilot" ? 0.54 : 0.68);
      const laborVariance = ["teb-teterboro", "opf-miami", "ase-aspen"].includes(location.id) && day >= RECENT_PRESSURE_START ? 1.1 : 1;
      const hourlyRate = location.district === "Northeast" ? 44 : location.district === "West" ? 43 : location.district === "Mountain" ? 41 : 39;
      labor.push({
        date: isoDate(day),
        locationId: location.id,
        scheduledHours: round(laborBase * 0.97, 1),
        actualHours: round(laborBase * laborVariance * (0.94 + random() * 0.14), 1),
        hourlyRate,
        payrollBurdenRate: 0.18
      });

      let orderIndex = 0;
      for (const channel of CHANNELS) {
        for (const brand of BRANDS) {
          const item = itemForBrand(brand.id, day, channel.id, location.id);
          orders.push(buildOrder(day, location, orderIndex, channel.id, item, random));
          orderIndex += 1;
        }
      }

      for (let i = 0; i < dailyTarget; i += 1) {
        const channelId = weightedPick(channelWeights(location.id, day), random);
        const item = weightedPick(
          MENU_ITEMS.map((menuItem) => ({
            value: menuItem,
            weight: menuItem.brand === "signature" ? 1.32 : menuItem.brand === "corporate" ? 1.12 : menuItem.brand === "on-demand" ? 1.08 : 0.9
          })),
          random
        );
        orders.push(buildOrder(day, location, orderIndex, channelId, item, random));
        orderIndex += 1;
      }
    }
  }

  return {
    generatedAt: "2026-05-11T08:30:00",
    locations: LOCATIONS,
    brands: BRANDS,
    channels: CHANNELS,
    menuItems: MENU_ITEMS,
    orders,
    labor,
    forecast: createForecast(orders, labor),
    actions: ACTIONS
  };
}

export function createForecast(orders, labor) {
  const random = seededRandom(1847);
  const byLocation = groupBy(orders, (order) => order.locationId);
  const laborByLocation = groupBy(labor, (row) => row.locationId);
  const weeks = Array.from({ length: FORECAST_WEEKS }, (_, index) => index + 1);

  return LOCATIONS.flatMap((location) => {
    const locationOrders = byLocation[location.id] || [];
    const locationLabor = laborByLocation[location.id] || [];
    const currentRevenue = locationOrders.reduce((sum, order) => sum + order.grossSales - order.discount - order.merchantPromo - order.refundMerchant, 0);
    const currentOrders = locationOrders.length;
    const currentCogs = locationOrders.reduce((sum, order) => sum + order.foodCost, 0);
    const currentLabor = locationLabor.reduce((sum, row) => sum + row.actualHours * row.hourlyRate * (1 + row.payrollBurdenRate), 0);
    const observedWeeks = Math.max(1, new Set(locationOrders.map((order) => order.week)).size);
    const weeklyRevenue = currentRevenue / observedWeeks;
    const weeklyOrders = currentOrders / observedWeeks;
    const weeklyCogs = currentCogs / observedWeeks;
    const weeklyLabor = currentLabor / observedWeeks;

    return weeks.map((week) => {
      const growth = 1 + week * 0.004 + Math.sin(week + location.id.length) * 0.011;
      const directMixLift = week >= 5 ? 0.006 * (week - 4) : 0;
      const partnerRisk = ["teb-teterboro", "vny-van-nuys", "opf-miami"].includes(location.id) && week >= 4 ? 0.014 : 0;
      const revenueForecast = round(weeklyRevenue * growth * (0.985 + random() * 0.03));
      const ordersForecast = Math.round(weeklyOrders * growth * (0.98 + random() * 0.04));
      const cogsForecast = round(weeklyCogs * (growth + 0.006 * week));
      const laborForecast = round(weeklyLabor * (1 + week * 0.003));
      const marginForecast = round(revenueForecast - cogsForecast - laborForecast - revenueForecast * (0.13 - directMixLift + partnerRisk));
      return {
        week: `Week ${week}`,
        locationId: location.id,
        revenueForecast,
        ordersForecast,
        cogsForecast,
        laborForecast,
        marginForecast,
        directMixTarget: round(0.255 + directMixLift, 3),
        confidenceLow: round(marginForecast * 0.9),
        confidenceHigh: round(marginForecast * 1.1)
      };
    });
  });
}

function groupBy(rows, keyFn) {
  return rows.reduce((groups, row) => {
    const key = keyFn(row);
    groups[key] ||= [];
    groups[key].push(row);
    return groups;
  }, {});
}

export function toSampleCsv(data) {
  const orderRows = data.orders.slice(0, 48).map((order) => ({
    date: order.date,
    base: LOCATIONS.find((location) => location.id === order.locationId).name,
    product_line: BRANDS.find((brand) => brand.id === order.brandId).name,
    channel: CHANNELS.find((channel) => channel.id === order.channelId).name,
    aircraft_mission: itemById[order.itemId].name,
    flight_legs: order.quantity,
    gross_revenue: order.grossSales,
    recovery_credit: order.merchantPromo,
    service_credit: order.refundMerchant,
    partner_selling_cost: order.platformFee,
    fuel_crew_aircraft_cost: order.foodCost,
    fbo_handling_cost: order.packagingCost,
    dispatch_minutes: order.laborMinutes
  }));

  const laborRows = data.labor.slice(0, 24).map((row) => ({
    date: row.date,
    base: LOCATIONS.find((location) => location.id === row.locationId).name,
    scheduled_hours: row.scheduledHours,
    actual_hours: row.actualHours,
    hourly_rate: row.hourlyRate,
    payroll_burden_rate: row.payrollBurdenRate
  }));

  return { orderRows, laborRows };
}
