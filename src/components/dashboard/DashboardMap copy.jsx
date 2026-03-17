import React, { useRef, useEffect, useMemo, useState } from 'react';
import { GoogleMap, useJsApiLoader, InfoWindow } from '@react-google-maps/api';
import { Card, Spin, Button, Tooltip } from 'antd';
import { 
  FullscreenOutlined, 
  FullscreenExitOutlined,
  CarOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  AimOutlined
} from '@ant-design/icons';

const MAPS_API_KEY = 'AIzaSyCd0O2zOkbLBLDn10Ikm32BO5XTQRW5BBc';
const ROADS_API_KEY = 'AIzaSyCd0O2zOkbLBLDn10Ikm32BO5XTQRW5BBc';

// Enhanced premium car icon with glow effect
const createEndPointCarIcon = (scale = 4.5, color = '#ff4757', glowColor = '#ff6b7a') => ({
  path: 'M12,2 L20,2 C21.1,2 22,2.9 22,4 L22,6 L26,6 C27.1,6 28,6.9 28,8 L28,12 C28,13.1 27.1,14 26,14 L24,14 C24,15.7 22.7,17 21,17 C19.3,17 18,15.7 18,14 L10,14 C10,15.7 8.7,17 7,17 C5.3,17 4,15.7 4,14 L2,14 C0.9,14 0,13.1 0,12 L0,8 C0,6.9 0.9,6 2,6 L6,6 L6,4 C6,2.9 6.9,2 8,2 L12,2 Z M7,11 C7.6,11 8,11.4 8,12 C8,12.6 7.6,13 7,13 C6.4,13 6,12.6 6,12 C6,11.4 6.4,11 7,11 Z M21,11 C21.6,11 22,11.4 22,12 C22,12.6 21.6,13 21,13 C20.4,13 20,12.6 20,12 C20,11.4 20.4,11 21,11 Z M8,4 L20,4 L20,6 L8,6 L8,4 Z',
  fillColor: color,
  fillOpacity: 1,
  strokeWeight: 6,
  strokeColor: '#ffffff',
  strokeOpacity: 1,
  scale: scale,
  anchor: { x: 14, y: 9.5 },
  rotation: 0
});

