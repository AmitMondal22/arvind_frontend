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
  Descriptions,
  Divider,
  Badge,
  Tooltip,
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
  ClearOutlined,
  ThunderboltOutlined,
  ApiOutlined,
  EnvironmentOutlined,
  HistoryOutlined,
  PercentageOutlined,
  PauseCircleOutlined,
} from "@ant-design/icons";
import useDeviceApi from "../../api/useDeviceApi";
import { address } from "../../routes/ApiRoute";

const { Title, Text, Paragraph } = Typography;

const simpleButtons = [
  { 
    name: "VT", 
    label: "Volume Totalizer", 
    description: "Get current volume in liters",
    icon: <DatabaseOutlined />, 
    color: "#1890ff",
    category: "info"
  },
  { 
    name: "AT", 
    label: "Amount Totalizer", 
    description: "Get current amount in rupees",
    icon: <DollarOutlined />, 
    color: "#52c41a",
    category: "info"
  },
  { 
    name: "ST", 
    label: "Status", 
    description: "Get device status",
    icon: <DashboardOutlined />, 
    color: "#722ed1",
    category: "info"
  },
  { 
    name: "LC", 
    label: "GPS Location", 
    description: "Get current GPS coordinates",
    icon: <EnvironmentOutlined />, 
    color: "#13c2c2",
    category: "info"
  },
  { 
    name: "LT", 
    label: "Last Sale", 
    description: "Get last transaction details",
    icon: <HistoryOutlined />, 
    color: "#eb2f96",
    category: "info"
  },
  { 
    name: "RT", 
    label: "Current Rate", 
    description: "Get current fuel rate",
    icon: <PercentageOutlined />, 
    color: "#fa8c16",
    category: "info"
  },
  { 
    name: "VR", 
    label: "Firmware", 
    description: "Get firmware version",
    icon: <CloudDownloadOutlined />, 
    color: "#faad14",
    category: "info"
  },
  { 
    name: "DM", 
    label: "Lock", 
    description: "Disable manual operation",
    icon: <PoweroffOutlined />, 
    color: "#ff4d4f",
    category: "control"
  },
  { 
    name: "AM", 
    label: "Unlock", 
    description: "Enable manual operation",
    icon: <PlayCircleOutlined />, 
    color: "#52c41a",
    category: "control"
  },
  { 
    name: "AR", 
    label: "Live Dispensing", 
    description: "Activate automatic mode",
    icon: <SyncOutlined />, 
    color: "#1890ff",
    category: "control"
  },
  // { 
  //   name: "DR", 
  //   label: "Manual Mode", 
  //   description: "Deactivate automatic mode",
  //   icon: <PauseCircleOutlined />, 
  //   color: "#faad14",
  //   category: "control"
  // },
  { 
    name: "TP", 
    label: "Emergency Stop", 
    description: "Immediate stop all operations",
    icon: <StopOutlined />, 
    color: "#ff4d4f",
    category: "control"
  },
];

const inputButtons = [
  { 
    name: "SK", 
    label: "Date & Time", 
    description: "Set system date and time",
    icon: <ClockCircleOutlined />,
    placeholder: "YYYY-MM-DD HH:MM:SS"
  },
  // { 
  //   name: "SM1", 
  //   label: "SMS Number 1", 
  //   description: "Set primary SMS number",
  //   icon: <PhoneOutlined />,
  //   placeholder: "+91XXXXXXXXXX"
  // },
  // { 
  //   name: "SM2", 
  //   label: "SMS Number 2", 
  //   description: "Set secondary SMS number",
  //   icon: <PhoneOutlined />,
  //   placeholder: "+91XXXXXXXXXX"
  // },
  { 
    name: "SV", 
    label: "Volume Totalizer", 
    description: "Set volume totalizer value",
    icon: <DatabaseOutlined />,
    placeholder: "Enter volume"
  },
  { 
    name: "SA", 
    label: "Amount Totalizer", 
    description: "Set amount totalizer value",
    icon: <DollarOutlined />,
    placeholder: "Enter amount"
  },
  { 
    name: "SP", 
    label: "Security Passcode", 
    description: "Set device passcode",
    icon: <LockOutlined />,
    placeholder: "Enter new passcode"
  },
];

