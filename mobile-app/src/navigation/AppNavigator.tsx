import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import SidebarNavigator from './SidebarNavigator';
import { User } from 'firebase/auth';

const Stack = createNativeStackNavigator();

interface AppNavigatorProps {
    user: User | null;
}

export default function AppNavigator({ user }: AppNavigatorProps) {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user ? (
                <Stack.Screen name="Main" component={SidebarNavigator} />
            ) : (
                <Stack.Screen name="Login" component={LoginScreen} />
            )}
        </Stack.Navigator>
    );
}
