import React, { useEffect, useState } from 'react';
import { Table, Button, Form, Select, Modal, message, Popconfirm, Card, Row, Col } from 'antd';
import { DeleteOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons';
import useManagementApi from '../../api/useManagementApi';
import useMasterApi from '../../api/useMasterApi';
import { useAuth } from '../../context/AuthContext';

const { Option } = Select;

const UserManagement = () => {
  const [data, setData] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();
  
  const { listUserDevice, addUserDevice, editUserDevice, deleteUserDevice, listDevices } = useManagementApi();
  const { listOrganization, listUser } = useMasterApi();
  const { user } = useAuth();
  const clientId = user?.client_id || 1;

  useEffect(() => {
    fetchData();
    fetchOptions();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const res = await listUserDevice({ client_id: clientId });
    if (res?.status) setData(res.data || []);
    setLoading(false);
  };

  const fetchOptions = async () => {
    const orgRes = await listOrganization({ client_id: clientId });
    if (orgRes?.status) setOrganizations(orgRes.data || []);
    
    // We fetch all users
    const userRes = await listUser({ client_id: clientId });
    if (userRes?.status) setUsersList(userRes.data || []);

    const devRes = await listDevices({ client_id: clientId });
    if (devRes?.status) setDevices(devRes.data || []);
  };

  const handleDelete = async (manage_user_device_id) => {
    const res = await deleteUserDevice({ client_id: clientId, manage_user_device_id });
    if (res?.status) {
      message.success('Mapped device deleted successfully');
      fetchData();
    } else {
      message.error(res?.error || 'Failed to delete mapped device');
    }
  };

  const handleEdit = (record) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const selectedDevice = devices.find(d => d.device_id === values.device_id);

      const payload = {
        ...values,
        client_id: clientId,
        device: selectedDevice?.device || '',
        created_by: user?.user_id || 1,
      };

      let res;
      if (editingItem) {
        payload.manage_user_device_id = editingItem.manage_user_device_id;
        res = await editUserDevice(payload);
      } else {
        res = await addUserDevice(payload);
      }
      
      if (res?.status) {
        message.success(`User device assignment ${editingItem ? 'updated' : 'added'} successfully`);
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
    { title: 'User Name', dataIndex: 'user_name', key: 'user_name' },
    { title: 'Organization', dataIndex: 'organization_name', key: 'organization_name' },
    { title: 'Device UID', dataIndex: 'device', key: 'device' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <span style={{ display: 'flex', gap: '10px' }}>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="Are you sure delete this mapping?" onConfirm={() => handleDelete(record.manage_user_device_id)}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </span>
      ),
    },
  ];

  return (
    <Card title="User Management (Assign Devices)" extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Assign Device to User</Button>}>
      <Table columns={columns} dataSource={data} rowKey="manage_user_device_id" loading={loading} />
      
      <Modal title={editingItem ? "Edit Assignment" : "Assign Device to User"} open={isModalVisible} onOk={handleOk} onCancel={() => setIsModalVisible(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="organization_id" label="Organization" rules={[{ required: true }]}>
            <Select placeholder="Select Organization">
              {organizations.map(org => (<Option key={org.organization_id} value={org.organization_id}>{org.organization_name}</Option>))}
            </Select>
          </Form.Item>
          <Form.Item name="user_id" label="User" rules={[{ required: true }]}>
            <Select placeholder="Select User" showSearch optionFilterProp="children">
              {usersList.map(u => (<Option key={u.user_id} value={u.user_id}>{u.user_name} ({u.user_email})</Option>))}
            </Select>
          </Form.Item>
          <Form.Item name="device_id" label="Device" rules={[{ required: true }]}>
            <Select placeholder="Select Device" showSearch optionFilterProp="children">
              {devices.map(d => (<Option key={d.device_id} value={d.device_id}>{d.device_name} ({d.device})</Option>))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default UserManagement;
