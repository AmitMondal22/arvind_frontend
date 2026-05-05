import React, { useEffect, useState, useRef } from 'react';
import { Modal, Typography, Space } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { address } from '../routes/ApiRoute';

const { Text } = Typography;

const GlobalAlertListener = () => {
  const { user } = useAuth();
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const isConnecting = useRef(false);

  useEffect(() => {
    // Ensure we have a user and they have a mobile number
    if (!user || (!user.mobile && !user.user_mobile)) {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      return;
    }

    const mobile = user.mobile || user.user_mobile;
    const wsUrl = `${address.WS_ALERT_CONNECTION}${mobile}`;

    const connectWebSocket = () => {
      if (isConnecting.current) return;
      isConnecting.current = true;

      // Ensure no dangling connection
      if (ws.current) {
        ws.current.close();
      }

      const socket = new WebSocket(wsUrl);
      ws.current = socket;

      socket.onopen = () => {
        console.log('Global Alert System: WebSocket connected for mobile', mobile);
        isConnecting.current = false;
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
          reconnectTimeout.current = null;
        }
      };

      socket.onmessage = (event) => {
        console.log('Global Alert System: Received raw message:', event.data);
        
        try {
          if (typeof event.data === 'string' && event.data.startsWith('Echo:')) return;

          let data;
          try {
            data = JSON.parse(event.data);
            // Handle double-stringified JSON just in case
            if (typeof data === 'string') {
              data = JSON.parse(data);
            }
          } catch (e) {
            console.error('Failed to parse WebSocket message as JSON:', event.data);
            return;
          }
          
          console.log('Global Alert System: Parsed Data Object:', data);

          // We check for device and alert_type instead of exact type match to be absolutely safe
          if (data && data.device && data.alert_type) {
             console.log("Global Alert System: Verification passed, calling showAlertModal");
             showAlertModal(data);
          } else {
             console.log("Global Alert System: Data did not contain 'device' or 'alert_type', skipping modal.");
          }
        } catch (error) {
          console.error('Error processing alert WS message:', error);
        }
      };

      socket.onclose = () => {
        console.log('Global Alert System: WebSocket connection closed');
        ws.current = null;
        isConnecting.current = false;
        
        // Attempt to reconnect in 5 seconds
        if (!reconnectTimeout.current) {
           reconnectTimeout.current = setTimeout(() => {
             connectWebSocket();
           }, 5000);
        }
      };

      socket.onerror = (error) => {
        console.error('Global Alert System: WebSocket error', error);
        socket.close(); // let onclose handle reconnection
      };
    };

    connectWebSocket();

    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
      isConnecting.current = false;
    };
  }, [user]);

  const showAlertModal = (alertData) => {
    console.log("Global Alert System: Triggering Modal for Data", alertData);
    const { device, alert_type, value, raw_value, message } = alertData;

    try {
      Modal.warning({
        title: '🚨 Device Alert Triggered',
        content: (
          <Space direction="vertical" style={{ width: '100%', marginTop: '10px' }}>
            <Text strong>Device:</Text> <Text keyboard>{device}</Text>
            <Text strong>Alert Type:</Text> <Text type="danger">{alert_type}</Text>
            <Text strong>Value:</Text> <Text type="danger">{value}</Text>
            <Text strong>Message:</Text> <Text>{message}</Text>
          </Space>
        ),
        okText: 'Acknowledge',
        centered: true,
        icon: <WarningOutlined style={{ color: '#faad14' }} />
      });
      console.log("Global Alert System: Modal successfully requested.");
    } catch (err) {
      console.error("Global Alert System: Error attempting to show Modal:", err);
    }
  };

  return null;
};

export default GlobalAlertListener;
