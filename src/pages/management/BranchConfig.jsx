import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  Card, Button, Switch, message, Typography, Space, Tag, Badge,
  Tooltip, Empty, Spin, Row, Col, TimePicker, Form, Select,
  Checkbox, Divider, Segmented, Table
} from 'antd';
import {
  ArrowLeftOutlined, BranchesOutlined, ReloadOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
  ApiOutlined, ScheduleOutlined, ControlOutlined, SaveOutlined,
  PoweroffOutlined, ClockCircleOutlined,
  FullscreenOutlined, FullscreenExitOutlined,
  EnvironmentOutlined, InfoCircleOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import useBranchApi from '../../api/useBranchApi';
import { useAuth } from '../../context/AuthContext';
import dayjs from 'dayjs';

// Leaflet map imports
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// React Icons for device markers
import { renderToStaticMarkup } from 'react-dom/server';
import { MdSensors } from 'react-icons/md';

const { Title, Text } = Typography;
const { Option } = Select;

/* ─── Helpers ─── */
function parseTimeToDayjs(v) {
  if (!v) return null;
  const parts = String(v).split(':');
  if (parts.length < 2) return null;
  const [hh, mm, ss = '00'] = parts;
  return dayjs(`${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${ss.padStart(2, '0')}`, 'HH:mm:ss');
}

const dayOptions = [
  { label: 'Sunday', shortLabel: 'Sun', value: 'sun' },
  { label: 'Monday', shortLabel: 'Mon', value: 'mon' },
  { label: 'Tuesday', shortLabel: 'Tue', value: 'tue' },
  { label: 'Wednesday', shortLabel: 'Wed', value: 'wed' },
  { label: 'Thursday', shortLabel: 'Thu', value: 'thu' },
  { label: 'Friday', shortLabel: 'Fri', value: 'fri' },
  { label: 'Saturday', shortLabel: 'Sat', value: 'sat' }
];

const valveList = [1, 2, 3, 4, 5, 6];

const settingTypeOptions = [
  { label: 'Auto (Timer)', value: 0 },
  { label: 'Manual', value: 1 }
];

const slotOptions = [
  { label: 'Slot 1', value: 0 },
  { label: 'Slot 2', value: 1 },
  { label: 'Slot 3', value: 2 }
];

/* ─── Shared Styles ─── */
const glassCard = {
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(255,255,255,0.95)',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
};

/* ─── Custom Leaflet Marker Icons (with animated pulse) ─── */
function createDeviceIcon(isOnline) {
  const color = isOnline ? '#22c55e' : '#ef4444';
  const pulseClass = isOnline ? 'marker-pulse-online' : 'marker-pulse-offline';

  const svgMarkup = renderToStaticMarkup(
    <div style={{ position: 'relative', width: 48, height: 48 }}>
      {/* Pulse ring */}
      <div className={pulseClass} style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        borderRadius: '50%',
      }} />
      {/* Icon body */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: 48, height: 48, borderRadius: '50%',
        background: isOnline
          ? 'linear-gradient(145deg, #22c55e, #16a34a)'
          : 'linear-gradient(145deg, #ef4444, #dc2626)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isOnline
          ? '0 4px 14px rgba(34,197,94,0.45), inset 0 1px 2px rgba(255,255,255,0.3)'
          : '0 4px 14px rgba(239,68,68,0.45), inset 0 1px 2px rgba(255,255,255,0.3)',
        border: '3px solid rgba(255,255,255,0.85)',
      }}>
        <MdSensors style={{ fontSize: 24, color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }} />
      </div>
    </div>
  );

  return L.divIcon({
    html: svgMarkup,
    className: 'custom-device-marker',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -28],
  });
}

