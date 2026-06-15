import { formatters, round } from "./calculations.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function svg(width, height, className = "chart") {
  const node = document.createElementNS(SVG_NS, "svg");
  node.setAttribute("viewBox", `0 0 ${width} ${height}`);
  node.setAttribute("role", "img");
  node.setAttribute("class", className);
  return node;
}

function chartDimensions(container, fallbackWidth, fallbackHeight, maxHeight = null) {
  const availableWidth = container.clientWidth;
  const width = Math.max(220, Math.round(availableWidth || fallbackWidth));
  const height = maxHeight ? Math.round((width / fallbackWidth) * fallbackHeight) : fallbackHeight;
  return { width, height: Math.min(maxHeight ?? height, height) };
}

function resetChart(container) {
  container.replaceChildren();
  container.classList.add("interactive-chart-host");
  return globalTooltip();
}

function globalTooltip() {
  let tooltip = document.querySelector("#chart-tooltip");
  if (tooltip) return tooltip;
  tooltip = document.createElement("div");
  tooltip.id = "chart-tooltip";
  tooltip.className = "chart-tooltip";
  tooltip.hidden = true;
  tooltip.setAttribute("role", "status");
  tooltip.setAttribute("aria-live", "polite");
  document.body.appendChild(tooltip);
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".chart-mark")) {
      hideTooltip(tooltip);
      clearAllActiveMarks();
    }
  });
  window.addEventListener("resize", () => hideTooltip(tooltip));
  window.addEventListener("scroll", () => hideTooltip(tooltip), true);
  return tooltip;
}

function el(name, attrs = {}, text = "") {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  if (text) node.textContent = text;
  return node;
}

function multilineText(parent, lines, attrs = {}, lineHeight = 10) {
  const node = el("text", attrs);
  lines.filter(Boolean).forEach((line, index) => {
    node.appendChild(
      el(
        "tspan",
        { x: attrs.x, dy: index === 0 ? 0 : lineHeight },
        line
      )
    );
  });
  parent.appendChild(node);
  return node;
}

export function renderSparkline(container, values, options = {}) {
  const tooltip = resetChart(container);
  const width = options.width || 128;
  const height = options.height || 36;
  const node = svg(width, height, "sparkline");
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1 || 1)) * width;
      const y = height - ((value - min) / span) * (height - 8) - 4;
      return `${round(x, 1)},${round(y, 1)}`;
    })
    .join(" ");
  node.appendChild(
    el("polyline", {
      points,
      fill: "none",
      stroke: options.color || "#2f7d48",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    })
  );
  const lastX = width;
  const lastY = height - ((values.at(-1) - min) / span) * (height - 8) - 4;
  node.appendChild(el("circle", {
    cx: round(lastX, 1),
    cy: round(lastY, 1),
    r: 3.5,
    class: "spark-end-point",
    fill: options.color || "#2f7d48"
  }));
  const hit = el("rect", {
    x: 0,
    y: 0,
    width,
    height,
    rx: 6,
    class: "chart-hit-area chart-mark spark-hit",
    tabindex: 0,
    role: "button",
    "aria-label": `${options.title || "Metric trend"} trend detail`
  });
  node.appendChild(hit);
  registerMark(hit, container, tooltip, {
    title: options.title || "Metric trend",
    kicker: options.comparison || "prior period movement",
    rows: [
      ["Current", options.current || formatters.currency(values.at(-1), true)],
      ["Prior", options.previous || "prior period"],
      ["Change", options.delta || "trend available"]
    ],
    note: "Sparkline reflects the selected dashboard filter."
  });
  container.appendChild(node);
}

