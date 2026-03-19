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
  Divider
} from 'antd';
import {
  ScheduleOutlined,
  SaveOutlined,
  ReloadOutlined,
  DownloadOutlined,
  ControlOutlined
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
  const parts = v.split(':');
  if (parts.length < 2) return null;
  const [hh, mm, ss = '00'] = parts;
  return dayjs(`${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${ss.padStart(2, '0')}`, 'HH:mm:ss');
}

const valveOptions = [
  { label: 'Valve1', value: 1 }, { label: 'Valve2', value: 2 },
  { label: 'Valve3', value: 3 }, { label: 'Valve4', value: 4 },
  { label: 'Valve5', value: 5 }, { label: 'Valve6', value: 6 },
  // { label: 'Channel7', value: 7 }, { label: 'Channel8', value: 8 }
];



const dayOptions = [
  { label: 'Sun', value: 'sun' },
  { label: 'Mon', value: 'mon' },
  { label: 'Tue', value: 'tue' },
  { label: 'Wed', value: 'wed' },
  { label: 'Thu', value: 'thu' },
  { label: 'Fri', value: 'fri' },
  { label: 'Sat', value: 'sat' }
];

const settingOptions = [
  { label: 'Auto', value: 0 },
  { label: 'Manual', value: 1 }
];

function mapScheduleToForm(sched, setSelectedSetting, setSelectedDays, form) {
  if (!sched) return;

  // Setting type
  if (sched.do_type !== undefined && sched.do_type !== null) {
    setSelectedSetting(sched.do_type);
  } else {
    setSelectedSetting('');
  }

  // Time fields
  form.setFieldsValue({
    one_on_time: parseHHmmssToDayjs(sched.one_on_time),
    one_off_time: parseHHmmssToDayjs(sched.one_off_time)
  });

  // Days
  if (sched.days) {
    setSelectedDays(sched.days.split(','));
  } else {
    setSelectedDays(dayOptions.map(d => d.value));
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
  const [selectedDays, setSelectedDays] = useState(dayOptions.map(d => d.value));

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
      setSelectedDays(dayOptions.map(d => d.value));
    }
  }, [open, form]);

  /** WebSocket setup */
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
        const data = JSON.parse(JSON.parse(evt.data));
        const sched = data?.shedulingdata || data?.schedulingdata;
        if (sched) mapScheduleToForm(sched, setSelectedSetting, setSelectedDays, form);
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
      one_on_time: values.one_on_time ? dayjs(values.one_on_time).format('HH:mm:ss') : '00:00:00',
      one_off_time: values.one_off_time ? dayjs(values.one_off_time).format('HH:mm:ss') : '00:00:00',
      two_on_time: '00:00:00',
      two_off_time: '00:00:00',
      datalog_sec: 120, // dummy value to satisfy backend pydantic model constraints
      days: selectedDays.join(',')
    };

    await shedulingDataApi(payload);
    message.success('Settings saved and applied successfully!');
  };

  const handleResetTotalizer = async () => {
    if (selectedValve === '') {
      message.warning('Please select a Valve first.');
      return;
    }
    await resetShedulingApi({ organization_id: organizationId, device_id: deviceId, device, client_id: 1, do_no: selectedValve });
  };

  const handleGetDeviceSettings = async (requestType) => {
    if (selectedValve === '') {
      message.warning('Please select a valve first.');
      return;
    }
    await shedulingDataGetApi({ organization_id: organizationId, device_id: deviceId, device, client_id: 1, do_no: selectedValve, request_type: requestType });
  };

  const handleValveChange = async (value) => {
    setSelectedValve(value);
    const res = await valveDataApi({ organization_id: organizationId, device_id: deviceId, device, do_no: value });
    if (res?.status === 'success') mapScheduleToForm(res.data, setSelectedSetting, setSelectedDays, form);
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
        <Title level={4} style={{ marginBottom: '20px', color: '#1e293b' }}>
          <ControlOutlined style={{ marginRight: 8 }} /> Manage Scheduling
        </Title>

        <Card style={{ marginBottom: 24, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <Form form={form} layout="vertical">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
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
                <Form.Item label="Setting Type" required>
                  <Select
                    placeholder="Select Setting"
                    value={selectedSetting}
                    onChange={setSelectedSetting}
                    size="large"
                    allowClear
                  >
                    {settingOptions.map(s => <Option key={s.value} value={s.value}>{s.label}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

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

            {/* Actions */}
            <Space wrap style={{ marginTop: 24 }}>
              <Button type="primary" size="middle" icon={<SaveOutlined />} onClick={handleSaveApply} style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>Save</Button>
              {/* <Button danger size="middle" icon={<ReloadOutlined />} onClick={handleResetTotalizer}>Reset</Button> */}
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
