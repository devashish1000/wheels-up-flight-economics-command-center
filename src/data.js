const START = new Date("2024-05-13T00:00:00");
const DAY_MS = 86400000;
const DATA_DAYS = 729;
const RECENT_PRESSURE_START = DATA_DAYS - 10;
const FORECAST_WEEKS = 104;

export const LOCATIONS = [
  { id: "east-new-york", name: "New York service area", market: "New York", district: "East Primary Service Area", manager: "East member operations", opened: "2024-05-20", capacity: "high" },
  { id: "east-florida", name: "Florida service area", market: "Florida", district: "East Primary Service Area", manager: "Florida operations", opened: "2024-06-24", capacity: "high" },
  { id: "east-georgia", name: "Georgia / Atlanta service area", market: "Georgia", district: "East Primary Service Area", manager: "Southeast operations", opened: "2024-05-27", capacity: "medium" },
  { id: "east-illinois", name: "Illinois / Chicago service area", market: "Illinois", district: "East Primary Service Area", manager: "Central fleet desk", opened: "2024-10-14", capacity: "medium" },
  { id: "east-massachusetts", name: "Massachusetts service area", market: "Massachusetts", district: "East Primary Service Area", manager: "Northeast fleet lead", opened: "2024-07-15", capacity: "medium" },
  { id: "east-tennessee", name: "Tennessee service area", market: "Tennessee", district: "East Primary Service Area", manager: "Corporate desk south", opened: "2025-02-03", capacity: "medium" },
  { id: "tx-dallas", name: "Dallas, TX", market: "Texas", district: "East Primary Service Area", manager: "Texas operations", opened: "2024-08-05", capacity: "high" },
  { id: "tx-houston", name: "Houston, TX", market: "Texas", district: "East Primary Service Area", manager: "Texas operations", opened: "2024-08-19", capacity: "medium" },
  { id: "tx-austin", name: "Austin, TX", market: "Texas", district: "East Primary Service Area", manager: "Texas member desk", opened: "2024-09-09", capacity: "medium" },
  { id: "west-california", name: "California service area", market: "California", district: "West Primary Service Area", manager: "West coast operations", opened: "2024-06-17", capacity: "high" },
  { id: "west-arizona", name: "Arizona service area", market: "Arizona", district: "West Primary Service Area", manager: "West member desk", opened: "2024-09-30", capacity: "medium" },
  { id: "west-colorado", name: "Colorado service area", market: "Colorado", district: "West Primary Service Area", manager: "Mountain operations", opened: "2024-11-18", capacity: "medium" },
  { id: "west-nevada", name: "Nevada service area", market: "Nevada", district: "West Primary Service Area", manager: "Event charter desk", opened: "2025-03-03", capacity: "medium" },
  { id: "kjac-jackson-hole", name: "KJAC Jackson Hole", market: "Wyoming", district: "Extended Service Area", manager: "Extended-area desk", opened: "2025-01-06", capacity: "access" },
  { id: "ksun-sun-valley", name: "KSUN Sun Valley", market: "Idaho", district: "Extended Service Area", manager: "Extended-area desk", opened: "2025-01-13", capacity: "access" },
  { id: "kbzn-bozeman", name: "KBZN Bozeman", market: "Montana", district: "Extended Service Area", manager: "Extended-area desk", opened: "2025-01-20", capacity: "access" },
  { id: "bahamas-nassau", name: "MYNN Nassau, Bahamas", market: "Bahamas", district: "Extended Service Area", manager: "International access desk", opened: "2025-02-17", capacity: "access" },
  { id: "europe-access", name: "Europe access countries", market: "Europe", district: "Access Service Area", manager: "Global charter desk", opened: "2025-03-24", capacity: "access" }
];

export const BRANDS = [
  { id: "signature", name: "Wheels Up Signature Membership", tone: "#1b4e7a" },
  { id: "on-demand", name: "Global Private Charter", tone: "#315f72" },
  { id: "corporate", name: "Corporate Membership / CES", tone: "#4b6d8d" },
  { id: "delta", name: "Delta Premium Commercial", tone: "#7b2433" },
  { id: "group", name: "Group Charter", tone: "#7a5a23" },
  { id: "cargo", name: "Air Partner Cargo / Special Missions", tone: "#3f5f58" }
];

