import { formatters } from "./calculations.js";
import { downloadText, toCsv } from "./csv.js";

const DEFAULT_META = {
  generated: "May 11, 2026 8:30 AM",
  disclosure: "Public-source-aligned Wheels Up product, market, and channel concepts; financial and operating values are modeled sample data, not actual Wheels Up data."
};

export function buildWeeklySummaryText(summary) {
  const forecastWeek = summary.forecast.week || "latest week";
  return [
    `${summary.title} (${summary.period})`,
    "",
    "What changed",
    ...summary.changed.map((line) => `- ${line}`),
    "",
    "Why it changed",
    ...summary.why.map((line) => `- ${line}`),
    "",
    "What to do next",
    ...summary.next.map((line) => `- ${line}`),
    "",
    "Risks for next week",
    ...summary.risks.map((line) => `- ${line}`),
    "",
    `Forecast update (${forecastWeek}): base ${formatters.percent(summary.forecast.base)}; scenario ${formatters.percent(summary.forecast.scenario)} (${formatters.points(summary.forecast.upside)} upside).`,
    "",
    "Disclosure: Sample modeled operating data; not actual Wheels Up data."
  ].join("\n");
}

export async function copySummary(summary, notify) {
  const text = buildWeeklySummaryText(summary);
  try {
    await navigator.clipboard.writeText(text);
    notify("Weekly flight economics summary copied to clipboard.");
  } catch {
    notify("Clipboard unavailable. Downloaded Excel report instead.");
    downloadSummary(summary);
  }
}

export function downloadSummary(summary) {
  const forecastWeekLabel = summary.forecast.week || "week";
  exportWorkbook("wheels-up-weekly-flight-economics-summary.xls", {
    title: "Weekly Flight Economics Summary",
    subtitle: summary.period,
    summaryCards: [
      [`Base ${forecastWeekLabel} CM%`, formatters.percent(summary.forecast.base), "neutral"],
      [`Scenario ${forecastWeekLabel} CM%`, formatters.percent(summary.forecast.scenario), "good"],
      ["Modeled Upside", formatters.points(summary.forecast.upside), "good"]
    ],
    sections: [
      ["What Changed", summary.changed],
      ["Why It Changed", summary.why],
      ["What To Do Next", summary.next],
      ["Risks For Next Week", summary.risks]
    ],
    tables: [{
      title: "Forecast Update",
      columns: [
        { key: "metric", label: "Metric", type: "text", width: 220 },
        { key: "value", label: "Value", type: "text", width: 160 },
        { key: "note", label: "Operating Note", type: "longText", width: 420 }
      ],
      rows: [
        { metric: `Base ${forecastWeekLabel} CM%`, value: formatters.percent(summary.forecast.base), note: "Current modeled trajectory before scenario controls." },
        { metric: `Scenario ${forecastWeekLabel} CM%`, value: formatters.percent(summary.forecast.scenario), note: "Updated by current member app mix, fuel cost, support efficiency, flight-leg volume, and service-credit assumptions." },
        { metric: "Upside vs base", value: formatters.points(summary.forecast.upside), note: "Modeled adjusted contribution improvement opportunity." }
      ]
    }]
  });
}

