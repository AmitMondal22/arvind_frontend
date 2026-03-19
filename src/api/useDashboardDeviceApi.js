import axios from 'axios';
import { useNavigate } from 'react-router-dom';  // Assuming React Router v6+

import useError from './usedError';
import { address } from '../routes/ApiRoute';
import { useAuth } from '../context/AuthContext';

function useDashboardDeviceApi() {
    const { handelError } = useError();
    const navigate = useNavigate();
    const { token } = useAuth();

    const logoutAndRedirect = () => {
        // Clear any auth tokens/session storage/localStorage here
        localStorage.removeItem('user');  // example
        localStorage.removeItem('token');  // example
        // Redirect to login page
        navigate('/login');
    };




    const dashboardDeviceList = async (organizationId, projectId) => {
        try {
           
           const response = await axios.post(address.DASHBOARD_DEVICE_LIST,{
                organization_id: organizationId,
                project_id: projectId
            }, 
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // example
                }
            });
            console.log(">>>>>>>>", response.status);
            if (response.status == 200 || response.status == 201) {
                console.log("XXXXXXXXXX", response.status);
                return response.data;
            }

            if (response.status === 401) {
                    console.log('Unauthorized access - logging out');
                    logoutAndRedirect();
                    return { status: false, error: "Unauthorized access" };
            }
            const errorResult = await handleError(response.status);
            return { status: false, error: errorResult.message || "An error occurred" };
            
        } catch (error) {
                if (error.response) {
                    console.log("Axios error status:", error.response.status);

                    if (error.response.status === 401) {
                        console.log('Unauthorized access - logging out');
                        logoutAndRedirect();
                        return{status:false,error:"Unauthorized access - logging out"};  // Stop further execution
                    }

                    const errorResult = await handelError(error.response.status);
                     return{status:false,error:"Unauthorized access - logging out"};  // Stop further execution
                } else {
                    console.error("Unexpected error:", error);
                    const errorResult = await handelError(error);
                    return{status:false,error:"Unexpected error occurred"};  // Stop further execution
                }
            }
    };




    const dashboardSwitchApi = async (data) => {
        try {
           
           const response = await axios.post(address.SWITCH_API,data, 
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // example
                }
            });
            console.log(">>>>>>>>", response.status);
            if (response.status == 200 || response.status == 201) {
                console.log("XXXXXXXXXX", response.status);
                return response.data;
            }

            if (response.status === 401) {
                    console.log('Unauthorized access - logging out');
                    logoutAndRedirect();
                    return { status: false, error: "Unauthorized access" };
            }
            const errorResult = await handleError(response.status);
            return { status: false, error: errorResult.message || "An error occurred" };
            
        } catch (error) {
                if (error.response) {
                    console.log("Axios error status:", error.response.status);

                    if (error.response.status === 401) {
                        console.log('Unauthorized access - logging out');
                        logoutAndRedirect();
                        return{status:false,error:"Unauthorized access - logging out"};  // Stop further execution
                    }

                    const errorResult = await handelError(error.response.status);
                     return{status:false,error:"Unauthorized access - logging out"};  // Stop further execution
                } else {
                    console.error("Unexpected error:", error);
                    const errorResult = await handelError(error);
                    return{status:false,error:"Unexpected error occurred"};  // Stop further execution
                }
            }
    };


    const valveDataApi = async (data) => {
        try {
           
           const response = await axios.post(address.VALVE_DATA,data, 
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // example
                }
            });
            console.log(">>>>>>>>", response.status);
            if (response.status == 200 || response.status == 201) {
                console.log("XXXXXXXXXX", response.status);
                return response.data;
            }

            if (response.status === 401) {
                    console.log('Unauthorized access - logging out');
                    logoutAndRedirect();
                    return { status: false, error: "Unauthorized access" };
            }
            const errorResult = await handleError(response.status);
            return { status: false, error: errorResult.message || "An error occurred" };
            
        } catch (error) {
                if (error.response) {
                    console.log("Axios error status:", error.response.status);

                    if (error.response.status === 401) {
                        console.log('Unauthorized access - logging out');
                        logoutAndRedirect();
                        return{status:false,error:"Unauthorized access - logging out"};  // Stop further execution
                    }

                    const errorResult = await handelError(error.response.status);
                     return{status:false,error:"Unauthorized access - logging out"};  // Stop further execution
                } else {
                    console.error("Unexpected error:", error);
                    const errorResult = await handelError(error);
                    return{status:false,error:"Unexpected error occurred"};  // Stop further execution
                }
            }
    };



    const shedulingDataApi = async (data) => {
        try {
           
           const response = await axios.post(address.SHEDULING_SAVE,data, 
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // example
                }
            });
            console.log(">>>>>>>>", response.status);
            if (response.status == 200 || response.status == 201) {
                console.log("XXXXXXXXXX", response.status);
                return response.data;
            }

            if (response.status === 401) {
                    console.log('Unauthorized access - logging out');
                    logoutAndRedirect();
                    return { status: false, error: "Unauthorized access" };
            }
            const errorResult = await handleError(response.status);
            return { status: false, error: errorResult.message || "An error occurred" };
            
        } catch (error) {
                if (error.response) {
                    console.log("Axios error status:", error.response.status);

                    if (error.response.status === 401) {
                        console.log('Unauthorized access - logging out');
                        logoutAndRedirect();
                        return{status:false,error:"Unauthorized access - logging out"};  // Stop further execution
                    }

                    const errorResult = await handelError(error.response.status);
                     return{status:false,error:"Unauthorized access - logging out"};  // Stop further execution
                } else {
                    console.error("Unexpected error:", error);
                    const errorResult = await handelError(error);
                    return{status:false,error:"Unexpected error occurred"};  // Stop further execution
                }
            }
    };


    const shedulingDataGetApi = async (data) => {
        try {
           
           const response = await axios.post(address.GET_SHEDULING,data, 
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // example
                }
            });
            console.log(">>>>>>>>", response.status);
            if (response.status == 200 || response.status == 201) {
                console.log("XXXXXXXXXX", response.status);
                return response.data;
            }

            if (response.status === 401) {
                    console.log('Unauthorized access - logging out');
                    logoutAndRedirect();
                    return { status: false, error: "Unauthorized access" };
            }
            const errorResult = await handleError(response.status);
            return { status: false, error: errorResult.message || "An error occurred" };
            
        } catch (error) {
                if (error.response) {
                    console.log("Axios error status:", error.response.status);

                    if (error.response.status === 401) {
                        console.log('Unauthorized access - logging out');
                        logoutAndRedirect();
                        return{status:false,error:"Unauthorized access - logging out"};  // Stop further execution
                    }

                    const errorResult = await handelError(error.response.status);
                     return{status:false,error:"Unauthorized access - logging out"};  // Stop further execution
                } else {
                    console.error("Unexpected error:", error);
                    const errorResult = await handelError(error);
                    return{status:false,error:"Unexpected error occurred"};  // Stop further execution
                }
            }
    };


    const resetShedulingApi = async (data) => {
        try {
           
           const response = await axios.post(address.RESET_SHEDULING,data, 
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // example
                }
            });
            console.log(">>>>>>>>", response.status);
            if (response.status == 200 || response.status == 201) {
                console.log("XXXXXXXXXX", response.status);
                return response.data;
            }

            if (response.status === 401) {
                    console.log('Unauthorized access - logging out');
                    logoutAndRedirect();
                    return { status: false, error: "Unauthorized access" };
            }
            const errorResult = await handleError(response.status);
            return { status: false, error: errorResult.message || "An error occurred" };
            
        } catch (error) {
                if (error.response) {
                    console.log("Axios error status:", error.response.status);

                    if (error.response.status === 401) {
                        console.log('Unauthorized access - logging out');
                        logoutAndRedirect();
                        return{status:false,error:"Unauthorized access - logging out"};  // Stop further execution
                    }

                    const errorResult = await handelError(error.response.status);
                     return{status:false,error:"Unauthorized access - logging out"};  // Stop further execution
                } else {
                    console.error("Unexpected error:", error);
                    const errorResult = await handelError(error);
                    return{status:false,error:"Unexpected error occurred"};  // Stop further execution
                }
            }
    };



    const readLastDataApi = async (data) => {
        try {
           const response = await axios.post(address.READ_LAST_DATA, data, 
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.status == 200 || response.status == 201) {
                return response.data;
            }
            if (response.status === 401) {
                logoutAndRedirect();
                return { status: false, error: "Unauthorized access" };
            }
            return { status: false, error: "An error occurred" };
            
        } catch (error) {
            if (error.response) {
                if (error.response.status === 401) {
                    logoutAndRedirect();
                    return { status: false, error: "Unauthorized access" };
                }
                const errorResult = await handelError(error.response.status);
                return { status: false, error: "An error occurred" };
            } else {
                console.error("Unexpected error:", error);
                return { status: false, error: "Unexpected error occurred" };
            }
        }
    };

    const requestWebsocketDataApi = async (data) => {
        try {
           
           const response = await axios.post(address.WEBSOSKET_RES,data, 
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // example
                }
            });
            console.log(">>>>>>>>", response.status);
            if (response.status == 200 || response.status == 201) {
                console.log("XXXXXXXXXX", response.status);
                return response.data;
            }

            if (response.status === 401) {
                    console.log('Unauthorized access - logging out');
                    logoutAndRedirect();
                    return { status: false, error: "Unauthorized access" };
            }
            if (response.status === 400) {
                    console.log('Unauthorized access - logging out');
                  
                    return { status: false, error: "Unauthorized access" };
            }
            const errorResult = await handleError(response.status);
            return { status: false, error: errorResult.message || "An error occurred" };
            
        } catch (error) {
                if (error.response) {
                    console.log("Axios error status:", error.response.status);

                    if (error.response.status === 401) {
                        console.log('Unauthorized access - logging out');
                        logoutAndRedirect();
                        return{status:false,error:"Unauthorized access - logging out"};  // Stop further execution
                    }

                    const errorResult = await handelError(error.response.status);
                     return{status:false,error:"Unauthorized access - logging out"};  // Stop further execution
                } else {
                    console.error("Unexpected error:", error);
                    const errorResult = await handelError(error);
                    return{status:false,error:"Unexpected error occurred"};  // Stop further execution
                }
            }
    };


    const deviceStatusUpdateApi = async (data) => {
        try {
           const response = await axios.post(address.DEVICE_STATUS_UPDATE, data, 
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.status == 200 || response.status == 201) {
                return response.data;
            }
            if (response.status === 401) {
                logoutAndRedirect();
                return { status: false, error: "Unauthorized access" };
            }
            return { status: false, error: "An error occurred" };
        } catch (error) {
            if (error.response) {
                if (error.response.status === 401) {
                    logoutAndRedirect();
                    return { status: false, error: "Unauthorized access" };
                }
                const errorResult = await handelError(error.response.status);
                return { status: false, error: "Error occurred" };
            } else {
                console.error("Unexpected error:", error);
                return { status: false, error: "Unexpected error occurred" };
            }
        }
    };


    return { dashboardDeviceList, dashboardSwitchApi, valveDataApi, shedulingDataApi, shedulingDataGetApi, resetShedulingApi, requestWebsocketDataApi, deviceStatusUpdateApi, readLastDataApi };
}

export default useDashboardDeviceApi;
