import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Card,
  Tag,
  Typography,
  Row,
  Col,
  message,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  DeleteOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import AddDeviceManageDrawer from '../../components/Drawer/AddDeviceManageDrawer';
import DeleteManageDeviceDrawer from '../../components/Drawer/DeleteManageDeviceDrawer';
import useDeviceApi from '../../api/useDeviceApi';

const { Search } = Input;
const { Title, Text } = Typography;




const DeviceManagement = () => {
  const { apiManageDeviceCompany } = useDeviceApi(); // Assuming useDeviceApi is a custom hook for API calls
  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [openAddDrawer, setOpenAddDrawer] = useState(false);
  const [openDeleteDrawer, setOpenDeleteDrawer] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [searchText, setSearchText] = useState('');

  const showAddDeviceDrawer = () => setOpenAddDrawer(true);
  const closeAddDeviceDrawer = () => setOpenAddDrawer(false);

  useEffect(() => {
    getDeviceManageList();
  },[openAddDrawer,openDeleteDrawer]);
  const getDeviceManageList = async () => {
    try {
      const response = await apiManageDeviceCompany();
      if (response.status === false) {
        console.error(response.error);
        message.error('Failed to fetch device list');
      } else {
        setDevices(response.data || []);
        setFilteredDevices(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching device list:', error);
      message.error('Error fetching device list');
    }
  }

  const showDeleteDrawer = (record) => {
    setSelectedDevice(record);
    console.log("<<<<<<<<<<<<<<<<<<<,,",record);
    setOpenDeleteDrawer(true);
  };

  const closeDeleteDrawer = () => {
    setSelectedDevice(null);
    setOpenDeleteDrawer(false);
  };

  const handleDelete = () => {
    const updatedDevices = devices.filter((d) => d.id !== selectedDevice.id);
    setDevices(updatedDevices);
    setFilteredDevices(updatedDevices);
    message.success('Device deleted successfully!');
    closeDeleteDrawer();
  };

  const filterDevices = (value) => {
    if (!value) {
      setFilteredDevices(devices);
      return;
    }
    const filtered = devices.filter((device) =>
      [device.company.company_name,
       device.company.email,
       device.device.device_name,
       device.device.device_model,
       device.device.device_type,
       device.device.device_imei,
       device.device.device_sl_no]
        .some((field) =>
          field.toLowerCase().includes(value.toLowerCase())
        )
    );
    setFilteredDevices(filtered);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchText(value);
    filterDevices(value);
  };

  const handleSearchSubmit = () => {
    filterDevices(searchText);
  };

  const clearSearch = () => {
    setSearchText('');
    setFilteredDevices(devices);
  };

  const getDeviceTypeColor = (type) => {
    const colors = {
      DL: 'cyan',
      GPS: 'green',
      IOT: 'magenta',
    };
    return colors[type] || 'default';
  };

  const columns = [
    {
      title: 'Company',
      dataIndex: ['company', 'company_name'],
      key: 'company_name',
      sorter: (a, b) => a.company.company_name.localeCompare(b.company.company_name),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Search Company"
            value={selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Search
            </Button>
            <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
              Reset
            </Button>
          </Space>
        </div>
      ),
      filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />,
      onFilter: (value, record) =>
        record.company.company_name.toString().toLowerCase().includes(value.toLowerCase()),
      render: (text) => <Text strong style={{ color: '#1677ff' }}>{text}</Text>,
      responsive: ['md'],
    },
    {
      title: 'Device Info',
      key: 'device_info',
      render: (_, record) => (
        <Card
          size="small"
          style={{
            margin: 0,
            background: '#ffffff',
            border: '1px solid #e8e8e8',
            borderRadius: '6px',
          }}
          hoverable
        >
          <Row gutter={[8, 4]}>
            <Col span={24}>
              <Text strong>{record.device.device_name}</Text>
              {/* <Tag
                color={getDeviceTypeColor(record.device.device_type)}
                style={{
                  marginLeft: 8,
                  borderRadius: '12px',
                  padding: '2px 8px',
                }}
              >
                {record.device.device_type}
              </Tag> */}
            </Col>
            <Col span={24}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Model: {record.device.device_model}
              </Text>
            </Col>
            <Col span={24}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                S/N: {record.device.device_sl_no}
              </Text>
            </Col>
            <Col span={24}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                IMEI: {record.device.device_imei}
              </Text>
            </Col>
            <Col span={24}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Email: {record.company.email}
              </Text>
            </Col>
            <Col span={24}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Created:{' '}
                {new Date(record.create_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </Col>
          </Row>
        </Card>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => showDeleteDrawer(record)}
          style={{
            borderRadius: '6px',
            border: '1px solid #ff4d4f',
          }}
        >
          Delete
        </Button>
      ),
      responsive: ['md'],
    },
    {
      title: '',
      key: 'mobile_actions',
      render: (_, record) => (
        <Button
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => showDeleteDrawer(record)}
          style={{
            borderRadius: '6px',
            border: '1px solid #ff4d4f',
          }}
        />
      ),
      responsive: ['xs'],
    },
  ];

    return (
    <div style={{ padding: '0px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Card style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', border: 'none' }}>
        <div style={{ marginBottom: '16px' }}>
          <Title level={3} style={{ margin: 0, color: '#1d39c4' }}>
            Device Management
          </Title>
          <Text type="secondary">Manage connected devices</Text>
        </div>

        <Row gutter={[8, 8]} style={{ marginBottom: '16px' }}>
          <Col xs={24} sm={16} md={18}>
            <Search
              placeholder="Search devices..."
              allowClear
              enterButton={<SearchOutlined />}
              size="middle"
              value={searchText}
              onChange={handleSearchChange}
              onSearch={handleSearchSubmit}
              style={{ width: '100%', borderRadius: '8px' }}
            />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Space
              direction={window.innerWidth < 576 ? 'vertical' : 'horizontal'}
              style={{ width: '100%' }}
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={showAddDeviceDrawer}
                size="middle"
                block={window.innerWidth < 576}
                style={{
                  borderRadius: '8px',
                  background: '#1d39c4',
                  border: 'none',
                }}
              >
                Add Device
              </Button>
              {searchText && (
                <Button
                  icon={<ClearOutlined />}
                  onClick={clearSearch}
                  size="middle"
                  block={window.innerWidth < 576}
                  style={{
                    borderRadius: '8px',
                    border: '1px solid #d9d9d9',
                  }}
                >
                  Clear
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        <div
          style={{
            background: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #e8e8e8',
          }}
        >
          <Table
            columns={columns}
            dataSource={filteredDevices}
            rowKey="id"
            bordered={false}
            size="small"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} devices`,
              style: { marginTop: '12px' },
              simple: window.innerWidth < 576,
            }}
            rowClassName={(record, index) =>
              index % 2 === 0 ? 'table-row-light' : 'table-row-dark'
            }
            scroll={{ x: window.innerWidth < 576 ? 300 : undefined }}
          />
        </div>
      </Card>

      <AddDeviceManageDrawer open={openAddDrawer} onClose={closeAddDeviceDrawer} />
      <DeleteManageDeviceDrawer
        open={openDeleteDrawer}
        onClose={closeDeleteDrawer}
        device={selectedDevice}
        onDelete={handleDelete}
      />

      {/* Global Styles */}
      <style jsx global>{`
        .table-row-light { background-color: #ffffff; }
        .table-row-dark { background-color: #fafafa; }
        .ant-table-thead > tr > th {
          background: #1d39c4 !important;
          color: white !important;
          font-weight: 600;
          font-size: 12px !important;
        }
        .ant-table-tbody > tr:hover > td {
          background: #e6f4ff !important;
        }
        .ant-card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .ant-btn-primary {
          background: #1d39c4;
          border: none;
        }
        .ant-btn-primary:hover {
          background: #2f54eb;
        }
        @media (max-width: 576px) {
          .ant-table-cell, .ant-btn, .ant-typography {
            font-size: 12px !important;
          }
          .ant-card { padding: 8px !important; }
          .ant-drawer-body { padding: 16px !important; }
        }
      `}</style>
    </div>
  );
};

export default DeviceManagement;