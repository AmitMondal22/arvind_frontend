import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import useError from './usedError';
import { address } from '../routes/ApiRoute';
import { useAuth } from '../context/AuthContext';

function useBranchApi() {
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

    // Branch CRUD
    const listBranch = (data) => callApi('post', address.MANAGE_BRANCH_LIST, data);
    const addBranch = (data) => callApi('post', address.MANAGE_BRANCH_ADD, data);
    const editBranch = (data) => callApi('post', address.MANAGE_BRANCH_EDIT, data);
    const deleteBranch = (data) => callApi('post', address.MANAGE_BRANCH_DELETE, data);
    const availableBranchNumbers = (data) => callApi('post', address.MANAGE_BRANCH_AVAILABLE_NUMBERS, data);

    // Branch Device Assignment
    const listBranchDevice = (data) => callApi('post', address.MANAGE_BRANCH_DEVICE_LIST, data);
    const addBranchDevice = (data) => callApi('post', address.MANAGE_BRANCH_DEVICE_ADD, data);
    const deleteBranchDevice = (data) => callApi('post', address.MANAGE_BRANCH_DEVICE_DELETE, data);

    // Branch Scheduling
    const getBranchScheduling = (data) => callApi('post', address.MANAGE_BRANCH_SCHEDULING_GET, data);
    const saveBranchScheduling = (data) => callApi('post', address.MANAGE_BRANCH_SCHEDULING_SAVE, data);
    const resetBranchScheduling = (data) => callApi('post', address.MANAGE_BRANCH_SCHEDULING_RESET, data);

    // Branch Switch (Manual Mode)
    const switchBranch = (data) => callApi('post', address.MANAGE_BRANCH_SWITCH, data);

    // Branch Config (Full Control Panel)
    const getBranchConfig = (data) => callApi('post', address.MANAGE_BRANCH_CONFIG_GET, data);

    // Branch-Level (ALL devices) Switch / Schedule
    const switchBranchAll = (data) => callApi('post', address.MANAGE_BRANCH_SWITCH_ALL, data);
    const scheduleSaveBranchAll = (data) => callApi('post', address.MANAGE_BRANCH_SCHEDULE_SAVE_ALL, data);
    const scheduleResetBranchAll = (data) => callApi('post', address.MANAGE_BRANCH_SCHEDULE_RESET_ALL, data);

    return {
        listBranch, addBranch, editBranch, deleteBranch, availableBranchNumbers,
        listBranchDevice, addBranchDevice, deleteBranchDevice,
        getBranchScheduling, saveBranchScheduling, resetBranchScheduling,
        switchBranch, getBranchConfig,
        switchBranchAll, scheduleSaveBranchAll, scheduleResetBranchAll
    };
}

export default useBranchApi;


