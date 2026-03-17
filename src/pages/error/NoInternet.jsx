import React from 'react';
import { Button, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import notFound from '../../assets/undraw/BadConnection3.svg';

const NoInternet = () => {
  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    } else {
      message.error('Still offline. Please check your internet connection.');
    }
  };

  return (
    <div style={styles.container}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        style={styles.content}
      >
        <img src={notFound} alt="No Internet" style={styles.image} />
        <h1 style={styles.title}>No Internet Connection</h1>
        <p style={styles.subtitle}>
          It looks like you are offline. Please check your internet connection and try again.
        </p>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          size="large"
          onClick={handleRetry}
        >
          Retry
        </Button>
      </motion.div>
    </div>
  );
};

const styles = {
  container: {
    height: '100vh',
    padding: '20px',
    background: '#f0f2f5',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },
  content: {
    maxWidth: '480px',
  },
  image: {
    width: '100%',
    maxWidth: '300px',
    marginBottom: '30px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 600,
    marginBottom: '12px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#777',
    marginBottom: '28px',
  },
};

export default NoInternet;