const CSV_SCHEMAS = {
  location: [
    { key: "location", label: "Base" },
    { key: "region", label: "Region" },
    { key: "market", label: "Market" },
    { key: "net_sales", label: "Trip Revenue", format: "currency0" },
    { key: "contribution_margin", label: "Adjusted Contribution", format: "currency0" },
    { key: "margin_pct", label: "CM %", format: "percent1" },
    { key: "delta_vs_prior", label: "Delta vs prior (pts)", format: "points1" },
    { key: "risk", label: "Risk" },
    { key: "top_driver", label: "Top Driver" },
    { key: "risk_driver", label: "Risk + Driver" }
  ],
  menu: [
    { key: "item", label: "Aircraft / Mission" },
    { key: "brand", label: "Product Line" },
    { key: "price", label: "Revenue", format: "currency2" },
    { key: "food_cost", label: "Flight Cost", format: "currency2" },
    { key: "packaging", label: "FBO / Handling", format: "currency2" },
    { key: "unit_contribution", label: "Unit Contribution", format: "currency2" },
    { key: "margin_pct", label: "CM %", format: "percent1" },
    { key: "refund_rate", label: "Service Credit Rate", format: "percent1" },
    { key: "volume_rank", label: "Flight-Leg Rank", format: "number0" },
    { key: "recommendation", label: "Recommendation" }
  ],
  forecast: [
    { key: "week", label: "Week" },
    { key: "revenue", label: "Revenue", format: "currency0" },
    { key: "orders", label: "Flight Legs", format: "number0" },
    { key: "cogs", label: "Flight Cost", format: "currency0" },
    { key: "labor", label: "Support Cost", format: "currency0" },
    { key: "base_margin_pct", label: "Base CM %", format: "percent1" },
    { key: "scenario_margin_pct", label: "Scenario CM %", format: "percent1" },
    { key: "upside_pts", label: "Upside", format: "points1" }
  ],
  actions: [
    { key: "priority", label: "Priority" },
    { key: "location", label: "Base" },
    { key: "issue", label: "Issue" },
    { key: "evidence", label: "Evidence" },
    { key: "estimated_margin_impact_pts", label: "Estimated CM Impact (pts)", format: "points1" },
    { key: "owner", label: "Owner" },
    { key: "status", label: "Status" },
    { key: "due", label: "Due" }
  ]
};

function inferSchema(filename) {
  if (filename.includes("base-performance") || filename.includes("location-performance")) return CSV_SCHEMAS.location;
  if (filename.includes("fleet-economics") || filename.includes("menu-margin")) return CSV_SCHEMAS.menu;
  if (filename.includes("rolling-forecast")) return CSV_SCHEMAS.forecast;
  if (filename.includes("operating-actions") || filename.includes("operator-actions")) return CSV_SCHEMAS.actions;
  return null;
}

export function exportRows(filename, rows, schema) {
  downloadText(
    filename,
    `\ufeff${toCsv(rows, schema || inferSchema(filename)).replace(/\n/g, "\r\n")}`,
    "text/csv;charset=utf-8"
  );
}

export function exportWorkbook(filename, config) {
  downloadText(filename, `\ufeff${buildWorkbookXml(config)}`, "application/vnd.ms-excel;charset=utf-8");
}

export function buildActionCsv(actions) {
  return actions.map((action) => ({
    priority: action.priority,
    location: action.locationName,
    issue: action.issue,
    evidence: action.evidence,
    estimated_margin_impact_pts: action.estimatedImpactPts,
    owner: action.owner,
    status: action.status,
    due: action.due
  }));
}

