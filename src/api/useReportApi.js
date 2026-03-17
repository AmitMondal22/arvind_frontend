import axios from 'axios';
import { useNavigate } from 'react-router-dom';  // Assuming React Router v6+

import useError from './usedError';
import { address } from '../routes/ApiRoute';
import { useAuth } from '../context/AuthContext';

function useReportApi() {
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

   const apiDeviceReport = async (data) => {
  try {
    const response = await axios.post(
      address.REPORT_DEVICE_REPORT,
      data, // request body
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    console.log(">>>>>>>>", response.status);
    return response.data;

  } catch (error) {
    if (error.response) {
      console.log("Axios error status:", error.response.status);

      if (error.response.status === 401) {
        console.log('Unauthorized access - logging out');
        logoutAndRedirect();
        return { status: false, error: "Unauthorized access - logging out" };
      }

      await handelError(error.response.status);
      return { status: false, error: "Request failed" };

    } else {
      console.error("Unexpected error:", error);
      await handelError(error);
      return { status: false, error: "Unexpected error occurred" };
    }
  }
};



    const apiAnalyticsData = async (data) => {
        try {
           const response = await axios.get(address.REPORT_DEVICE_ANALYTICS, {
                params: data,
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


    

    return { apiDeviceReport, apiAnalyticsData };
}

export default useReportApi;
