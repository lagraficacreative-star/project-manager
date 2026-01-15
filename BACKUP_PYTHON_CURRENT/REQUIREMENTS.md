# System Requirements

To run the new version of the Project Manager (React + Node.js), you **must install Node.js**.

## How to Install Node.js on macOS

### Option 1: Using the Official Installer (Easiest)
1. Go to [nodejs.org](https://nodejs.org/).
2. Download the **LTS (Long Term Support)** version.
3. Install the package.

### Option 2: Using Homebrew (Recommended for Developers)
Open your terminal and run:
```bash
brew install node
```

### Verification
After installation, open a new terminal and run:
```bash
node -v
npm -v
```
You should see version numbers (e.g., `v18.x.x` and `9.x.x`).

## Once Installed
Run the following inside the project folder:
```bash
npm run setup
npm run start:client
npm run start:server
```
