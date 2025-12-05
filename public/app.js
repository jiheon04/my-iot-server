/* =========================================================
 *  1. 모드 설정: DEMO vs 실제 서버
 * ========================================================= */

// true = 서버 없이 가짜 데이터 사용 (지금은 이 모드)
const DEMO_MODE = true;

// 나중에 Node.js 서버 만들면 여기만 맞게 수정하면 됨
const API_BASE = "http://localhost:3000";

/* =========================================================
 *  2. Chart.js로 라인 그래프 기본 세팅
 * ========================================================= */

const postureCtx = document.getElementById('postureChart').getContext('2d');
const postureChart = new Chart(postureCtx, {
  type: 'line',
  data: {
    labels: [],        // 시간 문자열 "HH:MM"
    datasets: [{
      label: 'posture',
      data: [],         // 0,1,2 값
      borderWidth: 2,
      tension: 0.2
    }]
  },
  options: {
    responsive: true,
    scales: {
      y: {
        min: -0.2,
        max: 2.2,
        ticks: {
          callback: (v) => {
            if (v === 0) return 'GOOD';
            if (v === 1) return 'BAD';
            if (v === 2) return 'ABSENT';
            return v;
          }
        }
      }
    },
    plugins: {
      legend: { display: false }
    }
  }
});

/* =========================================================
 *  3. 상태 뱃지 / DOM 업데이트용 함수들
 * ========================================================= */

function updateStatusBadge(posture) {
  const badge = document.getElementById('statusBadge');
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');

  badge.classList.remove('status-good', 'status-bad', 'status-absent');
  dot.classList.remove('good', 'bad', 'absent');

  if (posture === 0) {
    badge.classList.add('status-good');
    dot.classList.add('good');
    text.textContent = 'GOOD 자세 (정상)';
  } else if (posture === 1) {
    badge.classList.add('status-bad');
    dot.classList.add('bad');
    text.textContent = 'BAD 자세 (교정 필요)';
  } else {
    badge.classList.add('status-absent');
    dot.classList.add('absent');
    text.textContent = 'ABSENT (자리 비움)';
  }
}

function renderPosturePill(p) {
  if (p === 0) return `<span class="pill pill-good">GOOD</span>`;
  if (p === 1) return `<span class="pill pill-bad">BAD</span>`;
  return `<span class="pill pill-absent">ABSENT</span>`;
}

/* =========================================================
 *  4. DEMO용 데이터 생성 함수
 *     → 나중에 실제 서버가 있으면 이 부분을 fetch()로 교체
 * ========================================================= */

function generateDemoSample(previousBadCount) {
  const now = new Date();
  const posture = Math.floor(Math.random() * 3); // 0 ~ 2
  const distance = (posture === 1)
    ? 26 + Math.random() * 7   // BAD면 거리 더 짧게
    : 36 + Math.random() * 20; // GOOD이면 거리 더 멀게
  const seat = (posture === 2)
    ? 20 + Math.random() * 40  // ABSENT면 거의 안 눌림
    : 400 + Math.random() * 250; // 착석

  const ldr = 200 + Math.random() * 600;

  // BAD면 경고 횟수 1 증가, 아니면 그대로
  const newBadCount = posture === 1 ? previousBadCount + 1 : previousBadCount;

  return {
    timestamp: now.toISOString(),
    distanceCm: distance,
    seatValue: seat,
    ldrValue: ldr,
    postureState: posture,
    warningCount: newBadCount,
    badDurationSec: newBadCount * 3   // BAD_HOLD_TIME=3초 가정해서 대충 계산
  };
}

async function fetchLatestData() {
  if (DEMO_MODE) {
    const currentBad = parseInt(document.getElementById('statBadCount').textContent || '0', 10);
    return generateDemoSample(currentBad);
  } else {
    const res = await fetch(`${API_BASE}/api/latest`);
    // 서버 JSON 형식:
    // { timestamp, distanceCm, seatValue, ldrValue, postureState, warningCount, badDurationSec }
    return await res.json();
  }
}

