// src/pages/DeviceDashboard/DeviceDashboard.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Progress,
  Typography,
  Tag,
  Badge,
  message,
} from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SendOutlined,
  PoweroffOutlined,
  MonitorOutlined,
  ControlOutlined,
  DatabaseOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  WifiOutlined,
  ScheduleOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';

import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './DeviceDashboard.css';
import ScheduleDrawer from '../../components/Drawer/ScheduleDrawer';
import { useParams, useNavigate } from 'react-router-dom';
import useDashboardDeviceApi from '../../api/useDashboardDeviceApi';
import useDeviceApi from '../../api/useDeviceApi';
import ChartMapData from '../../components/dashboard/ChartMapData';
import { address } from '../../routes/ApiRoute';


const { Title, Text } = Typography;
const MAX_ACTIVE_VALVES = 2;


const parseBitString = (bitString, expectedLen = 9) => {
  if (typeof bitString !== 'string') return Array(expectedLen).fill(false);
  const s = bitString.trim();
  const arr = s.split('').map((c) => c === '1');
  if (arr.length < expectedLen) {
    return [...arr, ...Array(expectedLen - arr.length).fill(false)];
  }
  if (arr.length > expectedLen) {
    return arr.slice(0, expectedLen);
  }
  return arr;
};


const initialValveOrder = [
  'valve1', 'valve2', 'valve3', 'valve4',
  'valve5', 'valve6'
  // 'valve7', 'valve8',
];


