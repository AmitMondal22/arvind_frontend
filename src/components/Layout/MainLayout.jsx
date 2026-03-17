import React, { useState } from 'react';
import { Layout } from 'antd';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const { Content } = Layout;

const MainLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout
        style={{
          marginLeft: collapsed ? 0 : 240,
          transition: 'all 0.2s ease-in-out'
        }}
      >
        <Topbar collapsed={collapsed} onToggle={toggleSidebar} />
        <Content
          style={{
            marginTop: 64,
            padding: 24,
            background: '#f5f7fa',
            minHeight: 'calc(100vh - 64px)',
            overflow: 'auto'
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
