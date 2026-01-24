import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Brain, Activity, Play, Clock, CheckCircle, XCircle, Zap } from 'lucide-react-native';
import { getModels, getTrainingJobs, getHazardPredictions, trainModel } from '../services/apiService';

export default function MLModelManagement() {
    const [activeTab, setActiveTab] = useState('models');
    const [models, setModels] = useState<any[]>([]);
    const [jobs, setJobs] = useState<any[]>([]);
    const [predictions, setPredictions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isTraining, setIsTraining] = useState(false);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'models') {
                const res = await getModels();
                if (res.success && res.models) setModels(res.models);
            } else if (activeTab === 'jobs') {
                const res = await getTrainingJobs();
                if (res.success && res.jobs) setJobs(res.jobs);
            } else if (activeTab === 'predictions') {
                const res = await getHazardPredictions({ limit: 20 });
                if (res.success && res.predictions) setPredictions(res.predictions);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTrainModel = async () => {
        setIsTraining(true);
        try {
            const res = await trainModel();
            if (res.success) {
                Alert.alert('Success', 'Training started successfully');
                setActiveTab('jobs');
                fetchData();
            } else {
                Alert.alert('Error', 'Failed to start training');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to start training');
        } finally {
            setIsTraining(false);
        }
    };

    const renderModelItem = ({ item }: { item: any }) => (
        <View className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-3">
            <View className="flex-row justify-between items-start mb-2">
                <View>
                    <Text className="font-bold text-gray-900 text-lg">v{item.version}</Text>
                    <Text className="text-xs text-gray-500">{item.type}</Text>
                </View>
                <View className={`px-2 py-1 rounded-full ${item.status === 'ready' ? 'bg-green-100' :
                        item.status === 'training' ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                    <Text className={`text-xs font-bold capitalize ${item.status === 'ready' ? 'text-green-700' :
                            item.status === 'training' ? 'text-yellow-700' : 'text-red-700'
                        }`}>
                        {item.status}
                    </Text>
                </View>
            </View>
            <View className="flex-row items-center mt-2">
                <Activity size={16} color="#15803D" />
                <Text className="ml-2 text-gray-700">Accuracy: {(item.accuracy || 0).toFixed(2)}%</Text>
            </View>
            <Text className="text-xs text-gray-500 mt-2">
                Examples: {item.trainingExamples || 0} • Created: {new Date(item.createdAt).toLocaleDateString()}
            </Text>
        </View>
    );

    const renderJobItem = ({ item }: { item: any }) => (
        <View className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-3">
            <View className="flex-row justify-between items-center mb-2">
                <View className="flex-row items-center">
                    {item.status === 'completed' ? (
                        <CheckCircle size={18} color="#15803D" />
                    ) : item.status === 'failed' ? (
                        <XCircle size={18} color="#B91C1C" />
                    ) : (
                        <Clock size={18} color="#CA8A04" />
                    )}
                    <Text className="ml-2 font-bold capitalize">{item.status}</Text>
                </View>
                <Text className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
            <Text className="text-sm text-gray-700">Type: {item.type}</Text>
            {item.result && (
                <Text className="text-sm text-gray-700 mt-1">
                    Result: v{item.result.version} (Acc: {item.result.accuracy?.toFixed(2)}%)
                </Text>
            )}
            {item.error && (
                <Text className="text-xs text-red-600 mt-1">{item.error}</Text>
            )}
        </View>
    );

    const renderPredictionItem = ({ item }: { item: any }) => (
        <View className={`p-4 rounded-xl border shadow-sm mb-3 ${item.severity === 'critical' ? 'bg-red-50 border-red-200' :
                item.severity === 'warning' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'
            }`}>
            <View className="flex-row justify-between items-start mb-2">
                <Text className="font-bold text-lg">{item.location}</Text>
                <View className={`px-2 py-1 rounded-full ${item.severity === 'critical' ? 'bg-red-200' :
                        item.severity === 'warning' ? 'bg-orange-200' : 'bg-blue-200'
                    }`}>
                    <Text className={`text-xs font-bold capitalize ${item.severity === 'critical' ? 'text-red-800' :
                            item.severity === 'warning' ? 'text-orange-800' : 'text-blue-800'
                        }`}>
                        {item.severity || 'low'}
                    </Text>
                </View>
            </View>
            <Text className="text-sm font-semibold mb-1">{item.hazardType}</Text>
            {item.hazards && item.hazards.map((h: any, idx: number) => (
                <Text key={idx} className="text-xs text-gray-700">• {h.message}</Text>
            ))}
            <Text className="text-xs text-gray-500 mt-2">
                {new Date(item.createdAt).toLocaleString()}
            </Text>
        </View>
    );

    return (
        <View className="flex-1 bg-gray-50">
            <View className="flex-row bg-white border-b border-gray-200">
                {['models', 'jobs', 'predictions'].map(tab => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        className={`flex-1 py-3 items-center border-b-2 ${activeTab === tab ? 'border-[#0077B6]' : 'border-transparent'}`}
                    >
                        <Text className={`font-bold capitalize ${activeTab === tab ? 'text-[#0077B6]' : 'text-gray-500'}`}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View className="p-4 flex-1">
                {activeTab === 'models' && (
                    <TouchableOpacity
                        onPress={handleTrainModel}
                        disabled={isTraining}
                        className="bg-[#0077B6] p-4 rounded-xl flex-row items-center justify-center mb-4"
                    >
                        {isTraining ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <Zap size={20} color="#FFF" />
                                <Text className="text-white font-bold ml-2">Train New Model</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                {loading ? (
                    <ActivityIndicator size="large" color="#0077B6" />
                ) : (
                    <FlatList
                        data={activeTab === 'models' ? models : activeTab === 'jobs' ? jobs : predictions}
                        renderItem={activeTab === 'models' ? renderModelItem : activeTab === 'jobs' ? renderJobItem : renderPredictionItem}
                        keyExtractor={item => item.id}
                        ListEmptyComponent={<Text className="text-center text-gray-500 mt-10">No data found</Text>}
                    />
                )}
            </View>
        </View>
    );
}
