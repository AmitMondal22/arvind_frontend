import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';



function useError() {
    const navigate = useNavigate(); // Hook for navigation
    const { logout } = useAuth();
    const handelError=async (error) => {
        var errorMessage
        if (error.response) {
            switch (error.response.status) {
                case 400:
                    // Handle 401 error (Unauthorized)
                    errorMessage = error.response.request.response
                    break;
                case 401:
                    // Handle 401 error (Unauthorized)
                    errorMessage = "Unauthorized access. Redirecting to login.";
                    errot401();
                    break;
                case 404:
                    // Handle 404 error (page not found)
                    errorMessage = "Api Not Found";
                    break;
                case 422:
                    // Handle 401 error (Unauthorized)
                    errorMessage = error.response.request.response
                    break;
                case 500:
                    // Handle 500 error (Server Error)
                    errorMessage = "Server error. Please try again later.";
                    break;
                default:
                    errorMessage = "An unexpected error occurred. Please try again later. "+error.message;
            }

        } else {
            // Handle network errors or other issues
            errorMessage = "Network error or request issue: " + (error.message || errorMessage);
        }
        console.log("<<<<<<<<<<<<<<<<<<<<<<<",errorMessage);
        return {
            success: false,
            error: errorMessage, // Return the error message
        };
    }




    const errot401 = async (user_id, password) => {
        await logout();
        navigate('/login');
    }

    

    return { errot401,handelError };
}
export default useError;