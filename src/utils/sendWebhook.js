import axios from 'axios';

/**
 * Send a fully dynamic webhook request using Axios.
 * 
 * @param {string} url - The webhook URL to call.
 * @param {string} method - HTTP method ('POST', 'GET', 'PUT', etc.)
 * @param {Object} headers - Optional headers object.
 * @param {Object} data - Optional request body data.
 * @param {Object} params - Optional URL query params.
 */
async function sendWebhook({ url, method = 'POST', headers = {}, data = {}, params = {} }) {
  try {
    const response = await axios({
      url,
      method,
      headers,
      data,
      params,
      timeout: 10000, // 10 seconds timeout (optional)
    });

    console.log('Webhook response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Webhook error:', error.response ? error.response.data : error.message);
    throw error;
  }
}
