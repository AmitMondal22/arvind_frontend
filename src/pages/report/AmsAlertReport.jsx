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
import useManagementGatewayApi from '../../api/useManagementGatewayApi';
import { useAuth } from '../../context/AuthContext';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const AmsAlertReport = () => {
  const { apiDesiceList, apiDeviceListByGateway } = useDeviceApi();
  const { apiAmsAlertReport } = useReportApi();
  const { getDeviceThresholdsApi } = useDashboardDeviceApi();
  const { listGatewayApi } = useManagementGatewayApi();
  const { user } = useAuth();

  const [gateways, setGateways] = useState([]);
  const [selectedGatewayId, setSelectedGatewayId] = useState(null);
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

  // 🔹 Load gateways on mount
  useEffect(() => {
    const fetchGateways = async () => {
      try {
        const res = await listGatewayApi();
        setGateways(res?.data || []);
      } catch (err) {
        console.error('Failed to load gateways');
      }
    };
    fetchGateways();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔹 Load devices when gateway changes
  useEffect(() => {
    const fetchDevices = async () => {
      if (!selectedGatewayId) {
        setDevices([]);
        setSelectedDevice(null);
        return;
      }
      try {
        const res = await apiDeviceListByGateway({ gateway_id: selectedGatewayId });
        const allDevices = res?.data || [];
        // Strictly show only AMS devices
        const amsDevices = allDevices.filter(d => d.device_type === 'AMS');
        setDevices(amsDevices);
        setSelectedDevice(null);
      } catch (err) {
        console.error('Failed to load devices');
      }
    };
    fetchDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGatewayId]);

  // 🔹 Handle gateway change
  const handleGatewayChange = (value) => {
    setSelectedGatewayId(value);
    setSelectedDevice(null);
    setTableData([]);
  };

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
      setError('Please select a gateway and device');
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
    <div style={{ background: '#f4f7fe', minHeight: '100vh', padding: '16px' }}>
      {/* 🎯 Filters */}
      <Card
        bordered={false}
        style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}
        bodyStyle={{ padding: '16px' }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={6} md={5}>
            <Select
              placeholder="Select Gateway"
              style={{ width: '100%' }}
              value={selectedGatewayId}
              onChange={handleGatewayChange}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={gateways.map(gw => ({
                label: `${gw.gateway_id}`,
                value: gw.gateway_id
              }))}
              allowClear
            />
          </Col>
          <Col xs={24} sm={6} md={5}>
            <Select
              placeholder="Choose Device"
              style={{ width: '100%' }}
              value={selectedDevice}
              onChange={setSelectedDevice}
              showSearch
              disabled={!selectedGatewayId}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={devices.map(device => ({
                label: `${device.device_name} (${device.device})`,
                value: device.device
              }))}
            />
          </Col>
          <Col xs={24} sm={8} md={7}>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
            />
          </Col>
          <Col xs={12} sm={2} md={3}>
            <Button
              type="primary"
              onClick={handleSubmit}
              block
              loading={loading}
              style={{ borderRadius: 6 }}
            >
              Apply
            </Button>
          </Col>
          <Col xs={12} sm={2} md={3}>
            <Button
              type="default"
              icon={<DownloadOutlined />}
              onClick={exportToExcel}
              block
              disabled={!tableData.length}
              style={{ borderRadius: 6 }}
            >
              Export
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 📋 Data Table */}
      <Card
        bordered={false}
        style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          columns={columns}
          dataSource={tableData}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={false}
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
            padding: 8px 16px;
            font-size: 13px;
          }
          .sleek-table .ant-table-tbody > tr > td {
            padding: 8px 16px;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
            font-size: 13px;
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
