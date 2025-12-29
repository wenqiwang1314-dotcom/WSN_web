// src/hooks/useSensorData.ts
import { useEffect, useState, useRef, useCallback } from "react";
import type { MqttClient } from "mqtt";
import { useMqttClient } from "./useMqttClient";
import { MQTT_TOPIC_CC1310 } from "../services/mqttClient";

export interface NodeSensorSnapshot {
  nodeId: string;
  extAddr: string;
  ts: number;
  rssiDbm: number;
  temperatureC: number;
  humidityPct: number;
  vpdKpa: number;
  soilRaw: number;
  soilPct: number;
  lightRaw: number;
  lightLux: number;
}

function normalizeNodeId(nodeId: string): string {
  // 支持 "0x1", "0X01", "1", "01"
  const s = (nodeId || "").toLowerCase();
  const hex = s.startsWith("0x") ? s.slice(2) : s;
  const n = parseInt(hex, 16);
  if (!Number.isFinite(n)) return "unknown";
  return `0x${n.toString(16)}`; // 统一成 0x1 / 0xa / 0x10 这种格式
}


function zoneIdToNodeId(zoneId: string): string {
  // zoneId 是十进制字符串 "1"
  const n = parseInt(zoneId, 10);
  if (!Number.isFinite(n)) return "unknown";
  return `0x${n.toString(16)}`; // 返回 "0x1"
}



const API_BASE = "http://localhost:3000";

/** 计算 VPD (kPa)，简单公式：VPD = (1 - RH) * SVP */
function computeVpd(temperatureC: number, humidityPct: number): number {
  const rh = humidityPct / 100;
  const svp =
    0.6108 * Math.exp((17.27 * temperatureC) / (temperatureC + 237.3)); // Tetens
  const vpd = (1 - rh) * svp;
  return Number(vpd.toFixed(3));
}

function convertLightRawToLux(lightRaw: number): number {
  if (lightRaw <= 0) return 0;
  return Number(lightRaw.toFixed(0));
}

export function useSensorData() {
  const { client, isConnected } = useMqttClient();

  // 主键：ext_addr
  const [nodesByExt, setNodesByExt] = useState<Record<string, NodeSensorSnapshot>>({});
  // 索引：node_id -> ext_addr（用于 zone 页）
  const [extByNodeId, setExtByNodeId] = useState<Record<string, string>>({});
  // 注册表：ext_addr -> meta（name/type/caps...）
  const [registryByExt, setRegistryByExt] = useState<Record<string, any>>({});

  const didRestoreRef = useRef(false);

  const refreshRegistry = useCallback(() => {
    fetch(`${API_BASE}/api/nodes`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((reg) => setRegistryByExt(reg || {}))
      .catch(() => {});
  }, []);

  // 启动时加载 registry
  useEffect(() => {
    refreshRegistry();
  }, [refreshRegistry]);

  // 启动时从后台 /api/latest 恢复最近一次数据（CSV）
  useEffect(() => {
    if (didRestoreRef.current) return;
    didRestoreRef.current = true;

    fetch(`${API_BASE}/api/latest`)
      .then((res) => {
        if (!res.ok) throw new Error("No latest data");
        return res.json();
      })
      .then((json) => {
        // 如果 MQTT 已经写入了数据，就不要覆盖
        setNodesByExt((prev) => {
          if (Object.keys(prev).length > 0) return prev;

          const nodeId: string = json.node_id ?? "unknown";
          const extAddr: string = json.ext_addr ?? "";
          if (!extAddr) return prev;

          const snapshot: NodeSensorSnapshot = {
            nodeId,
            extAddr,
            ts: json.timestamp_ms ?? Date.now(),
            rssiDbm: json.rssi_dbm ?? 0,
            temperatureC: json.temp_c ?? NaN,
            humidityPct: json.humidity_pct ?? NaN,
            vpdKpa: json.vpd_kpa ?? NaN,
            soilRaw: json.soil_raw ?? 0,
            soilPct: json.soil_pct ?? 0,
            lightRaw: json.light_raw ?? 0,
            lightLux: json.light_lux ?? 0,
          };

          // 同步索引
          setExtByNodeId((idxPrev) => ({ ...idxPrev, [nodeId]: extAddr }));

          console.log("[RESTORE] latest from /api/latest", snapshot);
          return { ...prev, [extAddr]: snapshot };
        });
      })
      .catch((err) => {
        console.warn("[RESTORE] no latest data from /api/latest", err);
      });
  }, []);

  // MQTT 实时数据
  useEffect(() => {
    if (!client || !isConnected) return;

    const c: MqttClient = client;

    const handleMessage = (topic: string, payload: Buffer) => {
      if (topic !== MQTT_TOPIC_CC1310) return;

      try {
        const msg = JSON.parse(payload.toString()) as any;

        const nodeId: string = normalizeNodeId(msg.node_id ?? "unknown");

        const extAddr: string = msg.ext_addr ?? "";
        if (!extAddr) return;

        const ts: number = msg.ts ?? Date.now();
        const rssiDbm: number = msg.rssi_dbm ?? 0;
        const tempC: number = msg.sensors?.temperature_c ?? NaN;
        const humPct: number = msg.sensors?.humidity_pct ?? NaN;

        const soilRaw: number = msg.raw?.tempSensor?.objectTemp ?? 0;
        const soilPct: number = Number((soilRaw / 100).toFixed(1));

        const lightRaw: number = msg.raw?.lightSensor?.rawData ?? 0;
        const lightLux: number = convertLightRawToLux(lightRaw);

        if (Number.isNaN(tempC) || Number.isNaN(humPct)) {
          console.warn("[MQTT] invalid sensor data", msg);
          return;
        }

        const vpdKpa = computeVpd(tempC, humPct);

        // 维护索引：node_id -> ext_addr
        setExtByNodeId((prev) => ({ ...prev, [nodeId]: extAddr }));

        // 写入快照：ext_addr 为主键
        setNodesByExt((prev) => ({
          ...prev,
          [extAddr]: {
            nodeId,
            extAddr,
            ts,
            rssiDbm,
            temperatureC: tempC,
            humidityPct: humPct,
            vpdKpa,
            soilRaw,
            soilPct,
            lightRaw,
            lightLux,
          },
        }));
      } catch (err) {
        console.error("[MQTT] failed to parse payload", err);
      }
    };

    c.subscribe(MQTT_TOPIC_CC1310, { qos: 0 }, (err) => {
      if (err) console.error("[MQTT] subscribe error", err);
      else console.log("[MQTT] subscribed to", MQTT_TOPIC_CC1310);
    });

    c.on("message", handleMessage);

    return () => {
      c.off("message", handleMessage);
      c.unsubscribe(MQTT_TOPIC_CC1310);
    };
  }, [client, isConnected]);

  /** zoneId="1" -> node_id="0x1" -> ext_addr -> snapshot */
  const getNodeByZoneId = (zoneId: string | undefined) => {
    if (!zoneId) return undefined;
    const nodeKey = zoneIdToNodeId(zoneId);
    const ext = extByNodeId[nodeKey];
    if (!ext) return undefined;
    return nodesByExt[ext];
  };

  const nodeList = Object.values(nodesByExt).sort((a, b) => {
    const ai = parseInt(a.nodeId.replace(/^0x/, ""), 16) || 0;
    const bi = parseInt(b.nodeId.replace(/^0x/, ""), 16) || 0;
    return ai - bi;
  });

  return { nodesByExt, nodeList, registryByExt, refreshRegistry, getNodeByZoneId, isConnected };
}
