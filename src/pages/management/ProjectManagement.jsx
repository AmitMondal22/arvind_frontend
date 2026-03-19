import React, { useEffect, useState } from 'react';
import { Table, Button, Form, Select, message, Popconfirm, Card, Row, Col } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import useManagementApi from '../../api/useManagementApi';
import useMasterApi from '../../api/useMasterApi';
import { useAuth } from '../../context/AuthContext';

const { Option } = Select;

const ProjectManagement = () => {
  const [data, setData] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  
  const { listProjectDevice, addProjectDevice, deleteProjectDevice, listDevices } = useManagementApi();
  const { listOrganization, listProject } = useMasterApi();
  const { user } = useAuth();
  const clientId = user?.client_id || 1;

  useEffect(() => {
    fetchData();
    fetchOptions();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const res = await listProjectDevice({ client_id: clientId });
    if (res?.status) setData(res.data || []);
    setLoading(false);
  };

  const fetchOptions = async () => {
    const orgRes = await listOrganization({ client_id: clientId });
    if (orgRes?.status) setOrganizations(orgRes.data || []);
    
    const projRes = await listProject({ client_id: clientId });
    if (projRes?.status) setProjects(projRes.data || []);

    const devRes = await listDevices({ client_id: clientId });
    if (devRes?.status) setDevices(devRes.data || []);
  };

  const handleDelete = async (manage_project_device_id) => {
    const res = await deleteProjectDevice({ manage_project_device_id });
    if (res?.status) {
      message.success('Mapped device deleted successfully');
      fetchData();
    } else {
      message.error(res?.error || 'Failed to delete mapped device');
    }
  };

  const onFinish = async (values) => {
    try {
      const selectedDevice = devices.find(d => d.device_id === values.device_id);
      const payload = {
        project_id: values.project_id,
        organization_id: values.organization_id,
        device_id: values.device_id,
        device: selectedDevice?.device || '',
      };
      const res = await addProjectDevice(payload);
      if (res?.status) {
        message.success('Device added to project successfully');
        form.resetFields(['device_id']);
        fetchData();
      } else {
        message.error(res?.error || 'Operation failed');
      }
    } catch (error) {
      console.log('Validation Failed:', error);
    }
  };

  const columns = [
    { title: 'Project Name', dataIndex: 'project_name', key: 'project_name' },
    { title: 'Organization', dataIndex: 'organization_name', key: 'organization_name' },
    { title: 'Device UID', dataIndex: 'device', key: 'device' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Popconfirm title="Are you sure delete this mapping?" onConfirm={() => handleDelete(record.manage_project_device_id)}>
          <Button danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card title="Project Mapping (Device Assignment)">
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Row gutter={16} align="bottom">
          <Col span={6}>
            <Form.Item name="organization_id" label="Organization" rules={[{ required: true }]}>
              <Select placeholder="Select Organization">
                {organizations.map(org => (<Option key={org.organization_id} value={org.organization_id}>{org.organization_name}</Option>))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="project_id" label="Project" rules={[{ required: true }]}>
              <Select placeholder="Select Project">
                {projects.map(p => (<Option key={p.project_id} value={p.project_id}>{p.project_name}</Option>))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="device_id" label="Device" rules={[{ required: true }]}>
              <Select placeholder="Select Device" showSearch optionFilterProp="children">
                {devices.map(d => (<Option key={d.device_id} value={d.device_id}>{d.device_name} ({d.device})</Option>))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>Map Device to Project</Button>
            </Form.Item>
          </Col>
        </Row>
      </Form>
      
      <Table columns={columns} dataSource={data} rowKey="manage_project_device_id" loading={loading} style={{ marginTop: 20 }} />
    </Card>
  );
};

export default ProjectManagement;
