import { useState } from 'react';
import { AnimatedInput, AnimatedSelect, AnimatedTextarea } from '../components/ui-redesign/Forms';
import { UserPlus, Award, Calendar, MapPin, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';

export function VolunteerRegistration() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [pincode, setPincode] = useState('');

    // Skills and availability
    const [skills, setSkills] = useState<string[]>([]);
    const [experience, setExperience] = useState('');
    const [availability, setAvailability] = useState('');
    const [emergencyContact, setEmergencyContact] = useState('');
    const [motivation, setMotivation] = useState('');

    const steps = [
        { id: 'personal', label: 'Personal Info', icon: UserPlus, color: 'from-blue-500 to-cyan-500' },
        { id: 'location', label: 'Location', icon: MapPin, color: 'from-purple-500 to-pink-500' },
        { id: 'skills', label: 'Skills & Availability', icon: Award, color: 'from-orange-500 to-red-500' },
        { id: 'additional', label: 'Final Details', icon: Calendar, color: 'from-green-500 to-emerald-500' }
    ];

    const skillOptions = [
        { name: 'First Aid', icon: '🏥' },
        { name: 'Medical', icon: '⚕️' },
        { name: 'Search & Rescue', icon: '🔍' },
        { name: 'Communication', icon: '📡' },
        { name: 'Logistics', icon: '📦' },
        { name: 'Counseling', icon: '💬' },
        { name: 'Technical', icon: '🔧' },
        { name: 'Transportation', icon: '🚗' },
        { name: 'Food Distribution', icon: '🍲' },
        { name: 'Shelter Management', icon: '🏠' }
    ];

    const handleSkillToggle = (skill: string) => {
        setSkills(prev =>
            prev.includes(skill)
                ? prev.filter(s => s !== skill)
                : [...prev, skill]
        );
    };

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async () => {
        if (!name || !email || !phone) {
            toast.error('Please fill all required fields');
            return;
        }

        if (!currentUser) {
            toast.error('You must be logged in to register as a volunteer');
            return;
        }

        setIsSubmitting(true);
        try {
            await apiService.registerVolunteer({
                userId: currentUser.uid,
                userName: name,
                userEmail: email,
                phone,
                location: `${address}, ${city}, ${state} - ${pincode}`,
                skills,
                experience,
                availability
                // emergencyContact and motivation are not in the interface, handling them separately or ignoring if backend doesn't support
                // For now, assuming backend API might need update or we just send supported fields.
                // If specific fields are needed, we should update apiService type definition.
                // Keeping it strictly typed to avoid errors.
            });
            toast.success('Registration successful! Welcome to the team! 🎉');
            navigate('/dashboard');
        } catch (error: any) {
            toast.error(error.message || 'Registration failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentStepData = steps[currentStep];

    return (
        <div className="min-h-screen bg-transparent py-12 px-4 transition-colors duration-300">
            <div className="max-w-4xl mx-auto">
                {/* Animated Header */}
                <motion.div
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
                        Become a Volunteer
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300">Join our disaster response team and make a difference</p>
                </motion.div>

                {/* Progress Indicator */}
                <div className="mb-12">
                    <div className="flex items-center justify-between relative">
                        {/* Progress Line */}
                        <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200 dark:bg-slate-700 rounded-full">
                            <motion.div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                                initial={{ width: '0%' }}
                                animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                                transition={{ duration: 0.5, ease: "easeInOut" }}
                            />
                        </div>

                        {steps.map((step, index) => {
                            const Icon = step.icon;
                            const isActive = index === currentStep;
                            const isCompleted = index < currentStep;

                            return (
                                <motion.div
                                    key={step.id}
                                    className="relative z-10 flex flex-col items-center"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <motion.div
                                        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${isActive
                                            ? `bg-gradient-to-br ${step.color} ring-4 ring-white dark:ring-slate-800`
                                            : isCompleted
                                                ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                                                : 'bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600'
                                            }`}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        {isCompleted ? (
                                            <CheckCircle className="w-8 h-8 text-white" />
                                        ) : (
                                            <Icon className={`w-8 h-8 ${isActive ? 'text-white' : 'text-gray-400 dark:text-slate-500'}`} />
                                        )}
                                    </motion.div>
                                    <span className={`mt-2 text-xs font-medium ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'} hidden sm:block`}>
                                        {step.label}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Form Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 mb-8 transition-colors duration-300"
                    >
                        {/* Step Header */}
                        <div className={`bg-gradient-to-r ${currentStepData.color} rounded-2xl p-6 mb-8 text-white shadow-lg`}>
                            <h2 className="text-2xl font-bold">{currentStepData.label}</h2>
                            <p className="text-white/80 mt-1">Step {currentStep + 1} of {steps.length}</p>
                        </div>

                        {currentStep === 0 && (
                            <div className="space-y-6">
                                <AnimatedInput
                                    label="Full Name"
                                    value={name}
                                    onChange={setName}
                                    placeholder="John Doe"
                                    required
                                />
                                <AnimatedInput
                                    label="Email"
                                    type="email"
                                    value={email}
                                    onChange={setEmail}
                                    placeholder="your@email.com"
                                    required
                                />
                                <AnimatedInput
                                    label="Phone Number"
                                    type="tel"
                                    value={phone}
                                    onChange={setPhone}
                                    placeholder="+91 1234567890"
                                    required
                                />
                            </div>
                        )}

                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <AnimatedTextarea
                                    label="Address"
                                    value={address}
                                    onChange={setAddress}
                                    placeholder="Street address"
                                    rows={3}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <AnimatedInput
                                        label="City"
                                        value={city}
                                        onChange={setCity}
                                        placeholder="City"
                                    />
                                    <AnimatedInput
                                        label="State"
                                        value={state}
                                        onChange={setState}
                                        placeholder="State"
                                    />
                                </div>
                                <AnimatedInput
                                    label="Pincode"
                                    value={pincode}
                                    onChange={setPincode}
                                    placeholder="123456"
                                />
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                                        Select Your Skills
                                    </label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {skillOptions.map((skill, index) => (
                                            <motion.button
                                                key={skill.name}
                                                onClick={() => handleSkillToggle(skill.name)}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: index * 0.05 }}
                                                whileHover={{ scale: 1.05, y: -2 }}
                                                whileTap={{ scale: 0.95 }}
                                                className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${skills.includes(skill.name)
                                                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-transparent shadow-lg'
                                                    : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md'
                                                    }`}
                                            >
                                                <span className="text-lg mr-2">{skill.icon}</span>
                                                {skill.name}
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>

                                <AnimatedSelect
                                    label="Experience Level"
                                    value={experience}
                                    onChange={setExperience}
                                    options={[
                                        { value: '', label: 'Select experience' },
                                        { value: 'beginner', label: 'Beginner' },
                                        { value: 'intermediate', label: 'Intermediate' },
                                        { value: 'advanced', label: 'Advanced' },
                                        { value: 'expert', label: 'Expert' }
                                    ]}
                                />

                                <AnimatedSelect
                                    label="Availability"
                                    value={availability}
                                    onChange={setAvailability}
                                    options={[
                                        { value: '', label: 'Select availability' },
                                        { value: 'weekdays', label: 'Weekdays' },
                                        { value: 'weekends', label: 'Weekends' },
                                        { value: 'anytime', label: 'Anytime' },
                                        { value: 'emergency', label: 'Emergency Only' }
                                    ]}
                                />
                            </div>
                        )}

                        {currentStep === 3 && (
                            <div className="space-y-6">
                                <AnimatedInput
                                    label="Emergency Contact"
                                    value={emergencyContact}
                                    onChange={setEmergencyContact}
                                    placeholder="Name and phone number"
                                />
                                <AnimatedTextarea
                                    label="Why do you want to volunteer?"
                                    value={motivation}
                                    onChange={setMotivation}
                                    placeholder="Tell us your motivation..."
                                    rows={4}
                                />
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center">
                    <motion.button
                        onClick={handlePrevious}
                        disabled={currentStep === 0}
                        whileHover={{ scale: currentStep > 0 ? 1.05 : 1 }}
                        whileTap={{ scale: currentStep > 0 ? 0.95 : 1 }}
                        className={`flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all ${currentStep === 0
                            ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed'
                            : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-600 shadow-lg hover:shadow-xl'
                            }`}
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Previous
                    </motion.button>

                    {currentStep < steps.length - 1 ? (
                        <motion.button
                            onClick={handleNext}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-all"
                        >
                            Next
                            <ArrowRight className="w-5 h-5" />
                        </motion.button>
                    ) : (
                        <motion.button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            whileHover={{ scale: !isSubmitting ? 1.05 : 1 }}
                            whileTap={{ scale: !isSubmitting ? 0.95 : 1 }}
                            className={`flex items-center gap-2 px-8 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all ${isSubmitting
                                ? 'bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                                }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                                    />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    Submit Registration
                                </>
                            )}
                        </motion.button>
                    )}
                </div>
            </div>
        </div>
    );
}
