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
    // Priority: Root .env, then server/.env
    const rootEnv = path.join(__dirname, '..', '.env');
    const serverEnv = path.join(__dirname, '.env');
    let envPath = fs.existsSync(rootEnv) ? rootEnv : (fs.existsSync(serverEnv) ? serverEnv : null);

    if (!envPath) {
        console.log("ℹ️ No local .env file found. Relying solely on process.env.");
        return {};
    }

    console.log(`📂 Loading credentials from: ${envPath}`);
    const content = fs.readFileSync(envPath, 'utf8');
    const config = {};
    content.split('\n').forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) return;

        const parts = trimmedLine.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            if (key) config[key] = value;
        }
    });
    return config;
};
const env = loadEnv();
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || env.GOOGLE_SCRIPT_URL || '';

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

// --- GOOGLE INTEGRATION CONFIG ---
const DRIVE_FOLDER_ID = '1eJ_8TVeuDEqSGPtH6wIsmLNwe43eerCq';
const DRIVE_MEMBER_MAPPING = {
    'montse': ['DISSENY', 'MONTSE-DISSENY'],
    'ines': ['DISSENY', 'INES-DISSENY'],
    'neus': ['DISSENY', 'NEUS-DISSENY'],
    'alba': ['DISSENY', 'ALBA-DISSENY'],
    'ateixido': ['XARXES', 'ALBA T-XARXES'],
    'omar': ['WEB'],
    'web': ['WEB'],
    'licitacions': ['LICITACIONS 2026'],
    'comptabilitat': ['DOCUMETACIÓ GESTIÓ LAGRAFICA'],
    'gestio': ['DOCUMETACIÓ GESTIÓ LAGRAFICA']
};

const getClientNameFromEmail = (email) => {
    if (!email) return null;
    const db = readDB();
    const cleanEmail = email.toLowerCase().trim();
    const contact = db.contacts.find(c =>
        (c.email && c.email.toLowerCase().trim() === cleanEmail) ||
        (email.toLowerCase().includes(c.email && c.email.toLowerCase().trim() && c.email.length > 3))
    );
    return contact ? contact.name.replace(/[/\\?%*:|"<>]/g, '-') : null;
};

const saveFileToDrive = async (filename, contentBase64, pathArray) => {
    if (!GOOGLE_SCRIPT_URL) return;
    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (LaGràfica Project Manager)'
            },
            body: JSON.stringify({
                action: 'upload_file',
                filename,
                content: contentBase64,
                path: pathArray,
                rootFolderId: DRIVE_FOLDER_ID
            })
        });
        console.log(`✅ File ${filename} uploaded to Drive path: ${pathArray.join('/')}`);
    } catch (error) {
        console.error("Error uploading to Drive:", error);
    }
};

const syncToGoogleSheets = async () => {
    if (!GOOGLE_SCRIPT_URL) return;
    try {
        const db = readDB();
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (LaGràfica Project Manager)'
            },
            body: JSON.stringify({
                action: 'export_all',
                boards: db.boards || [],
                cards: db.cards || [],
                users: db.users || []
            })
        });
        console.log("✅ Google Sheets synchronized.");
    } catch (error) {
        console.error("Error syncing Sheets:", error);
    }
};

// --- GLOBAL EMAIL CACHE ---
const emailCache = {}; // { userId: { folder: { timestamp: 0, emails: [] } } }

// --- EMAIL AUTOMATION LOGIC ---
const logToGoogleSheet = async (emailData) => {
    if (!GOOGLE_SCRIPT_URL) return;
    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (LaGràfica Project Manager)'
            },
            body: JSON.stringify({
                action: 'log_email',
                ...emailData
            })
        });
    } catch (error) {
        console.error("Error logging to Google Sheet:", error);
    }
};

