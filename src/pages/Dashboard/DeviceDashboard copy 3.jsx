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
import GoogleMapReact from 'google-map-react';
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
import ChartMapData from '../../components/dashboard/ChartMapData';

const { Title, Text } = Typography;
const MAX_ACTIVE_VALVES = 2;

// Device Location Marker Component
const DeviceMarker = ({ text }) => (
  <div
    style={{
      color: 'white',
      background: '#1890ff',
      padding: '10px',
      display: 'inline-flex',
      textAlign: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      transform: 'translate(-50%, -50%)',
      fontSize: '16px',
      fontWeight: 'bold',
      border: '3px solid white',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      minWidth: '40px',
      minHeight: '40px',
    }}
  >
    <EnvironmentOutlined />
  </div>
);

// Helper: safely parse 9-character bitstring into boolean array
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
  'valve1',
  'valve2',
  'valve3',
  'valve4',
  'valve5',
  'valve6',
  'valve7',
  'valve8'
];

const DeviceDashboard = () => {
  const {
    organizationId,
    projectId,
    deviceId,
    device,
    device_name,
    organizationName,
    projectname,
  } = useParams();
  const navigate = useNavigate();
  const {dashboardSwitchApi, requestWebsocketDataApi} = useDashboardDeviceApi();

  // Resolve device identifiers from params
  const resolvedDeviceName = device_name || device || '';
  const resolvedDevice = device || '';
  const resolvedDeviceIdNumber = deviceId ? Number(deviceId) : undefined;

  // WebSocket ref
  const wsRef = useRef(null);

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [isScheduleDrawerOpen, setIsScheduleDrawerOpen] = useState(false);

  // Device location state for Google Map
  const [deviceLocation, setDeviceLocation] = useState({
    center: {
      lat: 28.6139, // Default to New Delhi
      lng: 77.2090,
    },
    zoom: 15,
  });

  // Line chart data state
  const [chartData, setChartData] = useState([]);
  const maxChartDataPoints = 20; // Keep last 20 data points

  // Metrics/state coming from WebSocket lastdata payload
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
  
  // NEW: Pending state for UI interactions before sending commands
  const [pendingDoStatusBits, setPendingDoStatusBits] = useState(Array(9).fill(false));

  // Derive valveStates object from pendingDoStatusBits for rendering compatibility
  const valveStates = useMemo(() => {
    const obj = {};
    initialValveOrder.forEach((key, idx) => {
      obj[key] = !!pendingDoStatusBits[idx];
    });
    return obj;
  }, [pendingDoStatusBits]);

  // Active valve count only for V1–V8 using pending state
  const activeValveCountV1toV8 = useMemo(() => {
    return initialValveOrder.slice(0, 8).reduce((acc, key, idx) => {
      return acc + (pendingDoStatusBits[idx] ? 1 : 0);
    }, 0);
  }, [pendingDoStatusBits]);

  // Update chart data when new data arrives
  const updateChartData = useCallback((newFlowRate, newPressure, timestamp) => {
    setChartData((prevData) => {
      const timeStr = timestamp || new Date().toLocaleTimeString();
      const newPoint = {
        time: timeStr,
        flowRate: newFlowRate || 0,
        pressure: newPressure || 0,
      };
      const updatedData = [...prevData, newPoint];
      
      // Keep only the last maxChartDataPoints
      if (updatedData.length > maxChartDataPoints) {
        return updatedData.slice(-maxChartDataPoints);
      }
      
      return updatedData;
    });
  }, [maxChartDataPoints]);

  // Helper: convert valveStates -> command do array (index+1 mapping)
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

  // Open schedule drawer
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

  // UPDATED: Manual toggle handler - no immediate command sending
  const handleValveToggle = (key) => {
    const idx = initialValveOrder.indexOf(key);
    if (idx === -1) return;

    const isCurrentlyOn = pendingDoStatusBits[idx];
    
    // Enforce MAX_ACTIVE_VALVES for V1–V8 only if turning ON
    if (!isCurrentlyOn && idx < 8) {
      if (activeValveCountV1toV8 >= MAX_ACTIVE_VALVES) {
        message.warning(`Only ${MAX_ACTIVE_VALVES} valves can be active at once.`);
        return;
      }
    }

    // Update pending state
    const newBits = [...pendingDoStatusBits];
    newBits[idx] = !isCurrentlyOn;
    setPendingDoStatusBits(newBits);

    // Auto-send command if exactly 2 valves (V1-V8) are active after this change
    const newActiveCount = newBits.slice(0, 8).reduce((acc, bit) => acc + (bit ? 1 : 0), 0);
    if (newActiveCount === 3) {
      // Small delay to ensure state is updated
      setTimeout(() => {
        handleSendCommand(newBits);
      }, 100);
    }
  };

  // UPDATED: Send command to backend using pending state by default
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

    console.log('Send Command Data:', JSON.stringify(commandData));

    try {
      // TODO: replace with real API call

      await dashboardSwitchApi(commandData)
      await new Promise((res) => setTimeout(res, 1200));
      message.success('Command sent. Waiting for device update...');
      
      // Update the actual doStatusBits to match what was sent
      setDoStatusBits([...bitsToSend]);
    } catch (err) {
      console.error('Error sending command:', err);
      message.error('Failed to send command.');
    } finally {
      setIsLoading(false);
    }
  };

  // WebSocket URL generator
  const wsUrl = useMemo(() => {
    if (!resolvedDeviceIdNumber || !resolvedDevice) return null;
    return `wss://wfmsapi.iotblitz.com/api/water_ms_routes/water_station/WFMS/1/${resolvedDeviceIdNumber}/${encodeURIComponent(
      resolvedDevice
    )}`;
  }, [resolvedDeviceIdNumber, resolvedDevice]);

  // Handle incoming messages
  const onWebSocketMessage = useCallback((event) => {
    try {
      const data = JSON.parse(JSON.parse(event.data));
      console.log('[WS][PARSED]', data);

      if (data.lastdata) {
        const ld = data.lastdata;
        var battery123 = typeof ld.bat_v === 'number' ? Number(ld.bat_v) : deviceInfo.battery;
        console.log('[WS][BATTERY]', battery123);

        // Update metrics
        // setDeviceInfo((prev) => ({
        //   ...prev,
        //   deviceId: ld.device || prev.deviceId,
        //   date: ld.date || prev.date,
        //   time: ld.time || prev.time,
        //   status: 'Online',
        //   totalFlow: typeof ld.total_flow1 === 'number' ? ld.total_flow1 : prev.totalFlow,
        //   flowRate: typeof ld.flow_rate1 === 'number' ? ld.flow_rate1 : prev.flowRate,
        //   totalPressure: typeof ld.pressure === 'number' ? ld.pressure : prev.totalPressure,
        //   battery: battery123,
        //   device_id: deviceId,
        //   device: device,
        //   signal : ld.tw
        // }));


        setDeviceInfo((prev) => {
          const newDate = ld.date || prev.date;
          const newTime = ld.time || prev.time;
          const online = isDeviceOnline(newDate, newTime);
          console.log(">>>>>>>>>>>>>>>>>......",online,newDate,newTime);
          return {
            ...prev,
            deviceId: ld.device || prev.deviceId,
            date: newDate,
            time: newTime,
            status: online ? 'Online' : 'Offline',
            totalFlow: typeof ld.total_flow1 === 'number' ? ld.total_flow1 : prev.totalFlow,
            flowRate: typeof ld.flow_rate1 === 'number' ? ld.flow_rate1 : prev.flowRate,
            totalPressure: typeof ld.pressure === 'number' ? ld.pressure : prev.totalPressure,
            battery: battery123,
            device_id: deviceId,
            device: device,
            signal : ld.tw
          };
        });

        // Update chart data with new readings
        const newFlowRate = typeof ld.flow_rate1 === 'number' ? ld.flow_rate1 : null;
        const newPressure = typeof ld.pressure === 'number' ? ld.pressure : null;
        const timestamp = ld.time || new Date().toLocaleTimeString();
        
        if (newFlowRate !== null || newPressure !== null) {
          updateChartData(newFlowRate, newPressure, timestamp);
        }

        // Update di_status (Live Status Dashboard)
        if (typeof ld.di_status === 'string') {
          setDiStatusBits(parseBitString(ld.di_status, 9));
        }

        // Update do_status (Switch display)
        if (typeof ld.do_status === 'string') {
          const newDoStatusBits = parseBitString(ld.do_status, 9);
          setDoStatusBits(newDoStatusBits);
        }
      }
    } catch (e) {
      console.error('WebSocket message parse error:', e);
    }
  }, [updateChartData, deviceInfo.battery, deviceId, device]);

  // On open: call an API
  const onWebSocketOpen = useCallback(async () => {
    setDeviceInfo((prev) => ({ ...prev, status: 'Offline' }));
    try {
      console.log('WebSocket connected; init API called (placeholder).');

      let reqData={
          device: resolvedDevice,
          device_id: resolvedDeviceIdNumber,
          client_id: 1
      }

      let abc =await requestWebsocketDataApi(reqData)
      console.log('[ppppppppppppppp]',abc);
    } catch (e) {
      console.error('Init API failed:', e);
    }
  }, []);


