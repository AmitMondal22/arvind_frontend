import React, { useState, useEffect } from 'react';
import { Card, Form, Input, InputNumber, Button, Typography, message, Row, Col, Divider, Space, Table, Popconfirm, Modal } from 'antd';
import { AppstoreAddOutlined, SaveOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import useManagementGatewayApi from '../../api/useManagementGatewayApi';

const { Title, Text } = Typography;

const GetwayManage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [gateways, setGateways] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  const { listGatewayApi, addGatewayApi, editGatewayApi, deleteGatewayApi } = useManagementGatewayApi();
  
  const fetchGateways = async () => {
    setLoading(true);
    const res = await listGatewayApi();
    if (res.status) {
        setGateways(res.data || []);
    } else {
        message.error(res.error || 'Failed to fetch gateways');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGateways();
  }, []);

  const showAddModal = () => {
    setEditingId(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const showEditModal = (record) => {
    setEditingId(record.id);
    form.setFieldsValue({
        gateway_id: record.gateway_id,
        start_id: record.start_id,
        max_id: record.max_id,
        retry: record.retry
    });
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingId(null);
  };

  const handleSubmit = async (values) => {
    // Validation: Max ID must be greater than Start ID
    if (values.max_id <= values.start_id) {
      message.error("Max ID must be strictly greater than Start ID.");
      return;
    }

    setLoading(true);
    try {
      let res;
      if (editingId) {
          res = await editGatewayApi({ ...values, id: editingId });
      } else {
          res = await addGatewayApi(values);
      }
      
      if (res.status) {
          message.success(`Gateway ${editingId ? 'updated' : 'added'} successfully!`);
          handleModalClose();
          fetchGateways();
      } else {
          message.error(res.error || `Failed to ${editingId ? 'update' : 'add'} gateway.`);
      }
    } catch (error) {
      console.error(error);
      message.error(`Failed to ${editingId ? 'update' : 'add'} gateway details.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
      setLoading(true);
      const res = await deleteGatewayApi({ id });
      if (res.status) {
          message.success('Gateway deleted successfully!');
          fetchGateways();
      } else {
          message.error(res.error || 'Failed to delete gateway.');
      }
      setLoading(false);
  };

  const handleReset = () => {
    form.resetFields();
  };

  const columns = [
      { title: 'Gateway ID', dataIndex: 'gateway_id', key: 'gateway_id' },
      { title: 'Start ID', dataIndex: 'start_id', key: 'start_id' },
      { title: 'Max ID', dataIndex: 'max_id', key: 'max_id' },
      { title: 'Retry', dataIndex: 'retry', key: 'retry' },
      { title: 'Created At', dataIndex: 'created_at', key: 'created_at' },
      {
          title: 'Actions',
          key: 'action',
          render: (_, record) => (
              <Space size="middle">
                  <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => showEditModal(record)}>Edit</Button>
                  <Popconfirm title="Are you sure you want to delete this gateway?" onConfirm={() => handleDelete(record.id)} okText="Yes" cancelText="No">
                      <Button type="primary" danger size="small" icon={<DeleteOutlined />}>Delete</Button>
                  </Popconfirm>
              </Space>
          ),
      },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
         <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#1e293b' }}>
           <AppstoreAddOutlined style={{ color: '#3b82f6' }} /> Gateway Management
         </Title>
         {/* <Button 
           type="primary" 
           icon={<PlusOutlined />} 
           size="large" 
           onClick={showAddModal}
           style={{ backgroundColor: '#3b82f6', borderColor: '#3b82f6', borderRadius: 6 }}
         >
           Add Gateway
         </Button> */}
      </div>

      <Card 
        bordered={false} 
        style={{ 
          borderRadius: 12, 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' 
        }}
      >
          <Table 
              dataSource={gateways} 
              columns={columns} 
              rowKey="id" 
              loading={loading}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 'max-content' }}
          />
      </Card>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AppstoreAddOutlined style={{ color: '#3b82f6' }} />
            {editingId ? 'Edit Gateway' : 'Add New Gateway'}
          </div>
        }
        open={isModalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={700}
        destroyOnClose
      >
        <div style={{ marginBottom: 24, marginTop: 12 }}>
          <Text type="secondary">
            Configure gateway sequence IDs (Exactly 10 alphanumeric characters) and bounds. Max ID must be strictly greater than Start ID.
          </Text>
        </div>
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Row gutter={[24, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="gateway_id"
                label={<span style={{ fontWeight: 500 }}>Gateway ID (Prefix)</span>}
                rules={[
                  { required: true, message: 'Please input the Gateway ID string!' },
                  { pattern: /^[A-Za-z0-9]{10}$/, message: 'Must be exactly 10 alphanumeric characters.' },
                ]}
              >
                <Input 
                  size="large" 
                  placeholder="e.g. ALPHA" 
                  maxLength={10} 
                  showCount 
                  style={{ borderRadius: 6 }} 
                  readOnly={!!editingId}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="retry"
                label={<span style={{ fontWeight: 500 }}>Retry Attempts</span>}
                initialValue={3}
                rules={[
                  { required: true, message: 'Please specify the retry limit!' },
                ]}
              >
                <InputNumber 
                  min={1} 
                  max={10} 
                  size="large" 
                  style={{ width: '100%', borderRadius: 6 }} 
                  placeholder="1 - 10" 
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '16px 0 24px 0' }} />
          
          <Row gutter={[24, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="start_id"
                label={<span style={{ fontWeight: 500 }}>Start Numeric ID</span>}
                rules={[{ required: true, message: 'Please input the starting ID!' }]}
              >
                <InputNumber 
                  min={0} 
                  size="large" 
                  style={{ width: '100%', borderRadius: 6 }} 
                  placeholder="e.g. 1" 
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="max_id"
                label={<span style={{ fontWeight: 500 }}>Max Numeric ID</span>}
                rules={[{ required: true, message: 'Please input the maximum ID!' }]}
              >
                <InputNumber 
                  min={1} 
                  size="large" 
                  style={{ width: '100%', borderRadius: 6 }} 
                  placeholder="e.g. 100" 
                />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
            <Space size="middle">
              <Button 
                size="large" 
                icon={<ReloadOutlined />} 
                onClick={handleReset}
                style={{ borderRadius: 6 }}
              >
                Reset
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large" 
                icon={<SaveOutlined />} 
                loading={loading}
                style={{ 
                  borderRadius: 6, 
                  backgroundColor: '#3b82f6', 
                  borderColor: '#3b82f6',
                  padding: '0 32px' 
                }}
              >
                {editingId ? 'Update Gateway' : 'Submit Gateway'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default GetwayManage;
