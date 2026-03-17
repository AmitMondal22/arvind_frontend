import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, DatePicker, message, Card } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import useManagementApi from '../../api/useManagementApi';
import { useAuth } from '../../context/AuthContext';
import moment from 'moment';

const DeviceManagement = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();
  
  const { listDevices, addDevice, editDevice } = useManagementApi();
  const { user } = useAuth();
  const clientId = user?.client_id || 1;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const res = await listDevices({ client_id: clientId });
    if (res?.status) setData(res.data || []);
    setLoading(false);
  };

  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingItem(record);
    const dateFields = record.last_maintenance ? { last_maintenance: moment(record.last_maintenance) } : {};
    form.setFieldsValue({ ...record, ...dateFields });
    setIsModalVisible(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (values.last_maintenance) {
        values.last_maintenance = values.last_maintenance.format('YYYY-MM-DD');
      }

      const payload = { ...values, imei_no: editingItem?.imei_no || 'N/A' };

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
          <Form.Item name="do_channel" label="DO Channel" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="model" label="Model" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="lat" label="Latitude" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="lon" label="Longitude" rules={[{ required: true }]}>
            <Input />
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