const processAutomations = async (userId, emails, folder = 'INBOX') => {
    if (!emails || !Array.isArray(emails)) return;

    const db = readDB();
    if (!db.automated_email_uids) db.automated_email_uids = [];
    if (!db.drive_uploaded_uids) db.drive_uploaded_uids = [];

    const MEMBER_MAP = {
        'montse': { boardId: 'b_design_montse', name: 'Montse' },
        'neus': { boardId: 'b_design_neus', name: 'Neus' },
        'alba': { boardId: 'b_design_alba', name: 'Alba' },
        'ateixido': { boardId: 'b_design_ateixido', name: 'A. Teixidó' },
        'omar': { boardId: 'b_design_omar', name: 'Omar' },
        'web': { boardId: 'b_web', name: 'Web' },
        'ines': { boardId: 'b_design_ines', name: 'Ines' },
        'comptabilitat': { boardId: 'b_accounting', name: 'Comptabilitat' },
        'licitacions': { boardId: 'b_tenders', name: 'Licitaciones' },
        'gestio': { boardId: 'b_accounting', name: 'Gestió' }
    };

    const SPAM_WORDS = ['newsletter', 'publicitat', 'publi', 'promoció', 'oferta exclusiva', 'guanya diners', 'unsubscription', 'donar-se de baixa', 'poker', 'casino', 'viagra'];

    const isSpam = (email) => {
        const textToCheck = `${email.subject} ${email.from} ${email.body.substring(0, 200)}`.toLowerCase();
        return SPAM_WORDS.some(word => textToCheck.includes(word.toLowerCase()));
    };

    let changes = false;

    for (const email of emails) {
        const msgId = email.id || email.messageId;
        const emailUid = `auto_rule_${msgId}`;
        const driveUid = `drive_${msgId}`;

        // --- DRIVE INTEGRATION: Save attachments for ALL emails (Received) ---
        if (email.hasAttachments) {
            if (!db.drive_uploaded_uids.includes(driveUid)) {
                getEmailAttachments(userId, msgId, folder).then(attachments => {
                    let drivePath = DRIVE_MEMBER_MAPPING[userId] || ['OTROS'];

                    // Add Client Name to path if found
                    const clientName = getClientNameFromEmail(email.from);
                    if (clientName) {
                        drivePath = [...drivePath, clientName];
                    }

                    attachments.forEach(att => {
                        saveFileToDrive(att.filename, att.content_base64, drivePath);
                    });

                    // Track as uploaded
                    const d = readDB(); // Re-read DB to ensure latest state for writing
                    if (!d.drive_uploaded_uids) d.drive_uploaded_uids = [];
                    if (!d.drive_uploaded_uids.includes(driveUid)) {
                        d.drive_uploaded_uids.push(driveUid);
                        writeDB(d);
                    }
                }).catch(err => console.error("❌ [DRIVE] Error getting attachments", err));
            }
        }

        if (db.automated_email_uids.includes(emailUid)) continue;

        // --- RULE: ONLY MANUAL WORKFLOW ---
        // For now, we disable automatic creation.
        continue;

        if (isSpam(email)) {
            db.automated_email_uids.push(emailUid);
            changes = true;
            continue;
        }

        const subject = (email.subject || "");
        const from = (email.from || "");
        const member = MEMBER_MAP[userId];
        const targetBoardId = member ? member.boardId : 'b_info';
        const automationTag = member ? member.name : "Archivat";

        // Check if card already exists for this email
        const existingCard = (db.cards || []).find(card => {
            if (!card.title) return false;
            const cleanSubject = subject.toLowerCase().replace(/re:|fwd:|fw:/g, "").trim();
            const cleanTitle = card.title.toLowerCase().trim();
            return cleanSubject.includes(cleanTitle) || cleanTitle.includes(cleanSubject);
        });

        if (existingCard) {
            if (!existingCard.comments) existingCard.comments = [];
            existingCard.comments.push({
                id: 'ext_' + Date.now(),
                author: 'SISTEMA',
                text: `📩 CORREU ARCHIVAT RELACIONAT:\nDe: ${from}\nAsunto: ${subject}\n\n${email.body.substring(0, 1000)}...`,
                date: new Date().toISOString(),
                isEmail: true
            });
        } else {
            const newCard = {
                id: 'card_' + Date.now() + Math.random().toString(36).substr(2, 5),
                boardId: targetBoardId,
                columnId: (db.boards.find(b => b.id === targetBoardId)?.columns[0]?.id) || `col_1_${targetBoardId}`,
                title: subject || `Email de ${from}`,
                descriptionBlocks: [
                    { id: 'desc_1', type: 'text', text: `Correu archivat de: ${from}\n\n${email.body.substring(0, 1500)}` }
                ],
                labels: [automationTag, 'Email'],
                createdAt: new Date().toISOString(),
                sourceEmailDate: email.date || email.timestamp,
                responsibleId: userId
            };
            if (!db.cards) db.cards = [];
            db.cards.push(newCard);
            changes = true;
        }

        db.automated_email_uids.push(emailUid);
        changes = true;
    }

    if (changes) {
        writeDB(db);
        syncToGoogleSheets(); // Sync to Sheets after changes
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
            await processAutomations(userId, emails, folder);
        }
    } catch (err) {
        console.error(`❌ Sync error for ${userId}:`, err);
    }
};

