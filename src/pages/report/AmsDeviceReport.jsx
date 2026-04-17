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
          {calculateScaledPressure(val)}
        </span>
      ),
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
              AMS Operations
            </Title>
            <Text style={{ color: '#64748b' }}>
              Historical pressure logs and device statistics
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

export default AmsDeviceReport;
