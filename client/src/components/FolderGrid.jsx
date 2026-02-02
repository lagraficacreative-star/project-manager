import React from 'react';
import { Folder, ExternalLink, ShieldCheck, Globe, Smartphone, Palette, Gavel, FileText, Calculator, Briefcase, Lock } from 'lucide-react';

const FolderGrid = ({ mode = 'general' }) => {
    const folders = mode === 'general' ? [
        {
            id: 'ia',
            name: 'IA - INTEL·LIGÈNCIA ARTIFICIAL',
            description: 'Projectes i recursos d\'IA del estudi.',
            icon: Globe,
            color: 'blue',
            link: 'https://drive.google.com/drive/folders/1zBPFhvjt3OjTk4BcE8vUD_G7guQV2lgc?usp=drive_link'
        },
        {
            id: 'web',
            name: 'WEB - DESENVOLUPAMENT',
            description: 'Gestió de webs i servidors.',
            icon: Globe,
            color: 'green',
            link: 'https://drive.google.com/drive/folders/1E8wwzTvJBL800GMRnQUbYJYZuc8ui042?usp=drive_link'
        },
        {
            id: 'xarxes',
            name: 'XARXES SOCIALS',
            description: 'Continguts i estratègia social.',
            icon: Smartphone,
            color: 'purple',
            link: 'https://drive.google.com/drive/folders/1DlffLe2ef_uyZA-uMbbYtZ-zDgQFQlKu?usp=drive_link'
        },
        {
            id: 'disseny_neus',
            name: 'NEUS-DISSENY',
            description: 'Projectes de disseny i branding.',
            icon: Palette,
            color: 'orange',
            link: 'https://drive.google.com/drive/folders/1rgTsBnl_uc6iKiLwIJWX0qIei4vfWPJ3?usp=drive_link'
        },
        {
            id: 'disseny_montse',
            name: 'MONTSE-DISSENY',
            description: 'Projectes de disseny i branding.',
            icon: Palette,
            color: 'orange',
            link: 'https://drive.google.com/drive/folders/1C59paXAqst4UMF9SOgaTyG3hOHvQupHi?usp=drive_link'
        },
        {
            id: 'disseny_ines',
            name: 'INES-DISSENY',
            description: 'Projectes de disseny i branding.',
            icon: Palette,
            color: 'orange',
            link: 'https://drive.google.com/drive/folders/1bW-BdcV4HlNeuPc6IzWI-Y9CcaXII6vW?usp=drive_link'
        },
        {
            id: 'disseny_alba',
            name: 'ALBA-DISSENY',
            description: 'Projectes de disseny i branding.',
            icon: Palette,
            color: 'orange',
            link: 'https://drive.google.com/drive/folders/15d-tNZ2mBNf9gyqT8BbPGfkYhdq9PIAd?usp=drive_link'
        }
    ] : [
        {
            id: 'pressupostos',
            name: 'PRESSUPOSTOS 2026',
            description: 'Pressupostos i valoracions econòmiques.',
            icon: Calculator,
            color: 'orange',
            link: 'https://drive.google.com/drive/folders/1uhucEbNFiDVZwvUFiyTcPAv__ZEgfJj-?usp=drive_link'
        },
        {
            id: 'licitacions',
            name: 'LICITACIONS 2026',
            description: 'Expedients i documentació de concursos.',
            icon: Gavel,
            color: 'blue',
            link: 'https://drive.google.com/drive/u/0/folders/1eJ_8TVeuDEqSGPtH6wIsmLNwe43eerCq'
        },
        {
            id: 'laboral',
            name: 'LABORAL 2026',
            description: 'Gestió de personal i recursos humans.',
            icon: ShieldCheck,
            color: 'red',
            link: 'https://drive.google.com/drive/folders/1np3r65OoTXkjgfb6DWgSaMvPtFws2ZZL?usp=drive_link'
        },
        {
            id: 'gestoria',
            name: 'GESTORIA 2026',
            description: 'Documentació fiscal i mercantil.',
            icon: Briefcase,
            color: 'indigo',
            link: 'https://drive.google.com/drive/folders/10wNsabL4I-OxW0tzi4KMl0opJ2VcXrA5?usp=drive_link'
        },
        {
            id: 'trimestre_1',
            name: '1ER TRIMESTRE 2026',
            description: 'Documentació del primer trimestre.',
            icon: Table,
            color: 'green',
            link: 'https://drive.google.com/drive/folders/1WbXLNhs09yRFLDSPJxEp-STLyA14p7yb?usp=drive_link'
        },
        {
            id: 'doc_gestio',
            name: 'DOC. GESTIÓ LAGRAFICA',
            description: 'Manuals i procediments de gestió.',
            icon: FileText,
            color: 'slate',
            link: 'https://drive.google.com/drive/folders/161cXkl6zy81CcDW-_c6QVgUmcuUsguHF?usp=drive_link'
        },
        {
            id: 'doc_empresa',
            name: 'DOCUMENTACIÓ EMPRESA',
            description: 'Informació corporativa i legal.',
            icon: Lock,
            color: 'slate',
            link: 'https://drive.google.com/drive/u/0/folders/1eJ_8TVeuDEqSGPtH6wIsmLNwe43eerCq'
        }
    ];

    const getColorClasses = (color) => {
        const classes = {
            blue: 'bg-blue-50 text-blue-600 border-blue-100 shadow-blue-500/10 hover:border-blue-400',
            green: 'bg-green-50 text-green-600 border-green-100 shadow-green-500/10 hover:border-green-400',
            purple: 'bg-purple-50 text-purple-600 border-purple-100 shadow-purple-500/10 hover:border-purple-400',
            orange: 'bg-orange-50 text-orange-600 border-orange-100 shadow-orange-500/10 hover:border-orange-400',
            red: 'bg-red-50 text-red-600 border-red-100 shadow-red-500/10 hover:border-red-400',
            indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-500/10 hover:border-indigo-400',
            slate: 'bg-slate-50 text-slate-600 border-slate-100 shadow-slate-500/10 hover:border-slate-400'
        };
        return classes[color] || classes.blue;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {folders.map((f) => (
                <a
                    key={f.id}
                    href={f.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group relative p-8 rounded-[2.5rem] border bg-white flex flex-col items-center text-center transition-all duration-300 hover:scale-[1.03] active:scale-95 shadow-sm hover:shadow-2xl ${getColorClasses(f.color)}`}
                >
                    <div className="p-5 bg-white rounded-3xl mb-6 shadow-sm border border-inherit group-hover:scale-110 transition-transform duration-500">
                        <f.icon size={32} />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest mb-2 group-hover:text-brand-black transition-colors">{f.name}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter leading-tight mb-6">{f.description}</p>

                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                        OBRIR DRIVE <ExternalLink size={12} />
                    </div>
                </a>
            ))}
        </div>
    );
};

export default FolderGrid;