const startEmailSync = () => {
    const sync = async () => {
        try {
            const DB_CONTENT = fs.readFileSync(DB_FILE, 'utf8');
            const db_sync = JSON.parse(DB_CONTENT);
            const users = db_sync.users || [];

            console.log(`🔄 [SYNC] Starting sequential sync for ${users.length} users...`);

            for (const user of users) {
                // Skip Omar as requested
                if (user.id === 'omar') continue;

                // Sync folders one by one for each user
                console.log(`📡 [SYNC] Syncing user: ${user.id}`);
                await updateEmailCache(user.id, 'INBOX');
                await updateEmailCache(user.id, 'Archivados');
                await updateEmailCache(user.id, 'Enviados');
            }

            console.log(`✅ [SYNC] All users synced successfully.`);
        } catch (err) {
            console.error("❌ [SYNC] Global sync error:", err);
        }
    };
    setInterval(sync, 900000); // Every 15 minutes
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
                { id: 'montse', name: 'Montse', role: 'admin', avatar: 'M', avatarImage: '/avatars/montse.jpg' },
                { id: 'neus', name: 'Neus', role: 'team', avatar: 'N', avatarImage: '/avatars/neus.jpg' },
                { id: 'alba', name: 'Alba', role: 'team', avatar: 'A', avatarImage: '/avatars/alba.jpg' },
                { id: 'ateixido', name: 'A. Teixidó', role: 'team', avatar: 'AT', avatarImage: '/avatars/ateixido.jpg' },
                { id: 'omar', name: 'Omar', role: 'team', avatar: 'O', avatarImage: '/avatars/omar.png' },
                { id: 'web', name: 'Web', role: 'team', avatar: 'W', avatarImage: '/avatars/web.png' },
                { id: 'ines', name: 'Ines', role: 'team', avatar: 'I', avatarImage: '/avatars/ines.jpg' },
                { id: 'comptabilitat', name: 'Comptabilitat', role: 'team', avatar: 'C' },
                { id: 'gestio', name: 'Gestió', role: 'team', avatar: 'G' }
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
        { id: 'alba', name: 'Alba', role: 'team', avatar: 'A', avatarImage: '/avatars/alba.jpg' },
        { id: 'ateixido', name: 'A. Teixidó', role: 'team', avatar: 'AT', avatarImage: '/avatars/ateixido.jpg' },
        { id: 'omar', name: 'Omar', role: 'team', avatar: 'O', avatarImage: '/avatars/omar.png' },
        { id: 'web', name: 'Web', role: 'team', avatar: 'W', avatarImage: '/avatars/web.png' },
        { id: 'ines', name: 'Ines', role: 'team', avatar: 'I', avatarImage: '/avatars/ines.jpg' },
        { id: 'comptabilitat', name: 'Comptabilitat', role: 'team', avatar: 'C' },
        { id: 'gestio', name: 'Gestió', role: 'team', avatar: 'G' }
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
        user: user || 'Montse',
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
        'montse': 'MONTSE',
        'neus': 'NEUS',
        'alba': 'ALBA',
        'ateixido': 'ATEIXIDO',
        'omar': 'OMAR',
        'web': 'WEB',
        'ines': 'INES',
        'comptabilitat': 'COMPTABILITAT',
        'licitacions': 'LICITACIONS',
        'gestio': 'GESTIO',
        'test': 'TEST'
    };

    const envKey = CRED_MAP[memberId] || memberId.toUpperCase();

    // Check both process.env and our manually loaded config
    const user = process.env[`IMAP_USER_${envKey}`] || env[`IMAP_USER_${envKey}`];
    const pass = process.env[`IMAP_PASS_${envKey}`] || env[`IMAP_PASS_${envKey}`];

    if (!user || !pass) {
        const source = process.env[`IMAP_USER_${envKey}`] ? 'process.env' : (env[`IMAP_USER_${envKey}`] ? '.env file' : 'NONE');
        console.log(`⚠️ Missing credentials for ${memberId} (Key: IMAP_USER_${envKey}). Source detected: ${source}. Using mock data.`);
        return null; // Signals fallback to mock data
    }

    console.log(`🔑 Credentials found for ${memberId} (Key: ${envKey}) from ${process.env[`IMAP_USER_${envKey}`] ? 'System Env' : 'Local File'}`);

    return new Promise((resolve) => {
        console.log(`📡 [EMAIL FETCH] Connecting to Nominalia for: ${user} in ${folder}...`);
        const pythonArgs = [path.join(__dirname, 'fetch_mails.py'), user, pass];

        // Always use headers-only for background sync and initial lists
        pythonArgs.push('--headers-only');
        pythonArgs.push(folder);

        const combinedEnv = { ...process.env, ...env };
        const pythonProcess = spawn('python3', pythonArgs, { env: combinedEnv });

        pythonProcess.on('error', (err) => {
            console.error(`❌ Failed to start Python process for ${memberId}:`, err);
            resolve({ error: "Failed to start Python process: " + err.message });
        });
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

async function getEmailAttachments(memberId, uid, folder) {
    const config = loadEnv();
    const CRED_MAP = {
        'montse': 'MONTSE',
        'neus': 'NEUS',
        'alba': 'ALBA',
        'ateixido': 'ATEIXIDO',
        'omar': 'OMAR',
        'web': 'WEB',
        'ines': 'INES',
        'comptabilitat': 'COMPTABILITAT',
        'licitacions': 'LICITACIONS',
        'test': 'TEST'
    };
    const envKey = CRED_MAP[memberId] || memberId.toUpperCase();
    const user = process.env[`IMAP_USER_${envKey}`] || config[`IMAP_USER_${envKey}`];
    const pass = process.env[`IMAP_PASS_${envKey}`] || config[`IMAP_PASS_${envKey}`];

    if (!user || !pass) return [];

    return new Promise((resolve) => {
        const combinedEnv = { ...process.env, IMAP_HOST: process.env.IMAP_HOST || config.IMAP_HOST, IMAP_PORT: process.env.IMAP_PORT || config.IMAP_PORT };
        const pythonProcess = spawn('python3', [path.join(__dirname, 'fetch_mails.py'), user, pass, '--download-attachments', String(uid), folder], { env: combinedEnv });

        pythonProcess.on('error', (err) => {
            console.error(`❌ Failed to start Python process for attachments [${memberId}]:`, err);
            resolve([]);
        });
        let dataStr = "";
        pythonProcess.stdout.on('data', (d) => { dataStr += d.toString(); });
        pythonProcess.on('close', (code) => {
            try {
                const res = JSON.parse(dataStr);
                resolve(res.attachments || []);
            } catch (err) {
                resolve([]);
            }
        });
    });
}

async function moveEmail(memberId, uid, sourceFolder, targetFolder) {
    const config = loadEnv();
    const CRED_MAP = {
        'montse': 'MONTSE',
        'neus': 'NEUS',
        'alba': 'ALBA',
        'ateixido': 'ATEIXIDO',
        'omar': 'OMAR',
        'web': 'WEB',
        'ines': 'INES',
        'comptabilitat': 'COMPTABILITAT',
        'licitacions': 'LICITACIONS',
        'gestio': 'GESTIO',
        'test': 'TEST'
    };
    const envKey = CRED_MAP[memberId] || memberId.toUpperCase();
    const user = process.env[`IMAP_USER_${envKey}`] || config[`IMAP_USER_${envKey}`];
    const pass = process.env[`IMAP_PASS_${envKey}`] || config[`IMAP_PASS_${envKey}`];

    if (!user || !pass) return { error: "No credentials for " + memberId };

    return new Promise((resolve) => {
        const combinedEnv = { ...process.env, IMAP_HOST: process.env.IMAP_HOST || config.IMAP_HOST, IMAP_PORT: process.env.IMAP_PORT || config.IMAP_PORT };
        const pythonProcess = spawn('python3', [path.join(__dirname, 'fetch_mails.py'), user, pass, '--move', String(uid), sourceFolder, targetFolder], { env: combinedEnv });

        pythonProcess.on('error', (err) => {
            console.error(`❌ Failed to start Python process for move [${memberId}]:`, err);
            resolve({ error: "Failed to start move process: " + err.message });
        });
        let dataStr = "";
        pythonProcess.stdout.on('data', (d) => { dataStr += d.toString(); });
        pythonProcess.on('close', (code) => {
            try { resolve(JSON.parse(dataStr)); } catch (err) { resolve({ error: "Parse error" }); }
        });
    });
}

// --- EMAIL ARCHIVER (Moves to Managed folder) ---
async function manageEmail(memberId, uid) {
    return moveEmail(memberId, uid, 'INBOX', 'Archivados');
}

app.get('/api/emails/:userId/:uid/body', async (req, res) => {
    const { userId, uid } = req.params;
    const { folder } = req.query;
    const config = loadEnv();

    const CRED_MAP = {
        'montse': 'MONTSE', 'neus': 'NEUS', 'alba': 'ALBA', 'ateixido': 'ATEIXIDO',
        'omar': 'OMAR', 'web': 'WEB', 'ines': 'INES', 'comptabilitat': 'COMPTABILITAT',
        'licitacions': 'LICITACIONS', 'gestio': 'GESTIO'
    };
    const envKey = CRED_MAP[userId] || userId.toUpperCase();
    const user = process.env[`IMAP_USER_${envKey}`] || config[`IMAP_USER_${envKey}`];
    const pass = process.env[`IMAP_PASS_${envKey}`] || config[`IMAP_PASS_${envKey}`];

    if (!user || !pass) return res.status(401).json({ error: "No credentials" });

    const combinedEnv = { ...process.env, ...config };
    const pythonProcess = spawn('python3', [
        path.join(__dirname, 'fetch_mails.py'),
        user, pass, '--body-only', String(uid), folder || 'INBOX'
    ], { env: combinedEnv });

    pythonProcess.on('error', (err) => {
        console.error(`❌ Failed to start Python process for body-fetch [${userId}]:`, err);
        res.status(500).json({ error: "Failed to start body-fetch process: " + err.message });
    });

    let dataStr = "";
    pythonProcess.stdout.on('data', (d) => { dataStr += d.toString(); });
    pythonProcess.on('close', (code) => {
        try {
            const bodyData = JSON.parse(dataStr);
            // Update cache with the body if it exists
            if (emailCache[userId] && emailCache[userId][folder || 'INBOX']) {
                const email = emailCache[userId][folder || 'INBOX'].emails.find(e => String(e.messageId) === String(uid));
                if (email) {
                    email.body = bodyData.body;
                    email.htmlBody = bodyData.htmlBody;
                    email.isPartial = false;
                }
            }
            res.json(bodyData);
        } catch (err) { res.status(500).json({ error: "Parse error" }); }
    });
});

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
    const { memberId, emailId } = req.body;
    const result = await moveEmail(memberId, emailId, 'INBOX', 'Archivados');

    // Invalidate/Update cache
    if (result && !result.error) {
        if (emailCache[memberId]) {
            if (emailCache[memberId]['INBOX']) {
                emailCache[memberId]['INBOX'].emails = emailCache[memberId]['INBOX'].emails.filter(e => String(e.messageId) !== String(emailId));
            }
            // Instead of immediate fetch (memory spike), just clear cache forcing refresh on next visit
            delete emailCache[memberId]['Archivados'];
        }
    }

    res.json(result);
});

