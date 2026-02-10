import React from 'react';

const Logo = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" className={className}>
        {/* Hexagon Container */}
        <path d="M50 5 L93.3 30 V80 L50 95 L6.7 80 V30 Z" stroke="#2563EB" strokeWidth="4" fill="white" />

        {/* Stylized U (Left side) */}
        <path d="M25 35 V60 C25 70 30 75 40 75" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />

        {/* Stylized P (Right side) */}
        <path d="M60 75 V35 H70 C80 35 80 55 70 55 H60" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />

        {/* Connection Nodes (Tech feel) */}
        <circle cx="25" cy="35" r="3" fill="#2563EB" />
        <circle cx="40" cy="75" r="3" fill="#2563EB" />
        <circle cx="60" cy="35" r="3" fill="#2563EB" />
        <circle cx="60" cy="75" r="3" fill="#2563EB" />
        <circle cx="80" cy="45" r="3" fill="#2563EB" />

        {/* Connection Lines */}
        <line x1="25" y1="35" x2="40" y2="25" stroke="#60A5FA" strokeWidth="2" />
        <circle cx="40" cy="25" r="2" fill="#60A5FA" />

        <line x1="60" y1="35" x2="75" y2="25" stroke="#60A5FA" strokeWidth="2" />
        <circle cx="75" cy="25" r="2" fill="#60A5FA" />

        <line x1="40" y1="75" x2="60" y2="75" stroke="#60A5FA" strokeWidth="2" strokeDasharray="4 2" />
    </svg>
);

export default Logo;
