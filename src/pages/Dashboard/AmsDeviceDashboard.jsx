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
  Modal,
  Form,
  InputNumber,
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
  SettingOutlined,
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

  const { requestWebsocketDataApi, readLastDataApi, getDeviceThresholdsApi, upsertDeviceThresholdsApi } = useDashboardDeviceApi();
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

  const [thresholds, setThresholds] = useState({ min_val: 0, max_val: 10, high_threshold: 8, low_threshold: 2 });
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [settingsForm] = Form.useForm();

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
    if (val >= thresholds.high_threshold) return '#ef4444';
    if (val <= thresholds.low_threshold) return '#f59e0b';
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

  useEffect(() => {
    const fetchThresholds = async () => {
      if (resolvedDevice) {
        const res = await getDeviceThresholdsApi(resolvedDevice);
        if (res?.status || res?.data) {
          const fetchedData = res?.data?.data || res?.data || res;
          if (fetchedData && typeof fetchedData === 'object' && 'min_val' in fetchedData) {
            setThresholds({
              min_val: fetchedData.min_val ?? 0,
              max_val: fetchedData.max_val ?? 10,
              high_threshold: fetchedData.high_threshold ?? 8,
              low_threshold: fetchedData.low_threshold ?? 2,
            });
            settingsForm.setFieldsValue(fetchedData);
          }
        }
      }
    };
    fetchThresholds();
  }, [resolvedDevice, settingsForm]);

  const handleSettingsSubmit = async (values) => {
    try {
      message.loading({ content: 'Saving thresholds...', key: 'save_thresholds' });
      const payload = { device: resolvedDevice, ...values };
      const res = await upsertDeviceThresholdsApi(payload);
      if (res?.status || res?.data) {
        message.success({ content: 'Thresholds saved successfully!', key: 'save_thresholds', duration: 2 });
        setThresholds(values);
        setIsSettingsModalVisible(false);
      } else {
        message.error({ content: 'Failed to save thresholds!', key: 'save_thresholds', duration: 2 });
      }
    } catch (e) {
      message.error({ content: 'Failed to save thresholds!', key: 'save_thresholds', duration: 2 });
    }
  };

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

  const calculateScaledPressure = useCallback((rawVal) => {
    if (rawVal == null || rawVal === '') return 0;

    const minV = Number(thresholds.min_val != null ? thresholds.min_val : 0);
    const maxV = Number(thresholds.max_val != null ? thresholds.max_val : 100);

    const raw = Number(rawVal);

    const result = Math.min(minV + raw, maxV);

    return Number(result.toFixed(2));
  }, [thresholds]);

  const pressureVal = calculateScaledPressure(deviceInfo.flowRate);

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
                <div onClick={() => setIsSettingsModalVisible(true)} style={{ display: 'flex', alignItems: 'center', marginLeft: 8, cursor: 'pointer', padding: '4px', borderRadius: '50%', background: '#f1f5f9' }}>
                  <SettingOutlined style={{ fontSize: 16, color: '#64748b' }} />
                </div>
              </div>
              <Tag
                color={pressureVal >= thresholds.high_threshold ? 'red' : pressureVal <= thresholds.low_threshold ? 'orange' : 'green'}
                style={{ fontSize: 12, padding: '2px 12px', borderRadius: 6, fontWeight: 600 }}
              >
                {pressureVal >= thresholds.high_threshold ? 'HIGH' : pressureVal <= thresholds.low_threshold ? 'LOW' : 'NORMAL'}
              </Tag>
            </div>

            {/* Pressure Value + Progress */}
            <div style={{ padding: '24px 24px 16px', background: '#f8fafc' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <Progress
                  type="dashboard"
                  percent={Math.min(Math.max((pressureVal - thresholds.min_val) / Math.max(1, (thresholds.max_val - thresholds.min_val)) * 100, 0), 100)}
                  size={160}
                  strokeColor={{
                    '0%': '#f59e0b',
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

      <Modal
        title="Device Threshold Settings"
        visible={isSettingsModalVisible}
        onCancel={() => setIsSettingsModalVisible(false)}
        onOk={() => settingsForm.submit()}
        okText="Save"
      >
        <Form form={settingsForm} layout="vertical" onFinish={handleSettingsSubmit} initialValues={thresholds}>
          <Form.Item
            name="min_val"
            label="Min Value"
            dependencies={['max_val']}
            rules={[{ required: true, message: 'Required' }, ({ getFieldValue }) => ({
              validator(_, value) {
                const maxVal = getFieldValue('max_val');
                if (value == null || maxVal == null || value < maxVal) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Min Value must be strictly smaller than Max Value!'));
              },
            })]}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="max_val"
            label="Max Value"
            dependencies={['min_val']}
            rules={[{ required: true, message: 'Required' }, ({ getFieldValue }) => ({
              validator(_, value) {
                const minVal = getFieldValue('min_val');
                if (value == null || minVal == null || value > minVal) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Max Value must be strictly greater than Min Value!'));
              },
            })]}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="high_threshold"
            label="High Threshold (Alert)"
            dependencies={['low_threshold']}
            rules={[{ required: true, message: 'Required' }, ({ getFieldValue }) => ({
              validator(_, value) {
                const low = getFieldValue('low_threshold');
                if (value == null || low == null || value > low) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('High Threshold must be strictly greater than Low Threshold!'));
              },
            })]}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="low_threshold"
            label="Low Threshold (Alert)"
            dependencies={['high_threshold']}
            rules={[{ required: true, message: 'Required' }, ({ getFieldValue }) => ({
              validator(_, value) {
                const high = getFieldValue('high_threshold');
                if (value == null || high == null || value < high) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Low Threshold must be strictly smaller than High Threshold!'));
              },
            })]}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default AmsDeviceDashboard;