/* =========================================================
 *  5. 자세 피드백 생성 함수
 * ========================================================= */

function generateFeedback(sample) {
  const posture = sample.postureState;
  const dist = sample.distanceCm;
  const badSec = sample.badDurationSec || 0;

  if (posture === 2) {
    return "자리에 없는 상태입니다. 잠시 휴식 중일 수 있어요.";
  }

  if (posture === 1) { // BAD 자세
    if (dist && dist < 20) {
      return "📉 목이 너무 앞으로 나왔어요! 의자에 등을 붙이고 고개를 바로 세워보세요.";
    }
    if (dist && dist < 30) {
      return "⚠️ 상체가 많이 숙여졌습니다. 허리를 펴고 모니터를 눈높이에 맞춰주세요.";
    }
    if (badSec >= 300) {
      return "⚠️ 5분 이상 나쁜 자세가 유지되고 있어요. 잠깐 일어나서 스트레칭을 해보는 건 어떨까요?";
    }
    return "⚠️ 나쁜 자세가 감지되었습니다. 자세를 한번 점검해보세요!";
  }

  if (posture === 0) { // GOOD 자세
    if (badSec > 120) {
      return "👍 조금 전까지 나쁜 자세가 길었지만, 지금은 잘 교정해서 유지 중입니다. 계속 이렇게 앉아보세요!";
    }
    return "✨ 좋은 자세입니다! 지금 자세를 계속 유지하면 거북목 예방에 도움이 됩니다.";
  }

  return "데이터를 분석하는 중입니다.";
}

/* =========================================================
 *  6. UI 전체 업데이트 (실시간 박스 + 그래프 + 로그)
 * ========================================================= */

// GOOD/BAD 비율 계산용으로 log 전체를 메모리에 저장
const history = [];

