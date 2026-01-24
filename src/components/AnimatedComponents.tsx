import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { animations } from '../lib/animations';

interface AnimatedPageProps {
    children: React.ReactNode;
    className?: string;
}

export const AnimatedPage: React.FC<AnimatedPageProps> = ({ children, className = '' }) => {
    return (
        <motion.div
            initial={animations.pageTransition.initial}
            animate={animations.pageTransition.animate}
            exit={animations.pageTransition.exit}
            transition={animations.pageTransition.transition}
            className={className}
        >
            {children}
        </motion.div>
    );
};

interface AnimatedCardProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({ children, className = '', delay = 0 }) => {
    return (
        <motion.div
            initial={animations.fadeInUp.initial}
            animate={animations.fadeInUp.animate}
            transition={{ ...animations.fadeInUp.transition, delay }}
            whileHover={animations.cardHover.hover}
            className={className}
        >
            {children}
        </motion.div>
    );
};

interface AnimatedButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
    children,
    onClick,
    className = '',
    type = 'button',
    disabled = false
}) => {
    return (
        <motion.button
            type={type}
            onClick={onClick}
            disabled={disabled}
            whileTap={!disabled ? animations.buttonTap : undefined}
            whileHover={!disabled ? { scale: 1.02 } : undefined}
            className={className}
        >
            {children}
        </motion.button>
    );
};

interface StaggerContainerProps {
    children: React.ReactNode;
    className?: string;
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({ children, className = '' }) => {
    return (
        <motion.div
            initial="initial"
            animate="animate"
            variants={animations.staggerContainer}
            className={className}
        >
            {children}
        </motion.div>
    );
};

interface StaggerItemProps {
    children: React.ReactNode;
    className?: string;
}

export const StaggerItem: React.FC<StaggerItemProps> = ({ children, className = '' }) => {
    return (
        <motion.div
            variants={animations.fadeInUp}
            className={className}
        >
            {children}
        </motion.div>
    );
};
