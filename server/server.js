const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'db.json');

// --- HELPER: Manual .env Loader ---
const loadEnv = () => {
    let envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        envPath = path.join(__dirname, '..', '.env');
    }
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf8');
    const config = {};
    content.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) config[key.trim()] = value.trim();
    });
    return config;
};
const env = loadEnv();
const GOOGLE_SCRIPT_URL = env.GOOGLE_SCRIPT_URL || '';

// --- UPLOAD CONFIG ---
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../client/dist'))); // Serve React App

app.use('/uploads', express.static(UPLOADS_DIR)); // Serve uploaded files

// --- GLOBAL EMAIL CACHE ---
const emailCache = {}; // { userId: { folder: { timestamp: 0, emails: [] } } }

// --- EMAIL AUTOMATION LOGIC ---
const processAutomations = (userId, emails) => {
    if (!emails || !Array.isArray(emails)) return;

    const db = readDB();
    if (!db.automated_email_uids) db.automated_email_uids = [];

    // Mapping of members to their automated boards and names
    const MEMBER_MAP = {
        'ines': { boardId: 'b_design_ines', name: 'Ines' },
        'neus': { boardId: 'b_design_neus', name: 'Neus' },
        'montse': { boardId: 'b_design_montse', name: 'Montse' },
        'omar': { boardId: 'b_design_omar', name: 'Omar' },
        'albap': { boardId: 'b_design_alba', name: 'Alba' },
        'albat': { boardId: 'b_design_ateixido', name: 'A. Teixidó' },
        'web': { boardId: 'b_info', name: 'Info' },
        'info': { boardId: 'b_info', name: 'Info' }
    };

    let changes = false;

    // 1. Kit Digital Specific Rule (existing)
    const kitDigitalEmails = emails.filter(email => {
        const from = email.from ? email.from.toLowerCase() : "";
        return from.includes("no-reply-notifica@correo.gob.es");
    });

    kitDigitalEmails.forEach(email => {
        const emailUid = `auto_kit_${email.id}`;
        if (!db.automated_email_uids.includes(emailUid)) {
            const newCard = {
                id: 'card_' + Date.now() + Math.random().toString(36).substr(2, 5),
                boardId: 'b_kit_digital',
                columnId: 'col_1_b_kit_digital',
                title: `[NOTIF] ${email.subject}`,
                descriptionBlocks: [{ id: 'd1', type: 'text', text: `Ms: ${email.body}` }],
                labels: ['Kit Digital', 'Automatitzat'],
                createdAt: new Date().toISOString()
            };
            if (!db.cards) db.cards = [];
            db.cards.push(newCard);
            db.automated_email_uids.push(emailUid);
            changes = true;
        }
    });

    // 2. Member/Team Automation (New Requirements)
    const memberInfo = MEMBER_MAP[userId];
    if (memberInfo) {
        emails.forEach(email => {
            const emailUid = `team_auto_${userId}_${email.id}`;
            if (db.automated_email_uids.includes(emailUid)) return;

            const targetBoardId = memberInfo.boardId;
            const subject = email.subject || "";
            const from = email.from || "";

            // --- Try to find existing card to link ---
            // We look for a card title that is contained in the subject or viceversa
            const existingCard = (db.cards || []).find(card => {
                if (!card.title) return false;
                const cleanSubject = subject.toLowerCase().replace(/re:|fwd:|fw:/g, "").trim();
                const cleanTitle = card.title.toLowerCase().trim();
                return cleanSubject.includes(cleanTitle) || cleanTitle.includes(cleanSubject);
            });

            if (existingCard) {
                // Link to existing card
                if (!existingCard.comments) existingCard.comments = [];
                existingCard.comments.push({
                    id: 'msg_' + Date.now(),
                    user: 'Sistema',
                    text: `📩 Nou Correu:\nDe: ${from}\nAssumpte: ${subject}\n\n${email.body.substring(0, 400)}...`,
                    timestamp: new Date().toISOString(),
                    isEmail: true
                });

                // Move to "Revisión" column
                existingCard.columnId = `c_revision_${existingCard.boardId}`;
                logActivity(db, 'mail', `Correu vinculat a "${existingCard.title}" (Mogut a Revisió)`, 'Sistema');
            } else {
                // Create new card in member's board
                const newCard = {
                    id: 'card_' + Date.now() + Math.random().toString(36).substr(2, 5),
                    boardId: targetBoardId,
                    columnId: `c_todo_${targetBoardId}`,
                    title: subject || `Email de ${from}`,
                    descriptionBlocks: [
                        { id: 'desc_1', type: 'text', text: `Correu automàtic de: ${from}\n\n${email.body.substring(0, 1000)}` }
                    ],
                    labels: [memberInfo.name, 'Entrada Automàtica'],
                    createdAt: new Date().toISOString(),
                    message_id: email.id, // ID ocult per rastreig
                    attachments: email.attachments || []
                };
                if (!db.cards) db.cards = [];
                db.cards.push(newCard);
                logActivity(db, 'mail', `Nova fitxa creada per a ${memberInfo.name}: ${subject}`, 'Sistema');
            }

            db.automated_email_uids.push(emailUid);
            changes = true;

            // Trigger Google Drive sync for attachments if any (placeholder for logic)
            if (email.attachments && email.attachments.length > 0) {
                console.log(`📎 [DRIVE] Notificant sistema per desar ${email.attachments.length} fitxers al Drive de ${memberInfo.name}`);
            }
        });
    }

    if (changes) {
        writeDB(db);
    }
};

