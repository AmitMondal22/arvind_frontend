import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user')));
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [redirectPath, setRedirectPath] = useState(() => localStorage.getItem('redirectPath'));

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
  };

  const redirectFun = (authRedirect) => {
    setRedirectPath(authRedirect);
    localStorage.setItem('redirectPath', authRedirect);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('redirectPath');
    // localStorage.clear();
  };

  return (
    <AuthContext.Provider value={{ user, token,redirectPath, login,redirectFun, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