export function renderWaterfall(container, bridge) {
  const tooltip = resetChart(container);
  const { width, height } = chartDimensions(container, 620, 278);
  const compact = width < 560;
  const pad = { top: 30, right: compact ? 14 : 22, bottom: compact ? 78 : 72, left: compact ? 42 : 50 };
  const node = svg(width, height, "chart waterfall-chart");
  const { minValue, maxValue, ticks } = waterfallScale(bridge);
  const yScale = (value) => {
    const usable = height - pad.top - pad.bottom;
    return pad.top + (maxValue - value) / (maxValue - minValue || 1) * usable;
  };
  const xStep = (width - pad.left - pad.right) / bridge.length;

  ticks.forEach((tick) => {
    const y = yScale(tick);
    node.appendChild(el("line", { x1: pad.left, x2: width - pad.right, y1: y, y2: y, class: "grid-line" }));
    node.appendChild(el("text", { x: 12, y: y + 4, class: "axis-label axis-y-label" }, formatters.percent(tick, 0)));
  });

  let cursor = bridge[0].value;
  bridge.forEach((item, index) => {
    const x = pad.left + index * xStep + 12;
    const barWidth = xStep - 24;
    let y;
    let barHeight;
    let colorClass;
    if (item.type === "start" || item.type === "end") {
      y = yScale(item.value) - 2;
      barHeight = 4;
      colorClass = "bar-total";
    } else {
      const next = cursor + item.value;
      y = yScale(Math.max(cursor, next));
      barHeight = Math.max(3, Math.abs(yScale(cursor) - yScale(next)));
      colorClass = item.value >= 0 ? "bar-good" : "bar-bad";
      node.appendChild(
        el("line", {
          x1: x - 12,
          x2: x,
          y1: yScale(cursor),
          y2: yScale(cursor),
          class: "connector-line"
        })
      );
      cursor = next;
    }
    const visual = el("rect", { x, y, width: barWidth, height: barHeight, rx: 3, class: `${colorClass} waterfall-visual` });
    const hitGroup = el("g", {
      class: "chart-interactive-group chart-mark waterfall-group",
      tabindex: 0,
      role: "button",
      "aria-label": `${item.label} ${item.type ? formatters.percent(item.value) : formatters.points(item.value)}`
    });
    hitGroup.appendChild(visual);
    const hitTop = Math.min(y, yScale(cursor)) - 12;
    hitGroup.appendChild(el("rect", {
      x: x - 5,
      y: Math.max(pad.top - 6, hitTop),
      width: barWidth + 10,
      height: Math.max(28, barHeight + 24),
      rx: 5,
      class: "chart-hit-area"
    }));
    node.appendChild(hitGroup);
    const driverStart = item.type ? null : cursor - item.value;
    const driverEnd = item.type ? null : cursor;
    registerMark(hitGroup, container, tooltip, waterfallTooltip(item, driverStart, driverEnd));
    const labelY = y - 9;
    const labelClass = item.value >= 0 ? "value-label good" : "value-label bad";
    node.appendChild(
      el(
        "text",
        { x: x + barWidth / 2, y: labelY, class: labelClass, "text-anchor": "middle" },
        item.type ? formatters.percent(item.value) : formatters.points(item.value)
      )
    );
    const labelLines = compact ? waterfallCompactLabel(item) : waterfallLabel(item.label);
    if (labelLines.length) {
      multilineText(
        node,
        labelLines,
        {
          x: x + barWidth / 2,
          y: height - 38,
          class: "axis-label chart-x-label",
          "text-anchor": "middle"
        },
        10
      );
    }
  });

  container.appendChild(node);
}

