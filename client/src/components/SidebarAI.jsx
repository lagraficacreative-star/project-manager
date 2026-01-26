import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, Sparkles, Search, X } from 'lucide-react';
import { api } from '../api';

const SidebarAI = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        { role: 'assistant', text: '¡Hola! Soy el asistente de LaGràfica. ¿En qué puedo ayudarte hoy?' }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        const msgText = e.target.msg?.value || input;
        if (!msgText.trim()) return;

        const userMsg = msgText;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setIsTyping(true);

        try {
            const db = await api.getData();
            const contacts = await api.getContacts();
            const tenders = await api.getTenders();
            const docs = await api.getDocuments();
            const lowerInput = userMsg.toLowerCase();

            let response = "";

            const parseAmount = (amt) => {
                if (!amt) return 0;
                return parseFloat(amt.toString().replace(/[^0-9,.]/g, '').replace(',', '.')) || 0;
            };

            if (lowerInput.includes('suma') || lowerInput.includes('total') || lowerInput.includes('cuanto') || lowerInput.includes('presupuesto') || lowerInput.includes('facturaci') || lowerInput.includes('balance') || lowerInput.includes('cuenta') || lowerInput.includes('dinero') || lowerInput.includes('€') || lowerInput.includes('pago')) {
                response = "Lo siento, como asistente general no tengo permisos para acceder a información financiera, presupuestos o facturación por motivos de seguridad. Para gestionar estos datos, por favor dirígete a la sección de **Gestión** protegida por contraseña.";
            }
            else if (lowerInput.includes('document') || lowerInput.includes('doc') || lowerInput.includes('fichero') || lowerInput.includes('carpeta')) {
                const searchPart = lowerInput.replace(/documento|doc|fichero|busca|encuentra|sobre/g, '').trim();
                const foundDocs = docs.filter(d => d.name.toLowerCase().includes(searchPart) || (d.description && d.description.toLowerCase().includes(searchPart)));

                if (foundDocs.length > 0) {
                    response = `He encontrado **${foundDocs.length} ficheros** relacionados:\n\n` +
                        foundDocs.slice(0, 3).map(d => `• **${d.name}** (${d.type})`).join('\n') +
                        (foundDocs.length > 3 ? `\n...y ${foundDocs.length - 3} más.` : '');
                } else {
                    response = "No he encontrado ningún documento específico con ese nombre, pero puedes revisar la Unidad de Gestión en la sección de Docs.";
                }
            }
            else if (lowerInput.includes('busca') || lowerInput.includes('quien es') || lowerInput.includes('contacto')) {
                const found = contacts.filter(c => lowerInput.includes(c.name.toLowerCase()));
                if (found.length > 0) {
                    response = `He encontrado este contacto: **${found[0].name}**. Su correo es ${found[0].email || 'no disponible'} y el teléfono ${found[0].phone || 'no disponible'}.`;
                } else {
                    response = "No he encontrado ningún contacto con ese nombre en la agenda.";
                }
            } else if (lowerInput.includes('proyecto') || lowerInput.includes('tarjeta') || lowerInput.includes('card')) {
                const found = (db.cards || []).filter(c => c.title.toLowerCase().includes(lowerInput.replace('proyecto', '').trim()));
                if (found.length > 0) {
                    response = `He encontrado el proyecto: **${found[0].title}**. Está en el tablero ${db.boards.find(b => b.id === found[0].boardId)?.title || 'desconocido'}.`;
                } else {
                    response = "No he encontrado ningún proyecto que coincida con la búsqueda.";
                }
            } else if (lowerInput.includes('hola') || lowerInput.includes('buenos dias')) {
                response = "¡Hola! ¿Cómo va todo por el estudio? Soy el asistente de LaGràfica y puedo ayudarte a encontrar contactos, documentos o proyectos. ¿Qué necesitas?";
            } else {
                response = "¡Aún estoy aprendiendo! Prueba a pedirme 'busca el documento de riesgos', 'busca el proyecto X' o 'quién es el cliente Y'. (Nota: No tengo acceso a datos financieros)";
            }

            setTimeout(() => {
                setMessages(prev => [...prev, { role: 'assistant', text: response }]);
                setIsTyping(false);
            }, 600);

        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', text: "Lo siento, ha habido un error al procesar tu petición." }]);
            setIsTyping(false);
        }
    };

    return (
        <div className="mt-auto border-t border-gray-100 pt-6">
            <div className={`transition-all duration-300 ${isOpen ? 'mb-4' : 'mb-0'}`}>
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex justify-between items-center mb-3 cursor-pointer group"
                >
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 group-hover:text-brand-orange transition-colors">
                        <Bot size={12} className={isOpen ? 'text-brand-orange' : ''} /> Asistente LaGràfica
                    </p>
                    <Sparkles size={12} className={`text-brand-orange transition-all ${isOpen ? 'rotate-180 scale-125' : 'animate-pulse'}`} />
                </div>

                {isOpen && (
                    <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 shadow-inner flex flex-col gap-3 max-h-[400px] overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-[150px]">
                            {messages.map((m, i) => (
                                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`p-2 rounded-xl text-[11px] max-w-[90%] leading-relaxed ${m.role === 'user' ? 'bg-brand-orange text-white' : 'bg-white text-gray-700 shadow-sm border border-gray-100'}`}>
                                        <p className="whitespace-pre-line">{m.text}</p>
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex gap-1 p-1">
                                    <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSend} className="relative">
                            <input
                                name="msg"
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Busca proyectos, contactos, documentos..."
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 pr-9 text-[11px] outline-none focus:ring-2 focus:ring-brand-orange/20 transition-all font-medium"
                            />
                            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-brand-orange transition-colors">
                                <Send size={14} />
                            </button>
                        </form>
                    </div>
                )}

                {!isOpen && (
                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-brand-orange transition-colors" />
                        <input
                            readOnly
                            onClick={() => setIsOpen(true)}
                            placeholder="IA: Busca proyectos, contactos o documentos..."
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 pl-9 pr-4 text-[11px] text-gray-400 cursor-pointer hover:bg-white hover:border-brand-orange/20 transition-all outline-none"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default SidebarAI;
