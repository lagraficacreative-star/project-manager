import React, { useState, useRef, useEffect } from 'react';
import { Send, X, User, Mail, AlignLeft, Bold, Italic, List, Type, Paperclip, Trash2, ShieldCheck } from 'lucide-react';
import { api } from '../api';

const EmailComposer = ({ isOpen, onClose, memberId, defaultTo, defaultSubject, defaultBody, replyToId, cardId }) => {
    const [to, setTo] = useState(defaultTo || '');
    const [subject, setSubject] = useState(defaultSubject || '');
    const [sending, setSending] = useState(false);
    const [attachments, setAttachments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const editorRef = useRef(null);
    const fileInputRef = useRef(null);

    // Default signature for LaGràfica
    const signature = `
        <br/><br/>
        <div style="font-family: Arial, sans-serif; color: #333; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
            <p style="margin: 0; font-weight: bold; font-size: 14px; color: #f97316;">LaGràfica Creative Studio</p>
            <p style="margin: 0; font-size: 12px; color: #666;">C/ de la Creativitat, 25 | 25001 Lleida</p>
            <p style="margin: 0; font-size: 12px; color: #666;"><a href="https://lagrafica.cat" target="_blank" style="color: #f97316; text-decoration: none;">www.lagrafica.cat</a></p>
            <p style="margin: 5px 0 0 0; font-size: 10px; color: #999; line-height: 1.4;">
                Este mensaje y sus archivos adjuntos van dirigidos exclusivamente a su destinatario. 
                Si lo ha recibido por error, por favor, notifíquelo al emisor y elimínelo.
            </p>
        </div>
    `;

    useEffect(() => {
        if (isOpen) {
            setTo(defaultTo || '');
            setSubject(defaultSubject || '');
            setAttachments([]);

            if (editorRef.current) {
                let initialHtml = '';
                if (defaultBody) {
                    initialHtml = defaultBody.includes('</') ? defaultBody : defaultBody.replace(/\n/g, '<br/>');
                }
                editorRef.current.innerHTML = initialHtml + signature;
            }
        }
    }, [isOpen, defaultTo, defaultSubject, defaultBody, signature]);

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
                        path: res.url.replace('/uploads/', 'server/uploads/'),
                        url: res.url,
                        size: (file.size / 1024).toFixed(1) + ' KB'
                    }]);
                }
            }
        } catch (err) {
            console.error('Upload failed', err);
            alert('Error al cargar el archivo.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        setUploading(true);
        try {
            for (const file of files) {
                const res = await api.uploadFile(file);
                if (res.url) {
                    setAttachments(prev => [...prev, {
                        name: file.name,
                        path: res.url.replace('/uploads/', 'server/uploads/'),
                        url: res.url,
                        size: (file.size / 1024).toFixed(1) + ' KB'
                    }]);
                }
            }
        } catch (err) {
            console.error('Upload failed', err);
            alert('Error al cargar el archivo.');
        } finally {
            setUploading(false);
        }
    };

    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        const bodyContent = editorRef.current.innerHTML;
        if (!to || !subject || !bodyContent || bodyContent === signature) {
            alert('Por favor, rellena todos los campos.');
            return;
        }

        setSending(true);
        try {
            const fullHtml = `<html><head><meta charset="UTF-8"></head><body>${bodyContent}</body></html>`;
            const attachmentPaths = attachments.map(a => a.path);

            const res = await api.sendEmail(memberId, to, subject, fullHtml, replyToId, attachmentPaths);
            if (res.success || res.status === 'sent') {
                try {
                    let targetCardId = null;
                    const db = await api.getData();
                    const cards = db.cards || [];
                    const cleanSubject = subject.replace(/Re:|Fwd:|RE:|FWD:/gi, '').trim().toLowerCase();
                    const matchedCard = cards.find(c =>
                        c.title.toLowerCase().includes(cleanSubject) ||
                        cleanSubject.includes(c.title.toLowerCase())
                    );
                    targetCardId = matchedCard?.id;

                    if (targetCardId) {
                        await api.addCommentToCard(targetCardId, `--- EMAIL ENVIADO ---\nDestinatario: ${to}\nAsunto: ${subject}\n\n${bodyContent.replace(/<[^>]*>/g, '\n')}`, memberId);
                    }
                } catch (logErr) {
                    console.error('Failed to log email to card', logErr);
                }

                if (replyToId) {
                    try {
                        await api.moveEmail(memberId, replyToId, 'INBOX', 'Archivados');
                    } catch (moveErr) {
                        console.error('Failed to move replied email', moveErr);
                    }
                }

                console.log('Email sent result:', res);
                alert('¡Correo enviado correctamente!');
                onClose();
            } else {
                console.error('Email send failed:', res);
                alert('Error al enviar el correo: ' + (JSON.stringify(res.error) || 'Desconocido'));
            }
        } catch (error) {
            console.error('Error sending email:', error);
            alert('Error al enviar el correo.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-brand-black/60 backdrop-blur-md p-4 md:p-6 animate-in fade-in duration-300"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className={`bg-white rounded-[1.5rem] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border transition-all duration-300 ${isDragging ? 'border-brand-orange ring-4 ring-brand-orange/20 scale-[1.02]' : 'border-white/20'}`}>
                {isDragging && (
                    <div className="absolute inset-0 z-50 bg-brand-orange/10 backdrop-blur-[2px] border-4 border-dashed border-brand-orange m-4 rounded-[1.5rem] flex flex-col items-center justify-center animate-pulse pointer-events-none">
                        <Paperclip size={48} className="text-brand-orange mb-4" />
                        <p className="text-xl font-black text-brand-orange uppercase tracking-widest">Suelta para adjuntar</p>
                    </div>
                )}
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-orange rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                            <Mail size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-brand-black uppercase tracking-tight leading-none">Redactar Correo</h2>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">{memberId}@lagrafica.com</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-white rounded-xl text-gray-400 hover:text-brand-orange transition-all shadow-sm border border-transparent hover:border-gray-100 active:scale-95">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 leading-none">
                                <User size={12} className="text-brand-orange" /> Destinatario
                            </label>
                            <input
                                type="email"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                placeholder="cliente@ejemplo.com"
                                className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-xl text-[13px] font-bold focus:ring-4 focus:ring-brand-orange/5 outline-none transition-all placeholder:text-gray-300"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 leading-none">
                                <Mail size={12} className="text-brand-orange" /> Asunto
                            </label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Escribe el asunto..."
                                className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-xl text-[13px] font-bold focus:ring-4 focus:ring-brand-orange/5 outline-none transition-all placeholder:text-gray-300"
                            />
                        </div>
                    </div>

                    <div className="space-y-2 flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 leading-none">
                                <AlignLeft size={12} className="text-brand-orange" /> Mensaje Studio
                            </label>

                            <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-lg border border-gray-100 scale-90 origin-right">
                                <button onClick={() => execCommand('bold')} className="p-1.5 hover:bg-white hover:text-brand-orange rounded-md text-gray-400 transition-all active:scale-90" title="Negrita"><Bold size={14} /></button>
                                <button onClick={() => execCommand('italic')} className="p-1.5 hover:bg-white hover:text-brand-orange rounded-md text-gray-400 transition-all active:scale-90" title="Cursiva"><Italic size={14} /></button>
                                <div className="w-px h-3 bg-gray-200 mx-1"></div>
                                <button onClick={() => execCommand('insertUnorderedList')} className="p-1.5 hover:bg-white hover:text-brand-orange rounded-md text-gray-400 transition-all active:scale-90" title="Lista"><List size={14} /></button>
                                <button onClick={() => execCommand('removeFormat')} className="p-1.5 hover:bg-white hover:text-brand-orange rounded-md text-gray-400 transition-all active:scale-90" title="Limpiar formato"><Type size={14} /></button>
                            </div>
                        </div>

                        <div
                            ref={editorRef}
                            contentEditable
                            onKeyDown={handleKeyDown}
                            className="w-full p-5 bg-gray-50 border border-gray-100 rounded-xl text-[13px] font-medium focus:ring-4 focus:ring-brand-orange/5 outline-none transition-all min-h-[180px] overflow-y-auto font-sans leading-relaxed shadow-inner"
                            placeholder="Escribe tu respuesta aquí..."
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 leading-none">
                                <Paperclip size={12} className="text-brand-orange" /> Archivos Adjuntos
                            </label>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="text-[9px] font-black text-brand-orange uppercase tracking-widest hover:underline disabled:opacity-50"
                            >
                                {uploading ? 'CARGANDO...' : '+ AÑADIR'}
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                multiple
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {attachments.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl group hover:border-brand-orange/30 transition-all">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="p-1.5 bg-white rounded-lg text-gray-400 group-hover:text-brand-orange shadow-sm"><Paperclip size={12} /></div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold text-gray-800 truncate">{file.name}</p>
                                            <p className="text-[8px] font-bold text-gray-400 leading-none">{file.size}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => removeAttachment(idx)} className="p-1.5 text-gray-300 hover:text-red-500 active:scale-90 transition-all">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                            {attachments.length === 0 && !uploading && (
                                <div className="col-span-full py-4 border-2 border-dashed border-gray-100 rounded-2xl flex items-center justify-center">
                                    <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest italic leading-none">Sin archivos adjuntos</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 text-green-600">
                        <ShieldCheck size={16} />
                        <span className="text-[9px] font-black uppercase tracking-widest leading-none">Servidor Seguro Studio</span>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={onClose}
                            className="flex-1 md:flex-none px-6 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-all"
                        >
                            CANCELAR
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={sending || uploading}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-10 py-3.5 bg-brand-black text-white text-[9px] font-black rounded-xl hover:bg-brand-orange transition-all shadow-xl shadow-black/10 hover:shadow-brand-orange/30 disabled:opacity-50 active:scale-95"
                        >
                            {sending ? 'ENVIANDO...' : 'ENVIAR CORREO'}
                            <Send size={16} />
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