export function renderDonut(container, rows) {
  const tooltip = resetChart(container);
  const { width, height } = chartDimensions(container, 260, 220);
  const scale = width / 260;
  const cx = Math.round(105 * scale);
  const cy = Math.round(108 * scale);
  const radius = Math.max(58, Math.round(72 * scale));
  const thickness = Math.max(26, Math.round(34 * scale));
  const node = svg(width, height, "chart donut-chart");

  if (!rows.length) {
    node.appendChild(el("circle", {
      cx,
      cy,
      r: radius,
      fill: "none",
      stroke: "#e6ebe8",
      "stroke-width": thickness,
      "stroke-dasharray": `${radius * 2}`
    }));
    node.appendChild(el("text", { x: cx, y: cy - 2, class: "axis-label donut-subtitle", "text-anchor": "middle" }, "No channel data"));
    node.appendChild(el("text", { x: cx, y: cy + 16, class: "axis-label", "text-anchor": "middle" }, "for selected filters"));
    container.appendChild(node);
    return;
  }
  let startAngle = -90;

  if (rows.length === 1 && rows[0].pct >= 0.999) {
    const segment = el("circle", {
      cx,
      cy,
      r: radius - thickness / 2,
      fill: "none",
      stroke: rows[0].color,
      "stroke-width": thickness,
      class: "donut-segment donut-full chart-mark",
      tabindex: 0,
      role: "button",
      "aria-label": `${rows[0].label} ${formatters.percent(rows[0].pct)}`
    });
    node.appendChild(segment);
    registerMark(segment, container, tooltip, donutTooltip(rows[0]));
  } else {
    rows.forEach((row) => {
      const endAngle = startAngle + row.pct * 360;
      const path = donutSegment(cx, cy, radius, thickness, startAngle, endAngle);
      const segment = el("path", {
        d: path,
        fill: row.color,
        stroke: "#fff",
        "stroke-width": "2",
        class: "donut-segment chart-mark",
        tabindex: 0,
        role: "button",
        "aria-label": `${row.label} ${formatters.percent(row.pct)}`
      });
      node.appendChild(segment);
      registerMark(segment, container, tooltip, donutTooltip(row));
      startAngle = endAngle;
    });
  }

  node.appendChild(el("text", { x: cx, y: cy - 4, class: "donut-center", "text-anchor": "middle" }, formatters.currency(rows.reduce((sum, row) => sum + row.value, 0), true)));
  node.appendChild(el("text", { x: cx, y: cy + 18, class: "axis-label donut-subtitle", "text-anchor": "middle" }, "gross bookings"));
  container.appendChild(node);
}

export function renderForecast(container, series, options = {}) {
  const tooltip = resetChart(container);
  const { width, height } = chartDimensions(container, 650, 290, 290);
  const compact = options.labelMode === "compact";
  const pad = { top: 24, right: compact ? 18 : 24, bottom: 40, left: compact ? 44 : 50 };
  const node = svg(width, height, `chart forecast-chart${compact ? " forecast-chart-compact" : ""}`);
  if (!series.length) {
    node.appendChild(el("line", { x1: pad.left, x2: width - pad.right, y1: (height - pad.top - pad.bottom) / 2 + pad.top, y2: (height - pad.top - pad.bottom) / 2 + pad.top, class: "grid-line" }));
    node.appendChild(el("text", {
      x: width / 2,
      y: (height - pad.top - pad.bottom) / 2 + pad.top - 10,
      class: "axis-label",
      "text-anchor": "middle"
    }, "No forecast rows for selected filters"));
    node.appendChild(el("text", {
      x: width / 2,
      y: (height - pad.top - pad.bottom) / 2 + pad.top + 10,
      class: "axis-label",
      "text-anchor": "middle"
    }, "Adjust filters to reveal the forecast coverage"));
    container.appendChild(node);
    return;
  }
  const values = series.flatMap((row) => [row.baseMarginPct, row.scenarioMarginPct]);
  const { min, max, ticks } = percentScale(values, { include: [0.2], padding: 0.11, maxTicks: compact ? 4 : 6 });
  const x = (index) => pad.left + (index / (series.length - 1)) * (width - pad.left - pad.right);
  const y = (value) => pad.top + (max - value) / (max - min) * (height - pad.top - pad.bottom);
  const labelIndexes = forecastLabelIndexes(series.length, options.labelMode || "full");

  ticks.forEach((tick) => {
    const tickY = y(tick);
    node.appendChild(el("line", { x1: pad.left, x2: width - pad.right, y1: tickY, y2: tickY, class: "grid-line" }));
    node.appendChild(el("text", { x: 10, y: tickY + 4, class: "axis-label axis-y-label" }, formatters.percent(tick, 0)));
  });

  node.appendChild(linePath(series.map((row, index) => [x(index), y(row.baseMarginPct)]), "forecast-base"));
  node.appendChild(linePath(series.map((row, index) => [x(index), y(row.scenarioMarginPct)]), "forecast-scenario"));
  if (0.2 >= min && 0.2 <= max) {
    node.appendChild(el("line", { x1: pad.left, x2: width - pad.right, y1: y(0.2), y2: y(0.2), class: "target-line" }));
  }

  series.forEach((row, index) => {
    const pointX = x(index);
    const group = el("g", {
      class: "chart-interactive-group chart-mark forecast-hover-group",
      tabindex: 0,
      role: "button",
      "aria-label": `${row.week} base ${formatters.percent(row.baseMarginPct)} scenario ${formatters.percent(row.scenarioMarginPct)}`
    });
    const bandWidth = Math.max(28, (width - pad.left - pad.right) / series.length);
    group.appendChild(el("line", {
      x1: pointX,
      x2: pointX,
      y1: pad.top,
      y2: height - pad.bottom,
      class: "forecast-hover-line"
    }));
    group.appendChild(el("circle", { cx: pointX, cy: y(row.baseMarginPct), r: compact ? 3 : 3.5, class: "forecast-point base" }));
    group.appendChild(el("circle", { cx: pointX, cy: y(row.scenarioMarginPct), r: compact ? 3 : 3.5, class: "forecast-point scenario" }));
    group.appendChild(el("rect", {
      x: pointX - bandWidth / 2,
      y: pad.top,
      width: bandWidth,
      height: height - pad.top - pad.bottom,
      class: "chart-hit-area"
    }));
    node.appendChild(group);
    registerMark(group, container, tooltip, forecastTooltip(row));
  });

  series.forEach((row, index) => {
    if (labelIndexes.has(index)) {
      node.appendChild(el("text", { x: x(index), y: height - 12, class: "axis-label chart-x-label forecast-x-label", "text-anchor": "middle" }, `W${index + 1}`));
    }
  });

  container.appendChild(node);
}

