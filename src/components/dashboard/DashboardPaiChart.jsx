import React, { useEffect, useState } from 'react';
import { Col, Card, Select, Spin, Typography } from 'antd';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';
import { PieChartOutlined, CalendarOutlined } from '@ant-design/icons';
import useDashboardApi from '../../api/useDashboardApi';

const { Option } = Select;
const { Text, Title } = Typography;

const DashboardPaiChart = () => {
  const { apiDashboardPaiChartSaleData } = useDashboardApi();
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRange, setSelectedRange] = useState('WK');
  const [totalVolume, setTotalVolume] = useState(0);

  const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#eb2f96', '#13c2c2', '#fa8c16'];

  const timeRanges = {
    WK: 'Weekly',
    TW: 'Two Weeks',
    MO: 'Monthly',
    SM: '6 Months',
    YR: 'Yearly'
  };

  useEffect(() => {
    getChartData(selectedRange);
  }, []);

  const getChartData = async (range) => {
    setLoading(true);
    try {
      const response = await apiDashboardPaiChartSaleData(range);
      if (response.status && Array.isArray(response.data)) {
        const processedData = response.data.map((item, index) => ({
          name: item.fuel_type_name,
          value: parseFloat(item.total_volume_totalizer.toFixed(2)),
          color: colors[index % colors.length]
        }));

        const total = processedData.reduce((sum, item) => sum + item.value, 0);
        setChartData(processedData);
        setTotalVolume(total);
      } else {
        setChartData([]);
        setTotalVolume(0);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setChartData([]);
      setTotalVolume(0);
    } finally {
      setLoading(false);
    }
  };

  const handleRangeChange = async (value) => {
    setSelectedRange(value);
    await getChartData(value);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0];
      return (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #e8e8e8',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#333' }}>{name}</p>
          <p style={{ margin: '4px 0 0 0', color: '#1890ff' }}>
            Volume: <strong>{value.toLocaleString()}</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  return (

      <Card
        style={{
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: 'none',
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
          overflow: 'hidden'
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PieChartOutlined style={{ color: '#fff', fontSize: '18px' }} />
            </div>
            <div>
              <Title level={4} style={{ margin: 0 }}>Sales Volume by Fuel Type</Title>
              <Text type="secondary" style={{ fontSize: '13px' }}>Total Volume: {totalVolume.toLocaleString()}</Text>
            </div>
          </div>

          <Select
            value={selectedRange}
            style={{ width: 140, borderRadius: '8px' }}
            onChange={handleRangeChange}
            suffixIcon={<CalendarOutlined />}
            size="middle"
          >
            {Object.entries(timeRanges).map(([value, label]) => (
              <Option key={value} value={value}>{label}</Option>
            ))}
          </Select>
        </div>

        <div style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #f0f0f0'
        }}>
          <Spin spinning={loading} size="large">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={60}
                  label={({ name, value }) => `${name}: ${value.toFixed(0)}`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </Spin>
        </div>
      </Card>

  );
};

export default DashboardPaiChart;
