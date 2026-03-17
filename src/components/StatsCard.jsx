// src/components/StatsCard.js
import React from 'react';

const StatsCard = ({ title, value, color }) => {
  return (
    <div className="stats-card" style={{ backgroundColor: color }}>
      <h4>{title}</h4>
      <p>{value}</p>
    </div>
  );
};

export default StatsCard;