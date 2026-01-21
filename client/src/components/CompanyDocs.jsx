import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Folder, FileText, Upload, Plus, ChevronRight, Download, Trash2, File, ArrowLeft, Save, Loader, Table, Link as LinkIcon, MessageSquare, ExternalLink, Globe, Send } from 'lucide-react';
import MemberFilter from './MemberFilter';

const CompanyDocs = () => {
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
    const [newFolderName, setNewFolderName] = useState('');
    const [users, setUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]); // Filter State

    useEffect(() => {
        loadDocs();
    }, []);

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
                name: name + (type === 'word' ? '.docx' : type === 'excel' ? '.xlsx' : ''),
                type: type,
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

    const getCurrentItems = () => {
        return docs.filter(d => d.parentId === currentFolderId);
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
            {/* Header */}
            <div className="bg-white border-b border-gray-100 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-brand-black flex items-center gap-2">
                        <Folder className="text-brand-orange" /> Gestor Documental
                    </h1>
                    <div className="flex gap-2">
                        <button onClick={() => handleCreateDoc('word')} className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-bold text-xs transition-colors">
                            <FileText size={14} /> Word
                        </button>
                        <button onClick={() => handleCreateDoc('excel')} className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 font-bold text-xs transition-colors">
                            <Table size={14} /> Excel
                        </button>
                        <button onClick={() => handleCreateDoc('dropbox')} className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100 font-bold text-xs transition-colors">
                            <Globe size={14} /> Dropbox
                        </button>
                        <button onClick={() => handleCreateDoc('drive')} className="flex items-center gap-2 px-3 py-2 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 font-bold text-xs transition-colors">
                            <ExternalLink size={14} /> Drive
                        </button>
                        <div className="w-px h-8 bg-gray-100 mx-1" />
                        <div className="relative">
                            <input
                                type="file"
                                onChange={handleUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-bold text-xs transition-colors">
                                <Upload size={14} /> Subir
                            </button>
                        </div>
                        <button onClick={() => setShowNewFolder(true)} className="flex items-center gap-2 px-3 py-2 bg-brand-black text-white rounded-lg hover:bg-brand-orange font-bold text-xs transition-colors">
                            <Plus size={14} /> Carpeta
                        </button>
                    </div>
                </div>

                {/* Breadcrumbs */}
                <div className="flex items-center text-sm text-gray-500 overflow-x-auto pb-1">
                    {path.map((folder, idx) => (
                        <div key={folder.id || 'root'} className="flex items-center whitespace-nowrap">
                            {idx > 0 && <ChevronRight size={14} className="mx-2 text-gray-300" />}
                            <span
                                onClick={() => navigateTo(folder.id, folder.name)}
                                className={`cursor-pointer hover:text-brand-orange hover:underline font-medium transition-colors ${idx === path.length - 1 ? 'text-brand-black font-bold' : ''}`}
                            >
                                {folder.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Member Filter Row */}
            {!editingDoc && (
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                    <MemberFilter
                        users={users}
                        selectedUsers={selectedUsers}
                        onToggleUser={(id) => setSelectedUsers(prev => prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id])}
                        onClear={() => setSelectedUsers([])}
                    />
                </div>
            )}

            {/* Content Grid */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                {showNewFolder && (
                    <div className="mb-4 flex gap-2 items-center bg-white p-3 rounded-lg border border-brand-orange shadow-sm animate-in fade-in slide-in-from-top-2">
                        <Folder className="text-brand-orange" size={20} />
                        <input
                            type="text"
                            placeholder="Nombre de la carpeta..."
                            autoFocus
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                            className="flex-1 border-none focus:ring-0 text-sm"
                        />
                        <button onClick={() => setShowNewFolder(false)} className="text-gray-400 hover:text-gray-600">×</button>
                        <button onClick={handleCreateFolder} className="bg-brand-orange text-white px-3 py-1 rounded text-xs font-bold">Crear</button>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-20"><Loader className="animate-spin text-brand-orange" /></div>
                ) : (
                    <>
                        {/* Detection of Structured Folders (Main Category or Board) */}
                        {(() => {
                            const items = getCurrentItems();
                            const standardSubs = ['Formularios', 'Documentos Drive', 'Adjuntos', 'Documentos'];
                            const isStructured = items.some(i => standardSubs.includes(i.name) && i.type === 'folder');

                            if (isStructured && currentFolderId !== null) {
                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {standardSubs.map(subName => {
                                            const subFolder = items.find(i => i.name === subName);
                                            const subItems = subFolder ? docs.filter(d => d.parentId === subFolder.id) : [];

                                            return (
                                                <div key={subName} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                                                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                                                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                                            <Folder size={18} className="text-brand-orange" />
                                                            {subName}
                                                        </h3>
                                                        <button
                                                            onClick={() => subFolder && navigateTo(subFolder.id, subFolder.name)}
                                                            className="text-[10px] font-bold text-brand-orange hover:underline uppercase"
                                                        >
                                                            Ver todo
                                                        </button>
                                                    </div>
                                                    <div className="p-4 flex-1">
                                                        {subItems.length === 0 ? (
                                                            <div className="text-center py-8 text-gray-300 italic text-xs">Sin archivos</div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {subItems.slice(0, 5).map(item => (
                                                                    <div
                                                                        key={item.id}
                                                                        onClick={() => item.type === 'doc' && openEditor(item)}
                                                                        className="flex items-center justify-between p-2 hover:bg-orange-50 rounded-lg cursor-pointer group transition-colors"
                                                                    >
                                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                                            {item.type === 'doc' ? <FileText size={14} className="text-blue-500" /> : <File size={14} className="text-gray-400" />}
                                                                            <span className="text-xs text-gray-700 truncate">{item.name}</span>
                                                                        </div>
                                                                        <ChevronRight size={14} className="text-gray-300 group-hover:text-brand-orange" />
                                                                    </div>
                                                                ))}
                                                                {subItems.length > 5 && (
                                                                    <div className="text-[10px] text-center text-gray-400 mt-2">+{subItems.length - 5} más</div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => {
                                                                setCurrentFolderId(subFolder?.id);
                                                                handleCreateDoc('word');
                                                            }}
                                                            className="flex-1 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-all"
                                                            title="Nuevo Word"
                                                        >
                                                            W
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setCurrentFolderId(subFolder?.id);
                                                                handleCreateDoc('excel');
                                                            }}
                                                            className="flex-1 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-600 hover:border-green-500 hover:text-green-500 transition-all"
                                                            title="Nuevo Excel"
                                                        >
                                                            X
                                                        </button>
                                                        <div className="flex-1 relative">
                                                            <input
                                                                type="file"
                                                                onChange={(e) => {
                                                                    setCurrentFolderId(subFolder?.id);
                                                                    handleUpload(e);
                                                                }}
                                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                            />
                                                            <button className="w-full h-full py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-600 hover:border-brand-orange hover:text-brand-orange transition-all">
                                                                ↑
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            }

                            // Regular Grid View
                            return (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {/* Empty State */}
                                    {items.length === 0 && !showNewFolder && (
                                        <div className="col-span-full text-center py-20 text-gray-400">
                                            <Folder size={48} className="mx-auto mb-4 opacity-20" />
                                            <p>Esta carpeta está vacía.</p>
                                        </div>
                                    )}

                                    {/* Folders First */}
                                    {items.filter(d => d.type === 'folder').map(doc => (
                                        <div
                                            key={doc.id}
                                            onClick={() => navigateTo(doc.id, doc.name)}
                                            className="group bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-brand-orange/30 cursor-pointer transition-all flex flex-col items-center justify-center text-center aspect-square relative"
                                        >
                                            <Folder size={48} className="text-brand-orange/80 group-hover:text-brand-orange mb-3 transition-colors" fill="currentColor" fillOpacity={0.1} />
                                            <span className="text-sm font-bold text-gray-700 group-hover:text-brand-black truncate w-full px-2">{doc.name}</span>
                                            <span className="text-[10px] text-gray-400 mt-1">{docs.filter(d => d.parentId === doc.id).length} elementos</span>
                                            <button
                                                onClick={(e) => handleDelete(doc.id, e)}
                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}

                                    {/* Files */}
                                    {items.filter(d => d.type !== 'folder').map(doc => {
                                        const isDoc = doc.type === 'doc';
                                        return (
                                            <div
                                                key={doc.id}
                                                onClick={() => isDoc && openEditor(doc)}
                                                className="group bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer transition-all flex flex-col items-center justify-center text-center aspect-square relative"
                                            >
                                                <div className={`mb-3 ${isDoc ? 'text-blue-500' :
                                                    doc.type === 'word' ? 'text-blue-600' :
                                                        doc.type === 'excel' ? 'text-green-600' :
                                                            doc.type === 'dropbox' ? 'text-blue-400' :
                                                                doc.type === 'drive' ? 'text-yellow-500' :
                                                                    'text-gray-500'}`}>
                                                    {isDoc || doc.type === 'word' ? <FileText size={40} /> :
                                                        doc.type === 'excel' ? <Table size={40} /> :
                                                            doc.type === 'dropbox' ? <Globe size={40} /> :
                                                                doc.type === 'drive' ? <ExternalLink size={40} /> :
                                                                    <File size={40} />}
                                                </div>
                                                <span className="text-xs font-bold text-gray-700 group-hover:text-blue-600 truncate w-full px-2">{doc.name}</span>
                                                <span className="text-[10px] text-gray-400 mt-1">
                                                    {doc.type === 'dropbox' || doc.type === 'drive' ? 'Enlace Externo' : new Date(doc.createdAt).toLocaleDateString()}
                                                </span>

                                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {(doc.type === 'dropbox' || doc.type === 'drive') && (
                                                        <a
                                                            href={doc.url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-brand-black"
                                                        >
                                                            <ExternalLink size={14} />
                                                        </a>
                                                    )}
                                                    {doc.type === 'file' && (
                                                        <a
                                                            href={doc.url ? `${api.API_URL}/upload/${doc.url.split('/').pop()}` : '#'}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-brand-black"
                                                        >
                                                            <Download size={14} />
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={(e) => handleDelete(doc.id, e)}
                                                        className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </>
                )}
            </div>
        </div>
    );
};

export default CompanyDocs;
