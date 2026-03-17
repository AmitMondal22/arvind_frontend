import React, { useState, useEffect } from 'react';
import {
  Typography,
  Card,
  Form,
  Input,
  Button,
  Switch,
  Row,
  Col,
  Space,
  Tooltip,
} from 'antd';
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  SettingOutlined,
  DollarOutlined,
  NumberOutlined,
  UnlockOutlined,
  LockOutlined,
  ReloadOutlined,
  CloudOutlined,
  WarningOutlined,
  MobileOutlined,
  FileTextOutlined,
  DollarCircleOutlined,
  BarChartOutlined,
  CreditCardOutlined,
  TagOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { MdCurrencyRupee } from "react-icons/md";
import { useParams } from 'react-router-dom';
import useDeviceApi from '../../api/useDeviceApi';

const DeviceSettings = () => {
  const {apiDeviceSettings} = useDeviceApi();
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [deviceData, setDeviceData] = useState(false);
  // const id = 'DEV-001';
  const { id } = useParams();

  useEffect(() => {
    
  getDeviceSettings();

  }, []);
  const getDeviceSettings = async () => {
    try {
      const response = await apiDeviceSettings(id);
      if (response.status) {
        setDeviceData(response.data);
        form.setFieldsValue(response.data);
      } else {
        console.error('Error fetching device settings:', response.error);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  }

  // const deviceData = {
  //   id: 1,
  //   dispenser_unlock: true,
  //   set_price_per_liter: 100.56,
  //   device_number: 'DEV-123456',
  //   system_reset: true,
  //   remote_price_update: true,
  //   emergency_lock_cloud: true,
  //   cloud_controlled_operation_gsm: true,
  //   preset_by_volume: true,
  //   get_last_sale_record: true,
  //   preset_by_amount: true,
  //   display_last_volume_dispensed: true,
  //   stop_dispensing_remotely: true,
  //   display_last_sale_amount: true,
  //   dispenser_lock: true,
  //   display_last_price_per_liter: true,
  // };

  const settingsConfig = [
    { key: 'set_price_per_liter', label: 'Price per Liter', icon: <MdCurrencyRupee />, type: 'number', prefix: '₹' },
    { key: 'device_number', label: 'Device Number', icon: <NumberOutlined />, type: 'text' },
    { key: 'dispenser_unlock', label: 'Dispenser Unlock', icon: <UnlockOutlined />, type: 'switch' },
    { key: 'dispenser_lock', label: 'Dispenser Lock', icon: <LockOutlined />, type: 'switch' },
    { key: 'system_reset', label: 'System Reset', icon: <ReloadOutlined />, type: 'switch' },
    { key: 'remote_price_update', label: 'Remote Price Update', icon: <CloudOutlined />, type: 'switch' },
    { key: 'emergency_lock_cloud', label: 'Emergency Lock (Cloud)', icon: <WarningOutlined />, type: 'switch' },
    { key: 'cloud_controlled_operation_gsm', label: 'Cloud Controlled Operation (GSM)', icon: <MobileOutlined />, type: 'switch' },
    { key: 'preset_by_volume', label: 'Preset by Volume', icon: <FileTextOutlined />, type: 'switch' },
    { key: 'preset_by_amount', label: 'Preset by Amount', icon: <DollarCircleOutlined />, type: 'switch' },
    { key: 'display_last_volume_dispensed', label: 'Display Last Volume Dispensed', icon: <BarChartOutlined />, type: 'switch' },
    { key: 'display_last_sale_amount', label: 'Display Last Sale Amount', icon: <CreditCardOutlined />, type: 'switch' },
    { key: 'display_last_price_per_liter', label: 'Display Last Price per Liter', icon: <TagOutlined />, type: 'switch' },
    { key: 'stop_dispensing_remotely', label: 'Stop Dispensing Remotely', icon: <StopOutlined />, type: 'switch' },
    { key: 'get_last_sale_record', label: 'Get Last Sale Record', icon: <FileTextOutlined />, type: 'switch' },
  ];

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (isEditing) form.resetFields();
  };

  const handleSave = (values) => {
    console.log('Saving settings:', values);
    setIsEditing(false);
  };

  const renderReadOnlyField = (config, value) => (
    <Col xs={24} sm={12} lg={8} key={config.key}>
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          borderRadius: '12px',
          padding: '16px',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          cursor: 'default',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '16px', color: '#1f2a44' }}>{config.icon}</span>
          <Typography.Text strong style={{ color: '#1f2a44', fontSize: '14px' }}>
            {config.label}
          </Typography.Text>
        </div>
        <div>
          {config.type === 'switch' ? (
            <Typography.Text
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 500,
                background: value ? '#e6f4ea' : '#fdeded',
                color: value ? '#389e0d' : '#cf1322',
              }}
            >
              {value ? 'Enabled' : 'Disabled'}
            </Typography.Text>
          ) : (
            <Typography.Text style={{ fontSize: '16px', color: '#1f2a44' }}>
              {config.type === 'number' && config.prefix ? `${config.prefix}${value}` : value}
            </Typography.Text>
          )}
        </div>
      </div>
    </Col>
  );

  const renderEditField = (config) => (
    <Col xs={24} sm={12} lg={8} key={config.key}>
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.3s ease',
        }}
      >
        <Form.Item
          label={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', color: '#1f2a44' }}>{config.icon}</span>
              <Typography.Text strong style={{ color: '#1f2a44', fontSize: '14px' }}>
                {config.label}
              </Typography.Text>
            </div>
          }
          name={config.key}
          valuePropName={config.type === 'switch' ? 'checked' : 'value'}
          style={{ marginBottom: 0 }}
        >
          {config.type === 'switch' ? (
            <Switch
              style={{
                background: '#d9d9d9',
                borderRadius: '16px',
                width: '48px',
                height: '24px',
              }}
            />
          ) : (
            <Input
              type={config.type}
              addonBefore={config.prefix}
              disabled={config.key === 'device_number'} // 👈 Disable "Device Number"
              style={{
                borderRadius: '8px',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                background: config.key === 'device_number' ? '#f5f5f5' : '#fafafa',
                transition: 'all 0.3s ease',
              }}
            />
          )}
        </Form.Item>
      </div>
    </Col>
  );

  return (
    <div
      style={{
        padding: '0px',
        // background: 'linear-gradient(145deg, #f0f4ff 0%, #e6e9ff 100%)',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      <Card
        style={{
          borderRadius: '16px',
          background: 'rgba(255, 255, 255, 0.98)',
          border: 'none',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '98%',
          padding: '24px',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <Typography.Title
            level={3}
            style={{
              margin: 0,
              color: '#1f2a44',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <SettingOutlined />
            Device Settings - {id}
          </Typography.Title>
          <Tooltip title={isEditing ? 'Save changes' : 'Edit settings'}>
            <Button
              icon={isEditing ? <SaveOutlined /> : <EditOutlined />}
              onClick={isEditing ? form.submit : handleEditToggle}
              style={{
                borderRadius: '8px',
                fontWeight: 500,
                padding: '8px 16px',
                background: isEditing ? '#52c41a' : '#1890ff',
                color: '#fff',
                border: 'none',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {isEditing ? 'Save' : 'Edit'}
            </Button>
          </Tooltip>
        </div>

        <Form
          form={form}
          layout='vertical'
          initialValues={deviceData}
          onFinish={handleSave}
          disabled={!isEditing}
        >
          <Typography.Title
            level={4}
            style={{
              marginBottom: '24px',
              color: '#1f2a44',
              fontWeight: 500,
            }}
          >
            Configuration Settings
          </Typography.Title>

          <Row gutter={[16, 16]}>
            {settingsConfig.map((config) =>
              isEditing
                ? renderEditField(config)
                : renderReadOnlyField(config, deviceData[config.key])
            )}
          </Row>

          {isEditing && (
            <Space
              style={{
                width: '100%',
                justifyContent: 'flex-end',
                marginTop: '24px',
              }}
            >
              <Button
                htmlType='submit'
                icon={<SaveOutlined />}
                style={{
                  borderRadius: '8px',
                  fontWeight: 500,
                  padding: '8px 16px',
                  background: '#52c41a',
                  color: '#fff',
                  border: 'none',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Save Changes
              </Button>
              <Button
                icon={<CloseOutlined />}
                onClick={handleEditToggle}
                style={{
                  borderRadius: '8px',
                  fontWeight: 500,
                  padding: '8px 16px',
                  transition: 'all 0.3s ease',
                }}
              >
                Cancel
              </Button>
            </Space>
          )}
        </Form>
      </Card>
    </div>
  );
};

export default DeviceSettings;