app.post('/api/emails/move', async (req, res) => {
    const { userId, uid, source, target } = req.body;
    const result = await moveEmail(userId, uid, source, target);
    if (result && !result.error) {
        if (emailCache[userId]) {
            if (emailCache[userId][source]) {
                emailCache[userId][source].emails = emailCache[userId][source].emails.filter(e => String(e.messageId) !== String(uid));
            }
            // Invalidate target cache instead of immediate fetch
            delete emailCache[userId][target];
        }
    }
    res.json(result);
});

app.get('/api/emails/processed', (req, res) => {
    const db = readDB();
    res.json(db.processed_emails || []);
});


app.post('/api/emails/mark-processed', (req, res) => {
    const { uid, persistentId, subject, user } = req.body;
    const db = readDB();
    if (!db.processed_emails) db.processed_emails = [];

    // Store both UID and PersistentID to be safe, but we'll primarily check PersistentID
    const idToStore = persistentId || String(uid);

    if (!db.processed_emails.includes(idToStore)) {
        db.processed_emails.push(idToStore);
        logActivity(db, 'mail', `Correu convertit a fitxa: ${subject || 'Sense assumpte'}`, user || 'Sistema');
        if (db.processed_emails.length > 500) db.processed_emails.shift();
        writeDB(db);
    }
    res.json({ success: true });
});