const isDeviceOnline = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return false;

  try {
    // Construct device datetime
    const deviceDateTime = new Date(`${dateStr}T${timeStr}`);
    const now = new Date();

    // Difference in milliseconds
    const diffMs = Math.abs(now - deviceDateTime);

    // Convert to minutes
    const diffMinutes = diffMs / (1000 * 60);

    // Allow ±20 minutes
    return diffMinutes <= 20;
  } catch (e) {
    console.error("Invalid date/time format", e);
    return false;
  }
};


  const onWebSocketClose = useCallback(() => {
    setDeviceInfo((prev) => ({ ...prev, status: 'Offline' }));
    console.log('WebSocket closed.');
  }, []);

  const onWebSocketError = useCallback((err) => {
    console.error('WebSocket error:', err);
  }, []);

  // Google Maps API key (replace with your actual API key)
  const googleMapsApiKey = 'AIzaSyCd0O2zOkbLBLDn10Ikm32BO5XTQRW5BBc';

  // NEW: Sync pendingDoStatusBits with incoming WebSocket data
  useEffect(() => {
    setPendingDoStatusBits([...doStatusBits]);
  }, [doStatusBits]);

  // Establish WebSocket connection
  useEffect(() => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
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
        try {
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }
    };
  }, [wsUrl, onWebSocketOpen, onWebSocketMessage, onWebSocketClose, onWebSocketError]);

  // Initialize chart with some sample data
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


  

  // Clean up WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }
    };
  }, []);

  return (
    <>
      {/* Header Card */}
      <Card className="header-card">
        <div className="header-content">
          <div className="device-info">
            <Badge
              color="transparent"
              text={
                <Tag
                  className={`status-tag ${
                    deviceInfo.status === 'Online' ? 'status-online' : 'status-offline'
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
              {deviceInfo.deviceId}
            </Title>
          </div>
          <div className="device-controls">
            <Text className="date-time-info">
              <CalendarOutlined style={{ marginRight: '6px' }} />
              {deviceInfo.date}
              <ClockCircleOutlined style={{ margin: '0 6px' }} />
              {deviceInfo.time}
            </Text>
            <div className="signal-info">
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
            </div>
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
        {/* <Col xs={12} sm={12} md={6}>
          <Card className="metric-card total-flow" hoverable>
            <div className="metric-background-pattern" />
            <div className="metric-background-circle" />
            <div className="metric-content">
              <div className="metric-info">
                <Text className="metric-title">Total Flow</Text>
                <Title level={1} className="metric-value">
                  {deviceInfo.totalFlow}
                </Title>
                <Text className="metric-description">Cumulative</Text>
              </div>
              <div className="metric-icon">
                <BarChartOutlined />
              </div>
            </div>
          </Card>
        </Col> */}
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
            className={`metric-card ${
              deviceInfo.battery > 20 ? 'battery-good' : 'battery-low'
            }`}
            hoverable
          >
            <div className="metric-background-pattern" />
            <div className="metric-background-circle" />
            <div className="metric-content">
              <div className="metric-info">
                <Text className="metric-title">Battery</Text>
                <Title level={1} className="metric-value">
                  {deviceInfo.battery}
                  <span className="metric-unit">%</span>
                </Title>
                <Text className="metric-description">
                  {deviceInfo.battery > 20 ? 'Good' : 'Low'}
                </Text>
              </div>
              <div className="metric-icon">
                <div className="battery-icon">
                  <div className="battery-tip" />
                  <div
                    className="battery-fill"
                    style={{
                      width: `${Math.max(Number(deviceInfo.battery), 8)}%`,
                      background: `linear-gradient(90deg, ${getBatteryColor(
                        Number(deviceInfo.battery)
                      )}, ${getBatteryColor(Number(deviceInfo.battery))}dd)`,
                    }}
                  >
                    <div className="battery-shine" />
                  </div>
                  {Number(deviceInfo.battery) <= 20 && (
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
        <ChartMapData/>
      </div>

      {/* Solenoid Valve Controls - UPDATED */}
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
            const isOn = !!pendingDoStatusBits[index]; // UPDATED: Use pending state
            const label = key === 'Pressure' ? 'PRESSURE' : `VALVE ${index + 1}`;
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
            const labelShort = key === 'Pressure' ? 'P' : `V${index + 1}`;
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
