export function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);

  const [headers, ...records] = rows;
  if (!headers) return [];
  return records.map((record) =>
    Object.fromEntries(headers.map((header, index) => [normalizeHeader(header), coerce(record[index] || "")]))
  );
}

export function toCsv(rows, schema = null) {
  const columns = schema?.length ? schema : Object.keys(rows[0] || {}).map((key) => ({ key, label: key }));
  if (!columns.length) return "";
  const headers = columns.map((column) => escapeCell(column.label));
  const body = rows.length
    ? rows.map((row) => columns.map((column) => escapeCell(formatCell(row[column.key], column.format))).join(","))
    : [];
  return [headers.join(","), ...body].join("\n");
}

export function downloadText(filename, text, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function validateUpload(kind, rows) {
  const rules = {
    orders: {
      required: ["date", "service_area", "product_line", "channel", "aircraft_mission", "flight_legs", "gross_bookings"],
      numeric: ["flight_legs", "gross_bookings", "recovery_credit", "service_credit", "partner_selling_cost", "fuel_crew_aircraft_cost", "fbo_handling_cost", "dispatch_minutes"]
    },
    labor: {
      required: ["date", "service_area", "actual_hours", "hourly_rate"],
      numeric: ["scheduled_hours", "actual_hours", "hourly_rate", "payroll_burden_rate"]
    },
    forecast: {
      required: ["week", "service_area", "gross_bookings_forecast", "flight_legs_forecast", "margin_forecast"],
      numeric: ["gross_bookings_forecast", "flight_legs_forecast", "flight_cost_forecast", "support_cost_forecast", "margin_forecast"]
    },
    menu: {
      required: ["product_line", "aircraft_mission", "gross_bookings", "fuel_crew_aircraft_cost", "fbo_handling_cost"],
      numeric: ["gross_bookings", "fuel_crew_aircraft_cost", "fbo_handling_cost", "dispatch_minutes"]
    }
  }[kind] || { required: [], numeric: [] };
  const headers = new Set(Object.keys(rows[0] || {}));
  const missing = rules.required.filter((field) => !headers.has(field));
  const invalid = [];
  rows.slice(0, 100).forEach((row, index) => {
    rules.required.forEach((field) => {
      if (row[field] === "" || row[field] == null) invalid.push(`row ${index + 2}: missing ${field}`);
    });
    rules.numeric.forEach((field) => {
      if (headers.has(field) && row[field] !== "" && (typeof row[field] !== "number" || Number.isNaN(row[field]) || row[field] < 0)) {
        invalid.push(`row ${index + 2}: invalid ${field}`);
      }
    });
  });
  return {
    ok: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    rowCount: rows.length
  };
}

function normalizeHeader(header) {
  return String(header).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function escapeCell(value) {
  const text = String(value ?? "");
  const trimmed = text.trimStart();
  const startsWithFormulaSign = /^[=+\-@]/.test(trimmed);
  const startsWithUnsafeWhitespace = /^[\r\n\t]/.test(text);
  const needsQuote = /[",\r\n\t]/.test(text);
  const safeValue = startsWithFormulaSign || startsWithUnsafeWhitespace ? `'${text}` : text;
  const escaped = safeValue.replaceAll('"', '""');
  return needsQuote || /[",\r\n\t]/.test(safeValue) ? `"${escaped}"` : escaped;
}

function formatCell(value, format = "text") {
  const amount = typeof value === "string" && value.trim() === "" ? "" : value;
  if (amount === "") return "";
  const number = typeof amount === "number" ? amount : Number(amount);
  if (typeof number !== "number" || Number.isNaN(number)) return amount;
  if (format === "number0") return Math.round(number).toLocaleString("en-US");
  if (format === "percent0") return `${(number * 100).toFixed(0)}%`;
  if (format === "percent1") return `${(number * 100).toFixed(1)}%`;
  if (format === "currency0") return `$${Math.round(number).toLocaleString("en-US")}`;
  if (format === "currency2") return `$${(Math.round(number * 100) / 100).toFixed(2)}`;
  if (format === "points1") return `${number >= 0 ? "+" : ""}${(number * 100).toFixed(1)} pts`;
  if (format === "text") return amount;
  return amount;
}

function coerce(value) {
  const text = String(value).trim();
  if (text === "") return "";
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  return text;
}
