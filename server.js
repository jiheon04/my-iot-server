const express = require("express");
const app = express();

app.use(express.text());
app.use(express.json());

// ✅ 마지막으로 받은 값 저장용 변수
let lastValue = null;

// 메인 페이지: 상태 확인용
app.get("/", (req, res) => {
  res.send(`
    <h1>SmartChair 서버</h1>
    <p>마지막으로 받은 값: <b>${lastValue === null ? "아직 없음" : lastValue}</b></p>
    <p>수신 엔드포인트: <code>/chair</code> (GET, POST)</p>
  `);
});

// POST /chair  (ESP가 본문으로 보낼 때)
app.post("/chair", (req, res) => {
  console.log("📥 [POST] ESP에서 받은 데이터:", req.body);
  lastValue = req.body;   // ✅ 값 저장
  res.send("OK");
});

// GET /chair?value=123  (쿼리스트링 방식)
app.get("/chair", (req, res) => {
  const value = req.query.value;
  console.log("📥 [GET] ESP에서 받은 데이터:", value);
  lastValue = value;      // ✅ 값 저장
  res.send("OK");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중 (포트: ${PORT})`);
});
