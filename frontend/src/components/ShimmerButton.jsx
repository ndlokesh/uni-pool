import React from 'react';
import { motion } from 'framer-motion';

const ShimmerButton = ({ children, onClick, className = "", colorClass = "from-indigo-500 via-purple-500 to-indigo-500" }) => {
    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            className={`relative inline-flex overflow-hidden rounded-2xl p-[2px] focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-50 ${className}`}
            onClick={onClick}
        >
            <span className={`absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2E8F0_0%,#312E81_50%,#E2E8F0_100%)]`} />
            <span className={`inline-flex h-full w-full cursor-pointer items-center justify-center rounded-2xl bg-white px-8 py-4 text-base font-bold text-slate-900 backdrop-blur-3xl transition-all hover:bg-slate-50 gap-2`}>
                {children}
            </span>
        </motion.button>
    );
};

export default ShimmerButton;
