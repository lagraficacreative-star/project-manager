import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Folder, FileText, Upload, Plus, ChevronRight, Download, Trash2, File, ArrowLeft, Save, Loader } from 'lucide-react';

const CompanyDocs = () => {
    const [docs, setDocs] = useState([]);
    const [currentFolderId, setCurrentFolderId] = useState(null); // null = root
    const [path, setPath] = useState([{ id: null, name: 'Inicio' }]);
    const [loading, setLoading] = useState(false);

    // Editor State
    const [editingDoc, setEditingDoc] = useState(null); // The doc object being edited
    const [editorContent, setEditorContent] = useState('');
    const [saving, setSaving] = useState(false);

    // New Item State
    const [showNewFolder, setShowNewFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    useEffect(() => {
        loadDocs();
    }, []);

    const loadDocs = async () => {
        setLoading(true);
        try {
            const data = await api.getDocuments();
            setDocs(data);
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

    const handleCreateDoc = async () => {
        const name = prompt("Nombre del documento:");
        if (!name) return;
        try {
            const newDoc = await api.createDocument({
                name: name + '.txt',
                type: 'doc',
                parentId: currentFolderId,
                content: ''
            });
            loadDocs();
            openEditor(newDoc);
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
    };

    const saveDoc = async () => {
        if (!editingDoc) return;
        setSaving(true);
        try {
            await api.updateDocument(editingDoc.id, { content: editorContent });
            // Update local state
            setDocs(prev => prev.map(d => d.id === editingDoc.id ? { ...d, content: editorContent } : d));
            setEditingDoc(null);
        } catch (error) {
            alert("Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    const getCurrentItems = () => {
        return docs.filter(d => d.parentId === currentFolderId);
    };

    if (editingDoc) {
        return (
            <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Editor Toolbar */}
                <div className="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setEditingDoc(null)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-500">
                            <ArrowLeft size={20} />
                        </button>
                        <FileText className="text-blue-500" size={20} />
                        <h2 className="font-bold text-gray-800">{editingDoc.name}</h2>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex bg-white rounded-lg border border-gray-200 p-1 mr-4">
                            <button className="p-1 hover:bg-gray-100 rounded text-gray-600 font-bold w-8" title="Bold">B</button>
                            <button className="p-1 hover:bg-gray-100 rounded text-gray-600 italic w-8" title="Italic">I</button>
                            <button className="p-1 hover:bg-gray-100 rounded text-gray-600 underline w-8" title="Underline">U</button>
                        </div>
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
                <div className="flex-1 overflow-y-auto bg-gray-100/50 p-8 flex justify-center">
                    <div className="w-full max-w-4xl bg-white shadow-lg min-h-[800px] p-12 rounded-sm border border-gray-200">
                        <textarea
                            value={editorContent}
                            onChange={(e) => setEditorContent(e.target.value)}
                            className="w-full h-full resize-none focus:outline-none text-gray-800 leading-relaxed font-serif text-lg bg-transparent placeholder-gray-300"
                            placeholder="Comienza a escribir aquí..."
                            autoFocus
                        />
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
                        <button onClick={handleCreateDoc} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-bold text-sm transition-colors">
                            <FileText size={16} /> Nuevo Doc
                        </button>
                        <div className="relative">
                            <input
                                type="file"
                                onChange={handleUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-bold text-sm transition-colors">
                                <Upload size={16} /> Subir
                            </button>
                        </div>
                        <button onClick={() => setShowNewFolder(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-black text-white rounded-lg hover:bg-brand-orange font-bold text-sm transition-colors">
                            <Plus size={16} /> Carpeta
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
                        <button onClick={() => setShowNewFolder(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                        <button onClick={handleCreateFolder} className="bg-brand-orange text-white px-3 py-1 rounded text-xs font-bold">Crear</button>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-20"><Loader className="animate-spin text-brand-orange" /></div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {/* Empty State */}
                        {getCurrentItems().length === 0 && !showNewFolder && (
                            <div className="col-span-full text-center py-20 text-gray-400">
                                <Folder size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Esta carpeta está vacía.</p>
                            </div>
                        )}

                        {/* Folders First */}
                        {getCurrentItems().filter(d => d.type === 'folder').map(doc => (
                            <div
                                key={doc.id}
                                onClick={() => navigateTo(doc.id, doc.name)}
                                className="group bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-brand-orange/30 cursor-pointer transition-all flex flex-col items-center justify-center text-center aspect-square"
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
                        {getCurrentItems().filter(d => d.type !== 'folder').map(doc => {
                            const isDoc = doc.type === 'doc';
                            return (
                                <div
                                    key={doc.id}
                                    onClick={() => isDoc && openEditor(doc)}
                                    className="group bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer transition-all flex flex-col items-center justify-center text-center aspect-square relative"
                                >
                                    <div className={`mb-3 ${isDoc ? 'text-blue-500' : 'text-gray-500'}`}>
                                        {isDoc ? <FileText size={40} /> : <File size={40} />}
                                    </div>
                                    <span className="text-xs font-bold text-gray-700 group-hover:text-blue-600 truncate w-full px-2">{doc.name}</span>
                                    <span className="text-[10px] text-gray-400 mt-1">{new Date(doc.createdAt).toLocaleDateString()}</span>

                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!isDoc && (
                                            <a
                                                href={doc.url ? `http://localhost:3000${doc.url}` : '#'}
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
                )}
            </div>
        </div>
    );
};

export default CompanyDocs;
