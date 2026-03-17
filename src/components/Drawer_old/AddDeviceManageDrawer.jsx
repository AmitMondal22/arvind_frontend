import React, { useState, useEffect, useCallback } from 'react';
import {
  Drawer,
  Card,
  Typography,
  Select,
  Button,
  Space,
  Avatar,
  Tag,
  Tooltip,
  message,
  Divider,
} from 'antd';
import {
  SettingOutlined,
  BankOutlined,
  MobileOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  CloseOutlined,
  UserOutlined,
  WifiOutlined,
  ThunderboltOutlined,
  NumberOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import useDeviceApi from '../../api/useDeviceApi';
import useCompanyApi from '../../api/useCompanyApi';

const { Text, Title } = Typography;
const { Option } = Select;

// Enhanced InfoCard component
const InfoCard = ({ title, icon, children }) => (
  <div className="modern-info-card">
    <div className="modern-card-header">
      <div className="modern-card-icon">{icon}</div>
      <Text className="modern-card-title">{title}</Text>
    </div>
    <div className="modern-card-content">{children}</div>
  </div>
);

// Enhanced InfoItem component
const InfoItem = ({ icon, label, value, type = 'default' }) => (
  <div className="modern-info-item">
    <div className="modern-info-left">
      <div className="modern-info-icon">{icon}</div>
      <div className="modern-info-text">
        <Text className="modern-info-label">{label}</Text>
        <Text className="modern-info-value">{value || 'N/A'}</Text>
      </div>
    </div>
    {type === 'status' && (
      <div className="modern-status-wrapper">
        <Tag
          className={`modern-status-tag ${value}`}
          color={value === 'active' ? 'success' : value === 'online' ? 'processing' : 'error'}
        >
          {value ? value.toUpperCase() : 'N/A'}
        </Tag>
      </div>
    )}
  </div>
);

// Main Drawer Component
const AddDeviceManageDrawer = ({ open, onClose }) => {
  const { apiDeviceList, apiAddDeviceToCompant } = useDeviceApi();
  const { apiCompanyList } = useCompanyApi();

  const [mockCompanies, setMockCompanies] = useState([]);
  const [mockDevices, setMockDevices] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState('480px');

  const selectedCompany = mockCompanies.find((c) => c.id === selectedCompanyId);
  const selectedDevice = mockDevices.find((d) => d.id === selectedDeviceId);

  // Handle responsive drawer width
  useEffect(() => {
    const updateDrawerWidth = () => {
      setDrawerWidth(window.innerWidth < 768 ? '100%' : '480px');
    };
    updateDrawerWidth();
    window.addEventListener('resize', updateDrawerWidth);
    return () => window.removeEventListener('resize', updateDrawerWidth);
  }, []);

  // Fetch devices and companies
  useEffect(() => {
    getDeviceList();
  }, []);

  const getDeviceList = async () => {
    try {
      setIsLoading(true);
      const [deviceResponse, companyResponse] = await Promise.all([
        apiDeviceList(),
        apiCompanyList(),
      ]);

      if (deviceResponse.status === false) {
        console.error('Device API error:', deviceResponse.error);
        message.error('Failed to fetch devices');
      } else {
        // Add battery field and status to devices
        const devicesWithBattery = (deviceResponse.data || []).map(device => ({
          ...device,
          battery: device.battery || Math.floor(Math.random() * 100) + 1, // Random battery if not provided
          status: device.is_active ? 'active' : 'inactive',
          logo: device.device_name.charAt(0).toUpperCase(), 
        }));
        setMockDevices(devicesWithBattery);
      }

      if (companyResponse.status === false) {
        console.error('Company API error:', companyResponse.error);
        message.error('Failed to fetch companies');
      } else {
        // Add status and logo to companies
        const companiesWithStatus = (companyResponse.data || []).map(company => ({
          ...company,
          status: company.delete_status ? 'inactive' : 'active',
          logo: company.company_name.charAt(0).toUpperCase(), // Use first letter as logo
        }));
        setMockCompanies(companiesWithStatus);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      message.error('Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedCompanyId(null);
    setSelectedDeviceId(null);
    onClose();
  };

  const handleSave = async() => {
  if (!selectedCompany || !selectedDevice) {
    message.error({
      content: 'Please select both a company and a device.',
      style: { marginTop: '20px' },
      duration: 3,
    });
    return;
  }

  setIsLoading(true);
  // Log the selected company and device IDs
  console.log('Selected Company ID:', selectedCompany.id);
  console.log('Selected Device ID:', selectedDevice.id);
  const add_device_to_company =  await apiAddDeviceToCompant({
    company_id: selectedCompany.id,
    device_id: selectedDevice.id,
    device_number: selectedDevice.device_number
  });
  
  if (add_device_to_company.status) {
    message.success({
      content: `Successfully assigned ${selectedDevice.device_name} to ${selectedCompany.company_name}.`,
      style: { marginTop: '20px' },
      duration: 3,
    });
    setIsLoading(false);
  } else {
    
    console.error('Error assigning device to company:', add_device_to_company.error);
    message.error({
      content: 'Failed to assign device to company. Please try again.',
      style: { marginTop: '20px' },
      duration: 3,
    });
    
    setIsLoading(false);
    setSelectedCompanyId(null);
    setSelectedDeviceId(null);
    onClose();
  }

  
};

  // Memoized filter functions
  const filterCompanyOption = useCallback(
    (input, option) => {
      const company = mockCompanies.find((c) => c.id === option.value);
      if (!company) return false;

      const searchText = input.toLowerCase();
      return (
        (company.company_name || '').toLowerCase().includes(searchText) ||
        (company.email || '').toLowerCase().includes(searchText) ||
        (company.city?.name || '').toLowerCase().includes(searchText) ||
        (company.city?.state_code || '').toLowerCase().includes(searchText)
      );
    },
    [mockCompanies]
  );

  const filterDeviceOption = useCallback(
    (input, option) => {
      const device = mockDevices.find((d) => d.id === option.value);
      if (!device) return false;

      const searchText = input.toLowerCase();
      return (
        (device.device_name || '').toLowerCase().includes(searchText) ||
        (device.device_model || '').toLowerCase().includes(searchText) ||
        (device.device_type || '').toLowerCase().includes(searchText) ||
        (device.device_sl_no || '').toLowerCase().includes(searchText) ||
        (device.device_imei || '').toLowerCase().includes(searchText) ||
        (device.status || '').toLowerCase().includes(searchText)
      );
    },
    [mockDevices]
  );

  return (
    <>
      <Drawer
        title={null}
        placement="right"
        onClose={handleClose}
        open={open}
        width={drawerWidth}
        className="modern-drawer"
        closable={false}
        aria-label="Device Management Drawer"
      >
        {/* Custom Header */}
        <div className="modern-drawer-header">
          <div className="modern-header-content">
            <div className="modern-header-icon">
              <SettingOutlined />
            </div>
            <div className="modern-header-text">
              <Title level={3} className="modern-header-title">
                Device Management
              </Title>
              <Text className="modern-header-subtitle">
                Assign devices to companies seamlessly
              </Text>
            </div>
          </div>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={handleClose}
            className="modern-close-btn"
            size="large"
            aria-label="Close drawer"
          />
        </div>

        <div className="modern-drawer-body">
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            {/* Company Selection Section */}
            <div className="modern-section">
              <div className="modern-section-header">
                <div className="modern-section-icon">
                  <BankOutlined />
                </div>
                <div className="modern-section-text">
                  <Text className="modern-section-title">Select Company</Text>
                  <Text className="modern-section-desc">
                    Choose a company to assign the device
                  </Text>
                </div>
              </div>

              <Select
                showSearch
                placeholder="Search companies by name, email, or location..."
                size="large"
                onChange={setSelectedCompanyId}
                value={selectedCompanyId}
                filterOption={filterCompanyOption}
                className="modern-select"
                allowClear
                dropdownClassName="modern-dropdown"
                aria-label="Select a company"
                loading={isLoading}
              >
                {mockCompanies.map((company) => (
                  <Option key={company.id} value={company.id} className="modern-option">
                    <div className="modern-option-content">
                      <Avatar size={32} className="modern-option-avatar">
                        {company.logo || 'N/A'}
                      </Avatar>
                      <div className="modern-option-details">
                        <Text className="modern-option-title">{company.company_name}</Text>
                        <Text className="modern-option-subtitle">
                          {company.city?.name || 'N/A'}, {company.city?.state_code || 'N/A'} • {company.email || 'N/A'}
                        </Text>
                      </div>
                      <div className={`modern-option-status ${company.status}`}>
                        <div className="status-dot"></div>
                      </div>
                    </div>
                  </Option>
                ))}
              </Select>

              {selectedCompany && (
                <InfoCard title="Company Information" icon={<BankOutlined />}>
                  <InfoItem
                    icon={<UserOutlined />}
                    label="Company Name"
                    value={selectedCompany.company_name}
                  />
                  <InfoItem
                    icon={<MailOutlined />}
                    label="Email Address"
                    value={selectedCompany.email}
                  />
                  <InfoItem
                    icon={<PhoneOutlined />}
                    label="Mobile Number"
                    value={selectedCompany.mobile}
                  />
                  <InfoItem
                    icon={<EnvironmentOutlined />}
                    label="Location"
                    value={
                      selectedCompany.city
                        ? `${selectedCompany.city.name}, ${selectedCompany.city.state_code}, ${selectedCompany.city.country_code}`
                        : 'N/A'
                    }
                  />
                  {/* <InfoItem
                    icon={<CheckCircleOutlined />}
                    label="Status"
                    value={selectedCompany.status}
                    type="status"
                  /> */}
                </InfoCard>
              )}
            </div>

            {/* Device Selection Section */}
            <div className="modern-section">
              <div className="modern-section-header">
                <div className="modern-section-icon">
                  <MobileOutlined />
                </div>
                <div className="modern-section-text">
                  <Text className="modern-section-title">Select Device</Text>
                  <Text className="modern-section-desc">
                    Choose a device to assign to the company
                  </Text>
                </div>
              </div>

              <Select
                showSearch
                placeholder="Search devices by name, model, or IMEI..."
                size="large"
                onChange={setSelectedDeviceId}
                value={selectedDeviceId}
                filterOption={filterDeviceOption}
                className="modern-select"
                allowClear
                dropdownClassName="modern-dropdown"
                aria-label="Select a device"
                loading={isLoading}
              >
                {mockDevices.map((device) => (
                  <Option key={device.id} value={device.id} className="modern-option">
                    <div className="modern-option-content">
                      {/* <div className="modern-device-icon">
                        <MobileOutlined />
                      </div> */}
                       <Avatar size={32} className="modern-option-avatar">
                        {device.logo || 'N/A'}
                      </Avatar>
                      <div className="modern-option-details">
                        <Text className="modern-option-title">{device.device_name}</Text>
                        <Text className="modern-option-subtitle">
                          {device.device_model} • {device.device_type} • {device.battery}% battery
                        </Text>
                      </div>
                      <div className={`modern-option-status ${device.status}`}>
                        <div className="status-dot"></div>
                      </div>
                    </div>
                  </Option>
                ))}
              </Select>

              {selectedDevice && (
                <InfoCard title="Device Information" icon={<MobileOutlined />}>
                  <InfoItem
                    icon={<MobileOutlined />}
                    label="Device Name"
                    value={selectedDevice.device_name}
                  />
                  <InfoItem
                    icon={<InfoCircleOutlined />}
                    label="Model"
                    value={selectedDevice.device_model}
                  />
                  <InfoItem
                    icon={<NumberOutlined />}
                    label="Serial Number"
                    value={selectedDevice.device_sl_no}
                  />
                  <InfoItem
                    icon={<NumberOutlined />}
                    label="IMEI Number"
                    value={selectedDevice.device_imei}
                  />
                </InfoCard>
              )}
            </div>

            {/* Action Section */}
            <div className="modern-action-section">
              <Divider className="modern-divider" />
              <Button
                type="primary"
                size="large"
                block
                disabled={!selectedCompany || !selectedDevice || isLoading}
                onClick={handleSave}
                loading={isLoading}
                icon={<CheckCircleOutlined />}
                className="modern-action-btn"
                aria-label="Assign device to company"
              >
                {selectedCompany && selectedDevice
                  ? `Assign ${selectedDevice.device_name} to ${selectedCompany.company_name}`
                  : 'Select Company & Device to Continue'}
              </Button>
            </div>
          </Space>
        </div>
      </Drawer>

      <style jsx global>{`
        /* Modern Drawer Styles */
        .modern-drawer .ant-drawer-content {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%) !important;
          border-radius: 16px 0 0 16px !important;
          overflow: hidden !important;
        }
        .modern-drawer .ant-drawer-body {
          padding: 0 !important;
          height: 100% !important;
        }

        /* Modern Header */
        .modern-drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px 24px;
          color: white;
          position: sticky;
          top: 0;
          z-index: 10;
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
        }
        .modern-header-content {
          display: flex;
          align-items: center;
          flex: 1;
        }
        .modern-header-icon {
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 12px;
          margin-right: 16px;
          font-size: 20px;
        }
        .modern-header-title {
          color: white !important;
          margin: 0 !important;
          font-size: 20px !important;
          font-weight: 600 !important;
          line-height: 1.2 !important;
        }
        .modern-header-subtitle {
          color: rgba(255, 255, 255, 0.9) !important;
          font-size: 13px !important;
          margin-top: 2px !important;
          display: block !important;
        }
        .modern-close-btn {
          background: rgba(255, 255, 255, 0.1) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: white !important;
          border-radius: 10px !important;
          backdrop-filter: blur(10px) !important;
          transition: all 0.3s ease !important;
        }
        .modern-close-btn:hover {
          background: rgba(255, 255, 255, 0.2) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
          transform: scale(1.05) !important;
        }

        /* Modern Body */
        .modern-drawer-body {
          padding: 24px !important;
          height: calc(100vh - 80px) !important;
          overflow-y: auto !important;
        }

        /* Modern Section */
        .modern-section {
          background: white;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }
        .modern-section:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        }
        .modern-section-header {
          display: flex;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        .modern-section-icon {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 10px;
          padding: 10px;
          margin-right: 12px;
          font-size: 16px;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        .modern-section-title {
          font-size: 16px !important;
          font-weight: 600 !important;
          color: #1e293b !important;
          margin: 0 !important;
          line-height: 1.3 !important;
        }
        .modern-section-desc {
          font-size: 13px !important;
          color: #64748b !important;
          margin-top: 2px !important;
          display: block !important;
        }

        /* Modern Select */
        .modern-select .ant-select-selector {
          border-radius: 14px !important;
          border: 2px solid #e2e8f0 !important;
          background: white !important;
          padding: 8px 16px !important;
          height: 52px !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04) !important;
          transition: all 0.3s ease !important;
        }
        .modern-select.ant-select-focused .ant-select-selector {
          border-color: #667eea !important;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1) !important;
        }
        .modern-select .ant-select-selection-placeholder {
          color: #94a3b8 !important;
          font-size: 14px !important;
        }

        /* Modern Dropdown */
        .modern-dropdown {
          border-radius: 14px !important;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15) !important;
          border: 1px solid #e2e8f0 !important;
          overflow: hidden !important;
        }
        .modern-dropdown .ant-select-item {
          border-radius: 10px !important;
          margin: 6px !important;
          padding: 12px !important;
          transition: all 0.2s ease !important;
        }
        .modern-dropdown .ant-select-item:hover {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%) !important;
        }
        .modern-dropdown .ant-select-item-option-selected {
          background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%) !important;
          border: 1px solid #c7d2fe !important;
        }

        /* Modern Option */
        .modern-option-content {
          display: flex;
          align-items: center;
          width: 100%;
        }
        .modern-option-avatar {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          margin-right: 12px !important;
          flex-shrink: 0 !important;
        }
        .modern-device-icon {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 50px;
          padding: 6px;
          margin-right: 12px;
          font-size: 12px;
          flex-shrink: 0;
        }
        .modern-option-details {
          flex: 1;
          min-width: 0;
        }
        .modern-option-title {
          font-weight: 600 !important;
          color: #1e293b !important;
          font-size: 14px !important;
          display: block !important;
          line-height: 1.3 !important;
        }
        .modern-option-subtitle {
          font-size: 12px !important;
          color: #64748b !important;
          margin-top: 2px !important;
          display: block !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .modern-option-status {
          margin-left: 8px;
          flex-shrink: 0;
        }
        .modern-option-status .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          transition: all 0.2s ease;
        }
        .modern-option-status.active .status-dot,
        .modern-option-status.online .status-dot {
          background: #10b981;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
        }
        .modern-option-status.inactive .status-dot,
        .modern-option-status.offline .status-dot {
          background: #ef4444;
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
        }

        /* Modern Info Card */
        .modern-info-card {
          border-radius: 16px;
          padding: 20px;
          margin-top: 16px;
          transition: all 0.3s ease;
        }
        
        .modern-card-header {
          display: flex;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f1f5f9;
        }
        .modern-card-icon {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 10px;
          padding: 8px;
          margin-right: 10px;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        .modern-card-title {
          font-size: 15px !important;
          font-weight: 600 !important;
          color: #1e293b !important;
          margin: 0 !important;
        }

        /* Modern Info Item */
        .modern-info-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #f8fafc;
          transition: all 0.2s ease;
        }
        .modern-info-item:last-child {
          border-bottom: none;
        }
        .modern-info-item:hover {
          background: rgba(102, 126, 234, 0.02);
          border-radius: 8px;
          padding-left: 8px;
          padding-right: 8px;
        }
        .modern-info-left {
          display: flex;
          align-items: center;
          flex: 1;
        }
        .modern-info-icon {
          color: #667eea;
          margin-right: 12px;
          font-size: 14px;
          min-width: 16px;
        }
        .modern-info-label {
          color: #64748b !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          display: block !important;
          margin-bottom: 2px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
        }
        .modern-info-value {
          color: #1e293b !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          line-height: 1.3 !important;
        }

        /* Modern Status */
        .modern-status-wrapper {
          margin-left: 12px;
        }
        .modern-status-tag {
          border-radius: 8px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          padding: 4px 8px !important;
          border: none !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
        }
        .modern-status-tag.active {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%) !important;
          color: #065f46 !important;
        }
        .modern-status-tag.online {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%) !important;
          color: #1e3a8a !important;
        }
        .modern-status-tag.inactive,
        .modern-status-tag.offline {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%) !important;
          color: #991b1b !important;
        }

        /* Modern Action Section */
        .modern-action-section {
          background: white;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.8);
        }
        .modern-divider {
          margin: 0 0 20px 0 !important;
          border-color: #e2e8f0 !important;
        }
        .modern-action-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          border: none !important;
          border-radius: 14px !important;
          height: 56px !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4) !important;
          transition: all 0.3s ease !important;
          text-transform: none !important;
        }
        .modern-action-btn:disabled {
          background: #e2e8f0 !important;
          color: #94a3b8 !important;
          box-shadow: none !important;
        }
        .modern-action-btn:not(:disabled):hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5) !important;
        }

        /* Scrollbar Styling */
        .modern-drawer-body::-webkit-scrollbar {
          width: 6px;
        }
        .modern-drawer-body::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .modern-drawer-body::-webkit-scrollbar-thumb {
          background: rgba(102, 126, 234, 0.3);
          border-radius: 3px;
        }
        .modern-drawer-body::-webkit-scrollbar-thumb:hover {
          background: rgba(102, 126, 234, 0.5);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .modern-drawer .ant-drawer-content {
            border-radius: 0 !important;
          }
          .modern-drawer-header {
            padding: 16px;
          }
          .modern-header-title {
            font-size: 18px !important;
          }
          .modern-header-subtitle {
            font-size: 12px !important;
          }
          .modern-section {
            padding: 16px;
          }
          .modern-select .ant-select-selector {
            height: 48px !important;
            padding: 6px 12px !important;
          }
          .modern-action-btn {
            height: 48px !important;
            font-size: 13px !important;
          }
          .modern-info-card {
            padding: 16px;
          }
          .modern-info-item {
            padding: 10px 0;
          }
          .modern-option-content {
            flex-wrap: wrap;
          }
          .modern-option-details {
            max-width: 100%;
          }
          .modern-option-subtitle {
            font-size: 11px !important;
          }
        }

        @media (max-width: 480px) {
          .modern-drawer-header {
            padding: 12px;
          }
          .modern-header-icon {
            padding: 8px;
            font-size: 16px;
          }
          .modern-section-icon {
            padding: 8px;
            font-size: 14px;
          }
          .modern-card-icon {
            padding: 6px;
            font-size: 12px;
          }
          .modern-info-icon {
            font-size: 12px;
          }
          .modern-option-avatar {
            size: 28px !important;
          }
          .modern-device-icon {
            padding: 6px;
            font-size: 12px;
          }
        }
      `}</style>
    </>
  );
};

export default AddDeviceManageDrawer;