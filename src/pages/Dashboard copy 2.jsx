import React, { useState } from 'react';
import { Card, Row, Col, Typography, Button, Table, Tag, Avatar, Space, Input, Select, DatePicker } from 'antd';
import { 
  SearchOutlined,
  SendOutlined,
  CreditCardOutlined,
  MoreOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  UserOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CalendarOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Sample data for cash flow chart
const cashFlowData = [
  { name: '4 Oct', income: 1200, expense: -800, net: 400 },
  { name: '11 Oct', income: 2200, expense: -1100, net: 1100 },
  { name: '18 Oct', income: 1800, expense: -600, net: 1200 },
  { name: '25 Oct', income: 3200, expense: -1800, net: 1400 },
  { name: '1 Nov', income: 2800, expense: -1200, net: 1600 },
  { name: '8 Nov', income: 1600, expense: -900, net: 700 },
  { name: '15 Nov', income: 2400, expense: -800, net: 1600 },
  { name: '22 Nov', income: 1900, expense: -1100, net: 800 },
  { name: '29 Nov', income: 2600, expense: -1400, net: 1200 },
  { name: '6 Dec', income: 3000, expense: -1600, net: 1400 },
  { name: '13 Dec', income: 2200, expense: -1000, net: 1200 },
  { name: '20 Dec', income: 2800, expense: -1500, net: 1300 }
];

// Sample transaction data
const transactionData = [
  {
    key: '1',
    name: 'Theo Lawrence',
    amount: '€ 500.00',
    status: 'Success',
    method: 'Credit Card',
    avatar: 'T',
    date: '2024-05-14',
    type: 'income'
  },
  {
    key: '2',
    name: 'Amy March',
    amount: '€ 250.00',
    status: 'Pending',
    method: 'Bank Transfer',
    avatar: 'A',
    date: '2024-05-14',
    type: 'expense'
  }
];

const Dashboard = () => {
  const [timeFilter, setTimeFilter] = useState('Weekly');

  const columns = [
    {
      title: 'TYPE',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar 
            size={32} 
            style={{ 
              backgroundColor: record.type === 'income' ? '#52c41a' : '#1890ff',
              fontSize: '14px'
            }}
          >
            {record.avatar}
          </Avatar>
          <div>
            <div style={{ fontWeight: '500' }}>{text}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.date}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'AMOUNT',
      dataIndex: 'amount',
      key: 'amount',
      render: (text, record) => (
        <Text style={{ 
          fontWeight: '600',
          color: record.type === 'income' ? '#52c41a' : '#262626'
        }}>
          {text}
        </Text>
      ),
    },
    {
      title: 'STATUS',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag 
          color={status === 'Success' ? 'success' : 'warning'}
          style={{ borderRadius: '12px', fontSize: '12px' }}
        >
          {status}
        </Tag>
      ),
    },
    {
      title: 'METHOD',
      dataIndex: 'method',
      key: 'method',
      render: (text) => (
        <Text type="secondary" style={{ fontSize: '13px' }}>
          {text}
        </Text>
      ),
    },
  ];

  const StatCard = ({ title, value, change, changeType, period, bgColor }) => (
    <Card 
      bodyStyle={{ padding: '20px' }}
      style={{ 
        backgroundColor: bgColor || '#fff',
        border: bgColor ? 'none' : '1px solid #f0f0f0',
        borderRadius: '12px'
      }}
    >
      <div style={{ marginBottom: '8px' }}>
        <Text 
          type="secondary" 
          style={{ 
            fontSize: '13px',
            color: bgColor ? 'rgba(255,255,255,0.8)' : '#8c8c8c'
          }}
        >
          {title}
        </Text>
        <Text 
          type="secondary" 
          style={{ 
            fontSize: '12px', 
            marginLeft: '8px',
            color: bgColor ? 'rgba(255,255,255,0.6)' : '#bfbfbf'
          }}
        >
          {period}
        </Text>
      </div>
      <Title 
        level={3} 
        style={{ 
          margin: '0 0 8px 0', 
          fontWeight: '600',
          color: bgColor ? '#fff' : '#262626'
        }}
      >
        {value}
      </Title>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {changeType === 'up' ? (
          <ArrowUpOutlined style={{ color: '#52c41a', fontSize: '12px' }} />
        ) : (
          <ArrowDownOutlined style={{ color: '#ff4d4f', fontSize: '12px' }} />
        )}
        <Text 
          style={{ 
            color: changeType === 'up' ? '#52c41a' : '#ff4d4f',
            fontSize: '12px',
            fontWeight: '500'
          }}
        >
          {change}
        </Text>
      </div>
    </Card>
  );

  return (
    <div style={{ 
      padding: '24px', 
      backgroundColor: '#fafafa', 
      minHeight: '100vh' 
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px' 
      }}>
        <Input
          placeholder="Search"
          prefix={<SearchOutlined />}
          style={{ width: '300px', borderRadius: '8px' }}
        />
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <RangePicker style={{ borderRadius: '8px' }} />
          <Button icon={<ExportOutlined />} style={{ borderRadius: '8px' }}>
            Export
          </Button>
        </div>
      </div>

      {/* Total Balance Card */}
      {/* <Card 
        style={{ 
          background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
          marginBottom: '24px',
          border: 'none',
          borderRadius: '16px'
        }}
        bodyStyle={{ padding: '32px' }}
      >
        <Row align="middle" justify="space-between">
          <Col>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
              Total Balance
            </Text>
            <Title 
              level={1} 
              style={{ 
                color: '#fff', 
                margin: '8px 0 16px 0', 
                fontWeight: '600',
                fontSize: '36px'
              }}
            >
              € 320,845.20
            </Title>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowUpOutlined style={{ color: '#52c41a', fontSize: '12px' }} />
              <Text style={{ color: '#52c41a', fontSize: '13px', fontWeight: '500' }}>
                +2.5%
              </Text>
            </div>
          </Col>
          <Col>
            <Space>
              <Button 
                type="primary" 
                icon={<SendOutlined />}
                style={{ 
                  backgroundColor: '#52c41a',
                  borderColor: '#52c41a',
                  borderRadius: '8px',
                  height: '40px'
                }}
              >
                Send
              </Button>
              <Button 
                style={{ 
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: '#fff',
                  borderRadius: '8px',
                  height: '40px'
                }}
              >
                Request
              </Button>
              <Button 
                style={{ 
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderColor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  borderRadius: '8px',
                  height: '40px'
                }}
                icon={<MoreOutlined />}
              />
            </Space>
          </Col>
        </Row>
      </Card> */}

      <Row gutter={[24, 24]}>
        {/* Cash Flow Chart */}
        <Col xs={24} lg={16}>
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Title level={4} style={{ margin: 0 }}>Cash Flow</Title>
                </div>
                <Space>
                  <Button size="small" type={timeFilter === 'Weekly' ? 'primary' : 'default'}>
                    Weekly
                  </Button>
                  <Button size="small" type={timeFilter === 'Daily' ? 'primary' : 'default'}>
                    Daily
                  </Button>
                  <Button size="small" icon={<MoreOutlined />} />
                </Space>
              </div>
            }
            bodyStyle={{ padding: '24px' }}
            style={{ borderRadius: '12px' }}
          >
            <div style={{ marginBottom: '24px' }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '12px', 
                      height: '12px', 
                      backgroundColor: '#52c41a', 
                      borderRadius: '2px' 
                    }} />
                    <Text type="secondary" style={{ fontSize: '13px' }}>Income</Text>
                    <Title level={4} style={{ margin: '0 0 0 8px', color: '#52c41a' }}>
                      € 12,378.20
                    </Title>
                    <Text style={{ color: '#52c41a', fontSize: '12px' }}>+40.5%</Text>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '12px', 
                      height: '12px', 
                      backgroundColor: '#ff4d4f', 
                      borderRadius: '2px' 
                    }} />
                    <Text type="secondary" style={{ fontSize: '13px' }}>Expense</Text>
                    <Title level={4} style={{ margin: '0 0 0 8px', color: '#ff4d4f' }}>
                      € 5,788.21
                    </Title>
                    <Text style={{ color: '#ff4d4f', fontSize: '12px' }}>+15.2%</Text>
                  </div>
                </Col>
              </Row>
            </div>
            
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#8c8c8c' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#8c8c8c' }}
                />
                <ReferenceLine y={0} stroke="#d9d9d9" />
                <Bar dataKey="income" fill="#52c41a" radius={[2, 2, 0, 0]} />
                <Bar dataKey="expense" fill="#ff4d4f" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Right Side Cards */}
        <Col xs={24} lg={8}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Financial Stats */}
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <StatCard 
                  title="Business account"
                  value="€ 8,672.20"
                  change="+16.2%"
                  changeType="up"
                  period="Last 30 days"
                />
              </Col>
            </Row>
            
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <StatCard 
                  title="Total Saving"
                  value="€ 3,765.35"
                  change="-5.2%"
                  changeType="down"
                  period="Last 30 days"
                />
              </Col>
              <Col span={12}>
                <StatCard 
                  title="Tax Reserve"
                  value="€ 14,376.16"
                  change="+22.5%"
                  changeType="up"
                  period="Last 30 days"
                />
              </Col>
            </Row>

            {/* Credit Card */}
            <Card 
              style={{ 
                background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                border: 'none',
                borderRadius: '16px',
                color: '#fff'
              }}
              bodyStyle={{ padding: '24px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
                    My Cards
                  </Text>
                  <div style={{ margin: '16px 0' }}>
                    <Text style={{ color: '#fff', fontSize: '16px', letterSpacing: '2px' }}>
                      •••• •••• •••• 2314
                    </Text>
                  </div>
                  <Title level={3} style={{ color: '#fff', margin: 0 }}>
                    € 4,540.20
                  </Title>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  VISA
                </div>
              </div>
            </Card>
          </div>
        </Col>

        {/* Recent Activity Table */}
        <Col xs={24}>
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>Recent Activity</Title>
                <Space>
                  <Button size="small" icon={<FilterOutlined />}>Filter</Button>
                  <Button size="small" icon={<SortAscendingOutlined />}>Sort</Button>
                  <Button size="small" type="link">See All</Button>
                </Space>
              </div>
            }
            bodyStyle={{ padding: '0' }}
            style={{ borderRadius: '12px' }}
          >
            <Table 
              columns={columns} 
              dataSource={transactionData}
              pagination={false}
              showHeader={true}
              style={{ borderRadius: '12px' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;