const updateEmailCache = async (userId, folder = 'INBOX') => {
    try {
        const emails = await fetchRealEmails(userId, folder);
        if (emails && !emails.error) {
            if (!emailCache[userId]) emailCache[userId] = {};
            emailCache[userId][folder] = {
                timestamp: Date.now(),
                emails: emails
            };
            console.log(`✅ Cache updated for ${userId} [${folder}]`);

            // --- AUTOMATION: KIT DIGITAL ---
            processAutomations(userId, emails);
        }
    } catch (err) {
        console.error(`❌ Sync error for ${userId}:`, err);
    }
};

const startEmailSync = () => {
    const sync = async () => {
        const DB_CONTENT = fs.readFileSync(DB_FILE, 'utf8');
        const db_sync = JSON.parse(DB_CONTENT);
        const users = db_sync.users || [];
        for (const user of users) {
            await updateEmailCache(user.id, 'INBOX');
        }
    };
    setInterval(sync, 120000); // Every 2 minutes
    sync(); // Start first sync
};

// Initialize Sync
setTimeout(startEmailSync, 5000);

// Helper to read DB
const readDB = () => {
    let data;
    if (!fs.existsSync(DB_FILE)) {
        data = {
            users: [
                { id: 'montse', name: 'Montse', role: 'admin', avatar: 'M', avatarImage: '/avatars/montse.png' },
                { id: 'neus', name: 'Neus', role: 'team', avatar: 'N', avatarImage: '/avatars/neus.jpg' },
                { id: 'omar', name: 'Omar', role: 'team', avatar: 'O', avatarImage: '/avatars/omar.jpg' },
                { id: 'albat', name: 'Alba T', role: 'team', avatar: 'AT', avatarImage: '/avatars/albat.jpg' },
                { id: 'albap', name: 'Alba P', role: 'team', avatar: 'AP' }, // No image yet
                { id: 'ines', name: 'Ines', role: 'team', avatar: 'I' }, // No image yet
                { id: 'maribel', name: 'Maribel', role: 'team', avatar: 'Ma', avatarImage: '/avatars/maribel.png' }
            ],
            boards: [],
            cards: [],
            emails: [
                {
                    id: 'email_1',
                    from: 'client@example.com',
                    subject: 'Project Update',
                    body: 'Hello, here is the update for the project. Please check the attachments.',
                    date: new Date().toISOString(),
                    attachments: []
                },
                {
                    id: 'email_2',
                    from: 'boss@company.com',
                    subject: 'Meeting Reminder',
                    body: 'Don\'t forget our meeting tomorrow at 10 AM.',
                    date: new Date(Date.now() - 86400000).toISOString(),
                    attachments: []
                }
            ],
            time_entries: [],
            messages: [],
            documents: [],
            events: [],
            processed_emails: [],
            deleted_emails: [],
            deleted_emails: [],
            activity: [],
            contacts: []
        };
        fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    } else {
        data = JSON.parse(fs.readFileSync(DB_FILE));
    }

    // Ensure Core Categories Exist
    const coreFolders = [
        { id: 'f_balanços', name: 'Balanços', type: 'folder', parentId: null },
        { id: 'f_licitacions', name: 'Licitacions', type: 'folder', parentId: null },
        { id: 'f_empresa', name: 'Empresa', type: 'folder', parentId: null },
        { id: 'f_drive', name: 'Recursos Drive', type: 'folder', parentId: null }
    ];
    if (!data.documents) data.documents = [];
    coreFolders.forEach(cf => {
        if (!data.documents.find(d => d.id === cf.id)) {
            data.documents.push({ ...cf, createdAt: new Date().toISOString() });
        }
    });

    // Ensure Required Boards Exist
    const requiredBoards = [
        // Services
        { id: 'b_design', title: 'LG - Disseny' },
        { id: 'b_social', title: 'XARXES SOCIALS' },
        { id: 'b_web', title: 'WEB laGràfica' },
        { id: 'b_ai', title: 'Projectes IA' },

        // Clients
        { id: 'b_lleida', title: 'LLEIDA EN VERD 2025' },
        { id: 'b_animac', title: 'ANIMAC26' },
        { id: 'b_imo', title: 'Imo' },
        { id: 'b_diba', title: 'EXPOSICIÓ DIBA 2026' },

        // Management
        { id: 'b_management', title: 'Gestió' },
        { id: 'b_budget', title: 'PRESSUPOSTOS 2025' },
        { id: 'b_billing', title: 'FACTURACIÓ 2025' },
        { id: 'b_tenders', title: 'Licitacions' },
        { id: 'b_accounting', title: 'Contabilidad' },
        { id: 'b_laboral', title: 'Laboral' },
        { id: 'b_rates', title: 'Tarifas' },
        { id: 'b_expenses', title: 'Gastos' },
        { id: 'b_income', title: 'Ingresos' },
        { id: 'b_kit_digital', title: 'KIT DIGITAL' },

        // Member Specific Design Boards
        { id: 'b_design_ines', title: 'Diseño - Ines' },
        { id: 'b_design_neus', title: 'Diseño - Neus' },
        { id: 'b_design_montse', title: 'Diseño - Montse' },
        { id: 'b_design_omar', title: 'Diseño - Omar' },
        { id: 'b_design_alba', title: 'Diseño - Alba' },
        { id: 'b_design_ateixido', title: 'Diseño - A. Teixidó' },
        { id: 'b_info', title: 'Info / Comunicaciones generales' }
    ];

    let changed = false;
    requiredBoards.forEach(req => {
        if (!data.boards.find(b => b.id === req.id)) {
            data.boards.push({
                id: req.id,
                title: req.title,
                columns: [
                    { id: `c_todo_${req.id}`, title: 'Pendiente' },
                    { id: `c_revision_${req.id}`, title: 'Revisión' },
                    { id: `c_doing_${req.id}`, title: 'En curso' },
                    { id: `c_done_${req.id}`, title: 'Hecho' }
                ]
            });
            changed = true;
        }
    });

    // Remove Fiscalidad board
    if (data.boards.some(b => b.id === 'b_fiscal')) {
        data.boards = data.boards.filter(b => b.id !== 'b_fiscal');
        changed = true;
    }

    // Ensure Users are Up-to-Date (Adding Maribel and Images)
    // Ensure Users are Up-to-Date (Adding Maribel and Images)
    const updatedUsers = [
        { id: 'montse', name: 'Montse', role: 'admin', avatar: 'M', avatarImage: '/avatars/montse.jpg' },
        { id: 'neus', name: 'Neus', role: 'team', avatar: 'N', avatarImage: '/avatars/neus.jpg' },
        { id: 'omar', name: 'Omar', role: 'team', avatar: 'O', avatarImage: '/avatars/omar.png' },
        { id: 'albat', name: 'Alba T', role: 'team', avatar: 'AT', avatarImage: '/avatars/albat.jpg' },
        { id: 'albap', name: 'Alba P', role: 'team', avatar: 'AP', avatarImage: '/avatars/albap.jpg' },
        { id: 'ines', name: 'Ines', role: 'team', avatar: 'I' },
        { id: 'maribel', name: 'Maribel', role: 'team', avatar: 'Ma', avatarImage: '/avatars/maribel.jpg' },
        { id: 'web', name: 'Web', role: 'team', avatar: 'W' }
    ];

    updatedUsers.forEach(u => {
        const idx = data.users.findIndex(existing => existing.id === u.id);
        if (idx >= 0) {
            if (data.users[idx].avatarImage !== u.avatarImage) {
                data.users[idx] = { ...data.users[idx], ...u };
                changed = true;
            }
        } else {
            data.users.push(u);
            changed = true;
        }
    });

    // Ensure Required Folders Exist
    const requiredFolders = [
        { id: 'folder_Laboral', name: 'Laboral', parentId: null },
        { id: 'folder_Tarifas', name: 'Tarifas', parentId: null },
        { id: 'folder_Gastos', name: 'Gastos', parentId: null },
        { id: 'folder_Ingresos', name: 'Ingresos', parentId: null },
        { id: 'folder_Contabilidad', name: 'Contabilidad', parentId: null },
        { id: 'folder_Clientes', name: 'Clientes', parentId: null },
        { id: 'folder_Fiscalidad', name: 'Fiscalidad', parentId: null }
    ];

    requiredFolders.forEach(folder => {
        const existing = data.documents.find(d => d.id === folder.id);
        if (!existing) {
            data.documents.push({
                ...folder,
                type: 'folder',
                notesUrl: '',
                sheetUrl: '',
                driveUrl: '',
                links: [],
                description: '',
                checklist: [],
                managementNotes: []
            });
            changed = true;
        } else if (existing.description === undefined) {
            existing.description = '';
            existing.checklist = [];
            changed = true;
        }
    });

    // Also for each Board folder under Clientes
    data.documents.filter(d => d.parentId === 'folder_Clientes' && d.type === 'folder').forEach(boardFolder => {
        if (boardFolder.notesUrl === undefined) {
            boardFolder.notesUrl = '';
            boardFolder.sheetUrl = '';
            boardFolder.driveUrl = '';
            boardFolder.links = boardFolder.links || [];
            boardFolder.description = boardFolder.description || '';
            boardFolder.checklist = boardFolder.checklist || [];
            changed = true;
        }
    });

    // Ensure Home Notes Document Exist
    if (!data.documents.find(d => d.id === 'doc_home_notes' || d.id === 'home_notes')) {
        data.documents.push({
            id: 'doc_home_notes',
            name: 'Bloc de Notas General',
            type: 'doc',
            parentId: null,
            content: 'Escribe aquí las notas generales de gestión...',
            comments: [],
            createdAt: new Date().toISOString()
        });
        changed = true;
    }

    // --- BOARDS MAINTENANCE ---
    const standardColumns = [
        { title: 'por revisar' },
        { title: 'urgente' },
        { title: 'para hacer' },
        { title: 'pendiente cliente' },
        { title: 'control de entregas' },
        { title: 'facturación' }
    ];

    data.boards.forEach((board, bIdx) => {
        let boardChanged = false;

        // Ensure all standard columns exist or overwrite if you want strictly these (user said "tengan las siguientes", usually means strictly these)
        // To be safe and not lose cards, we will map existing cards to the new column IDs if we overwrite.
        // For simplicity and to follow the user request literally:

        const newColumns = standardColumns.map((sc, scIdx) => {
            const existingCol = board.columns.find(c => c.title.toLowerCase() === sc.title.toLowerCase());
            return {
                id: existingCol ? existingCol.id : `col_${scIdx + 1}_${board.id}`,
                title: sc.title
            };
        });

        // If columns are different, update
        if (JSON.stringify(board.columns.map(c => c.title)) !== JSON.stringify(newColumns.map(c => c.title))) {
            data.boards[bIdx].columns = newColumns;
            changed = true;
        }
    });

    if (changed) {
        writeDB(data);
    }

    return data;
};