export const CHANNELS = [
  { id: "direct", name: "Wheels Up app + website", commission: 0.018, payment: 0.012, fixed: 95, color: "#2467a6" },
  { id: "member-services", name: "Sales + service team", commission: 0.038, payment: 0.012, fixed: 145, color: "#18364d" },
  { id: "delta-referral", name: "Delta partnership booking", commission: 0.048, payment: 0.011, fixed: 150, color: "#8c2f39" },
  { id: "corporate-desk", name: "Corporate membership team", commission: 0.032, payment: 0.01, fixed: 165, color: "#556a7f" },
  { id: "broker-partner", name: "Safety-vetted operator network", commission: 0.078, payment: 0.012, fixed: 245, color: "#b8752a" },
  { id: "group-cargo", name: "Air Partner group + cargo desk", commission: 0.055, payment: 0.01, fixed: 285, color: "#4c6b63" }
];

export const MENU_ITEMS = [
  { id: "phenom-signature", brand: "signature", name: "Phenom 300 series Signature flight", category: "premium light jet", price: 24800, foodCost: 17600, packaging: 1550, laborMinutes: 70, imageSlot: 0 },
  { id: "challenger-signature", brand: "signature", name: "Challenger 300 series Signature flight", category: "premium super-mid jet", price: 35800, foodCost: 26200, packaging: 2350, laborMinutes: 86, imageSlot: 1 },
  { id: "phenom-charter", brand: "on-demand", name: "Phenom 300 global charter", category: "private jet charter", price: 27200, foodCost: 20100, packaging: 1750, laborMinutes: 76, imageSlot: 0 },
  { id: "operator-charter", brand: "on-demand", name: "Safety-vetted operator charter", category: "operator network", price: 39200, foodCost: 30700, packaging: 2650, laborMinutes: 90, imageSlot: 3 },
  { id: "corporate-member", brand: "corporate", name: "Corporate Membership business trip", category: "corporate membership", price: 29800, foodCost: 21900, packaging: 2050, laborMinutes: 82, imageSlot: 2 },
  { id: "ces-itinerary", brand: "corporate", name: "Custom Enterprise Solutions itinerary", category: "enterprise travel", price: 41800, foodCost: 32400, packaging: 2880, laborMinutes: 96, imageSlot: 2 },
  { id: "delta-premium", brand: "delta", name: "Delta premium cabin booking", category: "premium commercial", price: 6200, foodCost: 4550, packaging: 380, laborMinutes: 26, imageSlot: 1 },
  { id: "hybrid-private-commercial", brand: "delta", name: "Hybrid Delta + private itinerary", category: "private-commercial connection", price: 18600, foodCost: 13700, packaging: 1280, laborMinutes: 66, imageSlot: 1 },
  { id: "event-group-charter", brand: "group", name: "Group Charter 15+ passenger movement", category: "group charter", price: 68400, foodCost: 54800, packaging: 4950, laborMinutes: 112, imageSlot: 3 },
  { id: "team-sports-charter", brand: "group", name: "Sports/team charter movement", category: "group charter", price: 81200, foodCost: 65800, packaging: 5820, laborMinutes: 126, imageSlot: 3 },
  { id: "air-partner-cargo", brand: "cargo", name: "Air Partner Cargo service", category: "cargo charter", price: 52200, foodCost: 41600, packaging: 4550, laborMinutes: 104, imageSlot: 2 },
  { id: "special-mission", brand: "cargo", name: "Government / defense special mission", category: "special mission", price: 64600, foodCost: 51900, packaging: 5450, laborMinutes: 118, imageSlot: 2 }
];

