import React, { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import SensorTag from "./SensorTag";
import type { NodeSensorSnapshot } from "../../hooks/useSensorData";

interface GreenhouseViewProps {
  nodes: NodeSensorSnapshot[];
}

type NodeType = "microclimate" | "soil" | "light" | "mixed" | "unknown";

type NodeMeta = {
  extAddr: string;
  nodeId: string;
  name: string;
  type: NodeType;
  firstSeen: number;
  lastSeen: number;
};

const LS_KEY = "cc1310_node_registry_v1";

function loadRegistry(): Record<string, NodeMeta> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveRegistry(reg: Record<string, NodeMeta>) {
  localStorage.setItem(LS_KEY, JSON.stringify(reg));
}

function inferType(node: NodeSensorSnapshot): NodeType {
  const hasT = Number.isFinite(node.temperatureC);
  const hasH = Number.isFinite(node.humidityPct);
  const hasS = (node.soilRaw ?? 0) > 0;
  const hasL = (node.lightRaw ?? 0) > 0;

  if ((hasT || hasH) && !(hasS || hasL)) return "microclimate";
  if (hasS && !(hasT || hasH || hasL)) return "soil";
  if (hasL && !(hasT || hasH || hasS)) return "light";
  if (hasT || hasH || hasS || hasL) return "mixed";
  return "unknown";
}

function defaultName(nodeId: string, type: NodeType) {
  // 你可以以后在 Settings 页面里改名；这里是自动默认命名
  const short = nodeId?.startsWith("0x") ? nodeId.slice(2) : nodeId;
  const prefix =
    type === "microclimate" ? "Microclimate" :
    type === "soil" ? "Soil" :
    type === "light" ? "Light" :
    type === "mixed" ? "Node" : "Node";
  return `${prefix}-${short || "X"}`;
}

const GreenhouseView: React.FC<GreenhouseViewProps> = ({ nodes }) => {
  const registry = useMemo(() => {
    const stored = loadRegistry();
    if (!nodes || nodes.length === 0) return stored;

    const next = { ...stored };

    for (const n of nodes) {
      if (!n.extAddr) continue;
      const ext = n.extAddr;
      const type = inferType(n);
      const seenAt = n.ts;

      const existed = next[ext];
      next[ext] = {
        extAddr: ext,
        nodeId: n.nodeId,
        name: existed?.name ?? defaultName(n.nodeId, type),
        type: existed?.type ?? type,
        firstSeen: existed?.firstSeen ?? seenAt,
        lastSeen: seenAt,
      };
    }

    return next;
  }, [nodes]);

  useEffect(() => {
    saveRegistry(registry);
  }, [registry]);

  // 稳定排序（按 nodeId）
  const sorted = useMemo(() => {
    return [...nodes].sort((a, b) => {
      const ai = parseInt(a.nodeId.replace(/^0x/, ""), 16) || 0;
      const bi = parseInt(b.nodeId.replace(/^0x/, ""), 16) || 0;
      return ai - bi;
    });
  }, [nodes]);

  // 仍然用你原逻辑：前三个位置显示三个节点
  const n1 = sorted[0];
  const n2 = sorted[1];
  const n3 = sorted[2];

  const renderTag = (
    node: NodeSensorSnapshot | undefined,
    position: "top-left" | "top-right" | "bottom-left",
    fallbackLabel: string
  ) => {
    if (!node) {
      return (
        <SensorTag label={fallbackLabel} value="--" unit="" position={position} />
      );
    }

    const zoneId = String(parseInt(node.nodeId.replace(/^0x/i, ""), 16));

    const meta = node.extAddr ? registry[node.extAddr] : undefined;
    const label = meta?.name ?? `Node ${node.nodeId}`;
    const type = meta?.type ?? "unknown";

    return (
      <Link to={`/zones/${zoneId}`} className="sensor-tag-link">
        <SensorTag
          label={`${label} (${type})`}
          value={node.temperatureC.toFixed(1)}
          unit="°C"
          position={position}
        />
      </Link>
    );
  };

  return (
    <div className="greenhouse-card">
      <div className="greenhouse-header">
        <div className="greenhouse-title">Greenhouse Digital Twin</div>
        <div className="greenhouse-subtitle">
          {nodes.length} Node(s) · CC1310 Sub-1GHz
        </div>
      </div>

      <div className="greenhouse-body">
        <div className="greenhouse-outline">
          <div className="greenhouse-inner" />
        </div>

        {renderTag(n1, "top-left", "Node A")}
        {renderTag(n2, "top-right", "Node B")}
        {renderTag(n3, "bottom-left", "Node C")}
      </div>
    </div>
  );
};

export default GreenhouseView;