const DeviceDashboard = () => {
  const {
    organizationId,
    projectId,
    deviceId,
    device,
    device_name,
  } = useParams();
  const navigate = useNavigate();
  const { dashboardSwitchApi, requestWebsocketDataApi } = useDashboardDeviceApi();
  const { apiDeviceInfo } = useDeviceApi();

  const resolvedDeviceName = device_name || device || '';
  const resolvedDevice = device || '';
  const resolvedDeviceIdNumber = deviceId ? Number(deviceId) : undefined;

  const wsRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isScheduleDrawerOpen, setIsScheduleDrawerOpen] = useState(false);
  const [chartData, setChartData] = useState([]);
  const maxChartDataPoints = 20;

  const [deviceInfo, setDeviceInfo] = useState({
    deviceId: resolvedDeviceName || 'UNKNOWN',
    date: '',
    time: '',
    signal: '0%',
    status: 'Offline',
    totalFlow: 0,
    flowRate: 0,
    totalPressure: 0,
    battery: 0,
    device_id: deviceId,
    device: device,
  });

  const [doStatusBits, setDoStatusBits] = useState(Array(9).fill(false));
  const [diStatusBits, setDiStatusBits] = useState(Array(9).fill(false));
  const [pendingDoStatusBits, setPendingDoStatusBits] = useState(Array(9).fill(false));

  const valveStates = useMemo(() => {
    const obj = {};
    initialValveOrder.forEach((key, idx) => {
      obj[key] = !!pendingDoStatusBits[idx];
    });
    return obj;
  }, [pendingDoStatusBits]);

  const activeValveCountV1toV8 = useMemo(() => {
    return initialValveOrder.slice(0, 8).reduce((acc, key, idx) => {
      return acc + (pendingDoStatusBits[idx] ? 1 : 0);
    }, 0);
  }, [pendingDoStatusBits]);

  const updateChartData = useCallback((newFlowRate, newPressure, timestamp) => {
    setChartData((prevData) => {
      const timeStr = timestamp || new Date().toLocaleTimeString();
      const newPoint = {
        time: timeStr,
        flowRate: newFlowRate || 0,
        pressure: newPressure || 0,
      };
      const updatedData = [...prevData, newPoint];
      if (updatedData.length > maxChartDataPoints) {
        return updatedData.slice(-maxChartDataPoints);
      }
      return updatedData;
    });
  }, [maxChartDataPoints]);

  const convertValveStatesToCommand = useCallback((deviceStr, deviceIdNum, bits) => {
    return {
      device: deviceStr,
      device_id: deviceIdNum,
      do: bits.map((isOn, index) => ({
        do_no: index + 1,
        do_status: isOn ? 2 : 1,
      })),
    };
  }, []);

  const handleScheduleClick = () => setIsScheduleDrawerOpen(true);
  const handleScheduleDrawerClose = () => setIsScheduleDrawerOpen(false);

  const getSignalColor = (signal) => {
    const value = parseFloat(signal);
    if (value >= 70) return '#52c41a';
    if (value >= 40) return '#faad14';
    return '#ff4d4f';
  };

  const getBatteryColor = (pct) => {
    if (pct > 60) return '#52c41a';
    if (pct > 20) return '#faad14';
    return '#ff4d4f';
  };

  const handleValveToggle = (key) => {
    const idx = initialValveOrder.indexOf(key);
    if (idx === -1) return;

    const isCurrentlyOn = pendingDoStatusBits[idx];
    if (!isCurrentlyOn && idx < 8) {
      if (activeValveCountV1toV8 >= MAX_ACTIVE_VALVES) {
        message.warning(`Only ${MAX_ACTIVE_VALVES} valves can be active at once.`);
        return;
      }
    }

    const newBits = [...pendingDoStatusBits];
    newBits[idx] = !isCurrentlyOn;
    setPendingDoStatusBits(newBits);

    const newActiveCount = newBits.slice(0, 8).reduce((acc, bit) => acc + (bit ? 1 : 0), 0);
    if (newActiveCount === 3) {
      setTimeout(() => {
        handleSendCommand(newBits);
      }, 100);
    }
  };

  const handleSendCommand = async (bitsToSend = pendingDoStatusBits) => {
    if (!resolvedDeviceName || !resolvedDeviceIdNumber) {
      message.error('Missing device identifiers.');
      return;
    }

    setIsLoading(true);
    const commandData = convertValveStatesToCommand(
      resolvedDevice,
      resolvedDeviceIdNumber,
      bitsToSend
    );

    try {
      await dashboardSwitchApi(commandData);
      await new Promise((res) => setTimeout(res, 1200));
      message.success('Command sent. Waiting for device update...');
      setDoStatusBits([...bitsToSend]);
    } catch (err) {
      message.error('Failed to send command.');
    } finally {
      setIsLoading(false);
    }
  };

  const wsUrl = useMemo(() => {
    if (!resolvedDeviceIdNumber || !resolvedDevice) return null;
    return `${address.WS_DEVICE_DASHBOARD}${resolvedDeviceIdNumber}/${encodeURIComponent(
      resolvedDevice
    )}`;
  }, [resolvedDeviceIdNumber, resolvedDevice]);


  // ✅ FIXED: useRef to always hold latest battery without stale closure
  const deviceInfoRef = useRef(deviceInfo);
  useEffect(() => {
    deviceInfoRef.current = deviceInfo;
  }, [deviceInfo]);


  const onWebSocketMessage = useCallback((event) => {
    try {
      // ✅ FIXED: Handle both single and double JSON.parse safely
      let data;
      try {
        const first = JSON.parse(event.data);
        data = typeof first === 'string' ? JSON.parse(first) : first;
      } catch {
        return;
      }

      if (data && data.lastdata) {
        const ld = data.lastdata;

        // ✅ FIXED: battery read from ref to avoid stale closure
        const battery123 =
          typeof ld.bat_v === 'number'
            ? Number(ld.bat_v)
            : deviceInfoRef.current.battery;

        setDeviceInfo((prev) => ({
          ...prev,
          deviceId: ld.device || prev.deviceId,
          date: ld.date || prev.date,
          time: ld.time || prev.time,
          totalFlow: typeof ld.total_flow1 === 'number' ? ld.total_flow1 : prev.totalFlow,
          flowRate: typeof ld.flow_rate1 === 'number' ? ld.flow_rate1 : prev.flowRate,
          totalPressure: typeof ld.pressure === 'number' ? ld.pressure : prev.totalPressure,
          battery: battery123,
          device_id: deviceId,
          device: device,
          signal: ld.tw !== undefined ? ld.tw : prev.signal,
        }));

        const newFlowRate = typeof ld.flow_rate1 === 'number' ? ld.flow_rate1 : null;
        const newPressure = typeof ld.pressure === 'number' ? ld.pressure : null;
        const timestamp = ld.time || new Date().toLocaleTimeString();
        if (newFlowRate !== null || newPressure !== null) {
          updateChartData(newFlowRate, newPressure, timestamp);
        }

        if (typeof ld.di_status === 'string') {
          setDiStatusBits(parseBitString(ld.di_status, 9));
        }
        if (typeof ld.do_status === 'string') {
          const newDoStatusBits = parseBitString(ld.do_status, 9);
          setDoStatusBits(newDoStatusBits);
        }
      }
    } catch {
      // Silent fail — malformed message
    }
  }, [updateChartData, deviceId, device]);   // ✅ Removed deviceInfo.battery from deps — using ref instead


  // ✅ Fetch initial device_status from API on mount
  useEffect(() => {
    const fetchInitialDeviceStatus = async () => {
      try {
        const reqData = {
          client_id: 1,
          device_id: resolvedDeviceIdNumber,
          device: resolvedDevice,
        };
        const response = await apiDeviceInfo(reqData);
        if (response?.data?.data?.device_status) {
          const statusStr = response.data.data.device_status.trim().toUpperCase();
          setDeviceInfo((prev) => ({
            ...prev,
            status: statusStr === 'ONLINE' ? 'Online' : 'Offline',
          }));
        }
      } catch (err) {
        console.error('Failed to fetch initial device status:', err);
      }
    };
    if (resolvedDeviceIdNumber && resolvedDevice) {
      fetchInitialDeviceStatus();
    }
  }, [resolvedDeviceIdNumber, resolvedDevice]);

  const onWebSocketOpen = useCallback(async () => {
    try {
      const reqData = {
        device: resolvedDevice,
        device_id: resolvedDeviceIdNumber,
        client_id: 1,
      };
      await requestWebsocketDataApi(reqData);
    } catch { }
  }, [resolvedDevice, resolvedDeviceIdNumber]);  // ✅ Added proper deps


  const onWebSocketClose = useCallback(() => {
    // Status is managed only by API — no status change on WS close
  }, []);

  const onWebSocketError = useCallback(() => { }, []);

  useEffect(() => {
    setPendingDoStatusBits([...doStatusBits]);
  }, [doStatusBits]);

  useEffect(() => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch { }
      wsRef.current = null;
    }
    if (!wsUrl) return;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.addEventListener('open', onWebSocketOpen);
    ws.addEventListener('message', onWebSocketMessage);
    ws.addEventListener('close', onWebSocketClose);
    ws.addEventListener('error', onWebSocketError);

    return () => {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch { }
        wsRef.current = null;
      }
    };
  }, [wsUrl, onWebSocketOpen, onWebSocketMessage, onWebSocketClose, onWebSocketError]);

  useEffect(() => {
    const initialData = [];
    for (let i = 0; i < 10; i++) {
      const time = new Date(Date.now() - (9 - i) * 30000).toLocaleTimeString();
      initialData.push({
        time,
        flowRate: Math.random() * 50 + 10,
        pressure: Math.random() * 5 + 2,
      });
    }
    setChartData(initialData);
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch { }
        wsRef.current = null;
      }
    };
  }, []);

  let raw = deviceInfo.battery;

  // clamp value between 0 and 13
  let value = Math.max(0, Math.min(raw, 13));

  // convert to percentage
  let batteryPercent = Math.round((value / 13) * 100);
  return (
    <>
      {/* Header */}
      <Card className="header-card">
        <div className="header-content">
          <div className="device-info">
            <Badge
              color="transparent"
              text={
                <Tag
                  className={`status-tag ${deviceInfo.status === 'Online' ? 'status-online' : 'status-offline'
                    }`}
                  icon={
                    deviceInfo.status === 'Online' ? (
                      <CheckCircleOutlined />
                    ) : (
                      <ExclamationCircleOutlined />
                    )
                  }
                >
                  {deviceInfo.status}
                </Tag>
              }
            />
            <Title level={4} className="device-title">
              <MonitorOutlined style={{ marginRight: '8px' }} />
              {resolvedDeviceName}
            </Title>
          </div>
          <div className="device-controls">
            <Text className="date-time-info">
              <CalendarOutlined style={{ marginRight: '6px' }} />
              {deviceInfo.date}
              <ClockCircleOutlined style={{ margin: '0 6px' }} />
              {deviceInfo.time}
            </Text>
            {/* <div className="signal-info">
              <WifiOutlined
                style={{
                  color: getSignalColor(deviceInfo.signal),
                  fontSize: '18px',
                }}
              />
              <Text style={{ minWidth: '70px', fontWeight: '600' }}>
                {deviceInfo.signal}
              </Text>
              <Progress
                percent={parseFloat(deviceInfo.signal) || 0}
                size="small"
                className="signal-progress"
                strokeColor={{
                  '0%': getSignalColor(deviceInfo.signal),
                  '100%': getSignalColor(deviceInfo.signal),
                }}
                showInfo={false}
                strokeWidth={6}
              />
            </div> */}
            <Button
              type="primary"
              icon={<ScheduleOutlined />}
              size="large"
              onClick={handleScheduleClick}
              className="schedule-button"
            >
              Schedule
            </Button>
          </div>
        </div>
      </Card>

      <ScheduleDrawer
        open={isScheduleDrawerOpen}
        onClose={handleScheduleDrawerClose}
        deviceInfo={deviceInfo}
        valveStates={valveStates}
      />

      {/* Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={12} md={8}>
          <Card className="metric-card flow-rate" hoverable>
            <div className="metric-background-pattern" />
            <div className="metric-background-circle" />
            <div className="metric-content">
              <div className="metric-info">
                <Text className="metric-title">Pressure</Text>
                <Title level={1} className="metric-value">
                  {deviceInfo.flowRate}
                </Title>
                <Text className="metric-description">Bar</Text>
              </div>
              <div className="metric-icon">
                <LineChartOutlined />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={8}>
          <Card className="metric-card pressure" hoverable>
            <div className="metric-background-pattern" />
            <div className="metric-background-circle" />
            <div className="metric-content">
              <div className="metric-info">
                <Text className="metric-title">Pressure 2</Text>
                <Title level={1} className="metric-value">
                  {deviceInfo.totalPressure}
                </Title>
                <Text className="metric-description">Bar</Text>
              </div>
              <div className="metric-icon">
                <ApiOutlined />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={8}>
          <Card
            className={`metric-card ${deviceInfo.battery > 20 ? 'battery-good' : 'battery-low'
              }`}
            hoverable
          >
            <div className="metric-background-pattern" />
            <div className="metric-background-circle" />
            <div className="metric-content">
              <div className="metric-info">
                <Text className="metric-title">Battery</Text>
                <Title level={1} className="metric-value">
                  {batteryPercent}
                  <span className="metric-unit">%</span>
                </Title>
                <Text className="metric-description">
                  {batteryPercent > 20 ? 'Good' : 'Low'}
                </Text>
              </div>
              <div className="metric-icon">
                <div className="battery-icon">
                  <div className="battery-tip" />
                  <div
                    className="battery-fill"
                    style={{
                      width: `${Math.max(Number(batteryPercent), 8)}%`,
                      background: `linear-gradient(90deg, ${getBatteryColor(
                        Number(batteryPercent)
                      )}, ${getBatteryColor(Number(batteryPercent))}dd)`,
                    }}
                  >
                    <div className="battery-shine" />
                  </div>
                  {Number(batteryPercent) <= 20 && (
                    <ExclamationCircleOutlined className="battery-warning" />
                  )}
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Google Map and Line Chart Row */}
      <div>
        <ChartMapData />
      </div>

      {/* Solenoid Valve Controls */}
      <Card className="valve-control-card">
        <div className="valve-control-header">
          <div className="valve-control-title">
            <Title level={4}>
              <ControlOutlined style={{ marginRight: '8px' }} />
              Solenoid Valve Control
            </Title>
            <Badge count={activeValveCountV1toV8} style={{ backgroundColor: '#52c41a' }}>
              <Tag className="max-active-tag">
                <ExclamationCircleOutlined style={{ marginRight: '4px' }} />
                MAX {MAX_ACTIVE_VALVES} ACTIVE
              </Tag>
            </Badge>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<SendOutlined />}
            loading={isLoading}
            onClick={() => handleSendCommand()}
            className="send-command-button send-command-active"
          >
            {isLoading ? 'SENDING...' : 'SEND COMMAND'}
          </Button>
        </div>
        <div className="valve-controls-grid">
          {initialValveOrder.map((key, index) => {
            const isOn = !!pendingDoStatusBits[index];
            const label = `VALVE ${index + 1}`;
            return (
              <div key={key} className="valve-control">
                <Button
                  type={isOn ? 'primary' : 'default'}
                  size="large"
                  onClick={() => handleValveToggle(key)}
                  disabled={isLoading}
                  icon={isOn ? <CheckCircleOutlined /> : <PoweroffOutlined />}
                  className={`valve-button ${isOn ? 'valve-on' : 'valve-off'}`}
                >
                  {isOn ? 'ON' : 'OFF'}
                </Button>
                <div className={`valve-label ${isOn ? 'valve-on' : 'valve-off'}`}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Live Status Dashboard */}
      <Card className="status-dashboard-card">
        <Title level={4} className="status-dashboard-title">
          <DatabaseOutlined style={{ marginRight: '8px' }} />
          Live Status Dashboard
        </Title>
        <Row gutter={[16, 24]}>
          {initialValveOrder.map((key, index) => {
            const isActive = !!diStatusBits[index];
            const labelShort = `V${index + 1}`;
            return (
              <Col xs={6} sm={4} md={3} key={key}>
                <div className={`status-item ${isActive ? 'status-active' : 'status-inactive'}`}>
                  <Text className="status-label">{labelShort}</Text>
                  <div className="status-indicator">
                    <div className={`status-circle ${isActive ? 'status-active' : 'status-inactive'}`}>
                      {isActive ? (
                        <CheckCircleOutlined className="status-circle-icon active" />
                      ) : (
                        <PoweroffOutlined className="status-circle-icon inactive" />
                      )}
                      {isActive && <div className="status-ripple" />}
                    </div>
                    <Text className={`status-text ${isActive ? 'active' : 'inactive'}`}>
                      {isActive ? 'ACTIVE' : 'STANDBY'}
                    </Text>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      </Card>
    </>
  );
};

export default DeviceDashboard;
