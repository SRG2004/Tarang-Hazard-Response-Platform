import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '../contexts/TranslationContext';
import { audioAlertService } from '../services/audioAlertService';
import { cn } from './ui/utils';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  language?: string;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'icon-only';
}

export function VoiceInput({ 
  onTranscript, 
  language = 'en-IN', 
  disabled = false,
  className,
  variant = 'default'
}: VoiceInputProps) {
  const { t, language: currentLanguage } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef('');
  const processedIndexRef = useRef(0); // Track the last processed result index

  // Detect language based on translation context
  const speechLang = currentLanguage === 'hi' ? 'hi-IN' : currentLanguage === 'ta' ? 'ta-IN' : 'en-IN';

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language || speechLang;

      recognition.onstart = () => {
        setIsListening(true);
        finalTranscriptRef.current = '';
        processedIndexRef.current = 0;
        setTranscript('');
        toast.info(t('voice.listening'), { duration: 2000 });
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = finalTranscriptRef.current;

        // Only process new results starting from event.resultIndex (where new results begin)
        // event.resultIndex tells us the index of the first new/changed result
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          
          if (result.isFinal) {
            // Only add final transcripts, and only if we haven't processed this index yet
            // Clean up transcript (remove extra spaces)
            const cleanTranscript = transcript.trim();
            if (cleanTranscript) {
              // Only add if this result index hasn't been processed yet
              if (i >= processedIndexRef.current) {
                // Check if we've already seen this exact transcript at this position
                // This prevents duplicates from the same result being processed multiple times
                finalTranscript += (finalTranscript ? ' ' : '') + cleanTranscript;
                processedIndexRef.current = i + 1;
              }
            }
          } else {
            // Only show interim results for the latest (in-progress) result
            if (i === event.results.length - 1) {
              interimTranscript = transcript.trim();
            }
          }
        }

        finalTranscriptRef.current = finalTranscript;
        // Only show final + latest interim transcript
        setTranscript(finalTranscript + (interimTranscript ? ' ' + interimTranscript : ''));
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        let errorMessage = t('voice.error');
        if (event.error === 'no-speech') {
          errorMessage = t('voice.noSpeech');
        } else if (event.error === 'audio-capture') {
          errorMessage = t('voice.noMicrophone');
        } else if (event.error === 'not-allowed') {
          errorMessage = t('voice.permissionDenied');
        }
        
        toast.error(errorMessage);
        stopListening();
      };

      recognition.onend = () => {
        setIsListening(false);
        const finalText = finalTranscriptRef.current.trim();
        if (finalText) {
          // Only call onTranscript once with the final text
          onTranscript(finalText);
          setTranscript('');
          // Reset after calling onTranscript
          finalTranscriptRef.current = '';
          processedIndexRef.current = 0;
        }
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language, speechLang, onTranscript, t]);

  const startListening = () => {
    if (!isSupported) {
      toast.error(t('voice.notSupported'));
      return;
    }

    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        toast.error(t('voice.error'));
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return null; // Don't show voice input if not supported
  }

  if (variant === 'icon-only') {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={toggleListening}
        disabled={disabled}
        className={cn(
          "relative",
          isListening && "bg-red-50 border-red-300 text-red-600 animate-pulse",
          className
        )}
        title={isListening ? t('voice.stop') : t('voice.start')}
      >
        {isListening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
        {isListening && (
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-ping" />
        )}
      </Button>
    );
  }

  if (variant === 'compact') {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={toggleListening}
        disabled={disabled}
        className={cn(
          "relative",
          isListening && "bg-red-50 border-red-300 text-red-600",
          className
        )}
      >
        {isListening ? (
          <>
            <MicOff className="h-4 w-4 mr-2" />
            {t('voice.stop')}
          </>
        ) : (
          <>
            <Mic className="h-4 w-4 mr-2" />
            {t('voice.start')}
          </>
        )}
        {isListening && (
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-ping" />
        )}
      </Button>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={isListening ? "destructive" : "outline"}
          size="lg"
          onClick={toggleListening}
          disabled={disabled}
          className={cn(
            "relative min-w-[120px]",
            isListening && "animate-pulse"
          )}
        >
          {isListening ? (
            <>
              <MicOff className="h-5 w-5 mr-2" />
              {t('voice.stop')}
            </>
          ) : (
            <>
              <Mic className="h-5 w-5 mr-2" />
              {t('voice.start')}
            </>
          )}
          {isListening && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full animate-ping" />
          )}
        </Button>
        {transcript && (
          <div className="flex-1 p-2 bg-muted rounded-lg text-sm">
            <p className="text-muted-foreground">{transcript}</p>
          </div>
        )}
      </div>
      {isListening && (
        <div className="flex items-center gap-2 text-sm text-red-600 animate-pulse">
          <Volume2 className="h-4 w-4" />
          <span>{t('voice.speakNow')}</span>
        </div>
      )}
    </div>
  );
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((event: Event) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

