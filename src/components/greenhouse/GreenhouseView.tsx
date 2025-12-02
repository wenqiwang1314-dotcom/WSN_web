import React from "react";
import { Link } from "react-router-dom";
import SensorTag from "./SensorTag";
import type { NodeSensorSnapshot } from "../../hooks/useSensorData";

interface GreenhouseViewProps {
  nodes: NodeSensorSnapshot[];
}

const GreenhouseView: React.FC<GreenhouseViewProps> = ({ nodes }) => {
  // 简单把前 3 个节点放在 3 个位置
  const n1 = nodes[0];
  const n2 = nodes[1];
  const n3 = nodes[2];

  const renderTag = (
    node: NodeSensorSnapshot | undefined,
    position: "top-left" | "top-right" | "bottom-left",
    fallbackLabel: string
  ) => {
    if (!node) {
      return (
        <SensorTag
          label={fallbackLabel}
          value="--"
          unit=""
          position={position}
        />
      );
    }

    // 从 nodeId 提取 zone id（"0x1" -> "1"）
    const zoneId = node.nodeId.startsWith("0x")
      ? node.nodeId.slice(2)
      : node.nodeId;

    return (
      <Link to={`/zones/${zoneId}`} className="sensor-tag-link">
        <SensorTag
          label={`Node ${node.nodeId}`}
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