const writeDB = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

const logActivity = (db, type, text, user = 'Montse') => {
    if (!db.activity) db.activity = [];
    const entry = {
        id: Date.now() + Math.random().toString(36).substr(2, 5),
        type, // 'card', 'doc', 'mail', 'event', 'chat'
        text,
        user,
        timestamp: new Date().toISOString()
    };
    db.activity.unshift(entry);
    if (db.activity.length > 50) db.activity = db.activity.slice(0, 50);
};

// --- REAL EMAIL FETCHER (PYTHON BRIDGE) ---
async function fetchRealEmails(memberId, folder = 'INBOX') {
    const config = loadEnv();

    // Mapping internal IDs to ENV keys
    const CRED_MAP = {
        'albat': 'ATEIXIDO',
        'albap': 'ALBA',
        'web': 'WEB'
    };

    const envKey = CRED_MAP[memberId] || memberId.toUpperCase();
    const user = process.env[`IMAP_USER_${envKey}`] || config[`IMAP_USER_${envKey}`];
    const pass = process.env[`IMAP_PASS_${envKey}`] || config[`IMAP_PASS_${envKey}`];

    if (!user || !pass) {
        console.log(`⚠️ No real credentials for ${memberId} (Key: ${envKey}). Using mock data.`);
        return null; // Signals fallback to mock data
    }

    return new Promise((resolve) => {
        console.log(`📡 [EMAIL FETCH] Connecting to Nominalia for: ${user} in ${folder}...`);
        const env = {
            ...process.env,
            IMAP_HOST: process.env.IMAP_HOST || config.IMAP_HOST,
            IMAP_PORT: process.env.IMAP_PORT || config.IMAP_PORT
        };
        const pythonProcess = spawn('python3', [path.join(__dirname, 'fetch_mails.py'), user, pass, folder], { env });
        let dataStr = "";
        let errorStr = "";

        pythonProcess.stdout.on('data', (data) => { dataStr += data.toString(); });
        pythonProcess.stderr.on('data', (data) => { errorStr += data.toString(); });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`❌ Python Fetcher Error (Exit Code ${code}): ${errorStr}`);
                // Try to parse dataStr anyway, as sometimes errors come via stdout
                try {
                    const possibleError = JSON.parse(dataStr);
                    resolve(possibleError);
                } catch {
                    resolve({ error: errorStr || "Unknown Python Error" });
                }
                return;
            }
            console.log("🐍 Raw Python Output:", dataStr.substring(0, 200) + "..."); // Log first 200 chars
            try {
                const emails = JSON.parse(dataStr);
                resolve(emails);
            } catch (err) {
                console.error("❌ Failed to parse Python output:", err);
                resolve({ error: "Parse error" });
            }
        });
    });
}

