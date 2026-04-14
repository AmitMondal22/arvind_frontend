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
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [mobileNumber, setMobileNumber] = useState("");
  const { apiLogin, apiSendOtp, apiVerifyOtp } = useAuthApi();

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
      
      if (!isOtpSent) {
        // Send OTP Flow
        const mobile = values.mobile_number;
        const res_data = await apiSendOtp(mobile);
        
        if (res_data.status === false) {
          message.error(res_data.error || "Failed to send OTP.");
          return;
        }
        
        message.success("OTP sent to your mobile number!");
        setMobileNumber(mobile);
        setIsOtpSent(true);
      } else {
        // Verify OTP Flow
        const res_data = await apiVerifyOtp(mobileNumber, values.otp);
        
        if (res_data.status === false) {
          message.error(res_data.error || "Invalid OTP.");
          return;
        }

        const { user_data, token } = res_data.data;
        if (values.remember) {
          localStorage.setItem("mobile_number", mobileNumber);
        } else {
          localStorage.removeItem("mobile_number");
        }
        message.success("Login successful!");
        login(user_data, token);

        let resData = await getMenuDataData(token)
        let examp = resData.data;

        if (examp && examp.length > 0 && examp[0].projects && examp[0].projects.length > 0) {
          redirectFun(`/${examp[0].organization_id}/${examp[0].projects[0].project_id}/${examp[0].organization_name}/${examp[0].projects[0].project_name}`)
          navigate(`/${examp[0].organization_id}/${examp[0].projects[0].project_id}/${examp[0].organization_name}/${examp[0].projects[0].project_name}`);
        } else {
          navigate("/");
        }
      }

    } catch (error) {
      if (!isOtpSent) {
        message.error("Failed to send OTP.");
      } else {
        message.error("Login failed. Please check your OTP.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedMobile = localStorage.getItem("mobile_number");
    if (storedMobile) {
      form.setFieldsValue({
        mobile_number: storedMobile,
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
            {!isOtpSent ? (
               <Form.Item
                 name="mobile_number"
                 label="Mobile Number"
                 rules={[{ required: true, message: "Please input your Mobile Number!" }]}
               >
                 <Input prefix={<UserOutlined />} placeholder="Enter your mobile number" />
               </Form.Item>
            ) : (
               <Form.Item
                 name="otp"
                 label="OTP"
                 rules={[{ required: true, message: "Please input the OTP sent to your mobile!" }]}
               >
                 <Input.Password prefix={<LockOutlined />} placeholder="Enter the 6-digit OTP" />
               </Form.Item>
            )}
            {!isOtpSent && (
              <Form.Item name="remember" valuePropName="checked">
                <div className="login-options">
                  <Checkbox>Remember Me</Checkbox>
                  {/* <Link className="forgot-link">Forgot Password?</Link> */}
                </div>
              </Form.Item>
            )}
            {isOtpSent && (
              <div className="login-options" style={{ marginBottom: 20 }}>
                 <Link className="forgot-link" onClick={() => setIsOtpSent(false)}>Change Mobile Number</Link>
              </div>
            )}
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className="login-button"
                loading={loading}
              >
                {isOtpSent ? "Login" : "Send OTP"}
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Login;
