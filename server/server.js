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
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf8');
    const config = {};
    content.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) config[key.trim()] = value.trim();
    });
    return config;
};

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
            time_entries: []
        };
        fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    } else {
        data = JSON.parse(fs.readFileSync(DB_FILE));
    }

    // Ensure Required Boards Exist
    const requiredBoards = [
        // Services
        { id: 'b_design', title: 'Disseny Gràfic' },
        { id: 'b_social', title: 'Xarxes Socials' },
        { id: 'b_web', title: 'Desenvolupament Web' },
        { id: 'b_ai', title: 'Projectes IA' },

        // Clients
        { id: 'b_lleida', title: 'Lleida en verd' },
        { id: 'b_animac', title: 'Animac' },
        { id: 'b_imo', title: 'Imo' },
        { id: 'b_diba', title: 'Diba' },

        // Management
        { id: 'b_management', title: 'Gestió' },
        { id: 'b_budget', title: 'Pressupostos' },
        { id: 'b_billing', title: 'Facturació' },
        { id: 'b_tenders', title: 'Licitacions' }
    ];

    let changed = false;
    requiredBoards.forEach(req => {
        if (!data.boards.find(b => b.id === req.id)) { // Check by ID primarily to avoid duplicates if titles change
            data.boards.push({
                id: req.id,
                title: req.title,
                columns: [
                    { id: `c_todo_${req.id}`, title: 'Pendiente' },
                    { id: `c_doing_${req.id}`, title: 'En curso' },
                    { id: `c_done_${req.id}`, title: 'Hecho' }
                ]
            });
            changed = true;
        }
    });

    // Ensure Users are Up-to-Date (Adding Maribel and Images)
    // Ensure Users are Up-to-Date (Adding Maribel and Images)
    const updatedUsers = [
        { id: 'montse', name: 'Montse', role: 'admin', avatar: 'M', avatarImage: '/avatars/montse.jpg' },
        { id: 'neus', name: 'Neus', role: 'team', avatar: 'N', avatarImage: '/avatars/neus.jpg' },
        { id: 'omar', name: 'Omar', role: 'team', avatar: 'O', avatarImage: '/avatars/omar.png' },
        { id: 'albat', name: 'Alba T', role: 'team', avatar: 'AT', avatarImage: '/avatars/albat.jpg' },
        { id: 'albap', name: 'Alba P', role: 'team', avatar: 'AP', avatarImage: '/avatars/albap.jpg' },
        { id: 'ines', name: 'Ines', role: 'team', avatar: 'I' },
        { id: 'maribel', name: 'Maribel', role: 'team', avatar: 'Ma', avatarImage: '/avatars/maribel.jpg' }
    ];

    updatedUsers.forEach(u => {
        const idx = data.users.findIndex(existing => existing.id === u.id);
        if (idx >= 0) {
            // Update existing
            if (data.users[idx].avatarImage !== u.avatarImage) {
                data.users[idx] = { ...data.users[idx], ...u };
                changed = true;
            }
        } else {
            // Add new
            data.users.push(u);
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

// --- REAL EMAIL FETCHER (PYTHON BRIDGE) ---
async function fetchRealEmails(memberId, folder = 'INBOX') {
    const config = loadEnv();
    const user = config[`IMAP_USER_${memberId.toUpperCase()}`];
    const pass = config[`IMAP_PASS_${memberId.toUpperCase()}`];

    if (!user || !pass) {
        console.log(`⚠️ No real credentials for ${memberId}. Using mock data.`);
        return null; // Signals fallback to mock data
    }

    return new Promise((resolve) => {
        console.log(`📡 [EMAIL FETCH] Connecting to Nominalia for: ${user} in ${folder}...`);
        const pythonProcess = spawn('python3', [path.join(__dirname, 'fetch_mails.py'), user, pass, folder]);
        let dataStr = "";
        let errorStr = "";

        pythonProcess.stdout.on('data', (data) => { dataStr += data.toString(); });
        pythonProcess.stderr.on('data', (data) => { errorStr += data.toString(); });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`❌ Python Fetcher Error: ${errorStr}`);
                resolve({ error: errorStr });
                return;
            }
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
async function archiveEmail(memberId, uid) {
    const config = loadEnv();
    const user = config[`IMAP_USER_${memberId.toUpperCase()}`];
    const pass = config[`IMAP_PASS_${memberId.toUpperCase()}`];

    if (!user || !pass) return { error: "No credentials" };

    return new Promise((resolve) => {
        const pythonProcess = spawn('python3', [path.join(__dirname, 'fetch_mails.py'), user, pass, '--archive', uid]);
        let dataStr = "";

        pythonProcess.stdout.on('data', (data) => { dataStr += data.toString(); });

        pythonProcess.on('close', (code) => {
            try {
                const result = JSON.parse(dataStr);
                resolve(result);
            } catch (err) {
                resolve({ error: "Parse error" });
            }
        });
    });
}

app.get('/api/emails/:userId', async (req, res) => {
    const { userId } = req.params;
    const { folder } = req.query; // 'INBOX' or 'Archivo_Fichas/Correos_Procesados'
    const targetFolder = folder || 'INBOX';

    const emails = await fetchRealEmails(userId, targetFolder);
    if (!emails) {
        // Fallback to mock data if no credentials
        const db = readDB();
        return res.json(db.emails || []);
    }
    res.json(emails);
});

app.post('/api/emails/archive', async (req, res) => {
    const { userId, uid } = req.body;
    const result = await archiveEmail(userId, uid);
    res.json(result);
});


// --- API ROUTES ---

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
            { id: 'col_1_' + Date.now(), title: 'To Do' },
            { id: 'col_2_' + Date.now(), title: 'In Progress' },
            { id: 'col_3_' + Date.now(), title: 'Done' }
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


// --- SPA FALLBACK ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