function updateUIWithSample(sample) {
  // 시간 파싱
  const d = new Date(sample.timestamp);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const timeLabel = `${hh}:${mm}`;

  document.getElementById('lastUpdated').textContent =
    `마지막 업데이트: ${hh}:${mm}:${ss}`;
  document.getElementById('statDistance').textContent =
    sample.distanceCm ? sample.distanceCm.toFixed(1) : '-';
  document.getElementById('statSeat').textContent =
    sample.seatValue ? Math.round(sample.seatValue) : '-';
  document.getElementById('statLdr').textContent =
    sample.ldrValue ? Math.round(sample.ldrValue) : '-';

  document.getElementById('statBadCount').textContent = sample.warningCount ?? 0;
  const badMinutes = sample.badDurationSec ? (sample.badDurationSec / 60).toFixed(1) : '0.0';
  document.getElementById('statBadMinutes').textContent = badMinutes;

  // 상태 뱃지
  updateStatusBadge(sample.postureState);

  // history 배열에 추가
  history.push(sample);
  if (history.length > 500) history.shift(); // 너무 길어지면 앞부분 제거

  // 오늘 GOOD/BAD 비율 → 점수 계산
  const goodRate = calcGoodRate(history);
  const badRate  = calcBadRate(history);
  const score = Math.round(goodRate); // 간단하게 GOOD%를 점수로 사용

  document.getElementById('statScore').textContent = score;

  // 목표 GOOD 비율 있으면 안내 문구 업데이트
  updateGoalInfo(goodRate);

  // 자세 피드백 문구 업데이트
  const feedback = generateFeedback(sample);
  document.getElementById('feedbackMessage').textContent = feedback;

  // 그래프에 점 추가
  const labels = postureChart.data.labels;
  const data = postureChart.data.datasets[0].data;
  labels.push(timeLabel);
  data.push(sample.postureState);
  if (labels.length > 50) {
    labels.shift();
    data.shift();
  }
  postureChart.update();

  // 로그 테이블에 한 줄 추가
  const tbody = document.getElementById('logTableBody');
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${hh}:${mm}:${ss}</td>
    <td>${renderPosturePill(sample.postureState)}</td>
    <td>${sample.distanceCm ? sample.distanceCm.toFixed(1) : '-'}</td>
    <td>${sample.seatValue ? Math.round(sample.seatValue) : '-'}</td>
    <td>${sample.ldrValue ? Math.round(sample.ldrValue) : '-'}</td>
  `;
  tbody.prepend(row);
  while (tbody.children.length > 10) {
    tbody.removeChild(tbody.lastChild);
  }
}

function calcGoodRate(arr) {
  if (arr.length === 0) return 0;
  const good = arr.filter(s => s.postureState === 0).length;
  return Math.round((good / arr.length) * 100);
}
function calcBadRate(arr) {
  if (arr.length === 0) return 0;
  const bad = arr.filter(s => s.postureState === 1).length;
  return Math.round((bad / arr.length) * 100);
}

/* =========================================================
 *  7. 사용자 설정 (닉네임 / 목표 GOOD 비율) – localStorage 사용
 * ========================================================= */

const STORAGE_KEY = "smartHabitChairSettings";

function loadSettings() {
  const raw = localStorage.getItem(STORAGE_KEY);
  let settings = { nickname: "", goalGoodRate: 80 }; // 기본: 80%
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      settings = { ...settings, ...parsed };
    } catch (e) {
      console.warn("설정 파싱 실패, 기본값 사용", e);
    }
  }

  document.getElementById('inputNickname').value = settings.nickname;
  document.getElementById('inputGoal').value = settings.goalGoodRate;
  document.getElementById('goalInfo').textContent =
    `목표 GOOD 비율: ${settings.goalGoodRate}%`;
}

function saveSettings() {
  const nickname = document.getElementById('inputNickname').value.trim();
  const goal = parseInt(document.getElementById('inputGoal').value || '80', 10);

  const settings = {
    nickname,
    goalGoodRate: isNaN(goal) ? 80 : goal
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

  document.getElementById('goalInfo').textContent =
    `목표 GOOD 비율: ${settings.goalGoodRate}%`;

  const info = document.getElementById('settingsInfo');
  info.textContent = `"${nickname || '사용자'}" 설정이 저장되었습니다. (목표 GOOD ${settings.goalGoodRate}% 이상)`;
}

function updateGoalInfo(currentGoodRate) {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const { nickname = "사용자", goalGoodRate = 80 } = JSON.parse(raw);
    const diff = currentGoodRate - goalGoodRate;
    const info = document.getElementById('settingsInfo');
    if (currentGoodRate === 0) {
      info.textContent = `"${nickname}"님의 오늘 GOOD 비율 데이터가 아직 충분하지 않습니다. (목표 ${goalGoodRate}%)`;
    } else if (diff >= 0) {
      info.textContent = `굿! "${nickname}"님 오늘 GOOD 비율 ${currentGoodRate}% (목표 ${goalGoodRate}% 달성 🎉)`;
    } else {
      info.textContent = `"${nickname}"님 오늘 GOOD 비율 ${currentGoodRate}% (목표 ${goalGoodRate}%까지 ${-diff}% 남았어요)`;
    }
  } catch (e) {
    console.warn("설정 파싱 실패", e);
  }
}

/* =========================================================
 *  8. 자동 새로고침 / 수동 새로고침 로직
 * ========================================================= */

let intervalId = null;

async function manualRefresh() {
  const sample = await fetchLatestData();
  updateUIWithSample(sample);
}

function setupAutoRefresh() {
  const cb = document.getElementById('autoRefresh');
  if (cb.checked) {
    if (!intervalId) {
      intervalId = setInterval(async () => {
        const sample = await fetchLatestData();
        updateUIWithSample(sample);
      }, 5000); // 5초마다 갱신
    }
  } else {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
}

document.getElementById('autoRefresh').addEventListener('change', setupAutoRefresh);

/* =========================================================
 *  9. 초기 실행
 * ========================================================= */

(async function init() {
  loadSettings();          // localStorage에서 설정 불러오기
  await manualRefresh();   // 처음 한 번은 바로 데이터 갱신
  setupAutoRefresh();      // 체크박스 상태에 따라 자동 갱신 시작
})();
