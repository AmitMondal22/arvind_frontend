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
  ReloadOutlined,
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
  const { dashboardSwitchApi, requestWebsocketDataApi, readLastDataApi } = useDashboardDeviceApi();
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

  const handleRefreshData = async () => {
    try {
      if (!resolvedDevice || !resolvedDeviceIdNumber) return;
      message.loading({ content: 'Requesting latest data...', key: 'refresh_data' });
      const reqData = {
        device: resolvedDevice,
        device_id: resolvedDeviceIdNumber,
        request_type: 1
      };
      const res = await readLastDataApi(reqData);
      if (res?.status || res?.status === 'success') {
         message.success({ content: 'Data refresh requested!', key: 'refresh_data', duration: 2 });
      } else {
         message.error({ content: 'Refresh request failed!', key: 'refresh_data', duration: 2 });
      }
    } catch (e) {
      message.error({ content: 'Refresh request failed!', key: 'refresh_data', duration: 2 });
    }
  };

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

            <div className="battery-header-info" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(100, 116, 139, 0.05)', padding: '6px 12px', borderRadius: '12px', fontWeight: 600 }}>
              <div className="battery-icon" style={{ transform: 'scale(0.8)', margin: 0 }}>
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
              <span style={{ color: getBatteryColor(Number(batteryPercent)) }}>
                {batteryPercent}%
              </span>
            </div>
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
              type="default"
              icon={<ReloadOutlined />}
              size="large"
              onClick={handleRefreshData}
              style={{ borderRadius: '8px', fontWeight: 600, color: '#64748b', borderColor: '#cbd5e1' }}
            >
              Refresh
            </Button>
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

      {/* Top Row: Valve Controls (Full Width) */}
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col xs={24} md={24}>
          <Card className="valve-control-card">
            <div className="valve-control-header">
              <div className="valve-control-title">
                <Title level={4}>
                  <ControlOutlined style={{ marginRight: '8px' }} />
                  Outlet Valve Control
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
        </Col>
      </Row>

      {/* Bottom Row: Status (Left) & Map (Right) */}
      <Row gutter={[24, 24]} style={{ display: 'flex', alignItems: 'stretch' }}>
        {/* Live Status Dashboard */}
        <Col xs={24} md={12} style={{ display: 'flex', flexDirection: 'column' }}>
          <Card className="status-dashboard-card" style={{ flex: 1 }}>
            <Title level={4} className="status-dashboard-title">
              <DatabaseOutlined style={{ marginRight: '8px' }} />
              Outlet Valve Status
            </Title>

            {/* Pipeline Valve Visual */}
            <div className="pipeline-container">
              {/* Main horizontal pipe */}
              <div className="pipeline-main-pipe" />

              {/* Valve assemblies */}
              <div className="pipeline-valves-row">
                {initialValveOrder.map((key, index) => {
                  const isActive = !!diStatusBits[index];
                  return (
                    <div key={key} className="pipeline-valve-assembly">
                      {/* Solenoid Valve SVG */}
                      <div className={`solenoid-valve ${isActive ? 'valve-running' : 'valve-standby'}`}>
                        {/* Coil / Actuator top */}
                        <div className="solenoid-actuator">
                          <div className="solenoid-coil">
                            <div className="coil-wire left" />
                            <div className="coil-wire right" />
                          </div>
                          <div className="solenoid-cap" />
                        </div>

                        {/* Valve body */}
                        <div className="solenoid-body">
                          <div className="solenoid-body-inner">
                            <div className={`solenoid-indicator ${isActive ? 'indicator-on' : 'indicator-off'}`} />
                          </div>
                        </div>

                        {/* Inlet/Outlet ports */}
                        <div className="solenoid-ports">
                          <div className="port port-left" />
                          <div className="port port-right" />
                        </div>
                      </div>

                      {/* Vertical pipe connecting to main */}
                      <div className={`pipeline-vertical-pipe ${isActive ? 'pipe-active' : ''}`}>
                        {isActive && <div className="water-flow-animation" />}
                      </div>

                      {/* T-junction connector */}
                      <div className={`pipeline-t-junction ${isActive ? 'junction-active' : ''}`} />

                      {/* Status badge */}
                      <div className={`valve-status-badge ${isActive ? 'badge-running' : 'badge-standby'}`}>
                        {isActive ? 'RUNNING' : 'STANDBY'}
                      </div>

                      {/* Valve label */}
                      <div className="valve-status-label">V{index + 1}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </Col>

        {/* Map Component */}
        <Col xs={24} md={12} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, height: '100%', minHeight: '300px' }}>
            <ChartMapData />
          </div>
        </Col>
      </Row>
    </>
  );
};

export default DeviceDashboard;
