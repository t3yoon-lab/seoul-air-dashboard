const DEFAULT_API_KEY = "745b5fafc3e94dadc4de9d5ef781029c0d717ca5a885b05b914720e256ee7161";
const API_BASE_URL = "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty";
const STATION_HISTORY_URL = "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty";
const FORECAST_URL = "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMinuDustFrcstDspth";
const FORECAST_INTERVAL_MS = 1800;

const POSITIONS = {
  종로구: [47, 31], 중구: [50, 42], 용산구: [47, 55], 성동구: [61, 48], 광진구: [72, 48],
  동대문구: [64, 34], 중랑구: [73, 28], 성북구: [53, 22], 강북구: [49, 11], 도봉구: [51, 2],
  노원구: [63, 7], 은평구: [29, 20], 서대문구: [35, 35], 마포구: [27, 45], 양천구: [20, 66],
  강서구: [8, 57], 구로구: [28, 77], 금천구: [38, 87], 영등포구: [33, 62], 동작구: [43, 68],
  관악구: [47, 82], 서초구: [59, 74], 강남구: [68, 67], 송파구: [81, 63], 강동구: [89, 51],
};

const DISTRICT_CENTERS = {
  종로구: [37.5735, 126.9790], 중구: [37.5636, 126.9976], 용산구: [37.5326, 126.9905],
  성동구: [37.5634, 127.0369], 광진구: [37.5385, 127.0823], 동대문구: [37.5744, 127.0396],
  중랑구: [37.6063, 127.0925], 성북구: [37.5894, 127.0167], 강북구: [37.6396, 127.0257],
  도봉구: [37.6688, 127.0471], 노원구: [37.6542, 127.0568], 은평구: [37.6027, 126.9291],
  서대문구: [37.5791, 126.9368], 마포구: [37.5663, 126.9019], 양천구: [37.5169, 126.8664],
  강서구: [37.5509, 126.8495], 구로구: [37.4955, 126.8877], 금천구: [37.4569, 126.8958],
  영등포구: [37.5264, 126.8962], 동작구: [37.5124, 126.9393], 관악구: [37.4784, 126.9516],
  서초구: [37.4837, 127.0324], 강남구: [37.5172, 127.0473], 송파구: [37.5145, 127.1059],
  강동구: [37.5301, 127.1238],
};

const FALLBACK = [
  ["종로구", 42, 19, 0.031], ["중구", 46, 21, 0.032], ["용산구", 39, 18, 0.03], ["성동구", 51, 24, 0.035],
  ["광진구", 48, 23, 0.036], ["동대문구", 54, 25, 0.034], ["중랑구", 56, 27, 0.033], ["성북구", 44, 20, 0.031],
  ["강북구", 40, 18, 0.029], ["도봉구", 37, 17, 0.028], ["노원구", 43, 20, 0.03], ["은평구", 35, 16, 0.028],
  ["서대문구", 41, 18, 0.031], ["마포구", 45, 20, 0.032], ["양천구", 52, 24, 0.034], ["강서구", 57, 26, 0.033],
  ["구로구", 59, 27, 0.035], ["금천구", 62, 29, 0.036], ["영등포구", 55, 25, 0.034], ["동작구", 49, 22, 0.033],
  ["관악구", 47, 21, 0.032], ["서초구", 44, 20, 0.033], ["강남구", 50, 23, 0.036], ["송파구", 53, 25, 0.035],
  ["강동구", 49, 22, 0.034],
].map(([name, pm10, pm25, ozone]) => ({ name, pm10, pm25, ozone, date: "예시 데이터" }));

const METRIC_META = {
  pm10: { label: "미세먼지", unit: "㎍/㎥", average: "(1시간평균)", thresholds: [30, 80, 150], ranges: ["0~30", "31~80", "81~150", "151~"] },
  pm25: { label: "초미세먼지", unit: "㎍/㎥", average: "(1시간평균)", thresholds: [15, 35, 75], ranges: ["0~15", "16~35", "36~75", "76~"] },
  o3: { label: "오존", unit: "ppm", average: "(1시간평균)", thresholds: [0.03, 0.09, 0.15], ranges: ["0~0.030", "0.031~0.090", "0.091~0.150", "0.151~"] },
  dust: { label: "황사", unit: "㎍/㎥", average: "(PM10 참고)", thresholds: [30, 80, 150], ranges: ["0~30", "31~80", "81~150", "151~"] },
};

const GRADE_INFO = {
  good: { label: "좋음", emoji: "😊", color: "#258ee9", message: "😊 좋음 대기오염도 낮아요." },
  normal: { label: "보통", emoji: "🙂", color: "#0bae58", message: "🙂 보통 대기오염도 높지 않아요." },
  bad: { label: "나쁨", emoji: "😷", color: "#ff6b19", message: "😷 나쁨 민감군은 주의하세요." },
  veryBad: { label: "매우나쁨", emoji: "🚨", color: "#f04455", message: "🚨 매우나쁨 외출을 줄여주세요." },
  unknown: { label: "점검", emoji: "🔎", color: "#9aa3ab", message: "🔎 점검 측정값을 확인 중이에요." },
};

