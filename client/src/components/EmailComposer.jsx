import React, { useState, useRef, useEffect } from 'react';
import { Send, X, User, Mail, AlignLeft, Bold, Italic, List, Type, Paperclip, Trash2, ShieldCheck } from 'lucide-react';
import { api } from '../api';

const EmailComposer = ({ isOpen, onClose, memberId, defaultTo, defaultSubject, defaultBody, replyToId }) => {
    const [to, setTo] = useState(defaultTo || '');
    const [subject, setSubject] = useState(defaultSubject || '');
    const [sending, setSending] = useState(false);
    const [attachments, setAttachments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const editorRef = useRef(null);
    const fileInputRef = useRef(null);

    // Default signature for LaGràfica
    const signature = `
        <br/><br/>
        <div style="font-family: Arial, sans-serif; color: #333; margin-top: 20px; border-top: 1px solid #eee; pt: 15px;">
            <p style="margin: 0; font-weight: bold; font-size: 14px; color: #f97316;">LaGràfica Creative Studio</p>
            <p style="margin: 0; font-size: 12px; color: #666;">C/ de la Creativitat, 25 | 25001 Lleida</p>
            <p style="margin: 0; font-size: 12px; color: #666;"><a href="https://lagrafica.cat" target="_blank" style="color: #f97316; text-decoration: none;">www.lagrafica.cat</a></p>
            <p style="margin: 5px 0 0 0; font-size: 10px; color: #999; line-height: 1.4;">
                Aquest missatge i els seus fitxers adjunts van prohibits a qualsevol altra persona que no sigui el seu destinatari. 
                Si l'heu rebut per error, si us plau, notifiqueu-ho a l'emissor i elimineu-lo.
            </p>
        </div>
    `;

    useEffect(() => {
        if (isOpen && editorRef.current) {
            let initialHtml = '';
            if (defaultBody) {
                // If it looks like HTML, use it, otherwise convert newlines
                initialHtml = defaultBody.includes('</') ? defaultBody : defaultBody.replace(/\n/g, '<br/>');
            }

            // Append signature if it's not already there
            editorRef.current.innerHTML = initialHtml + signature;
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
            document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
        }
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        try {
            for (const file of files) {
                const res = await api.uploadFile(file);
                if (res.url) {
                    setAttachments(prev => [...prev, {
                        name: file.name,
                        path: res.url.replace('/uploads/', 'server/uploads/'), // Path for python
                        url: res.url,
                        size: (file.size / 1024).toFixed(1) + ' KB'
                    }]);
                }
            }
        } catch (err) {
            console.error("Upload failed", err);
            alert("Error al carregar l'arxiu.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        const bodyContent = editorRef.current.innerHTML;
        if (!to || !subject || !bodyContent || bodyContent === signature) {
            alert("Siusplau, omple tots els camps.");
            return;
        }

        setSending(true);
        try {
            // Include <html> wrapper
            const fullHtml = `<html><head><meta charset="UTF-8"></head><body>${bodyContent}</body></html>`;

            // Pass the server-side paths of attachments
            const attachmentPaths = attachments.map(a => a.path);

            const res = await api.sendEmail(memberId, to, subject, fullHtml, replyToId, attachmentPaths);
            if (res.success || res.status === 'sent') {
                alert("Correu enviat correctament!");
                onClose();
            } else {
                alert("Error al enviar el correu: " + (res.error || "Desconegut"));
            }
        } catch (error) {
            console.error("Error sending email:", error);
            alert("Error al enviar el correu.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-brand-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-white/20">
                {/* Header */}
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-orange rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                            <Mail size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-brand-black uppercase tracking-tight">Redactar Correu</h2>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{memberId}@lagrafica.com</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl text-gray-400 hover:text-brand-orange transition-all shadow-sm border border-transparent hover:border-gray-100 active:scale-95">
                        <X size={20} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-10 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <User size={14} className="text-brand-orange" /> Destinatari
                            </label>
                            <input
                                type="email"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                placeholder="client@exemple.com"
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand-orange/5 outline-none transition-all placeholder:text-gray-300"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Mail size={14} className="text-brand-orange" /> Assumpte
                            </label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Escriu l'assumpte..."
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand-orange/5 outline-none transition-all placeholder:text-gray-300"
                            />
                        </div>
                    </div>

                    <div className="space-y-3 flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <AlignLeft size={14} className="text-brand-orange" /> Missatge Studio
                            </label>

                            {/* Toolbar */}
                            <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-xl border border-gray-100">
                                <button onClick={() => execCommand('bold')} className="p-2 hover:bg-white hover:text-brand-orange rounded-lg text-gray-400 transition-all active:scale-90" title="Negreta"><Bold size={16} /></button>
                                <button onClick={() => execCommand('italic')} className="p-2 hover:bg-white hover:text-brand-orange rounded-lg text-gray-400 transition-all active:scale-90" title="Cursiva"><Italic size={16} /></button>
                                <div className="w-px h-4 bg-gray-200 mx-1"></div>
                                <button onClick={() => execCommand('insertUnorderedList')} className="p-2 hover:bg-white hover:text-brand-orange rounded-lg text-gray-400 transition-all active:scale-90" title="Llista"><List size={16} /></button>
                                <button onClick={() => execCommand('removeFormat')} className="p-2 hover:bg-white hover:text-brand-orange rounded-lg text-gray-400 transition-all active:scale-90" title="Netejar format"><Type size={16} /></button>
                            </div>
                        </div>

                        <div
                            ref={editorRef}
                            contentEditable
                            onKeyDown={handleKeyDown}
                            className="w-full p-8 bg-gray-50 border border-gray-100 rounded-[2rem] text-sm font-medium focus:ring-4 focus:ring-brand-orange/5 outline-none transition-all min-h-[300px] overflow-y-auto font-sans leading-relaxed shadow-inner"
                            placeholder="Escriu la teva resposta aquí..."
                        />
                    </div>

                    {/* Attachments Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Paperclip size={14} className="text-brand-orange" /> Fitxers Adjunts
                            </label>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="text-[10px] font-black text-brand-orange uppercase tracking-widest hover:underline disabled:opacity-50"
                            >
                                {uploading ? 'CARREGANT...' : '+ AFEGIR FITXER'}
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                multiple
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {attachments.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl group hover:border-brand-orange/30 transition-all">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2 bg-white rounded-lg text-gray-400 group-hover:text-brand-orange shadow-sm"><Paperclip size={14} /></div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-bold text-gray-800 truncate">{file.name}</p>
                                            <p className="text-[9px] font-bold text-gray-400">{file.size}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => removeAttachment(idx)} className="p-2 text-gray-300 hover:text-red-500 active:scale-90 transition-all">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            {attachments.length === 0 && !uploading && (
                                <div className="col-span-full py-6 border-2 border-dashed border-gray-100 rounded-3xl flex items-center justify-center">
                                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest italic">Sense fitxers adjunts</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 text-green-600">
                        <ShieldCheck size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Servidor Segur Studio</span>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button
                            onClick={onClose}
                            className="flex-1 md:flex-none px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-all"
                        >
                            CANCEL·LAR
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={sending || uploading}
                            className="flex-1 md:flex-none flex items-center justify-center gap-3 px-12 py-4 bg-brand-black text-white text-[10px] font-black rounded-2xl hover:bg-brand-orange transition-all shadow-xl shadow-black/10 hover:shadow-brand-orange/30 disabled:opacity-50 active:scale-95"
                        >
                            {sending ? 'ENVIANT...' : 'ENVIAR CORREU'}
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
                [contenteditable]:empty:before {
                    content: attr(placeholder);
                    color: #cbd5e1;
                    font-style: italic;
                    font-weight: 500;
                }
            `}} />
        </div>
    );
};

export default EmailComposer;
