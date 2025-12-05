// server.js
const express = require("express");
const path = require("path");

const app = express();

app.use(express.text());
app.use(express.json());

// ✅ public 폴더에 있는 HTML, JS, CSS 등을 그대로 서비스
app.use(express.static(path.join(__dirname, "public")));

// ✅ 마지막으로 받은 값 저장용 변수 (IoT에서 들어온 값)
let lastValue = null;

// ✅ 메인 페이지: 대시보드 HTML 보여주기
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "smart_chair_dashboard.html"));
});

// (선택) 단순 상태 확인용 JSON 엔드포인트
app.get("/api/last", (req, res) => {
  res.json({ lastValue });
});

// ✅ POST /chair  (ESP가 본문으로 보낼 때)
app.post("/chair", (req, res) => {
  console.log("📥 [POST] ESP에서 받은 데이터:", req.body);
  lastValue = req.body;   // 마지막 값 저장
  res.send("OK");
});

// ✅ GET /chair?value=123  (쿼리스트링 방식)
app.get("/chair", (req, res) => {
  const value = req.query.value;
  console.log("📥 [GET] ESP에서 받은 데이터:", value);
  lastValue = value;      // 마지막 값 저장
  res.send("OK");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중 (포트: ${PORT})`);
});
