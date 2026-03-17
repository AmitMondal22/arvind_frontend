// src/pages/NotFound.js
import React from 'react';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import notFound from "../../assets/undraw/undraw_page-not-found_6wni.svg"
const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={styles.content}
      >
        <img
          src={notFound}
          alt="404 illustration"
          style={styles.image}
        />
        <h1 style={styles.title}>Oops! Page Not Found</h1>
        <p style={styles.subtitle}>
          The page you are looking for might have been removed or is temporarily unavailable.
        </p>
        <Button type="primary" size="large" onClick={() => navigate('/')}>
          Go Back Home
        </Button>
      </motion.div>
    </div>
  );
};

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    background: '#f9fafc',
    textAlign: 'center',
  },
  content: {
    maxWidth: '500px',
  },
  image: {
    width: '100%',
    maxWidth: '350px',
    marginBottom: '30px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 600,
    marginBottom: '10px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '30px',
  },
};

export default NotFound;
