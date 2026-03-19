import React, { useState, useEffect } from "react";
import { Card, Col, Row, Typography, Tooltip as AntdTooltip } from "antd";
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
import { EnvironmentOutlined, LineChartOutlined } from "@ant-design/icons";
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
const deviceIcon = new L.divIcon({
  className: "custom-device-icon",
  html: `<div style="
    background: #1890ff;
    border: 3px solid white;
    box-shadow: 0 4px 10px rgba(24, 144, 255, 0.4);
    height: 24px;
    width: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  "><div style="background: white; width: 8px; height: 8px; border-radius: 50%;"></div></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

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
    <Card className="map-card" style={{ height: '100%' }}>
      <Title level={4} className="map-title">
        <EnvironmentOutlined style={{ marginRight: "8px" }} />
        Device Location
      </Title>
      <div style={{ height: "300px", width: "100%", position: "relative" }}>
        <MapContainer
          center={deviceLocation.center}
          zoom={deviceLocation.zoom}
          style={{ height: '100%', width: '100%', borderRadius: '12px', zIndex: 1 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <MapController center={deviceLocation.center} zoom={deviceLocation.zoom} />
          {deviceInfo && (
            <Marker position={deviceLocation.center} icon={deviceIcon}>
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
