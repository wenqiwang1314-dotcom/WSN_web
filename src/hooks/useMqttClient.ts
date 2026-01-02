// src/hooks/useMqttClient.ts
import { useEffect, useState } from "react";
import type { MqttClient } from "mqtt";
import { createMqttClient } from "../services/mqttClient";

export function useMqttClient() {
  const [isConnected, setIsConnected] = useState(false);
  const [client] = useState<MqttClient>(() => createMqttClient());

  useEffect(() => {
    client.on("connect", () => {
      console.log("[MQTT] connected");
      setIsConnected(true);
    });

    client.on("reconnect", () => {
      console.log("[MQTT] reconnecting...");
    });

    client.on("error", (err) => {
      console.error("[MQTT] error", err);
    });

    client.on("close", () => {
      console.log("[MQTT] connection closed");
      setIsConnected(false);
    });

    return () => {
      client.end(true);
    };
  }, [client]);

  return { client, isConnected };
}
