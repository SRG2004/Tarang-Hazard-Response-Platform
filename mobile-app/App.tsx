import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { Provider } from '@ant-design/react-native';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './src/lib/firebase';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import * as Font from 'expo-font';
import './src/i18n'; // Initialize i18n
import { registerForPushNotificationsAsync } from './src/services/notificationService';
import * as Notifications from 'expo-notifications';
import OfflineNotice from './src/components/OfflineNotice';
import './src/services/offlineSyncService'; // Initialize offline sync service


export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const initializingRef = React.useRef(true);

  useEffect(() => {
    async function loadResources() {
      try {
        await Font.loadAsync({
          'antoutline': require('@ant-design/icons-react-native/fonts/antoutline.ttf'),
          'antfill': require('@ant-design/icons-react-native/fonts/antfill.ttf'),
        });
        setFontsLoaded(true);
      } catch (e) {
        console.warn(e);
      }
    }
    loadResources();

    // Register for push notifications
    registerForPushNotificationsAsync().then(token => {
      if (token) console.log("Push Token Registered:", token);
    });

    // Notification listeners
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log("Notification Received:", notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("Notification Response:", response);
    });

    console.log("App mounted, initializing auth...");
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      console.log("Auth state changed:", user ? "User logged in" : "No user");
      setUser(user);
      if (initializingRef.current) {
        setInitializing(false);
        initializingRef.current = false;
      }
    });

    // Safety timeout: If Firebase hangs, force initialization to finish after 3s
    const timeout = setTimeout(() => {
      if (initializingRef.current) {
        console.warn("Auth initialization timed out, forcing completion.");
        setInitializing(false);
        initializingRef.current = false;
      }
    }, 3000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  if (initializing || !fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <Provider>
      <NavigationContainer>
        <OfflineNotice />
        <AppNavigator user={user} />
        <StatusBar style="auto" />
      </NavigationContainer>
    </Provider>
  );
}
