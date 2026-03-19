import React, { useEffect, useState } from 'react';
import { 
  Table, 
  Alert, 
  Select, 
  DatePicker, 
  Button, 
  Row, 
  Col, 
  Tag, 
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
import { useAuth } from '../../context/AuthContext';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const DeviceReport = () => {
  const { apiDesiceList } = useDeviceApi();
  const { apiDeviceReport } = useReportApi();
  const { user } = useAuth();

  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(1, 'day'),
    dayjs(),
  ]);

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 🔹 ONE TIME device list call (NO LOOP)
  useEffect(() => {
    const fetchDevices = async () => {
      setLoading(true);
      try {
        const payload = {
          client_id: 1,
          organization_id: user?.organization_id ?? 0,
        };
        const res = await apiDesiceList(payload);
        setDevices(res?.data || []);
      } catch (err) {
        setError('Failed to load devices');
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔹 Render individual valve status
  const renderValveStatus = (diStatus, valveIndex) => {
    if (!diStatus || diStatus.length <= valveIndex) return '-';
    const bit = diStatus[valveIndex];
    return (
      <Tag 
        color={bit === '1' ? 'success' : 'error'} 
        style={{ margin: 0, fontSize: 11 }}
      >
        {bit === '1' ? 'ON' : 'OFF'}
      </Tag>
    );
  };

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
      'Battery %': `${row.bat_v}%`,
      'VALVE 1': row.di_status[0] === '1' ? 'ON' : 'OFF',
      'VALVE 2': row.di_status[1] === '1' ? 'ON' : 'OFF',
      'VALVE 3': row.di_status[2] === '1' ? 'ON' : 'OFF',
      'VALVE 4': row.di_status[3] === '1' ? 'ON' : 'OFF',
      'VALVE 5': row.di_status[4] === '1' ? 'ON' : 'OFF',
      'VALVE 6': row.di_status[5] === '1' ? 'ON' : 'OFF',
    }));

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Device Report');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, 
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }
    ];

    // Generate file name with date range
    const fileName = `Device_Report_${selectedDevice?.device_name || 'Unknown'}_${dateRange[0].format('YYYY-MM-DD')}_to_${dateRange[1].format('YYYY-MM-DD')}.xlsx`;
    
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
    const avgBattery = tableData.length > 0 
      ? (tableData.reduce((sum, row) => sum + parseFloat(row.bat_v || 0), 0) / totalRecords).toFixed(1)
      : 0;
    const selectedDevice = devices.find(d => d.device_id === selectedDeviceId);
    
    return {
      totalRecords,
      avgBattery,
      deviceName: selectedDevice?.device_name || 'N/A',
      dateRangeText: dateRange ? `${dateRange[0].format('DD MMM')} - ${dateRange[1].format('DD MMM YYYY')}` : 'N/A'
    };
  };

  const stats = getStatistics();

  // 🔹 Table columns with separate valve columns
  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      fixed: 'left',
      width: 100,
      responsive: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
      width: 80,
      responsive: ['sm', 'md', 'lg', 'xl'],
    },
    {
      title: 'Device',
      dataIndex: 'device',
      key: 'device',
      width: 120,
      responsive: ['md', 'lg', 'xl'],
    },
    {
      title: 'Battery',
      dataIndex: 'bat_v',
      key: 'bat_v',
      width: 80,
      render: (value) => (
        <Tag 
          color={value > 70 ? 'green' : value > 30 ? 'orange' : 'red'}
          style={{ fontSize: 11 }}
        >
          {value}%
        </Tag>
      ),
      responsive: ['sm', 'md', 'lg', 'xl'],
    },
    // 🔹 Individual Valve Columns
    {
      title: 'Valve Status',
      children: [
        {
          title: 'V1',
          dataIndex: 'di_status',
          key: 'valve1',
          width: 65,
          align: 'center',
          render: (diStatus) => renderValveStatus(diStatus, 0),
          responsive: ['xl'],
        },
        {
          title: 'V2',
          dataIndex: 'di_status',
          key: 'valve2',
          width: 65,
          align: 'center',
          render: (diStatus) => renderValveStatus(diStatus, 1),
          responsive: ['xl'],
        },
        {
          title: 'V3',
          dataIndex: 'di_status',
          key: 'valve3',
          width: 65,
          align: 'center',
          render: (diStatus) => renderValveStatus(diStatus, 2),
          responsive: ['xl'],
        },
        {
          title: 'V4',
          dataIndex: 'di_status',
          key: 'valve4',
          width: 65,
          align: 'center',
          render: (diStatus) => renderValveStatus(diStatus, 3),
          responsive: ['xl'],
        },
        {
          title: 'V5',
          dataIndex: 'di_status',
          key: 'valve5',
          width: 65,
          align: 'center',
          render: (diStatus) => renderValveStatus(diStatus, 4),
          responsive: ['xl'],
        },
        {
          title: 'V6',
          dataIndex: 'di_status',
          key: 'valve6',
          width: 65,
          align: 'center',
          render: (diStatus) => renderValveStatus(diStatus, 5),
          responsive: ['xl'],
        },
      ],
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
          // background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 6
        }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <Title level={4} style={{ color: '#000000ff', margin: 0, fontSize: 16, fontWeight: 600 }}>
            <DashboardOutlined /> Device Performance Report
          </Title>
          <Text style={{ color: 'rgba(0, 0, 0, 0.85)', fontSize: 12 }}>
            Monitor and analyze device metrics, sensor data, and valve operations
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
                title={<span style={{ fontSize: 12 }}>Avg Battery</span>}
                value={stats.avgBattery}
                suffix="%"
                prefix={<FundOutlined style={{ color: '#52c41a', fontSize: 16 }} />}
                valueStyle={{ color: '#52c41a', fontSize: 20 }}
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

export default DeviceReport;
