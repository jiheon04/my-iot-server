// server.js
const express = require("express");
const path = require("path");

const app = express();

app.use(express.text());
app.use(express.json());

// public 폴더 안의 HTML, JS, CSS 정적 제공
app.use(express.static(path.join(__dirname, "public")));

// 마지막 값 (간단 문자열용)
let lastValue = null;

// 대시보드에서 사용할 "최근 센서 샘플"
let lastSample = null;

// --------------------------------------
// 대시보드 메인 페이지
// --------------------------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "smart_chair_dashboard.html"));
});

// 최근 데이터 조회 API (대시보드가 여기로 요청)
app.get("/api/latest", (req, res) => {
  // 아직 아무 데이터도 안 들어왔으면 기본값 리턴
  if (!lastSample) {
    const now = new Date().toISOString();
    return res.json({
      timestamp: now,
      distanceCm: null,
      seatValue: null,
      ldrValue: null,
      postureState: 2,   // ABSENT
      warningCount: 0,
      badDurationSec: 0
    });
  }
  res.json(lastSample);
});

// --------------------------------------
// 헬퍼: value=0/1/2 같은 단순 값으로 샘플 만들기
// --------------------------------------
function makeSampleFromValue(value) {
  const nowIso = new Date().toISOString();
  const n = Number(value);
  const posture = isNaN(n) ? 2 : n; // 잘못된 값이면 ABSENT로

  return {
    timestamp: nowIso,
    distanceCm: null,     // 아직 안 쓰는 필드는 null
    seatValue: null,
    ldrValue: null,
    postureState: posture,
    warningCount: 0,
    badDurationSec: 0
  };
}

// --------------------------------------
// POST /chair  : ESP가 JSON이나 텍스트로 보낼 때
// --------------------------------------
app.post("/chair", (req, res) => {
  console.log("📥 [POST] ESP에서 받은 데이터:", req.body);
  lastValue = req.body;

  // 1) 단순 텍스트 "1", "2" 형식일 때
  if (typeof req.body === "string") {
    lastSample = makeSampleFromValue(req.body);
  }
  // 2) JSON 형식일 때 ({ distanceCm, seatValue, ... })
  else if (typeof req.body === "object" && req.body !== null) {
    const body = req.body;
    const nowIso = new Date().toISOString();
    lastSample = {
      timestamp: body.timestamp || nowIso,
      distanceCm: body.distanceCm ?? null,
      seatValue: body.seatValue ?? null,
      ldrValue: body.ldrValue ?? null,
      postureState: body.postureState ?? 0,
      warningCount: body.warningCount ?? 0,
      badDurationSec: body.badDurationSec ?? 0
    };
  }

  res.send("OK");
});

// --------------------------------------
// GET /chair?value=1  : 간단 테스트용
// --------------------------------------
app.get("/chair", (req, res) => {
  const value = req.query.value;
  console.log("📥 [GET] ESP에서 받은 데이터:", value);
  lastValue = value;
  lastSample = makeSampleFromValue(value);
  res.send("OK");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중 (포트: ${PORT})`);
});
