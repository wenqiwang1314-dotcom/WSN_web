// iot_server.cjs
//---------------------------------------------------
//  MQTT → CSV → latest
//  HTTP API (latest/login/register)
//  单一 Express 实例监听 3000 端口
//---------------------------------------------------

const mqtt = require("mqtt");
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");

const MQTT_URL = "ws://120.26.118.242:8083/mqtt";
const TOPIC = "CC1310/test";
const DATA_DIR = path.join(__dirname, "data_logs");



const REGISTRY_PATH = path.join(DATA_DIR, "nodes_registry.json");

function loadRegistry() {
  try {
    if (!fs.existsSync(REGISTRY_PATH)) return {};
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  } catch (e) {
    console.error("⚠️ loadRegistry failed:", e);
    return {};
  }
}

function saveRegistry(reg) {
  try {
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(reg, null, 2));
  } catch (e) {
    console.error("⚠️ saveRegistry failed:", e);
  }
}

function inferCapsAndType(json) {
  const caps = [];
  if (typeof json?.sensors?.temperature_c === "number") caps.push("temperature_c");
  if (typeof json?.sensors?.humidity_pct === "number") caps.push("humidity_pct");
  if (json?.raw?.lightSensor?.rawData != null) caps.push("light_raw");
  if (json?.raw?.tempSensor?.objectTemp != null) caps.push("soil_raw"); // 你当前用 objectTemp 当 soilRaw

  const hasT = caps.includes("temperature_c");
  const hasH = caps.includes("humidity_pct");
  const hasL = caps.includes("light_raw");
  const hasS = caps.includes("soil_raw");

  let type = "unknown";
  if ((hasT || hasH) && !(hasL || hasS)) type = "microclimate";
  else if (hasS && !(hasT || hasH || hasL)) type = "soil";
  else if (hasL && !(hasT || hasH || hasS)) type = "light";
  else if (caps.length > 0) type = "mixed";

  return { caps, type };
}

let registry = loadRegistry();

function upsertRegistryFromMsg(json) {
  const ts = json.ts || Date.now();
  const ext = json.ext_addr || "";
  const nodeId = json.node_id || "unknown";
  if (!ext) return;

  const { caps, type } = inferCapsAndType(json);
  const prev = registry[ext];

  // 自动默认命名策略：按 node_id
  const defaultName = `Node ${nodeId}`;

  registry[ext] = {
    ext_addr: ext,
    node_id: nodeId,
    name: prev?.name ?? defaultName,
    type: prev?.type ?? type,
    capabilities: Array.from(new Set([...(prev?.capabilities || []), ...caps])),
    first_seen: prev?.first_seen ?? ts,
    last_seen: ts,
    last_rssi_dbm: json.rssi_dbm ?? prev?.last_rssi_dbm ?? 0,
  };

  saveRegistry(registry);

  // 可选：发布 retained meta（前端刷新即可恢复）
  try {
    client.publish(
      `CC1310/nodes/${ext}/meta`,
      JSON.stringify(registry[ext]),
      { qos: 0, retain: true }
    );
  } catch (e) {
    // ignore
  }
}




//---------------- 工具函数 ----------------
function getDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
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

//---------------- CSV 文件确保存在 ----------------
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log("📂 创建数据目录:", DATA_DIR);
}

let currentDate = null;
let currentFilePath = null;
let latest = null;

function ensureCurrentCsvFile() {
  const today = getDateStr();
  if (today === currentDate && currentFilePath) return currentFilePath;

  currentDate = today;
  currentFilePath = path.join(DATA_DIR, `cc1310_${today}.csv`);

  if (!fs.existsSync(currentFilePath)) {
    const header =
      "timestamp_iso,timestamp_ms,node_id,ext_addr,temp_c,humidity_pct," +
      "soil_raw,soil_pct,light_raw,light_lux,vpd_kpa,rssi_dbm\n";
    fs.writeFileSync(currentFilePath, header);
    console.log("📄 创建新的 CSV:", currentFilePath);
  }

  return currentFilePath;
}

