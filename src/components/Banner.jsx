import React from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";

const Banner = ({
  backgroundImage,
  title,
  description,
  buttonText,
  buttonLink,
}) => {
  return (
    <motion.div
      className="banner"
      style={{ backgroundImage: `url(${backgroundImage})` }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <div className="content">
        <h1>{title}</h1>
        <div className="divider"></div>
        <p>{description}</p>
        {buttonLink && (
          <NavLink to={buttonLink}>
            <button className="btn-primary">{buttonText}</button>
          </NavLink>
        )}
      </div>
    </motion.div>
  );
};

export default Banner;
