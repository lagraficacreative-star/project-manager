import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, Sparkles, Search, X, Paperclip, Cloud } from 'lucide-react';
import { api } from '../api';

const SidebarAI = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        { role: 'assistant', text: '¡Hola! Soy el asistente de LaGràfica. ¿En qué puedo ayudarte hoy?' }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    // Auto‑query when the panel opens
    useEffect(() => {
        if (isOpen) {
            const hasUserMessage = messages.some(m => m.role === 'user');
            if (!hasUserMessage) {
                const defaultMsg = 'Resumen del día';
                handleSend({
                    preventDefault: () => { },
                    target: { msg: { value: defaultMsg } }
                });
            }
        }
    }, [isOpen]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const msgText = e.target.msg?.value || input;
        if (!msgText.trim()) return;

        const userMsg = msgText;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setIsTyping(true);

        try {
            // Optimization: Fetch all data in parallel to avoid "hanging"
            const [db, contacts, tenders, docs, events, users] = await Promise.all([
                api.getData().catch(() => ({})),
                api.getContacts().catch(() => []),
                api.getTenders().catch(() => []),
                api.getDocuments().catch(() => []),
                api.getEvents().catch(() => []),
                api.getUsers().catch(() => [])
            ]);

            const lowerInput = userMsg.toLowerCase();
            let response = "";

            // Safety check for critical data
            const cards = db.cards || [];
            const safeUsers = users || [];

            // BLOCK: FINANCIAL SENSITIVE DATA
            if (lowerInput.includes('suma') || lowerInput.includes('total') || lowerInput.includes('cuanto') || lowerInput.includes('presupuesto') || lowerInput.includes('facturaci') || lowerInput.includes('balance') || lowerInput.includes('cuenta') || lowerInput.includes('dinero') || lowerInput.includes('€') || lowerInput.includes('pago')) {
                response = "Lo siento, como asistente general no tengo permisos para acceder a información financiera, presupuestos o facturación. Para gestionar estos datos, por favor dirígete a la sección de **Gestión** protegida por contraseña.";
            }
            // FEATURE: TEAM TASKS / JOBS
            else if (lowerInput.includes('que hace') || lowerInput.includes('trabajo de') || lowerInput.includes('encargado') || lowerInput.includes('que tiene') || lowerInput.includes('tareas de') || lowerInput.includes('proyecto') || lowerInput.includes('como va')) {
                const foundUser = safeUsers.find(u => u.name && lowerInput.includes(u.name.toLowerCase()));
                if (foundUser) {
                    const userCards = cards.filter(c => c && c.responsibleId === foundUser.id && c.columnId && !c.columnId.includes('done'));
                    if (userCards.length > 0) {
                        response = `**${foundUser.name}** tiene actualmente **${userCards.length} tareas** activas:\n\n` +
                            userCards.slice(0, 5).map(c => `• ${c.title}`).join('\n') +
                            (userCards.length > 5 ? `\n...y ${userCards.length - 5} más.` : '');
                    } else {
                        response = `Parece que **${foundUser.name}** no tiene tareas pendientes asignadas en este momento.`;
                    }
                } else if (lowerInput.includes('proyecto') || lowerInput.includes('como va') || lowerInput.includes('busca')) {
                    const query = lowerInput.replace(/proyecto|como va|el|la|busca|encuentra/g, '').trim();
                    if (query.length > 2) {
                        const found = cards.filter(c => c && c.title && c.title.toLowerCase().includes(query));
                        if (found.length > 0) {
                            const card = found[0];
                            const board = (db.boards || []).find(b => b.id === card.boardId);
                            response = `He encontrado el proyecto **${card.title}**. Está en el tablero **${board?.title || 'General'}**.`;
                        } else {
                            response = `No he encontrado ningún proyecto o tarea con el nombre "${query}".`;
                        }
                    } else {
                        response = "Dime el nombre del proyecto o de la persona por la que quieres preguntar.";
                    }
                } else {
                    response = "¿De qué miembro del equipo quieres consultar las tareas? (Neus, Montse, Omar, Alba...)";
                }
            }
            // FEATURE: CALENDAR / EVENTS
            else if (lowerInput.includes('calendario') || lowerInput.includes('agenda') || lowerInput.includes('evento') || lowerInput.includes('reunion') || lowerInput.includes('cita')) {
                const upcoming = (events || []).filter(e => e.start && new Date(e.start) >= new Date()).sort((a, b) => new Date(a.start) - new Date(b.start));
                if (upcoming.length > 0) {
                    response = `He revisado el calendario. Próximos eventos:\n\n` +
                        upcoming.slice(0, 3).map(e => `• **${e.title}**: ${new Date(e.start).toLocaleDateString()} ${!e.allDay ? 'a las ' + new Date(e.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '(Todo el día)'}`).join('\n');
                } else {
                    response = "No he encontrado eventos próximos en el calendario.";
                }
            }
            // FEATURE: CONTACTS
            else if (lowerInput.includes('busca') || lowerInput.includes('quien es') || lowerInput.includes('contacto') || lowerInput.includes('telf') || lowerInput.includes('mail')) {
                const searchPart = lowerInput.replace(/busca|quien es|contacto|dime el|pasa el|email de|correo de/g, '').trim();
                const found = (contacts || []).filter(c => c.name.toLowerCase().includes(searchPart) || (c.company && c.company.toLowerCase().includes(searchPart)));
                if (found.length > 0) {
                    response = found.slice(0, 3).map(c =>
                        `**${c.name}**${c.company ? ' (' + c.company + ')' : ''}:\n📧 ${c.email || 'No disponible'}\n📞 ${c.phone || 'No disponible'}`
                    ).join('\n\n');
                } else {
                    response = `No he encontrado a nadie llamado "${searchPart}" en la agenda de contactos.`;
                }
            }
            // FEATURE: DOCUMENTS
            else if (lowerInput.includes('document') || lowerInput.includes('doc') || lowerInput.includes('fichero') || lowerInput.includes('carpeta')) {
                const searchPart = lowerInput.replace(/documento|doc|fichero|busca|encuentra|sobre/g, '').trim();
                const foundDocs = (docs || []).filter(d => d.name && (d.name.toLowerCase().includes(searchPart) || (d.description && d.description.toLowerCase().includes(searchPart))));
                if (foundDocs.length > 0) {
                    response = `He encontrado **${foundDocs.length} ficheros** relacionados:\n\n` +
                        foundDocs.slice(0, 5).map(d => `• **${d.name}** (${d.type})`).join('\n') +
                        (foundDocs.length > 5 ? `\n...y ${foundDocs.length - 5} más.` : '');
                } else {
                    response = "No he encontrado ningún documento con ese nombre.";
                }
            } else if (lowerInput.includes('hola') || lowerInput.includes('buenos dias')) {
                response = "¡Hola! Estoy listo para ayudarte. Puedo decirte en qué está trabajando el equipo, buscar contactos, revisar el calendario o encontrar proyectos y documentos (excepto financieros).";
            } else {
                response = "Entiendo. Puedo ayudarte con tareas del equipo, contactos, el calendario o buscar proyectos. ¿Qué necesitas saber exactamente?";
            }

            setTimeout(() => {
                setMessages(prev => [...prev, { role: 'assistant', text: response }]);
                setIsTyping(false);
            }, 800);

        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { role: "assistant", text: "Lo siento, ha habido un error al conectar con la base de datos." }]);
            setIsTyping(false);
        }
    };
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        for (const file of files) {
            await uploadAIFile(file);
        }
        e.target.value = null;
    };

    const uploadAIFile = async (file) => {
        try {
            const result = await api.uploadFile(file);
            const fileLink = `[Archivo: ${result.filename}](${result.url})`;
            setInput(prev => prev ? `${prev} ${fileLink}` : fileLink);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Error al subir archivo a la IA");
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        for (const file of files) {
            await uploadAIFile(file);
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
                    <div
                        className="bg-gray-50 rounded-2xl p-3 border border-gray-100 shadow-inner flex flex-col gap-3 max-h-[400px] overflow-hidden animate-in fade-in slide-in-from-bottom-2 relative"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        {/* Drag Overlay */}
                        {isDragging && (
                            <div className="absolute inset-0 z-[60] bg-brand-orange/20 backdrop-blur-sm border-2 border-dashed border-brand-orange flex flex-col items-center justify-center p-4 text-center pointer-events-none">
                                <Cloud size={32} className="text-brand-orange animate-bounce mb-2" />
                                <p className="text-[10px] font-bold text-brand-black">Sube archivos a la IA</p>
                            </div>
                        )}
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

                        <form onSubmit={handleSend} className="relative flex items-center gap-1.5">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                multiple
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-1.5 text-gray-400 hover:text-brand-orange transition-colors"
                                title="Adjuntar archivo"
                            >
                                <Paperclip size={14} />
                            </button>
                            <div className="relative flex-1">
                                <input
                                    name="msg"
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Busca proyectos, contactos..."
                                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 pr-9 text-[11px] outline-none focus:ring-2 focus:ring-brand-orange/20 transition-all font-medium"
                                />
                                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-brand-orange transition-colors">
                                    <Send size={14} />
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {!isOpen && (
                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-brand-orange transition-colors" />
                        <input
                            readOnly
                            onClick={() => setIsOpen(true)}
                            placeholder="IA: Busca proyectos, contactos..."
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 pl-9 pr-4 text-[11px] text-gray-400 cursor-pointer hover:bg-white hover:border-brand-orange/20 transition-all outline-none"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default SidebarAI;
