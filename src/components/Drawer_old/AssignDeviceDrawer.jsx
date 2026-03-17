import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Drawer, 
  Form, 
  Select, 
  Button, 
  Divider, 
  Space, 
  Alert, 
  Empty, 
  Spin,
  Typography,
  Card,
  Row,
  Col,
  Tag,
  Tooltip
} from 'antd';
import { 
  PlusOutlined, 
  UserOutlined, 
  DesktopOutlined, 
  BankOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  NumberOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import useCompanyApi from '../../api/useCompanyApi';
import useDeviceApi from '../../api/useDeviceApi';

const { Option } = Select;
const { Text } = Typography;

const AssignDeviceDrawer = ({ visible, onClose, onSubmit, form, loading }) => {
  // State management
  const [companyList, setCompanyList] = useState([]);
  const [userList, setUserList] = useState([]);
  const [deviceList, setDeviceList] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [error, setError] = useState(null);
  
  // Loading states
  const [loadingStates, setLoadingStates] = useState({
    companies: false,
    users: false,
    devices: false
  });

  // API hooks
  const { apiCompanyList, apiCompanyToUser, apiCompanyToDevice } = useCompanyApi();
  const { apiAddDeviceToUser } = useDeviceApi();

  // Update loading state helper
  const updateLoadingState = useCallback((key, value) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  }, []);

  // Reset component state
  const resetComponentState = useCallback(() => {
    setUserList([]);
    setDeviceList([]);
    setSelectedCompany(null);
    setSelectedUser(null);
    setSelectedDevice(null);
    setError(null);
    setLoadingStates({ companies: false, users: false, devices: false });
    form.resetFields();
  }, [form]);

  // Effect for drawer visibility
  useEffect(() => {
    if (visible) {
      getCompanyData();
    } else {
      resetComponentState();
    }
  }, [visible, resetComponentState]);

  // Fetch company data
  const getCompanyData = async () => {
    try {
      setError(null);
      updateLoadingState('companies', true);
      
      const res = await apiCompanyList();
      if (res.status && res.data) {
        setCompanyList(res.data);
      } else {
        throw new Error(res.error || 'Failed to load companies');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load companies';
      setError(errorMessage);
      setCompanyList([]);
    } finally {
      updateLoadingState('companies', false);
    }
  };

  // Handle company selection
  const handleChangeCompany = async (companyId, option) => {
    setError(null);
    const company = option?.data;
    setSelectedCompany(company);
    setSelectedUser(null);
    setSelectedDevice(null);
    
    // Reset dependent fields
    form.setFieldsValue({ 
      user_id: undefined, 
      device_id: undefined, 
      device_number: undefined 
    });
    setUserList([]);
    setDeviceList([]);

    if (!companyId) return;

    // Load users and devices in parallel
    await Promise.all([
      loadCompanyUsers(companyId),
      loadCompanyDevices(companyId)
    ]);
  };

  // Handle user selection
  const handleUserChange = useCallback((userId, option) => {
    const user = option?.data?.user;
    setSelectedUser(user);
  }, []);

  // Load users for selected company
  const loadCompanyUsers = async (companyId) => {
    try {
      updateLoadingState('users', true);
      const usersRes = await apiCompanyToUser(companyId);
      
      if (usersRes.status && usersRes.data) {
        setUserList(usersRes.data);
      } else {
        setUserList([]);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      setUserList([]);
    } finally {
      updateLoadingState('users', false);
    }
  };

  // Load devices for selected company
  const loadCompanyDevices = async (companyId) => {
    try {
      updateLoadingState('devices', true);
      const devicesRes = await apiCompanyToDevice(companyId);
      
      if (devicesRes.status && devicesRes.data) {
        setDeviceList(devicesRes.data);
      } else {
        setDeviceList([]);
      }
    } catch (err) {
      console.error('Failed to load devices:', err);
      setDeviceList([]);
    } finally {
      updateLoadingState('devices', false);
    }
  };

  // Handle device selection
  const handleDeviceChange = useCallback((deviceId, option) => {
    const selectedDevice = option?.data?.device;
    setSelectedDevice(selectedDevice);
    if (selectedDevice) {
      form.setFieldsValue({ device_number: selectedDevice.device_number });
    } else {
      form.setFieldsValue({ device_number: undefined });
    }
  }, [form]);

  // Handle form submission
  const handleSubmit = async (values) => {
    try {
      setError(null);
      const res = await apiAddDeviceToUser({
        user_id: values.user_id,
        device_id: values.device_id,
        device_number: values.device_number,
        company_id: values.company_id,
      });

      if (res.status) {
        onClose();
        onSubmit(values);
        resetComponentState();
      } else {
        throw new Error(res.error || 'Failed to assign device');
      }
    } catch (err) {
      // const errorMessage = err.response?.data?.message || err.message || 'Failed to assign device';
      // setError(errorMessage);
    }
  };

  // Handle drawer close
  const handleClose = useCallback(() => {
    onClose();
    resetComponentState();
  }, [onClose, resetComponentState]);

  // Utility function to truncate text
  const truncateText = useCallback((text, maxLength = 30) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  }, []);

  // Custom label renderers for selected values
  const renderCompanyLabel = useCallback((company) => {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        overflow: 'hidden',
        width: '100%'
      }}>
        <BankOutlined style={{ 
          marginRight: '6px', 
          color: '#1890ff',
          flexShrink: 0
        }} />
        <Tooltip title={company.company_name} placement="topLeft">
          <span style={{ 
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '14px'
          }}>
            {truncateText(company.company_name, 35)}
          </span>
        </Tooltip>
      </div>
    );
  }, [truncateText]);

  const renderUserLabel = useCallback((user) => {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        overflow: 'hidden',
        width: '100%'
      }}>
        <UserOutlined style={{ 
          marginRight: '6px', 
          color: '#52c41a',
          flexShrink: 0
        }} />
        <Tooltip title={`${user.name} (${user.email})`} placement="topLeft">
          <span style={{ 
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '14px'
          }}>
            {truncateText(user.name, 30)}
          </span>
        </Tooltip>
        <Tag 
          color={user.active_status ? 'green' : 'red'} 
          size="small"
          style={{ 
            marginLeft: '6px',
            flexShrink: 0
          }}
        >
          {user.active_status ? 'Active' : 'Inactive'}
        </Tag>
      </div>
    );
  }, [truncateText]);

  const renderDeviceLabel = useCallback((device) => {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        overflow: 'hidden',
        width: '100%'
      }}>
        <DesktopOutlined style={{ 
          marginRight: '6px', 
          color: '#fa8c16',
          flexShrink: 0
        }} />
        <Tooltip title={`${device.device_name} - ${device.device_number}`} placement="topLeft">
          <span style={{ 
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '14px'
          }}>
            {truncateText(`${device.device_name} - ${device.device_number}`, 30)}
          </span>
        </Tooltip>
        <Tag 
          color={device.is_active ? 'green' : 'red'} 
          size="small"
          style={{ 
            marginLeft: '6px',
            flexShrink: 0
          }}
        >
          {device.is_active ? 'Active' : 'Inactive'}
        </Tag>
      </div>
    );
  }, [truncateText]);

  // Memoized filter functions
  const companyFilterOption = useCallback((input, option) => {
    const company = option.data;
    const searchTerm = input.toLowerCase();
    return (
      company.company_name.toLowerCase().includes(searchTerm) ||
      company.email.toLowerCase().includes(searchTerm) ||
      (company.city?.name || '').toLowerCase().includes(searchTerm) ||
      (company.mobile || '').includes(input)
    );
  }, []);

  const userFilterOption = useCallback((input, option) => {
    const user = option.data.user;
    const searchTerm = input.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm) ||
      (user.mobile || '').includes(input) ||
      user.user_role.toLowerCase().includes(searchTerm)
    );
  }, []);

  const deviceFilterOption = useCallback((input, option) => {
    const device = option.data.device;
    const searchTerm = input.toLowerCase();
    return (
      device.device_name.toLowerCase().includes(searchTerm) ||
      device.device_number.toLowerCase().includes(searchTerm) ||
      device.device_type.toLowerCase().includes(searchTerm) ||
      device.device_model.toLowerCase().includes(searchTerm) ||
      (device.device_sl_no || '').toLowerCase().includes(searchTerm)
    );
  }, []);

  // Custom option renderers with overflow fixes
  const renderCompanyOption = useCallback((company) => (
    <div style={{ 
      padding: '10px 8px', 
      maxWidth: '100%',
      overflow: 'hidden'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '6px',
        minHeight: '22px'
      }}>
        <BankOutlined style={{ 
          marginRight: '8px', 
          color: '#1890ff',
          flexShrink: 0
        }} />
        <Tooltip title={company.company_name} placement="topLeft">
          <Text 
            strong 
            style={{ 
              fontSize: '14px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1
            }}
          >
            {company.company_name}
          </Text>
        </Tooltip>
      </div>
      <div style={{ 
        fontSize: '12px', 
        color: '#666', 
        lineHeight: '18px',
        overflow: 'hidden'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          marginBottom: '4px',
          overflow: 'hidden'
        }}>
          <MailOutlined style={{ marginRight: '6px', flexShrink: 0 }} />
          <Tooltip title={company.email} placement="topLeft">
            <span style={{ 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap' 
            }}>
              {company.email}
            </span>
          </Tooltip>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {company.city?.name && (
            <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center' }}>
              <EnvironmentOutlined style={{ marginRight: '4px' }} /> 
              {truncateText(company.city.name, 15)}
            </span>
          )}
          {company.mobile && (
            <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center' }}>
              <PhoneOutlined style={{ marginRight: '4px' }} /> 
              {company.mobile}
            </span>
          )}
        </div>
      </div>
    </div>
  ), [truncateText]);

  const renderUserOption = useCallback((userWrapper) => {
    const user = userWrapper.user;
    return (
      <div style={{ 
        padding: '10px 8px',
        maxWidth: '100%',
        overflow: 'hidden'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: '6px',
          minHeight: '22px'
        }}>
          <UserOutlined style={{ 
            marginRight: '8px', 
            color: '#52c41a',
            flexShrink: 0
          }} />
          <Tooltip title={user.name} placement="topLeft">
            <Text 
              strong 
              style={{ 
                fontSize: '14px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                marginRight: '8px'
              }}
            >
              {user.name}
            </Text>
          </Tooltip>
          <Tag 
            color={user.active_status ? 'green' : 'red'} 
            size="small"
            style={{ flexShrink: 0 }}
          >
            {user.active_status ? 'Active' : 'Inactive'}
          </Tag>
        </div>
        <div style={{ 
          fontSize: '12px', 
          color: '#666', 
          lineHeight: '18px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            marginBottom: '4px',
            overflow: 'hidden'
          }}>
            <MailOutlined style={{ marginRight: '6px', flexShrink: 0 }} />
            <Tooltip title={user.email} placement="topLeft">
              <span style={{ 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap' 
              }}>
                {user.email}
              </span>
            </Tooltip>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {user.mobile && (
              <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center' }}>
                <PhoneOutlined style={{ marginRight: '4px' }} /> 
                {user.mobile}
              </span>
            )}
            <span style={{ fontSize: '11px' }}>
              Role: {truncateText(user.user_role, 12)}
            </span>
          </div>
        </div>
      </div>
    );
  }, [truncateText]);

  const renderDeviceOption = useCallback((deviceWrapper) => {
    const device = deviceWrapper.device;
    return (
      <div style={{ 
        padding: '10px 8px',
        maxWidth: '100%',
        overflow: 'hidden'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: '6px',
          minHeight: '22px'
        }}>
          <DesktopOutlined style={{ 
            marginRight: '8px', 
            color: '#fa8c16',
            flexShrink: 0
          }} />
          <Tooltip title={device.device_name} placement="topLeft">
            <Text 
              strong 
              style={{ 
                fontSize: '14px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                marginRight: '8px'
              }}
            >
              {device.device_name}
            </Text>
          </Tooltip>
          <Tag 
            color={device.is_active ? 'green' : 'red'} 
            size="small"
            style={{ flexShrink: 0 }}
          >
            {device.is_active ? 'Active' : 'Inactive'}
          </Tag>
        </div>
        <div style={{ 
          fontSize: '12px', 
          color: '#666', 
          lineHeight: '18px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            marginBottom: '4px',
            overflow: 'hidden'
          }}>
            <NumberOutlined style={{ marginRight: '6px', flexShrink: 0 }} />
            <Tooltip title={device.device_number} placement="topLeft">
              <span style={{ 
                fontWeight: '500',
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap',
                marginRight: '8px',
                flex: 1
              }}>
                {device.device_number}
              </span>
            </Tooltip>
            <span style={{ flexShrink: 0 }}>
              {truncateText(device.device_type, 12)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px' }}>
              {truncateText(device.device_model, 15)}
            </span>
            {device.device_sl_no && (
              <span style={{ fontSize: '11px' }}>
                SN: {truncateText(device.device_sl_no, 12)}
              </span>
            )}
            {device.latitude && device.longitude && (
              <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center' }}>
                <EnvironmentOutlined style={{ marginRight: '4px' }} /> 
                {device.latitude.toFixed(2)}, {device.longitude.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }, [truncateText]);

  // Loading content for selects
  const loadingContent = (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <Spin size="small" />
      <div style={{ marginTop: '8px', color: '#666' }}>Loading...</div>
    </div>
  );
  
  const emptyContent = (
    <Empty 
      image={Empty.PRESENTED_IMAGE_SIMPLE} 
      description="No data available" 
      style={{ padding: '20px' }}
    />
  );

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <PlusOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          <span>Assign Device to User</span>
        </div>
      }
      placement="right"
      onClose={handleClose}
      open={visible}
      width={560}
      bodyStyle={{ padding: '24px', backgroundColor: '#fafafa' }}
      headerStyle={{ 
        borderBottom: '1px solid #e8e8e8', 
        background: 'linear-gradient(90deg, #fafafa 0%, #f5f5f5 100%)' 
      }}
      destroyOnClose
    >
      {error && (
        <Alert
          type="error"
          message="Assignment Error"
          description={error}
          closable
          showIcon
          onClose={() => setError(null)}
          style={{ 
            marginBottom: 24, 
            borderRadius: 8,
            border: '1px solid #ffccc7'
          }}
        />
      )}

      {/* Selection Summary Cards */}
      {selectedCompany && (
        <Card 
          size="small" 
          style={{ marginBottom: 16, borderRadius: 8 }}
          bodyStyle={{ padding: '12px 16px' }}
        >
          {renderCompanyLabel(selectedCompany)}
        </Card>
      )}

      {selectedUser && (
        <Card 
          size="small" 
          style={{ marginBottom: 16, borderRadius: 8 }}
          bodyStyle={{ padding: '12px 16px' }}
        >
          {renderUserLabel(selectedUser)}
        </Card>
      )}

      {selectedDevice && (
        <Card 
          size="small" 
          style={{ marginBottom: 24, borderRadius: 8 }}
          bodyStyle={{ padding: '12px 16px' }}
        >
          {renderDeviceLabel(selectedDevice)}
        </Card>
      )}

      <Form 
        form={form} 
        layout="vertical" 
        onFinish={handleSubmit}
        requiredMark="optional"
      >
        {/* Company Select */}
        <Form.Item
          label={
            <span>
              <BankOutlined style={{ marginRight: '4px' }} />
              Select Company
            </span>
          }
          name="company_id"
          rules={[{ required: true, message: 'Please select a company' }]}
        >
          <Select
            placeholder="Choose a company..."
            showSearch
            optionFilterProp="children"
            onChange={handleChangeCompany}
            filterOption={companyFilterOption}
            loading={loadingStates.companies}
            notFoundContent={loadingStates.companies ? loadingContent : emptyContent}
            style={{ minHeight: '44px' }}
            dropdownStyle={{ 
              borderRadius: '8px',
              maxWidth: '520px',
              overflow: 'hidden'
            }}
            dropdownMatchSelectWidth={false}
            aria-label="Company selection"
            optionLabelProp="label"
          >
            {companyList.map((company) => (
              <Option 
                key={company.id} 
                value={company.id} 
                data={company}
                label={renderCompanyLabel(company)}
              >
                {renderCompanyOption(company)}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* User Select */}
        <Form.Item
          label={
            <span>
              <UserOutlined style={{ marginRight: '4px' }} />
              Select User
            </span>
          }
          name="user_id"
          rules={[{ required: true, message: 'Please select a user' }]}
        >
          <Select
            placeholder="Choose a user..."
            showSearch
            optionFilterProp="children"
            onChange={handleUserChange}
            notFoundContent={loadingStates.users ? loadingContent : emptyContent}
            loading={loadingStates.users}
            disabled={loadingStates.users || userList.length === 0}
            filterOption={userFilterOption}
            style={{ minHeight: '44px' }}
            dropdownStyle={{ 
              borderRadius: '8px',
              maxWidth: '520px',
              overflow: 'hidden'
            }}
            dropdownMatchSelectWidth={false}
            aria-label="User selection"
            optionLabelProp="label"
          >
            {userList.map((userWrapper) => (
              <Option 
                key={userWrapper.user.id} 
                value={userWrapper.user.id} 
                data={userWrapper}
                label={renderUserLabel(userWrapper.user)}
              >
                {renderUserOption(userWrapper)}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Device Select */}
        <Form.Item
          label={
            <span>
              <DesktopOutlined style={{ marginRight: '4px' }} />
              Select Device
            </span>
          }
          name="device_id"
          rules={[{ required: true, message: 'Please select a device' }]}
        >
          <Select
            placeholder="Choose a device..."
            showSearch
            optionFilterProp="children"
            notFoundContent={loadingStates.devices ? loadingContent : emptyContent}
            loading={loadingStates.devices}
            disabled={loadingStates.devices || deviceList.length === 0}
            onChange={handleDeviceChange}
            filterOption={deviceFilterOption}
            style={{ minHeight: '44px' }}
            dropdownStyle={{ 
              borderRadius: '8px',
              maxWidth: '520px',
              overflow: 'hidden'
            }}
            dropdownMatchSelectWidth={false}
            aria-label="Device selection"
            optionLabelProp="label"
          >
            {deviceList.map((deviceWrapper) => (
              <Option 
                key={deviceWrapper.device.id} 
                value={deviceWrapper.device.id} 
                data={deviceWrapper}
                label={renderDeviceLabel(deviceWrapper.device)}
              >
                {renderDeviceOption(deviceWrapper)}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Hidden Device Number Field */}
        <Form.Item name="device_number" hidden>
          <input type="hidden" />
        </Form.Item>

        <Divider style={{ margin: '24px 0' }} />

        <Row justify="end" gutter={12}>
          <Col>
            <Button 
              onClick={handleClose} 
              size="large"
              style={{ borderRadius: '6px' }}
            >
              Cancel
            </Button>
          </Col>
          <Col>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              size="large"
              icon={<CheckCircleOutlined />}
              style={{ 
                borderRadius: '6px',
                background: 'linear-gradient(90deg, #1890ff 0%, #40a9ff 100%)',
                border: 'none'
              }}
            >
              Assign Device
            </Button>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
};

export default AssignDeviceDrawer;