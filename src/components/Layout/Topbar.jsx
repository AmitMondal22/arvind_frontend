import React, { useState, useEffect } from 'react';
import { Input, Avatar, Badge, Dropdown, Space, Tooltip, Button, notification } from 'antd';
import { 
  SearchOutlined, 
  BellOutlined, 
  SettingOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const Topbar = ({ collapsed, onToggle }) => {
  const { logout, user } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);



  const userMenuItems = [
    {
      key: 'profile',
      label: 'Profile',
      icon: <UserOutlined />,
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <SettingOutlined />,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: 'Logout',
      danger: true,
    },
  ];

  const handleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        setShowFullscreenPrompt(false);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
      notification.error({
        message: 'Fullscreen Error',
        description: 'Unable to enter fullscreen mode. Please try again or check browser permissions.',
        duration: 3,
      });
    }
  };


  

  // Check if fullscreen is supported and show prompt
  useEffect(() => {
    // Check if fullscreen is supported
    if (document.fullscreenEnabled) {
      // Show a subtle prompt to enter fullscreen
      const timer = setTimeout(() => {
        setShowFullscreenPrompt(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleFullscreenError = (event) => {
      console.error('Fullscreen error event:', event);
      setIsFullscreen(false);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('fullscreenerror', handleFullscreenError);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('fullscreenerror', handleFullscreenError);
    };
  }, []);

  // Auto-dismiss fullscreen prompt after 10 seconds
  useEffect(() => {
    if (showFullscreenPrompt) {
      const timer = setTimeout(() => {
        setShowFullscreenPrompt(false);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [showFullscreenPrompt]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: collapsed ? 0 : 240,
        right: 0,
        height: 64,
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'all 0.2s ease-in-out'
      }}
    >
      {/* Fullscreen Prompt */}
      {showFullscreenPrompt && !isFullscreen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: '24px',
            background: '#fff',
            border: '1px solid #d9d9d9',
            borderRadius: '8px',
            padding: '12px 16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 1001,
            animation: 'slideDown 0.3s ease-out'
          }}
        >
          <span style={{ fontSize: '14px', color: '#666' }}>
            Click to enable fullscreen mode for better experience
          </span>
          <Button
            type="primary"
            size="small"
            icon={<FullscreenOutlined />}
            onClick={handleFullscreen}
          >
            Fullscreen
          </Button>
          <Button
            type="text"
            size="small"
            onClick={() => setShowFullscreenPrompt(false)}
            style={{ padding: '0 4px' }}
          >
            ×
          </Button>
        </div>
      )}

      {/* Left Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Toggle Button */}
        <div
          onClick={onToggle}
          style={{
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {collapsed ? <MenuUnfoldOutlined size={18} /> : <MenuFoldOutlined size={18} />}
        </div>

        {/* Page Title */}
        <div style={{ 
          fontSize: 18, 
          fontWeight: 600, 
          color: '#1a1a1a',
          letterSpacing: '-0.02em'
        }}>
          Outlet Management System
        </div>
      </div>

      {/* Right Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Fullscreen Button */}
        <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
          <div
            onClick={handleFullscreen}
            style={{
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s',
              fontSize: '16px',
              color: showFullscreenPrompt && !isFullscreen ? '#1890ff' : '#666',
              animation: showFullscreenPrompt && !isFullscreen ? 'pulse 2s infinite' : 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
          </div>
        </Tooltip>

        {/* User Profile */}
        <Dropdown
  menu={{ 
    items: userMenuItems,
    onClick: ({ key }) => {
      if (key === 'logout') {
        logout();
      }
    }
  }}
  placement="bottomRight"
  arrow
>
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: 8, 
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 8,
    transition: 'background-color 0.2s'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = '#f5f5f5';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = 'transparent';
  }}
  >
    <Avatar 
      size={32} 
      style={{ 
        backgroundColor: '#118067',
        fontSize: 14
      }}
    >
      {user?.user_name ? user.user_name.charAt(0).toUpperCase() : 'U'}
    </Avatar>
    <div style={{ 
      fontSize: 14, 
      fontWeight: 500, 
      color: '#1a1a1a'
    }}>
      {user?.user_name}
    </div>
  </div>
</Dropdown>

      </div>

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};

export default Topbar;
