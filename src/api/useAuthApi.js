import axios from 'axios';
import { useNavigate } from 'react-router-dom';  // Assuming React Router v6+

import useError from './usedError';
import { address } from '../routes/ApiRoute';

function useAuthApi() {
    const { handelError } = useError();
    const navigate = useNavigate();

    const logoutAndRedirect = () => {
        // Clear any auth tokens/session storage/localStorage here
        localStorage.removeItem('user');  // example
        localStorage.removeItem('token');  // example
        // Redirect to login page
        navigate('/login');
    };

    const apiLogin = async (username, password) => {
        try {
            const response = await axios.post(address.LOGIN, { email:username, password })
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
    const apiSendOtp = async (mobile_number) => {
        try {
            const response = await axios.post(address.SEND_OTP, { mobile_number });
            if (response.status !== 200) {
                const errorResult = await handelError(response.status);
                return { status: false, error: "Failed to send OTP" };
            }
            return response.data;
        } catch (error) {
            console.error("Axios OTP send error:", error);
            return { status: false, error: error.response?.data?.detail || "Unexpected error occurred" };
        }
    };

    const apiVerifyOtp = async (mobile_number, otp) => {
        try {
            const response = await axios.post(address.VERIFY_OTP, { mobile_number, otp });
            if (response.status !== 200) {
                if (response.status === 401) {
                    logoutAndRedirect();
                    return { status: false, error: "Unauthorized access - logging out" };
                }
                const errorResult = await handelError(response.status);
                return { status: false, error: "OTP Verification failed" };
            }
            return response.data;
        } catch (error) {
            console.error("Axios OTP verify error:", error);
            if (error.response && error.response.status === 401) {
                logoutAndRedirect();
            }
            return { status: false, error: error.response?.data?.detail || "Unexpected error occurred" };
        }
    };

    return { apiLogin, apiSendOtp, apiVerifyOtp };
}

export default useAuthApi;
