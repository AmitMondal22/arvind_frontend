import React, { useEffect, useState, useCallback } from 'react';
import { 
  Table, 
  Alert, 
  Select, 
  DatePicker, 
  Button, 
  Row, 
  Col, 
  Card, 
  Statistic, 
  Space, 
  Typography,
} from 'antd';
import { 
  DownloadOutlined, 
  FundOutlined, 
  DatabaseOutlined, 
  DashboardOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

import useDeviceApi from '../../api/useDeviceApi';
import useReportApi from '../../api/useReportApi';
import useDashboardDeviceApi from '../../api/useDashboardDeviceApi';
import { useAuth } from '../../context/AuthContext';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const AmsDeviceReport = () => {
  const { apiDesiceList } = useDeviceApi();
  const { apiDeviceReport } = useReportApi();
  const { getDeviceThresholdsApi } = useDashboardDeviceApi();
  const { user } = useAuth();

  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [thresholds, setThresholds] = useState({ min_val: 0, max_val: 100 });
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(1, 'day'),
    dayjs(),
  ]);

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 🔹 Fetch AMS devices
  useEffect(() => {
    const fetchDevices = async () => {
      setLoading(true);
      try {
        const payload = {
          client_id: 1,
          organization_id: user?.organization_id ?? 0,
        };
        const res = await apiDesiceList(payload);
        const allDevices = res?.data || [];
        // Filter for AMS devices
        const amsDevices = allDevices.filter(d => d.device_type === 'AMS' || d.device_name?.includes('AMS'));
        setDevices(amsDevices.length ? amsDevices : allDevices);
      } catch (err) {
        setError('Failed to load devices');
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔹 Fetch thresholds when device changes
  useEffect(() => {
    const fetchThresholds = async () => {
      if (selectedDeviceId) {
        const selectedDevice = devices.find(d => d.device_id === selectedDeviceId);
        if (selectedDevice?.device) {
          const res = await getDeviceThresholdsApi(selectedDevice.device);
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
      }
    };
    fetchThresholds();
  }, [selectedDeviceId, devices]);

  // 🔹 Calculate scaled pressure
  const calculateScaledPressure = useCallback((rawVal) => {
    if (rawVal == null || rawVal === '') return 0;
    
    const minV = Number(thresholds.min_val != null ? thresholds.min_val : 0);
    const maxV = Number(thresholds.max_val != null ? thresholds.max_val : 100);
    
    const raw = Number(rawVal);
    
    // Using algorithm: min(minV + raw, maxV)
    const result = Math.min(minV + raw, maxV);
    
    return Number(result.toFixed(2));
  }, [thresholds]);


  // 🔹 Export to Excel
  const exportToExcel = () => {
    if (!tableData.length) {
      Alert.error({ message: 'No data to export' });
      return;
    }

    const selectedDevice = devices.find(d => d.device_id === selectedDeviceId);
    
    // Prepare data for export
    const exportData = tableData.map(row => ({
      Date: row.date,
      Time: row.time,
      Device: row.device,
      Pressure: calculateScaledPressure(row.flow_rate1),
    }));

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'AMS Report');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 12 }
    ];

    // Generate file name with date range
    const fileName = `AMS_Report_${selectedDevice?.device_name || 'Unknown'}_${dateRange[0].format('YYYY-MM-DD')}_to_${dateRange[1].format('YYYY-MM-DD')}.xlsx`;
    
    // Download file
    XLSX.writeFile(workbook, fileName);
  };

  // 🔹 Submit report
  const handleSubmit = async () => {
    if (!selectedDeviceId || !dateRange) {
      setError('Please select device and date range');
      return;
    }

    setLoading(true);
    setError(null);

    const selectedDevice = devices.find(d => d.device_id === selectedDeviceId);

    try {
      const payload = {
        client_id: 1,
        device_id: selectedDevice.device_id,
        device: selectedDevice.device,
        start_date: dateRange[0].format('YYYY-MM-DD'),
        end_date: dateRange[1].format('YYYY-MM-DD'),
      };

      const res = await apiDeviceReport(payload);
      setTableData(res?.data || []);
    } catch (err) {
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Calculate statistics
  const getStatistics = () => {
    const totalRecords = tableData.length;
    const selectedDevice = devices.find(d => d.device_id === selectedDeviceId);
    
    // Check max pressure logic
    const maxPressure = tableData.length > 0 
      ? Math.max(...tableData.map(r => calculateScaledPressure(r.flow_rate1)))
      : 0;

    return {
      totalRecords,
      maxPressure,
      deviceName: selectedDevice?.device_name || 'N/A',
      dateRangeText: dateRange ? `${dateRange[0].format('DD MMM')} - ${dateRange[1].format('DD MMM YYYY')}` : 'N/A'
    };
  };

  const stats = getStatistics();

  // 🔹 Table columns
  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 100,
    },
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
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
      title: 'Pressure',
      dataIndex: 'flow_rate1',
      key: 'flow_rate1',
      width: 120,
      render: (val) => (
        <span style={{ color: '#1890ff', fontWeight: 600 }}>
          {calculateScaledPressure(val)} Bar
        </span>
      ),
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
            <DashboardOutlined /> AMS Operations Report
          </Title>
          <Text style={{ color: 'rgba(0, 0, 0, 0.85)', fontSize: 12 }}>
            Monitor and export detailed operation statistics and pressure logs
          </Text>
        </Space>
      </Card>

      {/* 📊 Statistics Cards */}
      {tableData.length > 0 && (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ borderRadius: 6 }} bodyStyle={{ padding: '16px' }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}>Total Records</span>}
                value={stats.totalRecords}
                prefix={<DatabaseOutlined style={{ color: '#1890ff', fontSize: 16 }} />}
                valueStyle={{ color: '#1890ff', fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ borderRadius: 6 }} bodyStyle={{ padding: '16px' }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}>Max Pressure</span>}
                value={stats.maxPressure}
                prefix={<FundOutlined style={{ color: '#f5222d', fontSize: 16 }} />}
                valueStyle={{ color: '#f5222d', fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ borderRadius: 6 }} bodyStyle={{ padding: '16px' }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}>Device</span>}
                value={stats.deviceName}
                valueStyle={{ fontSize: 16, color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ borderRadius: 6 }} bodyStyle={{ padding: '16px' }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}>Date Range</span>}
                value={stats.dateRangeText}
                prefix={<CalendarOutlined style={{ color: '#fa8c16', fontSize: 16 }} />}
                valueStyle={{ fontSize: 13, color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>
      )}

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
              value={selectedDeviceId}
              onChange={setSelectedDeviceId}
              showSearch
              optionFilterProp="children"
            >
              {devices.map(device => (
                <Select.Option key={device.device_id} value={device.device_id}>
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
        title={<span style={{ fontSize: 13 }}><FundOutlined /> Device Data Records</span>}
        bordered={false}
        style={{ borderRadius: 6 }}
        bodyStyle={{ padding: '16px' }}
        headStyle={{ padding: '0 16px', minHeight: 40 }}
      >
        <Table
          columns={columns}
          dataSource={tableData}
          rowKey="water_data_id"
          loading={loading}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => <span style={{ fontSize: 12 }}>Total {total} records</span>,
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

export default AmsDeviceReport;
