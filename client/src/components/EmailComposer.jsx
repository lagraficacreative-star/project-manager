import React, { useState } from 'react';
import { Send, X, User, Mail, AlignLeft } from 'lucide-react';
import { api } from '../api';

const EmailComposer = ({ isOpen, onClose, memberId, defaultTo, defaultSubject, defaultBody }) => {
    const [to, setTo] = useState(defaultTo || '');
    const [subject, setSubject] = useState(defaultSubject || '');
    const [body, setBody] = useState(defaultBody || '');
    const [sending, setSending] = useState(false);

    if (!isOpen) return null;

    const handleSend = async () => {
        if (!to || !subject || !body) {
            alert("Siusplau, omple tots els camps.");
            return;
        }

        setSending(true);
        try {
            const res = await api.sendEmail(memberId, to, subject, body);
            if (res.success) {
                alert("Correu enviat correctament!");
                onClose();
            } else {
                alert("Error al enviar el correu: " + res.error);
            }
        } catch (error) {
            console.error("Error sending email:", error);
            alert("Error al enviar el correu.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-orange/10 rounded-xl text-brand-orange">
                            <Mail size={20} />
                        </div>
                        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Redactar Resposta</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-brand-orange transition-all shadow-sm border border-transparent hover:border-gray-100">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <User size={12} className="text-brand-orange" /> Destinatari
                        </label>
                        <input
                            type="email"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            placeholder="email@exemple.com"
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Mail size={12} className="text-brand-orange" /> Assumpte
                        </label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Assumpte del correu"
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <AlignLeft size={12} className="text-brand-orange" /> Missatge
                        </label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Escriu la teva resposta aquí..."
                            rows={8}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange outline-none transition-all resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-xs font-bold text-gray-500 hover:text-gray-700 transition-all"
                    >
                        CANCEL·LAR
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={sending}
                        className="flex items-center gap-2 px-8 py-3 bg-brand-black text-white text-xs font-black rounded-2xl hover:bg-brand-orange transition-all shadow-lg hover:shadow-brand-orange/20 disabled:opacity-50"
                    >
                        {sending ? 'ENVIANT...' : 'ENVIAR RESPOSTA'}
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailComposer;
