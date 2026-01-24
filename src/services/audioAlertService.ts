// Audio Alert Service - Text-to-Speech for important alerts
import { useTranslation } from '../contexts/TranslationContext';

class AudioAlertService {
  private synth: SpeechSynthesis | null = null;
  private isEnabled: boolean = true;
  private currentVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initializeVoice();
    }
  }

  private initializeVoice() {
    if (!this.synth) return;

    // Wait for voices to load
    const loadVoices = () => {
      const voices = this.synth!.getVoices();
      
      // Prefer Hindi voice if available, otherwise English
      const hindiVoice = voices.find(voice => 
        voice.lang.includes('hi') || voice.lang.includes('HI')
      );
      const englishVoice = voices.find(voice => 
        voice.lang.includes('en') || voice.lang.includes('EN')
      );
      
      this.currentVoice = hindiVoice || englishVoice || voices[0] || null;
    };

    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
    loadVoices();
  }

  private getVoiceForLanguage(language: string): SpeechSynthesisVoice | null {
    if (!this.synth) return null;

    const voices = this.synth.getVoices();
    
    if (language === 'hi') {
      const hindiVoice = voices.find(voice => 
        voice.lang.includes('hi') || voice.lang.includes('HI')
      );
      return hindiVoice || this.currentVoice;
    }
    
    if (language === 'ta') {
      const tamilVoice = voices.find(voice => 
        voice.lang.includes('ta') || voice.lang.includes('TA')
      );
      return tamilVoice || this.currentVoice;
    }
    
    const englishVoice = voices.find(voice => 
      voice.lang.includes('en') || voice.lang.includes('EN')
    );
    return englishVoice || this.currentVoice;
  }

  speak(text: string, language: string = 'en', priority: 'low' | 'medium' | 'high' = 'medium') {
    if (!this.synth || !this.isEnabled || !text.trim()) {
      return;
    }

    // Stop any ongoing speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.getVoiceForLanguage(language);
    
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      // Fallback language codes
      utterance.lang = language === 'hi' ? 'hi-IN' : language === 'ta' ? 'ta-IN' : 'en-US';
    }

    // Adjust rate and pitch based on priority
    utterance.rate = priority === 'high' ? 1.0 : 0.9;
    utterance.pitch = priority === 'high' ? 1.2 : 1.0;
    utterance.volume = priority === 'high' ? 1.0 : 0.8;

    utterance.onerror = (error) => {
      console.error('Speech synthesis error:', error);
    };

    this.synth.speak(utterance);
  }

  speakAlert(message: string, language: string = 'en', type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    if (!this.synth || !this.isEnabled) return;

    let alertPrefix = '';
    switch (type) {
      case 'success':
        alertPrefix = 'Success: ';
        break;
      case 'error':
        alertPrefix = 'Alert: ';
        break;
      case 'warning':
        alertPrefix = 'Warning: ';
        break;
      case 'info':
        alertPrefix = 'Information: ';
        break;
    }

    const priority: 'low' | 'medium' | 'high' = type === 'error' || type === 'warning' ? 'high' : 'medium';
    this.speak(alertPrefix + message, language, priority);
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  enable() {
    this.isEnabled = true;
    if (typeof window !== 'undefined' && localStorage) {
      localStorage.setItem('audioAlertsEnabled', 'true');
    }
  }

  disable() {
    this.isEnabled = false;
    this.stop();
    if (typeof window !== 'undefined' && localStorage) {
      localStorage.setItem('audioAlertsEnabled', 'false');
    }
  }

  isAvailable(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  loadSettings() {
    if (typeof window !== 'undefined' && localStorage) {
      const enabled = localStorage.getItem('audioAlertsEnabled');
      this.isEnabled = enabled !== 'false'; // Default to enabled
    }
  }

  saveSettings() {
    if (typeof window !== 'undefined' && localStorage) {
      localStorage.setItem('audioAlertsEnabled', this.isEnabled.toString());
    }
  }
}

// Export singleton instance
export const audioAlertService = new AudioAlertService();

// Load settings on initialization
if (typeof window !== 'undefined') {
  audioAlertService.loadSettings();
}