export function buildWorkbookXml(config) {
  const meta = { ...DEFAULT_META, ...(config.meta || {}) };
  const tables = config.tables || [{ title: config.tableTitle || config.title, columns: config.columns, rows: config.rows || [] }];
  const worksheets = tables.map((table, index) =>
    worksheetXml({
      title: config.title || "Operating Export",
      subtitle: config.subtitle || "May 5 - May 11, 2026",
      meta,
      table,
      summaryCards: index === 0 ? config.summaryCards || [] : [],
      sections: index === 0 ? config.sections || [] : [],
      includeIntro: index === 0,
      sheetName: tables.length > 1 ? table.title : config.title
    })
  );
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Author>Wheels Up Flight Economics Command Center</Author>
    <Company>Wheels Up prototype</Company>
    <Title>${escapeXml(config.title || "Operating Export")}</Title>
  </DocumentProperties>
  <ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">
    <WindowHeight>9000</WindowHeight>
    <WindowWidth>13800</WindowWidth>
    <ProtectStructure>False</ProtectStructure>
    <ProtectWindows>False</ProtectWindows>
  </ExcelWorkbook>
  ${stylesXml()}
  ${worksheets.join("")}
</Workbook>`;
}

function worksheetXml({ title, subtitle, meta, table, summaryCards, sections, includeIntro, sheetName }) {
  const rows = table.rows || [];
  const columns = table.columns || inferColumns(rows);
  const colCount = Math.max(columns.length, 9);
  const summaryRows = summaryCards.length ? Math.ceil(summaryCards.length / 3) * 3 : 0;
  const tableStartRow = 7 + summaryRows + sectionRowCount(sections || []) + 2;
  const body = [];
  body.push(rowXml([cellXml("wheels up", "sTitle", "String", colCount - 1)], 30));
  body.push(rowXml([cellXml(`Flight Economics Command Center - ${title}`, "sSubtitle", "String", colCount - 1)], 22));
  body.push(rowXml([]));
  body.push(rowXml([
    cellXml("Report", "sMetaLabel", "String", 1),
    cellXml("Period", "sMetaLabel", "String", 2),
    cellXml("Generated", "sMetaLabel", "String", 2)
  ]));
  body.push(rowXml([
    cellXml(title, "sMetaValue", "String", 1),
    cellXml(subtitle, "sMetaValue", "String", 2),
    cellXml(meta.generated, "sMetaValue", "String", 2)
  ], 24));
  body.push(rowXml([cellXml("Disclosure", "sMetaLabel", "String", colCount - 1)]));
  body.push(rowXml([cellXml(meta.disclosure, "sMetaValue", "String", colCount - 1)]));
  if (summaryCards.length) {
    body.push(...summaryCardRows(summaryCards, colCount));
  }
  if (sections.length) {
    body.push(...sectionRows(sections, colCount));
  }
  body.push(rowXml([]));
  body.push(rowXml([cellXml(table.title || title, "sTableTitle", "String", colCount - 1)], 22));
  body.push(rowXml(columns.map((column) => cellXml(column.label || labelize(column.key), "sHeader"))));
  rows.forEach((dataRow, rowIndex) => {
    const hasWrappedText = columns.some((column) => column.type === "longText" && String(dataRow[column.key] || "").length > 22);
    body.push(rowXml(columns.map((column) => dataCellXml(dataRow, column, rowIndex)), hasWrappedText ? 30 : 18));
  });
  body.push(rowXml([]));
  body.push(rowXml([cellXml("Built for finance and operations review. CSV remains available in the app for clean system ingestion.", "sFooter", "String", colCount - 1)]));

  return `<Worksheet ss:Name="${escapeXml(sheetTitle(sheetName || title))}">
    <Table>
      ${columnsXml(columns, colCount)}
      ${body.join("")}
    </Table>
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
      <PageSetup>
        <Layout x:Orientation="Landscape"/>
        <PageMargins x:Bottom="0.5" x:Left="0.35" x:Right="0.35" x:Top="0.5"/>
      </PageSetup>
      ${includeIntro ? `<FreezePanes/><FrozenNoSplit/><SplitHorizontal>${tableStartRow}</SplitHorizontal><TopRowBottomPane>${tableStartRow}</TopRowBottomPane><ActivePane>2</ActivePane>` : ""}
      <FitToPage/>
      <Print>
        <FitWidth>1</FitWidth>
        <FitHeight>0</FitHeight>
      </Print>
    </WorksheetOptions>
    <AutoFilter x:Range="R${tableStartRow + 1}C1:R${tableStartRow + rows.length + 1}C${columns.length}" xmlns="urn:schemas-microsoft-com:office:excel"/>
  </Worksheet>`;
}

function columnsXml(columns, colCount) {
  const explicit = columns.map((column) => {
    const width = column.excelWidth || Math.max(42, Math.min(145, (column.width || 150) * 0.38));
    return `<Column ss:AutoFitWidth="0" ss:Width="${Math.round(width)}"/>`;
  });
  while (explicit.length < colCount) explicit.push('<Column ss:AutoFitWidth="0" ss:Width="110"/>');
  return explicit.join("");
}

function summaryCardRows(cards, colCount) {
  const output = [];
  for (let index = 0; index < cards.length; index += 3) {
    const chunk = cards.slice(index, index + 3);
    const spans = distributedSpans(colCount, chunk.length);
    const labelCells = chunk.map(([label], cardIndex) => cellXml(label, "sCardLabel", "String", spans[cardIndex] - 1));
    const valueCells = chunk.map(([, value, tone], cardIndex) => cellXml(value, tone === "good" ? "sCardGood" : tone === "bad" ? "sCardBad" : "sCardValue", "String", spans[cardIndex] - 1));
    output.push(rowXml([]));
    output.push(rowXml(labelCells));
    output.push(rowXml(valueCells, 24));
  }
  return output;
}

function sectionRows(sections, colCount) {
  return sections.flatMap(([title, lines]) => [
    rowXml([]),
    rowXml([cellXml(title, "sSection", "String", colCount - 1)], 20),
    ...lines.flatMap((line) => wrapLine(line, 86).map((wrappedLine) => rowXml([cellXml(wrappedLine, "sSectionBody", "String", colCount - 1)], 18)))
  ]);
}

function distributedSpans(colCount, count) {
  const base = Math.floor(colCount / count);
  const remainder = colCount % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

function sectionRowCount(sections) {
  return sections.reduce((count, [, lines]) => count + 2 + lines.reduce((lineCount, line) => lineCount + wrapLine(line, 86).length, 0), 0);
}

function wrapLine(line, maxLength) {
  const words = String(line).split(/\s+/);
  const output = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      output.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) output.push(current);
  return output.length ? output : [""];
}

function rowXml(cells, height = 18) {
  return `<Row ss:Height="${height}">${cells.join("")}</Row>`;
}

function cellXml(value, style = "sText", type = "String", mergeAcross = 0) {
  const merge = mergeAcross > 0 ? ` ss:MergeAcross="${mergeAcross}"` : "";
  return `<Cell ss:StyleID="${style}"${merge}><Data ss:Type="${type}">${type === "Number" ? numberValue(value) : escapeXml(value)}</Data></Cell>`;
}

function dataCellXml(row, column, rowIndex) {
  const rawValue = row[column.key];
  const type = column.type || inferType(column.key, rawValue);
  const tone = column.tone ? column.tone(rawValue, row) : toneFor(type, rawValue);
  const alt = rowIndex % 2 === 1;
  const style = styleFor(type, tone, alt);
  if (column.format || type === "points" || type === "rank" || type === "status" || type === "risk" || type === "recommendation" || type === "text" || type === "longText") {
    return cellXml(formatCell(rawValue, type, column), style);
  }
  if (type === "currency" || type === "percent" || type === "number") {
    const numeric = toFiniteNumber(rawValue);
    if (Number.isNaN(numeric)) {
      return cellXml("", style);
    }
    return cellXml(numeric, style, "Number");
  }
  return cellXml(formatCell(rawValue, type, column), style);
}

function styleFor(type, tone, alt) {
  if (type === "longText") return alt ? "sTextWrapAlt" : "sTextWrap";
  if (type === "currency") return alt ? "sCurrencyAlt" : "sCurrency";
  if (type === "number") return alt ? "sNumberAlt" : "sNumber";
  if (type === "percent" && tone === "good") return alt ? "sPercentGoodAlt" : "sPercentGood";
  if (type === "percent" && tone === "bad") return alt ? "sPercentBadAlt" : "sPercentBad";
  if (type === "percent") return alt ? "sPercentAlt" : "sPercent";
  if (type === "points" && tone === "good") return alt ? "sTextGoodAlt" : "sTextGood";
  if (type === "points" && tone === "bad") return alt ? "sTextBadAlt" : "sTextBad";
  if (tone === "good" || tone === "low") return alt ? "sBadgeGoodAlt" : "sBadgeGood";
  if (tone === "medium") return alt ? "sBadgeMediumAlt" : "sBadgeMedium";
  if (tone === "bad") return alt ? "sBadgeBadAlt" : "sBadgeBad";
  return alt ? "sTextAlt" : "sText";
}

function stylesXml() {
  return `<Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Color="#17231F"/>
    </Style>
    ${styleXml("sTitle", { fill: "#17352E", color: "#FFFFFF", size: 20, bold: true, horizontal: "Left" })}
    ${styleXml("sSubtitle", { fill: "#17352E", color: "#DCE9E3", size: 12, bold: true, horizontal: "Left" })}
    ${styleXml("sMetaLabel", { fill: "#E9F5EC", color: "#17231F", bold: true, horizontal: "Left" })}
    ${styleXml("sMetaValue", { fill: "#FFFFFF", color: "#62716B", horizontal: "Left" })}
    ${styleXml("sCardLabel", { fill: "#FFFFFF", color: "#62716B", bold: true, size: 9, horizontal: "Left", wrap: false })}
    ${styleXml("sCardValue", { fill: "#FFFFFF", color: "#17231F", bold: true, size: 16, horizontal: "Left", wrap: false })}
    ${styleXml("sCardGood", { fill: "#FFFFFF", color: "#2F8A4D", bold: true, size: 16, horizontal: "Left", wrap: false })}
    ${styleXml("sCardBad", { fill: "#FFFFFF", color: "#EF4B3D", bold: true, size: 16, horizontal: "Left", wrap: false })}
    ${styleXml("sSection", { fill: "#214139", color: "#FFFFFF", bold: true, horizontal: "Left" })}
    ${styleXml("sSectionBody", { fill: "#FFFFFF", color: "#17231F", horizontal: "Left" })}
    ${styleXml("sTableTitle", { fill: "#F7F8F6", color: "#17231F", bold: true, size: 14, horizontal: "Left" })}
    ${styleXml("sHeader", { fill: "#17352E", color: "#FFFFFF", bold: true, size: 9, horizontal: "Center" })}
    ${styleXml("sText", { fill: "#FFFFFF", color: "#17231F", horizontal: "Left", wrap: false })}
    ${styleXml("sTextAlt", { fill: "#F7F8F6", color: "#17231F", horizontal: "Left", wrap: false })}
    ${styleXml("sTextWrap", { fill: "#FFFFFF", color: "#17231F", horizontal: "Left" })}
    ${styleXml("sTextWrapAlt", { fill: "#F7F8F6", color: "#17231F", horizontal: "Left" })}
    ${styleXml("sTextGood", { fill: "#FFFFFF", color: "#2F8A4D", bold: true, horizontal: "Right", wrap: false })}
    ${styleXml("sTextGoodAlt", { fill: "#F7F8F6", color: "#2F8A4D", bold: true, horizontal: "Right", wrap: false })}
    ${styleXml("sTextBad", { fill: "#FFFFFF", color: "#EF4B3D", bold: true, horizontal: "Right", wrap: false })}
    ${styleXml("sTextBadAlt", { fill: "#F7F8F6", color: "#EF4B3D", bold: true, horizontal: "Right", wrap: false })}
    ${styleXml("sNumber", { fill: "#FFFFFF", color: "#17231F", horizontal: "Right", format: "#,##0", wrap: false })}
    ${styleXml("sNumberAlt", { fill: "#F7F8F6", color: "#17231F", horizontal: "Right", format: "#,##0", wrap: false })}
    ${styleXml("sCurrency", { fill: "#FFFFFF", color: "#17231F", horizontal: "Right", format: "$#,##0", wrap: false })}
    ${styleXml("sCurrencyAlt", { fill: "#F7F8F6", color: "#17231F", horizontal: "Right", format: "$#,##0", wrap: false })}
    ${styleXml("sPercent", { fill: "#FFFFFF", color: "#17231F", horizontal: "Right", format: "0.0%", wrap: false })}
    ${styleXml("sPercentAlt", { fill: "#F7F8F6", color: "#17231F", horizontal: "Right", format: "0.0%", wrap: false })}
    ${styleXml("sPercentGood", { fill: "#FFFFFF", color: "#2F8A4D", bold: true, horizontal: "Right", format: "0.0%", wrap: false })}
    ${styleXml("sPercentGoodAlt", { fill: "#F7F8F6", color: "#2F8A4D", bold: true, horizontal: "Right", format: "0.0%", wrap: false })}
    ${styleXml("sPercentBad", { fill: "#FFFFFF", color: "#EF4B3D", bold: true, horizontal: "Right", format: "0.0%", wrap: false })}
    ${styleXml("sPercentBadAlt", { fill: "#F7F8F6", color: "#EF4B3D", bold: true, horizontal: "Right", format: "0.0%", wrap: false })}
    ${styleXml("sBadgeGood", { fill: "#E9F5EC", color: "#2F8A4D", bold: true, horizontal: "Center", wrap: false })}
    ${styleXml("sBadgeGoodAlt", { fill: "#E9F5EC", color: "#2F8A4D", bold: true, horizontal: "Center", wrap: false })}
    ${styleXml("sBadgeMedium", { fill: "#FFF6E7", color: "#D98917", bold: true, horizontal: "Center", wrap: false })}
    ${styleXml("sBadgeMediumAlt", { fill: "#FFF6E7", color: "#D98917", bold: true, horizontal: "Center", wrap: false })}
    ${styleXml("sBadgeBad", { fill: "#FFF0EE", color: "#EF4B3D", bold: true, horizontal: "Center", wrap: false })}
    ${styleXml("sBadgeBadAlt", { fill: "#FFF0EE", color: "#EF4B3D", bold: true, horizontal: "Center", wrap: false })}
    ${styleXml("sFooter", { fill: "#F7F8F6", color: "#62716B", size: 9, horizontal: "Left" })}
    ${styleXml("sBlank", { fill: "#F7F8F6", color: "#17231F" })}
  </Styles>`;
}

function styleXml(id, options = {}) {
  const wrap = options.wrap === false ? "" : ' ss:WrapText="1"';
  return `<Style ss:ID="${id}">
    <Alignment ss:Horizontal="${options.horizontal || "Left"}" ss:Vertical="Center"${wrap}/>
    <Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DFE5E1"/>
      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DFE5E1"/>
      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DFE5E1"/>
      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DFE5E1"/>
    </Borders>
    <Font ss:FontName="Arial" ss:Size="${options.size || 10}" ss:Color="${options.color || "#17231F"}"${options.bold ? ' ss:Bold="1"' : ""}/>
    ${options.fill ? `<Interior ss:Color="${options.fill}" ss:Pattern="Solid"/>` : ""}
    ${options.format ? `<NumberFormat ss:Format="${escapeXml(options.format)}"/>` : ""}
  </Style>`;
}

function inferColumns(rows) {
  return Object.keys(rows[0] || {}).map((key) => ({ key, label: labelize(key), type: inferType(key) }));
}

function inferType(key, value = "") {
  if (key.includes("margin_pct") || key.includes("refund_rate") || key.includes("service_credit_rate") || key.includes("mix")) return "percent";
  if (key.includes("impact") || key.includes("delta") || key.includes("upside")) return "points";
  if (key.includes("sales") || key.includes("revenue") || key.includes("cogs") || key.includes("labor") || key.includes("cost") || key.includes("price") || key.includes("contribution")) return "currency";
  if (key.includes("rank")) return "rank";
  if (typeof value === "number") return "number";
  return "text";
}

function formatCell(value, type, column = {}) {
  if (value == null || value === "") return "";
  if (column.format) return column.format(value);
  if (type === "currency") return formatters.currency(Number(value));
  if (type === "percent") return formatters.percent(Number(value));
  if (type === "points") return formatters.points(Number(value));
  if (type === "number") return formatters.number(Number(value));
  if (type === "rank") return String(value).startsWith("#") ? String(value) : `#${value}`;
  return String(value);
}

function toneFor(type, value) {
  if (type === "points") return Number(value) >= 0 ? "good" : "bad";
  const text = String(value || "").toLowerCase();
  if (["low", "done", "monitor"].includes(text)) return "low";
  if (["medium", "in progress", "queued"].includes(text) || text.includes("yield") || text.includes("lift mix")) return "medium";
  if (["high", "open"].includes(text) || text.includes("audit")) return "bad";
  return "";
}

function labelize(key) {
  const labels = {
    cm: "CM",
    cogs: "Flight Cost",
    refund: "Service Credit",
    refunds: "Service Credits",
    labor: "Support Cost",
    pct: "%",
    pts: "Pts",
    p_l: "P&L"
  };
  return String(key)
    .split("_")
    .map((part) => labels[part] || part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .replace("Margin %", "CM %")
    .replace("Pct", "%")
    .replace("Vs", "vs");
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : "";
}

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
}

function sheetTitle(title) {
  const cleaned = String(title || "Export").replace(/[\\/?*[\]:]/g, " ").replace(/\s+/g, " ").trim();
  return (cleaned || "Export").slice(0, 31);
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
