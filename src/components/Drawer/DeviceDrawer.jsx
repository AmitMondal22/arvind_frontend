import React, { useEffect } from 'react';
import { Drawer, Form, Input, Button, Space } from 'antd';
import styled from 'styled-components';

const StyledDrawer = styled(Drawer)`
  .ant-drawer-header {
    border-radius: 12px 12px 0 0;
    background: #fafafa;
  }
  .ant-drawer-title {
    font-weight: 600;
    color: #1f1f1f;
  }
  .ant-drawer-body {
    background: #ffffff;
  }
`;

const StyledButton = styled(Button)`
  border-radius: 8px;
  padding: 8px 16px;
  height: auto;
  font-weight: 500;
`;

const StyledInput = styled(Input)`
  border-radius: 6px;
`;

const DeviceDrawer = ({ open, onClose, onSave, initialData }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (initialData) {
      form.setFieldsValue({
        ...initialData,
        latitude: initialData.latitude?.toString(),
        longitude: initialData.longitude?.toString(),
      });
    } else {
      form.resetFields();
    }
  }, [initialData, form]);

  const onFinish = (values) => {
    const formattedValues = {
      ...values,
      latitude: parseFloat(values.latitude),
      longitude: parseFloat(values.longitude),
    };
    if (initialData) {
      formattedValues.id = initialData.id;
    }
    onSave(formattedValues);
    form.resetFields();
  };

  return (
    <StyledDrawer
      title={initialData ? 'Edit Device' : 'Add Device'}
      width={400}
      onClose={onClose}
      open={open}
      bodyStyle={{ padding: '24px' }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        <Form.Item
          name="device_number"
          label="Device Serial Number"
          rules={initialData ? [] : [
            { required: true, message: 'Please enter the device serial number' },
            { max: 50, message: 'Serial number must be 50 characters or less' },
            { pattern: /^[A-Za-z0-9-]+$/, message: 'Serial number can only contain letters, numbers, and hyphens' },
          ]}
        >
          <StyledInput
            placeholder={initialData ? initialData.device_number : 'Enter serial number'}
            disabled={!!initialData} // Readonly in edit mode
          />
        </Form.Item>

        <Form.Item
          name="device_name"
          label="Device Name"
          rules={[
            { required: true, message: 'Please enter the device name' },
            { max: 50, message: 'Device name must be 50 characters or less' },
          ]}
        >
          <StyledInput placeholder="Enter device name" />
        </Form.Item>

        <Form.Item
          name="device_model"
          label="Device Model"
          rules={[
            { required: true, message: 'Please enter the device model' },
            { max: 50, message: 'Device model must be 50 characters or less' },
          ]}
        >
          <StyledInput placeholder="Enter device model" />
        </Form.Item>

        <Form.Item
          name="device_imei"
          label="Device IMEI"
          rules={[
            { required: true, message: 'Please enter the device IMEI' },
            { pattern: /^\d{15}$/, message: 'IMEI must be a 15-digit number' },
          ]}
        >
          <StyledInput placeholder="Enter 15-digit IMEI" />
        </Form.Item>

        <Form.Item
          name="latitude"
          label="Latitude"
          rules={[
            { required: true, message: 'Please enter latitude' },
            {
              pattern: /^-?([1-8]?\d(\.\d{1,6})?|90(\.0{1,6})?)$/,
              message: 'Latitude must be a number between -90 and 90',
            },
          ]}
        >
          <StyledInput placeholder="Enter latitude (e.g., 37.7749)" />
        </Form.Item>

        <Form.Item
          name="longitude"
          label="Longitude"
          rules={[
            { required: true, message: 'Please enter longitude' },
            {
              pattern: /^-?((1[0-7]\d|0?\d{1,2})(\.\d{1,6})?|180(\.0{1,6})?)$/,
              message: 'Longitude must be a number between -180 and 180',
            },
          ]}
        >
          <StyledInput placeholder="Enter longitude (e.g., -122.4194)" />
        </Form.Item>

        <Form.Item style={{ marginTop: '24px' }}>
          <Space>
            <StyledButton onClick={onClose}>Cancel</StyledButton>
            <StyledButton type="primary" htmlType="submit">
              {initialData ? 'Update' : 'Create'}
            </StyledButton>
          </Space>
        </Form.Item>
      </Form>
    </StyledDrawer>
  );
};

export default DeviceDrawer;