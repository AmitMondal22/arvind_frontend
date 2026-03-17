import axios from 'axios';
import { useNavigate } from 'react-router-dom';  // Assuming React Router v6+

import useError from './usedError';
import { address } from '../routes/ApiRoute';
import { useAuth } from '../context/AuthContext';

function useMenuApi() {
    const { handelError } = useError();
    const navigate = useNavigate();
    const { token } = useAuth();
    var api_token = token;

    const logoutAndRedirect = () => {
        // Clear any auth tokens/session storage/localStorage here
        localStorage.removeItem('user');  // example
        localStorage.removeItem('token');  // example
        // Redirect to login page
        navigate('/login');
    };




    const menu_org_project_list = async (tokendata = null) => {
        try {
            console.log("MMMMMMMMMMMMMMMMMMMMMMMGGGGGGGGGGGGGGGGGG",api_token);
            if(tokendata!=null){
                api_token = tokendata
            }
            console.log("MMMMMMMMMMMMMMMMMMMMMMMGGGGGGGGGGGGGGGGGG",api_token,tokendata);
           const response = await axios.post(address.MENU_ORG_PROJECT_LIST,{}, 
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${api_token}` // example
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







   


    return { menu_org_project_list };
}

export default useMenuApi;
