import React, { useEffect, useState } from 'react';
import { Typography, Spin, Empty } from 'antd';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import moment from 'moment';
import useReportApi from '../../api/useReportApi';

const { Title } = Typography;

const AnalyticsPanel = ({ device, activeTab }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const { apiAnalyticsData } = useReportApi();

  useEffect(() => {
    getChartData();
  }, [device, activeTab]);

  const getChartData = async () => {
    if (!device?.id || !device?.device_number) {
      setChartData([]);
      return;
    }

    setLoading(true);
    
    try {
      const response = await apiAnalyticsData({ 
        device_id: device.id,
        device_number: device.device_number 
      });
      
      if (response?.status && response?.data) {
        const formattedData = response.data
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
          .map(item => ({
            time: moment(item.created_at).format('HH:mm'),
            volume: parseFloat(item.volume) || 0,
            amount: parseFloat(item.price) || 0,
            fullTime: moment(item.created_at).format('MMM DD, HH:mm')
          }));
        
        setChartData(formattedData);
      } else {
        setChartData([]);
      }
    } catch (err) {
      setChartData([]);
      console.error("Exception while fetching chart data:", err);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: '#fff',
          padding: '16px 20px',
          border: 'none',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          fontSize: '13px',
          fontWeight: '500'
        }}>
          <p style={{ 
            margin: '0 0 8px 0', 
            color: '#8B9AB8', 
            fontSize: '12px',
            fontWeight: '400'
          }}>
            {data.fullTime}
          </p>
          {payload.map((entry) => (
            <div key={entry.dataKey} style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '4px 0'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: entry.color
              }}></div>
              <span style={{ color: '#2D3748' }}>
                {entry.dataKey === 'volume' ? 'Volume' : 'Amount'}: {entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div style={{ 
        height: 420,
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        background: '#FAFBFC',
        borderRadius: '16px'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div style={{ 
        height: 420,
        background: '#FAFBFC',
        borderRadius: '16px',
        padding: '40px'
      }}>
        <Title 
          level={4} 
          style={{ 
            margin: '0 0 20px 0',
            color: '#2D3748',
            fontSize: '20px',
            fontWeight: '600'
          }}
        >
          Usage Trend
        </Title>
        <Empty 
          description={
            <span style={{ color: '#8B9AB8', fontSize: '14px' }}>
              No data available
            </span>
          }
          style={{ marginTop: '80px' }}
        />
      </div>
    );
  }

  return (
    <div style={{ 
      height: 420,
      background: '#FAFBFC',
      borderRadius: '16px',
      padding: '32px 24px 24px 24px',
      position: 'relative'
    }}>
      <Title 
        level={4} 
        style={{ 
          margin: '0 0 32px 0',
          color: '#2D3748',
          fontSize: '20px',
          fontWeight: '600',
          letterSpacing: '-0.01em'
        }}
      >
        Usage Trend
      </Title>
      
      <ResponsiveContainer width="100%" height="85%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
        >
          <XAxis 
            dataKey="time" 
            axisLine={false}
            tickLine={false}
            tick={{ 
              fontSize: 12, 
              fill: '#8B9AB8',
              fontWeight: '500'
            }}
            tickMargin={12}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ 
              fontSize: 12, 
              fill: '#8B9AB8',
              fontWeight: '500'
            }}
            tickMargin={8}
          />
          <Tooltip content={<CustomTooltip />} />
          
          <Line 
            type="monotone" 
            dataKey="volume" 
            stroke="#6366F1"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ 
              r: 4, 
              stroke: '#6366F1',
              strokeWidth: 2,
              fill: '#fff'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="amount" 
            stroke="#10B981"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ 
              r: 4, 
              stroke: '#10B981',
              strokeWidth: 2,
              fill: '#fff'
            }}
          />
        </LineChart>
      </ResponsiveContainer>
      
      <div style={{ 
        position: 'absolute',
        bottom: '16px',
        right: '24px',
        display: 'flex', 
        gap: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '12px',
            height: '2px',
            backgroundColor: '#6366F1',
            borderRadius: '1px'
          }}></div>
          <span style={{ 
            fontSize: '12px', 
            color: '#6B7280', 
            fontWeight: '500' 
          }}>
            Volume
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '12px',
            height: '2px',
            backgroundColor: '#10B981',
            borderRadius: '1px'
          }}></div>
          <span style={{ 
            fontSize: '12px', 
            color: '#6B7280', 
            fontWeight: '500' 
          }}>
            Amount
          </span>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;