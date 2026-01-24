import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { Send, Bot, User, MessageCircle, Mic } from 'lucide-react-native';
import { chatWithBot } from '../services/apiService';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

export default function ChatBotScreen() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        // Welcome message
        const welcomeMessage: Message = {
            id: 'welcome',
            text: "Hello! I'm Tarang Bot. How can I help you today?",
            sender: 'bot',
            timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
    }, []);

    const handleSendMessage = async (text: string = inputValue) => {
        const messageText = text.trim();
        if (!messageText || isTyping) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: messageText,
            sender: 'user',
            timestamp: new Date(),
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInputValue('');
        setIsTyping(true);

        try {
            // Prepare history for API (exclude welcome message if needed, or map it)
            const history = messages.map(m => ({
                text: m.text,
                sender: m.sender
            }));

            const result = await chatWithBot(messageText, history);

            const botResponse: Message = {
                id: (Date.now() + 1).toString(),
                text: result.response || "I didn't get that. Could you try again?",
                sender: 'bot',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, botResponse]);
        } catch (error) {
            const errorResponse: Message = {
                id: (Date.now() + 1).toString(),
                text: "Sorry, I'm having trouble connecting right now.",
                sender: 'bot',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorResponse]);
        } finally {
            setIsTyping(false);
        }
    };

    const renderItem = ({ item }: { item: Message }) => (
        <View className={`flex-row mb-4 ${item.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {item.sender === 'bot' && (
                <View className="w-8 h-8 rounded-full bg-[#0077B6] items-center justify-center mr-2">
                    <Bot size={16} color="white" />
                </View>
            )}
            <View className={`max-w-[75%] p-3 rounded-2xl ${item.sender === 'user'
                ? 'bg-[#0077B6] rounded-tr-none'
                : 'bg-gray-200 rounded-tl-none'
                }`}>
                <Text className={item.sender === 'user' ? 'text-white' : 'text-gray-800'}>
                    {item.text}
                </Text>
                <Text className={`text-[10px] mt-1 text-right ${item.sender === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                    {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
            {item.sender === 'user' && (
                <View className="w-8 h-8 rounded-full bg-gray-300 items-center justify-center ml-2">
                    <User size={16} color="#4B5563" />
                </View>
            )}
        </View>
    );

    const suggestedQuestions = [
        "How to report a hazard?",
        "Where is the map?",
        "Emergency contacts",
        "Weather update"
    ];

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white"
            keyboardVerticalOffset={100}
        >
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            {/* Suggested Questions */}
            {messages.length > 0 && messages[messages.length - 1].sender === 'bot' && !isTyping && (
                <View className="px-4 pb-2">
                    <Text className="text-xs text-gray-500 mb-2 font-bold">Suggested:</Text>
                    <View className="flex-row flex-wrap">
                        {suggestedQuestions.map((q, index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => handleSendMessage(q)}
                                className="bg-gray-100 px-3 py-2 rounded-full mr-2 mb-2 border border-gray-200"
                            >
                                <Text className="text-xs text-[#0077B6]">{q}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {/* Input Area */}
            <View className="p-4 border-t border-gray-200 flex-row items-center bg-white">
                <TextInput
                    className="flex-1 bg-gray-100 rounded-full px-4 py-2 mr-2 text-gray-800 h-10"
                    placeholder="Type a message..."
                    value={inputValue}
                    onChangeText={setInputValue}
                    onSubmitEditing={() => handleSendMessage()}
                />
                <TouchableOpacity
                    onPress={() => Alert.alert('Voice Input', 'Voice input feature is coming soon!')}
                    className="w-10 h-10 rounded-full items-center justify-center bg-gray-200 mr-2"
                >
                    <Mic size={20} color="#0077B6" />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => handleSendMessage()}
                    disabled={!inputValue.trim() || isTyping}
                    className={`w-10 h-10 rounded-full items-center justify-center ${!inputValue.trim() || isTyping ? 'bg-gray-300' : 'bg-[#0077B6]'
                        }`}
                >
                    {isTyping ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <Send size={18} color="white" />
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}
