import React from "react";
import { motion } from "framer-motion";

const StatsCard = ({ icon, label, value, color }) => {
  return (
    <motion.div
      className="stat-card"
      whileHover={{ scale: 1.05 }}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="stat-icon" style={{ backgroundColor: color }}>
        {icon}
      </div>
      <h3 className="stat-value">{value.toLocaleString()}</h3>
      <p className="stat-label">{label}</p>
    </motion.div>
  );
};

export default StatsCard;
