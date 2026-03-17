import React, { useEffect, useState } from 'react';
import { Card, Spin, Typography } from 'antd';
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
import { BarChartOutlined } from '@ant-design/icons';
import useDashboardApi from '../../api/useDashboardApi';

const { Text, Title } = Typography;

const DashboardChartCount = () => {
  const { apiDashboardChartCount } = useDashboardApi();
  const [barChartData, setBarChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#eb2f96', '#13c2c2', '#fa8c16'];

  useEffect(() => {
    getChartData();
  }, []);

  const getChartData = async () => {
    setLoading(true);
    try {
      const response = await apiDashboardChartCount();

      if (response.status && Array.isArray(response.data)) {
        const processedData = response.data.map((item, index) => ({
          name: item.date,
          value: item.transaction_count,
          color: colors[index % colors.length]
        }));
        setBarChartData(processedData);
      } else {
        setBarChartData([]);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setBarChartData([]);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #e8e8e8',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#333' }}>{label}</p>
          <p style={{ margin: '4px 0 0 0', color: '#1890ff' }}>
            Transactions: <strong>{payload[0].value}</strong>
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
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px'
      }}>
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
          <Title level={4} style={{ margin: 0 }}>Transaction Count</Title>
          <Text type="secondary" style={{ fontSize: '13px' }}>Last 30 Days Overview</Text>
        </div>
      </div>

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
              <YAxis tick={{ fontSize: 12 }} />
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
    </Card>
  );
};

export default DashboardChartCount;
