import React from 'react';
import { Drawer, Card, Button, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import useDeviceApi from '../../api/useDeviceApi';

const { Text } = Typography;

const DeleteManageDeviceDrawer = ({ open, onClose, device, onDelete }) => {
  const {apiDeleteDeviceToCompant} = useDeviceApi();
  const handleDelete = async () => {
    console.log("DDDDDDDDDD",device.id);
    const delete_dev_to_company =  await apiDeleteDeviceToCompant(device.id);
    if (delete_dev_to_company.status) {
      onDelete();
    }else {
      // onDelete();
    }
  };

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', color: '#ff4d4f' }}>
          <DeleteOutlined style={{ marginRight: '8px' }} />
          Confirm Remove
        </div>
      }
      placement="right"
      onClose={onClose}
      open={open}
      width={window.innerWidth < 576 ? '100%' : 350}
      style={{
        borderRadius: window.innerWidth < 576 ? '0' : '0 12px 12px 0',
        boxShadow: window.innerWidth < 576 ? 'none' : '2px 0 8px rgba(0,0,0,0.15)',
      }}
    >
      {device && (
        <div>
          <Card
            style={{
              background: '#fff1f0',
              border: '1px solid #ffa39e',
              marginBottom: '24px',
              borderRadius: '8px',
            }}
          >
            <Text type="danger" strong>
              Warning: This action cannot be undone!
            </Text>
          </Card>

          <div style={{ marginBottom: '24px' }}>
            <Text>You are about to permanently remove:</Text>
            <Card
              size="small"
              style={{
                marginTop: '12px',
                background: '#ffffff',
                border: '1px solid #e8e8e8',
                borderRadius: '6px',
              }}
            >
              <Text strong style={{ fontSize: '16px', color: '#1d39c4' }}>
                {device.device.device_name}
              </Text>
              <br />
              <Text type="secondary">{device.company.company_name}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                IMEI: {device.device.device_imei}
              </Text>
            </Card>
          </div>

          <Button
            type="primary"
            danger
            onClick={handleDelete}
            icon={<DeleteOutlined />}
            size="large"
            block
            style={{
              borderRadius: '8px',
              height: '45px',
              fontSize: '16px',
              background: '#ff4d4f',
              border: 'none',
            }}
          >
            Confirm Remove
          </Button>
        </div>
      )}
    </Drawer>
  );
};

export default DeleteManageDeviceDrawer;