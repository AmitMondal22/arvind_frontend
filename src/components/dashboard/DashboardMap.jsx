import React, { useMemo, useState, useEffect } from 'react';
import { Card, Button, Tooltip } from 'antd';
import { 
  FullscreenOutlined, 
  FullscreenExitOutlined,
  CarOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  AimOutlined
} from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet markers in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom div icon for Destination
const destinationIcon = new L.divIcon({
  className: 'custom-destination-icon',
  html: `<div style="
    background: #ff4757;
    border: 3px solid white;
    box-shadow: 0 4px 10px rgba(255, 71, 87, 0.4);
    height: 24px;
    width: 24px;
    border-radius: 50%;
    animation: bounce 2s infinite;
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

// Custom div icon for Start Point
const startIcon = new L.divIcon({
  className: 'custom-start-icon',
  html: `<div style="
    background: #00b894;
    border: 3px solid white;
    box-shadow: 0 4px 10px rgba(0, 184, 148, 0.4);
    height: 18px;
    width: 18px;
    border-radius: 50%;
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

const toDate = (v) => (v ? new Date(v) : null);

const awaitingLabel = (updatedAtIso) => {
  if (!updatedAtIso) return 'N/A';
  const t = new Date(updatedAtIso);
  if (Number.isNaN(t.getTime())) return 'N/A';
  const diffMs = Date.now() - t.getTime();
  const mins = Math.max(0, Math.round(diffMs / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m ago`;
};

const useTrack = (locationData) => useMemo(() => {
  if (!Array.isArray(locationData) || locationData.length === 0) {
    return { rawTrack: [], current: null, startPoint: null, completeTrack: [] };
  }
  
  const sorted = [...locationData].sort((a, b) => {
    const da = toDate(a.created_at)?.getTime() ?? toDate(a.updated_at)?.getTime() ?? a.id ?? 0;
    const db = toDate(b.created_at)?.getTime() ?? toDate(b.updated_at)?.getTime() ?? b.id ?? 0;
    return da - db;
  });

  const rawTrack = sorted
    .filter(p => typeof p.latitude === 'number' && typeof p.longitude === 'number' && 
                p.latitude !== 0 && p.longitude !== 0)
    .map(p => ({ lat: p.latitude, lng: p.longitude, raw: p }));

  const completeTrack = [...rawTrack];

  const last = sorted[sorted.length - 1];
  const current = last && typeof last.latitude === 'number' && typeof last.longitude === 'number' &&
                  last.latitude !== 0 && last.longitude !== 0
    ? { lat: last.latitude, lng: last.longitude, raw: last }
    : null;
    
  const first = sorted[0];
  const startPoint = first && typeof first.latitude === 'number' && typeof first.longitude === 'number' &&
                     first.latitude !== 0 && first.longitude !== 0
    ? { lat: first.latitude, lng: first.longitude, raw: first }
    : null;

  return { rawTrack, current, startPoint, completeTrack };
}, [locationData]);

// Map center/zoom control component
function MapController({ center, zoom, positions }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [center, zoom, positions, map]);
  
  return null;
}

const DashboardMap = ({ locationData = [] }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const { current, startPoint, completeTrack } = useTrack(locationData);
  const positions = completeTrack.map(p => [p.lat, p.lng]);
  
  const defaultCenter = [22.5726, 88.3639];
  const center = current?.lat ? [current.lat, current.lng] : defaultCenter;

  const awaitingTime = current ? awaitingLabel(current.raw?.updated_at || current.raw?.created_at) : 'N/A';
  const updatedIso = current?.raw?.updated_at || current?.raw?.created_at;
  const lastUpdate = current?.raw?.date && current?.raw?.time
    ? `${current.raw.date} ${current.raw.time}`
    : updatedIso || 'N/A';

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // Add small delay to allow CSS transition to finish before trigging resize
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 400); 
  };

  const containerStyle = {
    position: isFullscreen ? 'fixed' : 'relative',
    top: isFullscreen ? 0 : 'auto',
    left: isFullscreen ? 0 : 'auto',
    right: isFullscreen ? 0 : 'auto',
    bottom: isFullscreen ? 0 : 'auto',
    width: isFullscreen ? '100vw' : '100%',
    height: isFullscreen ? '100vh' : 'auto',
    zIndex: isFullscreen ? 9999 : 1,
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    background: isFullscreen ? '#000' : 'transparent',
    overflow: 'hidden'
  };

  const mapContainerStyle = {
    backgroundColor: '#f8fafb',
    width: '100%',
    height: isFullscreen ? '100vh' : '50vh',
    borderRadius: isFullscreen ? 0 : '20px',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 1
  };

  return (
    <div style={containerStyle}>
      <Card
        style={{ 
          borderRadius: isFullscreen ? 0 : 20, 
          overflow: 'hidden', 
          border: 'none', 
          boxShadow: isFullscreen ? 'none' : '0 20px 60px rgba(0,0,0,0.12)', 
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafb 100%)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative'
        }}
        bodyStyle={{ padding: 0, position: 'relative' }}
      >
        <div style={{
          position: 'absolute',
          top: isFullscreen ? 20 : 16,
          right: isFullscreen ? 20 : 16,
          zIndex: 10000,
          transition: 'all 0.3s ease'
        }}>
          <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={toggleFullscreen}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
                width: 50,
                height: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            />
          </Tooltip>
        </div>

        {isFullscreen && current && (
          <div style={{
            position: 'absolute',
            top: 20,
            left: 20,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            padding: '20px 24px',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            zIndex: 10000,
            minWidth: 300,
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <CarOutlined style={{ color: '#ff4757', fontSize: 20, marginRight: 8 }} />
              <span style={{ fontWeight: 'bold', fontSize: 16, color: '#2d3436' }}>Live Tracking</span>
            </div>
            <div style={{ fontSize: 14, color: '#636e72', marginBottom: 8 }}>
              <ClockCircleOutlined style={{ marginRight: 6 }} />
              Status: <span style={{ color: '#ff4757', fontWeight: 'bold' }}>{awaitingTime}</span>
            </div>
            <div style={{ fontSize: 14, color: '#636e72', marginBottom: 8 }}>
              <EnvironmentOutlined style={{ marginRight: 6 }} />
              Points: <span style={{ color: '#00b894', fontWeight: 'bold' }}>{completeTrack.length}</span>
            </div>
            <div style={{ fontSize: 12, color: '#74b9ff', fontFamily: 'monospace' }}>
              <AimOutlined style={{ marginRight: 6 }} />
              {current.lat?.toFixed(6)}, {current.lng?.toFixed(6)}
            </div>
          </div>
        )}

        <div style={mapContainerStyle}>
            <MapContainer 
              center={center} 
              zoom={18} 
              style={{ height: '100%', width: '100%', borderRadius: isFullscreen ? 0 : '20px' }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              
              <MapController center={center} positions={positions} />

              {completeTrack.length > 1 && (
                <Polyline 
                  positions={positions} 
                  color="#0984e3" 
                  weight={6} 
                  opacity={0.8}
                />
              )}

              {startPoint?.lat && startPoint?.lng && completeTrack.length > 2 && (
                <Marker position={[startPoint.lat, startPoint.lng]} icon={startIcon}>
                  <Popup>Journey Start Point</Popup>
                </Marker>
              )}

              {current?.lat && current?.lng && (
                <Marker position={[current.lat, current.lng]} icon={destinationIcon}>
                  <Popup className="custom-popup" minWidth={300}>
                    <div style={{ 
                        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif'
                    }}>
                        <div style={{ 
                            fontWeight: '700', 
                            marginBottom: 16, 
                            color: '#ff4757',
                            fontSize: 18,
                            textAlign: 'center'
                        }}>
                            🎯 Final Destination
                        </div>
                        
                        <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
                            <div style={{ padding: '10px 14px', background: '#fff5f5', borderRadius: 8, border: '1px solid #ffcdd2' }}>
                                <strong style={{ color: '#d63031' }}>Status:</strong> 
                                <span style={{ color: '#e17055', fontWeight: '600', marginLeft: 8 }}>{awaitingTime}</span>
                            </div>
                            
                            <div style={{ padding: '10px 14px', background: '#e0f2fe', borderRadius: 8, border: '1px solid #b3e5fc' }}>
                                <strong style={{ color: '#0277bd' }}>Arrived:</strong> 
                                <span style={{ marginLeft: 8, color: '#0288d1' }}>{lastUpdate}</span>
                            </div>
                            
                            <div style={{ padding: '10px 14px', background: '#dcfce7', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                                <strong style={{ color: '#166534' }}>GPS Points:</strong> 
                                <span style={{ color: '#15803d', fontWeight: '600', marginLeft: 8 }}>{completeTrack.length}</span>
                            </div>
                        </div>

                        <div style={{ padding: '10px', background: '#f8fafc', borderRadius: 8, fontFamily: 'monospace', border: '1px solid #e2e8f0' }}>
                            <span style={{ color: '#0ea5e9', fontWeight: '600', fontSize: 12 }}>
                            {current.lat?.toFixed(6)}, {current.lng?.toFixed(6)}
                            </span>
                        </div>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
        </div>

        <style>{`
          .leaflet-container {
            font-family: inherit;
            z-index: 1;
          }
          .custom-popup .leaflet-popup-content-wrapper {
            background: linear-gradient(145deg, #ffffff 0%, #f8fafb 100%);
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            border: 2px solid #ff4757;
          }
          .custom-popup .leaflet-popup-tip {
            background: #ff4757;
          }
        `}</style>
      </Card>
    </div>
  );
};

export default DashboardMap;
