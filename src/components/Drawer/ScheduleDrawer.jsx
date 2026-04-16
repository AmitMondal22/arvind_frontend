import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Drawer,
  Button,
  Form,
  TimePicker,
  Select,
  Card,
  Typography,
  Space,
  Row,
  Col,
  Tag,
  message,
  Checkbox,
  Divider,
  Switch,
  Alert
} from 'antd';
import {
  ScheduleOutlined,
  SaveOutlined,
  ReloadOutlined,
  DownloadOutlined,
  ControlOutlined,
  ClearOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import useDashboardDeviceApi from '../../api/useDashboardDeviceApi';
import { useParams } from 'react-router-dom';
import { address } from '../../routes/ApiRoute';

const { Title } = Typography;
const { Option } = Select;

/** ============================
 * Helpers & Constants
 * ============================ */
function parseHHmmssToDayjs(v) {
  if (!v) return null;
  const str = String(v);
  const parts = str.split(':');
  if (parts.length < 2) return null;
  const [hh, mm, ss = '00'] = parts;
  return dayjs(`${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${ss.padStart(2, '0')}`, 'HH:mm:ss');
}

const valveOptions = [
  { label: 'Valve1', value: 1 }, { label: 'Valve2', value: 2 },
  { label: 'Valve3', value: 3 }, { label: 'Valve4', value: 4 },
  { label: 'Valve5', value: 5 }, { label: 'Valve6', value: 6 },
];

const dayOptions = [
  { label: 'Sun', value: 'Sun' },
  { label: 'Mon', value: 'Mon' },
  { label: 'Tue', value: 'Tue' },
  { label: 'Wed', value: 'Wed' },
  { label: 'Thu', value: 'Thu' },
  { label: 'Fri', value: 'Fri' },
  { label: 'Sat', value: 'Sat' }
];

const settingOptions = [
  { label: 'Auto', value: 0 },
  { label: 'Manual', value: 1 }
];

const slotOptions = [
  { label: 'Slot 1', value: 0 },
  { label: 'Slot 2', value: 1 },
  { label: 'Slot 3', value: 2 }
];

/**
 * Auto-fill form from schedule data (API response or WebSocket)
 */
function mapScheduleToForm(sched, setSelectedSetting, setSelectedDays, form, setSelectedValve, setSelectedSlot, setScheduleStatus) {
  if (!sched) return;

  // Setting type (do_type) — coerce to number for Select match
  if (sched.do_type !== undefined && sched.do_type !== null) {
    setSelectedSetting(Number(sched.do_type));
  } else {
    setSelectedSetting('');
  }

  // Auto-select valve from do_no — coerce to number for Select match
  if (setSelectedValve && sched.do_no !== undefined && sched.do_no !== null) {
    setSelectedValve(Number(sched.do_no));
  }

  // Auto-select slot — coerce to number for Select match
  if (setSelectedSlot && sched.slot !== undefined && sched.slot !== null) {
    setSelectedSlot(Number(sched.slot));
  }

  // Status (enable/disable) — coerce to number then boolean
  if (setScheduleStatus && sched.status !== undefined && sched.status !== null) {
    setScheduleStatus(Number(sched.status) === 1);
  }

  // Time fields
  form.setFieldsValue({
    one_on_time: parseHHmmssToDayjs(sched.one_on_time),
    one_off_time: parseHHmmssToDayjs(sched.one_off_time)
  });

  // Days — handle both comma-separated string formats
  if (sched.days && typeof sched.days === 'string' && sched.days.trim() !== '') {
    const daysArr = sched.days.split(',').map(d => d.trim()).filter(Boolean);
    setSelectedDays(daysArr);
  } else {
    setSelectedDays([]);
  }
}

/** ============================
 * Component
 * ============================ */
const ScheduleDrawer = ({ open, onClose, deviceInfo }) => {
  const [form] = Form.useForm();
  const { valveDataApi, shedulingDataApi, resetShedulingApi, shedulingDataGetApi } = useDashboardDeviceApi();
  const { organizationId, projectId, deviceId, device } = useParams();

  const device_Id = deviceInfo?.device_id || '';
  const derivedDevice = deviceInfo?.device;

  const [selectedValve, setSelectedValve] = useState('');
  const [selectedSetting, setSelectedSetting] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedDays, setSelectedDays] = useState(dayOptions.map(d => d.value));
  const [scheduleStatus, setScheduleStatus] = useState(true);
  const [saveMessage, setSaveMessage] = useState(null);

  const wsRef = useRef(null);
  const isConnectingRef = useRef(false);

  // Check if all days are selected
  const allDaysChecked = selectedDays.length === dayOptions.length;
  const indeterminate = selectedDays.length > 0 && selectedDays.length < dayOptions.length;

  /** Reset form when drawer closes */
  useEffect(() => {
    if (!open) {
      form.resetFields();
      setSelectedValve('');
      setSelectedSetting('');
      setSelectedSlot('');
      setSelectedDays(dayOptions.map(d => d.value));
      setScheduleStatus(true);
      setSaveMessage(null);
    }
  }, [open, form]);

  /** WebSocket setup — auto-fill on incoming scheduling data */
  useEffect(() => {
    if (!open || !device_Id) {
      if (wsRef.current) wsRef.current.close();
      wsRef.current = null;
      return;
    }
    if (wsRef.current || isConnectingRef.current) return;

    const wsUrl = `${address.WS_DEVICE_SHEDULING_DASHBOARD}${encodeURIComponent(device_Id)}/${encodeURIComponent(derivedDevice)}`;
    isConnectingRef.current = true;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => { isConnectingRef.current = false; };

    ws.onmessage = (evt) => {
      try {
        let rawData = evt.data;
        // Handle double-encoded JSON
        let data;
        try {
          const first = JSON.parse(rawData);
          data = typeof first === 'string' ? JSON.parse(first) : first;
        } catch {
          data = JSON.parse(rawData);
        }

        const sched = data?.shedulingdata || data?.schedulingdata;
        if (sched) {
          console.log('WebSocket schedule data received:', sched);
          // Auto-fill form including valve selection
          mapScheduleToForm(sched, setSelectedSetting, setSelectedDays, form, setSelectedValve, setSelectedSlot, setScheduleStatus);
          message.info(`Schedule updated for Valve ${sched.do_no} via device`);
        }
      } catch (e) {
        console.error('WS message error:', e);
      }
    };

    ws.onerror = () => { message.error('WebSocket connection error.'); };
    ws.onclose = () => { wsRef.current = null; isConnectingRef.current = false; };

    return () => { try { ws.close(); } catch { } wsRef.current = null; isConnectingRef.current = false; };
  }, [open, device_Id, derivedDevice, form]);

  /** Actions */
  const handleSaveApply = async () => {
    setSaveMessage(null);
    if (selectedValve === '' || selectedSetting === '') {
      message.warning('Please select a Valve and setting type.');
      return;
    }

    const values = form.getFieldsValue();

    const payload = {
      organization_id: organizationId,
      device_id: deviceId,
      device,
      do_type: selectedSetting,
      do_no: selectedValve,
      slot: selectedSlot,
      one_on_time: values.one_on_time ? dayjs(values.one_on_time).format('HH:mm:ss') : '00:00:00',
      one_off_time: values.one_off_time ? dayjs(values.one_off_time).format('HH:mm:ss') : '00:00:00',
      two_on_time: '00:00:00',
      two_off_time: '00:00:00',
      datalog_sec: 120,
      days: selectedDays.join(','),
      status: scheduleStatus ? 1 : 0
    };

    try {
      const res = await shedulingDataApi(payload);
      if (res?.status === 'success' && res?.data) {
        // Auto-fill form from API response ONLY if data is not just an integer (like user_id)
        if (typeof res.data === 'object' && res.data !== null && 'do_type' in res.data) {
          mapScheduleToForm(res.data, setSelectedSetting, setSelectedDays, form, null, null, setScheduleStatus);
        }
        const msg = res?.message || 'Settings saved and applied successfully!';
        message.success(msg);
        setSaveMessage({ type: 'success', text: msg });
      } else {
        const errMsg = res?.error || res?.message || 'Failed to save settings. Please try again.';
        message.error(errMsg);
        setSaveMessage({ type: 'error', text: errMsg });
      }
    } catch (err) {
      console.error(err);
      const errMsg = err?.response?.data?.detail || err?.message || 'An error occurred while saving.';
      message.error(errMsg);
      setSaveMessage({ type: 'error', text: errMsg });
    }
  };

  const handleClear = async () => {
    if (selectedValve === '' || selectedSetting === '') {
      message.warning('Please select a Valve and setting type.');
      return;
    }

    const payload = {
      organization_id: organizationId,
      device_id: deviceId,
      device,
      do_type: selectedSetting,
      do_no: selectedValve,
      slot: selectedSlot,
      one_on_time: '00:00:00',
      one_off_time: '00:00:00',
      two_on_time: '00:00:00',
      two_off_time: '00:00:00',
      datalog_sec: 120,
      days: '',
      status: scheduleStatus ? 1 : 0
    };

    const res = await shedulingDataApi(payload);
    if (res?.status === 'success' && res?.data) {
      mapScheduleToForm(res.data, setSelectedSetting, setSelectedDays, form, null, null, setScheduleStatus);
      message.success('Settings cleared successfully!');
    } else {
      setSelectedDays([]);
      form.setFieldsValue({
        one_on_time: parseHHmmssToDayjs('00:00:00'),
        one_off_time: parseHHmmssToDayjs('00:00:00')
      });
      message.success('Settings cleared!');
    }
  };

  const handleResetTotalizer = async () => {
    if (selectedValve === '') {
      message.warning('Please select a Valve first.');
      return;
    }
    await resetShedulingApi({ organization_id: organizationId, device_id: deviceId, device, client_id: 1, do_no: selectedValve });
  };

  const handleGetDeviceSettings = async (requestType) => {
    if (selectedValve === '' || selectedSlot === '') {
      message.warning('Please select a Valve and Slot first.');
      return;
    }
    const values = form.getFieldsValue();
    const payload = {
      organization_id: organizationId,
      device_id: deviceId,
      device,
      client_id: 1,
      request_type: requestType,
      do_type: selectedSetting || 0,
      do_no: selectedValve,
      slot: selectedSlot,
      one_on_time: values.one_on_time ? dayjs(values.one_on_time).format('HH:mm:ss') : '00:00:00',
      one_off_time: values.one_off_time ? dayjs(values.one_off_time).format('HH:mm:ss') : '00:00:00',
      days: selectedDays.join(','),
      status: scheduleStatus ? 1 : 0
    };
    const res = await shedulingDataGetApi(payload);
    // Auto-fill from get response
    if (res?.status === 'success' && res?.data) {
      mapScheduleToForm(res.data, setSelectedSetting, setSelectedDays, form, null, null, setScheduleStatus);
      message.success('Schedule data loaded from device');
    }
  };

  const handleValveChange = (value) => {
    setSelectedValve(value);
    // Reset form and dependent selects before loading
    form.resetFields();
    setSelectedSetting('');
    setSelectedSlot('');
    setSelectedDays([]);
  };

  const handleSlotChange = async (value) => {
    setSelectedSlot(value);
    // Reset form fields before loading slot data
    form.resetFields();
    setSelectedSetting('');
    setSelectedDays([]);

    if (selectedValve === '' || value === undefined || value === null) return;

    const res = await valveDataApi({ organization_id: organizationId, device_id: deviceId, device, do_no: selectedValve, slot: value });
    if (res?.status === 'success' && res?.data) {
      // Auto-fill from API response
      mapScheduleToForm(res.data, setSelectedSetting, setSelectedDays, form, null, null, setScheduleStatus);
    }
  };

  const onAllDaysChange = (e) => {
    setSelectedDays(e.target.checked ? dayOptions.map(d => d.value) : []);
  };

  const onDayChange = (list) => {
    setSelectedDays(list);
  };

  /** ============================
   * UI
   * ============================ */
  return (
    <Drawer
      title={
        <Space size="small">
          <ScheduleOutlined style={{ color: '#3b82f6' }} />
          <span>Schedule Management</span>
          <Tag color="blue">{derivedDevice}</Tag>
        </Space>
      }
      placement="right"
      width={540}
      style={{ maxWidth: window?.innerWidth > 768 ? 540 : '100%' }}
      open={open}
      onClose={onClose}
      bodyStyle={{ padding: window?.innerWidth > 768 ? '24px' : '16px', backgroundColor: '#f8fafc' }}
      destroyOnClose={false}
      maskClosable
    >
      <div className="schedule-content">

        <Card style={{ marginBottom: 24, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <Form form={form} layout="vertical">
            <Row gutter={[16, 16]}>
              <Col xs={24}>
                <Form.Item label="Select a Valve" required>
                  <Select
                    placeholder="Select a valve"
                    value={selectedValve}
                    onChange={handleValveChange}
                    size="large"
                    allowClear
                    showSearch
                    filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}
                  >
                    {valveOptions.map((v) => (
                      <Option key={v.value} value={v.value}>{v.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item label="Slot" required>
                  <Select
                    placeholder="Select Slot"
                    value={selectedSlot}
                    onChange={handleSlotChange}
                    size="large"
                    disabled={selectedValve === ''}
                  >
                    {slotOptions.map(s => <Option key={s.value} value={s.value}>{s.label}</Option>)}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item label="Setting Type" required>
                  <Select
                    placeholder="Select Setting"
                    value={selectedSetting}
                    onChange={setSelectedSetting}
                    size="large"
                    allowClear
                    disabled={selectedValve === '' || selectedSlot === ''}
                  >
                    {settingOptions.map(s => <Option key={s.value} value={s.value}>{s.label}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Enable / Disable Schedule */}
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 500 }}>Enable Schedule</span>
              <Switch
                checked={scheduleStatus}
                onChange={(checked) => setScheduleStatus(checked)}
                checkedChildren="Enabled"
                unCheckedChildren="Disabled"
                style={{ backgroundColor: scheduleStatus ? '#10b981' : '#ef4444' }}
              />
              <Tag color={scheduleStatus ? 'green' : 'red'}>{scheduleStatus ? 'Active' : 'Inactive'}</Tag>
            </div>

            {/* Timers */}
            <Row gutter={[16, 16]}>
              <Col xs={12}>
                <Form.Item name="one_on_time" label="Set On Time" required>
                  <TimePicker format="HH:mm" size="large" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={12}>
                <Form.Item name="one_off_time" label="Set Off Time" required>
                  <TimePicker format="HH:mm" size="large" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '16px 0' }} />

            {/* Days Selection */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>Select Days (Sun to Sat)</div>
              <div style={{ marginBottom: 12 }}>
                <Checkbox
                  indeterminate={indeterminate}
                  onChange={onAllDaysChange}
                  checked={allDaysChecked}
                >
                  All Days
                </Checkbox>
              </div>
              <Checkbox.Group
                options={dayOptions}
                value={selectedDays}
                onChange={onDayChange}
              />
            </div>

            {saveMessage && (
              <Alert
                className="mb-3"
                style={{ marginBottom: 16 }}
                type={saveMessage.type}
                message={saveMessage.text}
                showIcon
              />
            )}

            {/* Actions */}
            <Space wrap style={{ marginTop: 24 }}>
              <Button type="primary" size="middle" icon={<SaveOutlined />} onClick={handleSaveApply} style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>Save</Button>
              <Button danger size="middle" icon={<ClearOutlined />} onClick={handleClear}>Clear</Button>
              <Button size="middle" icon={<DownloadOutlined />} onClick={() => handleGetDeviceSettings(0)} style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: 'white' }}>Get Schedul</Button>
              <Button size="middle" icon={<DownloadOutlined />} onClick={() => handleGetDeviceSettings(1)} style={{ backgroundColor: '#0ea5e9', borderColor: '#0ea5e9', color: 'white' }}>Get Setting Type</Button>
            </Space>
          </Form>
        </Card>
      </div>
    </Drawer>
  );
};

export default ScheduleDrawer;
