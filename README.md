# LaGràfica Project Manager

A modern, full-stack project management application built with React (Vite) and Node.js.

## Project Structure

- **client/**: The frontend application (React + Vite + Tailwind/CSS).
- **server/**: The backend API (Node.js + Express) and automation scripts.
- **_legacy/**: Backup of the previous version.

## Getting Started

### Prerequisites

- Node.js installed on your machine.

### Setup

1. **Install Dependencies**
   Open a terminal in the root directory and run:

   ```bash
   npm run setup
   ```
   
   (Or manually run `npm install` inside both `server/` and `client/` folders)

### Running the Application

You need to run both the Backend and Frontend servers.

1. **Start the Backend Server**
   ```bash
   npm run start:server
   ```
   *Runs on http://localhost:3000*

2. **Start the Frontend Client** (in a new terminal tab)
   ```bash
   npm run start:client
   ```
   *Runs on http://localhost:5173 (usually)*

## Features

- **Glassmorphism UI**: Premium design with dark mode and blur effects.
- **Kanban Boards**: Drag & drop project management.
- **Automations**: Mock integrations with Email, WhatsApp, and Google Drive.
