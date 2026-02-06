import React, { useState, useEffect, useRef, useCallback } from 'react';
import messageService from '../services/messageService';
import authService from '../services/authService';

const ChatBox = ({ rideId, rideTitle }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const user = authService.getCurrentUser();
        setCurrentUser(user);
        fetchMessages();

        // Poll for new messages every 3 seconds for near real-time feel
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [rideId, fetchMessages]);

    const fetchMessages = useCallback(async () => {
        try {
            if (!rideId) return;
            const data = await messageService.getMessages(rideId);
            setMessages(data);
        } catch (error) {
            console.error("Error fetching messages", error);
        }
    }, [rideId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            await messageService.sendMessage(rideId, newMessage);
            setNewMessage('');
            fetchMessages(); // Refresh immediately
        } catch (error) {
            console.error("Error sending message", error);
        }
    };

    return (
        <div className="flex flex-col h-[500px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-indigo-700 p-4 shrink-0">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Ride Chat
                </h3>
                {rideTitle && <p className="text-indigo-100 text-xs truncate">{rideTitle}</p>}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-400 mt-20 text-sm">
                        No messages yet.<br />Start the conversation!
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.sender._id === currentUser?.id || msg.sender === currentUser?.id;
                        return (
                            <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${isMe
                                    ? 'bg-primary-600 text-white rounded-tr-none'
                                    : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                    }`}>
                                    {!isMe && (
                                        <p className="text-[10px] text-gray-400 font-bold mb-1 block">
                                            {msg.sender.name || 'User'}
                                        </p>
                                    )}
                                    <p className="text-sm leading-relaxed">{msg.content}</p>
                                    <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 shrink-0 flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md transform hover:scale-105 active:scale-95"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                </button>
            </form>
        </div>
    );
};

export default ChatBox;
