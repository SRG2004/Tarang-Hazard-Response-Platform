// Simple translation utility as an alternative to i18next
// This provides a lightweight translation solution

const translations: { [key: string]: { [key: string]: string } } = {
  en: {
    'settings.title': 'Settings',
    'settings.profile': 'Profile Settings',
    'settings.darkMode': 'Dark Mode',
    'settings.language': 'Language',
    'settings.notifications': 'Notifications',
    'settings.weeklyDigest': 'Weekly Summary Digest',
    'settings.updateProfile': 'Update Profile',
    'settings.updatePassword': 'Update Password',
  },
  hi: {
    'settings.title': 'सेटिंग्स',
    'settings.profile': 'प्रोफ़ाइल सेटिंग्स',
    'settings.darkMode': 'डार्क मोड',
    'settings.language': 'भाषा',
    'settings.notifications': 'सूचनाएं',
    'settings.weeklyDigest': 'साप्ताहिक सारांश',
    'settings.updateProfile': 'प्रोफ़ाइल अपडेट करें',
    'settings.updatePassword': 'पासवर्ड अपडेट करें',
  },
  ta: {
    'settings.title': 'அமைப்புகள்',
    'settings.profile': 'சுயவிவர அமைப்புகள்',
    'settings.darkMode': 'இருண்ட பயன்முறை',
    'settings.language': 'மொழி',
    'settings.notifications': 'அறிவிப்புகள்',
    'settings.weeklyDigest': 'வாராந்திர சுருக்கம்',
    'settings.updateProfile': 'சுயவிவரத்தை புதுப்பிக்கவும்',
    'settings.updatePassword': 'கடவுச்சொல்லை புதுப்பிக்கவும்',
  },
  te: {
    'settings.title': 'సెట్టింగ్‌లు',
    'settings.profile': 'ప్రొఫైల్ సెట్టింగ్‌లు',
    'settings.darkMode': 'డార్క్ మోడ్',
    'settings.language': 'భాష',
    'settings.notifications': 'నోటిఫికేషన్‌లు',
    'settings.weeklyDigest': 'వారపు సారాంశం',
    'settings.updateProfile': 'ప్రొఫైల్‌ను నవీకరించండి',
    'settings.updatePassword': 'పాస్‌వర్డ్‌ను నవీకరించండి',
  },
  ml: {
    'settings.title': 'ക്രമീകരണങ്ങൾ',
    'settings.profile': 'പ്രൊഫൈൽ ക്രമീകരണങ്ങൾ',
    'settings.darkMode': 'ഡാർക്ക് മോഡ്',
    'settings.language': 'ഭാഷ',
    'settings.notifications': 'അറിയിപ്പുകൾ',
    'settings.weeklyDigest': 'വാരാന്തര സംഗ്രഹം',
    'settings.updateProfile': 'പ്രൊഫൈൽ അപ്ഡേറ്റ് ചെയ്യുക',
    'settings.updatePassword': 'പാസ്‌വേഡ് അപ്ഡേറ്റ് ചെയ്യുക',
  },
};

export const getTranslation = (key: string, lang: string = 'en'): string => {
  const langTranslations = translations[lang] || translations['en'];
  return langTranslations[key] || key;
};

export const setLanguage = (lang: string) => {
  localStorage.setItem('language', lang);
  document.documentElement.setAttribute('lang', lang);
};

export const getLanguage = (): string => {
  return localStorage.getItem('language') || 'en';
};

