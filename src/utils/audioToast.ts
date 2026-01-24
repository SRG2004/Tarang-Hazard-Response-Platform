// Audio Toast Wrapper - Integrates audio alerts with toast notifications
import { toast as sonnerToast } from 'sonner';
import { audioAlertService } from '../services/audioAlertService';

interface ToastOptions {
  description?: string;
  duration?: number;
  priority?: 'low' | 'medium' | 'high';
  audio?: boolean;
}

let audioEnabled = true;

// Load audio preference on initialization
if (typeof window !== 'undefined') {
  audioAlertService.loadSettings();
  audioEnabled = audioAlertService.isAvailable();
}

export const audioToast = {
  success: (message: string, options?: ToastOptions) => {
    sonnerToast.success(message, options);
    if (audioEnabled && (options?.audio !== false) && audioAlertService.isAvailable()) {
      const fullMessage = options?.description 
        ? `${message}. ${options.description}` 
        : message;
      audioAlertService.speakAlert(fullMessage, 'en', options?.priority || 'medium');
    }
  },
  
  error: (message: string, options?: ToastOptions) => {
    sonnerToast.error(message, options);
    if (audioEnabled && (options?.audio !== false) && audioAlertService.isAvailable()) {
      const fullMessage = options?.description 
        ? `${message}. ${options.description}` 
        : message;
      audioAlertService.speakAlert(fullMessage, 'en', 'high');
    }
  },
  
  warning: (message: string, options?: ToastOptions) => {
    sonnerToast.warning(message, options);
    if (audioEnabled && (options?.audio !== false) && audioAlertService.isAvailable()) {
      const fullMessage = options?.description 
        ? `${message}. ${options.description}` 
        : message;
      audioAlertService.speakAlert(fullMessage, 'en', 'high');
    }
  },
  
  info: (message: string, options?: ToastOptions) => {
    sonnerToast.info(message, options);
    if (audioEnabled && (options?.audio !== false) && audioAlertService.isAvailable()) {
      const fullMessage = options?.description 
        ? `${message}. ${options.description}` 
        : message;
      audioAlertService.speakAlert(fullMessage, 'en', options?.priority || 'low');
    }
  },
  
  enableAudio: () => {
    audioEnabled = true;
    audioAlertService.enable();
  },
  
  disableAudio: () => {
    audioEnabled = false;
    audioAlertService.disable();
  },
};

