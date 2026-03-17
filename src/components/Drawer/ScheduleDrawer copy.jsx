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
  InputNumber
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

const { Title } = Typography;
const { Option } = Select;

function parseHHmmssToDayjs(v) {
  if (!v) return null;
  // Accepts "5:04:00" or "05:04:00"
  const parts = v.split(':');
  if (parts.length < 2) return null;
  const hh = String(parts[0]).padStart(2, '0');
  const mm = String(parts).padStart(2, '0');
  const ss = parts ? String(parts).padStart(2, '0') : '00';
  return dayjs(`${hh}:${mm}:${ss}`, 'HH:mm:ss');
}

// Map between backend do_no and UI valve keys
const valveMapByNo = {
  1: 'valve1',
  2: 'valve2',
  3: 'valve3',
  4: 'valve4',
  5: 'valve5',
  6: 'valve6',
  7: 'valve7',
  8: 'valve8',
  9: 'pressure'
};
const valveNoByKey = Object.fromEntries(Object.entries(valveMapByNo).map(([k, v]) => [v, Number(k)]));




// Map between backend do_type (number) and UI setting keys
// Adjust these if your backend uses different codes.
const settingMapByType = {
  0: 'Auto',
  1: 'Manual'
};
const settingTypeByKey = Object.fromEntries(Object.entries(settingMapByType).map(([k, v]) => [v, Number(k)]));

// Optionally derive "device" segment from device_Id if backend needs a different string.
// Based on your sample, device looked like "TECH000004" while device_Id was "OMSTECH000004" in UI.
// If your backend expects exact device_Id, just return device_Id.

