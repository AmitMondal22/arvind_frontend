import React, { useState, useEffect } from 'react';
import {
  Row, Col, Button, Table, Modal, Form, Input, notification, Space
} from 'antd';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, Title,
  Tooltip, Legend, ArcElement
} from 'chart.js';
import styled from 'styled-components';
import { LockOutlined, UnlockOutlined, DollarOutlined } from '@ant-design/icons';

ChartJS.register(
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, ArcElement
);

// Mock data (unchanged)
const mockTransactions = [
  { id: 1, date: '2025-01-15', volume: 50, amount: 100, pricePerLiter: 2 },
  { id: 2, date: '2025-02-10', volume: 40, amount: 80, pricePerLiter: 2 },
  { id: 3, date: '2025-03-05', volume: 60, amount: 120, pricePerLiter: 2 },
  { id: 4, date: '2024-06-01', volume: 70, amount: 140, pricePerLiter: 2 },
  { id: 5, date: '2023-12-20', volume: 30, amount: 60, pricePerLiter: 2 },
];

const mockLastSale = { volume: 40, amount: 80, pricePerLiter: 2 };
const mockPricePerLiter = 2;
const mockFuelTheftAlerts = [{ message: 'Unauthorized fuel detected!' }];

// Styled Components
const DashboardContainer = styled.div`
  padding: 32px;
  background: #f4f5f7;
  min-height: 100vh;
  font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

const GradientCard = styled.div`
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  overflow: hidden;
`;

const CardHeader = styled.div`
  padding: 16px 24px;
  background: ${props => props.gradient};
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
`;

const CardBody = styled.div`
  padding: 24px;
`;

const StatCard = styled(GradientCard)`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: #888;
`;

const StyledButton = styled(Button)`
  border-radius: 8px;
  padding: 6px 16px;
  font-weight: 500;
  transition: all 0.3s ease;
  &:hover {
    transform: translateY(-1px);
  }
`;

const AlertMessage = styled.p`
  color: #ff4d4f;
  font-weight: 500;
  margin: 0 0 8px;
`;

const ChartContainer = styled.div`
  padding: 16px;
  background: #ffffff;
  border-radius: 8px;