/* ─── Map Auto-fit component ─── */
function FitBounds({ devices }) {
  const map = useMap();
  useEffect(() => {
    const validDevices = devices.filter(d => d.lat && d.lon);
    if (validDevices.length === 0) return;
    if (validDevices.length === 1) {
      map.setView([parseFloat(validDevices[0].lat), parseFloat(validDevices[0].lon)], 15);
      return;
    }
    const bounds = L.latLngBounds(validDevices.map(d => [parseFloat(d.lat), parseFloat(d.lon)]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [devices, map]);
  return null;
}

/* ═══════════════════════════════════════════════
   BRANCH CONFIG PAGE
   ═══════════════════════════════════════════════ */
const BranchConfig = () => {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const clientId = user?.client_id || 1;

  const {
    getBranchConfig, switchBranchAll,
    scheduleSaveBranchAll, scheduleResetBranchAll
  } = useBranchApi();

  const [loading, setLoading] = useState(true);
  const [branchInfo, setBranchInfo] = useState(null);
  const [summary, setSummary] = useState({ total_devices: 0, active_devices: 0 });
  const [devices, setDevices] = useState([]);
  const [branchSchedule, setBranchSchedule] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const timerRef = useRef(null);

  // Mode: 'manual' or 'scheduling'
  const [activeMode, setActiveMode] = useState('manual');

  // Manual mode: per-valve loading state
  const [switchLoading, setSwitchLoading] = useState({});

  // Scheduling mode state
  const [schedValve, setSchedValve] = useState(null);
  const [schedSlot, setSchedSlot] = useState(undefined);
  const [schedSetting, setSchedSetting] = useState(undefined);
  const [schedStatus, setSchedStatus] = useState(true);
  const [selectedDays, setSelectedDays] = useState(dayOptions.map(d => d.value));
  const [scheduleForm] = Form.useForm();
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Map state
  const [mapExpanded, setMapExpanded] = useState(false);

  // Live clock
  useEffect(() => {
    timerRef.current = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Fetch branch config
  const fetchConfig = async () => {
    setLoading(true);
    const res = await getBranchConfig({ client_id: clientId, branch_id: parseInt(branchId) });
    if (res?.status && res.data) {
      setBranchInfo(res.data.branch || null);
      setSummary(res.data.summary || {});
      setDevices(res.data.devices || []);
      setBranchSchedule(res.data.branch_schedule || {});
    } else {
      message.error(res?.error || 'Failed to load branch configuration');
    }
    setLoading(false);
  };

  useEffect(() => { fetchConfig(); }, [branchId]);

  /* ═══ MODE CHANGE ═══ */
  const handleModeChange = (val) => {
    setActiveMode(val);
    setSchedValve(null);
    setSchedSlot(undefined);
    setSchedSetting(undefined);
    setSchedStatus(true);
    scheduleForm.resetFields();
    setSelectedDays(dayOptions.map(d => d.value));
  };

  /* ═══ MANUAL MODE: Valve toggle ═══ */
  const handleValveToggle = async (valveNo, checked) => {
    const key = `valve_${valveNo}`;
    setSwitchLoading(prev => ({ ...prev, [key]: true }));
    const res = await switchBranchAll({
      branch_id: parseInt(branchId),
      do_no: valveNo,
      value: checked ? 1 : 0,
      client_id: clientId
    });
    if (res?.status) {
      message.success(`Valve ${valveNo} ${checked ? 'ON' : 'OFF'} — sent to all devices`);
      fetchConfig();
    } else {
      message.error(res?.error || 'Switch command failed');
    }
    setSwitchLoading(prev => ({ ...prev, [key]: false }));
  };

  /* ═══ SCHEDULING MODE ═══ */
  const handleSelectValve = (valveNo) => {
    setSchedValve(valveNo);
    setSchedSlot(undefined);
    setSchedSetting(undefined);
    setSchedStatus(true);
    scheduleForm.resetFields();
    setSelectedDays(dayOptions.map(d => d.value));

    // Prefer branch_schedule (group schedule) over individual device schedules
    const bs = branchSchedule?.[`valve_${valveNo}`] || {};
    if (bs.has_schedule) {
      setSchedSetting(bs.do_type);
      if (bs.slot !== undefined && bs.slot !== null) setSchedSlot(Number(bs.slot));
      if (bs.status !== undefined && bs.status !== null) setSchedStatus(Number(bs.status) === 1);
      scheduleForm.setFieldsValue({
        one_on_time: parseTimeToDayjs(bs.one_on_time),
        one_off_time: parseTimeToDayjs(bs.one_off_time)
      });
      if (bs.days) setSelectedDays(bs.days.split(','));
      return;
    }

    // Fallback: check per-device schedules
    for (const device of devices) {
      const vd = device.valves?.[`valve_${valveNo}`] || {};
      if (vd.has_schedule) {
        setSchedSetting(vd.do_type);
        if (vd.slot !== undefined && vd.slot !== null) setSchedSlot(Number(vd.slot));
        if (vd.status !== undefined && vd.status !== null) setSchedStatus(Number(vd.status) === 1);
        scheduleForm.setFieldsValue({
          one_on_time: parseTimeToDayjs(vd.one_on_time),
          one_off_time: parseTimeToDayjs(vd.one_off_time)
        });
        if (vd.days) setSelectedDays(vd.days.split(','));
        break;
      }
    }
  };

  const handleSaveSchedule = async () => {
    if (schedValve === null) { message.warning('Please select a valve first'); return; }
    if (schedSlot === undefined) { message.warning('Please select a Slot first'); return; }
    if (schedSetting === undefined) { message.warning('Please select a Setting Type'); return; }
    const values = scheduleForm.getFieldsValue();
    const payload = {
      branch_id: parseInt(branchId),
      organization_id: branchInfo?.organization_id,
      do_type: schedSetting,
      do_no: schedValve,
      one_on_time: values.one_on_time ? dayjs(values.one_on_time).format('HH:mm:ss') : '00:00:00',
      one_off_time: values.one_off_time ? dayjs(values.one_off_time).format('HH:mm:ss') : '00:00:00',
      two_on_time: '00:00:00',
      two_off_time: '00:00:00',
      datalog_sec: 120,
      days: selectedDays.join(','),
      slot: schedSlot,
      status: schedStatus ? 1 : 0,
      client_id: clientId
    };
    setScheduleLoading(true);
    const res = await scheduleSaveBranchAll(payload);
    if (res?.status) {
      message.success('Schedule saved to all devices!');
      fetchConfig();
    } else message.error(res?.error || 'Failed to save schedule');
    setScheduleLoading(false);
  };

  const handleResetSchedule = async () => {
    if (schedValve === null) { message.warning('Please select a valve first'); return; }
    setScheduleLoading(true);
    const res = await scheduleResetBranchAll({
      branch_id: parseInt(branchId),
      do_no: schedValve,
      client_id: clientId
    });
    if (res?.status) {
      message.success('Schedule reset for all devices!');
      scheduleForm.resetFields();
      setSchedSlot(undefined);
      setSchedSetting(undefined);
      setSchedStatus(true);
      setSelectedDays(dayOptions.map(d => d.value));
      fetchConfig();
    } else message.error(res?.error || 'Failed to reset');
    setScheduleLoading(false);
  };

  /* ═══ DEVICE NAVIGATION ═══ */
  const navigateToDevice = (device) => {
    const orgId = branchInfo?.organization_id || '';
    const projId = branchInfo?.project_id || '';
    const orgName = encodeURIComponent(branchInfo?.organization_name || '');
    const projName = encodeURIComponent(branchInfo?.project_name || '');
    const deviceId = device.device_id;
    const deviceUid = device.device;
    const deviceName = encodeURIComponent(device.device_name || device.device);
    const deviceType = (device.device_type || 'OMS').toUpperCase();

    if (deviceType === 'AMS') {
      navigate(`/ams-device/${orgId}/${projId}/${deviceId}/${deviceUid}/${deviceName}/${orgName}/${projName}`);
    } else {
      navigate(`/device/${orgId}/${projId}/${deviceId}/${deviceUid}/${deviceName}/${orgName}/${projName}`);
    }
  };

  const allDaysChecked = selectedDays.length === dayOptions.length;
  const indeterminate = selectedDays.length > 0 && selectedDays.length < dayOptions.length;
  const timeStr = currentTime.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  // Devices with valid coordinates for the map
  const mappableDevices = useMemo(() =>
    devices.filter(d => d.lat && d.lon && !isNaN(parseFloat(d.lat)) && !isNaN(parseFloat(d.lon))),
    [devices]
  );

  // Map center — use first device or India center default
  const defaultCenter = useMemo(() => {
    if (mappableDevices.length > 0) {
      return [parseFloat(mappableDevices[0].lat), parseFloat(mappableDevices[0].lon)];
    }
    return [22.5726, 78.9629]; // India center
  }, [mappableDevices]);

  /* ─── Device Table Columns ─── */
  const deviceColumns = [
    {
      title: '#', key: 'idx', width: 50,
      render: (_, __, i) => (
        <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>{i + 1}</span>
      )
    },
    {
      title: 'Device Name', dataIndex: 'device_name', key: 'device_name',
      render: (text, record) => (
        <div>
          <Text strong style={{ fontSize: 13, color: '#1e293b', display: 'block' }}>
            {text || record.device}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>UID: {record.device}</Text>
        </div>
      )
    },
    {
      title: 'Model', dataIndex: 'model', key: 'model',
      render: (text) => <Text type="secondary" style={{ fontSize: 12 }}>{text || '—'}</Text>
    },
    {
      title: 'Type', dataIndex: 'device_type', key: 'device_type',
      render: (text) => (
        <Tag color={text === 'AMS' ? 'green' : 'blue'} style={{ borderRadius: 6, fontSize: 13 }}>
          {text || 'OMS'}
        </Tag>
      )
    },
    {
      title: 'Status', key: 'status',
      render: (_, record) => {
        const isOnline = record.status === 'online';
        return (
          <Tag
            color={isOnline ? 'success' : 'default'}
            icon={isOnline ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            style={{ borderRadius: 6, fontSize: 13 }}
          >
            {isOnline ? 'Online' : 'Offline'}
          </Tag>
        );
      }
    },
    {
      title: 'Valves', key: 'valves',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {valveList.map(v => {
            const vd = record.valves?.[`valve_${v}`] || {};
            return (
              <Tag key={v}
                color={vd.has_schedule ? (vd.do_type === 0 ? 'green' : 'orange') : 'default'}
                style={{ fontSize: 11, padding: '1px 6px', margin: 0, borderRadius: 4 }}>
                V{v}: {vd.has_schedule ? (vd.do_type === 0 ? 'A' : 'M') : '—'}
              </Tag>
            );
          })}
        </div>
      )
    },
    {
      title: 'Action', key: 'action', width: 80,
      render: (_, record) => (
        <Tooltip title="Open Device Dashboard">
          <Button
            type="primary" size="small"
            icon={<ExportOutlined />}
            onClick={() => navigateToDevice(record)}
            style={{
              borderRadius: 8, background: '#1e293b', borderColor: '#1e293b',
              fontWeight: 600, fontSize: 13,
            }}
          >
            View
          </Button>
        </Tooltip>
      )
    },
  ];

  /* ─── Loading / Not Found ─── */
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" tip="Loading branch configuration..." />
      </div>
    );
  }
  if (!branchInfo) {
    return (
      <div style={{ padding: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/management/branch')} style={{ marginBottom: 16 }}>
          Back to Branches
        </Button>
        <Empty description="Branch not found" />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════ */
  return (
    <div style={{ padding: '16px 20px', maxWidth: 1400, margin: '0 auto' }}>

      {/* ─── Back Button ─── */}
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/management/branch')}
        style={{
          marginBottom: 16, borderRadius: 8, fontWeight: 500,
          border: '1px solid #e2e8f0', color: '#475569'
        }}
      >
        Back to Branch List
      </Button>

      {/* ═══ HEADER BAR ═══ */}
      <div style={{
        background: '#fff',
        borderRadius: '16px 16px 0 0',
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(59,130,246,0.25)',
          }}>
            <BranchesOutlined style={{ fontSize: 24, color: '#fff' }} />
          </div>
          <div>
            <Title level={3} style={{ margin: 0, color: '#0f172a', letterSpacing: -0.3 }}>
              {branchInfo.branch_name || 'BRANCH'}
            </Title>
            <Text style={{ color: '#64748b', fontSize: 14 }}>
              {branchInfo.branch_number} • {branchInfo.organization_name} • {branchInfo.project_name}
            </Text>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {[
            { label: 'Total Devices', value: summary.total_devices || 0, color: '#0f172a' },
            { label: 'Online', value: summary.active_devices || 0, color: '#16a34a' },
          ].map((s, i) => (
            <div key={i} style={{
              textAlign: 'center',
              background: '#f8fafc', borderRadius: 10, padding: '8px 16px',
              border: '1px solid #f1f5f9',
            }}>
              <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {s.label}
              </Text>
              <Text style={{ color: s.color, fontSize: 22, fontWeight: 700 }}>{s.value}</Text>
            </div>
          ))}

          <Button icon={<ReloadOutlined />} onClick={fetchConfig} size="large"
            style={{
              borderRadius: 10, fontWeight: 600,
              background: '#f8fafc', borderColor: '#e2e8f0', color: '#1e293b',
            }}
          >
            Refresh
          </Button>
        </div>
      </div>



      {/* ═══════════════════════════════════════════════
         OPENSTREETMAP — Device Location Map
         ═══════════════════════════════════════════════ */}
      <div style={{ marginTop: 28 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #f59e0b, #f97316)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <EnvironmentOutlined style={{ fontSize: 18, color: '#fff' }} />
            </div>
            <div>
              <Title level={5} style={{ margin: 0, color: '#1e293b' }}>
                Device Map
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {mappableDevices.length} device{mappableDevices.length !== 1 ? 's' : ''} on map
                {mappableDevices.length < devices.length && (
                  <span style={{ color: '#f59e0b' }}> • {devices.length - mappableDevices.length} without location</span>
                )}
              </Text>
            </div>
          </div>

          <Space>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', border: '2px solid #16a34a' }} />
                <Text style={{ fontSize: 13, color: '#64748b' }}>Online</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', border: '2px solid #dc2626' }} />
                <Text style={{ fontSize: 13, color: '#64748b' }}>Offline</Text>
              </div>
            </div>
            <Tooltip title={mapExpanded ? 'Minimize Map' : 'Maximize Map'}>
              <Button
                icon={mapExpanded ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                onClick={() => setMapExpanded(!mapExpanded)}
                style={{
                  borderRadius: 8, fontWeight: 600,
                  background: mapExpanded ? '#1e293b' : '#fff',
                  color: mapExpanded ? '#fff' : '#1e293b',
                  borderColor: '#1e293b',
                }}
              >
                {mapExpanded ? 'Minimize' : 'Full Screen'}
              </Button>
            </Tooltip>
          </Space>
        </div>

        <Card
          style={{
            ...glassCard,
            overflow: 'hidden',
            height: mapExpanded ? 'calc(100vh - 100px)' : 420,
            transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          bodyStyle={{ padding: 0, height: '100%' }}
        >
          {mappableDevices.length === 0 ? (
            <div style={{
              height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#f8fafc',
            }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div>
                    <Text type="secondary" style={{ fontSize: 14 }}>No device location data available</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>Devices need latitude & longitude configured</Text>
                  </div>
                }
              />
            </div>
          ) : (
            <MapContainer
              center={defaultCenter}
              zoom={13}
              style={{ height: '100%', width: '100%', borderRadius: 16 }}
              scrollWheelZoom={true}
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds devices={mappableDevices} />

              {mappableDevices.map(device => {
                const isOnline = device.status === 'online';
                const lat = parseFloat(device.lat);
                const lon = parseFloat(device.lon);
                const scheduledCount = Object.values(device.valves || {}).filter(v => v.has_schedule).length;

                return (
                  <Marker
                    key={device.device_id}
                    position={[lat, lon]}
                    icon={createDeviceIcon(isOnline)}
                  >
                    <Popup minWidth={300} maxWidth={360} className="premium-popup">
                      <div style={{ margin: '-12px -16px' }}>
                        {/* ── Gradient Header ── */}
                        <div style={{
                          background: isOnline
                            ? 'linear-gradient(135deg, #059669, #10b981)'
                            : 'linear-gradient(135deg, #dc2626, #ef4444)',
                          padding: '14px 18px',
                          borderRadius: '14px 14px 0 0',
                          display: 'flex', alignItems: 'center', gap: 12,
                        }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: 'rgba(255,255,255,0.2)',
                            backdropFilter: 'blur(8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid rgba(255,255,255,0.25)',
                            flexShrink: 0,
                          }}>
                            <MdSensors style={{ fontSize: 22, color: '#fff' }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontWeight: 700, fontSize: 15, color: '#fff',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              textShadow: '0 1px 3px rgba(0,0,0,0.15)',
                            }}>
                              {device.device_name || device.device}
                            </div>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>
                              UID: {device.device}
                            </div>
                          </div>
                          <div style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                            background: 'rgba(255,255,255,0.25)',
                            color: '#fff', letterSpacing: 0.5,
                            backdropFilter: 'blur(4px)',
                            border: '1px solid rgba(255,255,255,0.2)',
                          }}>
                            {isOnline ? '● ONLINE' : '● OFFLINE'}
                          </div>
                        </div>

                        {/* ── Info Body ── */}
                        <div style={{ padding: '14px 18px' }}>
                          {/* Stats Grid */}
                          <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr',
                            gap: 8, marginBottom: 14,
                          }}>
                            {[
                              { label: 'Model', value: device.model || '—', icon: '📟' },
                              { label: 'Type', value: device.device_type || 'OMS', icon: '🏷️' },
                              { label: 'Scheduled', value: `${scheduledCount}/6 valves`, icon: '📅' },
                              { label: 'Coordinates', value: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, icon: '📍' },
                            ].map((item, idx) => (
                              <div key={idx} style={{
                                background: '#f8fafc', borderRadius: 10, padding: '8px 10px',
                                border: '1px solid #f1f5f9',
                              }}>
                                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                                  {item.icon} {item.label}
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                                  {item.value}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Valve Status */}
                          <div style={{
                            background: '#f8fafc', borderRadius: 10, padding: '10px 12px',
                            border: '1px solid #f1f5f9', marginBottom: 14,
                          }}>
                            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                              ⚙️ Valve Status
                            </div>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                              {valveList.map(v => {
                                const vd = device.valves?.[`valve_${v}`] || {};
                                const isAuto = vd.do_type === 0;
                                return (
                                  <span key={v} style={{
                                    padding: '3px 8px', borderRadius: 6, fontSize: 12,
                                    fontWeight: 700, letterSpacing: 0.3,
                                    background: vd.has_schedule
                                      ? (isAuto ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)' : 'linear-gradient(135deg, #ffedd5, #fed7aa)')
                                      : '#f1f5f9',
                                    color: vd.has_schedule
                                      ? (isAuto ? '#15803d' : '#c2410c')
                                      : '#94a3b8',
                                    border: vd.has_schedule
                                      ? `1px solid ${isAuto ? '#86efac' : '#fdba74'}`
                                      : '1px solid #e2e8f0',
                                  }}>
                                    V{v} {vd.has_schedule ? (isAuto ? '✓' : 'M') : '—'}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          {/* Navigate Button */}
                          <button
                            onClick={() => navigateToDevice(device)}
                            className="popup-navigate-btn"
                            style={{
                              width: '100%', padding: '10px 0', borderRadius: 10,
                              border: 'none', cursor: 'pointer', fontWeight: 700,
                              fontSize: 13, color: '#fff',
                              background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                              boxShadow: '0 4px 14px rgba(15,23,42,0.3)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                              transition: 'all 0.2s ease',
                              letterSpacing: 0.3,
                            }}
                          >
                            <ExportOutlined style={{ fontSize: 14 }} />
                            Open Device Dashboard
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          )}
        </Card>
      </div>


      {/* ═══ MODE SELECTOR ═══ */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0', borderTop: 'none',
        padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Segmented
          size="large"
          value={activeMode}
          onChange={handleModeChange}
          options={[
            {
              label: (
                <Space style={{ padding: '4px 16px' }}>
                  <ControlOutlined style={{ fontSize: 18 }} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Manual Control</span>
                </Space>
              ),
              value: 'manual',
            },
            {
              label: (
                <Space style={{ padding: '4px 16px' }}>
                  <ScheduleOutlined style={{ fontSize: 18 }} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Scheduling</span>
                </Space>
              ),
              value: 'scheduling',
            },
          ]}
          style={{ borderRadius: 12, padding: 4 }}
        />
      </div>

      {/* ═══════════════════════════════════════════════
         MODE: MANUAL CONTROL — 6 Valve ON/OFF Buttons
         ═══════════════════════════════════════════════ */}
      {activeMode === 'manual' && (
        <div style={{
          ...glassCard,
          borderRadius: '0 0 16px 16px',
          borderTop: 'none',
          padding: '28px 24px',
        }}>
          <div style={{ marginBottom: 20 }}>
            <Title level={4} style={{ margin: 0, color: '#1e293b' }}>
              <ControlOutlined style={{ marginRight: 10, color: '#3b82f6' }} />
              Outlet Valve Control
            </Title>
            <Text type="secondary" style={{ fontSize: 14, marginTop: 4, display: 'block' }}>
              Toggle valves ON or OFF for all devices in this branch
            </Text>
          </div>

          <Row gutter={[16, 16]}>
            {valveList.map(valveNo => {
              const key = `valve_${valveNo}`;
              const isLd = switchLoading[key] || false;

              // Use branchSchedule first, then fallback to device-level
              const bs = branchSchedule?.[`valve_${valveNo}`] || {};
              let hasAnySchedule = bs.has_schedule || false;
              let settingType = bs.do_type ?? null;
              if (!hasAnySchedule) {
                for (const device of devices) {
                  const vd = device.valves?.[`valve_${valveNo}`] || {};
                  if (vd.has_schedule) {
                    hasAnySchedule = true;
                    settingType = vd.do_type;
                    break;
                  }
                }
              }

              return (
                <Col xs={12} sm={8} md={4} key={valveNo}>
                  <Card
                    style={{
                      borderRadius: 14, textAlign: 'center',
                      border: '1px solid #e2e8f0', background: '#fff',
                      transition: 'all 0.25s ease', overflow: 'hidden',
                    }}
                    bodyStyle={{ padding: '20px 12px' }}
                    hoverable
                  >
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 14px',
                      border: '2px solid #bfdbfe',
                    }}>
                      <PoweroffOutlined style={{ fontSize: 22, color: '#3b82f6' }} />
                    </div>

                    <Text strong style={{ fontSize: 14, color: '#1e293b', display: 'block', marginBottom: 12 }}>
                      Valve {valveNo}
                    </Text>

                    <Switch
                      loading={isLd}
                      checkedChildren={<span style={{ fontSize: 13, fontWeight: 700, padding: '0 4px' }}>ON</span>}
                      unCheckedChildren={<span style={{ fontSize: 13, fontWeight: 700, padding: '0 4px' }}>OFF</span>}
                      onChange={(checked) => handleValveToggle(valveNo, checked)}
                      style={{ minWidth: 56 }}
                    />

                    <div style={{ marginTop: 10, minHeight: 22 }}>
                      {hasAnySchedule ? (
                        <Tag color={settingType === 0 ? 'green' : 'orange'}
                          style={{ fontSize: 11, padding: '2px 8px', margin: 0, borderRadius: 4 }}>
                          {settingType === 0 ? 'AUTO' : 'MANUAL'}
                        </Tag>
                      ) : (
                        <Tag style={{ fontSize: 11, padding: '2px 8px', margin: 0, borderRadius: 4, color: '#94a3b8' }}>
                          NO SCHEDULE
                        </Tag>
                      )}
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
         MODE: SCHEDULING
         ═══════════════════════════════════════════════ */}
      {activeMode === 'scheduling' && (
        <div style={{
          ...glassCard,
          borderRadius: '0 0 16px 16px',
          borderTop: 'none',
          padding: '28px 24px',
        }}>
          <div style={{ marginBottom: 24 }}>
            <Title level={4} style={{ margin: 0, color: '#1e293b' }}>
              <ScheduleOutlined style={{ marginRight: 10, color: '#8b5cf6' }} />
              Manage Scheduling
            </Title>
            <Text type="secondary" style={{ fontSize: 14, marginTop: 4, display: 'block' }}>
              Configure scheduling for all devices in this branch
            </Text>
          </div>

          {/* Select Valve */}
          <div style={{ marginBottom: 24 }}>
            <Text strong style={{ display: 'block', marginBottom: 10, fontSize: 14, color: '#475569' }}>
              Select Valve
            </Text>
            <Row gutter={[10, 10]}>
              {valveList.map(v => {
                const isSelectedValve = schedValve === v;
                // Use branchSchedule first, then fallback to device-level
                const bs = branchSchedule?.[`valve_${v}`] || {};
                let hasSchedule = bs.has_schedule || false;
                let doType = bs.do_type ?? null;
                let onTime = bs.one_on_time ? String(bs.one_on_time).substring(0, 5) : '';
                let offTime = bs.one_off_time ? String(bs.one_off_time).substring(0, 5) : '';
                if (!hasSchedule) {
                  for (const device of devices) {
                    const vd = device.valves?.[`valve_${v}`] || {};
                    if (vd.has_schedule) {
                      hasSchedule = true; doType = vd.do_type;
                      onTime = vd.one_on_time ? String(vd.one_on_time).substring(0, 5) : '';
                      offTime = vd.one_off_time ? String(vd.one_off_time).substring(0, 5) : '';
                      break;
                    }
                  }
                }
                return (
                  <Col xs={8} sm={4} key={v}>
                    <Card size="small"
                      onClick={() => handleSelectValve(v)}
                      style={{
                        borderRadius: 12, textAlign: 'center', cursor: 'pointer',
                        border: isSelectedValve ? '2px solid #8b5cf6' : hasSchedule ? '2px solid #22c55e' : '1px solid #e2e8f0',
                        background: isSelectedValve ? 'linear-gradient(135deg, #f5f3ff, #ede9fe)' : hasSchedule ? '#f0fdf4' : '#fff',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelectedValve ? '0 4px 16px rgba(139,92,246,0.2)' : 'none',
                      }}
                      bodyStyle={{ padding: '10px 6px' }}
                    >
                      <Text strong style={{ fontSize: 13, display: 'block', color: isSelectedValve ? '#7c3aed' : '#1e293b' }}>
                        Valve {v}
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        {hasSchedule ? (
                          <Tag color={doType === 0 ? 'green' : 'orange'} style={{ fontSize: 11, padding: '1px 6px', margin: 0, borderRadius: 4 }}>
                            {doType === 0 ? 'AUTO' : 'MANUAL'}
                          </Tag>
                        ) : (
                          <Tag style={{ fontSize: 11, padding: '1px 6px', margin: 0, color: '#94a3b8', borderRadius: 4 }}>NONE</Tag>
                        )}
                      </div>
                      {hasSchedule && onTime && (
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 3 }}>
                          {onTime} – {offTime}
                        </Text>
                      )}
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </div>

          {/* Schedule Form */}
          {schedValve === null ? (
            <Card style={{
              borderRadius: 14, textAlign: 'center', padding: '32px 20px',
              background: '#f8fafc', border: '2px dashed #cbd5e1',
            }}>
              <ScheduleOutlined style={{ fontSize: 36, color: '#94a3b8', marginBottom: 10 }} />
              <br />
              <Text type="secondary" style={{ fontSize: 14 }}>
                Select a valve above to configure its schedule
              </Text>
            </Card>
          ) : (
            <Spin spinning={scheduleLoading}>
              <Card style={{
                borderRadius: 14, border: '1px solid #e2e8f0',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid #f1f5f9'
                }}>
                  <Title level={5} style={{ margin: 0, color: '#1e293b' }}>
                    <ScheduleOutlined style={{ marginRight: 8, color: '#8b5cf6' }} />
                    Valve {schedValve} — Schedule Configuration
                  </Title>
                  <Tag color="purple" style={{ fontSize: 12, padding: '3px 12px', borderRadius: 6, fontWeight: 600 }}>
                    Valve {schedValve}
                  </Tag>
                </div>

                <Form form={scheduleForm} layout="vertical">
                  <Row gutter={[20, 0]}>
                    <Col xs={12} sm={6}>
                      <Form.Item label={<Text strong>Setting Type</Text>} required>
                        <Select
                          placeholder="Select Setting Type"
                          value={schedSetting}
                          onChange={setSchedSetting}
                          size="large" allowClear style={{ width: '100%' }}
                        >
                          {settingTypeOptions.map(s => (
                            <Option key={s.value} value={s.value}>{s.label}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Form.Item label={<Text strong>Slot</Text>} required>
                        <Select
                          placeholder="Select Slot"
                          value={schedSlot}
                          onChange={setSchedSlot}
                          size="large" style={{ width: '100%' }}
                          disabled={schedSetting === undefined}
                        >
                          {slotOptions.map(s => (
                            <Option key={s.value} value={s.value}>{s.label}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Form.Item name="one_on_time" label={<Text strong>Set On Time</Text>} required>
                        <TimePicker format="HH:mm" size="large" style={{ width: '100%' }} placeholder="ON time" />
                      </Form.Item>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Form.Item name="one_off_time" label={<Text strong>Set Off Time</Text>} required>
                        <TimePicker format="HH:mm" size="large" style={{ width: '100%' }} placeholder="OFF time" />
                      </Form.Item>
                    </Col>
                  </Row>

                  {/* Enable / Disable Schedule */}
                  <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Text strong style={{ fontSize: 13 }}>Enable Schedule</Text>
                    <Switch
                      checked={schedStatus}
                      onChange={(checked) => setSchedStatus(checked)}
                      checkedChildren="Enabled"
                      unCheckedChildren="Disabled"
                      style={{ backgroundColor: schedStatus ? '#22c55e' : '#ef4444' }}
                    />
                    <Tag color={schedStatus ? 'green' : 'red'} style={{ borderRadius: 6, fontSize: 12 }}>
                      {schedStatus ? 'Active' : 'Inactive'}
                    </Tag>
                  </div>

                  <Divider style={{ margin: '8px 0 18px 0' }} />

                  {/* Days Selection */}
                  <div style={{ marginBottom: 20 }}>
                    <Text strong style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>Select Days</Text>
                    <div style={{ marginBottom: 12 }}>
                      <Checkbox
                        indeterminate={indeterminate}
                        onChange={(e) => setSelectedDays(e.target.checked ? dayOptions.map(d => d.value) : [])}
                        checked={allDaysChecked}
                      >
                        <Text strong style={{ fontSize: 13 }}>All Days</Text>
                      </Checkbox>
                    </div>
                    <Row gutter={[8, 8]}>
                      {dayOptions.map((day) => {
                        const isActive = selectedDays.includes(day.value);
                        return (
                          <Col key={day.value}>
                            <Button
                              size="middle"
                              onClick={() => {
                                if (isActive) setSelectedDays(prev => prev.filter(d => d !== day.value));
                                else setSelectedDays(prev => [...prev, day.value]);
                              }}
                              style={{
                                borderRadius: 10, fontWeight: 600, minWidth: 70,
                                border: isActive ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
                                background: isActive ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : '#fff',
                                color: isActive ? '#fff' : '#64748b',
                                boxShadow: isActive ? '0 2px 8px rgba(139,92,246,0.25)' : 'none',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              {day.shortLabel}
                            </Button>
                          </Col>
                        );
                      })}
                    </Row>
                  </div>

                  <Divider style={{ margin: '8px 0 18px 0' }} />

                  <Space size="middle">
                    <Button
                      type="primary" size="large" icon={<SaveOutlined />}
                      onClick={handleSaveSchedule} loading={scheduleLoading}
                      style={{
                        borderRadius: 10, fontWeight: 700,
                        background: 'linear-gradient(135deg, #1e293b, #334155)',
                        borderColor: '#1e293b',
                        boxShadow: '0 4px 14px rgba(30,41,59,0.3)',
                        padding: '0 28px', height: 44,
                      }}
                    >
                      Save Schedule
                    </Button>
                    <Button
                      danger size="large" icon={<ReloadOutlined />}
                      onClick={handleResetSchedule} loading={scheduleLoading}
                      style={{ borderRadius: 10, fontWeight: 700, padding: '0 28px', height: 44 }}
                    >
                      Reset Schedule
                    </Button>
                  </Space>
                </Form>
              </Card>
            </Spin>
          )}
        </div>
      )}


      {/* ═══════════════════════════════════════════════
         DEVICE LIST — Below Map
         ═══════════════════════════════════════════════ */}
      <div style={{ marginTop: 28 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ApiOutlined style={{ fontSize: 18, color: '#fff' }} />
            </div>
            <div>
              <Title level={5} style={{ margin: 0, color: '#1e293b' }}>
                Branch Devices
              </Title>
              <Text type="secondary" style={{ fontSize: 14 }}>
                {devices.length} device{devices.length !== 1 ? 's' : ''} assigned to this branch
              </Text>
            </div>
          </div>
          <Badge
            count={devices.length}
            showZero
            style={{
              backgroundColor: devices.length > 0 ? '#0ea5e9' : '#94a3b8',
              fontSize: 12, fontWeight: 700,
              boxShadow: '0 2px 8px rgba(14,165,233,0.3)',
            }}
          />
        </div>





        {/* Device Table */}
        <Card style={{ ...glassCard, overflow: 'hidden' }} bodyStyle={{ padding: 0 }}>
          <Table
            columns={deviceColumns}
            dataSource={devices}
            rowKey="device_id"
            size="small"
            pagination={devices.length > 10 ? { pageSize: 10, size: 'small' } : false}
            style={{ borderRadius: 16 }}
          />
        </Card>


      </div>

      {/* ─── Custom Map & Card CSS ─── */}
      <style>{`
        /* Marker */
        .custom-device-marker {
          background: transparent !important;
          border: none !important;
        }

        /* Pulse ring animation */
        @keyframes markerPulseGreen {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          70%  { box-shadow: 0 0 0 14px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
        @keyframes markerPulseRed {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          70%  { box-shadow: 0 0 0 14px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
        .marker-pulse-online {
          animation: markerPulseGreen 2s ease-out infinite;
          border-radius: 50%;
        }
        .marker-pulse-offline {
          animation: markerPulseRed 2.5s ease-out infinite;
          border-radius: 50%;
        }

        /* Leaflet popup premium styling */
        .leaflet-popup-content-wrapper {
          border-radius: 16px !important;
          box-shadow: 0 12px 40px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.06) !important;
          padding: 0 !important;
          overflow: hidden !important;
          border: 1px solid rgba(0,0,0,0.04) !important;
        }
        .leaflet-popup-content {
          margin: 12px 16px !important;
          width: auto !important;
          min-width: 280px !important;
        }
        .leaflet-popup-tip {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
        }
        .leaflet-popup-close-button {
          top: 8px !important;
          right: 8px !important;
          width: 24px !important;
          height: 24px !important;
          font-size: 18px !important;
          color: rgba(255,255,255,0.8) !important;
          z-index: 10 !important;
        }
        .leaflet-popup-close-button:hover {
          color: #fff !important;
        }

        /* Zoom controls */
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 10px rgba(0,0,0,0.12) !important;
          border-radius: 10px !important;
          overflow: hidden;
        }
        .leaflet-control-zoom a {
          border-radius: 0 !important;
          font-weight: 700 !important;
          width: 36px !important;
          height: 36px !important;
          line-height: 36px !important;
          font-size: 18px !important;
          color: #1e293b !important;
          border-color: #f1f5f9 !important;
        }
        .leaflet-control-zoom a:hover {
          background: #f8fafc !important;
        }

        /* Navigate button hover */
        .popup-navigate-btn:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 6px 20px rgba(15,23,42,0.4) !important;
        }

        /* Device summary card hover lift */
        .device-summary-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 12px 28px rgba(0,0,0,0.1) !important;
        }
      `}</style>
    </div>
  );
};

export default BranchConfig;