function forecastLabelIndexes(length, mode) {
  if (length <= 0) return new Set();
  if (mode === "compact") {
    return new Set([0, Math.floor((length - 1) / 2), length - 1]);
  }
  const maxLabels = length > 52 ? 12 : 14;
  const labelStep = Math.max(2, Math.ceil(length / maxLabels));
  const indexes = new Set([0, length - 1]);
  for (let index = 0; index < length; index += labelStep) {
    indexes.add(index);
  }
  return indexes;
}

function waterfallScale(bridge) {
  if (!bridge.length) return { minValue: 0, maxValue: 0.12, ticks: [0, 0.04, 0.08, 0.12] };
  let cursor = bridge[0]?.value || 0;
  const values = [cursor];
  bridge.slice(1).forEach((item) => {
    if (item.type === "end") {
      values.push(item.value);
      return;
    }
    values.push(cursor);
    cursor += item.value || 0;
    values.push(cursor);
  });
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = Math.max(0.025, rawMax - rawMin);
  return percentScale(values, {
    padding: 0.28,
    floor: Math.max(0, rawMin - span * 0.55),
    ceiling: Math.min(0.5, rawMax + span * 0.85),
    maxTicks: 5
  });
}

function percentScale(values, options = {}) {
  const include = options.include || [];
  const allValues = [...values, ...include].filter((value) => Number.isFinite(value));
  const rawMin = allValues.length ? Math.min(...allValues) : 0;
  const rawMax = allValues.length ? Math.max(...allValues) : 0.1;
  const span = Math.max(0.02, rawMax - rawMin);
  let min = Number.isFinite(options.floor) ? options.floor : Math.max(0, rawMin - span * (options.padding ?? 0.16));
  let max = Number.isFinite(options.ceiling) ? options.ceiling : rawMax + span * (options.padding ?? 0.16);
  if (max - min < 0.06) {
    const midpoint = (max + min) / 2;
    min = Math.max(0, midpoint - 0.03);
    max = midpoint + 0.03;
  }
  const scale = percentTickScale(min, max, options.maxTicks || 5);
  return {
    min: scale.min,
    max: scale.max,
    minValue: scale.min,
    maxValue: scale.max,
    ticks: scale.ticks
  };
}

function percentTickScale(min, max, maxTicks = 5) {
  const steps = [0.005, 0.01, 0.02, 0.025, 0.05, 0.1, 0.2];
  const span = Math.max(0.01, max - min);
  const build = (step) => {
    const start = Math.max(0, Math.floor(min / step) * step);
    const end = Math.ceil(max / step) * step;
    const count = Math.round((end - start) / step) + 1;
    return { step, start, end, count };
  };
  const chosen = steps.map(build).find((candidate) => (
    candidate.count >= 3 && candidate.count <= maxTicks
  )) || steps.map(build).find((candidate) => (
    candidate.count >= 3 && candidate.count <= maxTicks + 1
  )) || build(steps.find((candidate) => span / candidate <= maxTicks - 1) || steps.at(-1));
  const ticks = [];
  for (let tick = chosen.start; tick <= chosen.end + chosen.step / 2; tick += chosen.step) {
    const rounded = round(tick, 4);
    if (rounded >= 0) {
      ticks.push(rounded);
    }
  }
  return {
    min: chosen.start,
    max: chosen.end,
    ticks: ticks.length >= 2 ? ticks : [round(chosen.start, 3), round(chosen.end, 3)]
  };
}

