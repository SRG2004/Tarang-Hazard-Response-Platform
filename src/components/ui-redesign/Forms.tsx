import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedInputProps {
    label: string;
    type?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    error?: string;
    required?: boolean;
    icon?: React.ReactNode;
}

export const AnimatedInput: React.FC<AnimatedInputProps> = ({
    label,
    type = 'text',
    value,
    onChange,
    placeholder,
    error,
    required,
    icon
}) => {
    return (
        <motion.div
            className="space-y-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
        >
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {icon}
                    </div>
                )}
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`
            w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-3 
            bg-white dark:bg-slate-800 border rounded-lg text-gray-900 dark:text-white placeholder-gray-400
            focus:ring-2 focus:ring-indigo-500 focus:border-transparent 
            transition-all
            ${error ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}
          `}
                />
            </div>
            {error && (
                <motion.p
                    className="text-sm text-red-500"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {error}
                </motion.p>
            )}
        </motion.div>
    );
};

interface AnimatedSelectProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    error?: string;
    required?: boolean;
}

export const AnimatedSelect: React.FC<AnimatedSelectProps> = ({
    label,
    value,
    onChange,
    options,
    placeholder,
    error,
    required
}) => {
    return (
        <motion.div
            className="space-y-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
        >
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`
          w-full px-4 py-3 
          bg-white dark:bg-slate-800 border rounded-lg text-gray-900 dark:text-white cursor-pointer
          focus:ring-2 focus:ring-indigo-500 focus:border-transparent 
          transition-all appearance-none
          ${error ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}
        `}
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%20viewBox%3D%220%200%20292.4%20292.4%22%3E%3Cpath%20fill%3D%22%23111827%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '0.65em auto' }}
            >
                {placeholder && <option value="" className="text-gray-400 bg-white">{placeholder}</option>}
                {options.map((option) => (
                    <option key={option.value} value={option.value} className="text-gray-900 bg-white">
                        {option.label}
                    </option>
                ))}
            </select>
            {error && (
                <motion.p
                    className="text-sm text-red-500"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {error}
                </motion.p>
            )}
        </motion.div>
    );
};

interface AnimatedTextareaProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
    error?: string;
    required?: boolean;
}

export const AnimatedTextarea: React.FC<AnimatedTextareaProps> = ({
    label,
    value,
    onChange,
    placeholder,
    rows = 4,
    error,
    required
}) => {
    return (
        <motion.div
            className="space-y-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
        >
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className={`
          w-full px-4 py-3 
          bg-white dark:bg-slate-800 border rounded-lg text-gray-900 dark:text-white placeholder-gray-400
          focus:ring-2 focus:ring-indigo-500 focus:border-transparent 
          transition-all resize-none
          ${error ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}
        `}
            />
            {error && (
                <motion.p
                    className="text-sm text-red-500"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {error}
                </motion.p>
            )}
        </motion.div>
    );
};

interface FormSectionProps {
    title: string;
    description?: string;
    children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({ title, description, children }) => {
    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                {description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>}
            </div>
            <div className="space-y-4">
                {children}
            </div>
        </div>
    );
};

interface ActionButtonsProps {
    onCancel?: () => void;
    onSubmit: () => void;
    submitLabel?: string;
    cancelLabel?: string;
    isSubmitting?: boolean;
    disabled?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
    onCancel,
    onSubmit,
    submitLabel = 'Submit',
    cancelLabel = 'Cancel',
    isSubmitting = false,
    disabled = false
}) => {
    return (
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            {onCancel && (
                <motion.button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-3 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    {cancelLabel}
                </motion.button>
            )}
            <motion.button
                type="button"
                onClick={onSubmit}
                disabled={disabled || isSubmitting}
                className={`
          px-8 py-3 rounded-lg font-medium transition-all
          ${disabled || isSubmitting
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl'
                    }
        `}
                whileHover={!disabled && !isSubmitting ? { scale: 1.02 } : undefined}
                whileTap={!disabled && !isSubmitting ? { scale: 0.98 } : undefined}
            >
                {isSubmitting ? (
                    <span className="flex items-center gap-2">
                        <motion.div
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        Processing...
                    </span>
                ) : (
                    submitLabel
                )}
            </motion.button>
        </div>
    );
};
