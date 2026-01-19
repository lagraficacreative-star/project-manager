import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Send, MessageSquare, X, User } from 'lucide-react';

const ChatWidget = ({ currentUser }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);
    const pollingRef = useRef(null);

    const toggleOpen = () => setIsOpen(!isOpen);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchMessages = async () => {
        try {
            const data = await api.getMessages();
            // Simple optimization: only update if length changes to avoid flicker
            // In a real app we'd check IDs
            setMessages(prev => {
                if (data.length !== prev.length) return data;
                return prev; // No change
            });
        } catch (error) {
            console.error("Chat poll error", error);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchMessages(); // Initial fetch
            pollingRef.current = setInterval(fetchMessages, 3000); // Poll every 3s
            scrollToBottom();
        } else {
            if (pollingRef.current) clearInterval(pollingRef.current);
        }
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser) return;

        try {
            await api.sendMessage(newMessage, currentUser.name);
            setNewMessage('');
            fetchMessages();
        } catch (error) {
            console.error("Send error", error);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={toggleOpen}
                className="fixed bottom-6 right-6 bg-brand-black text-white p-4 rounded-full shadow-2xl hover:bg-brand-orange transition-all hover:scale-110 z-50 flex items-center justify-center"
            >
                <div className="relative">
                    <MessageSquare size={24} />
                    <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-brand-black"></span>
                </div>
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-96 max-h-[600px] h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
            {/* Header */}
            <div className="bg-brand-black text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <h3 className="font-bold text-sm">Chat de Equipo</h3>
                </div>
                <button onClick={toggleOpen} className="text-white/60 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 && (
                    <div className="text-center text-xs text-gray-400 py-10">
                        Inicia la conversación...
                    </div>
                )}
                {messages.map((msg, idx) => {
                    const isMe = msg.author === currentUser.name;
                    return (
                        <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${isMe ? 'bg-brand-orange text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'}`}>
                                <p>{msg.text}</p>
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1 px-1">
                                {isMe ? 'Tú' : msg.author} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-2 bg-brand-black text-white rounded-full hover:bg-brand-orange disabled:opacity-50 disabled:hover:bg-brand-black transition-colors"
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
};

export default ChatWidget;