app.post('/api/emails/unmark-processed', async (req, res) => {
    const { memberId, uid, persistentId } = req.body;
    const db = readDB();
    if (db.processed_emails) {
        db.processed_emails = db.processed_emails.filter(id => id !== String(uid) && id !== String(persistentId));
        writeDB(db);
    }
    // Restore back to INBOX from Archivados
    if (memberId && uid) {
        await moveEmail(memberId, uid, 'Archivados', 'INBOX');
        updateEmailCache(memberId, 'Archivados');
        updateEmailCache(memberId, 'INBOX');
    }
    res.json({ success: true });
});

app.get('/api/emails/replied', (req, res) => {
    const db = readDB();
    res.json(db.replied_emails || []);
});

app.get('/api/emails/deleted', (req, res) => {
    const db = readDB();
    res.json(db.deleted_emails || []);
});

app.get('/api/emails/spam', (req, res) => {
    const db = readDB();
    res.json(db.spam_emails || []);
});

app.post('/api/emails/empty-trash', async (req, res) => {
    const { userId, folder } = req.body;
    const config = loadEnv();
    const CRED_MAP = { 'albat': 'ATEIXIDO', 'albap': 'ALBA', 'web': 'WEB', 'licitacions': 'LICITACIONS' };
    const envKey = CRED_MAP[userId] || userId.toUpperCase();
    const user = process.env[`IMAP_USER_${envKey}`] || config[`IMAP_USER_${envKey}`];
    const pass = process.env[`IMAP_PASS_${envKey}`] || config[`IMAP_PASS_${envKey}`];

    if (!user || !pass) return res.status(400).json({ error: "No credentials" });

    const targetFolder = folder || 'Papelera';

    const combinedEnv = { ...process.env, IMAP_HOST: process.env.IMAP_HOST || config.IMAP_HOST, IMAP_PORT: process.env.IMAP_PORT || config.IMAP_PORT };
    const pythonProcess = spawn('python3', [path.join(__dirname, 'fetch_mails.py'), user, pass, '--empty-folder', targetFolder], { env: combinedEnv });

    pythonProcess.on('error', (err) => {
        console.error(`❌ Failed to start Python process for empty-trash [${userId}]:`, err);
        res.status(500).json({ error: "Failed to start empty-trash process: " + err.message });
    });

    let dataStr = "";
    pythonProcess.stdout.on('data', (d) => { dataStr += d.toString(); });
    pythonProcess.on('close', (code) => {
        try {
            const result = JSON.parse(dataStr);
            if (result.status === 'emptied') {
                const db = readDB();
                db.deleted_emails = [];
                writeDB(db);
                if (emailCache[userId]) delete emailCache[userId][targetFolder];
            }
            res.json(result);
        } catch (err) { res.status(500).json({ error: "Parse error empty trash" }); }
    });
});

app.post('/api/emails/delete-local', (req, res) => {
    const { uid } = req.body;
    const db = readDB();
    if (!db.deleted_emails) db.deleted_emails = [];
    if (!db.deleted_emails.includes(String(uid))) {
        db.deleted_emails.push(String(uid));
        // Also save timestamp for auto-cleanup (30 days)
        if (!db.deleted_meta) db.deleted_meta = {};
        db.deleted_meta[String(uid)] = Date.now();
        writeDB(db);
    }
    res.json({ success: true });
});

app.post('/api/emails/restore-local', (req, res) => {
    const { uid } = req.body;
    const db = readDB();
    if (db.deleted_emails) {
        db.deleted_emails = db.deleted_emails.filter(id => id !== String(uid));
        if (db.deleted_meta) delete db.deleted_meta[String(uid)];
        writeDB(db);
    }
    res.json({ success: true });
});

// Auto-cleanup Job: runs every 24h
setInterval(() => {
    const db = readDB();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    let changed = false;

    if (db.deleted_meta) {
        for (const uid in db.deleted_meta) {
            if (db.deleted_meta[uid] < thirtyDaysAgo) {
                delete db.deleted_meta[uid];
                db.deleted_emails = (db.deleted_emails || []).filter(id => id !== uid);
                changed = true;
            }
        }
    }
    if (changed) writeDB(db);
}, 24 * 60 * 60 * 1000);

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

