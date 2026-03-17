import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Popconfirm, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import useMasterApi from '../../api/useMasterApi';
import { useAuth } from '../../context/AuthContext';

const OrganizationList = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();
  
  const { listOrganization, addOrganization, editOrganization, deleteOrganization } = useMasterApi();
  const { user } = useAuth();
  
  const clientId = user?.client_id || 1; // Fallback or accurate retrieval

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const res = await listOrganization({ client_id: clientId });
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
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (organization_id) => {
    const res = await deleteOrganization({ client_id: clientId, organization_id });
    if (res?.status) {
      message.success('Organization deleted successfully');
      fetchData();
    } else {
      message.error(res?.error || 'Failed to delete');
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values, client_id: clientId, created_by: user?.user_id || 1 };
      
      let res;
      if (editingItem) {
        payload.organization_id = editingItem.organization_id;
        res = await editOrganization(payload);
      } else {
        res = await addOrganization(payload);
      }
      
      if (res?.status) {
        message.success(`Organization ${editingItem ? 'updated' : 'added'} successfully`);
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
    { title: 'ID', dataIndex: 'organization_id', key: 'organization_id' },
    { title: 'Organization Name', dataIndex: 'organization_name', key: 'organization_name' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <span style={{ display: 'flex', gap: '10px' }}>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="Are you sure delete this organization?" onConfirm={() => handleDelete(record.organization_id)}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </span>
      ),
    },
  ];

  return (
    <Card title="Organizations" extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Add Organization</Button>}>
      <Table columns={columns} dataSource={data} rowKey="organization_id" loading={loading} />
      
      <Modal title={editingItem ? "Edit Organization" : "Add Organization"} open={isModalVisible} onOk={handleOk} onCancel={() => setIsModalVisible(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="organization_name" label="Organization Name" rules={[{ required: true, message: 'Please input organization name!' }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default OrganizationList;
