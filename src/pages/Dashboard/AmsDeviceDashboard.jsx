import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Tag,
  Badge,
  message,
  Progress,
} from 'antd';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  MonitorOutlined,
  DashboardOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';

import './DeviceDashboard.css';
import { useParams } from 'react-router-dom';
import useDashboardDeviceApi from '../../api/useDashboardDeviceApi';
import useDeviceApi from '../../api/useDeviceApi';
import ChartMapData from '../../components/dashboard/ChartMapData';
import { address } from '../../routes/ApiRoute';

const { Title, Text } = Typography;

const AmsDeviceDashboard = () => {
  const {
    deviceId,
    device,
    device_name,
  } = useParams();

  const { requestWebsocketDataApi, readLastDataApi } = useDashboardDeviceApi();
  const { apiDeviceInfo } = useDeviceApi();

  const resolvedDeviceName = device_name || device || '';
  const resolvedDevice = device || '';
  const resolvedDeviceIdNumber = deviceId ? Number(deviceId) : undefined;

  const wsRef = useRef(null);

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

  const [pressureHistory, setPressureHistory] = useState([]);
  const maxHistoryPoints = 30;

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

  const getBatteryColor = (pct) => {
    if (pct > 60) return '#52c41a';
    if (pct > 20) return '#faad14';
    return '#ff4d4f';
  };

  const getPressureColor = (val) => {
    if (val > 5) return '#ef4444';
    if (val > 2) return '#3b82f6';
    return '#22c55e';
  };

  const wsUrl = useMemo(() => {
    if (!resolvedDeviceIdNumber || !resolvedDevice) return null;
    return `${address.WS_DEVICE_DASHBOARD}${resolvedDeviceIdNumber}/${encodeURIComponent(
      resolvedDevice
    )}`;
  }, [resolvedDeviceIdNumber, resolvedDevice]);

  const deviceInfoRef = useRef(deviceInfo);
  useEffect(() => {
    deviceInfoRef.current = deviceInfo;
  }, [deviceInfo]);

  const onWebSocketMessage = useCallback((event) => {
    try {
      let data;
      try {
        const first = JSON.parse(event.data);
        data = typeof first === 'string' ? JSON.parse(first) : first;
      } catch {
        return;
      }

      if (data && data.lastdata) {
        const ld = data.lastdata;

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

        // Update pressure history chart
        const newPressure = typeof ld.flow_rate1 === 'number' ? ld.flow_rate1 : null;
        if (newPressure !== null) {
          const timeLabel = ld.time || new Date().toLocaleTimeString('en-US', { hour12: false });
          setPressureHistory(prev => {
            const updated = [...prev, { time: timeLabel, pressure: newPressure }];
            return updated.length > maxHistoryPoints ? updated.slice(-maxHistoryPoints) : updated;
          });
        }
      }
    } catch {
      // Silent fail
    }
  }, [deviceId, device]);

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
  }, [resolvedDevice, resolvedDeviceIdNumber]);

  const onWebSocketClose = useCallback(() => { }, []);
  const onWebSocketError = useCallback(() => { }, []);

  useEffect(() => {
    if (!wsUrl) return;

    if (wsRef.current) {
      try { wsRef.current.close(); } catch { }
      wsRef.current = null;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.addEventListener('open', onWebSocketOpen);
    ws.addEventListener('message', onWebSocketMessage);
    ws.addEventListener('close', onWebSocketClose);
    ws.addEventListener('error', onWebSocketError);

    return () => {
      try { ws.close(); } catch { }
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };
  }, [wsUrl, onWebSocketOpen, onWebSocketMessage, onWebSocketClose, onWebSocketError]);

  // Dedicated unmount cleanup
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch { }
        wsRef.current = null;
      }
    };
  }, []);

  let raw = deviceInfo.battery;
  let value = Math.max(0, Math.min(raw, 13));
  let batteryPercent = Math.round((value / 13) * 100);

  const pressureVal = deviceInfo.flowRate || 0;

  return (
    <>
      {/* ═══ HEADER ═══ */}
      <Card className="header-card">
        <div className="header-content">
          <div className="device-info">
            <Badge
              color="transparent"
              text={
                <Tag
                  className={`status-tag ${deviceInfo.status === 'Online' ? 'status-online' : 'status-offline'}`}
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
            <Title level={4} className="device-title" style={{ color: 'white' }}>
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
            <Button
              type="default"
              icon={<ReloadOutlined />}
              size="large"
              onClick={handleRefreshData}
              style={{ borderRadius: '8px', fontWeight: 600, color: '#64748b', borderColor: '#cbd5e1' }}
            >
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* ═══ PRESSURE + MAP ═══ */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        {/* Pressure Card */}
        <Col xs={24} md={12}>
          <Card
            style={{
              height: '100%',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              overflow: 'hidden',
            }}
            bodyStyle={{ padding: 0 }}
          >
            {/* Header */}
            <div style={{
              background: '#ffffffff',
              padding: '14px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <DashboardOutlined style={{ fontSize: 20, color: '#60a5fa' }} />
                <Title level={4} style={{ margin: 0, color: '#000000ff', fontWeight: 700 }}>
                  Pressure
                </Title>
              </div>
              <Tag
                color={pressureVal > 5 ? 'red' : pressureVal > 2 ? 'blue' : 'green'}
                style={{ fontSize: 12, padding: '2px 12px', borderRadius: 6, fontWeight: 600 }}
              >
                {pressureVal > 5 ? 'HIGH' : pressureVal > 2 ? 'NORMAL' : 'LOW'}
              </Tag>
            </div>

            {/* Pressure Value + Progress */}
            <div style={{ padding: '24px 24px 16px', background: '#f8fafc' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <Progress
                  type="dashboard"
                  percent={Math.min((pressureVal / (pressureVal > 100 ? 1000 : pressureVal > 20 ? 100 : pressureVal > 10 ? 20 : 10)) * 100, 100)}
                  size={160}
                  strokeColor={{
                    '0%': '#3b82f6',
                    '50%': '#22c55e',
                    '100%': '#ef4444',
                  }}
                  strokeWidth={10}
                  format={() => (
                    <div>
                      <span style={{ fontSize: 36, fontWeight: 800, color: getPressureColor(pressureVal) }}>
                        {pressureVal}
                      </span>
                      <br />
                      <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 600 }}>bar</span>
                    </div>
                  )}
                />
              </div>

              {/* Linear Progress Bar */}
              <div style={{ padding: '0 8px', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>0 bar</Text>
                  <Text style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                    {pressureVal > 100 ? 1000 : pressureVal > 20 ? 100 : pressureVal > 10 ? 20 : 10} bar
                  </Text>
                </div>
                <Progress
                  percent={Math.min((pressureVal / (pressureVal > 100 ? 1000 : pressureVal > 20 ? 100 : pressureVal > 10 ? 20 : 10)) * 100, 100)}
                  showInfo={false}
                  strokeColor={{
                    from: '#3b82f6',
                    to: getPressureColor(pressureVal),
                  }}
                  strokeWidth={12}
                  style={{ marginBottom: 0 }}
                />
              </div>
            </div>
          </Card>
        </Col>

        {/* Map */}
        <Col xs={24} md={12}>
          <div style={{ height: '100%', minHeight: 400 }}>
            <ChartMapData />
          </div>
        </Col>
      </Row>
    </>
  );
};

export default AmsDeviceDashboard;