app.post('/api/emails/send', async (req, res) => {
    const { memberId, to, subject, body, replyToId, attachments } = req.body;
    const config = loadEnv();

    // Prepare attachment paths for python (ensure they exist and are relative to server dir)
    const attachmentPaths = (attachments || []).map(p => {
        const filename = p.split('/').pop();
        return path.join(__dirname, 'uploads', filename);
    });

    const CRED_MAP = {
        'montse': 'MONTSE',
        'neus': 'NEUS',
        'alba': 'ALBA',
        'ateixido': 'ATEIXIDO',
        'omar': 'OMAR',
        'web': 'WEB',
        'ines': 'INES',
        'comptabilitat': 'COMPTABILITAT',
        'licitacions': 'LICITACIONS',
        'gestio': 'GESTIO',
        'test': 'TEST'
    };

    const envKey = CRED_MAP[memberId] || memberId.toUpperCase();
    const user = process.env[`IMAP_USER_${envKey}`] || config[`IMAP_USER_${envKey}`];
    const pass = process.env[`IMAP_PASS_${envKey}`] || config[`IMAP_PASS_${envKey}`];

    if (!user || !pass) {
        return res.status(400).json({ error: "Credentials missing for " + memberId });
    }

    try {
        const combinedEnv = {
            ...process.env,
            SMTP_HOST: process.env.SMTP_HOST || config.SMTP_HOST,
            SMTP_PORT: process.env.SMTP_PORT || config.SMTP_PORT
        };

        const pythonProcess = spawn('python3', [
            path.join(__dirname, 'fetch_mails.py'),
            user,
            pass,
            '--send',
            to,
            subject,
            body,
            JSON.stringify(attachmentPaths)
        ], { env: combinedEnv });

        pythonProcess.on('error', (err) => {
            console.error(`❌ Failed to start Python process for send [${memberId}]:`, err);
            res.status(500).json({ error: "Failed to start send process: " + err.message });
        });

        let dataStr = "";
        let errorStr = "";
        pythonProcess.stdout.on('data', (d) => { dataStr += d.toString(); });
        pythonProcess.stderr.on('data', (d) => { errorStr += d.toString(); });

        pythonProcess.on('close', (code) => {
            if (code !== 0) return res.status(500).json({ error: "Sender script error", details: errorStr });
            try {
                if (!dataStr.trim()) {
                    return res.status(500).json({ error: "Empty response from sender script", details: errorStr });
                }
                const result = JSON.parse(dataStr);
                if (result.error) return res.status(500).json(result);

                // Log activity
                const db = readDB();
                logActivity(db, 'mail', `Correu enviat a ${to}: ${subject}`, memberId);

                // --- DRIVE INTEGRATION: Save sent attachments ---
                if (attachmentPaths.length > 0) {
                    let drivePath = DRIVE_MEMBER_MAPPING[memberId] || ['OTROS'];

                    // Add Client Name to path if found
                    const clientName = getClientNameFromEmail(to);
                    if (clientName) {
                        drivePath = [...drivePath, clientName];
                    }

                    attachmentPaths.forEach(fpath => {
                        try {
                            const content = fs.readFileSync(fpath);
                            const filename = path.basename(fpath);
                            saveFileToDrive(filename, content.toString('base64'), drivePath);
                        } catch (e) {
                            console.error("Error reading sent attachment for Drive", e);
                        }
                    });
                }

                // Track replied status
                if (replyToId) {
                    if (!db.replied_emails) db.replied_emails = [];
                    const uniqueUid = `${memberId}-${replyToId}`;
                    if (!db.replied_emails.includes(uniqueUid)) {
                        db.replied_emails.push(uniqueUid);
                    }
                    // RULE: Move to Archivados folder in IMAP after responding
                    moveEmail(memberId, replyToId, 'INBOX', 'Archivados').catch(err => console.error("Move to Archivados failed", err));
                    updateEmailCache(memberId, 'INBOX');
                    updateEmailCache(memberId, 'Archivados');
                }

                writeDB(db);
                res.json(result);
            } catch (err) {
                res.status(500).json({ error: "Parse error", raw: dataStr, details: errorStr });
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- HELPER: Send Summary Email ---
async function sendSummaryEmail(to, subject, body) {
    const config = loadEnv();
    const user = process.env.IMAP_USER_LICITACIONS || config.IMAP_USER_LICITACIONS;
    const pass = process.env.IMAP_PASS_LICITACIONS || config.IMAP_PASS_LICITACIONS;

    if (!user || !pass) {
        console.error("❌ Cannot send summary: Credentials missing for licitacions");
        return;
    }

    const combinedEnv = {
        ...process.env,
        SMTP_HOST: process.env.SMTP_HOST || config.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT || config.SMTP_PORT
    };

    const pythonProcess = spawn('python3', [
        path.join(__dirname, 'fetch_mails.py'),
        user,
        pass,
        '--send',
        to,
        subject,
        body,
        JSON.stringify([])
    ], { env: combinedEnv });

    return new Promise((resolve) => {
        pythonProcess.on('error', (err) => {
            console.error(`❌ Failed to start Python process for summary-email:`, err);
            resolve();
        });
        pythonProcess.on('close', (code) => {
            if (code === 0) console.log(`📧 Summary email sent to ${to}`);
            else console.error(`❌ Failed to send summary email (Exit code ${code})`);
            resolve();
        });
    });
}

app.post('/api/emails/log', async (req, res) => {
    const { from, subject, projectPath, messageId, member } = req.body;
    await logToGoogleSheet({ from, subject, projectPath, messageId, member });
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

app.put('/api/data', (req, res) => {
    const db = readDB();
    const newData = req.body;
    for (const key in newData) {
        db[key] = newData[key];
    }
    writeDB(db);
    res.json({ success: true, data: db });
});

// Save all data (Global sync)
app.post('/api/save-data', (req, res) => {
    const data = req.body;
    if (!data) return res.status(400).json({ error: "No data provided" });
    writeDB(data);
    res.json({ success: true });
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
    syncToGoogleSheets();
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
    syncToGoogleSheets();
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
    syncToGoogleSheets();
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
        createdAt: new Date().toISOString(),
        startDate: cardData.startDate || new Date().toISOString()
    };

    db.cards.push(newCard);
    logActivity(db, 'card', `Nova tarjeta: ${newCard.title}`, newCard.responsibleId || 'Sistema');
    writeDB(db);
    syncToGoogleSheets();
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
    syncToGoogleSheets();
    res.json(db.cards[cardIndex]);
});

app.delete('/api/cards/:id', (req, res) => {
    const db = readDB();
    const { id } = req.params;
    db.cards = db.cards.filter(c => c.id !== id);
    writeDB(db);
    syncToGoogleSheets();
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
        console.log("Syncing with Google Script:", GOOGLE_SCRIPT_URL);
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            headers: { 'User-Agent': 'Mozilla/5.0 (LaGràfica Project Manager)' }
        });
        const textOutput = await response.text();

        let data;
        try {
            data = JSON.parse(textOutput);
        } catch (e) {
            console.error("Google Script returned non-JSON:", textOutput.substring(0, 200));
            return res.status(500).json({
                error: "El servidor de Google no ha retornat un format correcte (JSON). Revisa que el Script estigui publicat com a 'Aplicació Web' i amb accés per a 'Cadascú' (Anyone).",
                details: "doGet no ha retornat JSON",
                raw: textOutput.substring(0, 100)
            });
        }

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

        // --- Notify if new alerts found ---
        if (alerts.length > 0) {
            const summary = alerts.map(a => `- ${a.title}\n  🏢 Institució: ${a.source}\n  🔗 ${a.link}`).join('\n\n');
            const emailBody = `Hola Montse,\n\nEl robot de Licitacions ha trobat ${alerts.length} noves oportunitats a PLACSP i PSC:\n\n${summary}\n\nPots revisar-les al teu Project Manager.\n\nSalutacions,\nLicitacIA Pro`;

            await sendSummaryEmail('montse@lagrafica.com', `🚀 ${alerts.length} Noves Licitacions Detectades!`, emailBody);
        }

        res.json({ success: true, filesFound: files.length, alertsFound: alerts.length });
    } catch (err) {
        console.error("Error syncing with Google Script:", err);
        res.status(500).json({ error: "Failed to sync with Google" });
    }
});

// --- LICITACIONS AUTOMATION (LaGrafica Pro) ---
const CPV_LIST = [
    { code: '79341000-6', desc: 'Servicios de publicidad' },
    { code: '79341400-0', desc: 'Servicios de campañas publicitarias' },
    { code: '79342000-3', desc: 'Servicios de marketing' },
    { code: '79341200-8', desc: 'Servicios de creación y desarrollo de contenido publicitario' },
    { code: '79416000-3', desc: 'Servicios de relaciones públicas y comunicación' },
    { code: '79822500-7', desc: 'Servicios de diseño gráfico' },
    { code: '79823000-2', desc: 'Servicios de maquetación' },
    { code: '72413000-8', desc: 'Servicios de diseño de sitios web' },
    { code: '72420000-0', desc: 'Servicios de desarrollo de sitios web' }
];

async function automateLicitaciones() {
    console.log("🚀 [AUTOMATION] Starting Licitaciones Scan at", new Date().toLocaleString());
    const db = readDB();
    const config = loadEnv();

    // 1. SCAN GMAIL (lagraficacreative@gmail.com) -> Targeted Tenders
    const gmailUser = process.env.IMAP_USER_LICITACIONS || config.IMAP_USER_LICITACIONS;
    const gmailPass = process.env.IMAP_PASS_LICITACIONS || config.IMAP_PASS_LICITACIONS;

    if (gmailUser && gmailPass) {
        try {
            const emails = await fetchRealEmails('licitacions', 'INBOX');
            if (Array.isArray(emails)) {
                for (const email of emails) {
                    if (email.from && email.from.includes('plataforma.contractacio@gencat.cat')) {
                        // Extract fields
                        const title = email.subject.replace(/Notificació:\s*/, '');
                        const institution = (email.body.match(/Òrgan de contractació:\s*(.*)/) || [])[1] || 'Generalitat';
                        const deadline = (email.body.match(/límit de presentació:\s*([0-9\/\.\-]+)/) || [])[1] || 'Pendent';
                        const link = (email.body.match(/Enllaç:\s*(https?:\/\/[^\s]+)/) || [])[1] || '';
                        const cpvMatch = email.body.match(/CPV:\s*([0-9\-]+)/);
                        const cpv = cpvMatch ? cpvMatch[1] : '';

                        // Check if exists
                        const exists = (db.alerts || []).find(a => a.link === link || (a.title === title && a.date === deadline));
                        if (!exists) {
                            if (!db.alerts) db.alerts = [];
                            db.alerts.push({
                                id: 'alert_auto_' + Date.now() + Math.random().toString(36).substr(2, 5),
                                title,
                                source: institution,
                                date: deadline,
                                link,
                                cpv,
                                cpv_desc: CPV_LIST.find(c => c.code.includes(cpv))?.desc || '',
                                type: 'email_tender',
                                createdAt: Date.now(),
                                isNew: true
                            });
                        }
                    }
                }
            }
        } catch (err) { console.error("Error scanning Gmail Licitacions:", err); }
    }

    // 2. SCAN MONTSE (montse@lagrafica.com) -> Urgent Alerts / Notificacions
    const montseUser = process.env.IMAP_USER_ATEIXIDO || config.IMAP_USER_ATEIXIDO; // Assuming Montse's account
    const montsePass = process.env.IMAP_PASS_ATEIXIDO || config.IMAP_PASS_ATEIXIDO;

    if (montseUser && montsePass) {
        try {
            const emails = await fetchRealEmails('albat', 'INBOX');
            if (Array.isArray(emails)) {
                const alertSenders = ['plataforma.contractacio@gencat.cat', 'noreply@bcn.cat', 'norespongueu@enotum.cat', '@enotum.cat'];
                const alertSubjects = ['IMPORTANT: Avís de notificació', 'Notificació enviada', 'RECORDATORI: Avís de notificació'];

                for (const email of emails) {
                    const isAlertSender = alertSenders.some(s => email.from.includes(s));
                    const isAlertSubject = alertSubjects.some(s => email.subject.includes(s));

                    if (isAlertSender && isAlertSubject) {
                        const exists = (db.alerts || []).find(a => a.title === email.subject && a.date.includes(email.date.substring(0, 10)));
                        if (!exists) {
                            if (!db.alerts) db.alerts = [];
                            db.alerts.push({
                                id: 'alert_urgent_' + Date.now() + Math.random().toString(36).substr(2, 5),
                                title: email.subject,
                                source: email.from,
                                date: email.date,
                                body: email.body.substring(0, 500),
                                type: 'urgent_notificacion',
                                createdAt: Date.now(),
                                isNew: true
                            });
                        }
                    }
                }
            }
        } catch (err) { console.error("Error scanning Montse's Alerts:", err); }
    }

    // 3. TEST SCAN (montsetorrelles@gmail.com) -> For testing previous tenders
    const testUser = process.env.IMAP_USER_TEST || config.IMAP_USER_TEST;
    const testPass = process.env.IMAP_PASS_TEST || config.IMAP_PASS_TEST;

    if (testUser && testPass) {
        try {
            const emails = await fetchRealEmails('test', 'INBOX');
            if (Array.isArray(emails)) {
                const alertSenders = ['plataforma.contractacio@gencat.cat', 'noreply@bcn.cat', 'norespongueu@enotum.cat', '@enotum.cat'];
                const alertSubjects = ['IMPORTANT: Avís de notificació', 'Notificació enviada', 'RECORDATORI: Avís de notificació'];

                for (const email of emails) {
                    const isGencat = email.from && email.from.includes('plataforma.contractacio@gencat.cat');
                    const isAlertSender = alertSenders.some(s => email.from && email.from.includes(s));
                    const isAlertSubject = alertSubjects.some(s => email.subject && email.subject.includes(s));

                    if (isGencat || (isAlertSender && isAlertSubject)) {
                        const exists = (db.alerts || []).find(a => a.link === email.link || (a.title === email.subject && a.date.includes(email.date.substring(0, 10))));
                        if (!exists) {
                            if (!db.alerts) db.alerts = [];

                            if (isGencat && !isAlertSubject) {
                                // Extract as full tender
                                const title = email.subject.replace(/Notificació:\s*/, '');
                                const institution = (email.body.match(/Òrgan de contractació:\s*(.*)/) || [])[1] || 'Generalitat (Test)';
                                const deadline = (email.body.match(/límit de presentació:\s*([0-9\/\.\-]+)/) || [])[1] || 'Pendent';
                                const link = (email.body.match(/Enllaç:\s*(https?:\/\/[^\s]+)/) || [])[1] || '';
                                const cpvMatch = email.body.match(/CPV:\s*([0-9\-]+)/);
                                const cpv = cpvMatch ? cpvMatch[1] : '';

                                db.alerts.push({
                                    id: 'alert_test_' + Date.now() + Math.random().toString(36).substr(2, 5),
                                    title,
                                    source: institution,
                                    date: deadline,
                                    link,
                                    cpv,
                                    cpv_desc: CPV_LIST.find(c => c.code.includes(cpv))?.desc || '',
                                    type: 'test_tender',
                                    createdAt: Date.now(),
                                    isNew: true
                                });
                            } else {
                                // Extract as alert
                                db.alerts.push({
                                    id: 'alert_test_urgent_' + Date.now() + Math.random().toString(36).substr(2, 5),
                                    title: email.subject,
                                    source: email.from,
                                    date: email.date,
                                    body: email.body.substring(0, 500),
                                    type: 'test_urgent',
                                    createdAt: Date.now(),
                                    isNew: true
                                });
                            }
                        }
                    }
                }
            }
        } catch (err) { console.error("Error scanning Test Gmail:", err); }
    }

    writeDB(db);
    console.log("✅ [AUTOMATION] Licitaciones Scan Finished.");
}

// CRON Logic: Check every minute if it's 7:00 AM
setInterval(() => {
    const now = new Date();
    if (now.getHours() === 7 && now.getMinutes() === 0) {
        automateLicitaciones();
    }
}, 60000);

app.post('/api/licitaciones/trigger-automation', async (req, res) => {
    await automateLicitaciones();
    res.json({ success: true, message: "Automation triggered successfully" });
});

app.post('/api/export-sheets', async (req, res) => {
    if (!GOOGLE_SCRIPT_URL) {
        return res.status(400).json({ error: "Google Script URL not configured" });
    }
    try {
        const db = readDB();
        const payload = {
            action: 'export_all',
            boards: db.boards || [],
            cards: db.cards || [],
            users: db.users || []
        };

        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (LaGràfica Project Manager)'
            },
            body: JSON.stringify(payload)
        });

        res.json({ success: true, message: "Export initiated" });
    } catch (err) {
        console.error("Error exporting to Google Sheets:", err);
        res.status(500).json({ error: "Failed to export to Google Sheets" });
    }
});

// --- SPA FALLBACK ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

syncToGoogleSheets();

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