// --- EMAIL ARCHIVER ---
// --- EMAIL ARCHIVER ---
async function archiveEmail(memberId, uid) {
    const config = loadEnv();

    // Mapping internal IDs to ENV keys (Must match fetchRealEmails)
    const CRED_MAP = {
        'albat': 'ATEIXIDO',
        'albap': 'ALBA',
        'web': 'WEB'
    };

    const envKey = CRED_MAP[memberId] || memberId.toUpperCase();
    const user = process.env[`IMAP_USER_${envKey}`] || config[`IMAP_USER_${envKey}`];
    const pass = process.env[`IMAP_PASS_${envKey}`] || config[`IMAP_PASS_${envKey}`];

    if (!user || !pass) {
        console.error(`❌ Archive Error: No credentials for ${memberId} (Key: ${envKey})`);
        return { error: "No credentials" };
    }

    return new Promise((resolve) => {
        const env = {
            ...process.env,
            IMAP_HOST: process.env.IMAP_HOST || config.IMAP_HOST,
            IMAP_PORT: process.env.IMAP_PORT || config.IMAP_PORT
        };

        console.log(`📦 [ARCHIVE] Archiving email ${uid} for ${user}...`);

        const pythonProcess = spawn('python3', [path.join(__dirname, 'fetch_mails.py'), user, pass, '--archive', String(uid)], { env });
        let dataStr = "";
        let errorStr = "";

        pythonProcess.stdout.on('data', (data) => { dataStr += data.toString(); });
        pythonProcess.stderr.on('data', (data) => { errorStr += data.toString(); });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`❌ Archive Script Error (Exit Code ${code}): ${errorStr}`);
                resolve({ error: errorStr });
                return;
            }
            try {
                const result = JSON.parse(dataStr);
                console.log("✅ Archive Result:", result);
                resolve(result);
            } catch (err) {
                console.error("❌ Archive Parse Error:", err, "Raw:", dataStr);
                resolve({ error: "Parse error" });
            }
        });
    });
}

app.get('/api/emails/:userId', async (req, res) => {
    const { userId } = req.params;
    const { folder } = req.query; // 'INBOX' or 'Archivo_Fichas/Correos_Procesados'
    const targetFolder = folder || 'INBOX';

    // Return from cache if available
    if (emailCache[userId] && emailCache[userId][targetFolder]) {
        res.json(emailCache[userId][targetFolder].emails);

        // If older than 1 min, refresh in background
        if (Date.now() - emailCache[userId][targetFolder].timestamp > 60000) {
            updateEmailCache(userId, targetFolder);
        }
        return;
    }

    const emails = await fetchRealEmails(userId, targetFolder);
    if (!emails) {
        const db = readDB();
        return res.json(db.emails || []);
    }

    // Populate cache for next time
    if (!emailCache[userId]) emailCache[userId] = {};
    emailCache[userId][targetFolder] = {
        timestamp: Date.now(),
        emails: emails
    };

    res.json(emails);
});

app.post('/api/emails/archive', async (req, res) => {
    const { userId, uid } = req.body;
    const result = await archiveEmail(userId, uid);

    // Invalidate/Update cache
    if (result && !result.error) {
        if (emailCache[userId] && emailCache[userId]['INBOX']) {
            emailCache[userId]['INBOX'].emails = emailCache[userId]['INBOX'].emails.filter(e => String(e.id) !== String(uid));
        }
        updateEmailCache(userId, 'INBOX'); // Trigger background refresh
    }

    res.json(result);
});

app.get('/api/emails/processed', (req, res) => {
    const db = readDB();
    res.json(db.processed_emails || []);
});


