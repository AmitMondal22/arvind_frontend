import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import useError from './usedError';
import { address } from '../routes/ApiRoute';
import { useAuth } from '../context/AuthContext';

function useManagementApi() {
    const { handelError } = useError();
    const navigate = useNavigate();
    const { token } = useAuth();

    const logoutAndRedirect = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login');
    };

    const callApi = async (method, url, data = null) => {
        try {
            const config = {
                method,
                url,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                data: method === 'get' ? undefined : data,
                params: method === 'get' ? data : undefined
            };

            const response = await axios(config);
            if (response.status !== 200) {
                if (response.status === 401) {
                    console.log('Unauthorized access - logging out');
                    logoutAndRedirect();
                    return { status: false, error: "Unauthorized access - logging out" };
                }
                await handelError(response.status);
                return { status: false, error: "Error occurred" };
            }
            return response.data;
        } catch (error) {
            if (error.response) {
                if (error.response.status === 401) {
                    logoutAndRedirect();
                    return { status: false, error: "Unauthorized access - logging out" };
                }
                const errorResult = await handelError(error.response.status);
                return { status: false, error: errorResult || "Error occurred" };
            } else {
                console.error("Unexpected error:", error);
                await handelError(error);
                return { status: false, error: "Unexpected error occurred" };
            }
        }
    };

    // Devices
    const listDevices = (data) => callApi('post', address.MANAGE_DEVICES_LIST, data);
    const addDevice = (data) => callApi('post', address.MANAGE_DEVICES_ADD, data);
    const editDevice = (data) => callApi('post', address.MANAGE_DEVICES_EDIT, data);
    // Project Management (Assign Devices)
    const listProjectDevice = (data) => callApi('post', address.MANAGE_PROJECT_DEVICE_LIST, data);
    const addProjectDevice = (data) => callApi('post', address.MANAGE_PROJECT_DEVICE_ADD, data);
    const deleteProjectDevice = (data) => callApi('post', address.MANAGE_PROJECT_DEVICE_DELETE, data);
    // User Management (Assign Devices)
    const listUserDevice = (data) => callApi('post', address.MANAGE_USER_DEVICE_LIST, data);
    const addUserDevice = (data) => callApi('post', address.MANAGE_USER_DEVICE_ADD, data);
    const editUserDevice = (data) => callApi('post', address.MANAGE_USER_DEVICE_EDIT, data);
    const deleteUserDevice = (data) => callApi('post', address.MANAGE_USER_DEVICE_DELETE, data);

    return {
        listDevices, addDevice, editDevice,
        listProjectDevice, addProjectDevice, deleteProjectDevice,
        listUserDevice, addUserDevice, editUserDevice, deleteUserDevice
    };
}

export default useManagementApi;