export function renderBarTrend(container, rows, accessor, labelAccessor) {
  const tooltip = resetChart(container);
  const { width, height } = chartDimensions(container, 520, 246);
  const pad = { top: 26, right: 54, bottom: 18, left: 154 };
  const node = svg(width, height, "chart bar-chart");
  if (!rows.length) {
    node.appendChild(el("line", { x1: pad.left, x2: width - pad.right, y1: height / 2, y2: height / 2, class: "grid-line" }));
    node.appendChild(el("text", {
      x: width / 2,
      y: height / 2 - 10,
      class: "axis-label",
      "text-anchor": "middle"
    }, "No fleet economics data for these filters"));
    node.appendChild(el("text", {
      x: width / 2,
      y: height / 2 + 10,
      class: "axis-label",
      "text-anchor": "middle"
    }, "Refine the date, market, product line, or channel selection"));
    container.appendChild(node);
    return;
  }
  const values = rows.map(accessor);
  const max = Math.max(...values, 0.5);
  const rowStep = (height - pad.top - pad.bottom) / rows.length;
  const usableWidth = width - pad.left - pad.right;

  [0.3, 0.4, 0.5].forEach((tick) => {
    const tickX = pad.left + (tick / max) * usableWidth;
    node.appendChild(el("line", { x1: tickX, x2: tickX, y1: pad.top - 6, y2: height - pad.bottom, class: "grid-line" }));
    node.appendChild(el("text", { x: tickX, y: 14, class: "axis-label menu-scale-label", "text-anchor": "middle" }, formatters.percent(tick, 0)));
  });

  rows.forEach((row, index) => {
    const value = accessor(row);
    const barWidth = Math.max(3, (value / max) * usableWidth);
    const y = pad.top + index * rowStep + rowStep / 2;
    node.appendChild(
      el(
        "text",
        { x: 8, y: y + 4, class: "axis-label menu-item-label" },
        truncateLabel(labelAccessor(row), 23)
      )
    );
    const group = el("g", {
      class: "chart-interactive-group chart-mark menu-bar-group",
      tabindex: 0,
      role: "button",
      "aria-label": `${labelAccessor(row)} ${formatters.percent(value)} contribution margin`
    });
    group.appendChild(el("rect", { x: pad.left, y: y - 8, width: barWidth, height: 16, rx: 4, class: `${value < 0.34 ? "bar-bad" : value > 0.52 ? "bar-good" : "bar-neutral"} menu-bar-visual` }));
    group.appendChild(el("rect", { x: 0, y: y - rowStep / 2 + 2, width: width - 12, height: Math.max(22, rowStep - 4), rx: 5, class: "chart-hit-area" }));
    node.appendChild(group);
    registerMark(group, container, tooltip, menuTooltip(row, value));
    node.appendChild(el("text", { x: pad.left + barWidth + 7, y: y + 4, class: value < 0.34 ? "value-label bad menu-value-label" : "value-label menu-value-label" }, formatters.percent(value)));
  });

  container.appendChild(node);
}

function registerMark(mark, container, tooltip, content) {
  mark.setAttribute("focusable", "true");
  const showFromEvent = (event) => {
    event.stopPropagation();
    setActiveMark(mark);
    showTooltip(tooltip, container, content, { clientX: event.clientX, clientY: event.clientY }, mark);
  };
  mark.addEventListener("pointerenter", showFromEvent);
  mark.addEventListener("pointermove", showFromEvent);
  mark.addEventListener("pointerleave", (event) => {
    if (event.pointerType !== "touch") {
      clearActiveMarks(mark);
      hideTooltip(tooltip);
    }
  });
  mark.addEventListener("focus", () => {
    setActiveMark(mark);
    showTooltip(tooltip, container, content, centerPoint(mark), mark);
  });
  mark.addEventListener("blur", () => {
    clearActiveMarks(mark);
    hideTooltip(tooltip);
  });
  mark.addEventListener("click", (event) => {
    event.stopPropagation();
    setActiveMark(mark);
    showTooltip(tooltip, container, content, { clientX: event.clientX, clientY: event.clientY }, mark);
  });
}