`;

const Dashboard = () => {
  const [form] = Form.useForm();
  const [transactions, setTransactions] = useState([]);
  const [pricePerLiter, setPricePerLiter] = useState(0);
  const [dispenserStatus, setDispenserStatus] = useState('Unlocked');
  const [lastSale, setLastSale] = useState({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [fuelTheftAlerts, setFuelTheftAlerts] = useState([]);

  useEffect(() => {
    setTransactions(mockTransactions);
    setLastSale(mockLastSale);
    setPricePerLiter(mockPricePerLiter);
    setFuelTheftAlerts(mockFuelTheftAlerts);
  }, []);

  const handlePriceUpdate = ({ price }) => {
    setPricePerLiter(price);
    notification.success({ message: 'Price updated successfully' });
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleDispenserControl = (action) => {
    const newStatus = action === 'lock' ? 'Locked' : 'Unlocked';
    setDispenserStatus(newStatus);
    notification.success({ message: `Dispenser ${newStatus.toLowerCase()} successfully` });
  };

  // Chart Data
  const monthlyTransactionData = {
    labels: Array.from({ length: 12 }, (_, i) =>
      new Date(0, i).toLocaleString('default', { month: 'short' })
    ),
    datasets: [
      {
        label: 'Transactions',
        data: transactions.reduce((acc, t) => {
          const month = new Date(t.date).getMonth();
          acc[month] += 1;
          return acc;
        }, Array(12).fill(0)),
        backgroundColor: '#a3bffa',
        borderRadius: 4,
      },
    ],
  };

  const yearlyTransactionData = {
    labels: ['2023', '2024', '2025'],
    datasets: [
      {
        label: 'Total Volume (Liters)',
        data: ['2023', '2024', '2025'].map(year =>
          transactions
            .filter(t => new Date(t.date).getFullYear().toString() === year)
            .reduce((sum, t) => sum + t.volume, 0)
        ),
        borderColor: '#a3bffa',
        backgroundColor: '#a3bffa',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const devicePerformanceData = {
    labels: ['Desktop', 'Tablet', 'Phone'],
    datasets: [
      {
        data: [50, 30, 20],
        backgroundColor: ['#ff9f43', '#28c76f', '#a3bffa'],
        borderWidth: 0,
      },
    ],
  };

  const columns = [
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Volume (L)', dataIndex: 'volume', key: 'volume' },
    { title: 'Amount ($)', dataIndex: 'amount', key: 'amount' },
    { title: 'Price/L ($)', dataIndex: 'pricePerLiter', key: 'pricePerLiter' },
  ];

  return (
    <DashboardContainer>
      {/* Top Row: Summary Cards */}
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard>
            <CardHeader gradient="linear-gradient(45deg, #4b7bec, #74c0fc)">
              Last Sale Volume
            </CardHeader>
            <CardBody>
              <StatValue>{lastSale.volume || 0} L</StatValue>
              <StatLabel>Total dispensed</StatLabel>
            </CardBody>
          </StatCard>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard>
            <CardHeader gradient="linear-gradient(45deg, #a855f7, #d8b4fe)">
              Last Sale Amount
            </CardHeader>
            <CardBody>
              <StatValue>${lastSale.amount || 0}</StatValue>
              <StatLabel>Total revenue</StatLabel>
            </CardBody>
          </StatCard>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard>
            <CardHeader gradient="linear-gradient(45deg, #2ecc71, #7eeeca)">
              Price per Liter
            </CardHeader>
            <CardBody>
              <StatValue>${pricePerLiter}</StatValue>
              <StatLabel>Current rate</StatLabel>
              <StyledButton
                style={{ marginTop: 12 }}
                icon={<DollarOutlined />}
                onClick={() => setIsModalVisible(true)}
              >
                Update Price
              </StyledButton>
            </CardBody>
          </StatCard>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard>
            <CardHeader gradient="linear-gradient(45deg, #ff9f43, #ffd591)">
              Dispenser Status
            </CardHeader>
            <CardBody>
              <StatValue>{dispenserStatus}</StatValue>
              <Space style={{ marginTop: 12 }}>
                <StyledButton
                  type="primary"
                  icon={<LockOutlined />}
                  onClick={() => handleDispenserControl('lock')}
                  disabled={dispenserStatus === 'Locked'}
                >
                  Lock
                </StyledButton>
                <StyledButton
                  type="primary"
                  icon={<UnlockOutlined />}
                  onClick={() => handleDispenserControl('unlock')}
                  disabled={dispenserStatus === 'Unlocked'}
                >
                  Unlock
                </StyledButton>
              </Space>
            </CardBody>
          </StatCard>
        </Col>
      </Row>

      {/* Middle Row: Charts */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <GradientCard>
            <CardHeader gradient="linear-gradient(45deg, #4b7bec, #74c0fc)">
              Monthly Transactions
            </CardHeader>
            <CardBody>
              <ChartContainer>
                <Bar
                  data={monthlyTransactionData}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { grid: { display: false } },
                      y: { grid: { color: '#e5e7eb' } },
                    },
                  }}
                />
              </ChartContainer>
            </CardBody>
          </GradientCard>
        </Col>
        <Col xs={24} lg={12}>
          <GradientCard>
            <CardHeader gradient="linear-gradient(45deg, #a855f7, #d8b4fe)">
              Yearly Volume
            </CardHeader>
            <CardBody>
              <ChartContainer>
                <Line
                  data={yearlyTransactionData}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { grid: { display: false } },
                      y: { grid: { color: '#e5e7eb' } },
                    },
                  }}
                />
              </ChartContainer>
            </CardBody>
          </GradientCard>
        </Col>
      </Row>

      {/* Bottom Row: Alerts, Pie Chart, and Table */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={8}>
          <GradientCard>
            <CardHeader gradient="linear-gradient(45deg, #ff9f43, #ffd591)">
              Alerts
            </CardHeader>
            <CardBody>
              {fuelTheftAlerts.length ? (
                fuelTheftAlerts.map((alert, idx) => (
                  <AlertMessage key={idx}>{alert.message}</AlertMessage>
                ))
              ) : (
                <p>No active alerts</p>
              )}
              <StyledButton
                danger
                icon={<LockOutlined />}
                onClick={() => handleDispenserControl('lock')}
              >
                Emergency Lock
              </StyledButton>
            </CardBody>
          </GradientCard>
        </Col>
        <Col xs={24} lg={8}>
          <GradientCard>
            <CardHeader gradient="linear-gradient(45deg, #2ecc71, #7eeeca)">
              Device Performance
            </CardHeader>
            <CardBody>
              <ChartContainer>
                <Pie
                  data={devicePerformanceData}
                  options={{
                    responsive: true,
                    plugins: { legend: { position: 'bottom' } },
                  }}
                />
              </ChartContainer>
            </CardBody>
          </GradientCard>
        </Col>
        <Col xs={24} lg={8}>
          <GradientCard>
            <CardHeader gradient="linear-gradient(45deg, #4b7bec, #74c0fc)">
              Transaction History
            </CardHeader>
            <CardBody>
              <Table
                columns={columns}
                dataSource={transactions}
                rowKey={(record) => record.id || `${record.date}-${record.volume}`}
                pagination={false}
                size="small"
              />
              <StyledButton style={{ marginTop: 12 }} onClick={() => alert('Exporting to CSV...')}>
                Export to CSV
              </StyledButton>
            </CardBody>
          </GradientCard>
        </Col>
      </Row>

      {/* Modal for Price Update */}
      <Modal
        title="Update Price per Liter"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        okButtonProps={{ style: { borderRadius: 8 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
      >
        <Form form={form} onFinish={handlePriceUpdate} layout="vertical">
          <Form.Item
            name="price"
            label="Price per Liter"
            rules={[{ required: true, message: 'Please enter the price' }]}
          >
            <Input type="number" step="0.01" style={{ borderRadius: 8 }} />
          </Form.Item>
        </Form>
      </Modal>
    </DashboardContainer>
  );
};

export default Dashboard;