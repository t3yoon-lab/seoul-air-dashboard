const API_KEY_STORAGE_KEY = "seoul-air-dashboard-api-key";
const API_BASE_URL = "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty";

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

let airData = [];
let selectedName = "종로구";
let activeMetric = "pm10";
let locationMatch = null;

const els = {
  updatedAt: document.querySelector("#updatedAt"),
  refreshBtn: document.querySelector("#refreshBtn"),
  locationBtn: document.querySelector("#locationBtn"),
  apiKeyBtn: document.querySelector("#apiKeyBtn"),
  locationNote: document.querySelector("#locationNote"),
  notice: document.querySelector("#notice"),
  districtMap: document.querySelector("#districtMap"),
  selectedName: document.querySelector("#selectedName"),
  gradeBadge: document.querySelector("#gradeBadge"),
  pm25Value: document.querySelector("#pm25Value"),
  pm10Value: document.querySelector("#pm10Value"),
  o3Value: document.querySelector("#o3Value"),
  gaugeNeedle: document.querySelector("#gaugeNeedle"),
  adviceText: document.querySelector("#adviceText"),
  lifeIndexGrid: document.querySelector("#lifeIndexGrid"),
  districtSelect: document.querySelector("#districtSelect"),
  forecastChart: document.querySelector("#forecastChart"),
  rankingBody: document.querySelector("#rankingBody"),
  searchInput: document.querySelector("#searchInput"),
  metricTabs: document.querySelectorAll(".metric-tab"),
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

function gradeByPm25(pm25) {
  if (pm25 === null || pm25 === undefined || pm25 <= 0) {
    return { label: "🔎 점검", key: "unknown", score: 0, advice: "현재 측정값이 비어 있습니다. 인접 자치구와 최신 업데이트 시각을 함께 확인하세요." };
  }
  if (pm25 <= 15) return { label: "😊 좋음", key: "good", score: 18, advice: "야외 활동하기 좋은 공기입니다. 환기는 짧게 열어도 무난합니다." };
  if (pm25 <= 35) return { label: "🙂 보통", key: "normal", score: 45, advice: "대체로 무난하지만 민감군은 장시간 외출 전 상태를 확인하세요." };
  if (pm25 <= 75) return { label: "😷 나쁨", key: "bad", score: 72, advice: "마스크 착용을 권장합니다. 어린이와 노약자는 야외 활동을 줄이세요." };
  return { label: "🚨 매우나쁨", key: "very-bad", score: 94, advice: "외출을 최소화하고 실내 공기질 관리에 신경 써 주세요." };
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function scoreLabel(score) {
  if (score >= 80) return { label: "😊 좋아요", color: "#41b995" };
  if (score >= 60) return { label: "🙂 괜찮아요", color: "#f0b84f" };
  if (score >= 35) return { label: "😷 조심", color: "#ee8b68" };
  return { label: "🚨 쉬어가기", color: "#d86161" };
}

function buildLifeIndexes(item) {
  if (!item.pm10 && !item.pm25) {
    return [
      ["러닝", "🏃", 0, "🔎 점검", "측정값 없음", "#8f9995"],
      ["생활", "🧺", 0, "🔎 점검", "인접 자치구를 확인하세요.", "#8f9995"],
      ["세차", "🚗", 0, "🔎 점검", "먼지 상태 확인 후 판단하세요.", "#8f9995"],
      ["환기", "🪟", 0, "🔎 점검", "최신 업데이트를 기다려 주세요.", "#8f9995"],
    ];
  }

  const pm10 = item.pm10 || 0;
  const pm25 = item.pm25 || 0;
  const ozone = item.ozone || 0;
  const runningScore = clamp(100 - pm25 * 1.65 - Math.max(0, pm10 - 30) * 0.35 - Math.max(0, ozone - 0.06) * 260);
  const livingScore = clamp(100 - pm25 * 1.15 - Math.max(0, pm10 - 40) * 0.22);
  const washScore = clamp(100 - pm10 * 0.9 - pm25 * 0.28);
  const ventScore = clamp(100 - pm25 * 1.45 - Math.max(0, ozone - 0.055) * 360);

  const indexes = [
    ["러닝", "🏃", runningScore, "짧은 조깅과 산책 기준", runningScore >= 60 ? "가벼운 야외 운동 가능" : "실내 운동을 권장합니다."],
    ["생활", "🧺", livingScore, "외출·등하교 체감 기준", livingScore >= 60 ? "일상 활동 무난" : "민감군은 노출 시간을 줄이세요."],
    ["세차", "🚗", washScore, "먼지 재부착 가능성 기준", washScore >= 70 ? "세차하기 좋은 편" : "먼지가 다시 앉을 수 있어요."],
    ["환기", "🪟", ventScore, "실내 환기 판단 기준", ventScore >= 65 ? "짧은 환기 가능" : "창문은 짧게만 여세요."],
  ];

  return indexes.map(([name, icon, score, basis, message]) => {
    const status = scoreLabel(score);
    return [name, icon, Math.round(score), status.label, `${basis} · ${message}`, status.color];
  });
}

function colorFor(item, metric = activeMetric) {
  if (!item.pm10 && !item.pm25) return "#d9ded9";
  const value = metric === "pm25" ? item.pm25 : metric === "index" ? item.pm25 * 1.2 + item.pm10 * 0.25 : item.pm10;
  const threshold = metric === "pm10" ? [30, 80, 150] : metric === "pm25" ? [15, 35, 75] : [34, 72, 128];
  if (value <= threshold[0]) return "#9bdcc2";
  if (value <= threshold[1]) return "#f2d47d";
  if (value <= threshold[2]) return "#f1a176";
  return "#d96c6c";
}

function metricValue(item) {
  if (!item.pm10 && !item.pm25) return "-";
  if (activeMetric === "pm25") return item.pm25 ?? "-";
  if (activeMetric === "index") return Math.round((item.pm25 || 0) * 1.2 + (item.pm10 || 0) * 0.25);
  return item.pm10 ?? "-";
}

function buildMap() {
  els.districtMap.innerHTML = "";
  const mobile = window.matchMedia("(max-width: 720px)").matches;
  airData.forEach((item) => {
    const [x, y] = POSITIONS[item.name] || [50, 50];
    const button = document.createElement("button");
    button.type = "button";
    button.className = `district ${item.name === selectedName ? "active" : ""} ${locationMatch?.name === item.name ? "current" : ""}`;
    button.style.left = mobile ? `${Math.max(2, Math.min(70, x - 10))}%` : `${x}%`;
    button.style.top = mobile ? `${Math.max(1, y * 1.12)}%` : `${y}%`;
    button.style.background = colorFor(item);
    button.innerHTML = `<span>${emojiForGrade(item.pm25)} ${item.name}</span><small>${metricValue(item)}</small>`;
    button.addEventListener("click", () => selectDistrict(item.name));
    els.districtMap.appendChild(button);
  });
}

function emojiForGrade(pm25) {
  if (pm25 === null || pm25 === undefined || pm25 <= 0) return "🔎";
  if (pm25 <= 15) return "😊";
  if (pm25 <= 35) return "🙂";
  if (pm25 <= 75) return "😷";
  return "🚨";
}

function buildSelect() {
  els.districtSelect.innerHTML = airData
    .map((item) => `<option value="${item.name}">${item.name}</option>`)
    .join("");
  els.districtSelect.value = selectedName;
}

function renderDetail() {
  const item = airData.find((row) => row.name === selectedName) || airData[0];
  const grade = gradeByPm25(item.pm25);
  els.selectedName.textContent = item.name;
  if (locationMatch?.name === item.name) {
    els.locationNote.textContent = `내 위치 기준 · 약 ${locationMatch.distance.toFixed(1)}km`;
    els.locationNote.hidden = false;
  } else {
    els.locationNote.hidden = true;
  }
  els.gradeBadge.textContent = grade.label;
  els.gradeBadge.className = `grade-badge grade-${grade.key}`;
  els.pm25Value.textContent = item.pm25 ? Math.round(item.pm25) : "-";
  els.pm10Value.textContent = item.pm10 ? Math.round(item.pm10) : "-";
  els.o3Value.textContent = item.ozone ? item.ozone.toFixed(3) : "-";
  els.gaugeNeedle.style.left = `${grade.score}%`;
  els.adviceText.textContent = grade.advice;
  renderLifeIndexes(item);
}

function renderLifeIndexes(item) {
  els.lifeIndexGrid.innerHTML = buildLifeIndexes(item).map(([name, icon, score, label, message, color]) => `
    <article class="life-card" style="--score: ${score}%; --accent: ${color}">
      <div class="life-card-top">
        <h4><span aria-hidden="true">${icon}</span> ${name} 지수</h4>
        <span class="life-score">${score}</span>
      </div>
      <div class="life-bar" aria-hidden="true"><span></span></div>
      <strong>${label}</strong>
      <p>${message}</p>
    </article>
  `).join("");
}

function forecastFor(item) {
  const hour = new Date().getHours();
  return Array.from({ length: 12 }, (_, index) => {
    const wave = Math.sin((hour + index) / 2.8) * 4;
    const commute = [8, 9, 18, 19].includes((hour + index) % 24) ? 5 : 0;
    const basePm10 = item.pm10 || 30;
    const basePm25 = item.pm25 || 15;
    return {
      label: `${(hour + index) % 24}시`,
      pm10: Math.max(5, Math.round(basePm10 + wave + commute - index * 0.3)),
      pm25: Math.max(3, Math.round(basePm25 + wave * 0.55 + commute * 0.45 - index * 0.18)),
    };
  });
}

function drawChart() {
  const canvas = els.forecastChart;
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const width = rect.width;
  const height = rect.height;
  const pad = { left: 42, right: 18, top: 20, bottom: 42 };
  ctx.clearRect(0, 0, width, height);
  const item = airData.find((row) => row.name === selectedName) || airData[0];
  const forecast = forecastFor(item);
  const max = Math.max(80, ...forecast.flatMap((point) => [point.pm10, point.pm25])) + 8;
  const x = (i) => pad.left + (i * (width - pad.left - pad.right)) / (forecast.length - 1);
  const y = (value) => height - pad.bottom - (value / max) * (height - pad.top - pad.bottom);

  ctx.strokeStyle = "#dfe5df";
  ctx.lineWidth = 1;
  ctx.font = "12px system-ui";
  ctx.fillStyle = "#6a7471";
  for (let i = 0; i <= 4; i += 1) {
    const value = Math.round((max / 4) * i);
    const yy = y(value);
    ctx.beginPath();
    ctx.moveTo(pad.left, yy);
    ctx.lineTo(width - pad.right, yy);
    ctx.stroke();
    ctx.fillText(String(value), 8, yy + 4);
  }

  function line(key, color) {
    ctx.beginPath();
    forecast.forEach((point, index) => {
      const xx = x(index);
      const yy = y(point[key]);
      if (index === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
    forecast.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(x(index), y(point[key]), 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  }

  line("pm10", "#147d72");
  line("pm25", "#e76f51");
  ctx.fillStyle = "#6a7471";
  forecast.forEach((point, index) => ctx.fillText(point.label, x(index) - 10, height - 16));
  ctx.fillStyle = "#147d72";
  ctx.fillText("PM10", width - 100, 24);
  ctx.fillStyle = "#e76f51";
  ctx.fillText("PM2.5", width - 55, 24);
}

function renderTable() {
  const keyword = els.searchInput.value.trim();
  const rows = airData
    .filter((item) => item.name.includes(keyword))
    .sort((a, b) => (b.pm25 || -1) - (a.pm25 || -1));
  els.rankingBody.innerHTML = rows.map((item) => {
    const grade = gradeByPm25(item.pm25);
    return `<tr data-name="${item.name}">
      <td><strong>${emojiForGrade(item.pm25)} ${item.name}</strong></td>
      <td>${item.pm10 ? Math.round(item.pm10) : "-"}</td>
      <td>${item.pm25 ? Math.round(item.pm25) : "-"}</td>
      <td><span class="status-pill grade-${grade.key}">${grade.label}</span></td>
    </tr>`;
  }).join("");
  els.rankingBody.querySelectorAll("tr").forEach((row) => {
    row.addEventListener("click", () => selectDistrict(row.dataset.name));
  });
}

function renderAll() {
  buildMap();
  buildSelect();
  renderDetail();
  drawChart();
  renderTable();
}

function selectDistrict(name) {
  selectedName = name;
  els.districtSelect.value = name;
  renderAll();
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

function nearestDistrict(latitude, longitude) {
  return Object.entries(DISTRICT_CENTERS)
    .map(([name, [lat, lng]]) => ({ name, distance: distanceKm(latitude, longitude, lat, lng) }))
    .sort((a, b) => a.distance - b.distance)[0];
}

function showNotice(message) {
  els.notice.textContent = message;
  els.notice.hidden = false;
}

function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE_KEY) || "";
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

function setApiKey() {
  const current = getApiKey();
  const next = window.prompt("공공데이터포털 AirKorea API 키를 입력하세요. 이 키는 이 브라우저에만 저장됩니다.", current);
  if (next === null) return;
  const trimmed = next.trim();
  if (trimmed) {
    localStorage.setItem(API_KEY_STORAGE_KEY, trimmed);
    showNotice("API 키를 저장했습니다. 실시간 서울 대기질을 다시 불러옵니다.");
  } else {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    showNotice("API 키를 삭제했습니다. 예시 데이터로 표시합니다.");
  }
  fetchAirData();
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    showNotice("이 브라우저에서는 현재 위치 기능을 사용할 수 없습니다.");
    return;
  }

  els.locationBtn.disabled = true;
  els.locationBtn.lastChild.textContent = " 확인 중";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const match = nearestDistrict(latitude, longitude);
      const hasData = airData.some((item) => item.name === match.name);
      locationMatch = match;
      if (hasData) selectDistrict(match.name);
      else renderAll();
      if (match.distance > 12) {
        showNotice(`현재 위치가 서울 중심권 밖으로 보입니다. 가장 가까운 서울 측정소인 ${match.name} 기준으로 표시합니다.`);
      } else {
        els.notice.hidden = true;
      }
      els.locationBtn.disabled = false;
      els.locationBtn.lastChild.textContent = " 현재 위치";
    },
    (error) => {
      const reason = error.code === error.PERMISSION_DENIED ? "위치 권한이 거부되었습니다." : "현재 위치를 확인하지 못했습니다.";
      showNotice(`${reason} 브라우저 주소창의 위치 권한을 허용한 뒤 다시 눌러 주세요.`);
      els.locationBtn.disabled = false;
      els.locationBtn.lastChild.textContent = " 현재 위치";
    },
    { enableHighAccuracy: true, timeout: 9000, maximumAge: 300000 },
  );
}

async function fetchAirData() {
  els.refreshBtn.disabled = true;
  els.notice.hidden = true;
  try {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API 키가 설정되지 않았습니다. 상단의 API 키 버튼을 눌러 키를 저장하세요.");
    const response = await fetch(buildApiUrl(apiKey), { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    const rows = json.response?.body?.items || json.ListAirQualityByDistrictService?.row || json.row || [];
    const normalized = rows.map(normalizeRow).filter((row) => row.name && POSITIONS[row.name]);
    if (normalized.length < 10) throw new Error("응답 데이터가 충분하지 않습니다.");
    airData = normalized;
    selectedName = airData.some((item) => item.name === selectedName) ? selectedName : airData[0].name;
    const newest = airData.find((row) => row.date)?.date || new Date().toLocaleString("ko-KR");
    els.updatedAt.textContent = formatDate(newest);
  } catch (error) {
    airData = FALLBACK;
    els.updatedAt.textContent = "예시 데이터";
    els.notice.textContent = `공공데이터 API를 불러오지 못해 예시 데이터로 표시합니다. (${error.message})`;
    els.notice.hidden = false;
  } finally {
    renderAll();
    els.refreshBtn.disabled = false;
  }
}

function formatDate(value) {
  if (/^\d{12}$/.test(value)) {
    return `${value.slice(0, 4)}.${value.slice(4, 6)}.${value.slice(6, 8)} ${value.slice(8, 10)}:${value.slice(10, 12)}`;
  }
  return value || new Date().toLocaleString("ko-KR");
}

els.refreshBtn.addEventListener("click", fetchAirData);
els.locationBtn.addEventListener("click", useCurrentLocation);
els.apiKeyBtn.addEventListener("click", setApiKey);
els.districtSelect.addEventListener("change", (event) => selectDistrict(event.target.value));
els.searchInput.addEventListener("input", renderTable);
els.metricTabs.forEach((button) => {
  button.addEventListener("click", () => {
    activeMetric = button.dataset.metric;
    els.metricTabs.forEach((tab) => tab.classList.toggle("active", tab === button));
    buildMap();
  });
});
window.addEventListener("resize", () => {
  buildMap();
  drawChart();
});

fetchAirData();
