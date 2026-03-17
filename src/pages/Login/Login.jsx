import React, { useState, useEffect, useCallback } from "react";
import { Form, Input, Button, Typography, Checkbox, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Login.css";
import banner from "../../assets/undraw/Pipeline maintenance-pana.png";
import logo from "../../assets/logo/logo.jpg";
import useAuthApi from "../../api/useAuthApi";
import useMenuApi from "../../api/useMenuApi";

const { Title, Link } = Typography;

const Login = () => {
  const { menu_org_project_list } = useMenuApi();
  const { login, redirectFun } = useAuth();
  const [menudData, setMenudData] = useState([]);
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [bubbles, setBubbles] = useState([]);
  const { apiLogin } = useAuthApi();

  // Generate random bubble properties
  const generateBubble = useCallback(() => {
    const size = Math.random() * 80 + 30; // 30-110px
    const leftPosition = Math.random() * 95; // 0-95%
    const duration = Math.random() * 10 + 8; // 8-18 seconds
    const delay = Math.random() * 5; // 0-5 seconds

    return {
      id: Date.now() + Math.random(),
      size,
      left: leftPosition,
      duration,
      delay,
    };
  }, []);


  const getMenuDataData = async (token) => {
    const mnData = await menu_org_project_list(token);
    if (mnData.status) {
      console.log(mnData.data);
      setMenudData(mnData.data);
    } else {
      setMenudData([]);
    }
    return mnData;
  };

  // Add new bubble
  const addBubble = useCallback(() => {
    const newBubble = generateBubble();
    setBubbles(prev => [...prev, newBubble]);

    // Remove bubble after animation completes
    setTimeout(() => {
      setBubbles(prev => prev.filter(bubble => bubble.id !== newBubble.id));
    }, (newBubble.duration + newBubble.delay) * 1000);
  }, [generateBubble]);

  // Initialize bubbles and set interval
  useEffect(() => {
    // Add initial bubbles
    for (let i = 0; i < 5; i++) {
      setTimeout(() => addBubble(), i * 1000);
    }

    // Add new bubble every 2-4 seconds
    const bubbleInterval = setInterval(() => {
      addBubble();
    }, Math.random() * 2000 + 2000);

    return () => clearInterval(bubbleInterval);
  }, [addBubble]);

  const onFinish = async (values) => {
    try {
      setLoading(true);
      const res_data = await apiLogin(values.username, values.password);
      if (res_data.status === false) {
        message.error(res_data.error);
        return;
      }

      const { user_data, token } = res_data.data;
      if (values.remember) {
        localStorage.setItem("username", values.username);
        localStorage.setItem("password", values.password);
      } else {
        localStorage.removeItem("username");
        localStorage.removeItem("password");
      }
      message.success("Login successful!");
      login(user_data, token);

      console.log(">>>>><,,,,,,");
      let resData = await getMenuDataData(token)
      let examp = resData.data;


      console.log("mmmuuuuuuuuuuuuuuu", examp);
      console.log(`/${examp[0].organization_id}/${examp[0].projects[0].project_id}/${examp[0].organization_name}/${examp[0].projects[0].project_name}`);


      redirectFun(`/${examp[0].organization_id}/${examp[0].projects[0].project_id}/${examp[0].organization_name}/${examp[0].projects[0].project_name}`)

      navigate(`/${examp[0].organization_id}/${examp[0].projects[0].project_id}/${examp[0].organization_name}/${examp[0].projects[0].project_name}`);






    } catch (error) {
      message.error("Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    const storedPassword = localStorage.getItem("password");
    if (storedUsername && storedPassword) {
      form.setFieldsValue({
        username: storedUsername,
        password: storedPassword,
        remember: true,
      });
    }
  }, [form]);

  return (
    <div className="login-container">
      {/* Dynamic Animated Bubbles */}
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="bubble"
          style={{
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            left: `${bubble.left}%`,
            animationDuration: `${bubble.duration}s`,
            animationDelay: `${bubble.delay}s`,
          }}
        />
      ))}

      <div className="login-box">
        <div className="login-left">
          <img src={banner} alt="Login Illustration" className="login-illustration" />
          <p className="login-description">
            Monitor and control your water valve station with live insights into flow rates, consumption, pressure levels, and operational efficiency.
          </p>
        </div>
        <div className="login-right">
          <div className="login-logo-wrapper">
            <img src={logo} alt="Brand Logo" className="login-logo" />
          </div>
          <div className="login-welcome-badge">Welcome back</div>
          <Title level={3}>Login to your account</Title>
          <Form form={form} name="login" layout="vertical" onFinish={onFinish} className="login-form">
            <Form.Item
              name="username"
              label="Username"
              rules={[{ required: true, message: "Please input your Username!" }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Enter your username" />
            </Form.Item>
            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: "Please input your Password!" }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Enter your password" />
            </Form.Item>
            <Form.Item name="remember" valuePropName="checked">
              <div className="login-options">
                <Checkbox>Remember Me</Checkbox>
                <Link className="forgot-link">Forgot Password?</Link>
              </div>
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className="login-button"
                loading={loading}
              >
                Login
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Login;
