import React, { useState, useEffect, useCallback } from 'react';
import { 
  Table, 
  Alert, 
  DatePicker, 
  Button, 
  Row, 
  Col, 
  Tag, 
  Card, 
  Space, 
  Select,
  Typography,
} from 'antd';
import { 
  DownloadOutlined, 
  FundOutlined, 
  DatabaseOutlined, 
  DashboardOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

import useDeviceApi from '../../api/useDeviceApi';
import useReportApi from '../../api/useReportApi';
import useDashboardDeviceApi from '../../api/useDashboardDeviceApi';
import { useAuth } from '../../context/AuthContext';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const AmsAlertReport = () => {
  const { apiDesiceList } = useDeviceApi();
  const { apiAmsAlertReport } = useReportApi();
  const { getDeviceThresholdsApi } = useDashboardDeviceApi();
  const { user } = useAuth();

  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [thresholds, setThresholds] = useState({ min_val: 0, max_val: 100 });

  const [dateRange, setDateRange] = useState([
    dayjs().subtract(7, 'day'),
    dayjs(),
  ]);

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const payload = {
          client_id: 1,
          organization_id: user?.organization_id ?? 0,
        };
        const res = await apiDesiceList(payload);
        const allDevices = res?.data || [];
        const amsDevices = allDevices.filter(d => d.device_type === 'AMS' || d.device_name?.includes('AMS'));
        setDevices(amsDevices.length ? amsDevices : allDevices);
      } catch (err) {
        console.error('Failed to load devices');
      }
    };
    fetchDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔹 Fetch thresholds when device changes
  useEffect(() => {
    const fetchThresholds = async () => {
      if (selectedDevice) {
        const res = await getDeviceThresholdsApi(selectedDevice);
        if (res?.status || res?.data) {
          const fetchedData = res?.data?.data || res?.data || res;
          if (fetchedData && typeof fetchedData === 'object' && 'min_val' in fetchedData) {
            setThresholds({
              min_val: fetchedData.min_val ?? 0,
              max_val: fetchedData.max_val ?? 100,
            });
          }
        }
      }
    };
    fetchThresholds();
  }, [selectedDevice]);

  // 🔹 Calculate scaled pressure dynamically using min(minV + raw, maxV) algorithm
  const calculateScaledPressure = useCallback((rawVal) => {
    if (rawVal == null || rawVal === '') return 0;
    
    const minV = Number(thresholds.min_val != null ? thresholds.min_val : 0);
    const maxV = Number(thresholds.max_val != null ? thresholds.max_val : 100);
    
    const raw = Number(rawVal);
    
    // min(current + input, max_val)
    const result = Math.min(minV + raw, maxV);
    
    return Number(result.toFixed(2));
  }, [thresholds]);

  // 🔹 Export to Excel
  const exportToExcel = () => {
    if (!tableData.length) {
      Alert.error({ message: 'No data to export' });
      return;
    }

    // Prepare data for export
    const exportData = tableData.map(row => ({
      'ID': row.id,
      'Client ID': row.client_id,
      'Device': row.device,
      'Alert Type': row.alert_type,
      'Alert Value': calculateScaledPressure(row.alert_value), 
      'Created At': row.created_at,
    }));

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'AMS Alerts');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, 
      { wch: 15 }, { wch: 25 }
    ];

    // Generate file name with date range
    const fileName = `AMS_Alert_Report_${selectedDevice || 'All'}_${dateRange[0].format('YYYY-MM-DD')}_to_${dateRange[1].format('YYYY-MM-DD')}.xlsx`;
    
    // Download file
    XLSX.writeFile(workbook, fileName);
  };

  // 🔹 Submit report
  const handleSubmit = async () => {
    if (!selectedDevice) {
      setError('Please select a device');
      return;
    }
    if (!dateRange || dateRange.length < 2) {
      setError('Please select date range');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        device: selectedDevice,
        start_date: dateRange[0].format('YYYY-MM-DD'),
        end_date: dateRange[1].format('YYYY-MM-DD'),
      };

      const res = await apiAmsAlertReport(payload);
      if (res?.status || res?.data) {
        setTableData(res.data?.data || res.data || []);
      } else {
        setTableData([]);
      }
    } catch (err) {
      setError('Failed to load alert report');
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Table columns
  const columns = [
    {
      title: 'Alert ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Client ID',
      dataIndex: 'client_id',
      key: 'client_id',
      width: 100,
    },
    {
      title: 'Device',
      dataIndex: 'device',
      key: 'device',
      width: 150,
      render: (val) => <Text strong>{val}</Text>,
    },
    {
      title: 'Alert Type',
      dataIndex: 'alert_type',
      key: 'alert_type',
      width: 120,
      render: (val) => (
        <Tag color={val === 'High Value' || val === 'HIGH' ? 'red' : 'orange'}>
          {val}
        </Tag>
      )
    },
    {
      title: 'Alert Value',
      dataIndex: 'alert_value',
      key: 'alert_value',
      width: 120,
      render: (val) => (
        <span style={{ color: '#1890ff', fontWeight: 600 }}>
          {calculateScaledPressure(val)} Bar
        </span>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
    },
  ];

  if (error) return <Alert type="error" message={error} showIcon />;

  return (
    <div style={{ background: '#fff', minHeight: '100vh', padding: '16px' }}>
      {/* 🎨 Header Section */}
      <Card 
        bordered={false}
        style={{ 
          marginBottom: 16,
          borderRadius: 6
        }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <Title level={4} style={{ color: '#000000ff', margin: 0, fontSize: 16, fontWeight: 600 }}>
            <DashboardOutlined /> AMS Alert Report
          </Title>
          <Text style={{ color: 'rgba(0, 0, 0, 0.85)', fontSize: 12 }}>
            View and export AMS threshold alerts based on date range
          </Text>
        </Space>
      </Card>

      {/* 🎯 Filters Section */}
      <Card 
        title={<span style={{ fontSize: 13 }}><DatabaseOutlined /> Report Filters</span>}
        bordered={false}
        style={{ marginBottom: 16, borderRadius: 6 }}
        bodyStyle={{ padding: '16px' }}
        headStyle={{ padding: '0 16px', minHeight: 40 }}
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={24} md={10} lg={8}>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>
              Select Device
            </Text>
            <Select
              placeholder="Choose a device"
              style={{ width: '100%', fontSize: 12 }}
              value={selectedDevice}
              onChange={setSelectedDevice}
              showSearch
              optionFilterProp="children"
            >
              {devices.map(device => (
                <Select.Option key={device.device} value={device.device}>
                  <span style={{ fontSize: 12 }}>
                    {device.device_name} ({device.device})
                  </span>
                </Select.Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={24} md={10} lg={10}>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>
              Date Range
            </Text>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
            />
          </Col>

          <Col xs={12} sm={12} md={2} lg={3}>
            <Text strong style={{ display: 'block', marginBottom: 6, opacity: 0, fontSize: 12 }}>
              Action
            </Text>
            <Button 
              type="primary" 
              onClick={handleSubmit} 
              block 
              loading={loading}
              style={{ fontSize: 12 }}
            >
              Submit
            </Button>
          </Col>

          <Col xs={12} sm={12} md={2} lg={3}>
            <Text strong style={{ display: 'block', marginBottom: 6, opacity: 0, fontSize: 12 }}>
              Export
            </Text>
            <Button 
              type="default" 
              icon={<DownloadOutlined style={{ fontSize: 12 }} />}
              onClick={exportToExcel} 
              block
              disabled={!tableData.length}
              style={{ fontSize: 12 }}
            >
              Excel
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 📋 Data Table */}
      <Card 
        title={<span style={{ fontSize: 13 }}><FundOutlined /> Alert Data Records</span>}
        bordered={false}
        style={{ borderRadius: 6 }}
        bodyStyle={{ padding: '16px' }}
        headStyle={{ padding: '0 16px', minHeight: 40 }}
      >
        <Table
          columns={columns}
          dataSource={tableData}
          rowKey="id"
          loading={loading}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => <span style={{ fontSize: 12 }}>Total {total} alerts</span>,
            responsive: true,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          scroll={{ x: 'max-content' }}
          size="small"
          bordered
          style={{ fontSize: 12 }}
        />
      </Card>
    </div>
  );
};

export default AmsAlertReport;
