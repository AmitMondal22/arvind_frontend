// src/utils/axios.js
import axios from "axios";
import { message } from "antd";

const instance = axios.create({
  baseURL: "https://your-api-url.com", // Change this to your API base URL
  withCredentials: true, // if using cookies
});

// Response interceptor
instance.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      message.error("Session expired. Redirecting to login...");
      // Redirect to login
      window.location.href = "/login"; // or use react-router: navigate("/login")
    }

    return Promise.reject(error);
  }
);

export default instance;
