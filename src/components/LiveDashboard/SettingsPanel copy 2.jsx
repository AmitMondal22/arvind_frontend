import React, { useState, useEffect, useRef } from "react";
import {
  Button,
  Input,
  Card,
  Typography,
  Space,
  message,
  Row,
  Col,
} from "antd";
import {
  DatabaseOutlined,
  DollarOutlined,
  DashboardOutlined,
  PoweroffOutlined,
  PlayCircleOutlined,
  SyncOutlined,
  StopOutlined,
  CloudDownloadOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  LockOutlined,
} from "@ant-design/icons";
import useDeviceApi from "../../api/useDeviceApi";

const { Title, Text } = Typography;

// Buttons that do NOT require user input
const simpleButtons = [
  { name: "VT", label: "Volume (L)", icon: <DatabaseOutlined /> },
  { name: "AT", label: "Amount (₹)", icon: <DollarOutlined /> },
  { name: "ST", label: "Status", icon: <DashboardOutlined /> },
  { name: "DM", label: "Disable Manual", icon: <PoweroffOutlined /> },
  { name: "AM", label: "Enable Manual", icon: <PlayCircleOutlined /> },
  { name: "AR", label: "Activate Auto", icon: <SyncOutlined /> },
  { name: "DR", label: "Deactivate Auto", icon: <StopOutlined /> },
  { name: "VR", label: "Firmware", icon: <CloudDownloadOutlined /> },
  // { name: "SL", label: "Preset Volume", icon: <DatabaseOutlined /> },
  // { name: "SR", label: "Preset Amount", icon: <DollarOutlined /> },
  { name: "LC", label: "Get GPS", icon: <CloudDownloadOutlined /> },
  { name: "LT", label: "Last Sale", icon: <DashboardOutlined /> },
  { name: "RT", label: "Get Rate", icon: <SettingOutlined /> },
  { name: "TP", label: "Immediate Stop", icon: <StopOutlined /> },
];

// Buttons that REQUIRE user input
const inputButtons = [
  { name: "SK", label: "Set Date & Time", icon: <ClockCircleOutlined /> },
  { name: "SM1", label: "Set SMS 1", icon: <PhoneOutlined /> },
  { name: "SM2", label: "Set SMS 2", icon: <PhoneOutlined /> },
  { name: "SV", label: "Set Vol. Totalizer", icon: <DatabaseOutlined /> },
  { name: "SA", label: "Set Amt. Totalizer", icon: <DollarOutlined /> },
  { name: "SP", label: "Set Passcode", icon: <LockOutlined /> },
];

const SettingsPanel = ({ device, activeTab }) => {
  const [response, setResponse] = useState("");
  const [customValue, setCustomValue] = useState("");
  const { apiDeviceMqttSend } = useDeviceApi();
  const socketRef = useRef(null);

  // WebSocket Setup
  useEffect(() => {
    if (!device?.device_number) return;

    if (socketRef.current) socketRef.current.close();

    const socket = new WebSocket(`ws://localhost:8026/ws/device/CMSG${device.device_number}`);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      console.log("WebSocket message:", event.data);
      setResponse(event.data);
    };

    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, [device?.device_number]);

  const sendCommand = async (button_name, value = "") => {
    const payload = {
      device_id: device?.id || null,
      device_number: device?.device_number || null,
      button_name,
      value,
    };

    try {
      console.log("Sending:", payload);
      const res = await apiDeviceMqttSend(payload);
      if (res.status) {
        setResponse(`Command ${button_name} sent${value ? ` with value: ${value}` : ""}`);
      } else {
        console.error("Error response:", res);
        message.error("Command failed");
      }
    } catch (err) {
      console.error(err);
      message.error("Failed to send command");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <Title level={3}>Dispensing Unit Control Panel</Title>

      <Row gutter={[16, 16]}>
        {simpleButtons.map((btn) => (
          <Col xs={12} sm={8} md={6} key={btn.name}>
            <Button icon={btn.icon} block onClick={() => sendCommand(btn.name)}>
              {btn.label}
            </Button>
          </Col>
        ))}
      </Row>

      <Card title="Set Fuel Rate" style={{ marginTop: 20 }}>
        <Space>
          <Input
            placeholder="Enter rate e.g. 88.99"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            style={{ width: 200 }}
          />
          <Button
            type="primary"
            icon={<SettingOutlined />}
            onClick={() => sendCommand("SE", customValue)}
          >
            Set Rate
          </Button>
        </Space>
      </Card>

      <Card title="Advanced Settings" style={{ marginTop: 20 }}>
        <Space direction="vertical">
          <Input
            placeholder="Enter value (e.g., date/time, phone, passcode)"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            style={{ width: 300 }}
          />
          <Row gutter={[8, 8]}>
            {inputButtons.map((btn) => (
              <Col key={btn.name}>
                <Button icon={btn.icon} onClick={() => sendCommand(btn.name, customValue)}>
                  {btn.label}
                </Button>
              </Col>
            ))}
          </Row>
        </Space>
      </Card>

      <Card title="Device Response" style={{ marginTop: 20 }}>
        <Text code>{response}</Text>
      </Card>
    </div>
  );
};

export default SettingsPanel;