let airData = [];
let selectedName = "종로구";
let activeMetric = "pm10";
let activeDay = "today";
let locationMatch = null;
let hourlyData = [];
let forecastItems = [];
let hourlyRequestId = 0;
let forecastFrames = [];
let forecastFrameIndex = 0;
let forecastTimer = null;
let forecastPlaying = true;

const els = {
  updatedAt: document.querySelector("#updatedAt"),
  refreshBtn: document.querySelector("#refreshBtn"),
  locationBtn: document.querySelector("#locationBtn"),
  locationNote: document.querySelector("#locationNote"),
  notice: document.querySelector("#notice"),
  districtMap: document.querySelector("#districtMap"),
  selectedName: document.querySelector("#selectedName"),
  gradeBadge: document.querySelector("#gradeBadge"),
  pm25Value: document.querySelector("#pm25Value"),
  pm10Value: document.querySelector("#pm10Value"),
  o3Value: document.querySelector("#o3Value"),
  adviceText: document.querySelector("#adviceText"),
  lifeIndexGrid: document.querySelector("#lifeIndexGrid"),
  districtSelect: document.querySelector("#districtSelect"),
  rankingBody: document.querySelector("#rankingBody"),
  searchInput: document.querySelector("#searchInput"),
  unitLabel: document.querySelector("#unitLabel"),
  averageLabel: document.querySelector("#averageLabel"),
  goodLimit: document.querySelector("#goodLimit"),
  normalLimit: document.querySelector("#normalLimit"),
  badLimit: document.querySelector("#badLimit"),
  veryBadLimit: document.querySelector("#veryBadLimit"),
  morningMessage: document.querySelector("#morningMessage"),
  afternoonMessage: document.querySelector("#afternoonMessage"),
  morningRange: document.querySelector("#morningRange"),
  afternoonRange: document.querySelector("#afternoonRange"),
  morningScale: document.querySelector("#morningScale"),
  afternoonScale: document.querySelector("#afternoonScale"),
  hourlyChart: document.querySelector("#hourlyChart"),
  hourlyLabel: document.querySelector("#hourlyLabel"),
  forecastImage: document.querySelector("#forecastImage"),
  forecastPlaceholder: document.querySelector("#forecastPlaceholder"),
  forecastIssuedAt: document.querySelector("#forecastIssuedAt"),
  forecastPlayBtn: document.querySelector("#forecastPlayBtn"),
  forecastFrameLabel: document.querySelector("#forecastFrameLabel"),
  forecastProgress: document.querySelector("#forecastProgress"),
  forecastDots: document.querySelector("#forecastDots"),
  forecastSummary: document.querySelector("#forecastSummary"),
  metricTabs: document.querySelectorAll(".metric-tab"),
  dayTabs: document.querySelectorAll(".day-tab"),
};

