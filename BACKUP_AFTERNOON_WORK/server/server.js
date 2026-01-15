const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;
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

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files from root

// Helper to read DB
const readDB = () => {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            projects: [],
            // Sample Tasks
            tasks: [
                { id: 1, title: 'Rediseño Logo', scope: 'design', status: 'in_progress', priority: 'high', client: 'LaGràfica', assignee: 'neus' },
                { id: 2, title: 'Landing Page Evento', scope: 'web', status: 'todo', priority: 'medium', client: 'Ayto. BCN', assignee: 'montse' },
                { id: 3, title: 'Reels Enero', scope: 'social', status: 'review', priority: 'low', client: 'Café 365', assignee: 'alba' }
            ],
            members: [
                { id: 'montse', name: 'Montse', email: 'montse@lagrafica.com', role: 'Director', avatar: 'M' },
                { id: 'neus', name: 'Neus', email: 'neus@lagrafica.com', role: 'Design', avatar: 'N' },
                { id: 'alba', name: 'Alba', email: 'alba@lagrafica.com', role: 'Social', avatar: 'A' },
                { id: 'ateixido', name: 'A. Teixidó', email: 'ateixido@lagrafica.com', role: 'Web', avatar: 'T' },
                { id: 'omar', name: 'Omar', email: 'omar@lagrafica.com', role: 'Dev', avatar: 'O' },
                { id: 'web', name: 'Web General', email: 'web@lagrafica.com', role: 'Admin', avatar: 'W' }
            ],
            clients: [
                { id: 1, name: 'LaGràfica', email: 'info@lagrafica.com' },
                { id: 2, name: 'Ayto. BCN', email: 'comunicacio@bcn.cat' }
            ],
            emails: [
                { id: 101, from: 'noreply.dehu@correo.gob.es', to: 'ateixido@lagrafica.com', subject: 'Notificación Kit Digital', body: 'Su solicitud de Kit Digital ha sido procesada correctamente. Adjuntamos pliegos.', date: '2024-01-07', read: false, attachments: [{ filename: 'pliego_kit.pdf' }] },
                { id: 102, from: 'paeria@paeria.es', to: 'neus@lagrafica.com', subject: 'Campaña Fiestas de Mayo', body: 'Necesitamos el diseño para el cartel de las Fiestas de Mayo de este año.', date: '2024-01-06', read: true },
                { id: 103, from: 'admin@lagrafica.com', to: 'montse@lagrafica.com', subject: 'Nueva Licitación Diputació', body: 'Montse, ha salido una nueva licitación en la Diputació de Lleida que nos interesa.', date: '2024-01-07', read: false }
            ]
        };
        fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
        return initialData;
    }
    return JSON.parse(fs.readFileSync(DB_FILE));
};

