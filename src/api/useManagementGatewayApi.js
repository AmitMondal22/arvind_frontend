import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import useError from './usedError';
import { address } from '../routes/ApiRoute';
import { useAuth } from '../context/AuthContext';

function useManagementGatewayApi() {
    const { handelError } = useError();
    const navigate = useNavigate();
    const { token } = useAuth();

    const logoutAndRedirect = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login');
    };

    const commonHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const handleApiResponse = async (response) => {
        if (response.status === 200 || response.status === 201) return response.data;
        if (response.status === 401) {
            logoutAndRedirect();
            return { status: false, error: "Unauthorized access" };
        }
        return { status: false, error: "An error occurred" };
    };

    const handleApiError = async (error) => {
        if (error.response) {
            if (error.response.status === 401) {
                logoutAndRedirect();
                return { status: false, error: "Unauthorized access - logging out" };
            }
            await handelError(error.response.status);
            return { status: false, error: error.response.data?.detail || "An error occurred" };
        }
        console.error("Unexpected error:", error);
        return { status: false, error: "Unexpected error occurred" };
    };

    const listGatewayApi = async () => {
        try {
            const response = await axios.post(address.MANAGEMENT_GATEWAY_LIST, {}, { headers: commonHeaders });
            return await handleApiResponse(response);
        } catch (error) {
            return await handleApiError(error);
        }
    };

    const addGatewayApi = async (data) => {
        try {
            const response = await axios.post(address.MANAGEMENT_GATEWAY_ADD, data, { headers: commonHeaders });
            return await handleApiResponse(response);
        } catch (error) {
            return await handleApiError(error);
        }
    };

    const editGatewayApi = async (data) => {
        try {
            const response = await axios.post(address.MANAGEMENT_GATEWAY_EDIT, data, { headers: commonHeaders });
            return await handleApiResponse(response);
        } catch (error) {
            return await handleApiError(error);
        }
    };

    const deleteGatewayApi = async (data) => {
        try {
            const response = await axios.post(address.MANAGEMENT_GATEWAY_DELETE, data, { headers: commonHeaders });
            return await handleApiResponse(response);
        } catch (error) {
            return await handleApiError(error);
        }
    };

    return { listGatewayApi, addGatewayApi, editGatewayApi, deleteGatewayApi };
}

export default useManagementGatewayApi;
