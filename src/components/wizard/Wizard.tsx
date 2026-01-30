import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { animations } from '../../lib/animations';

interface Step {
    id: number;
    title: string;
    description: string;
}

interface WizardProps {
    steps: Step[];
    currentStep: number;
    onStepChange?: (step: number) => void;
    children: React.ReactNode;
}

export const Wizard: React.FC<WizardProps> = ({ steps, currentStep, onStepChange, children }) => {
    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Progress Steps */}
            <div className="mb-8">
                <div className="flex items-center justify-between relative">
                    {/* Progress Line */}
                    <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-slate-700 -z-10">
                        <motion.div
                            className="h-full bg-indigo-600"
                            initial={{ width: '0%' }}
                            animate={{
                                width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`
                            }}
                            transition={{ duration: 0.4, ease: [0.4, 0.0, 0.2, 1] }}
                        />
                    </div>

                    {steps.map((step, index) => {
                        const stepNumber = index + 1;
                        const isCompleted = currentStep > stepNumber;
                        const isCurrent = currentStep === stepNumber;
                        const isUpcoming = currentStep < stepNumber;

                        return (
                            <div key={step.id} className="flex flex-col items-center relative">
                                {/* Step Circle */}
                                <motion.div
                                    className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                    transition-all duration-300 cursor-pointer
                    ${isCompleted ? 'bg-indigo-600 text-white cursor-pointer' : ''}
                    ${isCurrent ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900 cursor-default' : ''}
                    ${isUpcoming ? 'bg-white dark:bg-slate-800 text-gray-400 dark:text-gray-500 border-2 border-gray-300 dark:border-slate-600 cursor-not-allowed' : ''}
                  `}
                                    onClick={() => onStepChange?.(stepNumber)}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    animate={{
                                        scale: isCurrent ? [1, 1.05, 1] : 1
                                    }}
                                    transition={{
                                        scale: {
                                            repeat: isCurrent ? Infinity : 0,
                                            duration: 2,
                                            ease: "easeInOut"
                                        }
                                    }}
                                >
                                    {isCompleted ? (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <Check className="w-5 h-5" />
                                        </motion.div>
                                    ) : (
                                        stepNumber
                                    )}
                                </motion.div>

                                {/* Step Label */}
                                <motion.div
                                    className="absolute top-12 text-center w-24"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <p className={`
                    text-xs font-medium
                    ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}
                  `}>
                                        {step.title}
                                    </p>
                                </motion.div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Step Content */}
            <div className="mt-20">
                <AnimatePresence mode="wait">
                    {children}
                </AnimatePresence>
            </div>
        </div>
    );
};

interface WizardStepProps {
    children: React.ReactNode;
    title: string;
    description?: string;
}

export const WizardStep: React.FC<WizardStepProps> = ({ children, title, description }) => {
    return (
        <motion.div
            key={title}
            initial={animations.wizardStep.initial}
            animate={animations.wizardStep.animate}
            exit={animations.wizardStep.exit}
            transition={animations.wizardStep.transition}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8"
        >
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
                {description && (
                    <p className="text-gray-600 dark:text-gray-400">{description}</p>
                )}
            </div>
            {children}
        </motion.div>
    );
};

interface WizardNavigationProps {
    onBack?: () => void;
    onNext?: () => void;
    onSubmit?: () => void;
    isFirstStep?: boolean;
    isLastStep?: boolean;
    canProceed?: boolean;
    isSubmitting?: boolean;
}

export const WizardNavigation: React.FC<WizardNavigationProps> = ({
    onBack,
    onNext,
    onSubmit,
    isFirstStep = false,
    isLastStep = false,
    canProceed = true,
    isSubmitting = false
}) => {
    return (
        <div className="flex justify-between mt-8">
            {!isFirstStep && (
                <motion.button
                    onClick={onBack}
                    className="px-6 py-3 rounded-lg border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    ← Back
                </motion.button>
            )}

            <motion.button
                onClick={isLastStep ? onSubmit : onNext}
                disabled={!canProceed || isSubmitting}
                className={`
          ml-auto px-8 py-3 rounded-lg font-medium transition-all
          ${canProceed && !isSubmitting
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl'
                        : 'bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    }
        `}
                whileHover={canProceed && !isSubmitting ? { scale: 1.02 } : {}}
                whileTap={canProceed && !isSubmitting ? { scale: 0.98 } : {}}
            >
                {isSubmitting ? (
                    <span className="flex items-center gap-2">
                        <motion.div
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        Submitting...
                    </span>
                ) : isLastStep ? (
                    'Submit Report →'
                ) : (
                    'Next →'
                )}
            </motion.button>
        </div>
    );
};
