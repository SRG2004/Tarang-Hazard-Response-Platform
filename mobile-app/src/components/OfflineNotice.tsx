import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

export default function OfflineNotice() {
    const { t } = useTranslation();
    const [isConnected, setIsConnected] = useState<boolean | null>(true);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected);
        });

        return () => unsubscribe();
    }, []);

    if (isConnected) {
        return null;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.text}>{t('common.offline') || 'No Internet Connection'}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#b52424',
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        width,
        position: 'absolute',
        top: 0,
        zIndex: 9999,
    },
    text: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
    },
});
