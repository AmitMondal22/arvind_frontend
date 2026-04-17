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
              AMS Alert Report
            </Title>
            <Text style={{ color: '#64748b' }}>
              View and export AMS threshold alerts based on date range
            </Text>
          </Col>

          <Col xs={24} lg={16}>
            <Row gutter={[12, 12]} justify="end">
              <Col xs={24} sm={10} md={8}>
                <Select
                  placeholder="Choose Device"
                  style={{ width: '100%' }}
                  value={selectedDevice}
                  onChange={setSelectedDevice}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={devices.map(device => ({
                    label: `${device.device_name} (${device.device})`,
                    value: device.device
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
          rowKey="id"
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

export default AmsAlertReport;
