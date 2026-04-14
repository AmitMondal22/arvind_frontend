import React, { useEffect, useState, useRef } from 'react';
import {
  Card, Button, Switch, message, Typography, Space, Tag, Badge,
  Tooltip, Empty, Spin, Row, Col, TimePicker, Form, Select,
  Checkbox, Divider, Segmented, Table
} from 'antd';
import {
  ArrowLeftOutlined, BranchesOutlined, ReloadOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
  ApiOutlined, ScheduleOutlined, ControlOutlined, SaveOutlined,
  PoweroffOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import useBranchApi from '../../api/useBranchApi';
import { useAuth } from '../../context/AuthContext';
import dayjs from 'dayjs';

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

/* ─── Shared Styles ─── */
const glassCard = {
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(255,255,255,0.95)',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
};

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
  const [currentTime, setCurrentTime] = useState(new Date());
  const timerRef = useRef(null);

  // Mode: 'manual' or 'scheduling'
  const [activeMode, setActiveMode] = useState('manual');

  // Manual mode: per-valve loading state
  const [switchLoading, setSwitchLoading] = useState({});

  // Scheduling mode state
  const [schedValve, setSchedValve] = useState(null);
  const [schedSetting, setSchedSetting] = useState(undefined);
  const [selectedDays, setSelectedDays] = useState(dayOptions.map(d => d.value));
  const [scheduleForm] = Form.useForm();
  const [scheduleLoading, setScheduleLoading] = useState(false);

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
    } else {
      message.error(res?.error || 'Failed to load branch configuration');
    }
    setLoading(false);
  };

  useEffect(() => { fetchConfig(); }, [branchId]);

  /* ═══ MODE CHANGE ═══ */
  const handleModeChange = (val) => {
    setActiveMode(val);
    // Reset scheduling state when switching modes
    setSchedValve(null);
    setSchedSetting(undefined);
    scheduleForm.resetFields();
    setSelectedDays(dayOptions.map(d => d.value));
  };

  /* ═══ MANUAL MODE: Valve toggle (sends to ALL devices) ═══ */
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
    setSchedSetting(undefined);
    scheduleForm.resetFields();
    setSelectedDays(dayOptions.map(d => d.value));

    // Try to auto-fill from first device that has schedule for this valve
    for (const device of devices) {
      const vd = device.valves?.[`valve_${valveNo}`] || {};
      if (vd.has_schedule) {
        setSchedSetting(vd.do_type);
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
    if (schedValve === null) {
      message.warning('Please select a valve first');
      return;
    }
    if (schedSetting === undefined) {
      message.warning('Please select a Setting Type');
      return;
    }
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
      client_id: clientId
    };
    setScheduleLoading(true);
    const res = await scheduleSaveBranchAll(payload);
    if (res?.status) {
      message.success('Schedule saved to all devices!');
      fetchConfig();
    } else {
      message.error(res?.error || 'Failed to save schedule');
    }
    setScheduleLoading(false);
  };

  const handleResetSchedule = async () => {
    if (schedValve === null) {
      message.warning('Please select a valve first');
      return;
    }
    setScheduleLoading(true);
    const res = await scheduleResetBranchAll({
      branch_id: parseInt(branchId),
      do_no: schedValve,
      client_id: clientId
    });
    if (res?.status) {
      message.success('Schedule reset for all devices!');
      scheduleForm.resetFields();
      setSchedSetting(undefined);
      setSelectedDays(dayOptions.map(d => d.value));
      fetchConfig();
    } else {
      message.error(res?.error || 'Failed to reset');
    }
    setScheduleLoading(false);
  };

  const allDaysChecked = selectedDays.length === dayOptions.length;
  const indeterminate = selectedDays.length > 0 && selectedDays.length < dayOptions.length;
  const timeStr = currentTime.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

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
          <Text type="secondary" style={{ fontSize: 10 }}>UID: {record.device}</Text>
        </div>
      )
    },
    {
      title: 'Model', dataIndex: 'model', key: 'model',
      render: (text) => <Text type="secondary" style={{ fontSize: 12 }}>{text || '—'}</Text>
    },
    {
      title: 'Status', key: 'status',
      render: (_, record) => {
        const isOnline = record.status === 'online';
        return (
          <Tag
            color={isOnline ? 'success' : 'default'}
            icon={isOnline ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            style={{ borderRadius: 6, fontSize: 11 }}
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
                style={{ fontSize: 9, padding: '0 5px', margin: 0, borderRadius: 4 }}>
                V{v}: {vd.has_schedule ? (vd.do_type === 0 ? 'A' : 'M') : '—'}
              </Tag>
            );
          })}
        </div>
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
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        borderRadius: '16px 16px 0 0',
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(59,130,246,0.35)',
          }}>
            <BranchesOutlined style={{ fontSize: 24, color: '#fff' }} />
          </div>
          <div>
            <Title level={3} style={{ margin: 0, color: '#fff', letterSpacing: -0.3 }}>
              {branchInfo.branch_name || 'BRANCH'}
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>
              {branchInfo.branch_number} • {branchInfo.organization_name} • {branchInfo.project_name}
            </Text>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Stats */}
          {[
            { label: 'Total Devices', value: summary.total_devices || 0, color: '#fff' },
            { label: 'Online', value: summary.active_devices || 0, color: '#4ade80' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {s.label}
              </Text>
              <Text style={{ color: s.color, fontSize: 22, fontWeight: 700 }}>{s.value}</Text>
            </div>
          ))}

          {/* Clock */}
          <div style={{
            textAlign: 'center',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '8px 16px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} /> Live Time
            </Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", display: 'block' }}>
              {timeStr}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{dateStr}</Text>
          </div>

          <Button icon={<ReloadOutlined />} onClick={fetchConfig} size="large"
            style={{
              borderRadius: 10, fontWeight: 600,
              background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', color: '#fff',
            }}
          >
            Refresh
          </Button>
        </div>
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
            <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: 'block' }}>
              Toggle valves ON or OFF for all devices in this branch
            </Text>
          </div>

          <Row gutter={[16, 16]}>
            {valveList.map(valveNo => {
              const key = `valve_${valveNo}`;
              const isLd = switchLoading[key] || false;

              // Determine valve state from devices — check if any device has it active
              let hasAnySchedule = false;
              let settingType = null;
              for (const device of devices) {
                const vd = device.valves?.[`valve_${valveNo}`] || {};
                if (vd.has_schedule) {
                  hasAnySchedule = true;
                  settingType = vd.do_type;
                  break;
                }
              }

              return (
                <Col xs={12} sm={8} md={4} key={valveNo}>
                  <Card
                    style={{
                      borderRadius: 14,
                      textAlign: 'center',
                      border: '1px solid #e2e8f0',
                      background: '#fff',
                      transition: 'all 0.25s ease',
                      overflow: 'hidden',
                    }}
                    bodyStyle={{ padding: '20px 12px' }}
                    hoverable
                  >
                    {/* Valve Icon */}
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
                      checkedChildren={<span style={{ fontSize: 11, fontWeight: 700, padding: '0 4px' }}>ON</span>}
                      unCheckedChildren={<span style={{ fontSize: 11, fontWeight: 700, padding: '0 4px' }}>OFF</span>}
                      onChange={(checked) => handleValveToggle(valveNo, checked)}
                      style={{ minWidth: 56 }}
                    />

                    {/* Schedule indicator tag */}
                    <div style={{ marginTop: 10, minHeight: 22 }}>
                      {hasAnySchedule ? (
                        <Tag color={settingType === 0 ? 'green' : 'orange'}
                          style={{ fontSize: 9, padding: '1px 6px', margin: 0, borderRadius: 4 }}>
                          {settingType === 0 ? 'AUTO' : 'MANUAL'}
                        </Tag>
                      ) : (
                        <Tag style={{ fontSize: 9, padding: '1px 6px', margin: 0, borderRadius: 4, color: '#94a3b8' }}>
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
         MODE: SCHEDULING — Valve Select + Settings
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
            <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: 'block' }}>
              Configure scheduling for all devices in this branch
            </Text>
          </div>

          {/* ─── Step 1: Select Valve ─── */}
          <div style={{ marginBottom: 24 }}>
            <Text strong style={{ display: 'block', marginBottom: 10, fontSize: 13, color: '#475569' }}>
              Select Valve
            </Text>
            <Row gutter={[10, 10]}>
              {valveList.map(v => {
                const isSelectedValve = schedValve === v;

                // Check schedule status from devices
                let hasSchedule = false;
                let doType = null;
                let onTime = '';
                let offTime = '';
                for (const device of devices) {
                  const vd = device.valves?.[`valve_${v}`] || {};
                  if (vd.has_schedule) {
                    hasSchedule = true;
                    doType = vd.do_type;
                    onTime = vd.one_on_time ? String(vd.one_on_time).substring(0, 5) : '';
                    offTime = vd.one_off_time ? String(vd.one_off_time).substring(0, 5) : '';
                    break;
                  }
                }

                return (
                  <Col xs={8} sm={4} key={v}>
                    <Card size="small"
                      onClick={() => handleSelectValve(v)}
                      style={{
                        borderRadius: 12, textAlign: 'center', cursor: 'pointer',
                        border: isSelectedValve ? '2px solid #8b5cf6' : hasSchedule ? '2px solid #22c55e' : '1px solid #e2e8f0',
                        background: isSelectedValve
                          ? 'linear-gradient(135deg, #f5f3ff, #ede9fe)'
                          : hasSchedule
                            ? '#f0fdf4' : '#fff',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelectedValve ? '0 4px 16px rgba(139,92,246,0.2)' : 'none',
                      }}
                      bodyStyle={{ padding: '10px 6px' }}
                    >
                      <Text strong style={{
                        fontSize: 13, display: 'block',
                        color: isSelectedValve ? '#7c3aed' : '#1e293b',
                      }}>
                        Valve {v}
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        {hasSchedule ? (
                          <Tag color={doType === 0 ? 'green' : 'orange'}
                            style={{ fontSize: 9, padding: '0 5px', margin: 0, borderRadius: 4 }}>
                            {doType === 0 ? 'AUTO' : 'MANUAL'}
                          </Tag>
                        ) : (
                          <Tag style={{ fontSize: 9, padding: '0 5px', margin: 0, color: '#94a3b8', borderRadius: 4 }}>
                            NONE
                          </Tag>
                        )}
                      </div>
                      {hasSchedule && onTime && (
                        <Text type="secondary" style={{ fontSize: 9, display: 'block', marginTop: 3 }}>
                          {onTime} – {offTime}
                        </Text>
                      )}
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </div>

          {/* ─── Step 2: Schedule Form (visible after selecting valve) ─── */}
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
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              }}>
                {/* Form Header */}
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
                    {/* Setting Type */}
                    <Col xs={24} sm={8}>
                      <Form.Item label={<Text strong>Setting Type</Text>} required>
                        <Select
                          placeholder="Select Setting Type"
                          value={schedSetting}
                          onChange={setSchedSetting}
                          size="large"
                          allowClear
                          style={{ width: '100%' }}
                        >
                          {settingTypeOptions.map(s => (
                            <Option key={s.value} value={s.value}>{s.label}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>

                    {/* Set On Time */}
                    <Col xs={12} sm={8}>
                      <Form.Item name="one_on_time" label={<Text strong>Set On Time</Text>} required>
                        <TimePicker format="HH:mm" size="large" style={{ width: '100%' }} placeholder="ON time" />
                      </Form.Item>
                    </Col>

                    {/* Set Off Time */}
                    <Col xs={12} sm={8}>
                      <Form.Item name="one_off_time" label={<Text strong>Set Off Time</Text>} required>
                        <TimePicker format="HH:mm" size="large" style={{ width: '100%' }} placeholder="OFF time" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Divider style={{ margin: '8px 0 18px 0' }} />

                  {/* Days Selection — Sunday to Saturday */}
                  <div style={{ marginBottom: 20 }}>
                    <Text strong style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>
                      Select Days
                    </Text>

                    {/* All Days Checkbox */}
                    <div style={{ marginBottom: 12 }}>
                      <Checkbox
                        indeterminate={indeterminate}
                        onChange={(e) => setSelectedDays(e.target.checked ? dayOptions.map(d => d.value) : [])}
                        checked={allDaysChecked}
                      >
                        <Text strong style={{ fontSize: 13 }}>All Days</Text>
                      </Checkbox>
                    </div>

                    {/* Individual Day Buttons */}
                    <Row gutter={[8, 8]}>
                      {dayOptions.map((day) => {
                        const isActive = selectedDays.includes(day.value);
                        return (
                          <Col key={day.value}>
                            <Button
                              size="middle"
                              onClick={() => {
                                if (isActive) {
                                  setSelectedDays(prev => prev.filter(d => d !== day.value));
                                } else {
                                  setSelectedDays(prev => [...prev, day.value]);
                                }
                              }}
                              style={{
                                borderRadius: 10,
                                fontWeight: 600,
                                minWidth: 70,
                                border: isActive ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
                                background: isActive
                                  ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                                  : '#fff',
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

                  {/* Action Buttons */}
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
                      style={{
                        borderRadius: 10, fontWeight: 700,
                        padding: '0 28px', height: 44,
                      }}
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
         DEVICE LIST — Always Visible Under Both Modes
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
              <Text type="secondary" style={{ fontSize: 12 }}>
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

        {devices.length === 0 ? (
          <Card style={{ ...glassCard, textAlign: 'center', padding: 40 }}>
            <Empty description="No devices in this branch" />
          </Card>
        ) : (
          <>
            {/* Device Summary Cards */}
            <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
              {devices.map(device => {
                const isOnline = device.status === 'online';
                const scheduledValves = Object.values(device.valves || {}).filter(v => v.has_schedule).length;
                return (
                  <Col xs={24} sm={12} md={8} lg={6} key={device.device_id}>
                    <Card size="small" style={{
                      borderRadius: 12,
                      border: `1px solid ${isOnline ? '#bbf7d0' : '#fecaca'}`,
                      background: isOnline
                        ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)'
                        : 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                      transition: 'all 0.2s ease',
                    }} bodyStyle={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text strong style={{ fontSize: 13 }}>{device.device_name || device.device}</Text>
                        <Tag color={isOnline ? 'success' : 'error'}
                          icon={isOnline ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                          style={{ fontSize: 10, margin: 0, borderRadius: 6 }}>
                          {isOnline ? 'ONLINE' : 'OFFLINE'}
                        </Tag>
                      </div>
                      <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>
                        UID: {device.device}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>
                        Model: {device.model || '—'}
                      </Text>
                      <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {valveList.map(v => {
                          const vd = device.valves?.[`valve_${v}`] || {};
                          return (
                            <Tag key={v}
                              color={vd.has_schedule ? (vd.do_type === 0 ? 'green' : 'orange') : 'default'}
                              style={{ fontSize: 9, padding: '0 5px', margin: 0, borderRadius: 4 }}>
                              V{v}: {vd.has_schedule ? (vd.do_type === 0 ? 'A' : 'M') : '—'}
                            </Tag>
                          );
                        })}
                      </div>
                      {scheduledValves > 0 && (
                        <div style={{ marginTop: 6 }}>
                          <Text type="secondary" style={{ fontSize: 10 }}>
                            {scheduledValves}/6 valves scheduled
                          </Text>
                        </div>
                      )}
                    </Card>
                  </Col>
                );
              })}
            </Row>

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
          </>
        )}
      </div>
    </div>
  );
};

export default BranchConfig;
