import React from "react";
import PropTypes from "prop-types";

const FeatureCard = ({ icon, title, description, color }) => {
    return (
        <div className={`feature-card feature-card--${color}`}>
            <div className="feature-card__icon">{icon}</div>
            <div className="feature-card__content">
                <h3 className="feature-card__title">{title}</h3>
                <p className="feature-card__description">{description}</p>
            </div>
        </div>
    );
};

FeatureCard.propTypes = {
    icon: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    color: PropTypes.string,
};

export default FeatureCard;
