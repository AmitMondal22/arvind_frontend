import React from 'react';
import { Space, Button, Typography } from 'antd';
import {
  ToolOutlined,
  SyncOutlined,
  WarningOutlined,
  CloudDownloadOutlined,
  UserOutlined
} from '@ant-design/icons';

const { Title } = Typography;

const SettingsPanel = ({ device, activeTab }) => {
  console.log(`SettingsPanel for device: ${device ? device.device_number : 'No device selected'}`);

  return (
    <div style={{ paddingTop: 16 }}>
      <Title level={4}>Device Actions</Title>
      <Space wrap>
        <Button type="primary" icon={<SyncOutlined />} onClick={() => alert('Restarting device...')}>
          Restart
        </Button>
        <Button icon={<ToolOutlined />} onClick={() => alert('Calibrating...')}>
          Calibrate
        </Button>
        <Button type="dashed" icon={<CloudDownloadOutlined />} onClick={() => alert('Firmware update...')}>
          Update
        </Button>
        <Button danger icon={<WarningOutlined />} onClick={() => alert('Factory reset...')}>
          Factory Reset
        </Button>
        <Button icon={<UserOutlined />} onClick={() => alert('Assigning operator')}>
          Assign Operator
        </Button>
      </Space>
    </div>
  );
};

export default SettingsPanel;