function toNumber(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeRow(row) {
  return {
    name: row.MSRSTENAME || row.MSRSTE_NM || row.stationName || row.name,
    pm10: toNumber(row.PM10 || row.pm10Value || row.pm10),
    pm25: toNumber(row.PM25 || row.pm25Value || row.pm25),
    ozone: toNumber(row.OZONE || row.o3Value || row.O3 || row.ozone),
    date: row.MSRDATE || row.MSR_DATE || row.dataTime || row.date || "",
  };
}

function valueForMetric(item, metric = activeMetric) {
  if (metric === "pm25") return item.pm25;
  if (metric === "o3") return item.ozone;
  if (metric === "dust") return item.pm10;
  return item.pm10;
}

function forecastCodeForMetric(metric = activeMetric) {
  if (metric === "pm25") return "PM25";
  if (metric === "o3") return "O3";
  return "PM10";
}

function gradeForMetric(value, metric = activeMetric) {
  if (value === null || value === undefined || value <= 0) return "unknown";
  const [good, normal, bad] = METRIC_META[metric].thresholds;
  if (value <= good) return "good";
  if (value <= normal) return "normal";
  if (value <= bad) return "bad";
  return "veryBad";
}

function formatMetricValue(value, metric = activeMetric) {
  if (value === null || value === undefined || value <= 0) return "-";
  if (metric === "o3") return value.toFixed(3);
  return Math.round(value);
}

function adjustedValue(value, period) {
  if (value === null || value === undefined || value <= 0) return value;
  const dayFactor = activeDay === "tomorrow" ? 0.94 : activeDay === "after" ? 0.9 : 1;
  const periodFactor = period === "afternoon" ? 1.04 : 0.98;
  const next = value * dayFactor * periodFactor;
  return activeMetric === "o3" ? Number(next.toFixed(3)) : Math.round(next);
}

function colorFor(item) {
  return GRADE_INFO[gradeForMetric(valueForMetric(item))].color;
}

function areaColorFor(item) {
  const grade = gradeForMetric(valueForMetric(item));
  if (grade === "good") return "#c8e6ff";
  if (grade === "normal") return "#bdf1cc";
  if (grade === "bad") return "#ffd1ad";
  if (grade === "veryBad") return "#ffc6cc";
  return "#d8dde3";
}

function buildMap() {
  els.districtMap.innerHTML = "";
  const mobile = window.matchMedia("(max-width: 720px)").matches;
  airData.forEach((item) => {
    const [x, y] = POSITIONS[item.name] || [50, 50];
    const button = document.createElement("button");
    button.type = "button";
    button.className = `district ${item.name === selectedName ? "active" : ""} ${locationMatch?.name === item.name ? "current" : ""}`;
    button.style.left = mobile ? "" : `${x}%`;
    button.style.top = mobile ? "" : `${y}%`;
    button.style.setProperty("--badge-color", colorFor(item));
    button.style.setProperty("--area-color", areaColorFor(item));
    button.style.setProperty("--tilt", `${((x + y) % 7) - 3}deg`);
    const marker = locationMatch?.name === item.name ? `<em aria-label="현재 위치">내 위치</em>` : "";
    button.innerHTML = `${marker}<span>${item.name}</span><small>${formatMetricValue(valueForMetric(item))}</small>`;
    button.addEventListener("click", () => selectDistrict(item.name));
    els.districtMap.appendChild(button);
  });
}

function buildSelect() {
  els.districtSelect.innerHTML = airData.map((item) => `<option value="${item.name}">${item.name}</option>`).join("");
  els.districtSelect.value = selectedName;
}

function renderMetricMeta() {
  const meta = METRIC_META[activeMetric];
  els.unitLabel.textContent = meta.unit;
  els.averageLabel.textContent = meta.average;
  els.goodLimit.textContent = `~${meta.thresholds[0]}`;
  els.normalLimit.textContent = `~${meta.thresholds[1]}`;
  els.badLimit.textContent = `~${meta.thresholds[2]}`;
  els.veryBadLimit.textContent = `${activeMetric === "o3" ? "0.151" : meta.thresholds[2] + 1}~`;
}

function renderDetail() {
  const item = airData.find((row) => row.name === selectedName) || airData[0];
  const gradeKey = gradeForMetric(valueForMetric(item));
  const grade = GRADE_INFO[gradeKey];
  els.selectedName.textContent = item.name;
  if (locationMatch?.name === item.name) {
    els.locationNote.textContent = `내 위치 기준 ${item.name} · 측정소 중심 약 ${locationMatch.distance.toFixed(1)}km · 위치 정확도 ${formatAccuracy(locationMatch.accuracy)}`;
    els.locationNote.hidden = false;
  } else {
    els.locationNote.hidden = true;
  }
  els.gradeBadge.textContent = gradeLabel(gradeKey);
  els.gradeBadge.className = `grade-badge grade-${gradeKey}`;
  els.pm25Value.textContent = item.pm25 ? Math.round(item.pm25) : "-";
  els.pm10Value.textContent = item.pm10 ? Math.round(item.pm10) : "-";
  els.o3Value.textContent = item.ozone ? item.ozone.toFixed(3) : "-";
  els.adviceText.textContent = adviceForGrade(gradeKey);
  renderReports(item);
  renderLifeIndexes(item);
  renderHourlyChart();
  renderForecastImage();
}

function adviceForGrade(gradeKey) {
  if (gradeKey === "good") return "🌤️ 대기질이 좋아요. 야외 활동을 편하게 계획해도 괜찮습니다.";
  if (gradeKey === "normal") return "🍃 대체로 무난하지만 민감군은 장시간 외출 전 상태를 확인하세요.";
  if (gradeKey === "bad") return "😷 마스크 착용을 권장합니다. 어린이와 노약자는 야외 활동을 줄이세요.";
  if (gradeKey === "veryBad") return "🚨 외출을 최소화하고 실내 공기질 관리에 신경 써 주세요.";
  return "🔎 현재 측정값이 비어 있습니다. 인접 자치구와 최신 업데이트 시각을 함께 확인하세요.";
}

function renderReports(item) {
  renderSingleReport(item, "morning", els.morningMessage, els.morningRange, els.morningScale);
  renderSingleReport(item, "afternoon", els.afternoonMessage, els.afternoonRange, els.afternoonScale);
}

function renderSingleReport(item, period, messageEl, rangeEl, scaleEl) {
  const forecast = activeDay === "today" ? null : forecastForActiveDay();
  const gradeKey = forecast ? gradeKeyFromLabel(seoulGradeFromForecast(forecast)) : gradeForMetric(adjustedValue(valueForMetric(item), period));
  const info = GRADE_INFO[gradeKey];
  const order = ["good", "normal", "bad", "veryBad"];
  const range = gradeKey === "unknown" ? "-" : METRIC_META[activeMetric].ranges[order.indexOf(gradeKey)];
  messageEl.textContent = forecast ? forecastMessage(forecast, period, info.label) : info.message;
  messageEl.className = `report-message ${gradeKey}`;
  rangeEl.textContent = range;
  rangeEl.style.background = info.color;
  scaleEl.innerHTML = ["좋음", "보통", "한때나쁨", "나쁨", "매우나쁨"].map((label, index) => {
    const segmentKey = ["good", "normal", "bad", "bad", "veryBad"][index];
    const active = gradeKey === segmentKey && (gradeKey !== "bad" || index === 2);
    return `<span class="scale-segment ${active ? "active" : ""}" style="--scale-color:${info.color}">${label}</span>`;
  }).join("");
}

function gradeKeyFromLabel(label = "") {
  if (label.includes("매우")) return "veryBad";
  if (label.includes("나쁨")) return "bad";
  if (label.includes("보통")) return "normal";
  if (label.includes("좋음")) return "good";
  return "unknown";
}

function gradeLabel(gradeKey) {
  const info = GRADE_INFO[gradeKey] || GRADE_INFO.unknown;
  return `${info.emoji} ${info.label}`;
}

function seoulGradeFromForecast(item) {
  const seoul = item?.informGrade?.split(",").find((part) => part.trim().startsWith("서울"));
  return seoul?.split(":")[1]?.trim() || "";
}

function forecastTargetDate() {
  const date = new Date();
  const offset = activeDay === "after" ? 2 : activeDay === "tomorrow" ? 1 : 0;
  date.setDate(date.getDate() + offset);
  return formatLocalDate(date);
}

function activeDayLabel() {
  if (activeDay === "after") return "모레";
  if (activeDay === "tomorrow") return "내일";
  return "현재";
}

function forecastForActiveDay(metric = activeMetric) {
  const code = forecastCodeForMetric(metric);
  const target = forecastTargetDate();
  return forecastItems
    .filter((item) => item.informCode === code && item.informData === target)
    .sort((a, b) => String(b.dataTime).localeCompare(String(a.dataTime)))[0];
}

function forecastMessage(item, period, label) {
  const dayLabel = activeDayLabel();
  const timeLabel = period === "afternoon" ? "오후" : "오전";
  const issued = item?.dataTime ? ` (${item.dataTime})` : "";
  const gradeKey = gradeKeyFromLabel(label);
  return `${GRADE_INFO[gradeKey].emoji} ${dayLabel} ${timeLabel} 서울 예보는 ${label}이에요.${issued}`;
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function scoreLabel(score) {
  if (score >= 80) return { label: "😊 좋음", color: "#258ee9" };
  if (score >= 60) return { label: "🙂 보통", color: "#0bae58" };
  if (score >= 35) return { label: "😷 주의", color: "#ff6b19" };
  return { label: "🚨 나쁨", color: "#f04455" };
}

function buildLifeIndexes(item) {
  if (!item.pm10 && !item.pm25) {
    return [
      ["러닝", 0, "점검", "측정값 없음", "#8f9995"],
      ["생활", 0, "점검", "인접 자치구를 확인하세요.", "#8f9995"],
      ["세차", 0, "점검", "먼지 상태 확인 후 판단하세요.", "#8f9995"],
      ["환기", 0, "점검", "최신 업데이트를 기다려 주세요.", "#8f9995"],
    ];
  }
  const pm10 = item.pm10 || 0;
  const pm25 = item.pm25 || 0;
  const ozone = item.ozone || 0;
  const indexes = [
    ["🏃 러닝", clamp(100 - pm25 * 1.65 - Math.max(0, pm10 - 30) * 0.35 - Math.max(0, ozone - 0.06) * 260), "짧은 조깅과 산책 기준"],
    ["🧺 생활", clamp(100 - pm25 * 1.15 - Math.max(0, pm10 - 40) * 0.22), "외출·등하교 체감 기준"],
    ["🚗 세차", clamp(100 - pm10 * 0.9 - pm25 * 0.28), "먼지 재부착 가능성 기준"],
    ["🪟 환기", clamp(100 - pm25 * 1.45 - Math.max(0, ozone - 0.055) * 360), "실내 환기 판단 기준"],
  ];
  return indexes.map(([name, score, basis]) => {
    const status = scoreLabel(score);
    return [name, Math.round(score), status.label, basis, status.color];
  });
}

function renderLifeIndexes(item) {
  els.lifeIndexGrid.innerHTML = buildLifeIndexes(item).map(([name, score, label, message, color]) => `
    <article class="life-card" style="--score: ${score}%; --accent: ${color}">
      <div class="life-card-top">
        <h4>${name} 지수</h4>
        <span class="life-score">${score}</span>
      </div>
      <div class="life-bar" aria-hidden="true"><span></span></div>
      <strong>${label}</strong>
      <p>${message}</p>
    </article>
  `).join("");
}

function renderTable() {
  const keyword = els.searchInput.value.trim();
  const rows = airData
    .filter((item) => item.name.includes(keyword))
    .sort((a, b) => (valueForMetric(b) || -1) - (valueForMetric(a) || -1));
  els.rankingBody.innerHTML = rows.map((item) => {
    const gradeKey = gradeForMetric(valueForMetric(item));
    const grade = GRADE_INFO[gradeKey];
    return `<tr data-name="${item.name}">
      <td><strong>${item.name}</strong></td>
      <td>${item.pm10 ? Math.round(item.pm10) : "-"}</td>
      <td>${item.pm25 ? Math.round(item.pm25) : "-"}</td>
      <td><span class="status-pill grade-${gradeKey}">${gradeLabel(gradeKey)}</span></td>
    </tr>`;
  }).join("");
  els.rankingBody.querySelectorAll("tr").forEach((row) => {
    row.addEventListener("click", () => selectDistrict(row.dataset.name));
  });
}

function renderHourlyChart() {
  const meta = METRIC_META[activeMetric];
  const rows = (activeDay === "today" ? buildHourlySeries(hourlyData) : buildForecastHourlySeries())
    .map((row) => ({ ...row, value: valueForMetric(row) }));
  els.hourlyLabel.textContent = `${selectedName} · ${meta.label}${activeDay === "today" ? "" : ` · ${activeDayLabel()} 예상`}`;
  if (!rows.length) {
    els.hourlyChart.innerHTML = `<div class="empty-state">시간별 측정값을 확인 중입니다.</div>`;
    return;
  }
  const validValues = rows.map((row) => row.value).filter((value) => value !== null && value !== undefined && value > 0);
  const max = Math.max(...validValues, meta.thresholds[1], 1);
  els.hourlyChart.innerHTML = rows.map((row) => {
    if (!row.value || row.value <= 0) {
      return `<button class="hour-bar empty" type="button" disabled title="${row.date} · 측정값 없음">
        <span style="height:8%"></span>
        <b>-</b>
        <small>${row.hour}</small>
      </button>`;
    }
    const gradeKey = gradeForMetric(row.value);
    const height = clamp((row.value / max) * 100, 8, 100);
    return `<button class="hour-bar grade-${gradeKey}" type="button" title="${row.date} · ${formatMetricValue(row.value)}${meta.unit}">
      <span style="height:${height}%"></span>
      <b>${formatMetricValue(row.value)}</b>
      <small>${row.hour}</small>
    </button>`;
  }).join("");
}

function buildForecastHourlySeries() {
  const selected = airData.find((item) => item.name === selectedName) || airData[0];
  if (!selected) return [];
  const target = parseLocalDate(forecastTargetDate()) || new Date();
  const dayOffset = activeDay === "after" ? 2 : 1;
  const dailyTrend = activeDay === "after" ? 0.92 : 0.96;
  return Array.from({ length: 24 }, (_, hour) => {
    const time = new Date(target);
    time.setHours(hour, 0, 0, 0);
    const wave = 1 + Math.sin((hour - 7) / 24 * Math.PI * 2) * 0.12;
    const commute = hour >= 7 && hour <= 10 ? 1.08 : hour >= 17 && hour <= 20 ? 1.06 : 1;
    const pm10 = selected.pm10 ? Math.max(1, Math.round(selected.pm10 * dailyTrend * wave * commute)) : null;
    const pm25 = selected.pm25 ? Math.max(1, Math.round(selected.pm25 * (dailyTrend + 0.02) * wave * commute)) : null;
    const ozone = selected.ozone ? Number(Math.max(0.001, selected.ozone * (1 + dayOffset * 0.02) * (hour >= 12 && hour <= 17 ? 1.08 : 0.96)).toFixed(3)) : null;
    return {
      name: selectedName,
      pm10,
      pm25,
      ozone,
      date: `${formatChartTime(time)} · 예상`,
      hour: String(hour).padStart(2, "0"),
    };
  });
}

function buildHourlySeries(rows) {
  const parsed = rows
    .map((row) => ({ ...row, time: parseDataTime(row.date) }))
    .filter((row) => row.time)
    .sort((a, b) => b.time - a.time);
  if (!parsed.length) return [];
  const byHour = new Map(parsed.map((row) => [hourKey(row.time), row]));
  const latest = floorToHour(parsed[0].time);
  return Array.from({ length: 24 }, (_, index) => {
    const time = new Date(latest);
    time.setHours(latest.getHours() - (23 - index));
    const row = byHour.get(hourKey(time));
    return row
      ? { ...row, hour: String(time.getHours()).padStart(2, "0") }
      : {
        name: selectedName,
        pm10: null,
        pm25: null,
        ozone: null,
        date: formatChartTime(time),
        hour: String(time.getHours()).padStart(2, "0"),
      };
  });
}

function renderForecastImage() {
  const item = forecastForActiveDay() || forecastForActiveDay(activeMetric === "pm25" ? "pm10" : "pm25");
  const sourceFrames = sourceFramesForForecast(item);
  const hourlyFrames = expandForecastFramesHourly(sourceFrames);
  setForecastFrames(hourlyFrames.length ? hourlyFrames : sourceFrames);
  const grade = seoulGradeFromForecast(item);
  els.forecastIssuedAt.textContent = item?.dataTime || "예보 확인 중";
  els.forecastSummary.textContent = item
    ? `${activeDayLabel()} ${item.informData} 서울 ${METRIC_META[activeMetric].label} 예보는 ${grade || "확인 중"}입니다. ${item.informOverall || ""}`
    : "예보통보 API에서 내일·모레 자료를 확인하지 못했습니다.";
}

function setForecastFrames(frames) {
  forecastFrames = frames;
  if (forecastFrameIndex >= forecastFrames.length) forecastFrameIndex = 0;
  const frame = forecastFrames[forecastFrameIndex];
  els.forecastImage.hidden = !frame;
  els.forecastPlaceholder.hidden = Boolean(frame);
  els.forecastFrameLabel.textContent = frame ? frame.label : "예측 영상 없음";
  els.forecastPlayBtn.hidden = forecastFrames.length < 2;
  els.forecastDots.innerHTML = forecastFrames.map((_, index) => (
    `<button class="${index === forecastFrameIndex ? "active" : ""}" type="button" aria-label="${index + 1}번째 예측 영상"></button>`
  )).join("");
  els.forecastDots.querySelectorAll("button").forEach((button, index) => {
    button.addEventListener("click", () => {
      forecastFrameIndex = index;
      showForecastFrame();
      restartForecastAnimation();
    });
  });
  if (frame) showForecastFrame();
  restartForecastAnimation();
}

function imageForForecast(item) {
  if (!item) return "";
  if (activeDay === "after") return item.imageUrl9 || item.imageUrl6 || item.imageUrl3 || item.imageUrl1 || "";
  if (activeDay === "tomorrow") return item.imageUrl6 || item.imageUrl3 || item.imageUrl2 || item.imageUrl1 || "";
  return item.imageUrl1 || item.imageUrl2 || item.imageUrl3 || "";
}

function sourceFramesForForecast(item) {
  if (!item) return [];
  const sourceFrames = activeMetric === "pm25"
    ? [
      ["21시", item.imageUrl4],
      ["다음날 03시", item.imageUrl5],
      ["다음날 09시", item.imageUrl6],
      ["추가 예측 1", item.imageUrl7],
      ["추가 예측 2", item.imageUrl8],
      ["추가 예측 3", item.imageUrl9],
    ]
    : [
    ["21시", item.imageUrl1],
    ["다음날 03시", item.imageUrl2],
    ["다음날 09시", item.imageUrl3],
    ["추가 예측 1", item.imageUrl7],
    ["추가 예측 2", item.imageUrl8],
    ["추가 예측 3", item.imageUrl9],
  ];
  return sourceFrames.filter(([, url]) => Boolean(url)).map(([label, url]) => ({ label, url }));
}

function expandForecastFramesHourly(frames) {
  if (frames.length < 2) return frames;
  const parsed = frames
    .map((frame) => ({ ...frame, time: forecastTimeFromUrl(frame.url) }))
    .filter((frame) => frame.time);
  if (parsed.length < 2) return frames;
  const start = parsed[0].time;
  const end = parsed[parsed.length - 1].time;
  const hourlyFrames = [];
  for (let time = new Date(start); time <= end; time.setHours(time.getHours() + 1)) {
    const source = nearestForecastSource(time, parsed);
    hourlyFrames.push({
      label: formatForecastFrameLabel(time),
      url: source.url,
      sourceLabel: source.label,
    });
  }
  return hourlyFrames.length ? hourlyFrames : frames;
}

function nearestForecastSource(time, frames) {
  return frames.reduce((nearest, frame) => {
    const nearestDiff = Math.abs(nearest.time - time);
    const frameDiff = Math.abs(frame.time - time);
    return frameDiff < nearestDiff ? frame : nearest;
  }, frames[0]);
}

function showForecastFrame() {
  const frame = forecastFrames[forecastFrameIndex];
  if (!frame) return;
  els.forecastImage.onerror = null;
  els.forecastImage.classList.remove("active");
  els.forecastImage.src = frame.url;
  window.requestAnimationFrame(() => els.forecastImage.classList.add("active"));
  els.forecastFrameLabel.textContent = `${forecastFrameIndex + 1}/${forecastFrames.length} · ${frame.label}`;
  const progress = forecastFrames.length > 1 ? ((forecastFrameIndex + 1) / forecastFrames.length) * 100 : 100;
  els.forecastProgress.style.setProperty("--progress", `${progress}%`);
  els.forecastDots.querySelectorAll("button").forEach((button, index) => {
    button.classList.toggle("active", index === forecastFrameIndex);
  });
}

function restartForecastAnimation() {
  window.clearInterval(forecastTimer);
  if (!forecastPlaying || forecastFrames.length < 2) return;
  forecastTimer = window.setInterval(() => {
    forecastFrameIndex = (forecastFrameIndex + 1) % forecastFrames.length;
    showForecastFrame();
  }, FORECAST_INTERVAL_MS);
}

function renderAll() {
  buildMap();
  buildSelect();
  renderMetricMeta();
  renderDetail();
  renderTable();
}

function selectDistrict(name) {
  selectedName = name;
  els.districtSelect.value = name;
  renderAll();
  fetchHourlyData(name);
}

function distanceKm(fromLat, fromLng, toLat, toLng) {
  const radius = 6371;
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const lat1 = (fromLat * Math.PI) / 180;
  const lat2 = (toLat * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestDistrict(latitude, longitude, accuracy = null) {
  return Object.entries(DISTRICT_CENTERS)
    .map(([name, [lat, lng]]) => ({ name, distance: distanceKm(latitude, longitude, lat, lng), latitude, longitude, accuracy }))
    .sort((a, b) => a.distance - b.distance)[0];
}

function showNotice(message) {
  els.notice.textContent = message;
  els.notice.hidden = false;
}

function getApiKey() {
  return DEFAULT_API_KEY;
}

function buildApiUrl(apiKey) {
  const params = new URLSearchParams({
    serviceKey: apiKey,
    returnType: "json",
    numOfRows: "100",
    pageNo: "1",
    sidoName: "서울",
    ver: "1.0",
  });
  return `${API_BASE_URL}?${params.toString()}`;
}

function buildStationHistoryUrl(apiKey, stationName) {
  const params = new URLSearchParams({
    serviceKey: apiKey,
    returnType: "json",
    numOfRows: "24",
    pageNo: "1",
    stationName,
    dataTerm: "DAILY",
    ver: "1.0",
  });
  return `${STATION_HISTORY_URL}?${params.toString()}`;
}

function buildForecastUrl(apiKey) {
  const params = new URLSearchParams({
    serviceKey: apiKey,
    returnType: "json",
    numOfRows: "50",
    pageNo: "1",
    searchDate: formatLocalDate(new Date()),
    InformCode: forecastCodeForMetric(),
  });
  return `${FORECAST_URL}?${params.toString()}`;
}

function formatAccuracy(accuracy) {
  if (!Number.isFinite(accuracy)) return "확인 중";
  if (accuracy >= 1000) return `약 ${(accuracy / 1000).toFixed(1)}km`;
  return `약 ${Math.round(accuracy)}m`;
}

function describeLocation(match) {
  const distance = match.distance.toFixed(1);
  const accuracy = formatAccuracy(match.accuracy);
  return `📍 현재 위치를 ${match.name} 기준으로 반영했습니다. 측정소 중심까지 약 ${distance}km, 위치 정확도는 ${accuracy}입니다.`;
}

function useCurrentLocation({ silent = false } = {}) {
  if (!navigator.geolocation) {
    showNotice("이 브라우저에서는 현재 위치 기능을 사용할 수 없습니다.");
    return;
  }
  els.locationBtn.disabled = true;
  els.locationBtn.textContent = "확인 중";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const match = nearestDistrict(latitude, longitude, position.coords.accuracy);
      const hasData = airData.some((item) => item.name === match.name);
      locationMatch = match;
      if (hasData) selectDistrict(match.name);
      else renderAll();
      if (match.distance > 12) {
        showNotice(`현재 위치가 서울 중심권 밖으로 보입니다. 가장 가까운 서울 측정소인 ${match.name} 기준으로 표시합니다.`);
      } else if (match.accuracy > 1500) {
        showNotice(`${describeLocation(match)} 브라우저 위치가 넓게 잡혀 근처 자치구와 차이가 날 수 있습니다.`);
      } else if (!silent) {
        showNotice(describeLocation(match));
      } else {
        els.notice.hidden = true;
      }
      els.locationBtn.disabled = false;
      els.locationBtn.textContent = `📍 내 위치: ${match.name}`;
    },
    (error) => {
      const reason = error.code === error.PERMISSION_DENIED ? "위치 권한이 거부되었습니다." : "현재 위치를 확인하지 못했습니다.";
      showNotice(`${reason} 브라우저 주소창의 위치 권한을 허용한 뒤 다시 눌러 주세요.`);
      els.locationBtn.disabled = false;
      els.locationBtn.textContent = "현재 위치";
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
  );
}

async function fetchAirData() {
  els.refreshBtn.disabled = true;
  els.notice.hidden = true;
  try {
    const apiKey = getApiKey();
    const response = await fetch(buildApiUrl(apiKey), { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    const rows = json.response?.body?.items || [];
    const normalized = rows.map(normalizeRow).filter((row) => row.name && POSITIONS[row.name]);
    if (normalized.length < 10) throw new Error("응답 데이터가 충분하지 않습니다.");
    airData = normalized;
    selectedName = airData.some((item) => item.name === selectedName) ? selectedName : airData[0].name;
    const newest = airData.find((row) => row.date)?.date || new Date().toLocaleString("ko-KR");
    els.updatedAt.textContent = formatDate(newest);
    await fetchForecastData();
    fetchHourlyData(selectedName);
    applyLocationIfAlreadyGranted();
  } catch (error) {
    airData = FALLBACK;
    els.updatedAt.textContent = "예시 데이터";
    showNotice(`예시 데이터로 표시합니다. (${error.message})`);
  } finally {
    renderAll();
    els.refreshBtn.disabled = false;
  }
}

async function fetchHourlyData(name = selectedName) {
  const requestId = ++hourlyRequestId;
  try {
    const response = await fetch(buildStationHistoryUrl(getApiKey(), name), { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    const rows = json.response?.body?.items || [];
    const normalized = rows.map((row) => normalizeRow({ ...row, stationName: name })).filter((row) => row.date);
    if (requestId !== hourlyRequestId) return;
    hourlyData = normalized;
  } catch (error) {
    if (requestId !== hourlyRequestId) return;
    hourlyData = [];
  } finally {
    if (requestId === hourlyRequestId) renderHourlyChart();
  }
}

async function fetchForecastData() {
  try {
    const response = await fetch(buildForecastUrl(getApiKey()), { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    forecastItems = json.response?.body?.items || [];
  } catch (error) {
    forecastItems = [];
  }
}

async function applyLocationIfAlreadyGranted() {
  if (!navigator.permissions || !navigator.geolocation) return;
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    if (status.state === "granted") useCurrentLocation({ silent: true });
  } catch (error) {
    // Some browsers support geolocation but not querying its permission state.
  }
}

function formatDate(value) {
  if (/^\d{12}$/.test(value)) {
    return `${value.slice(0, 4)}.${value.slice(4, 6)}.${value.slice(6, 8)} ${value.slice(8, 10)}:${value.slice(10, 12)}`;
  }
  return value || new Date().toLocaleString("ko-KR");
}

function parseDataTime(value) {
  const match = String(value || "").match(/(\d{4})[-.](\d{2})[-.](\d{2})\s+(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
}

function parseLocalDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function floorToHour(date) {
  const next = new Date(date);
  next.setMinutes(0, 0, 0);
  return next;
}

function hourKey(date) {
  return `${formatLocalDate(date)} ${String(date.getHours()).padStart(2, "0")}`;
}

function formatChartTime(date) {
  return `${formatLocalDate(date)} ${String(date.getHours()).padStart(2, "0")}:00`;
}

function forecastTimeFromUrl(url) {
  const match = String(url || "").match(/(\d{10})(?=\.png(?:\?|$))/);
  if (!match) return null;
  const stamp = match[1];
  return new Date(
    Number(stamp.slice(0, 4)),
    Number(stamp.slice(4, 6)) - 1,
    Number(stamp.slice(6, 8)),
    Number(stamp.slice(8, 10)),
  );
}

function formatForecastFrameLabel(date) {
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}시`;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

els.refreshBtn.addEventListener("click", fetchAirData);
els.locationBtn.addEventListener("click", useCurrentLocation);
els.forecastPlayBtn.addEventListener("click", () => {
  forecastPlaying = !forecastPlaying;
  els.forecastPlayBtn.textContent = forecastPlaying ? "일시정지" : "재생";
  restartForecastAnimation();
});
els.districtSelect.addEventListener("change", (event) => selectDistrict(event.target.value));
els.searchInput.addEventListener("input", renderTable);
els.metricTabs.forEach((button) => {
  button.addEventListener("click", () => {
    activeMetric = button.dataset.metric;
    forecastFrameIndex = 0;
    els.metricTabs.forEach((tab) => tab.classList.toggle("active", tab === button));
    fetchForecastData().then(() => renderAll());
  });
});
els.dayTabs.forEach((button) => {
  button.addEventListener("click", () => {
    activeDay = button.dataset.day;
    forecastFrameIndex = 0;
    els.dayTabs.forEach((tab) => tab.classList.toggle("active", tab === button));
    renderDetail();
  });
});
window.addEventListener("resize", buildMap);

fetchAirData();
