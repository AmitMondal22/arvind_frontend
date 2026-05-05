import React, { useState, useEffect } from "react";
import { Card, Col, Row, Typography, Tooltip as AntdTooltip, Button } from "antd";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { EnvironmentOutlined, LineChartOutlined, FullscreenOutlined, FullscreenExitOutlined } from "@ant-design/icons";
import { renderToStaticMarkup } from "react-dom/server";
import { MdSensors } from "react-icons/md";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import useDeviceApi from "../../api/useDeviceApi";
import { useParams } from "react-router-dom";

const { Title } = Typography;

// Fix for default Leaflet markers in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom div icon for Device Location
function createDeviceIcon(isOnline) {
  const pulseClass = isOnline ? 'marker-pulse-online' : 'marker-pulse-offline';

  const svgMarkup = renderToStaticMarkup(
    <div style={{ position: 'relative', width: 48, height: 48 }}>
      <div className={pulseClass} style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        borderRadius: '50%',
      }} />
      <div style={{
        position: 'relative', zIndex: 2,
        width: 48, height: 48, borderRadius: '50%',
        background: isOnline
          ? 'linear-gradient(145deg, #22c55e, #16a34a)'
          : 'linear-gradient(145deg, #ef4444, #dc2626)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isOnline
          ? '0 4px 14px rgba(34,197,94,0.45), inset 0 1px 2px rgba(255,255,255,0.3)'
          : '0 4px 14px rgba(239,68,68,0.45), inset 0 1px 2px rgba(255,255,255,0.3)',
        border: '3px solid rgba(255,255,255,0.85)',
      }}>
        <MdSensors style={{ fontSize: 24, color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }} />
      </div>
    </div>
  );

  return L.divIcon({
    html: svgMarkup,
    className: 'custom-device-marker',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -28],
  });
}

const mapStyles = `
@keyframes pulseOnline {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 15px rgba(34, 197, 94, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}

@keyframes pulseOffline {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

.marker-pulse-online {
  animation: pulseOnline 2s infinite;
}

.marker-pulse-offline {
  animation: pulseOffline 2s infinite;
}
`;

// Map controller to pan map bounds
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);

  return null;
}

const ChartMapData = () => {
  const { apiDeviceInfo, last1000data } = useDeviceApi();
  const { deviceId, device } = useParams();

  const [chartData, setChartData] = useState([]);
  const [deviceLocation, setDeviceLocation] = useState({
    center: [28.6139, 77.209], // Default LatLng Tuple
    zoom: 15,
  });

  const [deviceInfo, setDeviceInfo] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 400); 
  };

  useEffect(() => {
    const fetchDeviceInfo = async () => {
      try {
        let reqData = {
          client_id: 1,
          device_id: Number(deviceId),
          device: device,
        };

        const response = await apiDeviceInfo(reqData);
        const response2 = await last1000data(reqData);

        const info = response.data.data;

        // Fix chart data keys
        const chartFormattedData = response2.data.map(item => ({
          time: item.time,
          flowRate: item.flow_rate1,   // ✅ renamed for chart
          pressure: item.pressure,     // ✅ renamed for chart
        }));

        setChartData(chartFormattedData);

        if (info?.lat && info?.lon) {
          setDeviceLocation({
            center: [parseFloat(info.lat), parseFloat(info.lon)],
            zoom: 15,
          });
        }
        setDeviceInfo(info);
      } catch (error) {
        console.error("Failed to fetch device info:", error);
      }
    };

    if (deviceId) fetchDeviceInfo();
  }, [deviceId, device]);


  return (
    <Card className="map-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }} bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Title level={4} className="map-title" style={{ margin: 0 }}>
          <EnvironmentOutlined style={{ marginRight: "8px" }} />
          Device Location
        </Title>
        <AntdTooltip title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
          <Button
            type="text"
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={toggleFullscreen}
          />
        </AntdTooltip>
      </div>
      <div style={{ 
        flex: 1, 
        width: isFullscreen ? "100vw" : "100%", 
        position: isFullscreen ? "fixed" : "relative", 
        top: isFullscreen ? 0 : "auto", 
        left: isFullscreen ? 0 : "auto",
        right: isFullscreen ? 0 : "auto",
        bottom: isFullscreen ? 0 : "auto", 
        height: isFullscreen ? "100vh" : "100%", 
        zIndex: isFullscreen ? 9999 : 1,
        minHeight: "300px",
        margin: 0,
        padding: 0
      }}>
        {isFullscreen && (
          <AntdTooltip title="Exit Fullscreen">
            <Button
              type="primary"
              icon={<FullscreenExitOutlined />}
              onClick={toggleFullscreen}
              style={{ position: 'absolute', top: 16, right: 16, zIndex: 10000 }}
            />
          </AntdTooltip>
        )}
        <MapContainer
          center={deviceLocation.center}
          zoom={deviceLocation.zoom}
          style={{ height: '100%', width: '100%', borderRadius: isFullscreen ? '0' : '12px', zIndex: 1 }}
        >
          <TileLayer
            attribution='&copy; Google Maps'
            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
          />
          <style>{mapStyles}</style>
          <MapController center={deviceLocation.center} zoom={deviceLocation.zoom} />
          {deviceInfo && (
            <Marker position={deviceLocation.center} icon={createDeviceIcon(deviceInfo.device_status?.toLowerCase() === 'online')}>
              <Popup>
                <div style={{ fontFamily: "inherit", padding: "4px" }}>
                  <div style={{ marginBottom: "4px" }}><b>Name:</b> {deviceInfo.device_name}</div>
                  <div style={{ marginBottom: "4px" }}><b>Model:</b> {deviceInfo.model}</div>
                  <div><b>IMEI:</b> {deviceInfo.imei_no}</div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </Card>
  );
};

export default ChartMapData;
