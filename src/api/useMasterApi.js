import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import useError from './usedError';
import { address } from '../routes/ApiRoute';
import { useAuth } from '../context/AuthContext';

function useMasterApi() {
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

    // Organization
    const listOrganization = (data) => callApi('post', address.MANAGE_ORGANIZATION_LIST, data);
    const addOrganization = (data) => callApi('post', address.MANAGE_ORGANIZATION_ADD, data);
    const editOrganization = (data) => callApi('post', address.MANAGE_ORGANIZATION_EDIT, data);
    const deleteOrganization = (data) => callApi('post', address.MANAGE_ORGANIZATION_DELETE, data);

    // User
    const listUser = (data) => callApi('post', address.MANAGE_USER_LIST, data);
    const addUser = (data) => callApi('post', address.MANAGE_USER_ADD, data);
    const editUser = (data) => callApi('post', address.MANAGE_USER_EDIT, data);
    const deleteUser = (data) => callApi('post', address.MANAGE_USER_DELETE, data);

    // Project
    const listProject = (data) => callApi('post', address.MANAGE_PROJECTS_LIST, data);
    const addProject = (data) => callApi('post', address.MANAGE_PROJECTS_ADD, data);
    const editProject = (data) => callApi('post', address.MANAGE_PROJECTS_EDIT, data);
    const deleteProject = (data) => callApi('post', address.MANAGE_PROJECTS_DELETE, data);

    return {
        listOrganization, addOrganization, editOrganization, deleteOrganization,
        listUser, addUser, editUser, deleteUser,
        listProject, addProject, editProject, deleteProject
    };
}

export default useMasterApi;
