import React, { useEffect, useState } from 'react';
import { Col, Card, Select, Spin, Typography, Space, Badge } from 'antd';
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Cell
} from 'recharts';
import { RiseOutlined, BarChartOutlined, CalendarOutlined } from '@ant-design/icons';
import useDashboardApi from '../../api/useDashboardApi'; // ✅ Import real API hook

const { Option } = Select;
const { Text, Title } = Typography;

const DashboardChart = () => {
  const { apiDashboardBarChartSaleData } = useDashboardApi(); // ✅ Use actual API
  const [barChartData, setBarChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRange, setSelectedRange] = useState('WK');
  const [totalVolume, setTotalVolume] = useState(0);
  const [growthRate, setGrowthRate] = useState(0);

  const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#eb2f96', '#13c2c2', '#fa8c16'];

  const timeRanges = {
    WK: "Weekly",
    TW: "Two Weeks",
    MO: "Monthly",
    SM: "6 Months",
    YR: "Yearly"
  };

  useEffect(() => {
    getChartData(selectedRange);
  }, []);

  const getChartData = async (range) => {
    setLoading(true);
    try {
      const response = await apiDashboardBarChartSaleData(range); // ✅ Real API call

      if (response.status && Array.isArray(response.data)) {
        const processedData = response.data.map((item, index) => ({
          name: item.period,
          value: parseFloat(item.total_volume.toFixed(2)),
          color: colors[index % colors.length]
        }));

        setBarChartData(processedData);

        const total = processedData.reduce((sum, item) => sum + item.value, 0);
        setTotalVolume(total);

        const growthCalc =
          processedData.length > 1
            ? ((processedData[processedData.length - 1].value - processedData[0].value) /
               processedData[0].value) * 100
            : 0;
        setGrowthRate(growthCalc);
      } else {
        setBarChartData([]);
        setTotalVolume(0);
        setGrowthRate(0);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setBarChartData([]);
      setTotalVolume(0);
      setGrowthRate(0);
    } finally {
      setLoading(false);
    }
  };

  const handleRangeChange = async (value) => {
    setSelectedRange(value);
    await getChartData(value);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{
          backgroundColor: '#fff',
          border: '1px solid #e8e8e8',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#333' }}>{label}</p>
          <p style={{ margin: '4px 0 0 0', color: '#1890ff' }}>
            Volume: <strong>{payload[0].value.toFixed(2)} L</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(2);
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
              <BarChartOutlined style={{ color: '#fff', fontSize: '18px' }} />
            </div>
            <div>
              <Title level={4} style={{ margin: 0 }}>Sales Fuel</Title>
              <Text type="secondary" style={{ fontSize: '13px' }}>Performance Analytics</Text>
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

        {/* Stats */}
        {/* <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{
            background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #bae7ff',
            flex: 1,
            minWidth: '160px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RiseOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
              <Text type="secondary" style={{ fontSize: '13px' }}>Total Volume</Text>
            </div>
            <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
              {formatNumber(totalVolume)} L
            </Title>
          </div>

          <div style={{
            background: growthRate >= 0 ? '#f6ffed' : '#fff2e8',
            padding: '16px',
            borderRadius: '12px',
            border: `1px solid ${growthRate >= 0 ? '#b7eb8f' : '#ffbb96'}`,
            flex: 1,
            minWidth: '160px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Badge status={growthRate >= 0 ? "success" : "warning"} />
              <Text type="secondary" style={{ fontSize: '13px' }}>Growth Rate</Text>
            </div>
            <Title level={3} style={{
              margin: 0,
              color: growthRate >= 0 ? '#52c41a' : '#fa8c16'
            }}>
              {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
            </Title>
          </div>
        </div> */}

        {/* Chart */}
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #f0f0f0'
        }}>
          <Spin spinning={loading} size="large">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={formatNumber} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={800}>
                  {barChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Spin>
        </div>

        {/* <div style={{
          marginTop: '16px',
          padding: '12px 0',
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Last updated: {new Date().toLocaleTimeString()}
          </Text>
          <Space>
            <Badge status="processing" />
            <Text type="secondary" style={{ fontSize: '12px' }}>Live Data</Text>
          </Space>
        </div> */}
      </Card>

  );
};

export default DashboardChart;