const ScheduleDrawer = ({ open, onClose, deviceInfo, valveStates }) => {
  const [form] = Form.useForm();

  const {valveDataApi, shedulingDataApi, resetShedulingApi, shedulingDataGetApi} = useDashboardDeviceApi();


  const {
      organizationId,
      projectId,
      deviceId,
      device,
      device_name,
      organizationName,
      projectname,
    } = useParams();
  console.log("[organizationId, projectId, organizationName, projectname]",organizationId, projectId, organizationName, projectname);

  console.log(deviceInfo);
  const device_Id = deviceInfo?.device_id || '';
  const derivedDevice = deviceInfo?.device;

  // Local controlled states for the top selectors/number
  const [selectedValve, setSelectedValve] = useState('');
  const [selectedSetting, setSelectedSetting] = useState('');
  const [datalogMinutes, setDatalogMinutes] = useState(undefined); // start empty

  const wsRef = useRef(null);
  const isConnectingRef = useRef(false);

  const valveOptions = useMemo(() => ([
    { label: 'Valve1', value: 1 },
    { label: 'Valve2', value: 2 },
    { label: 'Valve3', value: 3 },
    { label: 'Valve4', value: 4 },
    { label: 'Valve5', value: 5 },
    { label: 'Valve6', value: 6 },
    { label: 'Valve7', value: 7 },
    { label: 'Valve8', value: 8 }
  ]), []);

  const settingOptions = useMemo(() => ([
    { label: 'Auto', value: 0 },
    { label: 'Manual', value: 1 }
  ]), []);

  // Reset form when drawer closes
  useEffect(() => {
    if (!open) {
      form.resetFields();
      setSelectedValve('');
      setSelectedSetting('');
      setDatalogMinutes(undefined);
    }
  }, [open, form]);

  // Manage single WebSocket connection tied to Drawer open state and deviceInfo
  useEffect(() => {
    if (!open || !device_Id) {
      // Close if open
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
        wsRef.current = null;
      }
      return;
    }

    // Avoid duplicate connections
    if (wsRef.current || isConnectingRef.current) return;

    const wsUrl = `wss://wfmsapi.iotblitz.com/api/water_ms_routes/water_station/WFMS_SETTINGS/1/${encodeURIComponent(device_Id)}/${encodeURIComponent(derivedDevice)}`;
    isConnectingRef.current = true;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      isConnectingRef.current = false;
      // Optionally request current settings on open
      // ws.send(JSON.stringify({ action: 'get_settings', device_id: device_Id, device: derivedDevice }));
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(JSON.parse(evt.data));
        console.log("[aaa]",data);
        let sched = data?.shedulingdata || data?.schedulingdata || null;
        console.log("[sched]",sched);
        if (!sched) return;

        // Map do_no -> valve key
        const valveKey = valveMapByNo[sched.do_no] || '';
        setSelectedValve(valveKey);

        // Map do_type -> setting key
        const settingKey = settingMapByType[sched.do_type] || '';
        setSelectedSetting(settingKey);

        // datalog_sec to minutes (1..60)
        let minutes = undefined;
        if (typeof sched.datalog_sec === 'number' && !Number.isNaN(sched.datalog_sec)) {
          minutes = Math.max(1, Math.min(60, Math.round(sched.datalog_sec / 60)));
        }
        setDatalogMinutes(minutes);

        // Time fields
        const oneOn = parseHHmmssToDayjs(sched.one_on_time);
        const oneOff = parseHHmmssToDayjs(sched.one_off_time);
        const twoOn = parseHHmmssToDayjs(sched.two_on_time);
        const twoOff = parseHHmmssToDayjs(sched.two_off_time);

        form.setFieldsValue({
          one_on_time: oneOn,
          one_off_time: oneOff,
          two_on_time: twoOn,
          two_off_time: twoOff,
        });
      } catch (e) {
        // Ignore malformed messages
        console.log(e);
      }
    };

    ws.onerror = () => {
      isConnectingRef.current = false;
      message.error('WebSocket connection error.');
    };

    ws.onclose = () => {
      isConnectingRef.current = false;
      wsRef.current = null;
    };

    return () => {
      try { ws.close(); } catch {}
      wsRef.current = null;
      isConnectingRef.current = false;
    };
  }, [open, device_Id, derivedDevice]);

  const sendOverWS = (payload) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      message.warning('WebSocket is not connected.');
      return false;
    }
    try {
      ws.send(JSON.stringify(payload));
      return true;
    } catch {
      message.error('Failed to send data over WebSocket.');
      return false;
    }
  };

  const handleSaveApply = async() => {
    const values = form.getFieldsValue();
      // organizationId,
    //   projectId,
    //   deviceId,
    //   device,
    //   device_name,
    //   organizationName,
    //   projectname,

    const payload = {
      organization_id: organizationId, // adjust if dynamic
      device_id: deviceId,
      device: device,
      do_type:selectedSetting,
      do_no:selectedValve,
      one_on_time: values.one_on_time ? dayjs(values.one_on_time).format('HH:mm:ss') : null,
      one_off_time: values.one_off_time ? dayjs(values.one_off_time).format('HH:mm:ss') : null,
      two_on_time: values.two_on_time ? dayjs(values.two_on_time).format('HH:mm:ss') : null,
      two_off_time: values.two_off_time ? dayjs(values.two_off_time).format('HH:mm:ss') : null,
      datalog_sec: typeof datalogMinutes === 'number' ? datalogMinutes : 2,
    };

    console.log("[Save & Apply]", payload);
    await shedulingDataApi(payload)
    
    if (true) message.success('Settings saved and applied successfully!');
  };

  const handleResetTotalizer = async() => {
    const requestData = {
            organization_id: organizationId,
            device_id: deviceId,
            device: device,
            client_id: 1,
            do_no: selectedValve,
          }
    await resetShedulingApi(requestData)
    
  };

  const handleGetDeviceSettings = async() => {
    // {
//     "organization_id": "17",
//     "device_id": 243,
//     "device": "TECH000002",
//     "client_id": "1"
// }
          const requestData = {
            organization_id: organizationId,
            device_id: deviceId,
            device: device,
            client_id: 1,
            do_no: selectedValve,
          }
    await shedulingDataGetApi(requestData)
  
  };




   const handleValveChange = async(value) => {
    console.log("Selected valve:", value); // optional extra logic
    setSelectedValve(value); // update state
    
  


    const requestData = {
            organization_id: organizationId,
            device_id: deviceId,
            device: device,
            do_no: value,
          }
    const resData  =await valveDataApi(requestData)
    console.log('[hbjhbj]',resData);
    if(resData.status == "success"){
      console.log('[res data]',resData.data);

        let sched = resData.data

      // Map do_no -> valve key
        const valveKey = valveMapByNo[sched.do_no] || '';

        // Map do_type -> setting key
        const settingKey = settingMapByType[sched.do_type] || '';
        setSelectedSetting(settingKey);

        // datalog_sec to minutes (1..60)
        let minutes = undefined;
        if (typeof sched.datalog_sec === 'number' && !Number.isNaN(sched.datalog_sec)) {
          minutes = Math.max(1, Math.min(60, Math.round(sched.datalog_sec / 60)));
        }
        setDatalogMinutes(minutes);

        // Time fields
        const oneOn = parseHHmmssToDayjs(sched.one_on_time);
        const oneOff = parseHHmmssToDayjs(sched.one_off_time);
        const twoOn = parseHHmmssToDayjs(sched.two_on_time);
        const twoOff = parseHHmmssToDayjs(sched.two_off_time);

        form.setFieldsValue({
          one_on_time: oneOn,
          one_off_time: oneOff,
          two_on_time: twoOn,
          two_off_time: twoOff,
        });
    }
  }

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
      width="600"
      style={{ maxWidth: typeof window !== 'undefined' && window.innerWidth > 768 ? 680 : '100%' }}
      open={open}
      onClose={onClose}
      bodyStyle={{
        padding: typeof window !== 'undefined' && window.innerWidth > 768 ? '24px' : '16px',
        backgroundColor: '#f8fafc'
      }}
      destroyOnClose={false}
      maskClosable
    >
      <div className="schedule-content">
        <Title
          level={4}
          style={{
            marginBottom: '20px',
            color: '#1e293b',
            fontSize: typeof window !== 'undefined' && window.innerWidth > 768 ? '18px' : '16px'
          }}
        >
          <ControlOutlined style={{ marginRight: '8px' }} />
          Manage Scheduling
        </Title>

        <Card
          style={{
            marginBottom: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}
        >
          <Form form={form} layout="vertical">
            {/* Main Controls */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Form.Item label="Select a Valve" style={{ marginBottom: '16px' }}>
                  <Select
                    placeholder="Select a Valve"
                    value={selectedValve}
                    onChange={handleValveChange}
                    size="large"
                    style={{ borderRadius: "8px" }}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    allowClear
                  >
                    {valveOptions.map((valve) => (
                      <Option key={valve.value} value={valve.value}>
                        {valve.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={8}>
                <Form.Item label="Setting Type" style={{ marginBottom: '16px' }}>
                  <Select
                    placeholder="Select Setting"
                    value={selectedSetting}
                    onChange={setSelectedSetting}
                    size="large"
                    style={{ borderRadius: '8px' }}
                    allowClear
                  >
                    {settingOptions.map(setting => (
                      <Option key={setting.value} value={setting.value}>
                        {setting.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={8}>
                <Form.Item label="Datalog (Min)" style={{ marginBottom: '16px' }}>
                  <InputNumber
                    min={1}
                    max={60}
                    value={datalogMinutes}
                    onChange={setDatalogMinutes}
                    size="large"
                    style={{ width: '100%', borderRadius: '8px' }}
                    placeholder="Select minutes"
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Timer Settings */}
            <Row gutter={[16, 16]} style={{ marginTop: '20px' }}>
              <Col xs={12} md={6}>
                <Form.Item name="one_on_time" label="One On Timer" style={{ marginBottom: '16px' }}>
                  <TimePicker
                    format="HH:mm"
                    placeholder="00:00"
                    size="large"
                    style={{ width: '100%', borderRadius: '8px' }}
                  />
                </Form.Item>
              </Col>
              <Col xs={12} md={6}>
                <Form.Item name="one_off_time" label="One Off Timer" style={{ marginBottom: '16px' }}>
                  <TimePicker
                    format="HH:mm"
                    placeholder="00:00"
                    size="large"
                    style={{ width: '100%', borderRadius: '8px' }}
                  />
                </Form.Item>
              </Col>
              <Col xs={12} md={6}>
                <Form.Item name="two_on_time" label="Two On Timer" style={{ marginBottom: '16px' }}>
                  <TimePicker
                    format="HH:mm"
                    placeholder="00:00"
                    size="large"
                    style={{ width: '100%', borderRadius: '8px' }}
                  />
                </Form.Item>
              </Col>
              <Col xs={12} md={6}>
                <Form.Item name="two_off_time" label="Two Off Timer" style={{ marginBottom: '16px' }}>
                  <TimePicker
                    format="HH:mm"
                    placeholder="00:00"
                    size="large"
                    style={{ width: '100%', borderRadius: '8px' }}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Action Buttons */}
            <Space
              direction={typeof window !== 'undefined' && window.innerWidth > 576 ? 'horizontal' : 'vertical'}
              size="middle"
              style={{
                marginTop: '24px',
                width: '100%',
                justifyContent: typeof window !== 'undefined' && window.innerWidth > 576 ? 'flex-start' : 'center'
              }}
              wrap
            >
              <Button
                type="primary"
                size="large"
                icon={<SaveOutlined />}
                onClick={handleSaveApply}
                style={{
                  backgroundColor: '#10b981',
                  borderColor: '#10b981',
                  borderRadius: '8px',
                  fontWeight: '500',
                  minWidth: '140px'
                }}
              >
                Save & Apply
              </Button>

              <Button
                danger
                size="large"
                icon={<ReloadOutlined />}
                onClick={handleResetTotalizer}
                style={{
                  borderRadius: '8px',
                  fontWeight: '500',
                  minWidth: '140px'
                }}
              >
                Reset Totalizer
              </Button>

              <Button
                size="large"
                icon={<DownloadOutlined />}
                onClick={handleGetDeviceSettings}
                style={{
                  backgroundColor: '#f59e0b',
                  borderColor: '#f59e0b',
                  color: 'white',
                  borderRadius: '8px',
                  fontWeight: '500',
                  minWidth: '140px'
                }}
              >
                Get Settings
              </Button>
            </Space>
          </Form>
        </Card>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .schedule-content .ant-card {
            margin: 0 -8px;
            border-radius: 8px;
          }
          
          .ant-form-item-label > label {
            font-size: 14px;
            font-weight: 500;
          }
          
          .ant-btn-lg {
            height: 44px;
            font-size: 15px;
          }
          
          .ant-select-lg .ant-select-selector,
          .ant-input-number-lg,
          .ant-picker-large {
            height: 44px;
            font-size: 15px;
          }
        }
        
        @media (max-width: 576px) {
          .ant-space-item {
            width: 100% !important;
          }
          
          .ant-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </Drawer>
  );
};

export default ScheduleDrawer;
