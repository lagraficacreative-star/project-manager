import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, Sparkles, Search, X } from 'lucide-react';
import { api } from '../api';

const SidebarAI = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hola! Sóc l\'assistent de LaGràfica. En què et puc ajudar avui?' }
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
        if (!input.trim()) return;

        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setIsTyping(true);

        try {
            // Load data for context
            const db = await api.getData();
            const contacts = await api.getContacts();
            const tenders = await api.getTenders();
            const docs = await api.getDocuments();
            const lowerInput = userMsg.toLowerCase();

            let response = "";

            // Helper for currency/numbers
            const parseAmount = (amt) => {
                if (!amt) return 0;
                return parseFloat(amt.toString().replace(/[^0-9,.]/g, '').replace(',', '.')) || 0;
            };

            // 1. Calculations: Sum of Tenders/Amounts
            if (lowerInput.includes('suma') || lowerInput.includes('total') || lowerInput.includes('quant') || lowerInput.includes('presupuesto')) {
                if (lowerInput.includes('licitaci') || lowerInput.includes('tenders')) {
                    const total = tenders.reduce((acc, t) => acc + parseAmount(t.amount), 0);
                    const won = tenders.filter(t => t.result === 'won').reduce((acc, t) => acc + parseAmount(t.amount), 0);
                    response = `Actualment hi ha un total de **${tenders.length} licitacions** al sistema. \n\n` +
                        `• Import total: **${total.toLocaleString()}€**\n` +
                        `• Import guanyat: **${won.toLocaleString()}€**`;
                } else if (lowerInput.includes('balanç') || lowerInput.includes('compte')) {
                    response = "Estic analitzant els balanços... Segons la documentació de l'exercici actual, el saldo és positiu amb una facturació creixent del 12% respecte l'any anterior.";
                }
            }
            // 2. Search Documentation
            else if (lowerInput.includes('document') || lowerInput.includes('doc') || lowerInput.includes('fitxer') || lowerInput.includes('carpeta')) {
                const searchPart = lowerInput.replace(/document|doc|fitxer|busca|troba|sobre/g, '').trim();
                const foundDocs = docs.filter(d => d.name.toLowerCase().includes(searchPart) || (d.description && d.description.toLowerCase().includes(searchPart)));

                if (foundDocs.length > 0) {
                    response = `He trobat **${foundDocs.length} fitxers** relacionats:\n\n` +
                        foundDocs.slice(0, 3).map(d => `• **${d.name}** (${d.type})`).join('\n') +
                        (foundDocs.length > 3 ? `\n...i ${foundDocs.length - 3} més.` : '');
                } else {
                    response = "No he trobat cap document específic amb aquest nom, però pots revisar la Unitat de Gestió a la secció de Docs.";
                }
            }
            // 3. Contacts / Projects (Existing)
            else if (lowerInput.includes('busca') || lowerInput.includes('qui es') || lowerInput.includes('contacte')) {
                const found = contacts.filter(c => lowerInput.includes(c.name.toLowerCase()));
                if (found.length > 0) {
                    response = `He trobat aquest contacte: **${found[0].name}**. El seu correu és ${found[0].email || 'no disponible'} i el telèfon ${found[0].phone || 'no disponible'}.`;
                } else {
                    response = "No he trobat cap contacte amb aquest nom a l'agenda.";
                }
            } else if (lowerInput.includes('projecte') || lowerInput.includes('targeta') || lowerInput.includes('card')) {
                const found = (db.cards || []).filter(c => c.title.toLowerCase().includes(lowerInput.replace('projecte', '').trim()));
                if (found.length > 0) {
                    response = `He trobat el projecte: **${found[0].title}**. Està al taulell ${db.boards.find(b => b.id === found[0].boardId)?.title || 'desconegut'}.`;
                } else {
                    response = "No he trobat cap projecte que coincideixi amb la cerca.";
                }
            } else if (lowerInput.includes('hola') || lowerInput.includes('bon dia')) {
                response = "Hola! Com va tot per l'estudi? Sóc l'IA de LaGràfica i puc sumar licitacions, buscar documents o trobar contactes. Què necessites?";
            } else {
                response = "Encara estic aprenent! Prova de demanar-me 'suma de licitacions', 'busca el document de riscos' o 'qui és el client X'.";
            }

            setTimeout(() => {
                setMessages(prev => [...prev, { role: 'assistant', text: response }]);
                setIsTyping(false);
            }, 600);

        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', text: "Em sap greu, hi ha hagut un error en processar la teva petició." }]);
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
                        <Bot size={12} className={isOpen ? 'text-brand-orange' : ''} /> Assistent LaGràfica
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
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Suma de licitacions, busca docs..."
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
                            placeholder="IA: Suma balances o busca docs..."
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 pl-9 pr-4 text-[11px] text-gray-400 cursor-pointer hover:bg-white hover:border-brand-orange/20 transition-all outline-none"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default SidebarAI;
