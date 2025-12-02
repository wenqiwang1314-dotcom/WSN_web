// src/services/mqttClient.ts

import mqtt, { type MqttClient } from "mqtt";

const MQTT_URL = "ws://120.26.118.242:8083/mqtt";
export const MQTT_TOPIC_CC1310 = "CC1310/test";

export function createMqttClient(): MqttClient {
  const clientId = `WebClient-${Math.random().toString(16).slice(2, 10)}`;

  // 注意：这里用的是 mqtt.connect，而不是直接 connect
  const client = mqtt.connect(MQTT_URL, {
    clientId,
    clean: true,
    reconnectPeriod: 2000,
  });

  return client;
}