// Premium start point icon with pulsing effect
const createStartPointIcon = (scale = 1.2, color = '#2ed573') => ({
  path: window.google?.maps?.SymbolPath?.CIRCLE,
  fillColor: color,
  fillOpacity: 1,
  strokeColor: '#ffffff',
  strokeWeight: 5,
  scale: scale * 16,
  anchor: { x: 0, y: 0 }
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

async function snapBatch(points, roadsKey) {
  const pathParam = points.map(p => `${p.lat},${p.lng}`).join('|');
  const url = `https://roads.googleapis.com/v1/snapToRoads?interpolate=true&path=${encodeURIComponent(pathParam)}&key=${encodeURIComponent(roadsKey)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SnapToRoads failed: ${res.status}`);
  const data = await res.json();
  const snapped = (data.snappedPoints || []).map(sp => ({
    lat: sp.location.latitude,
    lng: sp.location.longitude
  }));
  return snapped;
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function snapFullTrack(points, roadsKey) {
  if (!points || points.length === 0) return [];
  
  const batches = chunk(points, 100);
  const snappedBatches = [];
  
  for (const b of batches) {
    const snapped = await snapBatch(b, roadsKey);
    snappedBatches.push(snapped);
  }
  
  const flat = snappedBatches.flat();
  const dedup = [];
  for (const p of flat) {
    const last = dedup[dedup.length - 1];
    if (!last || last.lat !== p.lat || last.lng !== p.lng) dedup.push(p);
  }
  
  const originalLast = points[points.length - 1];
  const snappedLast = dedup[dedup.length - 1];
  
  if (originalLast && snappedLast && 
      (Math.abs(originalLast.lat - snappedLast.lat) > 0.0001 || 
       Math.abs(originalLast.lng - snappedLast.lng) > 0.0001)) {
    dedup.push(originalLast);
  }
  
  return dedup;
}

const DashboardMap = ({ locationData = [] }) => {
  const mapRef = useRef(null);
  const roadEndMarkerRef = useRef(null);
  const startMarkerRef = useRef(null);
  const polylineRef = useRef(null);

  const [center, setCenter] = useState({ lat: 22.5726, lng: 88.3639 });
  const [awaitingTime, setAwaitingTime] = useState('N/A');
  const [lastUpdate, setLastUpdate] = useState('N/A');
  const [snappedPath, setSnappedPath] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const { rawTrack, current, startPoint, completeTrack } = useTrack(locationData);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: MAPS_API_KEY
  });

  // Enhanced map styles with premium look
  const premiumMapStyles = [
    {
      featureType: 'all',
      elementType: 'geometry',
      stylers: [{ color: '#f8fafb' }]
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ 
        color: '#74b9ff',
        lightness: 5
      }]
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ 
        color: '#ffffff',
        lightness: 10
      }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ 
        color: '#f1f3f4',
        lightness: 8
      }]
    },
    {
      featureType: 'road.arterial',
      elementType: 'geometry',
      stylers: [{ 
        color: '#ffffff',
        lightness: 10
      }]
    },
    {
      featureType: 'road.local',
      elementType: 'geometry',
      stylers: [{ 
        color: '#ffffff',
        lightness: 12
      }]
    },
    {
      featureType: 'road',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#5f6368' }]
    },
    {
      featureType: 'road',
      elementType: 'labels.text.stroke',
      stylers: [{ 
        color: '#ffffff',
        weight: 3
      }]
    },
    {
      featureType: 'landscape',
      elementType: 'geometry',
      stylers: [{ 
        color: '#f5f7fa',
        lightness: 2
      }]
    },
    {
      featureType: 'poi',
      elementType: 'geometry',
      stylers: [{ 
        color: '#e8f0fe',
        lightness: 5
      }]
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: '#e8f5e8' }]
    },
    {
      featureType: 'transit',
      elementType: 'geometry',
      stylers: [{ 
        color: '#fff3e0',
        lightness: 8
      }]
    }
  ];

  useEffect(() => {
    let abort = false;
    (async () => {
      if (!completeTrack.length) {
        setSnappedPath([]);
        return;
      }
      try {
        const coords = completeTrack.map(p => ({ lat: p.lat, lng: p.lng }));
        const snapped = await snapFullTrack(coords, ROADS_API_KEY);
        if (!abort) setSnappedPath(snapped);
      } catch (e) {
        console.warn('Road snapping failed, using complete raw GPS data:', e);
        if (!abort) setSnappedPath(completeTrack.map(p => ({ lat: p.lat, lng: p.lng })));
      }
    })();
    return () => { abort = true; };
  }, [completeTrack]);

  // Enhanced polyline with premium gradient and smooth arrows
  const ensureOrUpdatePolyline = (path) => {
    if (!window.google || !mapRef.current || path.length < 2) return;
    
    const premiumIcons = [
      {
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          strokeColor: '#0984e3',
          fillColor: '#74b9ff',
          fillOpacity: 0.9,
          strokeWeight: 2,
          scale: 7
        },
        offset: '0%',
        repeat: '25px'
      },
      {
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          strokeColor: '#2d3436',
          fillColor: '#636e72',
          fillOpacity: 0.6,
          strokeWeight: 1,
          scale: 4
        },
        offset: '12px',
        repeat: '25px'
      }
    ];

    if (!polylineRef.current) {
      polylineRef.current = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#0984e3',
        strokeOpacity: 1,
        strokeWeight: 10,
        icons: premiumIcons,
        map: mapRef.current,
        zIndex: 1000
      });
    } else {
      polylineRef.current.setPath(path);
      polylineRef.current.setOptions({ 
        icons: premiumIcons,
        strokeColor: '#0984e3',
        strokeOpacity: 1,
        strokeWeight: 10
      });
      if (polylineRef.current.getMap() == null) {
        polylineRef.current.setMap(mapRef.current);
      }
    }
  };

  // Enhanced end marker with glow effect
  const ensureOrUpdateRoadEndMarker = (pos, title) => {
    if (!window.google || !mapRef.current) return;
    
    if (!pos || typeof pos.lat !== 'number' || typeof pos.lng !== 'number' ||
        pos.lat === 0 || pos.lng === 0 || isNaN(pos.lat) || isNaN(pos.lng)) {
      return;
    }
    
    if (roadEndMarkerRef.current) {
      roadEndMarkerRef.current.setMap(null);
      roadEndMarkerRef.current = null;
    }
    
    roadEndMarkerRef.current = new window.google.maps.Marker({
      position: { 
        lat: parseFloat(pos.lat.toFixed(6)), 
        lng: parseFloat(pos.lng.toFixed(6)) 
      },
      map: mapRef.current,
      icon: createEndPointCarIcon(5.0, '#ff4757'),
      title: title || 'Final Destination',
      zIndex: 15000,
      optimized: false,
      animation: window.google.maps.Animation.BOUNCE,
      clickable: true,
      visible: true
    });
    
    // Stop animation after 2 seconds for smooth effect
    setTimeout(() => {
      if (roadEndMarkerRef.current) {
        roadEndMarkerRef.current.setAnimation(null);
      }
    }, 2000);
  };

  // Enhanced start marker with pulsing animation
  const ensureOrUpdateStartMarker = (pos) => {
    if (!window.google || !mapRef.current || !pos) return;
    
    if (!startMarkerRef.current) {
      startMarkerRef.current = new window.google.maps.Marker({
        position: pos,
        map: mapRef.current,
        icon: createStartPointIcon(1.3, '#00b894'),
        title: 'Journey Start Point',
        zIndex: 5000,
        animation: window.google.maps.Animation.DROP
      });
    } else {
      startMarkerRef.current.setPosition(pos);
      if (startMarkerRef.current.getMap() == null) {
        startMarkerRef.current.setMap(mapRef.current);
      }
    }
  };

  // Fullscreen toggle with smooth transition
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    if (!isLoaded || !window.google) return;

    if (current?.lat && current?.lng) {
      const finalPos = { 
        lat: Number(current.lat), 
        lng: Number(current.lng) 
      };
      
      setCenter(finalPos);
      if (mapRef.current) {
        mapRef.current.panTo(finalPos);
        mapRef.current.setZoom(18);
      }

      const updatedIso = current.raw.updated_at || current.raw.created_at;
      setAwaitingTime(awaitingLabel(updatedIso));
      const displayTimestamp = current.raw.date && current.raw.time
        ? `${current.raw.date} ${current.raw.time}`
        : updatedIso || 'N/A';
      setLastUpdate(displayTimestamp);

      ensureOrUpdateRoadEndMarker(finalPos, `Final Stop - ${current?.raw?.device_number || 'Vehicle'}`);
      
    } else {
      setAwaitingTime('N/A');
      setLastUpdate('N/A');
      if (roadEndMarkerRef.current) {
        roadEndMarkerRef.current.setMap(null);
        roadEndMarkerRef.current = null;
      }
    }

    if (startPoint?.lat && startPoint?.lng && completeTrack.length > 2) {
      const startPos = { lat: Number(startPoint.lat), lng: Number(startPoint.lng) };
      ensureOrUpdateStartMarker(startPos);
    }

    if (snappedPath.length > 1) {
      ensureOrUpdatePolyline(snappedPath);
    }
  }, [isLoaded, current, startPoint, snappedPath, completeTrack.length]);

  useEffect(() => {
    return () => {
      [roadEndMarkerRef, startMarkerRef, polylineRef].forEach(ref => {
        if (ref.current) {
          ref.current.setMap(null);
          ref.current = null;
        }
      });
    };
  }, []);

  const containerStyle = {
    position: isFullscreen ? 'fixed' : 'relative',
    top: isFullscreen ? 0 : 'auto',
    left: isFullscreen ? 0 : 'auto',
    right: isFullscreen ? 0 : 'auto',
    bottom: isFullscreen ? 0 : 'auto',
    width: isFullscreen ? '100vw' : '100%',
    height: isFullscreen ? '100vh' : 'auto',
    zIndex: isFullscreen ? 9999 : 'auto',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    background: isFullscreen ? '#000' : 'transparent'
  };

  const mapContainerStyle = {
    width: '100%',
    height: isFullscreen ? '100vh' : '600px',
    borderRadius: isFullscreen ? 0 : '20px',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden'
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
        {/* Fullscreen Toggle Button */}
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

        {/* Status Panel for Fullscreen */}
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

        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={18}
            onLoad={(map) => {
              mapRef.current = map;
              map.setOptions({ 
                styles: premiumMapStyles,
                maxZoom: 22,
                minZoom: 10,
                restriction: {
                  latLngBounds: {
                    north: 28.0,
                    south: 20.0,
                    east: 93.0,
                    west: 85.0
                  }
                }
              });
              setMapLoaded(true);
            }}
            options={{
              disableDefaultUI: !isFullscreen,
              zoomControl: true,
              streetViewControl: isFullscreen,
              fullscreenControl: false,
              mapTypeControl: isFullscreen,
              gestureHandling: 'cooperative',
              clickableIcons: false
            }}
          >
            {!isFullscreen && current?.lat && current?.lng && (
              <InfoWindow
                position={{ lat: current.lat, lng: current.lng }}
                options={{ 
                  pixelOffset: new window.google.maps.Size(0, -140),
                  maxWidth: 400
                }}
              >
                <div style={{ 
                  background: 'linear-gradient(145deg, #ffffff 0%, #f8fafb 100%)', 
                  padding: '28px 32px',
                  borderRadius: 20, 
                  fontSize: 15,
                  color: '#2d3436',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                  border: '3px solid #ff4757',
                  minWidth: '360px',
                  textAlign: 'center',
                  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif'
                }}>
                  <div style={{ 
                    fontWeight: '700', 
                    marginBottom: 20, 
                    color: '#ff4757',
                    fontSize: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12
                  }}>
                    🎯 Final Destination
                  </div>
                  
                  <div style={{ 
                    display: 'grid', 
                    gap: 14,
                    marginBottom: 20 
                  }}>
                    <div style={{ 
                      padding: '14px 18px', 
                      background: 'linear-gradient(135deg, #fff5f5 0%, #ffe5e5 100%)', 
                      borderRadius: 12,
                      border: '1px solid #ffcdd2'
                    }}>
                      <strong style={{ color: '#d63031' }}>Status:</strong> 
                      <span style={{ color: '#e17055', fontWeight: '600', marginLeft: 8 }}>{awaitingTime}</span>
                    </div>
                    
                    <div style={{ 
                      padding: '14px 18px', 
                      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', 
                      borderRadius: 12,
                      border: '1px solid #b3e5fc'
                    }}>
                      <strong style={{ color: '#0277bd' }}>Arrived:</strong> 
                      <span style={{ marginLeft: 8, color: '#0288d1' }}>{lastUpdate}</span>
                    </div>
                    
                    <div style={{ 
                      padding: '14px 18px', 
                      background: 'linear-gradient(135deg, #f0fff4 0%, #dcfce7 100%)', 
                      borderRadius: 12,
                      border: '1px solid #bbf7d0'
                    }}>
                      <strong style={{ color: '#166534' }}>GPS Points:</strong> 
                      <span style={{ color: '#15803d', fontWeight: '600', marginLeft: 8 }}>{completeTrack.length}</span>
                    </div>
                  </div>

                  <div style={{ 
                    fontSize: 13, 
                    color: '#636e72',
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                    borderRadius: 12,
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                    border: '1px solid #e2e8f0',
                    marginBottom: 20
                  }}>
                    <strong style={{ color: '#475569' }}>Coordinates:</strong><br/>
                    <span style={{ color: '#0ea5e9', fontWeight: '600', fontSize: 14 }}>
                      {current.lat?.toFixed(6)}, {current.lng?.toFixed(6)}
                    </span>
                  </div>

                  <div style={{ 
                    padding: '16px 24px',
                    background: 'linear-gradient(135deg, #ff4757 0%, #ff3742 100%)',
                    color: 'white',
                    borderRadius: 14,
                    fontWeight: '700',
                    fontSize: 16,
                    boxShadow: '0 8px 24px rgba(255, 71, 87, 0.3)',
                    border: 'none'
                  }}>
                    ✅ Route Completed Successfully
                  </div>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        ) : (
          <div style={{ 
            height: isFullscreen ? '100vh' : '600px', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            background: 'linear-gradient(145deg, #667eea 0%, #764ba2 100%)', 
            borderRadius: isFullscreen ? 0 : 20,
            color: 'white'
          }}>
            <Spin size="large" style={{ color: 'white' }} />
            <p style={{ 
              marginTop: 24, 
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: 16,
              fontWeight: '500'
            }}>
              Loading premium route tracking...
            </p>
            <div style={{
              marginTop: 12,
              fontSize: 14,
              color: 'rgba(255, 255, 255, 0.7)'
            }}>
              🗺️ Preparing beautiful maps experience
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default DashboardMap;