function setActiveMark(mark) {
  const chart = mark.closest("svg");
  if (!chart) return;
  chart.classList.add("has-active-mark");
  chart.querySelectorAll(".chart-mark").forEach((node) => {
    node.classList.toggle("is-active", node === mark);
    node.classList.toggle("is-muted", node !== mark);
  });
}

function clearActiveMarks(mark) {
  const chart = mark.closest("svg");
  if (!chart) return;
  chart.classList.remove("has-active-mark");
  chart.querySelectorAll(".chart-mark").forEach((node) => {
    node.classList.remove("is-active", "is-muted");
  });
}

function clearAllActiveMarks() {
  document.querySelectorAll("svg.has-active-mark").forEach((chart) => {
    chart.classList.remove("has-active-mark");
    chart.querySelectorAll(".chart-mark").forEach((node) => {
      node.classList.remove("is-active", "is-muted");
    });
  });
}

function showTooltip(tooltip, container, content, point, mark) {
  dismissOtherTooltips(tooltip, mark);
  tooltip.innerHTML = tooltipHtml(content);
  tooltip.hidden = false;
  const anchor = Number.isFinite(point.clientX) ? point : centerPoint(mark);
  window.requestAnimationFrame(() => {
    const tipRect = tooltip.getBoundingClientRect();
    const rawX = anchor.clientX + 14;
    const rawY = anchor.clientY - tipRect.height - 12;
    const maxX = Math.max(12, window.innerWidth - tipRect.width - 12);
    const maxY = Math.max(12, window.innerHeight - tipRect.height - 12);
    const x = clamp(rawX, 12, maxX);
    const y = rawY < 12 ? anchor.clientY + 14 : rawY;
    tooltip.style.left = `${round(x, 1)}px`;
    tooltip.style.top = `${round(clamp(y, 12, maxY), 1)}px`;
  });
}

function hideTooltip(tooltip) {
  tooltip.hidden = true;
}

function dismissOtherTooltips(activeTooltip, activeMark) {
  document.querySelectorAll(".chart-tooltip").forEach((node) => {
    if (node !== activeTooltip) node.hidden = true;
  });
  document.querySelectorAll("svg.has-active-mark").forEach((chart) => {
    if (chart === activeMark.closest("svg")) return;
    chart.classList.remove("has-active-mark");
    chart.querySelectorAll(".chart-mark").forEach((node) => {
      node.classList.remove("is-active", "is-muted");
    });
  });
}

