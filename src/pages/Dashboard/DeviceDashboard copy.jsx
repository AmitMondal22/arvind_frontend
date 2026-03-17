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
} from '@ant-design/icons';
import './DeviceDashboard.css';
import ScheduleDrawer from '../../components/Drawer/ScheduleDrawer';
import { useParams, useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const MAX_ACTIVE_VALVES = 2;
const ONLINE_GRACE_MS = 3 * 60 * 1000; // 3 minutes

// parse bitstring safely
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

// Try to build a Date from separate date/time fields or ISO-like strings.
// Returns null if invalid.
const parseDateTime = (dateStr, timeStr) => {
  const d = (dateStr || '').toString().trim();
  const t = (timeStr || '').toString().trim();

  // If both missing -> invalid
  if (!d && !t) return null;

  // Common cases:
  // 1) d is full ISO: "2025-08-20T08:32:00Z"
  // 2) d is "2025-08-20" and t is "08:32:00"
  // 3) d is "20/08/2025" or "20-08-2025", etc.

  // Attempt ISO direct
  if (d && !t) {
    const iso = new Date(d);
    if (!isNaN(iso.getTime())) return iso;
  }

  // If both exist, try combine "YYYY-MM-DD HH:mm:ss"
  if (d && t) {
    // Try a couple of common formats
    const combos = [
      `${d} ${t}`,
      `${d}T${t}Z`,
      `${d}T${t}`,
    ];
    for (const c of combos) {
      const dt = new Date(c);
      if (!isNaN(dt.getTime())) return dt;
    }
  }

  // Try to normalize DD/MM/YYYY or DD-MM-YYYY with time
  const normalizeDMY = (ds) => {
    const m = ds.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (!m) return null;
    const [_, dd, mm, yyyy] = m;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  };

  const norm = normalizeDMY(d);
  if (norm) {
    const tryStrs = t ? [`${norm} ${t}`, `${norm}T${t}Z`, `${norm}T${t}`] : [norm];
    for (const c of tryStrs) {
      const dt = new Date(c);
      if (!isNaN(dt.getTime())) return dt;
    }
  }

  // Last resort: new Date(d + ' ' + t)
  const fallback = new Date(`${d} ${t}`.trim());
  if (!isNaN(fallback.getTime())) return fallback;

  return null;
};

const initialValveOrder = [
  'valve1',
  'valve2',
  'valve3',
  'valve4',
  'valve5',
  'valve6',
  'valve7',
  'valve8',
  'Pressure',
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
  const resolvedDeviceName = device_name || device || '';
  const resolvedDevice = device || '';
  const resolvedDeviceIdNumber = deviceId ? Number(deviceId) : undefined;

  const wsRef = useRef(null);
  const onlineTimerRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isScheduleDrawerOpen, setIsScheduleDrawerOpen] = useState(false);

  const [deviceInfo, setDeviceInfo] = useState({
    deviceId: resolvedDeviceName || 'UNKNOWN',
    date: '',
    time: '',
    signal: '0%',
    status: 'Offline', // base status; we will compute displayed status separately
    totalFlow: 0,
    flowRate: 0,
    totalPressure: 0,
    battery: 0,
    device_id: deviceId,
    device: device,
  });

  const [lastMessageAt, setLastMessageAt] = useState(null); // Date or null

  const [doStatusBits, setDoStatusBits] = useState(Array(9).fill(false));
  const [diStatusBits, setDiStatusBits] = useState(Array(9).fill(false));

  const valveStates = useMemo(() => {
    const obj = {};
    initialValveOrder.forEach((key, idx) => {
      obj[key] = !!doStatusBits[idx];
    });
    return obj;
  }, [doStatusBits]);

  const activeValveCountV1toV8 = useMemo(() => {
    return initialValveOrder.slice(0, 8).reduce((acc, key, idx) => {
      return acc + (doStatusBits[idx] ? 1 : 0);
    }, 0);
  }, [doStatusBits]);

  // Computed online/offline per rule:
  // - If date/time are empty or invalid => Offline
  // - Else, if now - lastMessageAt <= 3 minutes => Online, else Offline
  const computedStatus = useMemo(() => {
    if (!lastMessageAt || isNaN(lastMessageAt.getTime())) return 'Offline';
    const age = Date.now() - lastMessageAt.getTime();
    return age <= ONLINE_GRACE_MS ? 'Online' : 'Offline';
  }, [lastMessageAt]);

  // Also compute safe display of date/time; if invalid show empty
  const displayDate = deviceInfo.date || '';
  const displayTime = deviceInfo.time || '';

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

  // Toggle valves with MAX_ACTIVE limit on V1–V8
  const handleValveToggle = (key) => {
    const idx = initialValveOrder.indexOf(key);
    if (idx === -1) return;

    const isCurrentlyOn = doStatusBits[idx];

    // enforce MAX ACTIVE only for V1–V8 if turning ON
    if (!isCurrentlyOn && idx < 8) {
      if (activeValveCountV1toV8 >= MAX_ACTIVE_VALVES) {
        message.warning(`Only ${MAX_ACTIVE_VALVES} valves can be active at once.`);
        return;
      }
    }

    // update UI immediately
    const newBits = [...doStatusBits];
    newBits[idx] = !isCurrentlyOn;
    setDoStatusBits(newBits);

    // send command also
    handleSendCommand(newBits);
  };

  // Send command
  const handleSendCommand = async (bitsToSend = doStatusBits) => {
    if (!resolvedDeviceName || !resolvedDeviceIdNumber) {
      message.error('Missing device identifiers.');
      return;
    }
    setIsLoading(true);

    const commandData = convertValveStatesToCommand(
      resolvedDeviceName,
      resolvedDeviceIdNumber,
      bitsToSend
    );

    console.log('Send Command Data:', JSON.stringify(commandData, null, 2));
    try {
      await new Promise((res) => setTimeout(res, 1000)); // simulate sending
      message.success('Command sent successfully');
    } catch (err) {
      console.error(err);
      message.error('Failed to send command');
    } finally {
      setIsLoading(false);
    }
  };

  const wsUrl = useMemo(() => {
    if (!resolvedDeviceIdNumber || !resolvedDevice) return null;
    return `wss://wfmsapi.iotblitz.com/api/water_ms_routes/water_station/WFMS/1/${resolvedDeviceIdNumber}/${encodeURIComponent(
      resolvedDevice
    )}`;
  }, [resolvedDeviceIdNumber, resolvedDevice]);

  // When a valid message arrives, set lastMessageAt and data
  const onWebSocketMessage = useCallback((event) => {
    try {
      const data = JSON.parse(JSON.parse(event.data));
      if (data.lastdata) {
        const ld = data.lastdata;

        // Extract and store raw strings for display
        const nextDate = typeof ld.date === 'string' ? ld.date : '';
        const nextTime = typeof ld.time === 'string' ? ld.time : '';

        // Determine message timestamp
        const ts = parseDateTime(nextDate, nextTime);
        // If invalid datetime, we still store raw for UI, but status will be Offline via computedStatus
        if (ts) {
          setLastMessageAt(ts);
        } else {
          // Keep lastMessageAt unchanged if payload has no usable date/time
          // Optionally, could set to null to force Offline:
          setLastMessageAt(null);
        }

        setDeviceInfo((prev) => ({
          ...prev,
          deviceId: ld.device || prev.deviceId,
          date: nextDate,
          time: nextTime,
          // base status is not used directly for rendering; computedStatus is primary
          status: 'Online',
          totalFlow: typeof ld.total_flow1 === 'number' ? ld.total_flow1 : prev.totalFlow,
          flowRate: typeof ld.flow_rate1 === 'number' ? ld.flow_rate1 : prev.flowRate,
          totalPressure: typeof ld.pressure === 'number' ? ld.pressure : prev.totalPressure,
          battery: typeof ld.bat_v === 'number' ? Number(ld.bat_v) : prev.battery,
          device_id: deviceId,
          device: device,
        }));

        if (typeof ld.di_status === 'string') {
          setDiStatusBits(parseBitString(ld.di_status, 9));
        }
        if (typeof ld.do_status === 'string') {
          setDoStatusBits(parseBitString(ld.do_status, 9));
        }
      }
    } catch (e) {
      console.error('WS error:', e);
    }
  }, [deviceId, device]);

  const onWebSocketOpen = useCallback(() => {
    // Do not mark Online here; rely on data recency
  }, []);

  const onWebSocketClose = useCallback(() => {
    // On close, we don't immediately flip to Offline if recent data was within 3 minutes
    // Let computedStatus handle transition as time elapses.
  }, []);

  const onWebSocketError = useCallback((err) => {
    console.error('WebSocket error:', err);
  }, []);

  // Maintain a 1-second timer to refresh computedStatus reactively
  useEffect(() => {
    if (onlineTimerRef.current) {
      clearInterval(onlineTimerRef.current);
      onlineTimerRef.current = null;
    }
    onlineTimerRef.current = setInterval(() => {
      // trigger re-render to recompute computedStatus
      // by updating a dummy state derived from lastMessageAt age
      // Easiest: setLastMessageAt to itself to trigger no-op? Instead toggle a local tick.
      // We'll use a no-op set on deviceInfo to trigger render safely:
      setDeviceInfo((prev) => ({ ...prev }));
    }, 1000);

    return () => {
      if (onlineTimerRef.current) {
        clearInterval(onlineTimerRef.current);
        onlineTimerRef.current = null;
      }
    };
  }, []);

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

  return (
    <>
      {/* HEADER */}
      <Card className="header-card">
        <div className="header-content">
          <div className="device-info">
            <Badge
              color="transparent" 
              text={
                <Tag
                  className={`status-tag ${computedStatus === 'Online' ? 'status-online' : 'status-offline'}`}
                  icon={computedStatus === 'Online' ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
                >
                  {computedStatus}
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
              {displayDate}
              <ClockCircleOutlined style={{ margin: '0 6px' }} />
              {displayTime}
            </Text>
            <div className="signal-info">
              <WifiOutlined
                style={{ color: getSignalColor(deviceInfo.signal), fontSize: '18px' }}
              />
              <Text style={{ minWidth: '70px', fontWeight: '600' }}>{deviceInfo.signal}</Text>
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

      {/* Solenoid Valve Control */}
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
            const isOn = !!doStatusBits[index];
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
        <Row gutter={[16, 24]} wrap>
          {initialValveOrder.map((key, index) => {
            const isActive = !!diStatusBits[index];
            const labelShort = key === "Pressure" ? "P" : `V${index + 1}`;

            return (
              <Col
                key={key}
                xs={8} // 3 columns on mobile (24 / 8 = 3)
                sm={6} // 4 columns on small tablets (24 / 6 = 4)
                md={4} // 6 columns on medium tablets (24 / 4 = 6)
                lg={3} // 8 columns on small desktop (24 / 3 = 8)
                flex="1 0 11%" // fallback for wide screens (≈ 9 columns)
                style={{ maxWidth: "11.11%" }}
              >
                <div
                  className={`status-item ${isActive ? "status-active" : "status-inactive"}`}
                >
                  <Text className="status-label">{labelShort}</Text>
                  <div className="status-indicator">
                    <div
                      className={`status-circle ${isActive ? "status-active" : "status-inactive"}`}
                    >
                      {isActive ? (
                        <CheckCircleOutlined className="status-circle-icon active" />
                      ) : (
                        <PoweroffOutlined className="status-circle-icon inactive" />
                      )}
                      {isActive && <div className="status-ripple" />}
                    </div>
                    <Text className={`status-text ${isActive ? "active" : "inactive"}`}>
                      {isActive ? "ACTIVE" : "STANDBY"}
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
