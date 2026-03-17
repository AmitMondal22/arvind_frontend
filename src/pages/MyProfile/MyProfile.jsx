import React, { useState } from 'react';
import { 
  Card, 
  Avatar, 
  Descriptions, 
  Tag, 
  Button, 
  Space, 
  Typography,
  Row,
  Col,
  Badge,
  Tooltip,
  Divider
} from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  PhoneOutlined, 
  CalendarOutlined,
  EditOutlined,
  SettingOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  IdcardOutlined,
  CrownOutlined
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

const MyProfile = () => {
  const [editing, setEditing] = useState(false);
  const { user } = useAuth();
  
  const userData = user;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleConfig = (role) => {
    const roleConfigs = {
      'CAM': { 
        color: 'processing', 
        name: 'Company Admin',
        icon: <CrownOutlined />,
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      },
      'SA': { 
        color: 'error', 
        name: 'System Administrator',
        icon: <SettingOutlined />,
        gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
      },
      'CU': { 
        color: 'success', 
        name: 'Company User',
        icon: <UserOutlined />,
        gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
      },
      'MANAGER': { 
        color: 'warning', 
        name: 'Manager',
        icon: <TeamOutlined />,
        gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
      }
    };
    return roleConfigs[role] || { 
      color: 'default', 
      name: role, 
      icon: <UserOutlined />,
      gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
    };
  };

  const roleConfig = getRoleConfig(userData.user_role);

  const profileCardStyle = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
  };

  const cardStyle = {
    borderRadius: '12px',
    border: '1px solid #f0f0f0',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    transition: 'all 0.3s ease',
  };

  const hoverCardStyle = {
    ...cardStyle,
    ':hover': {
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
    }
  };

  return (
    <div style={{ 
      padding: '24px', 
    //   background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      minHeight: '100vh' 
    }}>
      <Row gutter={[24, 24]}>
        {/* Enhanced Profile Header Card */}
        <Col span={24}>
          <Card style={profileCardStyle} bodyStyle={{ padding: 0 }}>
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              padding: '32px',
              margin: '2px',
              borderRadius: '14px'
            }}>
              <Row align="middle" gutter={[24, 16]}>
                <Col flex="none">
                  <div style={{ position: 'relative' }}>
                    <Avatar 
                      size={100} 
                      icon={<UserOutlined />} 
                      style={{ 
                        background: roleConfig.gradient,
                        border: '4px solid white',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)'
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      background: userData.active_status ? '#52c41a' : '#ff4d4f',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: '3px solid white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {userData.active_status ? 
                        <CheckCircleOutlined style={{ color: 'white', fontSize: '10px' }} /> :
                        <CloseCircleOutlined style={{ color: 'white', fontSize: '10px' }} />
                      }
                    </div>
                  </div>
                </Col>
                
                <Col flex="auto">
                  <Title level={1} style={{ 
                    margin: 0, 
                    background: roleConfig.gradient,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontWeight: 700
                  }}>
                    {userData.name}
                  </Title>
                  
                  <Space size="large" style={{ marginTop: '12px' }}>
                    <Tag 
                      color={roleConfig.color} 
                      icon={roleConfig.icon}
                      style={{ 
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: 500,
                        border: 'none'
                      }}
                    >
                      {roleConfig.name}
                    </Tag>
                    
                    <Badge 
                      status={userData.active_status ? 'success' : 'error'} 
                      text={
                        <Text style={{ 
                          fontWeight: 500,
                          color: userData.active_status ? '#52c41a' : '#ff4d4f'
                        }}>
                          {userData.active_status ? 'Active Account' : 'Inactive Account'}
                        </Text>
                      }
                    />
                  </Space>
                  
                  <div style={{ marginTop: '16px' }}>
                    <Space size="middle">
                      <Text type="secondary">
                        <MailOutlined /> {userData.email}
                      </Text>
                      <Text type="secondary">
                        <PhoneOutlined /> {userData.mobile}
                      </Text>
                    </Space>
                  </div>
                </Col>
                
                {/* <Col flex="none">
                  <Space size="middle">
                    <Tooltip title="Edit your profile information">
                      <Button 
                        type="primary" 
                        size="large"
                        icon={<EditOutlined />}
                        onClick={() => setEditing(!editing)}
                        style={{
                          borderRadius: '8px',
                          background: roleConfig.gradient,
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                          fontWeight: 500
                        }}
                      >
                        {editing ? 'Save Changes' : 'Edit Profile'}
                      </Button>
                    </Tooltip>
                    
                    <Tooltip title="Account settings">
                      <Button 
                        size="large"
                        icon={<SettingOutlined />}
                        style={{
                          borderRadius: '8px',
                          border: '2px solid #f0f0f0',
                          fontWeight: 500
                        }}
                      >
                        Settings
                      </Button>
                    </Tooltip>
                  </Space>
                </Col> */}
              </Row>
            </div>
          </Card>
        </Col>

        {/* Enhanced Personal Information */}
        <Col xs={24} lg={16}>
          <Card 
            title={
              <Space>
                <IdcardOutlined style={{ color: '#1890ff' }} />
                <Text strong style={{ fontSize: '16px' }}>Personal Information</Text>
              </Space>
            }
            // extra={
            //   <Button 
            //     type="link" 
            //     icon={<EditOutlined />}
            //     style={{ fontWeight: 500 }}
            //   >
            //     Edit Details
            //   </Button>
            // }
            style={hoverCardStyle}
            headStyle={{ 
              borderBottom: '2px solid #f0f0f0',
              paddingTop: '20px',
              paddingBottom: '16px'
            }}
          >
            <Descriptions column={1} size="large" labelStyle={{ fontWeight: 600, color: '#595959' }}>
              <Descriptions.Item 
                label={
                  <Space>
                    <UserOutlined style={{ color: '#1890ff' }} />
                    <Text strong>Full Name</Text>
                  </Space>
                }
              >
                <Text style={{ fontSize: '16px', fontWeight: 500 }}>
                  {userData.name}
                </Text>
              </Descriptions.Item>
              
              <Descriptions.Item 
                label={
                  <Space>
                    <MailOutlined style={{ color: '#52c41a' }} />
                    <Text strong>Email Address</Text>
                  </Space>
                }
              >
                <Button 
                  type="link" 
                  href={`mailto:${userData.email}`}
                  style={{ 
                    padding: 0, 
                    fontSize: '16px',
                    fontWeight: 500,
                    color: '#1890ff'
                  }}
                >
                  {userData.email}
                </Button>
              </Descriptions.Item>
              
              <Descriptions.Item 
                label={
                  <Space>
                    <PhoneOutlined style={{ color: '#fa8c16' }} />
                    <Text strong>Mobile Number</Text>
                  </Space>
                }
              >
                <Button 
                  type="link" 
                  href={`tel:${userData.mobile}`}
                  style={{ 
                    padding: 0, 
                    fontSize: '16px',
                    fontWeight: 500,
                    color: '#1890ff'
                  }}
                >
                  {userData.mobile}
                </Button>
              </Descriptions.Item>
              
              <Descriptions.Item 
                label={
                  <Space>
                    <TeamOutlined style={{ color: '#722ed1' }} />
                    <Text strong>Role & Permissions</Text>
                  </Space>
                }
              >
                <Tag 
                  color={roleConfig.color}
                  icon={roleConfig.icon}
                  style={{ 
                    padding: '6px 12px',
                    borderRadius: '16px',
                    fontSize: '14px',
                    fontWeight: 500,
                    border: 'none'
                  }}
                >
                  {roleConfig.name}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Enhanced Account Details */}
        <Col xs={24} lg={8}>
          <Card 
            title={
              <Space>
                <SettingOutlined style={{ color: '#722ed1' }} />
                <Text strong style={{ fontSize: '16px' }}>Account Details</Text>
              </Space>
            }
            style={hoverCardStyle}
            headStyle={{ 
              borderBottom: '2px solid #f0f0f0',
              paddingTop: '20px',
              paddingBottom: '16px'
            }}
          >
            <Descriptions column={1} size="middle" labelStyle={{ fontWeight: 600, color: '#595959' }}>
              <Descriptions.Item label="User ID">
                <Text 
                  code 
                  style={{ 
                    background: 'linear-gradient(135deg, #e6f7ff 0%, #f6ffed 100%)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontWeight: 500
                  }}
                >
                  #{userData.id}
                </Text>
              </Descriptions.Item>
              
              <Descriptions.Item label="Account Status">
                <Badge 
                  status={userData.active_status ? 'success' : 'error'} 
                  text={
                    <Text style={{ 
                      fontWeight: 500,
                      color: userData.active_status ? '#52c41a' : '#ff4d4f'
                    }}>
                      {userData.active_status ? 'Active & Verified' : 'Inactive'}
                    </Text>
                  }
                />
              </Descriptions.Item>
              
              <Descriptions.Item 
                label={
                  <Space>
                    <CalendarOutlined style={{ color: '#1890ff' }} />
                    <Text>Member Since</Text>
                  </Space>
                }
              >
                <Text style={{ fontWeight: 500 }}>
                  {formatDate(userData.create_at)}
                </Text>
              </Descriptions.Item>
              
              <Descriptions.Item label="Created By">
                <Text 
                  code
                  style={{ 
                    background: 'linear-gradient(135deg, #fff2e8 0%, #fff7e6 100%)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontWeight: 500
                  }}
                >
                  Admin #{userData.create_by}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: '24px 0 16px 0' }} />
            
            {/* <div style={{ textAlign: 'center' }}>
              <Button 
                type="dashed" 
                block 
                size="large"
                style={{ 
                  borderRadius: '8px',
                  fontWeight: 500,
                  height: '44px'
                }}
              >
                View Activity Log
              </Button>
            </div> */}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MyProfile;