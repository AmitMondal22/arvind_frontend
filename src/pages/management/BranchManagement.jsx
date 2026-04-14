import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Form, Input, Button, Select, Table, message,
  Row, Col, Modal, Typography, Space, Tag, Divider,
  Badge, Tooltip, Empty, Spin
} from 'antd';
import {
  PlusOutlined, EditOutlined, BranchesOutlined,
  ApartmentOutlined, MobileOutlined, ScheduleOutlined,
  ReloadOutlined, AppstoreOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
  NumberOutlined
} from '@ant-design/icons';
import useBranchApi from '../../api/useBranchApi';
import useMasterApi from '../../api/useMasterApi';
import { useAuth } from '../../context/AuthContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

/* ——— Styles ——— */
const sectionHeaderStyle = {
  display: 'flex', alignItems: 'center', gap: 10,
  marginBottom: 24, paddingBottom: 12,
  borderBottom: '2px solid #e8edf3'
};

const cardStyle = {
  borderRadius: 12,
  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
  border: '1px solid #edf2f7'
};

const gradientBtnStyle = {
  background: '#1f1f1f',
  borderColor: 'transparent', color: '#fff', borderRadius: 8,
  fontWeight: 600, height: 40
};

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
const BranchManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const clientId = user?.client_id || 1;

  // API hooks
  const { listBranch, addBranch, editBranch, availableBranchNumbers } = useBranchApi();
  const { listOrganization, listProject } = useMasterApi();

  // Common data
  const [organizations, setOrganizations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);

  // Branch list
  const [branches, setBranches] = useState([]);
  const [branchLoading, setBranchLoading] = useState(false);

  // Add modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addForm] = Form.useForm();
  const [branchNumberOptions, setBranchNumberOptions] = useState([]);
  const [addLoading, setAddLoading] = useState(false);

  // Edit modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [editForm] = Form.useForm();
  const [editProjects, setEditProjects] = useState([]);

  // Branch filter
  const [filterOrgId, setFilterOrgId] = useState(null);
  const [filterProjectId, setFilterProjectId] = useState(null);
  const [filterProjects, setFilterProjects] = useState([]);

  // Expanded branch (to show devices inline)
  const [expandedBranchId, setExpandedBranchId] = useState(null);

  /* ——— INIT ——— */
  useEffect(() => {
    fetchCommonData();
  }, []);

  const fetchCommonData = async () => {
    const orgRes = await listOrganization({ client_id: clientId });
    if (orgRes?.status) setOrganizations(orgRes.data || []);

    const projRes = await listProject({ client_id: clientId });
    if (projRes?.status) setAllProjects(projRes.data || []);
  };

  /* ——— BRANCH LIST ——— */
  const fetchBranches = useCallback(async () => {
    setBranchLoading(true);
    const payload = { client_id: clientId };
    if (filterOrgId) payload.organization_id = filterOrgId;
    if (filterProjectId) payload.project_id = filterProjectId;
    const res = await listBranch(payload);
    if (res?.status) setBranches(res.data || []);
    else setBranches([]);
    setBranchLoading(false);
  }, [clientId, filterOrgId, filterProjectId]);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  const handleFilterOrgChange = (val) => {
    setFilterOrgId(val);
    setFilterProjectId(null);
    if (val) {
      setFilterProjects(allProjects.filter(p => p.organization_id === val));
    } else {
      setFilterProjects([]);
    }
  };

  /* ——— ADD BRANCH ——— */
  const handleOpenAddModal = async () => {
    addForm.resetFields();
    setProjects([]);
    setBranchNumberOptions([]);
    setAddModalVisible(true);

    // Fetch available branch numbers from md_device
    const res = await availableBranchNumbers({ client_id: clientId });
    if (res?.status) {
      setBranchNumberOptions(res.data || []);
    }
  };

  const handleAddFormOrgChange = (val) => {
    addForm.setFieldValue('project_id', undefined);
    if (val) {
      setProjects(allProjects.filter(p => p.organization_id === val));
    } else {
      setProjects([]);
    }
  };

  const handleAddSubmit = async () => {
    try {
      const values = await addForm.validateFields();
      setAddLoading(true);
      const payload = {
        ...values,
        client_id: clientId
      };
      const res = await addBranch(payload);
      if (res?.status) {
        message.success('Branch created successfully');
        setAddModalVisible(false);
        addForm.resetFields();
        fetchBranches();
      } else {
        message.error(res?.error || 'Branch creation failed');
      }
      setAddLoading(false);
    } catch (error) {
      console.log('Validation failed:', error);
      setAddLoading(false);
    }
  };

  /* ——— EDIT BRANCH ——— */
  const handleOpenEditModal = (branch) => {
    setEditingBranch(branch);
    const filteredProjects = allProjects.filter(p => p.organization_id === branch.organization_id);
    setEditProjects(filteredProjects);
    editForm.setFieldsValue({
      organization_id: branch.organization_id,
      project_id: branch.project_id,
      branch_name: branch.branch_name,
    });
    setEditModalVisible(true);
  };

  const handleEditFormOrgChange = (val) => {
    editForm.setFieldValue('project_id', undefined);
    if (val) {
      setEditProjects(allProjects.filter(p => p.organization_id === val));
    } else {
      setEditProjects([]);
    }
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      const payload = {
        ...values,
        client_id: clientId,
        branch_id: editingBranch.branch_id,
        branch_number: editingBranch.branch_number
      };
      const res = await editBranch(payload);
      if (res?.status) {
        message.success('Branch updated successfully');
        setEditModalVisible(false);
        editForm.resetFields();
        setEditingBranch(null);
        fetchBranches();
      } else {
        message.error(res?.error || 'Update failed');
      }
    } catch (error) {
      console.log('Validation failed:', error);
    }
  };

  /* ——— Toggle device list ——— */
  const toggleExpandBranch = (branchId) => {
    setExpandedBranchId(prev => prev === branchId ? null : branchId);
  };

  /* ——— Device columns ——— */
  const deviceColumns = [
    {
      title: '#', key: 'idx', width: 45,
      render: (_, __, i) => (
        <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>{i + 1}</span>
      )
    },
    {
      title: 'Device UID', dataIndex: 'device', key: 'device',
      render: (text) => (
        <Text strong style={{ fontSize: 13, fontFamily: 'monospace', color: '#334155' }}>
          {text}
        </Text>
      )
    },
    {
      title: 'Device Name', dataIndex: 'device_name', key: 'device_name',
      render: (text) => <Text style={{ fontSize: 13 }}>{text || '—'}</Text>
    },
    {
      title: 'Type', dataIndex: 'device_type', key: 'device_type',
      render: (text) => (
        <Tag color={text === 'OMS' ? 'blue' : text === 'AMS' ? 'green' : 'default'}
          style={{ borderRadius: 6, fontSize: 11 }}>
          {text || '—'}
        </Tag>
      )
    },
    {
      title: 'Model', dataIndex: 'model', key: 'model',
      render: (text) => <Text type="secondary" style={{ fontSize: 12 }}>{text || '—'}</Text>
    },
    {
      title: 'Status', key: 'device_status',
      render: (_, record) => {
        const isOnline = String(record.device_status || '').toUpperCase() === 'ONLINE';
        return (
          <Tag
            color={isOnline ? 'success' : 'default'}
            icon={isOnline ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            style={{ borderRadius: 6, fontSize: 11 }}
          >
            {isOnline ? 'Online' : 'Offline'}
          </Tag>
        );
      }
    },
    {
      title: 'IMEI', dataIndex: 'imei_no', key: 'imei_no',
      render: (text) => <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>{text || '—'}</Text>
    },
  ];

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* ——— Header ——— */}
      <div style={sectionHeaderStyle}>
        <BranchesOutlined style={{ fontSize: 28, color: '#1f1f1f' }} />
        <div>
          <Title level={3} style={{ margin: 0, color: '#1e293b' }}>Branch Management</Title>
          <Text type="secondary">Manage branches, edit details, and view assigned devices</Text>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Button
            size="large"
            icon={<PlusOutlined />}
            onClick={handleOpenAddModal}
            style={gradientBtnStyle}
          >
            Add Branch
          </Button>
        </div>
      </div>

      {/* ——— Filter Bar ——— */}
      <Card style={{ ...cardStyle, marginBottom: 20 }} bodyStyle={{ padding: '16px 24px' }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={8}>
            <Text strong style={{ display: 'block', marginBottom: 6, color: '#475569' }}>Organization</Text>
            <Select
              placeholder="All Organizations"
              style={{ width: '100%' }}
              allowClear
              showSearch
              optionFilterProp="children"
              value={filterOrgId}
              onChange={handleFilterOrgChange}
              size="large"
            >
              {organizations.map(org => (
                <Option key={org.organization_id} value={org.organization_id}>{org.organization_name}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <Text strong style={{ display: 'block', marginBottom: 6, color: '#475569' }}>Project</Text>
            <Select
              placeholder="All Projects"
              style={{ width: '100%' }}
              allowClear
              showSearch
              optionFilterProp="children"
              value={filterProjectId}
              onChange={setFilterProjectId}
              disabled={!filterOrgId}
              size="large"
            >
              {filterProjects.map(p => (
                <Option key={p.project_id} value={p.project_id}>{p.project_name}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8} style={{ display: 'flex', alignItems: 'flex-end', paddingTop: 26 }}>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => { setFilterOrgId(null); setFilterProjectId(null); setFilterProjects([]); }}
              size="large"
              style={{ borderRadius: 8 }}
            >
              Clear Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* ——— Branch Cards ——— */}
      {branchLoading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Spin size="large" tip="Loading branches..." />
        </div>
      ) : branches.length === 0 ? (
        <Card style={cardStyle}>
          <Empty
            description="No branches found. Click 'Add Branch' to create one."
            style={{ padding: '60px 0' }}
          />
        </Card>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Showing {branches.length} branch{branches.length !== 1 ? 'es' : ''}
            </Text>
          </div>
          <Row gutter={[20, 20]}>
            {branches.map((branch) => {
              const orgName = branch.organization_name || '—';
              const projName = branch.project_name || '—';
              const deviceCount = branch.device_count || 0;
              const branchNumber = branch.branch_number || '—';
              const createdDate = branch.created_at ? dayjs(branch.created_at).format('DD MMM YYYY') : '—';
              const devices = branch.devices || [];
              const isExpanded = expandedBranchId === branch.branch_id;

              return (
                <Col xs={24} sm={12} lg={isExpanded ? 24 : 8} xl={isExpanded ? 24 : 6} key={branch.branch_id}>
                  <Card
                    hoverable
                    style={{
                      borderRadius: 14,
                      border: isExpanded ? '2px solid #1e293b' : '1px solid #e8edf3',
                      boxShadow: isExpanded ? '0 8px 32px rgba(0,0,0,0.12)' : '0 2px 12px rgba(0,0,0,0.05)',
                      overflow: 'hidden',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      height: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', flex: 1 }}
                    onMouseEnter={(e) => {
                      if (!isExpanded) {
                        e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)';
                        e.currentTarget.style.transform = 'translateY(-4px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isExpanded) {
                        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {/* Card Header */}
                    <div style={{
                      background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                      padding: '18px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: 'rgba(255,255,255,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <BranchesOutlined style={{ fontSize: 18, color: '#fff' }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <Text strong style={{
                            color: '#fff', fontSize: 15, display: 'block',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                          }}>
                            {branch.branch_name}
                          </Text>
                          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                            {branchNumber}
                          </Text>
                        </div>
                      </div>
                      <Badge
                        count={deviceCount}
                        showZero
                        style={{
                          backgroundColor: deviceCount > 0 ? '#10b981' : 'rgba(255,255,255,0.25)',
                          fontSize: 11, fontWeight: 700,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                        }}
                      />
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: '16px 20px', flex: isExpanded ? 'none' : 1 }}>
                      {/* Branch Number */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <NumberOutlined style={{ fontSize: 13, color: '#94a3b8' }} />
                          <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Branch Number
                          </Text>
                        </div>
                        <Tag color="purple" style={{ borderRadius: 6, fontSize: 12, padding: '2px 10px', margin: 0, fontWeight: 600 }}>
                          {branchNumber}
                        </Tag>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <ApartmentOutlined style={{ fontSize: 13, color: '#94a3b8' }} />
                          <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Organization
                          </Text>
                        </div>
                        <Tag color="blue" style={{ borderRadius: 6, fontSize: 12, padding: '2px 10px', margin: 0 }}>
                          {orgName}
                        </Tag>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <AppstoreOutlined style={{ fontSize: 13, color: '#94a3b8' }} />
                          <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Project
                          </Text>
                        </div>
                        <Tag color="geekblue" style={{ borderRadius: 6, fontSize: 12, padding: '2px 10px', margin: 0 }}>
                          {projName}
                        </Tag>
                      </div>

                      <Divider style={{ margin: '12px 0' }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <MobileOutlined style={{ fontSize: 13, color: '#94a3b8', marginRight: 5 }} />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {deviceCount} Device{deviceCount !== 1 ? 's' : ''}
                          </Text>
                        </div>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {createdDate}
                        </Text>
                      </div>
                    </div>

                    {/* Card Footer — Actions */}
                    <div style={{
                      padding: '12px 20px',
                      borderTop: '1px solid #f1f5f9',
                      background: '#fafbfc',
                      display: 'flex',
                      justifyContent: 'flex-start',
                      alignItems: 'center',
                      gap: 6
                    }}>
                      <Space size={4}>
                        <Tooltip title="Edit Branch">
                          <Button
                            type="primary" size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleOpenEditModal(branch)}
                            style={{
                              borderRadius: 7, background: '#1e293b', borderColor: '#1e293b',
                              width: 32, height: 32, padding: 0
                            }}
                          />
                        </Tooltip>
                        <Tooltip title={isExpanded ? 'Hide Devices' : 'Show Devices'}>
                          <Button
                            size="small"
                            icon={<MobileOutlined />}
                            onClick={() => toggleExpandBranch(branch.branch_id)}
                            style={{
                              borderRadius: 7,
                              background: isExpanded ? '#10b981' : '#475569',
                              borderColor: isExpanded ? '#10b981' : '#475569',
                              color: '#fff', width: 32, height: 32, padding: 0
                            }}
                          />
                        </Tooltip>
                        <Tooltip title="Branch Config / Control">
                          <Button
                            size="small"
                            icon={<ScheduleOutlined />}
                            onClick={() => navigate(`/management/branch/${branch.branch_id}/config`)}
                            style={{
                              borderRadius: 7, background: '#64748b', borderColor: '#64748b',
                              color: '#fff', width: 32, height: 32, padding: 0
                            }}
                          />
                        </Tooltip>
                      </Space>
                    </div>

                    {/* ——— Expanded Devices Section ——— */}
                    {isExpanded && (
                      <div style={{
                        borderTop: '2px solid #e2e8f0',
                        padding: '16px 20px',
                        background: '#f8fafc'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                          <MobileOutlined style={{ fontSize: 16, color: '#1e293b' }} />
                          <Title level={5} style={{ margin: 0, color: '#1e293b' }}>
                            Devices in Branch
                          </Title>
                          <Badge
                            count={devices.length}
                            showZero
                            style={{
                              backgroundColor: devices.length > 0 ? '#3b82f6' : '#94a3b8',
                              fontSize: 11, fontWeight: 700
                            }}
                          />
                        </div>

                        {devices.length === 0 ? (
                          <Empty
                            description={
                              <Text type="secondary" style={{ fontSize: 13 }}>
                                No devices linked to this branch (branch_number: {branchNumber})
                              </Text>
                            }
                            style={{ padding: '20px 0' }}
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                          />
                        ) : (
                          <Table
                            columns={deviceColumns}
                            dataSource={devices}
                            rowKey="device_id"
                            size="small"
                            pagination={devices.length > 10 ? { pageSize: 10, size: 'small' } : false}
                            style={{
                              borderRadius: 10,
                              overflow: 'hidden',
                              border: '1px solid #e2e8f0'
                            }}
                          />
                        )}
                      </div>
                    )}
                  </Card>
                </Col>
              );
            })}
          </Row>
        </>
      )}

      {/* ═══ MODAL: Add Branch ═══ */}
      <Modal
        title={
          <Space>
            <PlusOutlined style={{ color: '#1f1f1f' }} />
            <span>Add Branch</span>
          </Space>
        }
        open={addModalVisible}
        onCancel={() => { setAddModalVisible(false); addForm.resetFields(); }}
        onOk={handleAddSubmit}
        okText="Add"
        okButtonProps={{ style: gradientBtnStyle, loading: addLoading }}
        width={560}
        destroyOnClose
      >
        <div style={{ marginTop: 16 }}>
          <Form form={addForm} layout="vertical">
            <Form.Item name="organization_id" label="Organization" rules={[{ required: true, message: 'Select organization' }]}>
              <Select placeholder="Select Organization" showSearch optionFilterProp="children" size="large"
                onChange={handleAddFormOrgChange}>
                {organizations.map(org => (
                  <Option key={org.organization_id} value={org.organization_id}>{org.organization_name}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="project_id" label="Project" rules={[{ required: true, message: 'Select project' }]}>
              <Select placeholder="Select Project" showSearch optionFilterProp="children" size="large">
                {projects.map(p => (
                  <Option key={p.project_id} value={p.project_id}>{p.project_name}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="branch_number" label="Branch Number" rules={[{ required: true, message: 'Select branch number' }]}>
              <Select
                placeholder={branchNumberOptions.length === 0 ? 'No available branch numbers' : 'Select Branch Number'}
                showSearch
                optionFilterProp="children"
                size="large"
                notFoundContent={
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No unassigned branch numbers found in devices" />
                }
              >
                {branchNumberOptions.map(item => (
                  <Option key={item.branch_number} value={item.branch_number}>
                    {item.branch_number}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="branch_name" label="Branch Name" rules={[{ required: true, message: 'Enter branch name' }]}>
              <Input placeholder="e.g. North Wing, Building A" size="large" />
            </Form.Item>
          </Form>
        </div>
      </Modal>

      {/* ═══ MODAL: Edit Branch ═══ */}
      <Modal
        title={
          <Space>
            <EditOutlined style={{ color: '#1f1f1f' }} />
            <span>Edit Branch</span>
          </Space>
        }
        open={editModalVisible}
        onCancel={() => { setEditModalVisible(false); editForm.resetFields(); setEditingBranch(null); }}
        onOk={handleEditSubmit}
        okText="Update"
        okButtonProps={{ style: gradientBtnStyle }}
        width={560}
        destroyOnClose
      >
        <div style={{ marginTop: 16 }}>
          <Form form={editForm} layout="vertical">
            {/* Branch Number — read-only, not editable */}
            {editingBranch && (
              <Form.Item label="Branch Number">
                <Input
                  value={editingBranch.branch_number || '—'}
                  disabled
                  size="large"
                  style={{
                    background: '#f1f5f9',
                    color: '#1e293b',
                    fontWeight: 700,
                    fontSize: 15,
                    borderColor: '#e2e8f0',
                    cursor: 'not-allowed'
                  }}
                  prefix={<NumberOutlined style={{ color: '#94a3b8' }} />}
                />
                <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                  Branch number cannot be changed.
                </Text>
              </Form.Item>
            )}
            <Form.Item name="organization_id" label="Organization" rules={[{ required: true, message: 'Select organization' }]}>
              <Select placeholder="Select Organization" showSearch optionFilterProp="children" size="large"
                onChange={handleEditFormOrgChange}>
                {organizations.map(org => (
                  <Option key={org.organization_id} value={org.organization_id}>{org.organization_name}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="project_id" label="Project" rules={[{ required: true, message: 'Select project' }]}>
              <Select placeholder="Select Project" showSearch optionFilterProp="children" size="large">
                {editProjects.map(p => (
                  <Option key={p.project_id} value={p.project_id}>{p.project_name}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="branch_name" label="Branch Name" rules={[{ required: true, message: 'Enter branch name' }]}>
              <Input placeholder="e.g. North Wing, Building A" size="large" />
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </div>
  );
};

export default BranchManagement;