const SettingsPanel = ({ device }) => {
  const [response, setResponse] = useState("");
  const [parsedResponse, setParsedResponse] = useState(null);
  const [customValue, setCustomValue] = useState("");
  const [rateValue, setRateValue] = useState("");
  const [loading, setLoading] = useState(false);
  const { apiDeviceMqttSend } = useDeviceApi();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!device?.device_number) return;
    if (socketRef.current) socketRef.current.close();
    
    const socket = new WebSocket(`${address.WS_DEVICE_CONFIG}${device.device_number}`);
    socketRef.current = socket;
    
    socket.onmessage = (event) => {
      const msg = event.data;
      console.log("WebSocket message:", msg);
      setResponse(msg);
      parseResponse(msg);
    };
    
    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, [device?.device_number]);

  const parseResponse = (msg) => {
    try {
      if (msg.startsWith("{") || msg.startsWith("[")) {
        const json = JSON.parse(msg);
        setParsedResponse(json);
      } else if (msg.includes("=")) {
        const obj = {};
        msg.split(";").forEach((pair) => {
          const [key, val] = pair.split("=");
          if (key) obj[key.trim()] = val?.trim() ?? "";
        });
        setParsedResponse(obj);
      } else {
        setParsedResponse(null);
      }
    } catch (err) {
      console.error("Failed to parse:", err);
      setParsedResponse(null);
    }
  };

  const sendCommand = async (button_name, value = "") => {
    const payload = {
      device_id: device?.id || null,
      device_number: device?.device_number || null,
      button_name,
      value,
    };
    
    setLoading(true);
    try {
      const res = await apiDeviceMqttSend(payload);
      if (res.status) {
        setResponse(`Command ${button_name} sent${value ? ` with value: ${value}` : ""}`);
        message.success(`Command sent successfully`);
      } else {
        console.error("Error response:", res);
        message.error("Command failed");
      }
    } catch (err) {
      console.error(err);
      message.error("Failed to send command");
    }
    setLoading(false);
  };

  const clearResponse = () => {
    setResponse("");
    setParsedResponse(null);
  };

  const infoButtons = simpleButtons.filter(btn => btn.category === "info");
  const controlButtons = simpleButtons.filter(btn => btn.category === "control");

  return (
    <div style={{ 
      padding: "16px", 
      maxWidth: "1200px", 
      margin: "0 auto",
      minHeight: "100vh"
    }}>
      {/* Header 
      <div style={{ 
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px",
        color: "white"
      }}>
        <Title level={2} style={{ color: "white", margin: 0 }}>
          <ApiOutlined style={{ marginRight: "12px" }} />
          Dispensing Unit Control Panel
        </Title>
        {device?.device_number && (
          <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: "16px" }}>
            Device: {device.device_number} | Status: <Badge status="processing" text="Connected" />
          </Text>
        )}
      </div>*/}


      {/* Rate Setting */}
      <Card 
        title={
          <Space>
            <PercentageOutlined style={{ color: "#52c41a" }} />
            <span>Fuel Rate Configuration</span>
          </Space>
        }
        style={{ 
          marginBottom: "24px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={16} md={18}>
            <Input
              placeholder="Enter fuel rate (e.g., 88.99)"
              value={rateValue}
              onChange={(e) => setRateValue(e.target.value)}
              size="large"
              prefix={<DollarOutlined style={{ color: "#52c41a" }} />}
              suffix="₹/L"
              style={{ borderRadius: "8px" }}
            />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Button
              type="primary"
              icon={<SettingOutlined />}
              size="large"
              block
              loading={loading}
              onClick={() => sendCommand("SE", rateValue)}
              style={{
                background: "linear-gradient(135deg, #52c41a, #389e0d)",
                border: "none",
                borderRadius: "8px",
                height: "48px"
              }}
            >
              Set Rate
            </Button>
          </Col>
        </Row>
      </Card>





      {/* Control Commands */}
      <Card 
        title={
          <Space>
            <ThunderboltOutlined style={{ color: "#fa8c16" }} />
            <span>Device Control</span>
          </Space>
        }
        style={{ 
          marginBottom: "24px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}
      >
        <Row gutter={[12, 12]}>
          {controlButtons.map((btn) => (
            <Col xs={12} sm={8} md={6} lg={4} key={btn.name}>
              <Tooltip title={btn.description}>
                <Button 
                  icon={btn.icon} 
                  block 
                  size="large"
                  loading={loading}
                  onClick={() => sendCommand(btn.name)}
                  style={{
                    height: "56px",
                    borderRadius: "8px",
                    borderColor: btn.color,
                    color: btn.color,
                    fontWeight: "500",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "4px"
                  }}
                  className="control-button"
                >
                  <div style={{ fontSize: "12px", lineHeight: "1.2" }}>
                    {btn.label}
                  </div>
                </Button>
              </Tooltip>
            </Col>
          ))}
        </Row>
      </Card>



        
      {/* Advanced Settings */}
      <Card 
        title={
          <Space>
            <SettingOutlined style={{ color: "#722ed1" }} />
            <span>Advanced Configuration</span>
          </Space>
        }
        style={{ 
          marginBottom: "24px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Input
              placeholder="Enter configuration value"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              size="large"
              style={{ borderRadius: "8px" }}
            />
          </Col>
          <Col xs={24}>
            <Row gutter={[8, 8]}>
              {inputButtons.map((btn) => (
                <Col xs={12} sm={8} md={6} key={btn.name}>
                  <Tooltip title={`${btn.description} - ${btn.placeholder}`}>
                    <Button 
                      icon={btn.icon} 
                      block
                      size="large"
                      loading={loading}
                      onClick={() => sendCommand(btn.name, customValue)}
                      style={{
                        height: "48px",
                        borderRadius: "8px",
                        borderColor: "#722ed1",
                        color: "#722ed1",
                        fontWeight: "500"
                      }}
                    >
                      {btn.label}
                    </Button>
                  </Tooltip>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
      </Card>



      {/* Information Commands */}
      <Card 
        title={
          <Space>
            <DashboardOutlined style={{ color: "#1890ff" }} />
            <span>Device Information</span>
          </Space>
        }
        style={{ 
          marginBottom: "24px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}
      >
        <Row gutter={[12, 12]}>
          {infoButtons.map((btn) => (
            <Col xs={12} sm={8} md={6} lg={4} key={btn.name}>
              <Tooltip title={btn.description}>
                <Button 
                  icon={btn.icon} 
                  block 
                  size="large"
                  loading={loading}
                  onClick={() => sendCommand(btn.name)}
                  style={{
                    height: "56px",
                    borderRadius: "8px",
                    borderColor: btn.color,
                    color: btn.color,
                    fontWeight: "500",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "4px"
                  }}
                  className="info-button"
                >
                  <div style={{ fontSize: "12px", lineHeight: "1.2" }}>
                    {btn.label}
                  </div>
                </Button>
              </Tooltip>
            </Col>
          ))}
        </Row>
      </Card>

    

      {/* Device Response */}
      <Card
        title={
          <Space>
            <ApiOutlined style={{ color: "#13c2c2" }} />
            <span>Device Response</span>
          </Space>
        }
        extra={
          <Button 
            icon={<ClearOutlined />} 
            size="small" 
            onClick={clearResponse}
            style={{ borderRadius: "6px" }}
          >
            Clear
          </Button>
        }
        style={{ 
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}
      >
        {parsedResponse && typeof parsedResponse === "object" ? (
          <Descriptions 
            column={{ xs: 1, sm: 1, md: 2 }} 
            bordered 
            size="small"
            style={{ borderRadius: "8px" }}
          >
            {Object.entries(parsedResponse).map(([key, val]) => (
              <Descriptions.Item key={key} label={key}>
                <Text code>
                  {typeof val === "object" ? JSON.stringify(val) : val}
                </Text>
              </Descriptions.Item>
            ))}
          </Descriptions>
        ) : response ? (
          <div style={{ 
            background: "#f6f8fa",
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid #e1e8ed"
          }}>
            <Paragraph 
              code 
              style={{ 
                whiteSpace: "pre-wrap",
                margin: 0,
                fontFamily: "Consolas, Monaco, 'Courier New', monospace"
              }}
            >
              {response}
            </Paragraph>
          </div>
        ) : (
          <div style={{ 
            textAlign: "center", 
            padding: "40px 20px",
            color: "#8c8c8c"
          }}>
            <ApiOutlined style={{ fontSize: "48px", marginBottom: "16px" }} />
            <div>No response received yet</div>
            <Text type="secondary" style={{ fontSize: "14px" }}>
              Execute a command to see device response
            </Text>
          </div>
        )}
      </Card>

      <style jsx>{`
        .info-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
        }
        .control-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(250, 140, 22, 0.3);
        }
        .ant-card {
          transition: all 0.3s ease;
        }
        .ant-card:hover {
          box-shadow: 0 6px 16px rgba(0,0,0,0.15);
        }
        .ant-btn {
          transition: all 0.3s ease;
        }
        @media (max-width: 768px) {
          .ant-card-head-title {
            font-size: 16px;
          }
          .ant-btn {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default SettingsPanel;