app.post('/api/emails/mark-processed', (req, res) => {
    const { uid, subject, user } = req.body;
    const db = readDB();
    if (!db.processed_emails) db.processed_emails = [];
    if (!db.processed_emails.includes(String(uid))) {
        db.processed_emails.push(String(uid));
        logActivity(db, 'mail', `Correu convertit a fitxa: ${subject || 'Sense assumpte'}`, user || 'Sistema');
        if (db.processed_emails.length > 500) db.processed_emails.shift();
        writeDB(db);
    }
    res.json({ success: true });
});

app.get('/api/emails/deleted', (req, res) => {
    const db = readDB();
    res.json(db.deleted_emails || []);
});

app.post('/api/emails/delete-local', (req, res) => {
    const { uid } = req.body;
    const db = readDB();
    if (!db.deleted_emails) db.deleted_emails = [];
    if (!db.deleted_emails.includes(String(uid))) {
        db.deleted_emails.push(String(uid));
        writeDB(db);
    }
    res.json({ success: true });
});

app.post('/api/emails/save-attachments', (req, res) => {
    const { memberId, attachments } = req.body;
    const db = readDB();
    if (!db.documents) db.documents = [];

    const rootId = 'folder_projects_lagrafica';
    if (!db.documents.find(d => d.id === rootId)) {
        db.documents.push({ id: rootId, name: 'projects-lagrafica', type: 'folder', parentId: null });
    }

    const mapping = {
        'neus': ['EN DISSENY'],
        'montse': ['EN DISSENY', 'IA'],
        'albap': ['EN DISSENY'],
        'ines': ['EN DISSENY'],
        'albat': ['EN XARXES'],
        'omar': ['EN WEB']
    };

    const categories = ['EN DISSENY', 'EN XARXES', 'EN WEB', 'IA'];
    categories.forEach(cat => {
        const catId = 'folder_' + cat.replace(/\s+/g, '_');
        if (!db.documents.find(d => d.id === catId)) {
            db.documents.push({ id: catId, name: cat, type: 'folder', parentId: rootId });
        }
    });

    const targetCats = mapping[memberId] || ['EN DISSENY'];
    targetCats.forEach(cat => {
        const catId = 'folder_' + cat.replace(/\s+/g, '_');
        const memberFolderName = db.users.find(u => u.id === memberId)?.name || memberId;
        const memberFolderId = `folder_${catId}_${memberId}`;
        if (!db.documents.find(d => d.id === memberFolderId)) {
            db.documents.push({ id: memberFolderId, name: memberFolderName, type: 'folder', parentId: catId });
        }

        attachments.forEach(att => {
            const docId = 'doc_att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            db.documents.push({
                id: docId,
                name: att.filename,
                type: 'file',
                url: att.url,
                parentId: memberFolderId,
                createdAt: new Date().toISOString()
            });
        });
    });

    writeDB(db);
    res.json({ success: true });
});

// --- API ROUTES ---

// Activity Log
app.get('/api/activity', (req, res) => {
    const db = readDB();
    res.json(db.activity || []);
});

// Get all data
app.get('/api/data', (req, res) => {
    const data = readDB();
    res.json(data);
});

// Reset DB
app.post('/api/reset', (req, res) => {
    if (fs.existsSync(DB_FILE)) {
        fs.unlinkSync(DB_FILE);
    }
    const data = readDB(); // Re-initializes
    res.json(data);
});

// Upload File
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }
    res.json({
        url: `/uploads/${req.file.filename}`,
        filename: req.file.originalname
    });
});

// --- BOARDS ---

app.get('/api/boards', (req, res) => {
    const db = readDB();
    res.json(db.boards);
});

app.post('/api/boards', (req, res) => {
    const db = readDB();
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: "Title required" });

    const newBoard = {
        id: 'board_' + Date.now(),
        title,
        columns: [
            { id: 'col_1_' + Date.now(), title: 'por revisar' },
            { id: 'col_2_' + Date.now(), title: 'urgente' },
            { id: 'col_3_' + Date.now(), title: 'para hacer' },
            { id: 'col_4_' + Date.now(), title: 'pendiente cliente' },
            { id: 'col_5_' + Date.now(), title: 'control de entregas' },
            { id: 'col_6_' + Date.now(), title: 'facturación' }
        ]
    };
    db.boards.push(newBoard);
    writeDB(db);
    res.json(newBoard);
});

app.put('/api/boards/:id', (req, res) => {
    const db = readDB();
    const { id } = req.params;
    const { title, columns } = req.body;

    const boardIndex = db.boards.findIndex(b => b.id === id);
    if (boardIndex === -1) return res.status(404).json({ error: "Board not found" });

    if (title) db.boards[boardIndex].title = title;
    if (columns) db.boards[boardIndex].columns = columns;

    writeDB(db);
    res.json(db.boards[boardIndex]);
});

app.delete('/api/boards/:id', (req, res) => {
    const db = readDB();
    const { id } = req.params;
    const initialLength = db.boards.length;
    db.boards = db.boards.filter(b => b.id !== id);

    // Also delete cards associated with this board
    db.cards = db.cards.filter(c => c.boardId !== id);

    if (db.boards.length === initialLength) return res.status(404).json({ error: "Board not found" });

    writeDB(db);
    res.json({ success: true });
});

