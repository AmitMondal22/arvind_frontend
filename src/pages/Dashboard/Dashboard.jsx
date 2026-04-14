// Dashboard.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { List, Card, Typography, Badge, Tag, Row, Col, Button, Tooltip, message, Tabs } from "antd";
import {
  HddOutlined,
  WifiOutlined,
  DisconnectOutlined,
  AppstoreOutlined,
  TabletOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import useDashboardDeviceApi from "../../api/useDashboardDeviceApi";
import './Dashboard.css';

const { Text, Title } = Typography;
const { TabPane } = Tabs;

const POLL_INTERVAL_MS = 30000; // 30 seconds

const Dashboard = () => {
  const { dashboardDeviceListType, deviceStatusUpdateApi } = useDashboardDeviceApi();
  const { organizationId, projectId, organizationName, projectname } = useParams();
  const navigate = useNavigate();
  const [deviceList, setDeviceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloadLoading, setReloadLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("OMS");
  
  const pollTimerRef = useRef(null);

  // ✅ Silent refresh — updates list without showing loading spinner
  const refreshDeviceList = useCallback(async () => {
    try {
      const dev_list = await dashboardDeviceListType(organizationId, projectId, activeTab);
      if (dev_list.status === "success") {
        setDeviceList(dev_list.data);
      }
    } catch (error) {
      console.error("Silent refresh failed:", error);
    }
  }, [organizationId, projectId, activeTab, dashboardDeviceListType]);

  // ✅ Initial load — shows loading spinner
  const getDeviceList = async () => {
    setLoading(true);
    try {
      const dev_list = await dashboardDeviceListType(organizationId, projectId, activeTab);
      if (dev_list.status === "success") {
        setDeviceList(dev_list.data);
      } else {
        setDeviceList([]);
      }
    } catch (error) {
      console.error("Dashboard device list load failed:", error);
      setDeviceList([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Reload button handler: call status_update API → then refresh list
  const handleReload = async () => {
    if (reloadLoading) return;
    setReloadLoading(true);
    try {
      // Collect all device_ids from current list
      const deviceIds = deviceList.map(d => d.device_id);
      if (deviceIds.length > 0) {
        await deviceStatusUpdateApi({
          client_id: 1,
          device_id: deviceIds,
        });
      }
      // After status update, refresh the device list
      await refreshDeviceList();
      message.success("Device status updated");
    } catch (error) {
      console.error("Reload failed:", error);
      message.error("Failed to update status");
    } finally {
      setReloadLoading(false);
    }
  };

  // ✅ Initial load
  useEffect(() => {
    getDeviceList();
  }, [organizationId, projectId, activeTab]);

  // ✅ Auto-poll every 30s — silent background refresh
  useEffect(() => {
    pollTimerRef.current = setInterval(() => {
      refreshDeviceList();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [refreshDeviceList]);

  const getDeviceStatus = (deviceStatus) => {
    const isOnline = deviceStatus && deviceStatus.toUpperCase() === "ONLINE";
    return {
      status: isOnline ? "ONLINE" : "OFFLINE",
      color: isOnline ? "#52c41a" : "#ff4d4f",
      bgColor: isOnline ? "#f6ffed" : "#fff2f0",
      borderColor: isOnline ? "#b7eb8f" : "#ffccc7",
      icon: isOnline ? <WifiOutlined /> : <DisconnectOutlined />,
    };
  };

  const handleDeviceClick = (deviceId, device, device_name) => {
    if (activeTab === 'AMS') {
        navigate(`/ams-device/${organizationId}/${projectId}/${deviceId}/${device}/${device_name}/${organizationName}/${projectname}`);
    } else {
        navigate(`/device/${organizationId}/${projectId}/${deviceId}/${device}/${device_name}/${organizationName}/${projectname}`);
    }
  };

  const getHeaderTitle = () => {
    const orgName = organizationName || "Organization";
    const projName = projectname || "Project";
    return `${orgName} - ${projName}`;
  };

  // Use API results directly depending on tab selection
  const displayList = deviceList;

  const getDeviceCounts = (list) => {
    const onlineDevices = list.filter(device => {
      const status = getDeviceStatus(device.device_status);
      return status.status === "ONLINE";
    }).length;

    const offlineDevices = list.length - onlineDevices;

    return {
      total: list.length,
      online: onlineDevices,
      offline: offlineDevices
    };
  };

  const deviceCounts = getDeviceCounts(displayList);

  const renderDeviceGrid = (list) => (
    <List
      grid={{
        gutter: [20, 20],
        xs: 1,
        sm: 2,
        md: 3,
        lg: 4,
        xl: 5,
        xxl: 6,
      }}
      dataSource={list}
      renderItem={(item) => {
        const deviceStatus = getDeviceStatus(item.device_status);

        return (
          <List.Item>
            <Card
              hoverable
              onClick={() => handleDeviceClick(item.device_id, item.device, item.device_name)}
              className="device-card"
              style={{
                border: `1.5px solid ${deviceStatus.borderColor}`,
                background: deviceStatus.bgColor,
              }}
              bodyStyle={{
                padding: "20px 16px",
                textAlign: "center",
                position: "relative",
              }}
            >
              <Badge
                status={deviceStatus.status === "ONLINE" ? "success" : "error"}
                style={{ position: "absolute", top: "12px", right: "12px" }}
              />

              <div
                className="device-icon-container"
                style={{
                  background: `linear-gradient(135deg, ${deviceStatus.color}, ${deviceStatus.color}dd)`,
                  boxShadow: `0 3px 10px ${deviceStatus.color}30`,
                }}
              >
                <HddOutlined />
              </div>

              <Title
                level={5}
                className="device-name"
                ellipsis={{ tooltip: item.device_name }}
              >
                {item.device_name}
              </Title>

              <div style={{ marginBottom: "8px" }}>
                <Tag
                  color={deviceStatus.status === "ONLINE" ? "success" : "error"}
                  className="device-status-tag"
                >
                  {deviceStatus.icon}
                  {deviceStatus.status}
                </Tag>
              </div>
            </Card>
          </List.Item>
        );
      }}
      locale={{
        emptyText: (
          <div className="empty-state">
            <HddOutlined className="empty-icon" />
            <Title level={4} type="secondary">
              No devices found
            </Title>
            <Text type="secondary">Connect devices to see them here</Text>
          </div>
        ),
      }}
    />
  );

  return (
    <div className="dashboard-container">
      {/* Header Section */}
      <div className="dashboard-header-card">
        <Card bodyStyle={{ padding: "24px 28px", position: "relative", zIndex: 2 }}>
          <div className="background-orb-1" />
          <div className="background-orb-2" />

          <div className="header-section">
            <div className="dashboard-icon-container">
              <div className="shine-effect" />
              <AppstoreOutlined style={{ position: "relative", zIndex: 1 }} />
              <div className="pulse-ring" />
            </div>

            <div className="title-section">
              <Title level={2} className="header-title">
                {getHeaderTitle()}
              </Title>

              <div className="status-container">
                <div className="status-badge">
                  <div className="pulse-dot" />
                  <Text className="status-text">
                    Live Device Setup
                  </Text>
                </div>

                <Text className="monitoring-text">
                  Real-time Device Monitoring
                </Text>
              </div>
            </div>
            
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
            </div>
          </div>

          {/* Gradient Stats Grid matching the current tab */}
          <Row gutter={[16, 16]}>
            {/* Total Devices Card */}
            <Col span={8}>
              <div className="stats-card total">
                <div className="stats-content">
                  <div className="stats-header">
                    <div className="stats-label">Total {activeTab} Devices</div>
                    <div className="stats-icon-container">
                      <TabletOutlined className="stats-icon" />
                    </div>
                  </div>

                  <div className="stats-bottom">
                    <div className="stats-number">{deviceCounts.total}</div>
                    <div className="stats-unit">Devices</div>
                  </div>
                </div>
              </div>
            </Col>

            {/* Online Devices Card */}
            <Col span={8}>
              <div className="stats-card online">
                <div className="stats-content">
                  <div className="stats-header">
                    <div className="stats-label">Online Now</div>
                    <div className="stats-icon-container">
                      <WifiOutlined className="stats-icon" />
                    </div>
                  </div>

                  <div className="stats-bottom">
                    <div className="stats-number">{deviceCounts.online}</div>
                    <div className="stats-unit">Active</div>
                  </div>
                </div>
              </div>
            </Col>

            {/* Offline Devices Card */}
            <Col span={8}>
              <div className="stats-card offline">
                <div className="stats-content">
                  <div className="stats-header">
                    <div className="stats-label">Offline</div>
                    <div className="stats-icon-container">
                      <ExclamationCircleOutlined className="stats-icon" />
                    </div>
                  </div>

                  <div className="stats-bottom">
                    <div className="stats-number">{deviceCounts.offline}</div>
                    <div className="stats-unit">Inactive</div>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      </div>

      {/* TABS SECTION */}
      <Card
        className="devices-grid-card"
        bodyStyle={{ padding: "0" }}
        loading={loading}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="buttery-smooth-tabs"
          size="large"
          centered
        >
          <TabPane 
            tab={<span style={{ display: 'flex', alignItems: 'center' }}><AppstoreOutlined style={{ marginRight: 8, fontSize: '18px' }} />OMS Devices</span>} 
            key="OMS"
          >
             <div style={{ padding: "28px" }}>
               {renderDeviceGrid(displayList)}
             </div>
          </TabPane>
          <TabPane 
            tab={<span style={{ display: 'flex', alignItems: 'center' }}><HddOutlined style={{ marginRight: 8, fontSize: '18px' }} />AMS Devices</span>} 
            key="AMS"
          >
             <div style={{ padding: "28px" }}>
               {renderDeviceGrid(displayList)}
             </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default Dashboard;
