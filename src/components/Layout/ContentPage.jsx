const ContentPage = ({ children }) => (
  <div
    style={{
      marginLeft: 240,
      marginTop: 64,
      padding: '32px',
      minHeight: 'calc(100vh - 64px)',
      background: "#F5F7FA"
    }}
  >
    {children}
  </div>
);

export default ContentPage;
