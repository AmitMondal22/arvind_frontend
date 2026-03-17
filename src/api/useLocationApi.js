import axios from 'axios';
import { useNavigate } from 'react-router-dom';  // Assuming React Router v6+

import useError from './usedError';
import { address } from '../routes/ApiRoute';
import { useAuth } from '../context/AuthContext';

function useLocationApi() {
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

    const apiCountryList = async () => {
        try {
           const response = await axios.get(address.COUNTRY_LIST, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // example
                }
            });
            console.log(">>>>>>>>",response.status);
            if (response.status !== 200) {
                if (response.status === 401) {
                    console.log('Unauthorized access - logging out');
                    logoutAndRedirect();
                     return{status:false,error:"Unauthorized access - logging out"};  // Stop further execution
                }
                const errorResult = await handelError(response.status);
                return{status:false,error:"Unauthorized access - logging out"};  // Stop further execution
            }
              return response.data;
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


    const apiStateList = async (country_id) => {
        try {
           const response = await axios.get(address.STATE_LIST+"/"+country_id, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // example
                }
            });
            console.log(">>>>>>>>",response.status);
            if (response.status !== 200) {
                if (response.status === 401) {
                    console.log('Unauthorized access - logging out');
                    logoutAndRedirect();
                     return{status:false,error:"Unauthorized access - logging out"};  // Stop further execution
                }
                const errorResult = await handelError(response.status);
                return{status:false,error:"Unauthorized access - logging out"};  // Stop further execution
            }
              return response.data;
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



    const apiCityList = async (state_id) => {
        try {
           const response = await axios.get(address.CITY_LIST+"/"+state_id, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // example
                }
            });
            console.log(">>>>>>>>",response.status);
            if (response.status !== 200) {
                if (response.status === 401) {
                    console.log('Unauthorized access - logging out');
                    logoutAndRedirect();
                     return{status:false,error:"Unauthorized access - logging out"};  // Stop further execution
                }
                const errorResult = await handelError(response.status);
                return{status:false,error:"Unauthorized access - logging out"};  // Stop further execution
            }
              return response.data;
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

    const apiCityStateCountryList = async (city_id) => {
        try {
           const response = await axios.get(address.CITY_STATE_COUNTRY_LIST+city_id, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // example
                }
            });
            console.log(">>>>>>>>",response.status);
            if (response.status !== 200) {
                if (response.status === 401) {
                    console.log('Unauthorized access - logging out');
                    logoutAndRedirect();
                     return{status:false,error:"Unauthorized access - logging out"};  // Stop further execution
                }
                const errorResult = await handelError(response.status);
                return{status:false,error:"Unauthorized access - logging out"};  // Stop further execution
            }
              return response.data;
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

    return { apiCountryList, apiStateList, apiCityList, apiCityStateCountryList };
}

export default useLocationApi;