//---------------- 恢复 latest ----------------
function restoreLatestFromCsv() {
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".csv")).sort();
    if (files.length === 0) return;

    const lastFile = path.join(DATA_DIR, files[files.length - 1]);
    const content = fs.readFileSync(lastFile, "utf8").trim();
    const lines = content.split("\n");
    if (lines.length <= 1) return;

    const lastLine = lines[lines.length - 1];
    const [
      tsIso, tsMs, nodeId, extAddr, tempC, humidity, soilRaw, soilPct,
      lightRaw, lightLux, vpd, rssi
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

    console.log("♻️ 恢复 latest:", latest);
  } catch (err) {
    console.error("⚠️ 恢复 latest 失败:", err);
  }
}
restoreLatestFromCsv();

//---------------- MQTT 部分 ----------------
const client = mqtt.connect(MQTT_URL);

client.on("connect", () => {
  console.log("🚀 MQTT Connected");
  client.subscribe(TOPIC);
});

client.on("message", (topic, message) => {
  try {
    const json = JSON.parse(message.toString());

    const tsMs = json.ts;
    const tsIso = new Date(tsMs).toISOString();

    const tempC = json.sensors.temperature_c;
    const humidity = json.sensors.humidity_pct;
    const soilRaw = json.raw.tempSensor.objectTemp;
    const soilPct = Number((soilRaw / 100).toFixed(1));
    const lightRaw = json.raw?.lightSensor?.rawData ?? 0;
    const lightLux = convertLightRawToLux(lightRaw);
    const vpd = computeVpd(tempC, humidity);

    upsertRegistryFromMsg(json);


    latest = {
      timestamp_iso: tsIso,
      timestamp_ms: tsMs,
      node_id: json.node_id,
      ext_addr: json.ext_addr,
      temp_c: tempC,
      humidity_pct: humidity,
      soil_raw: soilRaw,
      soil_pct: soilPct,
      light_raw: lightRaw,
      light_lux: lightLux,
      vpd_kpa: vpd,
      rssi_dbm: json.rssi_dbm,
    };

    const filePath = ensureCurrentCsvFile();
    const line =
      `${tsIso},${tsMs},${json.node_id},${json.ext_addr},${tempC},${humidity},${soilRaw},${soilPct},${lightRaw},${lightLux},${vpd},${json.rssi_dbm}\n`;

    fs.appendFile(filePath, line, err => err && console.error("CSV 写入失败:", err));

  } catch (err) {
    console.error("⚠️ MQTT JSON 解析失败:", err);
  }
});

//---------------- Express API ----------------
const app = express();
app.use(cors());
app.use(express.json());

// ① 获取最新数据
app.get("/api/latest", (req, res) => {
  if (!latest) return res.status(404).json({ error: "No data yet" });
  res.json(latest);
});

// ② 用户数据库
let users = {
  admin: { password: "admin123" },
};

// 注册
app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  if (users[username]) return res.status(400).json({ error: "User exists" });
  users[username] = { password };
  res.json({ success: true });
});

// 登录
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (!users[username] || users[username].password !== password)
    return res.status(401).json({ error: "Invalid credentials" });

  const token = Buffer.from(`${username}:${Date.now()}`).toString("base64");
  res.json({ token, username });
});

//---------------- 统一监听端口（关键）----------------
app.listen(3000, () => {
  console.log("🌐 API listening on http://localhost:3000");
});


// ③ 获取节点注册表
app.get("/api/nodes", (req, res) => {
  res.json(registry);
});

// ④ 更新节点 name/type（用于 Settings 页面）
app.put("/api/nodes/:ext", (req, res) => {
  const ext = req.params.ext;
  const { name, type } = req.body || {};
  if (!registry[ext]) return res.status(404).json({ error: "Node not found" });

  if (typeof name === "string" && name.trim()) registry[ext].name = name.trim();
  if (typeof type === "string" && type.trim()) registry[ext].type = type.trim();

  saveRegistry(registry);

  // 同步 retained meta
  try {
    client.publish(
      `CC1310/nodes/${ext}/meta`,
      JSON.stringify(registry[ext]),
      { qos: 0, retain: true }
    );
  } catch (e) {}

  res.json(registry[ext]);
});

