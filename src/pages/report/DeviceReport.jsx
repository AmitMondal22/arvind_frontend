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
        const allDevices = res?.data || [];
        const omsDevices = allDevices.filter(d => d.device_type === 'OMS' || (!d.device_type && !d.device_name?.includes('AMS')));
        setDevices(omsDevices.length ? omsDevices : allDevices);
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
  return (
    <div style={{ background: '#f4f7fe', minHeight: '100vh', padding: '24px' }}>
      {/* 🎯 Header & Filters Integrated */}
      <Card
        bordered={false}
        style={{ marginBottom: 24, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>
              Device Performance
            </Title>
            <Text style={{ color: '#64748b' }}>
              Historical device metrics and sensor data
            </Text>
          </Col>

          <Col xs={24} lg={16}>
            <Row gutter={[12, 12]} justify="end">
              <Col xs={24} sm={10} md={8}>
                <Select
                  placeholder="Choose Device"
                  style={{ width: '100%' }}
                  value={selectedDeviceId}
                  onChange={setSelectedDeviceId}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={devices.map(device => ({
                    label: `${device.device_name} (${device.device})`,
                    value: device.device_id
                  }))}
                  size="large"
                />
              </Col>
              <Col xs={24} sm={10} md={8}>
                <RangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  size="large"
                />
              </Col>
              <Col xs={12} sm={4} md={4}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Button
                    type="primary"
                    onClick={handleSubmit}
                    block
                    loading={loading}
                    size="large"
                    style={{ borderRadius: 8, fontWeight: 600 }}
                  >
                    Apply
                  </Button>
                  <Button
                    type="default"
                    icon={<DownloadOutlined />}
                    onClick={exportToExcel}
                    block
                    disabled={!tableData.length}
                    size="large"
                    style={{ borderRadius: 8, fontWeight: 600 }}
                  >
                    Export
                  </Button>
                </Space>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* 📋 Data Table */}
      <Card
        bordered={false}
        style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          columns={columns}
          dataSource={tableData}
          rowKey="water_data_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => <span style={{ color: '#64748b' }}>Total {total} records</span>,
          }}
          scroll={{ x: 'max-content' }}
          bordered={false}
          className="sleek-table"
        />
        <style>{`
          .sleek-table .ant-table-thead > tr > th {
            background: #f8fafc;
            color: #475569;
            font-weight: 600;
            border-bottom: 1px solid #e2e8f0;
            padding: 16px 24px;
          }
          .sleek-table .ant-table-tbody > tr > td {
            padding: 16px 24px;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
          }
          .sleek-table .ant-table-tbody > tr:hover > td {
            background: #f8fafc;
          }
        `}</style>
      </Card>
    </div>
  );
};

export default DeviceReport;
