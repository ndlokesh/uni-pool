import { motion } from "framer-motion";

const FloatingShape = ({ color, size, top, left, right, bottom, delay }) => {
    return (
        <motion.div
            className={`absolute rounded-full opacity-30 blur-2xl filter mix-blend-multiply ${color}`}
            style={{
                width: size,
                height: size,
                top: top,
                left: left,
                right: right,
                bottom: bottom,
                zIndex: 0,
                pointerEvents: "none"
            }}
            animate={{
                y: [0, 50, 0],
                x: [0, 30, 0],
                rotate: [0, 360],
                scale: [1, 1.2, 1],
            }}
            transition={{
                duration: 20,
                repeat: Infinity,
                delay: delay,
                ease: "linear",
            }}
        />
    );
};

export default FloatingShape;
