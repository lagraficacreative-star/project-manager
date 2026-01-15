# IMPLEMENATION PLAN: LaGràfica Projects (Internal App)

## 1. Architecture Overview
We will transform the current prototype into a robust Full-Stack Application using **React (Vite)** for the frontend and **Node.js (Express)** for the backend.

- **Frontend**: React + Vite
  - **State Management**: React Context / Hooks for real-time board updates.
  - **Styling**: Vanilla CSS (Modular & Global) focusing on "Glassmorphism" and "Premium" aesthetics (Outfit font, dark/light modes).
  - **Drag & Drop**: `@dnd-kit/core` for Trello-like boards.
- **Backend**: Express.js
  - **Storage**: `better-sqlite3` (Local SQL database) for robust handling of Projects, Clients, and Tasks. replacing `db.json`.
  - **API**: REST endpoints for Projects, Canvas/Boards, and webhooks.
  - **Integrations**: 
    - OpenAI Service (GPT-4o) for classification.
    - Gmail/WhatsApp Webhook handlers.

## 2. Phase 1: Setup & Migration
- [ ] **Backup**: Move existing plain HTML/JS files to `_legacy/`.
- [ ] **Init Frontend**: Initialize `client` (Vite + React).
- [ ] **Init Backend**: Refactor `server.js` to support API routes and SQLite.
- [ ] **Database Schema**: fast setup of `projects`, `clients`, `members`, `settings` tables.

## 3. Phase 2: Core Modules Application
### 🧱 3.1 Boards (The "Trello" View)
- [ ] Create **Kanban Board Component**.
- [ ] Implement Views:
  - **Design** (Public)
  - **Social Media** (Public)
  - **Web** (Public)
  - **Budgets** (Private - Auth protected mock)
  - **Billing** (Private - Auth protected mock)
- [ ] Features: Drag-and-drop cards, Columns (Pending, In Progress, Review, Finished).

### 🤖 3.2 AI & Automation Layers
- [ ] **Ingestion Service**: API endpoint to receive "mock" emails/whatsapp messages (simulated via UI or simple curl).
- [ ] **AI Service**: Function to call OpenAI (or mock for dev) to:
  - Classify content (Design/Web/Social).
  - Extract entities (Client, Priority).
  - Generate Auto-reply.
- [ ] **Auto-Reply System**: Store generated replies for review/sending.

### 👥 3.3 Clients & Team
- [ ] **Client Database**: Auto-create on new email detection.
- [ ] **Team Dashboard**: Filter tasks by "Assignee".

### 💼 3.4 Billing & Brouter Export
- [ ] **Trigger**: When card -> "Finished".
- [ ] **Action**: Copy data to "Billing" board.
- [ ] **Export**: Generate CSV/JSON for Brouter format.

## 4. Phase 3: UX & Design Polish
- [ ] **Glassmorphism UI**: High-end blurring, gradients, and animations.
- [ ] **Responsive**: Adjust for mobile (Sidebar becomes drawer).
- [ ] **Notifications**: Visual bells/toasts for new "Inbox" items.

## 5. Phase 4: Integration Verification
- [ ] Verify Gmail API flow (mocked).
- [ ] Verify WhatsApp API flow (mocked).
- [ ] Verify Brouter Export.

---
## Current Step: Initialization
We will restructure the folder to separate `server` and `client` logic while maintaining the current `server.js` as the core entry point.
