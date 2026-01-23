import React, { useState, useRef, useEffect } from 'react';
import { Send, X, User, Mail, AlignLeft, Bold, Italic, List, Type } from 'lucide-react';
import { api } from '../api';

const EmailComposer = ({ isOpen, onClose, memberId, defaultTo, defaultSubject, defaultBody, replyToId }) => {
    const [to, setTo] = useState(defaultTo || '');
    const [subject, setSubject] = useState(defaultSubject || '');
    const [sending, setSending] = useState(false);
    const editorRef = useRef(null);

    useEffect(() => {
        if (isOpen && editorRef.current) {
            // Restore default body if provided
            if (defaultBody) {
                // Convert plain text to simple HTML (newlines to <br>)
                const html = defaultBody.replace(/\n/g, '<br/>');
                editorRef.current.innerHTML = html;
            } else {
                editorRef.current.innerHTML = '';
            }
        }
    }, [isOpen, defaultBody]);

    if (!isOpen) return null;

    const execCommand = (command, value = null) => {
        document.execCommand(command, false, value);
        editorRef.current.focus();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            // Insert 4 non-breaking spaces for tab
            document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
        }
    };

    const handleSend = async () => {
        const bodyContent = editorRef.current.innerHTML;
        if (!to || !subject || !bodyContent || bodyContent === '<br>') {
            alert("Siusplau, omple tots els camps.");
            return;
        }

        setSending(true);
        try {
            // Include <html> wrapper to trigger HTML mode in fetch_mails.py
            const fullHtml = `<html><body>${bodyContent}</body></html>`;
            const res = await api.sendEmail(memberId, to, subject, fullHtml, replyToId);
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
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
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
                <div className="p-8 space-y-6 overflow-y-auto">
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

                    <div className="space-y-2 flex flex-col flex-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <AlignLeft size={12} className="text-brand-orange" /> Missatge
                        </label>

                        {/* Toolbar */}
                        <div className="flex items-center gap-1 p-2 bg-white border border-gray-100 rounded-t-2xl border-b-0">
                            <button onClick={() => execCommand('bold')} className="p-2 hover:bg-gray-50 rounded-lg text-gray-600 transition-all active:scale-90" title="Negreta">
                                <Bold size={16} />
                            </button>
                            <button onClick={() => execCommand('italic')} className="p-2 hover:bg-gray-50 rounded-lg text-gray-600 transition-all active:scale-90" title="Cursiva">
                                <Italic size={16} />
                            </button>
                            <div className="w-px h-4 bg-gray-100 mx-1"></div>
                            <button onClick={() => execCommand('insertUnorderedList')} className="p-2 hover:bg-gray-50 rounded-lg text-gray-600 transition-all active:scale-90" title="Llista">
                                <List size={16} />
                            </button>
                            <button onClick={() => execCommand('removeFormat')} className="p-2 hover:bg-gray-50 rounded-lg text-gray-600 transition-all active:scale-90" title="Netejar format">
                                <Type size={16} />
                            </button>
                        </div>

                        <div
                            ref={editorRef}
                            contentEditable
                            onKeyDown={handleKeyDown}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-b-2xl text-sm font-medium focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange outline-none transition-all min-h-[200px] overflow-y-auto font-sans leading-relaxed"
                            placeholder="Escriu la teva resposta aquí..."
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
            <style dangerouslySetInnerHTML={{
                __html: `
                [contenteditable]:empty:before {
                    content: attr(placeholder);
                    color: #94a3b8;
                    font-style: italic;
                }
            `}} />
        </div>
    );
};

export default EmailComposer;
