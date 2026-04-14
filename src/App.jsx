import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';

import PrivateRoute from './routes/PrivateRoute';
import PublicRoute from './routes/PublicRoute';

import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login/Login';

import NotFound from './pages/error/NotFound';
import NoInternet from './pages/error/NoInternet';


import Device from './pages/device/Device';

import Dashboard from './pages/Dashboard/Dashboard';
import MyProfile from './pages/MyProfile/MyProfile';
import DeviceDashboard from './pages/Dashboard/DeviceDashboard';
import AmsDeviceDashboard from './pages/Dashboard/AmsDeviceDashboard';
import DeviceReport from './pages/report/DeviceReport';

// Master
import OrganizationList from './pages/master/OrganizationList';
import UserList from './pages/master/UserList';
import ProjectList from './pages/master/ProjectList';

// Management
import DeviceManagement from './pages/management/DeviceManagement';
import ProjectManagement from './pages/management/ProjectManagement';
import UserManagement from './pages/management/UserManagement';
import ManageOrgProjectList from './pages/management/ManageOrgProjectList';
import GetwayManage from './pages/management/GetwayManage';
import BranchManagement from './pages/management/BranchManagement';
import BranchConfig from './pages/management/BranchConfig';

function App() {
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);




  if (!isOnline) return <NoInternet />;

  return (
    <Routes>
      {/* Public Route (redirects to dashboard if logged in) */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Private Routes */}
      <Route path="/:organizationId/:projectId/:organizationName/:projectname"
        element={
          <PrivateRoute>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </PrivateRoute>
        }
      />

      <Route path="/device/:organizationId/:projectId/:deviceId/:device/:device_name/:organizationName/:projectname"
        element={
          <PrivateRoute>
            <MainLayout>
              <DeviceDashboard />
            </MainLayout>
          </PrivateRoute>
        }
      />

      <Route path="/ams-device/:organizationId/:projectId/:deviceId/:device/:device_name/:organizationName/:projectname"
        element={
          <PrivateRoute>
            <MainLayout>
              <AmsDeviceDashboard />
            </MainLayout>
          </PrivateRoute>
        }
      />



      <Route
        path="/historical_data"
        element={
          <PrivateRoute>
            <MainLayout>
              <DeviceReport />
            </MainLayout>
          </PrivateRoute>
        }
      />





      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout>
              <Device />
            </MainLayout>
          </PrivateRoute>
        }
      />


      <Route
        path="/device"
        element={
          <PrivateRoute>
            <MainLayout>
              <Device />
            </MainLayout>
          </PrivateRoute>
        }
      />

      {/* Master Routes */}
      <Route path="/master/organization" element={<PrivateRoute><MainLayout><OrganizationList /></MainLayout></PrivateRoute>} />
      <Route path="/master/user" element={<PrivateRoute><MainLayout><UserList /></MainLayout></PrivateRoute>} />
      <Route path="/master/project" element={<PrivateRoute><MainLayout><ProjectList /></MainLayout></PrivateRoute>} />

      {/* Management Routes */}
      <Route path="/management/device" element={<PrivateRoute><MainLayout><DeviceManagement /></MainLayout></PrivateRoute>} />
      <Route path="/management/project" element={<PrivateRoute><MainLayout><ProjectManagement /></MainLayout></PrivateRoute>} />
      <Route path="/management/user" element={<PrivateRoute><MainLayout><UserManagement /></MainLayout></PrivateRoute>} />
      <Route path="/management/device-list" element={<PrivateRoute><MainLayout><ManageOrgProjectList /></MainLayout></PrivateRoute>} />
      <Route path="/management/getway" element={<PrivateRoute><MainLayout><GetwayManage /></MainLayout></PrivateRoute>} />
      <Route path="/management/branch" element={<PrivateRoute><MainLayout><BranchManagement /></MainLayout></PrivateRoute>} />
      <Route path="/management/branch/:branchId/config" element={<PrivateRoute><MainLayout><BranchConfig /></MainLayout></PrivateRoute>} />







      <Route
        path="/my-profile"
        element={
          <PrivateRoute>
            <MainLayout>
              <MyProfile />
            </MainLayout>
          </PrivateRoute>
        }
      />

      {/* 404 Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