function centerPoint(mark) {
  const rect = mark.getBoundingClientRect();
  return {
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function tooltipHtml({ title, kicker, rows = [], note = "" }) {
  return `
    <div class="chart-tooltip-kicker">${escapeHtml(kicker || "detail")}</div>
    <strong>${escapeHtml(title)}</strong>
    <dl>
      ${rows.map(([label, value, tone]) => `
        <div>
          <dt>${escapeHtml(label)}</dt>
          <dd class="${tone || ""}">${escapeHtml(value)}</dd>
        </div>
      `).join("")}
    </dl>
    ${note ? `<p>${escapeHtml(note)}</p>` : ""}
  `;
}

function waterfallTooltip(item, start, end) {
  if (item.type) {
    return {
      title: item.label,
      kicker: item.type === "start" ? "baseline margin" : "current margin",
      rows: [["Adjusted CM", formatters.percent(item.value)]],
      note: item.type === "start" ? "Prior 7-day modeled CM% before bridge drivers." : "Current filtered CM% after all bridge drivers."
    };
  }
  return {
    title: item.label,
    kicker: item.value >= 0 ? "favorable driver" : "margin leakage driver",
    rows: [
      ["Impact", formatters.points(item.value), item.value >= 0 ? "good" : "bad"],
      ["From", formatters.percent(start)],
      ["To", formatters.percent(end)]
    ],
    note: item.driver || "Modeled operating driver."
  };
}

function donutTooltip(row) {
  return {
    title: row.label,
    kicker: "sales channel mix",
    rows: [
      ["Gross bookings", formatters.currency(row.value, true)],
      ["Mix", formatters.percent(row.pct)],
      ["Flight legs", formatters.number(row.orders)],
      ["Revenue / leg", formatters.currency(row.orders ? row.value / row.orders : 0)]
    ],
    note: "Filtered contribution context uses the selected date, market, product line, and sales channel."
  };
}

function forecastTooltip(row) {
  return {
    title: row.week,
    kicker: "rolling forecast",
    rows: [
      ["Base CM%", formatters.percent(row.baseMarginPct)],
      ["Scenario CM%", formatters.percent(row.scenarioMarginPct), "good"],
      ["Upside", formatters.points(row.scenarioMarginPct - row.baseMarginPct), "good"],
      ["Revenue", formatters.currency(row.revenue, true)],
      ["Flight legs", formatters.number(row.orders)],
      ["Flight / support cost", `${formatters.currency(row.cogs, true)} / ${formatters.currency(row.labor, true)}`]
    ],
    note: "Scenario reflects the active app + website mix, fuel cost, volume, support efficiency, and service-credit controls."
  };
}

function menuTooltip(row, value) {
  return {
    title: row.name,
    kicker: row.brandName || "aircraft mission economics",
    rows: [
      ["CM%", formatters.percent(value), value < 0.34 ? "bad" : value > 0.52 ? "good" : ""],
      ["Unit CM", formatters.currency(row.unitContribution)],
      ["Service credit rate", formatters.percent(row.summary.refundRate), row.summary.refundRate > 0.035 ? "bad" : ""],
      ["Flight-leg rank", `#${row.volumeRank}`],
      ["Recommendation", row.recommendation]
    ],
    note: `${row.category} profile, modeled from filtered flight-leg operating rows.`
  };
}

function linePath(points, className) {
  const d = points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${round(x, 1)} ${round(y, 1)}`).join(" ");
  return el("path", { d, fill: "none", class: className });
}

function donutSegment(cx, cy, r, thickness, startAngle, endAngle) {
  const outerStart = polar(cx, cy, r, endAngle);
  const outerEnd = polar(cx, cy, r, startAngle);
  const innerStart = polar(cx, cy, r - thickness, endAngle);
  const innerEnd = polar(cx, cy, r - thickness, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", outerStart.x, outerStart.y,
    "A", r, r, 0, largeArc, 0, outerEnd.x, outerEnd.y,
    "L", innerEnd.x, innerEnd.y,
    "A", r - thickness, r - thickness, 0, largeArc, 1, innerStart.x, innerStart.y,
    "Z"
  ].join(" ");
}

function polar(cx, cy, r, angle) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: round(cx + r * Math.cos(radians), 2),
    y: round(cy + r * Math.sin(radians), 2)
  };
}

function waterfallLabel(label) {
  const labels = {
    "prior period": ["prior", "period"],
    "channel mix": ["channel", "mix"],
    "partner selling cost": ["partner", "selling cost"],
    "service recovery credits": ["service", "credits"],
    "fuel + aircraft cost": ["fuel +", "aircraft cost"],
    "dispatch support efficiency": ["dispatch", "support"],
    other: ["other"],
    "current period": ["current", "period"]
  };
  return labels[label] || wrapWords(label, 10, 3);
}

function waterfallCompactLabel(item) {
  const labels = {
    start: ["prior"],
    channel: ["channel"],
    other: ["other"],
    end: ["current"]
  };
  return labels[item.id] || [];
}

function wrapWords(label, maxChars = 12, maxLines = 2) {
  const words = String(label).split(/\s+/).filter(Boolean);
  const lines = [];
  words.forEach((word) => {
    const current = lines[lines.length - 1] || "";
    if (!current || `${current} ${word}`.length > maxChars) {
      lines.push(word);
    } else {
      lines[lines.length - 1] = `${current} ${word}`;
    }
  });
  if (lines.length <= maxLines) return lines;
  return [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(" ")];
}

function truncateLabel(label, maxLength) {
  const value = String(label);
  return value.length > maxLength ? `${value.slice(0, maxLength - 3).trim()}...` : value;
}
