const express = require("express");
const app = express();

app.use(express.text());
app.use(express.json());

app.post("/chair", (req, res) => {
  console.log("📥 [POST] ESP에서 받은 데이터:", req.body);
  res.send("OK");
});

app.get("/chair", (req, res) => {
  const value = req.query.value;
  console.log("📥 [GET] ESP에서 받은 데이터:", value);
  res.send("OK");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중 (포트: ${PORT})`);
});
