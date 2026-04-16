import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Popconfirm, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import useMasterApi from '../../api/useMasterApi';
import { useAuth } from '../../context/AuthContext';

const { Option } = Select;

const UserList = () => {
  const [data, setData] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();
  
  const { listUser, addUser, editUser, deleteUser, listOrganization } = useMasterApi();
  const { user } = useAuth();
  const clientId = user?.client_id || 1;

  useEffect(() => {
    fetchData();
    fetchOrganizations();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const res = await listUser({ client_id: clientId });
    if (res?.status) setData(res.data || []);
    setLoading(false);
  };

  const fetchOrganizations = async () => {
    const res = await listOrganization({ client_id: clientId });
    if (res?.status) setOrganizations(res.data || []);
  };

  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingItem(record);
    form.setFieldsValue({
      ...record,
      name: record.user_name,
      email: record.user_email
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (user_id) => {
    const res = await deleteUser({ user_id });
    if (res?.status) {
      message.success('User deleted successfully');
      fetchData();
    } else {
      message.error(res?.error || 'Failed to delete user');
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      let res;
      if (editingItem) {
        res = await editUser({ ...values, user_id: editingItem.user_id, client_id: clientId });
      } else {
        res = await addUser({ ...values, client_id: clientId });
      }
      
      if (res?.status) {
        message.success(`User ${editingItem ? 'updated' : 'added'} successfully`);
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
    { title: 'ID', dataIndex: 'user_id', key: 'user_id' },
    { title: 'Name', dataIndex: 'user_name', key: 'user_name' },
    { title: 'Email', dataIndex: 'user_email', key: 'user_email' },
    { title: 'Mobile', dataIndex: 'user_mobile', key: 'user_mobile' },
    { title: 'Organization', dataIndex: 'organization_name', key: 'organization_name' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <span style={{ display: 'flex', gap: '10px' }}>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="Are you sure delete this user?" onConfirm={() => handleDelete(record.user_id)}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </span>
      ),
    },
  ];

  return (
    <Card title="Users" extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Add User</Button>}>
      <Table columns={columns} dataSource={data} rowKey="user_id" loading={loading} />
      
      <Modal title={editingItem ? "Edit User" : "Add User"} open={isModalVisible} onOk={handleOk} onCancel={() => setIsModalVisible(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Please input user name!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Please input valid email!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="mobile" label="Mobile" rules={[{ required: true, message: 'Please input mobile number!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="organization_id" label="Organization" rules={[{ required: true, message: 'Please select organization!' }]}>
            <Select placeholder="Select Organization">
              {organizations.map(org => (
                <Option key={org.organization_id} value={org.organization_id}>{org.organization_name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="user_type" label="User Type" rules={[{ required: true, message: 'Please select user type!' }]}>
            <Select placeholder="Select User Type">
              <Option value="U">User</Option>
              <Option value="C">Client</Option>
              <Option value="A">Admin</Option>
              <Option value="S">Super Admin</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default UserList;