export const ACTIONS = [
  {
    id: "act-001",
    priority: "high",
    locationId: "east-new-york",
    issue: "Reduce East-area recovery lift after Sunday member returns",
    evidence: "New York service-area recovery flights rose 1.6 pts and repositioning cost per flight leg is above the modeled network median.",
    estimatedImpactPts: 1.4,
    owner: "Northeast dispatch",
    status: "open",
    due: "2026-05-14"
  },
  {
    id: "act-002",
    priority: "high",
    locationId: "east-florida",
    issue: "Tighten Florida recovery playbook for weather disruption windows",
    evidence: "Service credits increased during PM convective weather while app + website bookings held demand.",
    estimatedImpactPts: 1.1,
    owner: "Florida operations",
    status: "in progress",
    due: "2026-05-16"
  },
  {
    id: "act-003",
    priority: "high",
    locationId: "west-california",
    issue: "Shift high-value West demand from operator network to Signature fleet",
    evidence: "Safety-vetted operator network mix increased on super-mid missions with lower trip-level contribution.",
    estimatedImpactPts: 1.3,
    owner: "West coast ops",
    status: "open",
    due: "2026-05-18"
  },
  {
    id: "act-004",
    priority: "medium",
    locationId: "tx-dallas",
    issue: "Rebalance Phenom availability ahead of Monday corporate departures",
    evidence: "Corporate membership demand is forecast above seat-hour plan while Phenom availability is below target.",
    estimatedImpactPts: 0.7,
    owner: "Central operations",
    status: "queued",
    due: "2026-05-19"
  },
  {
    id: "act-005",
    priority: "medium",
    locationId: "kjac-jackson-hole",
    issue: "Audit FBO and handling cost variance in extended-area mountain operations",
    evidence: "FBO/handling cost per leg is 14.8% above the modeled extended-area median after seasonal ramp changes.",
    estimatedImpactPts: 0.5,
    owner: "Mountain recovery desk",
    status: "open",
    due: "2026-05-20"
  },
  {
    id: "act-006",
    priority: "medium",
    locationId: "east-georgia",
    issue: "Protect Delta partnership conversion during peak recovery periods",
    evidence: "Delta partnership demand increased but service team cycle time widened on recovery itineraries.",
    estimatedImpactPts: 0.6,
    owner: "Southeast ops",
    status: "open",
    due: "2026-05-21"
  }
];

const itemById = Object.fromEntries(MENU_ITEMS.map((item) => [item.id, item]));
const channelById = Object.fromEntries(CHANNELS.map((channel) => [channel.id, channel]));
const PARTNER_CHANNELS = new Set(["broker-partner", "delta-referral", "group-cargo"]);
const SUPPORTED_CHANNELS_BY_BRAND = {
  signature: new Set(["direct", "member-services", "corporate-desk", "delta-referral"]),
  "on-demand": new Set(["direct", "member-services", "broker-partner"]),
  corporate: new Set(["direct", "member-services", "corporate-desk"]),
  delta: new Set(["direct", "delta-referral"]),
  group: new Set(["member-services", "group-cargo"]),
  cargo: new Set(["broker-partner", "group-cargo"])
};

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
  const directLift = ["east-new-york", "east-georgia", "tx-dallas"].includes(locationId) ? 0.05 : 0;
  const partnerPressure = ["west-california", "east-new-york", "east-florida"].includes(locationId) && dayOffset >= RECENT_PRESSURE_START ? 0.08 : 0;
  return [
    { value: "direct", weight: 23 + directLift * 100 },
    { value: "member-services", weight: 24 },
    { value: "delta-referral", weight: 12 },
    { value: "corporate-desk", weight: 18 },
    { value: "broker-partner", weight: 15 + partnerPressure * 90 },
    { value: "group-cargo", weight: 8 }
  ];
}

function locationDailyBase(location, dayOffset) {
  const capacity = location.capacity === "high" ? 1.2 : location.capacity === "access" ? 0.35 : 0.72;
  const weekend = [4, 5, 6].includes((dayOffset + 2) % 7) ? 1.16 : 1;
  const seasonal = ["Wyoming", "Idaho", "Montana", "Bahamas", "Europe"].includes(location.market) ? 1 + Math.sin((dayOffset - 35) / 18) * 0.18 : 1 + Math.sin((dayOffset + location.id.length) / 11) * 0.05;
  const pressure = ["east-new-york", "east-florida", "west-california"].includes(location.id) && dayOffset >= RECENT_PRESSURE_START ? 0.94 : 1.01;
  return 2.6 * capacity * weekend * seasonal * pressure;
}

function itemForBrand(brandId, day, channelId, locationId) {
  const items = MENU_ITEMS.filter((item) => item.brand === brandId);
  const index = (day + channelId.length + locationId.length) % items.length;
  return items[index];
}

