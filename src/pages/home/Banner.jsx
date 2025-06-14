import React from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";

const Banner = ({ backgroundImage, title, description, buttonText, buttonLink }) => {
    return (
        <motion.div
            className="banner-modern"
            style={{ backgroundImage: `url(${backgroundImage})` }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
        >
            {/* Dynamic overlay with animated gradient */}
            <div className="banner-overlay">
                <div className="overlay-pattern"></div>
                <div className="overlay-waves"></div>
            </div>

            {/* Enhanced floating particles effect */}
            <div className="banner-particles">
                {[...Array(30)].map((_, i) => (
                    <motion.div
                        key={i}
                        className={`particle particle-${i % 6}`}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                            opacity: [0, 1, 0],
                            scale: [0, 1, 0],
                            y: [-20, -200, -400],
                            x: Math.sin(i) * 100,
                        }}
                        transition={{
                            duration: 8 + Math.random() * 4,
                            repeat: Infinity,
                            delay: Math.random() * 5,
                        }}
                    ></motion.div>
                ))}
            </div>

            {/* Decorative geometric elements */}
            <div className="banner-decoration">
                <motion.div
                    className="deco-circle deco-circle-1"
                    animate={{
                        rotate: 360,
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                        scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                    }}
                ></motion.div>
                <motion.div
                    className="deco-circle deco-circle-2"
                    animate={{
                        rotate: -360,
                        scale: [1, 0.8, 1],
                    }}
                    transition={{
                        rotate: { duration: 25, repeat: Infinity, ease: "linear" },
                        scale: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                    }}
                ></motion.div>
            </div>

            {/* Main content container with glass effect */}
            <div className="banner-content">
                <motion.div
                    className="content-glass-card"
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                >
                    <motion.div
                        className="title-container"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                    >
                        <motion.h1
                            className="banner-title"
                            data-text={title}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{
                                scale: 1.05,
                                textShadow: [
                                    "3px 3px 6px rgba(0, 0, 0, 0.6), 0 0 30px rgba(77, 136, 255, 0.8)",
                                    "4px 4px 8px rgba(0, 0, 0, 0.8), 0 0 40px rgba(77, 136, 255, 1)",
                                    "3px 3px 6px rgba(0, 0, 0, 0.6), 0 0 30px rgba(77, 136, 255, 0.8)",
                                ],
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 10,
                                textShadow: { duration: 0.6, ease: "easeInOut" },
                            }}
                        >
                            {title}
                        </motion.h1>

                        <motion.div
                            className="title-accent my-4"
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: "100%", opacity: 1 }}
                            transition={{ delay: 1, duration: 1.2, ease: "easeOut" }}
                        ></motion.div>
                    </motion.div>

                    <motion.div
                        className="description-container"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.2, duration: 0.6 }}
                    >
                        <p className="banner-description">{description}</p>
                    </motion.div>

                    {buttonLink && (
                        <motion.div
                            className="button-container"
                            initial={{ opacity: 0, y: 30, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ delay: 1.6, duration: 0.8 }}
                        >
                            <NavLink to={buttonLink} className="banner-cta">
                                <motion.button
                                    className="btn-primary-modern"
                                    whileHover={{
                                        scale: 1.05,
                                        boxShadow: "0 20px 40px rgba(77, 136, 255, 0.4)",
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                >
                                    <span className="btn-text">{buttonText}</span>
                                    <motion.div
                                        className="btn-icon"
                                        whileHover={{ x: 5 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                    >
                                        <svg
                                            className="btn-arrow"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M17 8l4 4m0 0l-4 4m4-4H3"
                                            />
                                        </svg>
                                    </motion.div>
                                    <div className="btn-ripple"></div>
                                </motion.button>
                            </NavLink>
                        </motion.div>
                    )}
                </motion.div>
            </div>

            {/* Floating info bubbles */}
            <div className="banner-info-bubbles">
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        className={`info-bubble bubble-${i}`}
                        animate={{
                            y: [0, -20, 0],
                            opacity: [0.3, 0.8, 0.3],
                        }}
                        transition={{
                            duration: 3 + Math.random() * 2,
                            repeat: Infinity,
                            delay: Math.random() * 3,
                        }}
                    >
                        <div className="bubble-content"></div>
                    </motion.div>
                ))}
            </div>

            {/* Scroll indicator */}
            <motion.div
                className="scroll-indicator"
                animate={{
                    y: [0, 10, 0],
                    opacity: [1, 0.5, 1],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            ></motion.div>
        </motion.div>
    );
};

export default Banner;
