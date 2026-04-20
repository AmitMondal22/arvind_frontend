import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, DatePicker, message, Card, Select, Tag } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import useManagementApi from '../../api/useManagementApi';
import useManagementGatewayApi from '../../api/useManagementGatewayApi';
import { useAuth } from '../../context/AuthContext';
import moment from 'moment';

const DeviceManagement = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [gateways, setGateways] = useState([]);
  const [form] = Form.useForm();
  
  const { listDevices, addDevice, editDevice } = useManagementApi();
  const { listGatewayApi } = useManagementGatewayApi();
  const { user } = useAuth();
  const clientId = user?.client_id || 1;

  useEffect(() => {
    fetchData();
    fetchGateways();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const res = await listDevices({ client_id: clientId });
    if (res?.status) setData(res.data || []);
    setLoading(false);
  };

  const fetchGateways = async () => {
    try {
      const res = await listGatewayApi();
      setGateways(res?.data || []);
    } catch (err) {
      console.error('Failed to load gateways');
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingItem(record);
    const dateFields = record.last_maintenance ? { last_maintenance: moment(record.last_maintenance) } : {};
    form.setFieldsValue({ ...record, ...dateFields, gateway_id: record.gateway_id || undefined });
    setIsModalVisible(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (values.last_maintenance) {
        values.last_maintenance = values.last_maintenance.format('YYYY-MM-DD');
      }

      const payload = { ...values, imei_no: editingItem?.imei_no || 'N/A', gateway_id: values.gateway_id || '' };

      let res;
      if (editingItem) {
        res = await editDevice({ ...payload, device_id: editingItem.device_id, client_id: clientId });
      } else {
        res = await addDevice([{ ...payload, client_id: clientId }]);
      }
      
      if (res?.status) {
        message.success(`Device ${editingItem ? 'updated' : 'added'} successfully`);
        setIsModalVisible(false);
        fetchData();
      } else {
        message.error(res?.error || 'Operation failed');
      }
    } catch (error) {
      console.log('Validation Failed:', error);
    }
  };

  const columns = [
    { title: 'UID / Device', dataIndex: 'device', key: 'device' },
    { title: 'Device Name', dataIndex: 'device_name', key: 'device_name' },
    { title: 'Model', dataIndex: 'model', key: 'model' },
    { 
      title: 'Type', 
      dataIndex: 'device_type', 
      key: 'device_type',
      render: (type) => (
        <Tag color={type === 'AMS' ? 'green' : 'blue'}>
          {type || 'OMS'}
        </Tag>
      )
    },
    { title: 'Gateway ID', dataIndex: 'gateway_id', key: 'gateway_id' },
    { title: 'Branch No.', dataIndex: 'branch_number', key: 'branch_number' },
    { 
      title: 'Status', 
      dataIndex: 'device_status', 
      key: 'device_status',
      render: (status) => (
        <Tag color={status === 'ONLINE' ? 'green' : 'red'}>
          {status || 'OFFLINE'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <span style={{ display: 'flex', gap: '10px' }}>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
        </span>
      ),
    },
  ];

  return (
    <Card title="Device Management" extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Add Device</Button>}>
      <Table columns={columns} dataSource={data} rowKey="device_id" loading={loading} />
      
      <Modal title={editingItem ? "Edit Device" : "Add Device"} open={isModalVisible} onOk={handleOk} onCancel={() => setIsModalVisible(false)} width={600}>
        <Form form={form} layout="vertical">
          <Form.Item name="device" label="Device UID" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="device_name" label="Device Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="do_channel" label="DO Channel" hidden initialValue={8}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="model" label="Model" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="gateway_id" label="Gateway">
            <Select
              placeholder="Select Gateway"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={gateways.map(gw => ({
                label: gw.gateway_id,
                value: gw.gateway_id
              }))}
            />
          </Form.Item>
          <Form.Item name="lat" label="Latitude" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="lon" label="Longitude" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="device_type" label="Device Type" initialValue="OMS" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="OMS">OMS</Select.Option>
              <Select.Option value="AMS">AMS</Select.Option>
            </Select>
          </Form.Item>
          {!editingItem && (
            <Form.Item name="last_maintenance" label="Last Maintenance Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </Card>
  );
};

export default DeviceManagement;
