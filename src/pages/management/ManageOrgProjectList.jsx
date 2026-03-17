import React, { useEffect, useState } from 'react';
import { Tree, Card, message, Spin } from 'antd';
import { ApartmentOutlined, ProjectOutlined } from '@ant-design/icons';
import axios from 'axios';
import { address } from '../../routes/ApiRoute';
import { useAuth } from '../../context/AuthContext';

const ManageOrgProjectList = () => {
  const [treeData, setTreeData] = useState([]);
  const [loading, setLoading] = useState(false);
  const { token, user } = useAuth();
  const clientId = user?.client_id || 1;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.post(address.MENU_ORG_PROJECT_LIST, { client_id: clientId }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.data?.status) {
        const rawData = response.data.data || [];
        // Transform for Tree
        const formattedTree = rawData.map(org => ({
          title: org.organization_name,
          key: `org-${org.organization_id}`,
          icon: <ApartmentOutlined />,
          children: (org.projects || []).map(proj => ({
            title: proj.project_name,
            key: `proj-${proj.project_id}`,
            icon: <ProjectOutlined />,
            // In case devices are nested under project
            children: (proj.devices || []).map(dev => ({
              title: `${dev.device_name} (${dev.device})`,
              key: `dev-${dev.device_id}`,
              isLeaf: true
            }))
          }))
        }));
        setTreeData(formattedTree);
      } else {
        message.error("Failed to fetch organization project list");
      }
    } catch (error) {
      console.error(error);
      message.error("Error occurred while fetching data");
    }
    setLoading(false);
  };

  return (
    <Card title="Device List (By Organization & Project)">
      {loading ? <Spin /> : (
        <Tree
          showIcon
          defaultExpandAll
          treeData={treeData}
        />
      )}
    </Card>
  );
};

export default ManageOrgProjectList;
