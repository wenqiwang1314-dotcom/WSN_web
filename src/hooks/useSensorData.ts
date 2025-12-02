// src/hooks/useSensorData.ts
import { useEffect, useState, useRef } from "react";

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


/** 计算 VPD (kPa)，简单公式：VPD = (1 - RH) * SVP */
function computeVpd(temperatureC: number, humidityPct: number): number {
  const rh = humidityPct / 100;
  const svp =
    0.6108 *
    Math.exp((17.27 * temperatureC) / (temperatureC + 237.3)); // Tetens formula
  const vpd = (1 - rh) * svp;
  return Number(vpd.toFixed(3));
}

// soilRaw: 0–4095 -> 0–100%（简单线性，后续可以用实验拟合）
function convertSoilRawToPct(soilRaw: number): number {
  if (soilRaw <= 0) return 0;
  if (soilRaw >= 4095) return 100;
  return Number(((soilRaw / 4095) * 100).toFixed(1));
}

// lightRaw -> lux（这里先按1:1或者你后面根据BH1750等公式改）
function convertLightRawToLux(lightRaw: number): number {
  if (lightRaw <= 0) return 0;
  return Number(lightRaw.toFixed(0));
}



export function useSensorData() {
  const { client, isConnected } = useMqttClient();
  const [nodes, setNodes] = useState<Record<string, NodeSensorSnapshot>>({});

  const didRestoreRef = useRef(false);

  // ⭐ 启动时从后台 /api/latest 恢复最近一次数据（CSV）
  useEffect(() => {
    if (didRestoreRef.current) return;
    didRestoreRef.current = true;

    fetch("http://localhost:5000/api/latest")
      .then((res) => {
        if (!res.ok) {
          throw new Error("No latest data");
        }
        return res.json();
      })
      .then((json) => {
        // 如果 MQTT 已经把数据写进来了，就不用覆盖
        setNodes((prev) => {
          if (Object.keys(prev).length > 0) {
            return prev;
          }

          const nodeId: string = json.node_id ?? "unknown";

          const snapshot: NodeSensorSnapshot = {
            nodeId,
            extAddr: json.ext_addr ?? "",
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

          console.log("[RESTORE] latest from /api/latest", snapshot);
          return {
            ...prev,
            [nodeId]: snapshot,
          };
        });
      })
      .catch((err) => {
        console.warn("[RESTORE] no latest data from /api/latest", err);
      });
  }, []);


  useEffect(() => {
    if (!client || !isConnected) return;

    const c: MqttClient = client;

    const handleMessage = (topic: string, payload: Buffer) => {
      if (topic !== MQTT_TOPIC_CC1310) return;

      try {
        const text = payload.toString();
        const msg = JSON.parse(text) as any;

        const nodeId: string = msg.node_id ?? "unknown";
        const extAddr: string = msg.ext_addr ?? "";
        const ts: number = msg.ts ?? Date.now();
        const rssiDbm: number = msg.rssi_dbm ?? 0;
        const tempC: number = msg.sensors?.temperature_c ?? NaN;
        const humPct: number = msg.sensors?.humidity_pct ?? NaN;

        // 你给的结构里：
        // raw.tempSensor.objectTemp = 土壤湿度 ADC
        // raw.lightSensor.rawData    = 光照
        const soilRaw = json.raw.tempSensor.objectTemp;   // e.g., 8429
        const soilPct = Number((soilRaw / 100).toFixed(1));   // → 84.3%

        const lightRaw: number = msg.raw?.lightSensor?.rawData ?? 0;

        if (Number.isNaN(tempC) || Number.isNaN(humPct)) {
          console.warn("[MQTT] invalid sensor data", msg);
          return;
        }

        const vpdKpa = computeVpd(tempC, humPct);
        const lightLux = convertLightRawToLux(lightRaw);

        setNodes((prev) => ({
          ...prev,
          [nodeId]: {
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
      if (err) {
        console.error("[MQTT] subscribe error", err);
      } else {
        console.log("[MQTT] subscribed to", MQTT_TOPIC_CC1310);
      }
    });

    c.on("message", handleMessage);

    return () => {
      c.off("message", handleMessage);
      c.unsubscribe(MQTT_TOPIC_CC1310);
    };
  }, [client, isConnected]);


  /** 从 /zones/:id 这样的 zoneId 推出对应 node（假设 node_id = "0x1" 对应 zoneId="1"） */
  const getNodeByZoneId = (zoneId: string | undefined) => {
    if (!zoneId) return undefined;
    const nodeKey = `0x${zoneId}`;
    return nodes[nodeKey];
  };

  return { nodes, getNodeByZoneId, isConnected };
}
