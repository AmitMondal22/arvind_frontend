import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Popconfirm, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import useMasterApi from '../../api/useMasterApi';
import { useAuth } from '../../context/AuthContext';

const { Option } = Select;

const ProjectList = () => {
  const [data, setData] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();
  
  const { listProject, addProject, editProject, deleteProject, listOrganization } = useMasterApi();
  const { user } = useAuth();
  const clientId = user?.client_id || 1;

  useEffect(() => {
    fetchData();
    fetchOrganizations();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const res = await listProject({ client_id: clientId });
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
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (project_id) => {
    const res = await deleteProject({ project_id });
    if (res?.status) {
      message.success('Project deleted successfully');
      fetchData();
    } else {
      message.error(res?.error || 'Failed to delete project');
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      let res;
      if (editingItem) {
        res = await editProject({ ...values, project_id: editingItem.project_id });
      } else {
        res = await addProject(values);
      }
      
      if (res?.status) {
        message.success(`Project ${editingItem ? 'updated' : 'added'} successfully`);
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
    { title: 'Project ID', dataIndex: 'project_id', key: 'project_id' },
    { title: 'Project Name', dataIndex: 'project_name', key: 'project_name' },
    { title: 'Organization', dataIndex: 'organization_name', key: 'organization_name' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <span style={{ display: 'flex', gap: '10px' }}>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="Are you sure delete this project?" onConfirm={() => handleDelete(record.project_id)}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </span>
      ),
    },
  ];

  return (
    <Card title="Projects" extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Add Project</Button>}>
      <Table columns={columns} dataSource={data} rowKey="project_id" loading={loading} />
      
      <Modal title={editingItem ? "Edit Project" : "Add Project"} open={isModalVisible} onOk={handleOk} onCancel={() => setIsModalVisible(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="project_name" label="Project Name" rules={[{ required: true, message: 'Please input project name!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="organization_id" label="Organization" rules={[{ required: true, message: 'Please select organization!' }]}>
            <Select placeholder="Select Organization">
              {organizations.map(org => (
                <Option key={org.organization_id} value={org.organization_id}>{org.organization_name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ProjectList;
