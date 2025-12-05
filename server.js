const express = require("express");
const path = require("path");
const app = express();

// 바디 파싱
app.use(express.text());
app.use(express.json());

// 정적 파일 (public 폴더) 제공
app.use(express.static(path.join(__dirname, "public")));

// 🔹 마지막 측정값 저장용 (대시보드가 /api/latest로 읽어가는 구조)
let lastSample = {
  timestamp: null,
  postureState: 2,   // 0=GOOD, 1=BAD, 2=ABSENT(기본값)
  distanceCm: null,
  seatValue: null,
  ldrValue: null,
  warningCount: 0,
  badDurationSec: 0
};

// postureState 갱신 함수
function updateFromValue(raw) {
  const num = Number(raw);
  const posture = [0, 1, 2].includes(num) ? num : 2; // 잘못된 값이면 ABSENT 처리
  const now = new Date().toISOString();

  // BAD일 때만 경고/시간 누적 (대충 5초 간격 가정)
  if (posture === 1) {
    lastSample.warningCount += 1;
    lastSample.badDurationSec += 5;
  } else {
    lastSample.badDurationSec = 0;
  }

  lastSample.timestamp = now;
  lastSample.postureState = posture;
}

// 🔹 메인 페이지: 우리 대시보드 HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "smart_chair_dashboard.html"));
});

// 🔹 ESP가 본문으로 보낼 때 (POST /chair, body = "1" 이런 식)
app.post("/chair", (req, res) => {
  console.log("📥 [POST] ESP에서 받은 데이터:", req.body);
  if (req.body !== undefined && req.body !== "") {
    updateFromValue(req.body);
  }
  res.send("OK");
});

// 🔹 ESP가 쿼리스트링으로 보낼 때 (GET /chair?value=1)
app.get("/chair", (req, res) => {
  const value = req.query.value;
  console.log("📥 [GET] ESP에서 받은 데이터:", value);
  if (value !== undefined) {
    updateFromValue(value);
  }
  res.send("OK");
});

// 🔹 대시보드가 읽어가는 최신 데이터 엔드포인트
app.get("/api/latest", (req, res) => {
  if (!lastSample.timestamp) {
    lastSample.timestamp = new Date().toISOString();
  }
  res.json(lastSample);
});

// 🔹 포트 설정 (Render용)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중 (포트: ${PORT})`);
});
