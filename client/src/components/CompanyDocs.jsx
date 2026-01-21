import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Folder, FileText, Upload, Plus, ChevronRight, Download, Trash2, File, ArrowLeft, Save, Loader, Table, Link as LinkIcon, MessageSquare, ExternalLink, Globe, Send, Search, Calendar, Mail, CheckCircle, Circle, X } from 'lucide-react';


const CompanyDocs = ({ selectedUsers }) => {
    const [docs, setDocs] = useState([]);
    const [currentFolderId, setCurrentFolderId] = useState(null); // null = root
    const [path, setPath] = useState([{ id: null, name: 'Inicio' }]);
    const [loading, setLoading] = useState(false);

    // Editor State
    const [editingDoc, setEditingDoc] = useState(null); // The doc object being edited
    const [editorContent, setEditorContent] = useState('');
    const [editorComments, setEditorComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [saving, setSaving] = useState(false);

    // New Item State
    const [showNewFolder, setShowNewFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [searchTerm, setSearchTerm] = useState(''); // New filter state
    const [users, setUsers] = useState([]);
    const [embedUrl, setEmbedUrl] = useState(null); // URL to embed in iframe
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'embed'
    const [localDescription, setLocalDescription] = useState(''); // Corrected missing state hook
    const currentFolder = docs.find(d => d.id === currentFolderId);

    useEffect(() => {
        loadDocs();
    }, []);

    useEffect(() => {
        if (currentFolder) {
            setLocalDescription(currentFolder.description || '');
        }
    }, [currentFolderId, currentFolder?.description]);

    const loadDocs = async () => {
        setLoading(true);
        try {
            const data = await api.getDocuments();
            setDocs(data);
            const userData = await api.getUsers();
            setUsers(userData || []);
        } catch (error) {
            console.error("Failed to load docs", error);
        } finally {
            setLoading(false);
        }
    };

    const navigateTo = (folderId, folderName) => {
        setCurrentFolderId(folderId);
        setViewMode('grid');
        if (folderId === null) {
            setPath([{ id: null, name: 'Inicio' }]);
        } else {
            // Check if we are going back or forward
            const existingIdx = path.findIndex(p => p.id === folderId);
            if (existingIdx >= 0) {
                setPath(path.slice(0, existingIdx + 1));
            } else {
                setPath([...path, { id: folderId, name: folderName }]);
            }
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            await api.createDocument({
                name: newFolderName,
                type: 'folder',
                parentId: currentFolderId
            });
            setShowNewFolder(false);
            setNewFolderName('');
            loadDocs();
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateDoc = async (type = 'doc') => {
        let name = '';
        if (type === 'word') name = prompt("Nombre del documento Word:");
        else if (type === 'excel') name = prompt("Nombre de la hoja Excel:");
        else if (type === 'notes') name = prompt("Nombre del bloc de notas:");
        else if (type === 'dropbox' || type === 'drive') name = prompt(`Nombre del enlace a ${type}:`);
        else name = prompt("Nombre del documento:");

        if (!name) return;

        let url = '';
        if (type === 'dropbox' || type === 'drive') {
            url = prompt(`Introduce la URL de ${type}:`);
            if (!url) return;
        }

        try {
            const newDoc = await api.createDocument({
                name: name + (type === 'word' ? '.docx' : type === 'excel' ? '.xlsx' : type === 'notes' ? '.txt' : ''),
                type: type === 'notes' ? 'doc' : type,
                parentId: currentFolderId,
                content: type === 'excel' ? JSON.stringify([['', '', ''], ['', '', ''], ['', '', '']]) : '',
                url: url
            });
            loadDocs();
            if (type !== 'dropbox' && type !== 'drive') {
                openEditor(newDoc);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpload = async (e) => {
        if (!e.target.files.length) return;
        const file = e.target.files[0];
        try {
            const result = await api.uploadFile(file);
            await api.createDocument({
                name: file.name,
                type: 'file',
                parentId: currentFolderId,
                url: result.url
            });
            loadDocs();
        } catch (error) {
            alert("Error al subir archivo");
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!confirm("¿Seguro que quieres eliminar este elemento?")) return;
        await api.deleteDocument(id);
        loadDocs();
    };

    // Editor Logic
    const openEditor = (doc) => {
        setEditingDoc(doc);
        setEditorContent(doc.content || '');
        setEditorComments(doc.comments || []);
    };

    const saveDoc = async () => {
        if (!editingDoc) return;
        setSaving(true);
        try {
            await api.updateDocument(editingDoc.id, {
                content: editorContent,
                comments: editorComments
            });
            // Update local state
            setDocs(prev => prev.map(d => d.id === editingDoc.id ? { ...d, content: editorContent, comments: editorComments } : d));
            setEditingDoc(null);
        } catch (error) {
            alert("Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    const handleAddComment = () => {
        if (!newComment.trim()) return;
        const comment = {
            id: Date.now(),
            text: newComment,
            author: 'Montse', // Mock Current User
            date: new Date().toISOString()
        };
        setEditorComments(prev => [...prev, comment]);
        setNewComment('');
    };

    // Link Management
    const handleAddLink = async () => {
        const title = prompt("Título del enlace:");
        const url = prompt("URL del enlace:");
        if (!title || !url) return;

        const currentFolder = docs.find(d => d.id === currentFolderId);
        if (!currentFolder) return;

        const newLink = {
            id: Date.now(),
            title,
            url,
            date: new Date().toISOString() // Added date as requested
        };
        const updatedLinks = [...(currentFolder.links || []), newLink];

        // Optimistic State Update
        setDocs(prev => prev.map(d => d.id === currentFolderId ? { ...d, links: updatedLinks } : d));

        try {
            await api.updateDocument(currentFolderId, { links: updatedLinks });
        } catch (err) {
            alert("Error al añadir enlace");
            loadDocs(); // Rollback
        }
    };

    const handleDeleteLink = async (linkId) => {
        if (!confirm("¿Eliminar este enlace?")) return;
        const currentFolder = docs.find(d => d.id === currentFolderId);
        const updatedLinks = currentFolder.links.filter(l => l.id !== linkId);
        try {
            await api.updateDocument(currentFolderId, { links: updatedLinks });
            setDocs(prev => prev.map(d => d.id === currentFolderId ? { ...d, links: updatedLinks } : d));
        } catch (err) {
            alert("Error al eliminar enlace");
        }
    };

    const handleUpdateFolderField = async (field, value) => {
        if (!currentFolderId) return;

        // Optimistic update for snappiness
        setDocs(prev => prev.map(d => d.id === currentFolderId ? { ...d, [field]: value } : d));

        try {
            // No await here or wrap in debounce for text areas to avoid constant API noise, 
            // but for simple fields like description we can just send it.
            await api.updateDocument(currentFolderId, { [field]: value });
        } catch (err) {
            console.error("Failed to update folder field", err);
        }
    };

    const handleToggleChecklistItem = (itemId) => {
        const currentFolder = docs.find(d => d.id === currentFolderId);
        const updatedChecklist = (currentFolder.checklist || []).map(item =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        handleUpdateFolderField('checklist', updatedChecklist);
    };

    const handleAddChecklistItem = (text) => {
        if (!text.trim()) return;
        const currentFolder = docs.find(d => d.id === currentFolderId);
        const newItem = {
            id: Date.now(),
            text,
            completed: false,
            date: new Date().toISOString() // Added date as requested
        };
        const updatedChecklist = [...(currentFolder.checklist || []), newItem];
        handleUpdateFolderField('checklist', updatedChecklist);
    };

    const handleRemoveChecklistItem = (itemId) => {
        const currentFolder = docs.find(d => d.id === currentFolderId);
        const updatedChecklist = (currentFolder.checklist || []).filter(item => item.id !== itemId);
        handleUpdateFolderField('checklist', updatedChecklist);
    };

    const handleOpenEmbed = (url) => {
        // Convert google doc/sheet url to embedded version if possible
        let embedded = url;
        if (url.includes('docs.google.com')) {
            if (url.includes('/edit')) {
                embedded = url.replace('/edit', '/preview');
            } else if (!url.includes('/preview')) {
                embedded = url + (url.endsWith('/') ? 'preview' : '/preview');
            }
        }
        setEmbedUrl(embedded);
        setViewMode('embed');
    };

    const getCurrentItems = () => {
        let items = docs.filter(d => d.parentId === currentFolderId);
        if (searchTerm) {
            items = items.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return items;
    };



    if (editingDoc) {
        const isExcel = editingDoc.type === 'excel';
        let excelData = [];
        if (isExcel) {
            try {
                excelData = JSON.parse(editorContent || '[["","",""],["","",""],["","",""]]');
            } catch (e) {
                excelData = [['Error', 'al', 'cargar']];
            }
        }

        const handleExcelChange = (r, c, val) => {
            const newData = [...excelData];
            newData[r][c] = val;
            setEditorContent(JSON.stringify(newData));
        };

        const addRow = () => {
            const numCols = excelData[0]?.length || 3;
            setEditorContent(JSON.stringify([...excelData, Array(numCols).fill('')]));
        };

        const addCol = () => {
            setEditorContent(JSON.stringify(excelData.map(row => [...row, ''])));
        };

        return (
            <div className="flex h-full bg-gray-100 rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Main Editor Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Editor Toolbar */}
                    <div className="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setEditingDoc(null)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-500">
                                <ArrowLeft size={20} />
                            </button>
                            {editingDoc.type === 'word' ? <FileText className="text-blue-500" size={20} /> :
                                editingDoc.type === 'excel' ? <Table className="text-green-600" size={20} /> :
                                    <FileText className="text-gray-500" size={20} />}
                            <h2 className="font-bold text-gray-800">{editingDoc.name}</h2>
                        </div>
                        <div className="flex gap-2">
                            {editingDoc.type === 'word' && (
                                <div className="flex bg-white rounded-lg border border-gray-200 p-1 mr-4">
                                    <button className="p-1 hover:bg-gray-100 rounded text-gray-600 font-bold w-8" title="Bold">B</button>
                                    <button className="p-1 hover:bg-gray-100 rounded text-gray-600 italic w-8" title="Italic">I</button>
                                    <button className="p-1 hover:bg-gray-100 rounded text-gray-600 underline w-8" title="Underline">U</button>
                                </div>
                            )}
                            {editingDoc.type === 'excel' && (
                                <div className="flex gap-1 mr-4">
                                    <button onClick={addRow} className="px-2 py-1 bg-white border border-gray-200 rounded text-[10px] font-bold hover:bg-gray-50">+ Fila</button>
                                    <button onClick={addCol} className="px-2 py-1 bg-white border border-gray-200 rounded text-[10px] font-bold hover:bg-gray-50">+ Col</button>
                                </div>
                            )}
                            <button
                                onClick={saveDoc}
                                disabled={saving}
                                className="flex items-center gap-2 bg-brand-black text-white px-4 py-2 rounded-lg font-bold hover:bg-brand-orange transition-colors disabled:opacity-50"
                            >
                                {saving ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
                                Guardar
                            </button>
                        </div>
                    </div>

                    {/* Editor Canvas */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
                        <div className={`w-full max-w-4xl bg-white shadow-lg min-h-[800px] p-12 rounded-sm border border-gray-200 ${editingDoc.type === 'word' ? 'font-serif' : 'font-sans'}`}>
                            {editingDoc.type === 'excel' ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <tbody>
                                            {excelData.map((row, rIdx) => (
                                                <tr key={rIdx}>
                                                    {row.map((cell, cIdx) => (
                                                        <td key={cIdx} className="border border-gray-300 p-0">
                                                            <input
                                                                type="text"
                                                                value={cell}
                                                                onChange={(e) => handleExcelChange(rIdx, cIdx, e.target.value)}
                                                                className="w-full p-2 border-none focus:ring-2 focus:ring-green-500 focus:bg-green-50 transition-all text-sm h-full min-w-[100px]"
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <textarea
                                    value={editorContent}
                                    onChange={(e) => setEditorContent(e.target.value)}
                                    className="w-full h-full resize-none focus:outline-none text-gray-800 leading-relaxed text-lg bg-transparent placeholder-gray-300"
                                    placeholder="Comienza a escribir aquí..."
                                    autoFocus
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Comments Sidebar */}
                <div className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                        <MessageSquare size={18} className="text-brand-orange" />
                        <h3 className="font-bold text-gray-800">Comentarios</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {editorComments.length === 0 ? (
                            <p className="text-center text-gray-400 italic text-sm py-10">No hay comentarios aún.</p>
                        ) : (
                            editorComments.map(c => (
                                <div key={c.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-brand-black">{c.author}</span>
                                        <span className="text-[10px] text-gray-400">{new Date(c.date).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-xs text-gray-700 leading-relaxed">{c.text}</p>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t border-gray-100 bg-gray-50">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Escribe un comentario..."
                                className="flex-1 p-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-brand-orange bg-white"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                            />
                            <button
                                onClick={handleAddComment}
                                className="p-2 bg-brand-black text-white rounded-lg hover:bg-brand-orange transition-colors"
                            >
                                <Send size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header / Breadcrumbs */}
            <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div className="flex flex-col min-w-0 w-full sm:w-auto">
                    <h1 className="text-lg md:text-xl font-black text-brand-black flex items-center gap-2 uppercase tracking-tight">
                        <Folder className="text-brand-orange" size={20} md={24} />
                        <span className="truncate">{currentFolderId ? currentFolder.name : 'Gestor Documental'}</span>
                    </h1>
                    <div className="flex flex-wrap items-center text-[9px] md:text-[10px] text-gray-400 mt-0.5 ml-7 md:ml-8 uppercase font-bold tracking-widest pb-1 gap-y-1">
                        <span className="hover:text-brand-orange cursor-pointer transition-colors" onClick={() => setCurrentFolderId(null)}>Home</span>
                        {getBreadcrumbs().map((b, i) => (
                            <React.Fragment key={b.id}>
                                <ChevronRight size={10} className="mx-1 shrink-0" />
                                <span
                                    className={`hover:text-brand-orange cursor-pointer transition-colors ${i === getBreadcrumbs().length - 1 ? 'text-gray-600 font-black' : ''}`}
                                    onClick={() => setCurrentFolderId(b.id)}
                                >
                                    {b.name}
                                </span>
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-48 shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-brand-orange/20 transition-all font-medium"
                        />
                    </div>
                    <button onClick={() => setShowNewFolder(true)} className="flex items-center gap-2 px-3 md:px-4 py-2 bg-brand-black text-white rounded-full hover:bg-brand-orange font-black text-[9px] md:text-[10px] transition-all uppercase shadow-lg shadow-black/5 active:scale-95 whitespace-nowrap">
                        <Plus size={14} strokeWidth={3} /> <span className="hidden xs:inline">Nueva Unidad</span><span className="xs:hidden">Nueva</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50/30">
                {currentFolderId === null ? (
                    /* HOME DASHBOARD VIEW */
                    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
                        {/* Member Filter */}


                        <div className="flex flex-col gap-8">
                            {/* Left Column: Management Units */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="flex justify-between items-end px-2">
                                    <h2 className="text-lg font-black text-brand-black uppercase tracking-tighter">Unidades de Gestión</h2>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">{docs.filter(d => d.parentId === null).length} Unidades</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {docs.filter(d => d.parentId === null && d.type === 'folder').map(folder => (
                                        <div
                                            key={folder.id}
                                            onClick={() => navigateTo(folder.id, folder.name)}
                                            className="group bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-brand-orange/5 hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-orange/5 rounded-full -mr-8 -mt-8 group-hover:bg-brand-orange/10 transition-colors" />
                                            <div className="flex items-start justify-between mb-4 relative z-10">
                                                <div className="p-3 bg-brand-orange text-white rounded-2xl shadow-lg shadow-brand-orange/20">
                                                    <Folder size={24} />
                                                </div>
                                                <button onClick={(e) => handleDelete(folder.id, e)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <h3 className="text-xl font-black text-brand-black mb-1 group-hover:text-brand-orange transition-colors">{folder.name}</h3>
                                            <p className="text-xs text-gray-400 font-medium">Gestión interna de {folder.name.toLowerCase()}</p>
                                            <div className="mt-6 flex items-center justify-between">
                                                <div className="flex -space-x-2">
                                                    <div className="w-6 h-6 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-[10px] text-blue-600 font-bold" title="Docs">D</div>
                                                    <div className="w-6 h-6 rounded-full border-2 border-white bg-green-100 flex items-center justify-center text-[10px] text-green-600 font-bold" title="Sheets">S</div>
                                                    <div className="w-6 h-6 rounded-full border-2 border-white bg-yellow-100 flex items-center justify-center text-[10px] text-yellow-600 font-bold" title="Drive">G</div>
                                                </div>
                                                <span className="text-[10px] font-black uppercase text-brand-orange group-hover:underline">Abrir Unidad</span>
                                            </div>
                                        </div>
                                    ))}
                                    {showNewFolder && (
                                        <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-brand-orange/30 animate-pulse flex flex-col justify-center">
                                            <input
                                                autoFocus
                                                value={newFolderName}
                                                onChange={(e) => setNewFolderName(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                                                placeholder="Nombre de la unidad..."
                                                className="w-full bg-transparent border-none text-xl font-bold focus:ring-0 placeholder-gray-300"
                                            />
                                            <div className="flex gap-2 mt-4">
                                                <button onClick={handleCreateFolder} className="flex-1 py-2 bg-brand-orange text-white rounded-xl font-bold text-xs">Crear</button>
                                                <button onClick={() => setShowNewFolder(false)} className="flex-1 py-2 bg-gray-100 text-gray-500 rounded-xl font-bold text-xs">Cancelar</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Home Features (Now following previous blocks) */}
                            <div className="w-full space-y-6">
                                {/* Shared Calendar Section */}
                                <div className="bg-brand-black p-6 rounded-3xl text-white shadow-xl">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-white/10 rounded-xl">
                                            <Calendar size={20} className="text-brand-orange" />
                                        </div>
                                        <div>
                                            <h3 className="font-black uppercase text-sm tracking-widest text-white/50">Calendario Gestión</h3>
                                            <p className="text-xs font-bold truncate">gestiolagrafica@gmail.com</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <p className="text-[10px] text-white/40 leading-relaxed font-bold uppercase tracking-widest">Plazos, contabilidad, impuestos y cobros</p>
                                        <a
                                            href="https://calendar.google.com/calendar/u/0/r"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block w-full py-4 bg-brand-orange text-center rounded-2xl font-black text-xs uppercase hover:bg-white hover:text-brand-black transition-all shadow-lg shadow-brand-orange/20 active:scale-95"
                                        >
                                            Ver Calendario Compartido
                                        </a>
                                    </div>
                                </div>

                                {/* WRITING WORKSPACE HOME - DIRECT INTEGRATION */}
                                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
                                    <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                                        <div className="flex items-center gap-2">
                                            <FileText size={16} className="text-brand-orange" />
                                            <h3 className="font-black text-[10px] uppercase tracking-widest text-brand-black">Bloc de Notas General</h3>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const homeDoc = docs.find(d => d.id === 'doc_home_notes');
                                                if (homeDoc) openEditor(homeDoc);
                                            }}
                                            className="text-[10px] font-black text-brand-orange hover:underline uppercase bg-brand-orange/10 px-3 py-1 rounded-full"
                                        >
                                            Ampliar Editor
                                        </button>
                                    </div>
                                    <div className="flex-1 p-0 relative">
                                        {/* Embedded Internal Writing Area */}
                                        <textarea
                                            value={docs.find(d => d.id === 'doc_home_notes')?.content || ''}
                                            onChange={async (e) => {
                                                const newContent = e.target.value;
                                                setDocs(prev => prev.map(d => d.id === 'doc_home_notes' ? { ...d, content: newContent } : d));
                                                // Debounced or direct save for home notes
                                                try {
                                                    await api.updateDocument('doc_home_notes', { content: newContent });
                                                } catch (err) { }
                                            }}
                                            placeholder="Escribe aquí notas rápidas, avisos o tareas generales..."
                                            className="w-full h-full p-8 bg-transparent border-none focus:ring-0 text-xs text-gray-700 leading-relaxed resize-none font-medium"
                                        />
                                    </div>
                                </div>

                                {/* Integrated Dashboard Calendar */}
                                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-[400px]">
                                    <div className="p-6 border-b border-gray-50 flex items-center gap-2">
                                        <Calendar size={16} className="text-brand-orange" />
                                        <h3 className="font-black text-[10px] uppercase tracking-widest text-brand-black">Vista de Calendario</h3>
                                    </div>
                                    <div className="h-full w-full bg-gray-50">
                                        {/* Embedded Google Calendar for quick view */}
                                        <iframe
                                            src="https://calendar.google.com/calendar/embed?src=gestiolagrafica%40gmail.com&ctz=Europe%2FMadrid&mode=AGENDA"
                                            className="w-full h-full border-none opacity-80 hover:opacity-100 transition-opacity"
                                            title="Google Calendar Agenda"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : viewMode === 'embed' ? (
                    <div className="flex flex-col h-full bg-white">
                        <div className="bg-gray-100 p-2 flex justify-between items-center border-b">
                            <button onClick={() => setViewMode('grid')} className="flex items-center gap-2 px-3 py-1 bg-white border rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors">
                                <ArrowLeft size={14} /> Volver a Unidad
                            </button>
                            <a href={embedUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-brand-orange hover:underline flex items-center gap-1 uppercase">
                                Abrir en pestaña nueva <ExternalLink size={10} />
                            </a>
                        </div>
                        <iframe
                            src={embedUrl}
                            className="flex-1 w-full border-none"
                            title="Embedded Content"
                            allow="autoplay"
                        />
                    </div>
                ) : (
                    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Header with Back button for better usability */}
                        <div className="flex items-center gap-4 mb-2">
                            <button
                                onClick={() => navigateTo(null, 'Inicio')}
                                className="p-2 md:p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:bg-gray-50 text-brand-black transition-all active:scale-90"
                                title="Volver al inicio"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h2 className="text-xl md:text-2xl font-black text-brand-black uppercase tracking-tight leading-none truncate max-w-[200px] xs:max-w-none">{currentFolder?.name}</h2>
                                <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Unidad de Gestión Operativa</p>
                            </div>
                        </div>

                        {/* 4 Standard Action Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                            <button
                                onClick={() => handleOpenEmbed(currentFolder?.notesUrl || 'https://docs.google.com/document/create')}
                                className="bg-blue-50 p-4 md:p-6 rounded-3xl border border-blue-100 hover:shadow-xl hover:shadow-blue-500/10 transition-all group overflow-hidden relative text-left"
                            >
                                <div className="absolute -right-4 -bottom-4 text-blue-100/50 group-hover:scale-110 transition-transform">
                                    <FileText size={80} md={100} />
                                </div>
                                <h3 className="text-blue-600 font-extrabold text-xs md:text-sm uppercase mb-1">Notas</h3>
                                <p className="text-[9px] text-blue-500/80 font-bold mb-4">Google Docs</p>
                                <div className="flex items-center gap-1 text-blue-600 font-black text-[9px] uppercase">
                                    Abrir <ExternalLink size={10} />
                                </div>
                            </button>

                            <button
                                onClick={() => handleOpenEmbed(currentFolder?.sheetUrl || 'https://docs.google.com/spreadsheets/create')}
                                className="bg-green-50 p-4 md:p-6 rounded-3xl border border-green-100 hover:shadow-xl hover:shadow-green-500/10 transition-all group overflow-hidden relative text-left"
                            >
                                <div className="absolute -right-4 -bottom-4 text-green-100/50 group-hover:scale-110 transition-transform">
                                    <Table size={80} md={100} />
                                </div>
                                <h3 className="text-green-600 font-extrabold text-xs md:text-sm uppercase mb-1">Gestión</h3>
                                <p className="text-[9px] text-green-500/80 font-bold mb-4">Google Sheets</p>
                                <div className="flex items-center gap-1 text-green-600 font-black text-[9px] uppercase">
                                    Abrir <ExternalLink size={10} />
                                </div>
                            </button>

                            <a
                                href={currentFolder?.driveUrl || '#'} target="_blank" rel="noreferrer"
                                className="bg-yellow-50 p-4 md:p-6 rounded-3xl border border-yellow-100 hover:shadow-xl hover:shadow-yellow-500/10 transition-all group overflow-hidden relative block"
                            >
                                <div className="absolute -right-4 -bottom-4 text-yellow-100/50 group-hover:scale-110 transition-transform">
                                    <Globe size={80} md={100} />
                                </div>
                                <h3 className="text-yellow-700 font-extrabold text-xs md:text-sm uppercase mb-1">Drive</h3>
                                <p className="text-[9px] text-yellow-600/80 font-bold mb-4">Google Drive</p>
                                <div className="flex items-center gap-1 text-yellow-700 font-black text-[9px] uppercase">
                                    Ir a <ExternalLink size={10} />
                                </div>
                            </a>

                            <button
                                onClick={handleAddLink}
                                className="bg-brand-black p-4 md:p-6 rounded-3xl text-white hover:bg-brand-orange transition-all flex flex-col items-center justify-center text-center group active:scale-95 shadow-lg shadow-black/10"
                            >
                                <div className="p-2 md:p-3 bg-white/10 rounded-full mb-1 group-hover:bg-white/20">
                                    <LinkIcon size={20} md={24} />
                                </div>
                                <span className="font-black text-[9px] md:text-[10px] uppercase tracking-widest">Recurso</span>
                                <span className="text-[8px] text-white/50 mt-1 uppercase hidden xs:block">Enlace Externo</span>
                            </button>
                        </div>

                        <div className="flex flex-col gap-8">
                            {/* Main Content: Description, Checklist & Files */}
                            <div className="w-full space-y-6">
                                {/* Description Card */}
                                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden text-balance">
                                    <div className="p-4 md:p-6 border-b border-gray-50 flex items-center gap-2">
                                        <MessageSquare size={18} className="text-brand-orange" />
                                        <h3 className="font-black text-[10px] uppercase tracking-widest text-brand-black">Descripción y Objetivos</h3>
                                    </div>
                                    <div className="p-4 md:p-6">
                                        <textarea
                                            value={localDescription}
                                            onChange={(e) => setLocalDescription(e.target.value)}
                                            onBlur={() => handleUpdateFolderField('description', localDescription)}
                                            placeholder="Introduce los objetivos..."
                                            className="w-full h-32 p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-brand-orange/20 text-xs text-gray-700 leading-relaxed resize-none placeholder-gray-300 font-medium"
                                        />
                                    </div>
                                </div>

                                {/* Checklist Card */}
                                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="p-4 md:p-6 border-b border-gray-50 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle size={18} className="text-green-500" />
                                            <h3 className="font-black text-[10px] uppercase tracking-widest text-brand-black">Pendientes</h3>
                                        </div>
                                    </div>
                                    <div className="p-4 md:p-6 space-y-4">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Nueva tarea..."
                                                className="flex-1 p-3 bg-gray-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-brand-orange/20 font-medium"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleAddChecklistItem(e.target.value);
                                                        e.target.value = '';
                                                    }
                                                }}
                                            />
                                            <button
                                                onClick={(e) => {
                                                    const input = e.currentTarget.previousSibling;
                                                    handleAddChecklistItem(input.value);
                                                    input.value = '';
                                                }}
                                                className="px-4 py-2 bg-brand-black text-white rounded-xl font-bold text-xs"
                                            >
                                                Añadir
                                            </button>
                                        </div>
                                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                            {(currentFolder?.checklist || []).length === 0 ? (
                                                <p className="text-center py-6 text-[10px] text-gray-300 font-bold uppercase">No hay tareas pendientes</p>
                                            ) : (
                                                currentFolder.checklist.map(item => (
                                                    <div key={item.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-2xl group transition-all">
                                                        <button onClick={() => handleToggleChecklistItem(item.id)} className={`${item.completed ? 'text-green-500' : 'text-gray-300'} transition-colors shrink-0`}>
                                                            {item.completed ? <CheckCircle size={20} /> : <Circle size={20} />}
                                                        </button>
                                                        <span className={`flex-1 text-xs font-medium ${item.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                                            {item.text}
                                                            <span className="block text-[8px] text-gray-300 font-bold mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {item.date ? new Date(item.date).toLocaleDateString() : ''}
                                                            </span>
                                                        </span>
                                                        <button onClick={() => handleRemoveChecklistItem(item.id)} className="p-1 text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center">
                                        <h3 className="font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                                            <FileText size={18} className="text-brand-orange" /> Archivos
                                        </h3>
                                        <div className="relative">
                                            <input type="file" onChange={handleUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-brand-black rounded-lg hover:bg-gray-200 font-bold text-[10px] transition-colors uppercase">
                                                <Upload size={12} /> Subir
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4 md:p-6 min-h-[200px]">
                                        {getCurrentItems().length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-10 opacity-20 text-center">
                                                <Upload size={48} className="mb-4" />
                                                <p className="text-[10px] font-black uppercase">Arrastra archivos aquí</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-x-hidden">
                                                {getCurrentItems().map(item => (
                                                    <div key={item.id} className="group relative bg-gray-50 p-4 rounded-2xl border border-transparent hover:border-brand-orange/20 hover:bg-white hover:shadow-xl hover:shadow-brand-orange/5 transition-all cursor-pointer overflow-hidden">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="p-2 bg-white rounded-xl shadow-sm">
                                                                <File size={16} className="text-gray-400 group-hover:text-brand-orange transition-colors" />
                                                            </div>
                                                            <button onClick={(e) => handleDelete(item.id, e)} className="p-1.5 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                        <p className="text-[10px] font-bold text-brand-black truncate group-hover:text-brand-orange transition-colors">{item.name}</p>
                                                        <p className="text-[8px] text-gray-400 mt-1 uppercase font-black tracking-widest">{new Date(item.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar: External Links, Email & Metadata */}
                            <div className="space-y-6">
                                {/* External Links Section */}
                                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="p-4 md:p-6 border-b border-gray-100">
                                        <h3 className="font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                                            <LinkIcon size={18} className="text-brand-orange" /> Recursos
                                        </h3>
                                    </div>
                                    <div className="p-4 md:p-6">
                                        {(currentFolder?.links || []).length === 0 ? (
                                            <p className="text-center py-6 text-[10px] text-gray-300 font-bold uppercase tracking-widest">Sin enlaces</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {currentFolder.links.map(link => (
                                                    <div key={link.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100 group">
                                                        <a href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 flex-1 overflow-hidden">
                                                            <div className="flex flex-col flex-1 overflow-hidden">
                                                                <span className="text-xs font-bold text-brand-black truncate">{link.title}</span>
                                                                <span className="text-[8px] text-gray-400 font-bold uppercase">{link.date ? new Date(link.date).toLocaleDateString() : ''}</span>
                                                            </div>
                                                        </a>
                                                        <button onClick={() => handleDeleteLink(link.id)} className="p-1 text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Linked Emails List */}
                                <div className="bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                                    <h4 className="font-black text-[10px] uppercase tracking-widest text-gray-400">Correos</h4>
                                    {(currentFolder?.emails || []).length === 0 ? (
                                        <div className="text-center py-4 border-2 border-dashed border-gray-50 rounded-2xl">
                                            <p className="text-[10px] text-gray-300 font-bold uppercase">Sin correos</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {currentFolder.emails.map(email => (
                                                <div key={email.id} className="p-2 hover:bg-gray-50 rounded-xl border border-transparent hover:border-gray-100 transition-all cursor-pointer">
                                                    <p className="text-[10px] font-bold text-brand-black truncate">{email.subject}</p>
                                                    <p className="text-[8px] text-gray-400 font-bold uppercase">{new Date(email.date).toLocaleDateString()}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Last Update Info */}
                                <div className="bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                                    <h4 className="font-black text-[10px] uppercase tracking-widest text-gray-400">Información</h4>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-brand-lightgray flex items-center justify-center text-[10px] font-bold text-gray-500 uppercase">M</div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-gray-400">Modificado por</p>
                                            <p className="text-xs font-bold text-brand-black">{currentFolder?.updatedBy || 'Montse'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-gray-400">Última actualización</p>
                                        <p className="text-xs font-bold text-brand-black">
                                            {currentFolder?.updatedAt ? new Date(currentFolder.updatedAt).toLocaleString() : 'Recientemente'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompanyDocs;