// --- TRELLO IMPORT ---
app.post('/api/import/trello', (req, res) => {
    const db = readDB();
    const { boardId, trelloData } = req.body;

    if (!boardId || !trelloData) {
        return res.status(400).json({ error: "Missing boardId or trelloData" });
    }

    const board = db.boards.find(b => b.id === boardId);
    if (!board) return res.status(404).json({ error: "Board not found" });

    // Map Trello Lists to Columns
    // If column doesn't exist, we create it
    const trelloLists = trelloData.lists || [];
    const trelloCards = trelloData.cards || [];

    trelloLists.forEach(list => {
        if (!list.closed) {
            const existingCol = board.columns.find(c => c.id === list.id || c.title.toLowerCase() === list.name.toLowerCase());
            if (!existingCol) {
                board.columns.push({
                    id: list.id,
                    title: list.name
                });
            }
        }
    });

    // Map Trello Cards
    trelloCards.forEach(card => {
        if (!card.closed) {
            const newCard = {
                id: 'card_trello_' + card.id,
                boardId: boardId,
                columnId: card.idList,
                title: card.name,
                descriptionBlocks: [{ type: 'paragraph', text: card.desc || '' }],
                priority: 'medium',
                dueDate: card.due || null,
                responsibleId: 'montse', // Default
                comments: (card.actions || [])
                    .filter(a => a.type === 'commentCard')
                    .map(a => ({
                        id: a.id,
                        text: a.data.text,
                        author: a.memberCreator.fullName,
                        date: a.date
                    })),
                attachments: (card.attachments || []).map(att => ({
                    id: att.id,
                    filename: att.name,
                    url: att.url
                })),
                createdAt: new Date().toISOString()
            };
            db.cards.push(newCard);
        }
    });

    logActivity(db, 'system', `Importació de Trello completada per al tauler: ${board.title}`, 'Sistema');
    writeDB(db);
    res.json({ success: true, count: trelloCards.length });
});

// --- CARDS ---

app.post('/api/cards', (req, res) => {
    const db = readDB();
    const cardData = req.body;
    // Expect: { boardId, columnId, title, priority, dueDate, responsibleId }

    if (!cardData.boardId || !cardData.columnId || !cardData.title) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const newCard = {
        id: 'card_' + Date.now(),
        ...cardData,
        createdAt: new Date().toISOString()
    };

    db.cards.push(newCard);
    logActivity(db, 'card', `Nova tarjeta: ${newCard.title}`, newCard.responsibleId || 'Sistema');
    writeDB(db);
    res.json(newCard);
});

app.put('/api/cards/:id', (req, res) => {
    const db = readDB();
    const { id } = req.params;
    const updates = req.body;

    const cardIndex = db.cards.findIndex(c => c.id === id);
    if (cardIndex === -1) return res.status(404).json({ error: "Card not found" });

    db.cards[cardIndex] = { ...db.cards[cardIndex], ...updates };
    writeDB(db);
    res.json(db.cards[cardIndex]);
});

app.delete('/api/cards/:id', (req, res) => {
    const db = readDB();
    const { id } = req.params;
    db.cards = db.cards.filter(c => c.id !== id);
    writeDB(db);
    res.json({ success: true });
});

app.post('/api/cards/:id/comments', (req, res) => {
    const db = readDB();
    const { id } = req.params;
    const comment = req.body;

    const cardIndex = db.cards.findIndex(c => c.id === id);
    if (cardIndex === -1) return res.status(404).json({ error: "Card not found" });

    if (!db.cards[cardIndex].comments) db.cards[cardIndex].comments = [];
    const newComment = {
        id: Date.now(),
        text: comment.text,
        author: comment.author || 'Sistema',
        date: comment.date || new Date().toISOString()
    };
    db.cards[cardIndex].comments.push(newComment);
    writeDB(db);
    res.json(newComment);
});

// --- USERS ---
app.get('/api/users', (req, res) => {
    const db = readDB();
    res.json(db.users);
});

app.put('/api/users/:id', (req, res) => {
    const db = readDB();
    const { id } = req.params;
    const updates = req.body;

    const userIndex = db.users.findIndex(u => u.id === id);
    if (userIndex === -1) return res.status(404).json({ error: "User not found" });

    db.users[userIndex] = { ...db.users[userIndex], ...updates };
    writeDB(db);
    res.json(db.users[userIndex]);
});

// --- TIME ENTRIES ---
app.get('/api/time_entries', (req, res) => {
    const db = readDB();
    const { userId } = req.query;
    if (userId) {
        return res.json(db.time_entries.filter(e => e.userId === userId));
    }
    res.json(db.time_entries || []);
});

app.post('/api/time_entries', (req, res) => {
    const db = readDB();
    const { userId, start, type } = req.body;

    if (!userId || !start) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    if (!db.time_entries) db.time_entries = [];

    const newEntry = {
        id: 'time_' + Date.now(),
        userId,
        start, // ISO String
        end: null,
        type: type || 'work', // 'work', 'vacation'
        duration: 0
    };

    db.time_entries.push(newEntry);
    writeDB(db);
    res.json(newEntry);
});

app.put('/api/time_entries/:id', (req, res) => {
    const db = readDB();
    const { id } = req.params;
    const { end } = req.body;

    if (!db.time_entries) db.time_entries = [];

    const entryIndex = db.time_entries.findIndex(e => e.id === id);
    if (entryIndex === -1) return res.status(404).json({ error: "Entry not found" });

    if (end) {
        db.time_entries[entryIndex].end = end;
        const startTime = new Date(db.time_entries[entryIndex].start).getTime();
        const endTime = new Date(end).getTime();
        db.time_entries[entryIndex].duration = endTime - startTime;
    }

    writeDB(db);
    res.json(db.time_entries[entryIndex]);
});

// --- MESSAGES (CHAT) ---
app.get('/api/messages', (req, res) => {
    const db = readDB();
    res.json(db.messages || []);
});
app.post('/api/messages', (req, res) => {
    const db = readDB();
    const { text, author, channel } = req.body;
    if (!db.messages) db.messages = [];
    const newMsg = {
        id: Date.now(),
        text,
        author,
        channel: channel || 'general',
        timestamp: new Date().toISOString()
    };
    db.messages.push(newMsg);
    // Keep only last 100 messages to prevent bloat
    if (db.messages.length > 200) db.messages = db.messages.slice(-100);
    logActivity(db, 'chat', `Nou missatge al xat`, author);
    writeDB(db);
    res.json(newMsg);
});

