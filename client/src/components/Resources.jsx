import React from 'react';
import { Package, FileText, Globe, Image, Settings, Download, ExternalLink } from 'lucide-react';

const Resources = () => {
    const categories = [
        {
            title: "Identitat Corporativa",
            icon: <Image className="text-brand-orange" size={20} />,
            description: "Accedeix a logotips, guies d'estil i paletes de colors.",
            link: "https://drive.google.com/drive/folders/15L2H3q1Y1vMDRj7YpE9R6m9z9fB3i5b6"
        },
        {
            title: "Projectes Clients",
            icon: <Globe className="text-blue-500" size={20} />,
            description: "Carpetes i documentació específica de clients.",
            link: "https://drive.google.com/drive/folders/13_uB3vP6v9H4w-p9U7n9K5FqLz7mX9e4"
        },
        {
            title: "Plantilles de Disseny",
            icon: <FileText className="text-purple-500" size={20} />,
            description: "Plantilles per a pressupostos, presentacions i més.",
            link: "https://drive.google.com/drive/folders/1z_8y1_v-9pM4w-P9U7n9K5FqLz7mX9e4"
        },
        {
            title: "Banc d'Imatges",
            icon: <Image className="text-green-500" size={20} />,
            description: "Recursos visuals, fotografies i stock corporatiu.",
            link: "https://drive.google.com/drive/folders/1w_8y1_v-9pM4w-P9U7n9K5FqLz7mX9e4"
        },
        {
            title: "Eines Digitals",
            icon: <Settings className="text-cyan-500" size={20} />,
            description: "Accessos a programari, utilitats i eines de treball.",
            link: "https://drive.google.com/drive/folders/1y_8y1_v-9pM4w-P9U7n9K5FqLz7mX9e4"
        }
    ];

    return (
        <div className="flex-1 p-4 md:p-10 overflow-auto bg-brand-lightgray/30 min-h-screen animate-in fade-in duration-700">
            <header className="mb-10 max-w-6xl mx-auto">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-brand-orange/10 rounded-xl text-brand-orange">
                        <Package size={24} />
                    </div>
                    <h1 className="text-3xl font-black text-gray-800 tracking-tight">Recursos Studio</h1>
                </div>
                <p className="text-gray-500 text-sm max-w-xl font-medium">Accedeix a les carpetes de Google Drive per gestionar i descarregar tots els materials corporatius.</p>
            </header>

            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {categories.map((cat, idx) => (
                    <a
                        key={idx}
                        href={cat.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-2xl hover:border-brand-orange/30 transition-all duration-500 group flex flex-col items-center text-center relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16 group-hover:bg-brand-orange/5 transition-colors duration-500" />

                        <div className="p-5 bg-gray-50 rounded-3xl mb-6 group-hover:scale-110 group-hover:bg-brand-orange/10 transition-all duration-500 relative z-10">
                            {cat.icon}
                        </div>

                        <h3 className="text-xl font-black text-gray-800 mb-3 group-hover:text-brand-orange transition-colors duration-500 relative z-10">{cat.title}</h3>
                        <p className="text-gray-400 text-xs font-medium leading-relaxed relative z-10">{cat.description}</p>

                        <div className="mt-8 flex items-center justify-center gap-2 text-brand-orange font-bold text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                            Obrir al Google Drive <ExternalLink size={12} />
                        </div>
                    </a>
                ))}
            </div>

            <div className="mt-12 max-w-5xl mx-auto p-8 rounded-[2.5rem] bg-gradient-to-br from-brand-orange to-orange-400 text-white shadow-lg shadow-brand-orange/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-110 transition-transform duration-1000" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-black mb-2">Necessites un recurs personalitzat?</h2>
                        <p className="opacity-90 text-sm font-medium">Si no trobes el que busques o necessites una adaptació específica, contacta amb el departament de disseny.</p>
                    </div>
                    <button className="px-8 py-4 bg-white text-brand-orange font-black text-sm rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/5 whitespace-nowrap">
                        Sol·licitar Recurs
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Resources;
