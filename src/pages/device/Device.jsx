import React, { useEffect, useState, useRef } from 'react';
import {
  Button, Table, Typography, Space, Card, Spin, Input, Badge, Tooltip, message
} from 'antd';
import {
  PlusOutlined, EditOutlined, DownloadOutlined, SearchOutlined, 
  SettingOutlined, ReloadOutlined, ClearOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useDeviceApi from '../../api/useDeviceApi';
import DeviceDrawer from '../../components/Drawer/DeviceDrawer';
import styled from 'styled-components';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;

// Color palette
const colors = {
  primary: '#4F46E5',
  secondary: '#7C3AED',
  background: '#F8FAFC',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  success: '#10B981',
  error: '#EF4444',
  neutral: '#FFFFFF',
};

const Container = styled.div`
  padding: 24px;
  background: ${colors.background};
  min-height: 100vh;
  position: relative;
  @media (max-width: 768px) {
    padding: 16px;
  }
  @media (max-width: 480px) {
    padding: 12px;
  }
`;

const StyledCard = styled(Card)`
  border-radius: 16px;
  background: ${colors.neutral};
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }
`;

const TitleSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  .main-title {
    color: ${colors.textPrimary};
    font-weight: 700;
    font-size: clamp(24px, 3.5vw, 28px);
    margin: 0;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
  .subtitle {
    color: ${colors.textSecondary};
    font-size: 14px;
    font-weight: 400;
  }
`;

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding: 8px 0;
  gap: 16px;
  @media (max-width: 1200px) {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
`;

const ActionSection = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  @media (max-width: 1200px) {
    justify-content: space-between;
    width: 100%;
  }
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
`;

const SearchContainer = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  position: relative;
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  @media (max-width: 768px) {
    width: 100%;
    > * {
      flex: 1;
    }
  }
`;

const StyledSearchInput = styled.div`
  position: relative;
  width: 100%;
  max-width: clamp(250px, 30vw, 350px);
  
  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }
  
  .search-input {
    width: 100%;
    height: 44px;
    padding: 0 16px 0 48px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 12px;
    background: ${colors.neutral};
    font-size: 14px;
    transition: all 0.3s ease;
    
    &:focus {
      border-color: ${colors.primary};
      box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.15);
      outline: none;
    }
    
    &::placeholder {
      color: #6B7280;
      font-weight: 400;
    }
  }
  
  .search-icon {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: ${colors.textSecondary};
    font-size: 16px;
    z-index: 2;
  }
  
  .clear-icon {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: ${colors.textSecondary};
    font-size: 14px;
    cursor: pointer;
    z-index: 2;
    padding: 4px;
    border-radius: 50%;
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(0, 0, 0, 0.05);
      color: ${colors.primary};
    }
  }
  
  @media (max-width: 768px) {
    max-width: 100%;
  }
`;

const SearchResultsBadge = styled.div`
  position: absolute;
  top: -8px;
  right: -8px;
  background: ${colors.primary};
  color: white;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
`;

const StyledButton = styled(Button)`
  border-radius: 12px;
  padding: 10px 20px;
  height: 44px;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s ease;
  border: none;
  
  &.ant-btn-primary {
    background: ${colors.primary};
    color: ${colors.neutral};
    &:hover {
      background: ${colors.secondary};
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }
  }
  
  &.ant-btn-default {
    background: ${colors.neutral};
    color: ${colors.textSecondary};
    border: 1px solid rgba(0, 0, 0, 0.1);
    &:hover {
      background: ${colors.primary};
      color: ${colors.neutral};
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }
  }
  
  &:disabled {
    opacity: 0.6;
    transform: none;
  }
`;

const StyledTable = styled(Table)`
  .ant-table {
    border-radius: 12px;
    background: ${colors.neutral};
    border: 1px solid rgba(0, 0, 0, 0.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .ant-table-thead > tr > th {
    background: ${colors.background};
    font-weight: 700;
    color: ${colors.textPrimary};
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    padding: 16px;
    font-size: 12px;
    text-transform: uppercase;
  }
  
  .ant-table-tbody > tr > td {
    padding: 16px;
    font-size: 13px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    background: ${colors.neutral};
    transition: all 0.3s ease;
  }
  
  .ant-table-tbody > tr:hover > td {
    background: rgba(79, 70, 229, 0.05);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .search-highlight {
    background: rgba(79, 70, 229, 0.15);
    color: ${colors.primary};
    font-weight: 600;
    padding: 1px 2px;
    border-radius: 2px;
  }
  
  @media (max-width: 768px) {
    .ant-table-thead > tr > th {
      padding: 12px;
      font-size: 11px;
    }
    .ant-table-tbody > tr > td {
      padding: 12px;
      font-size: 12px;
    }
  }
`;

const ActionButton = styled(Button)`
  border-radius: 8px;
  padding: 4px 10px;
  height: auto;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
  border: 1px solid;
  
  &.edit-btn {
    color: ${colors.primary};
    border-color: rgba(79, 70, 229, 0.3);
    background: rgba(79, 70, 229, 0.05);
    &:hover {
      background: rgba(79, 70, 229, 0.1);
      border-color: ${colors.primary};
      color: ${colors.secondary};
      box-shadow: 0 4px 8px rgba(79, 70, 229, 0.2);
    }
  }
  
  &.settings-btn {
    color: ${colors.success};
    border-color: rgba(16, 185, 129, 0.3);
    background: rgba(16, 185, 129, 0.05);
    &:hover {
      background: rgba(16, 185, 129, 0.1);
      border-color: ${colors.success};
      color: ${colors.success};
      box-shadow: 0 4px 8px rgba(16, 185, 129, 0.2);
    }
  }
`;

const LoadingContainer = styled.div`
  text-align: center;
  padding: 48px 16px;
  .ant-spin-dot i {
    background: ${colors.primary};
  }
  .loading-text {
    color: ${colors.textSecondary};
    margin-top: 12px;
    font-size: 14px;
    font-weight: 500;
  }
`;

const Device = () => {
  const { apiDeviceList, apiDeviceAdd, apiDeviceEdit } = useDeviceApi();
  const [deviceList, setDeviceList] = useState([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [searchInputValue, setSearchInputValue] = useState('');
  const scrollRef = useRef();
  const navigate = useNavigate();
  const pageSize = 20;

  useEffect(() => {
    getDeviceList(1);
  }, []);

  const getDeviceList = async (pageNum, append = false) => {
    if (loading || (!hasMore && append)) return;
    setLoading(true);
    try {
      const response = await apiDeviceList({ page: pageNum, pageSize });
      if (response.status === false) {
        message.error('Failed to load devices');
        console.error(response.error);
      } else {
        const newData = response.data || [];
        setDeviceList(append ? [...deviceList, ...newData] : newData);
        setHasMore(newData.length === pageSize);
        setPage(pageNum);
      }
    } catch (error) {
      message.error('Network error occurred');
      console.error('Failed to fetch device list:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    setHasMore(true);
    getDeviceList(1);
    message.success('Device list refreshed');
  };

  const handleScroll = () => {
    const container = scrollRef.current?.scrollBody;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollTop + clientHeight >= scrollHeight - 20 && hasMore && !loading) {
      getDeviceList(page + 1, true);
    }
  };

  const openAddDrawer = () => {
    setEditDevice(null);
    setDrawerVisible(true);
  };

  const openEditDrawer = (record) => {
    setEditDevice(record);
    setDrawerVisible(true);
  };

  const handleSettingsClick = (id) => {
    navigate(`/devices/settings/${id}`);
  };

  const handleSave = async (formData) => {
    try {
      const payload = {
        device_number: formData.device_number,
        device_name: formData.device_name,
        device_sl_no: formData.device_number,
        device_model: formData.device_model,
        device_imei: formData.device_imei,
        latitude: parseFloat(formData.latitude) || 0,
        longitude: parseFloat(formData.longitude) || 0,
      };
      let response;
      if (!editDevice) {
        response = await apiDeviceAdd(payload);
      } else {
        response = await apiDeviceEdit(payload, editDevice.id);
      }
      if (response.status) {
        message.success(`Device ${editDevice ? 'updated' : 'added'} successfully`);
        getDeviceList(1);
        setDrawerVisible(false);
      } else {
        message.error(`Failed to ${editDevice ? 'update' : 'add'} device`);
        console.error('Failed:', response.error);
      }
    } catch (err) {
      message.error('Operation failed');
      console.error('Save failed:', err);
    }
  };

  const handleExport = () => {
    try {
      const exportData = filteredData.map((item, index) => ({
        "S. No.": index + 1,
        "Device Number": item.device_number,
        "Name": item.device_name,
        "Model": item.device_model,
        "IMEI": item.device_imei,
        "Latitude": item.latitude,
        "Longitude": item.longitude,
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Devices');
      XLSX.writeFile(workbook, `devices_${new Date().toISOString().split('T')[0]}.xlsx`);
      message.success('Device list exported successfully');
    } catch (error) {
      message.error('Export failed');
      console.error('Export error:', error);
    }
  };

  // Enhanced search functionality
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInputValue(value);
    setSearchText(value);
  };

  const handleSearchClear = () => {
    setSearchInputValue('');
    setSearchText('');
  };

  // Advanced filtering function
  const filteredData = deviceList.filter((item) => {
    if (!searchText.trim()) return true;
    
    const searchLower = searchText.toLowerCase().trim();
    const searchableFields = [
      item.device_number,
      item.device_name,
      item.device_model,
      item.device_imei,
      item.latitude?.toString(),
      item.longitude?.toString()
    ];
    
    return searchableFields.some(field => 
      field && String(field).toLowerCase().includes(searchLower)
    );
  });

  // Highlight search text in rendered content
  const highlightText = (text, searchText) => {
    if (!searchText || !text) return text;
    
    const regex = new RegExp(`(${searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = String(text).split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? 
        <span key={index} className="search-highlight">{part}</span> : part
    );
  };

  const getColumnSearchProps = (dataIndex) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 16, background: colors.neutral, borderRadius: '8px' }}>
        <Input
          placeholder={`Search ${dataIndex.replace('_', ' ')}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{
            width: 200,
            marginBottom: 12,
            display: 'block',
            borderRadius: '8px',
            border: `1px solid ${colors.primary}30`,
          }}
        />
        <Space>
          <Button
            type="primary"
            size="small"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            style={{
              borderRadius: '8px',
              background: colors.primary,
              border: 'none',
            }}
          >
            Search
          </Button>
          <Button
            size="small"
            onClick={() => {
              clearFilters();
              confirm();
            }}
            style={{
              borderRadius: '8px',
              border: `1px solid ${colors.primary}30`,
            }}
          >
            Reset
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined
        style={{
          color: filtered ? colors.primary : colors.textSecondary,
          fontSize: '14px',
        }}
      />
    ),
    onFilter: (value, record) =>
      String(record[dataIndex]).toLowerCase().includes(value.toLowerCase()),
  });

  const columns = [
    {
      title: 'S.No.',
      key: 'index',
      render: (_, __, index) => (
        <Text strong style={{ color: colors.primary, fontWeight: 700, fontSize: '13px' }}>
          {String(index + 1).padStart(2, '0')}
        </Text>
      ),
      width: 80,
      fixed: 'left',
    },
    {
      title: 'Device Number',
      dataIndex: 'device_number',
      key: 'device_number',
      sorter: (a, b) => a.device_number.localeCompare(b.device_number),
      ...getColumnSearchProps('device_number'),
      render: (text) => (
        <Text strong style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 600 }}>
          {highlightText(text, searchText)}
        </Text>
      ),
    },
    {
      title: 'Device Name',
      dataIndex: 'device_name',
      key: 'device_name',
      sorter: (a, b) => a.device_name.localeCompare(b.device_name),
      ...getColumnSearchProps('device_name'),
      render: (text) => (
        <Badge
          status="success"
          text={
            <span style={{ color: colors.textPrimary, fontWeight: 500 }}>
              {highlightText(text, searchText)}
            </span>
          }
        />
      ),
    },
    {
      title: 'Model',
      dataIndex: 'device_model',
      key: 'device_model',
      ...getColumnSearchProps('device_model'),
      render: (text) => (
        <Text style={{ color: colors.textSecondary, fontWeight: 500 }}>
          {highlightText(text, searchText)}
        </Text>
      ),
    },
    {
      title: 'IMEI',
      dataIndex: 'device_imei',
      key: 'device_imei',
      ...getColumnSearchProps('device_imei'),
      render: (text) => (
        <Text
          code
          style={{
            fontSize: '12px',
            background: `${colors.primary}10`,
            color: colors.primary,
            border: `1px solid ${colors.primary}20`,
            borderRadius: '6px',
            padding: '2px 6px',
          }}
        >
          {highlightText(text, searchText)}
        </Text>
      ),
    },
    {
      title: 'Location',
      key: 'location',
      render: (_, record) => (
        <div style={{ lineHeight: 1.4 }}>
          <div style={{ fontSize: '12px', color: record.latitude ? colors.success : colors.error, fontWeight: 500 }}>
            Lat: {record.latitude ? highlightText(record.latitude.toFixed(4), searchText) : 'N/A'}
          </div>
          <div style={{ fontSize: '12px', color: record.longitude ? colors.success : colors.error, fontWeight: 500 }}>
            Lng: {record.longitude ? highlightText(record.longitude.toFixed(4), searchText) : 'N/A'}
          </div>
        </div>
      ),
      sorter: (a, b) => (a.latitude || 0) - (b.latitude || 0),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 140,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit Device" placement="top">
            <ActionButton
              className="edit-btn"
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditDrawer(record)}
            >
              Edit
            </ActionButton>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Container>
      <StyledCard>
        <HeaderContainer>
          <TitleSection>
            <Title className="main-title">
              Device Management
            </Title>
            <Text className="subtitle">
              Manage and monitor your connected devices seamlessly
            </Text>
          </TitleSection>
          <ActionSection>
            <SearchContainer>
              <StyledSearchInput>
                <div className="search-input-wrapper">
                  <SearchOutlined className="search-icon" />
                  <input
                    className="search-input"
                    placeholder="Search devices across all fields..."
                    value={searchInputValue}
                    onChange={handleSearchChange}
                  />
                  {searchInputValue && (
                    <ClearOutlined 
                      className="clear-icon" 
                      onClick={handleSearchClear}
                    />
                  )}
                </div>
                {searchText && filteredData.length !== deviceList.length && (
                  <SearchResultsBadge>
                    {filteredData.length}
                  </SearchResultsBadge>
                )}
              </StyledSearchInput>
              <Tooltip title="Refresh List" placement="top">
                <StyledButton
                  type="default"
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                  loading={loading}
                />
              </Tooltip>
            </SearchContainer>
            <ButtonGroup>
              <StyledButton
                type="primary"
                icon={<PlusOutlined />}
                onClick={openAddDrawer}
              >
                Add Device
              </StyledButton>
              <StyledButton
                type="default"
                icon={<DownloadOutlined />}
                onClick={handleExport}
                disabled={!filteredData.length}
              >
                Export {searchText ? `(${filteredData.length})` : ''}
              </StyledButton>
            </ButtonGroup>
          </ActionSection>
        </HeaderContainer>
        <StyledTable
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          pagination={false}
          scroll={{ x: 'max-content', y: 600 }}
          loading={loading}
          onScroll={handleScroll}
          components={{
            body: {
              wrapper: (props) => (
                <tbody
                  {...props}
                  ref={(node) => {
                    if (node && node.parentNode) {
                      scrollRef.current = node.parentNode;
                      node.parentNode.onscroll = handleScroll;
                    }
                  }}
                />
              ),
            },
          }}
          locale={{
            emptyText: loading ? (
              <LoadingContainer>
                <Spin size="large" />
                <div className="loading-text">Loading devices...</div>
              </LoadingContainer>
            ) : searchText ? (
              <div style={{ padding: '48px', textAlign: 'center', color: colors.textSecondary }}>
                <SearchOutlined style={{ fontSize: '48px', color: colors.textSecondary, marginBottom: '16px' }} />
                <div>
                  <Text style={{ fontSize: '16px', color: colors.textSecondary, fontWeight: 500, display: 'block' }}>
                    No devices found for "{searchText}"
                  </Text>
                  <Text style={{ fontSize: '14px', color: colors.textSecondary, marginTop: '8px' }}>
                    Try adjusting your search terms
                  </Text>
                </div>
              </div>
            ) : (
              <div style={{ padding: '48px', textAlign: 'center', color: colors.textSecondary }}>
                <Text style={{ fontSize: '16px', color: colors.textSecondary, fontWeight: 500 }}>
                  No devices found
                </Text>
              </div>
            ),
          }}
        />
      </StyledCard>
      <DeviceDrawer
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onSave={handleSave}
        initialData={editDevice}
      />
    </Container>
  );
};

export default Device;