// --- DOCUMENTS (DRIVE) ---
app.get('/api/documents', (req, res) => {
    const db = readDB();
    // Default Folders if they don't exist
    if (!db.documents) db.documents = [];

    // Ensure Root Folders
    const roots = ['Fiscalidad', 'Contabilidad', 'Clientes'];
    let changed = false;
    roots.forEach(name => {
        if (!db.documents.find(d => d.name === name && d.type === 'folder' && !d.parentId)) {
            db.documents.push({ id: 'folder_' + name, name, type: 'folder', parentId: null });
            changed = true;
        }
    });
    // Ensure Board Folders
    db.boards.forEach(b => {
        const boardFolderId = 'folder_board_' + b.id;
        if (!db.documents.find(d => d.id === boardFolderId)) {
            db.documents.push({ id: boardFolderId, name: b.title, type: 'folder', parentId: 'folder_Clientes' }); // Put board folders under Clientes for now
            changed = true;
        }
    });

    if (changed) writeDB(db);

    res.json(db.documents);
});
app.post('/api/documents', (req, res) => {
    const db = readDB();
    const { name, type, parentId, content, url } = req.body; // type: folder, file, doc, word, excel, link
    const newDoc = {
        id: 'doc_' + Date.now(),
        name,
        type,
        parentId,
        content: content || '',
        url: url || '',
        comments: [],
        createdAt: new Date().toISOString(),
        // Management Unit fields if folder
        ...(type === 'folder' ? {
            notesUrl: `https://docs.google.com/document/create?title=Notas_${name}`,
            sheetUrl: `https://docs.google.com/spreadsheets/create?title=Gestion_${name}`,
            driveUrl: `https://drive.google.com/drive/search?q=${name}`,
            links: [],
            description: '',
            checklist: [],
            updatedAt: new Date().toISOString(),
            updatedBy: 'Montse' // Simulated
        } : {})
    };
    if (!db.documents) db.documents = [];
    db.documents.push(newDoc);
    logActivity(db, 'doc', `Nou document: ${newDoc.name}`, 'Sistema');
    writeDB(db);
    res.json(newDoc);
});
app.put('/api/documents/:id', (req, res) => {
    const db = readDB();
    const { id } = req.params;
    const { content, name, comments, url, links, description, checklist, notesUrl, sheetUrl, driveUrl } = req.body;
    const idx = db.documents.findIndex(d => d.id === id);
    if (idx === -1) return res.status(404).json({ error: "Doc not found" });

    if (content !== undefined) db.documents[idx].content = content;
    if (name) db.documents[idx].name = name;
    if (comments !== undefined) db.documents[idx].comments = comments;
    if (url !== undefined) db.documents[idx].url = url;
    if (links !== undefined) db.documents[idx].links = links;
    if (description !== undefined) db.documents[idx].description = description;
    if (checklist !== undefined) db.documents[idx].checklist = checklist;
    if (notesUrl !== undefined) db.documents[idx].notesUrl = notesUrl;
    if (sheetUrl !== undefined) db.documents[idx].sheetUrl = sheetUrl;
    if (driveUrl !== undefined) db.documents[idx].driveUrl = driveUrl;

    db.documents[idx].updatedAt = new Date().toISOString();
    db.documents[idx].updatedBy = 'Montse'; // Simulated

    writeDB(db);
    res.json(db.documents[idx]);
});
app.delete('/api/documents/:id', (req, res) => {
    const db = readDB();
    const { id } = req.params;
    if (!db.documents) return res.json({ success: true });

    // Recursive delete helper (if it's a folder)
    const idsToDelete = [id];
    const findChildren = (pid) => {
        db.documents.filter(d => d.parentId === pid).forEach(child => {
            idsToDelete.push(child.id);
            if (child.type === 'folder') findChildren(child.id);
        });
    };
    findChildren(id);

    db.documents = db.documents.filter(d => !idsToDelete.includes(d.id));
    writeDB(db);
    res.json({ success: true });
});

// --- EVENTS (CALENDAR) ---
app.get('/api/events', (req, res) => {
    const db = readDB();
    res.json(db.events || []);
});
app.post('/api/events', (req, res) => {
    const db = readDB();
    const event = req.body; // { title, start, end, allDay, type/calendarId }
    if (!db.events) db.events = [];
    const newEvent = { ...event, id: 'evt_' + Date.now() };
    db.events.push(newEvent);
    logActivity(db, 'event', `Nou esdeveniment: ${newEvent.title}`, 'Sistema');
    writeDB(db);
    res.json(newEvent);
});
app.delete('/api/events/:id', (req, res) => {
    const db = readDB();
    db.events = (db.events || []).filter(e => e.id !== req.params.id);
    writeDB(db);
    res.json({ success: true });
});
// --- ARCHIVE UTILS ---
app.post('/api/archive-notice', (req, res) => {
    const { text, date } = req.body;
    const archiveFile = path.join(__dirname, 'data', 'avisos_archive.csv');

    // Create data dir if needed
    if (!fs.existsSync(path.dirname(archiveFile))) {
        fs.mkdirSync(path.dirname(archiveFile), { recursive: true });
    }

    const row = `"${date}","${text.replace(/"/g, '""')}"\n`;

    fs.appendFile(archiveFile, row, (err) => {
        if (err) {
            console.error("Error archiving notice:", err);
            return res.status(500).json({ error: "Failed to archive" });
        }
        res.json({ success: true, message: "Archived locally" });
    });
});