const writeDB = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// --- REAL EMAIL FETCHER (PYTHON BRIDGE) ---
async function fetchRealEmails(memberId) {
    const config = loadEnv();
    const user = config[`IMAP_USER_${memberId.toUpperCase()}`];
    const pass = config[`IMAP_PASS_${memberId.toUpperCase()}`];

    if (!user || !pass) {
        console.log(`⚠️ No real credentials for ${memberId}. Using mock data.`);
        return null; // Signals fallback to mock data
    }

    return new Promise((resolve) => {
        console.log(`📡 [EMAIL FETCH] Connecting to Nominalia for: ${user}...`);
        const pythonProcess = spawn('python3', [path.join(__dirname, 'fetch_mails.py'), user, pass]);
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

// --- GOOGLE DRIVE AUTOMATION (MOCK) ---
const MockDrive = {
    teamEmails: {
        alba: 'alba@lagrafica.com',
        montse: 'montse@lagrafica.com',
        neus: 'neus@lagrafica.com',
        ateixido: 'ateixido@lagrafica.com',
        omar: 'omar@lagrafica.com'
    },

    scopeMapping: {
        'design': '🎨 Diseño',
        'web': '🌐 Web',
        'social': '📱 Redes Sociales',
        'kit': '⚡ KIT DIGITAL',
        'tenders': '📋 LICITACIONES',
        'budgets': '💰 Presupuestos (privado)',
        'billing': '🧾 Gestión y Facturación (privado)'
    },

    async createProjectFolder(task) {
        const folderName = this.scopeMapping[task.scope] || task.scope.toUpperCase();
        console.log(`\n📂 [DRIVE API] Creating root folder: "LaGràfica Projects / ${folderName} / ${task.title}"`);

        // 1. Root Folder Creation
        const folderId = "drive_" + Math.random().toString(36).substring(7);
        const driveLink = `https://drive.google.com/drive/folders/${folderId}`;

        // 2. Subfolders for responsible member
        if (task.assignee) {
            console.log(`   └─ Creating subfolder for responsible: /${task.assignee.toUpperCase()} (${this.teamEmails[task.assignee] || ''})`);
        }

        // 3. Permissions Logic
        this.applyPermissions(task, folderId);

        return driveLink;
    },

    applyPermissions(task, folderId) {
        console.log(`🛡️ [DRIVE API] Applying Permissions for area: ${this.scopeMapping[task.scope] || task.scope}`);
        const { scope } = task;

        if (scope === 'design' || scope === 'social' || scope === 'web') {
            console.log(`   🔓 Access GRANTED to Creative Team (Read/Edit)`);
            if (scope === 'web') console.log(`   🌐 Specific Access: Omar + Dirección`);
            if (scope === 'social') console.log(`   📱 Specific Access: Alba Teixidó + Dirección`);
        } else if (scope === 'budgets' || scope === 'billing') {
            console.log(`   🛑 RESTRICTED: Access only for Dirección & Administración`);
            console.log(`   🔒 Folders BLOQUEADAS for creative team.`);
            if (scope === 'billing') console.log(`   🧾 Private Access: Only Administración`);
        }
    },

    async archiveProject(task) {
        console.log(`📦 [DRIVE API] Archiving project "${task.title}" to "📦 Archivo 2026"`);
        console.log(`   🚚 Moving folder from /${this.scopeMapping[task.scope] || task.scope} to /🧾 Gestión y Facturación (privado)/2026-03 Proyectos Facturados`);
    }
};

// --- API ROUTES ---

// Get all data
app.get('/api/data', (req, res) => {
    const data = readDB();
    res.json(data);
});

// REAL MAILBOX FETCHING (NOMINALIA BRIDGE)
app.get('/api/mailbox/:memberId', async (req, res) => {
    const { memberId } = req.params;
    const db = readDB();

    // Try to get real emails
    const realEmails = await fetchRealEmails(memberId);

    if (realEmails && !realEmails.error) {
        // Return real ones if available
        res.json({ emails: realEmails });
    } else {
        // Fallback to mock data from DB
        const member = db.members.find(m => m.id === memberId);
        const mockEmails = db.emails.filter(e => e.to === (member ? member.email : ''));
        res.json({ emails: mockEmails, note: (realEmails && realEmails.error) ? `Error: ${realEmails.error}` : "Usando datos de simulación (no hay credenciales)" });
    }
});

// Add Task
app.post('/api/tasks', async (req, res) => {
    const db = readDB();
    const newTask = req.body;

    if (!newTask.title) return res.status(400).json({ error: "Title required" });

    newTask.id = Date.now();
    newTask.date = new Date().toISOString().split('T')[0];

    // --- AUTOMATION: Create Google Drive Folder ---
    const driveLink = await MockDrive.createProjectFolder(newTask);
    newTask.drive_link = driveLink;

    db.tasks.push(newTask);
    writeDB(db);

    console.log(`✅ Task Created: ${newTask.title} (${newTask.scope})`);
    console.log(`🔗 Auto-generated Drive Link: ${driveLink}`);

    res.json(newTask);
});

// Update Task Status
app.put('/api/tasks/:id', async (req, res) => {
    const db = readDB();
    const taskId = parseInt(req.params.id);
    const { status } = req.body;

    const task = db.tasks.find(t => t.id === taskId);
    if (task) {
        const oldStatus = task.status;
        task.status = status;

        // Automation Trigger: DONE
        if (status === 'done' && oldStatus !== 'done') {
            console.log(`💰 BILLING TRIGGER: Sending task "${task.title}" to Brouter/Invoice Board...`);
            await MockDrive.archiveProject(task);
        }

        writeDB(db);
        res.json(task);
    } else {
        res.status(404).json({ error: "Task not found" });
    }
});

// --- INTEGRATIONS (Webhooks) ---

// OpenAI Mock Service
async function classifyContent(text, fromEmail = '') {
    const t = text.toLowerCase();
    const from = fromEmail.toLowerCase();

    // ⚡ KIT DIGITAL
    if (from.includes('noreply.dehu@correo.gob.es') ||
        from.includes('@acelerapyme.gob.es') ||
        t.includes('kit digital') ||
        t.includes('kit consulting')) {
        return { scope: 'kit', assignee: 'ateixido' };
    }

    // 📋 LICITACIONES
    if (from.includes('admin@lagrafica.com') ||
        from.includes('plataforma.contractacio@gencat.cat') ||
        from.includes('mailcontrataciondelestado@contrataciondelsectorpublico.gob.es') ||
        from.includes('norespongueu@enotum.cat')) {
        return { scope: 'tenders', assignee: 'montse' };
    }

    // 🎨 DISEÑO
    // Neus' clients
    if (from.includes('@paeria.es') || from.includes('@aralleida.cat') || from.includes('@diputaciolleida.es') || from.includes('@dipsalut.cat')) {
        return { scope: 'design', assignee: 'neus' };
    }
    // Alba's clients
    if (from.includes('@ausolan.com') || from.includes('@juntadeandalucia.es') || from.includes('@baixebre.cat')) {
        return { scope: 'design', assignee: 'alba' };
    }
    // Montse's clients
    if (from.includes('@gencat') || from.includes('@udl.cat') || from.includes('@concadebarbera.cat')) {
        return { scope: 'design', assignee: 'montse' };
    }

    // 💰 GESTIÓN / BILLING
    if (from.includes('@rovirabergua.com') ||
        from.includes('notificaciones-bbva@bbva.com') ||
        from.includes('bbva@comunica.bbva.com') ||
        from.includes('bbva.com')) {
        return { scope: 'billing', assignee: 'alba' };
    }

    // 📱 XARXES (Social)
    if (from.includes('imo@lagrafica.com') || from.includes('@ibersol.es')) {
        return { scope: 'social', assignee: 'alba' };
    }

    // General keywords
    if (t.includes('web') || t.includes('página') || t.includes('seo')) return { scope: 'web', assignee: 'ateixido' };
    if (t.includes('logo') || t.includes('diseño') || t.includes('flyer')) return { scope: 'design', assignee: 'neus' };
    if (t.includes('post') || t.includes('instagram') || t.includes('redes')) return { scope: 'social', assignee: 'alba' };

    return { scope: 'budgets', assignee: 'montse' }; // Default
}

// WhatsApp Webhook (Mock)
app.post('/api/webhook/whatsapp', async (req, res) => {
    const { from, message } = req.body; // Adapt to actual WhatsApp Business API payload
    console.log(`💬 WhatsApp from ${from}: ${message}`);

    const classification = await classifyContent(message, from);
    const db = readDB();

    const newTask = {
        id: Date.now(),
        title: `WA: ${message.substring(0, 30)}...`,
        description: message,
        scope: classification.scope,
        assignee: classification.assignee,
        status: 'todo',
        origin: 'whatsapp',
        client: from,
        date: new Date().toISOString().split('T')[0]
    };

    // --- AUTOMATION: Create Google Drive Folder ---
    const driveLink = await MockDrive.createProjectFolder(newTask);
    newTask.drive_link = driveLink;

    db.tasks.push(newTask);
    writeDB(db);

    res.json({ success: true, classification, drive_link: driveLink });
});

// Gmail Webhook (Mock)
app.post('/api/webhook/gmail', async (req, res) => {
    const { from, subject, body, attachments } = req.body;
    console.log(`📧 Email from ${from}: ${subject}`);

    if (attachments && attachments.length > 0) {
        console.log(`📎 Attachments detected: ${attachments.map(a => a.filename).join(', ')}`);
    }

    const classification = await classifyContent(subject + " " + body, from);
    const db = readDB();

    const newTask = {
        id: Date.now(),
        title: `Mail: ${subject}`,
        description: body,
        scope: classification.scope,
        assignee: classification.assignee,
        status: 'todo',
        origin: 'email',
        client: from,
        date: new Date().toISOString().split('T')[0]
    };

    // --- AUTOMATION: Create Google Drive Folder ---
    const driveLink = await MockDrive.createProjectFolder(newTask);
    newTask.drive_link = driveLink;

    if (attachments && attachments.length > 0) {
        console.log(`✨ [DRIVE API] Uploading ${attachments.length} attachments to: ${driveLink}`);
        newTask.description += `\n\n📎 Archivos adjuntos guardados en Drive.`;
    }

    db.tasks.push(newTask);
    writeDB(db);

    res.json({ success: true, classification, drive_link: driveLink });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
