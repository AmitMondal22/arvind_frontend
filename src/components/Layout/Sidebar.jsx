import React, { useEffect, useState } from "react";
import { Layout, Menu } from "antd";
import {
  DashboardOutlined,
  CalendarOutlined,
  BarChartOutlined,
  TeamOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  LogoutOutlined,
  CheckSquareOutlined,
  ApartmentOutlined,
  ProjectOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";

import { Link, useLocation, useNavigate } from "react-router-dom";
import useMenuApi from "../../api/useMenuApi";
import logo from "../../assets/logo/logo.jpg";
import { useAuth } from "../../context/AuthContext";


const { Sider } = Layout;

const Sidebar = ({ collapsed }) => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const selectedKey = location.pathname;
  const { menu_org_project_list } = useMenuApi();
  const [menudData, setMenudData] = useState([]);


  const [openKeys, setOpenKeys] = useState(() => {
    const keys = ["dashboard"];
    const path = location.pathname;
    if (path.startsWith("/master")) keys.push("master");
    if (path.startsWith("/management")) keys.push("management");
    const parts = path.split('/');
    if (parts.length > 2 && !isNaN(parts[1])) keys.push(`org-${parts[1]}`);
    return keys;
  });

  useEffect(() => {
    getMenuDataData();
  }, []);

  useEffect(() => {
    // Automatically open the submenu based on current route
    const path = location.pathname;
    setOpenKeys(prevKeys => {
      let newKeys = [...prevKeys];
      if (path.startsWith("/master") && !newKeys.includes("master")) newKeys.push("master");
      if (path.startsWith("/management") && !newKeys.includes("management")) newKeys.push("management");
      const parts = path.split('/');
      if (parts.length > 2 && !isNaN(parts[1]) && !newKeys.includes(`org-${parts[1]}`)) {
        newKeys.push(`org-${parts[1]}`);
      }
      return newKeys;
    });
  }, [location.pathname]);

  const onOpenChange = (keys) => {
    setOpenKeys(keys);
  };

  const getMenuDataData = async () => {
    const mnData = await menu_org_project_list();
    if (mnData.status) {
      setMenudData(mnData.data);
    } else {
      setMenudData([]);
    }
  };

  const handleMenuClick = ({ key }) => {
    if (key.startsWith("/")) {
      navigate(key);
    }
  };

  const menuMain = [
    {
      key: "dashboard",
      icon: <DashboardOutlined />,
      label: "Dashboard",
      children: menudData && menudData.length > 0 ? menudData.map((org) => ({
        key: `org-${org.organization_id}`,
        icon: <ApartmentOutlined />, // Organization-level icon
        label: org.organization_name,
        children: org.projects && org.projects.length > 0 ? org.projects.map((proj) => ({
          key: `/${org.organization_id}/${proj.project_id}/${org.organization_name}/${proj.project_name}`,
          icon: <ProjectOutlined />, // Project-level icon
          label: proj.project_name,
        })) : undefined,
      })) : undefined,
    },
  ];

  const menuGeneral = [
    { key: "/settings", icon: <SettingOutlined />, label: "Settings" },
    { key: "/help", icon: <QuestionCircleOutlined />, label: "Help" },
    // { key: "/logout", icon: <LogoutOutlined />, label: "Logout" },
  ];
  const menuMaster = [
    {
      key: "master",
      icon: <ApartmentOutlined />,
      label: "Master",
      children: [
        { key: "/master/organization", label: "Organization" },
        { key: "/master/user", label: "User" },
        { key: "/master/project", label: "Project" },
      ]
    }
  ];

  const menuManagement = [
    {
      key: "management",
      icon: <SettingOutlined />,
      label: "Management",
      children: [
        { key: "/management/device", label: "Device Management" },
        { key: "/management/project", label: "Project Management" },
        { key: "/management/user", label: "Manage User" },
      ]
    }
  ];

  const menuReport = [
    { key: "/historical_data", icon: <DatabaseOutlined />, label: "Historical Data" },

  ];



  return (
    <>
      <style>{`
        .ant-menu-title-content {
          white-space: normal !important;
          word-wrap: break-word !important;
          line-height: 1.4 !important;
        }
        .ant-menu-item {
          height: auto !important;
          min-height: 40px !important;
          padding-top: 8px !important;
          padding-bottom: 8px !important;
        }
        .ant-menu-submenu-title {
          height: auto !important;
          min-height: 40px !important;
          padding-top: 8px !important;
          padding-bottom: 8px !important;
        }
      `}</style>
      <Sider
        width={240}
        collapsedWidth={0}
        collapsed={collapsed}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 1001,
          background: "#fafafa",
          borderRight: "1px solid #f0f0f0",
          boxShadow: "2px 0 8px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        {/* Logo Section */}
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid #f0f0f0",
            background: "#fff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img
              src={logo}
              alt="Company Logo"
              style={{
                height: 32,
                width: "auto", // maintains aspect ratio
              }}
            />
          </div>
        </div>

        {/* Menu Content */}
        <div
          style={{
            padding: "16px 0",
            height: "calc(100vh - 64px)", // Subtract logo height
            overflowY: "auto", // Allow scrolling for the menus
            overflowX: "hidden" // Prevent horizontal scrolling
          }}
        >
          <div

            style={{
              padding: "8px 24px",
              fontSize: 11,
              fontWeight: 600,
              color: "#8c8c8c",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            MENU
          </div>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            openKeys={openKeys}
            onOpenChange={onOpenChange}
            onClick={handleMenuClick}
            items={menuMain}
            style={{ border: "none", background: "transparent", fontSize: 14 }}
          />


          <div
            style={{
              padding: "24px 24px 8px 24px",
              fontSize: 11,
              fontWeight: 600,
              color: "#8c8c8c",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            MASTER
          </div>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            openKeys={openKeys}
            onOpenChange={onOpenChange}
            onClick={handleMenuClick}
            items={menuMaster}
            style={{ border: "none", background: "transparent", fontSize: 14 }}
          />


          <div
            style={{
              padding: "24px 24px 8px 24px",
              fontSize: 11,
              fontWeight: 600,
              color: "#8c8c8c",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            MANAGEMENT
          </div>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            openKeys={openKeys}
            onOpenChange={onOpenChange}
            onClick={handleMenuClick}
            items={menuManagement}
            style={{ border: "none", background: "transparent", fontSize: 14 }}
          />



          <div
            style={{
              padding: "24px 24px 8px 24px",
              fontSize: 11,
              fontWeight: 600,
              color: "#8c8c8c",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            REPORT
          </div>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            openKeys={openKeys}
            onOpenChange={onOpenChange}
            onClick={handleMenuClick}
            items={menuReport}
            style={{ border: "none", background: "transparent", fontSize: 14 }}
          />

          {/* <div
          style={{
            padding: "24px 24px 8px 24px",
            fontSize: 11,
            fontWeight: 600,
            color: "#8c8c8c",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          GENERAL
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          openKeys={openKeys}
          onOpenChange={onOpenChange}
          onClick={handleMenuClick}
          items={menuGeneral}
          style={{ border: "none", background: "transparent", fontSize: 14 }}
        /> */}

        </div>
      </Sider>
    </>
  );
};

export default Sidebar;