// --- CONTACTS ---
app.get('/api/contacts', (req, res) => {
    const db = readDB();
    res.json(db.contacts || []);
});

app.post('/api/contacts', (req, res) => {
    const db = readDB();
    const contact = req.body;
    if (!contact || !contact.name) {
        return res.status(400).json({ error: "Invalid contact data" });
    }

    if (!db.contacts) db.contacts = [];

    const newContact = {
        ...contact,
        id: 'contact_' + Date.now()
    };

    db.contacts.push(newContact);
    logActivity(db, 'system', `Nou contacte afegit: ${newContact.name}`, 'Sistema');
    writeDB(db);
    res.json(newContact);
});

app.post('/api/contacts/bulk', (req, res) => {
    const db = readDB();
    const { contacts } = req.body;
    if (!contacts || !Array.isArray(contacts)) {
        return res.status(400).json({ error: "Invalid contacts data" });
    }

    if (!db.contacts) db.contacts = [];

    const newContacts = contacts.map(c => ({
        ...c,
        id: 'contact_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)
    }));

    db.contacts.push(...newContacts);
    logActivity(db, 'system', `Importats ${newContacts.length} contactes de B2Brouter`, 'Sistema');
    writeDB(db);
    res.json({ success: true, count: newContacts.length });
});

app.delete('/api/contacts/:id', (req, res) => {
    const db = readDB();
    const { id } = req.params;
    db.contacts = (db.contacts || []).filter(c => String(c.id) !== String(id));
    writeDB(db);
    res.json({ success: true });
});

app.put('/api/contacts/:id', (req, res) => {
    const db = readDB();
    const { id } = req.params;
    const data = req.body;
    const index = (db.contacts || []).findIndex(c => String(c.id) === String(id));

    if (index !== -1) {
        db.contacts[index] = { ...db.contacts[index], ...data };
        writeDB(db);
        res.json(db.contacts[index]);
    } else {
        res.status(404).json({ error: "Contact not found" });
    }
});

// --- TENDERS ---
app.get('/api/tenders', (req, res) => {
    const db = readDB();
    res.json(db.tenders || []);
});

app.post('/api/tenders', (req, res) => {
    const db = readDB();
    const tender = { ...req.body, id: 'tender_' + Date.now(), createdAt: Date.now() };
    if (!db.tenders) db.tenders = [];
    db.tenders.push(tender);
    logActivity(db, 'system', `Nova licitació registrada: ${tender.title}`, 'Sistema');
    writeDB(db);
    res.json(tender);
});

app.put('/api/tenders/:id', (req, res) => {
    const db = readDB();
    const { id } = req.params;
    const index = (db.tenders || []).findIndex(t => String(t.id) === String(id));
    if (index !== -1) {
        db.tenders[index] = { ...db.tenders[index], ...req.body };
        writeDB(db);
        res.json(db.tenders[index]);
    } else {
        res.status(404).json({ error: "Tender not found" });
    }
});

app.delete('/api/tenders/:id', (req, res) => {
    const db = readDB();
    db.tenders = (db.tenders || []).filter(t => String(t.id) !== String(req.params.id));
    writeDB(db);
    res.json({ success: true });
});

// --- ALERTS ---
app.get('/api/alerts', (req, res) => {
    const db = readDB();
    res.json(db.alerts || []);
});

app.post('/api/alerts', (req, res) => {
    const db = readDB();
    const alert = { ...req.body, id: 'alert_' + Date.now(), createdAt: Date.now() };
    if (!db.alerts) db.alerts = [];
    db.alerts.push(alert);
    writeDB(db);
    res.json(alert);
});

app.delete('/api/alerts/:id', (req, res) => {
    const db = readDB();
    db.alerts = (db.alerts || []).filter(a => String(a.id) !== String(req.params.id));
    writeDB(db);
    res.json({ success: true });
});

// --- GOOGLE SYNC PROXY ---
app.get('/api/sync-google', async (req, res) => {
    if (!GOOGLE_SCRIPT_URL) {
        return res.status(400).json({ error: "Google Script URL not configured" });
    }
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json(); // Expected: { files: [], alerts: [] }

        const db = readDB();

        // --- Process Files ---
        const files = data.files || (Array.isArray(data) ? data : []);
        if (files.length > 0) {
            if (!db.documents) db.documents = [];
            files.forEach(gFile => {
                const exists = db.documents.find(d => d.url === gFile.url);
                if (!exists) {
                    db.documents.push({
                        id: 'gdrive_' + Date.now() + Math.random().toString(36).substr(2, 5),
                        name: gFile.name,
                        type: 'file',
                        url: gFile.url,
                        parentId: 'f_drive',
                        createdAt: new Date().toISOString()
                    });
                }
            });
            // Ensure f_drive folder exists
            if (!db.documents.find(d => d.id === 'f_drive')) {
                db.documents.push({ id: 'f_drive', name: 'Recursos Drive', type: 'folder', parentId: null, createdAt: new Date().toISOString() });
            }
        }

        // --- Process Alerts (Tenders) ---
        const alerts = data.alerts || [];
        if (alerts.length > 0) {
            if (!db.alerts) db.alerts = [];
            alerts.forEach(newAlert => {
                const exists = db.alerts.find(a => a.link === newAlert.link || a.title === newAlert.title);
                if (!exists) {
                    db.alerts.push({
                        ...newAlert,
                        id: 'alert_' + Date.now() + Math.random().toString(36).substr(2, 5),
                        createdAt: Date.now()
                    });
                }
            });
        }

        writeDB(db);
        res.json({ success: true, filesFound: files.length, alertsFound: alerts.length });
    } catch (err) {
        console.error("Error syncing with Google Script:", err);
        res.status(500).json({ error: "Failed to sync with Google" });
    }
});

// --- SPA FALLBACK ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