function supportsChannel(brandId, channelId) {
  return SUPPORTED_CHANNELS_BY_BRAND[brandId]?.has(channelId) ?? true;
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
  const routeModifier = channelId === "group-cargo" ? 1.16 : channelId === "broker-partner" ? 1.07 : channelId === "direct" ? 0.98 : 1;
  const grossSales = round(item.price * quantity * routeModifier * (0.94 + random() * 0.14));
  const discountRate = channelId === "direct" ? 0.004 : channelId === "corporate-desk" ? 0.009 : isPartner ? 0.014 : 0.007;
  const merchantPromo = round(grossSales * discountRate);
  const platformPromoFunding = round(channelId === "delta-referral" && random() > 0.82 ? grossSales * 0.01 : 0);
  const recoveryStress = ["teb-teterboro", "opf-miami"].includes(location.id) && day >= RECENT_PRESSURE_START && daypart === "recovery" ? 0.075 : 0.018;
  const refundMerchant = round(random() < recoveryStress ? grossSales * (0.12 + random() * 0.22) : 0);
  const refundPlatform = round(random() < 0.004 ? grossSales * 0.05 : 0);
  const platformFee = round(channel.commission * grossSales + channel.fixed * quantity);
  const paymentFee = round(channel.payment * grossSales);
  const fuelInflation = item.category.includes("super") || item.category.includes("charter") || item.category.includes("group") ? 1.055 : 1.024;
  const repositioningFactor = ["east-new-york", "west-california", "kjac-jackson-hole"].includes(location.id) && day >= RECENT_PRESSURE_START ? 1.07 : 1;
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
      const dailyTarget = Math.max(0, Math.round(locationDailyBase(location, day) + random() * 1.6 - 0.5));
      const coverageTarget = Math.ceil((CHANNELS.length * BRANDS.length) / 7);
      const projectedLegs = dailyTarget + coverageTarget;
      const laborBase = projectedLegs * (location.capacity === "high" ? 1.55 : location.capacity === "access" ? 0.86 : 1.22);
      const laborVariance = ["east-new-york", "east-florida", "kjac-jackson-hole"].includes(location.id) && day >= RECENT_PRESSURE_START ? 1.1 : 1;
      const hourlyRate = location.district === "East Primary Service Area" ? 44 : location.district === "West Primary Service Area" ? 43 : location.district === "Extended Service Area" ? 42 : 46;
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
          if (!supportsChannel(brand.id, channel.id)) continue;
          const cadence = ["group", "cargo"].includes(brand.id) ? 14 : 7;
          if ((day + channel.id.length + brand.id.length + location.id.length) % cadence !== 0) continue;
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
            weight: menuItem.brand === "signature" ? 1.52 : menuItem.brand === "corporate" ? 1.18 : menuItem.brand === "on-demand" ? 1.12 : ["group", "cargo"].includes(menuItem.brand) ? 0.42 : 0.82
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
      const partnerRisk = ["east-new-york", "west-california", "east-florida"].includes(location.id) && week >= 4 ? 0.014 : 0;
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
    service_area: LOCATIONS.find((location) => location.id === order.locationId).name,
    product_line: BRANDS.find((brand) => brand.id === order.brandId).name,
    channel: CHANNELS.find((channel) => channel.id === order.channelId).name,
    aircraft_mission: itemById[order.itemId].name,
    flight_legs: order.quantity,
    gross_bookings: order.grossSales,
    recovery_credit: order.merchantPromo,
    service_credit: order.refundMerchant,
    partner_selling_cost: order.platformFee,
    fuel_crew_aircraft_cost: order.foodCost,
    fbo_handling_cost: order.packagingCost,
    dispatch_minutes: order.laborMinutes
  }));

  const laborRows = data.labor.slice(0, 24).map((row) => ({
    date: row.date,
    service_area: LOCATIONS.find((location) => location.id === row.locationId).name,
    scheduled_hours: row.scheduledHours,
    actual_hours: row.actualHours,
    hourly_rate: row.hourlyRate,
    payroll_burden_rate: row.payrollBurdenRate
  }));

  return { orderRows, laborRows };
}
