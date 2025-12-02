// iot_server.cjs
// 功能：
// 1. 订阅 MQTT -> 每天一个 CSV 写入 data_logs/
// 2. 维护内存 latest
// 3. 提供 HTTP 接口 /api/latest 返回最近一次数据

const mqtt = require("mqtt");
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");   // ⭐ 新增


const MQTT_URL = "ws://120.26.118.242:8083/mqtt";
const TOPIC = "CC1310/test";
const DATA_DIR = path.join(__dirname, "data_logs");

// =========== 工具函数 ===========
function getDateStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function computeVpd(tempC, humidityPct) {
  const rh = humidityPct / 100;
  const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  return Number(((1 - rh) * svp).toFixed(3));
}


function convertLightRawToLux(raw) {
  if (!raw || raw <= 0) return 0;
  return Number(raw.toFixed(0));
}

// 确保目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log("📂 创建数据目录:", DATA_DIR);
}

let currentDate = null;
let currentFilePath = null;

// 当前最近一次数据（内存缓存）
let latest = null;

// 找到今天的 CSV 文件（没有则创建+写表头）
function ensureCurrentCsvFile() {
  const today = getDateStr();
  if (today === currentDate && currentFilePath) {
    return currentFilePath;
  }

  currentDate = today;
  currentFilePath = path.join(DATA_DIR, `cc1310_${today}.csv`);

  if (!fs.existsSync(currentFilePath)) {
    const header =
      "timestamp_iso,timestamp_ms,node_id,ext_addr,temp_c,humidity_pct," +
      "soil_raw,soil_pct,light_raw,light_lux,vpd_kpa,rssi_dbm\n";
    fs.writeFileSync(currentFilePath, header);
    console.log("📄 创建新的 CSV 文件:", currentFilePath);
  } else {
    console.log("📄 继续写入已有 CSV 文件:", currentFilePath);
  }
  return currentFilePath;
}

// 启动时从 CSV 恢复“最近一次数据”
function restoreLatestFromCsv() {
  try {
    if (!fs.existsSync(DATA_DIR)) return;

    const files = fs
      .readdirSync(DATA_DIR)
      .filter((f) => f.endsWith(".csv"))
      .sort(); // 文件名中日期递增排序

    if (files.length === 0) return;

    const lastFile = path.join(DATA_DIR, files[files.length - 1]);
    const content = fs.readFileSync(lastFile, "utf8").trim();
    const lines = content.split("\n");
    if (lines.length <= 1) return; // 只有表头

    const lastLine = lines[lines.length - 1];
    const [
      tsIso,
      tsMs,
      nodeId,
      extAddr,
      tempC,
      humidity,
      soilRaw,
      soilPct,
      lightRaw,
      lightLux,
      vpd,
      rssi,
    ] = lastLine.split(",");

    latest = {
      timestamp_iso: tsIso,
      timestamp_ms: Number(tsMs),
      node_id: nodeId,
      ext_addr: extAddr,
      temp_c: Number(tempC),
      humidity_pct: Number(humidity),
      soil_raw: Number(soilRaw),
      soil_pct: Number(soilPct),
      light_raw: Number(lightRaw),
      light_lux: Number(lightLux),
      vpd_kpa: Number(vpd),
      rssi_dbm: Number(rssi),
    };

    console.log("♻️ 从 CSV 恢复最近一次数据:", latest);
  } catch (err) {
    console.error("⚠️ 恢复 latest 失败:", err);
  }
}

// 先尝试恢复
restoreLatestFromCsv();

// =========== MQTT 部分 ===========
const client = mqtt.connect(MQTT_URL);

client.on("connect", () => {
  console.log("🚀 MQTT Connected:", MQTT_URL);
  client.subscribe(TOPIC, (err) => {
    if (err) console.error("❌ Subscribe error:", err);
    else console.log("📡 Subscribed to", TOPIC);
  });
});

client.on("message", (topic, message) => {
  try {
    const json = JSON.parse(message.toString());

    const tsMs = json.ts;
    const tsIso = new Date(tsMs).toISOString();
    const nodeId = json.node_id;
    const extAddr = json.ext_addr;
    const tempC = json.sensors.temperature_c;
    const humidity = json.sensors.humidity_pct;
    const soilRaw = json.raw.tempSensor.objectTemp;   // e.g., 8429
    const soilPct = Number((soilRaw / 100).toFixed(1));   // → 84.3%
    const lightRaw = json.raw?.lightSensor?.rawData ?? 0;
    const lightLux = convertLightRawToLux(lightRaw);
    const vpd = computeVpd(tempC, humidity);
    const rssi = json.rssi_dbm;

    // 更新最新内存缓存
    latest = {
      timestamp_iso: tsIso,
      timestamp_ms: tsMs,
      node_id: nodeId,
      ext_addr: extAddr,
      temp_c: tempC,
      humidity_pct: humidity,
      soil_raw: soilRaw,
      soil_pct: soilPct,
      light_raw: lightRaw,
      light_lux: lightLux,
      vpd_kpa: vpd,
      rssi_dbm: rssi,
    };

    // 写 CSV
    const filePath = ensureCurrentCsvFile();
    const line = `${tsIso},${tsMs},${nodeId},${extAddr},${tempC},${humidity},${soilRaw},${soilPct},${lightRaw},${lightLux},${vpd},${rssi}\n`;
    fs.appendFile(filePath, line, (err) => {
      if (err) console.error("⚠️ CSV 写入失败:", err);
    });

    console.log("📝 写入 CSV & 更新 latest:", line.trim());
  } catch (err) {
    console.error("⚠️ JSON 解析失败:", err);
  }
});

// =========== HTTP API 部分 ===========
const app = express();
const PORT = 5000; // 你可以改成 3001 / 8080 等

app.use(cors());  // ⭐ 允许跨域访问（5173 -> 5000）

app.get("/api/latest", (req, res) => {
  if (!latest) {
    return res.status(404).json({ error: "No data yet" });
  }
  res.json(latest);
});

app.listen(PORT, () => {
  console.log(`🌐 HTTP API listening on http://localhost:${PORT}`);
});

process.on("SIGINT", () => {
  console.log("\n👋 收到 Ctrl+C，关闭 MQTT & 退出...");
  client.end(true, () => {
    process.exit(0);
  });
});


// 简易用户数据库（可改为文件/数据库）
// 先内置一个测试账号：admin / admin123
let users = {
  admin: { password: "admin123" },
};


// 注册
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;

    if (users[username]) {
        return res.status(400).json({ error: "User already exists" });
    }

    users[username] = { password };
    return res.json({ success: true });
});

// 登录
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!users[username] || users[username].password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    // 简易 token
    const token = Buffer.from(`${username}:${Date.now()}`).toString("base64");

    return res.json({ token, username });
});



