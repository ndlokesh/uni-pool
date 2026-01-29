import React from "react";

const GridBackground = ({ children, className = "" }) => {
    return (
        <div className={`relative w-full min-h-screen bg-white ${className}`}>
            {/* Grid Pattern */}
            <div className="absolute inset-0 z-0 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                {/* Radial Fade Effect */}
                <div className="absolute inset-0 bg-white/50 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
            </div>

            {/* Floating Orbs (Subtle) */}
            <div className="absolute top-0 left-0 right-0 h-[500px] w-full bg-gradient-to-b from-indigo-50/50 to-transparent blur-3xl pointer-events-none"></div>

            {/* Content */}
            <div className="relative z-10">{children}</div>
        </div>
    );
};

export default GridBackground;
