# Lakshmi Caterings & Events - Web App

## 🚀 Deployment Guide (Vercel)

This application is built with **Vanilla HTML, CSS, and JavaScript**. It is fully compatible with Vercel as a Static Site.

### How to Deploy
1.  **Vercel Dashboard**:
    *   Go to [vercel.com](https://vercel.com) and log in.
    *   Click "Add New..." -> "Project".
    *   Import your GitHub repository OR drag-and-drop this project folder directly if using Vercel CLI.
    *   Vercel will automatically detect `index.html`. Keep the default settings.
    *   Click **Deploy**.

2.  **Vercel CLI** (Command Line):
    *   Run `npm i -g vercel` (if not installed).
    *   Run `vercel` inside this folder.
    *   Follow the prompts (defaults are usually fine).

---

## ⚠️ IMPORTANT: Data Handling Note

**Current Storage Method: `localStorage`**

*   **How it works**: All data (Menu items, Orders, Revenue logs) is stored **inside your web browser** (Chrome, Edge, Safari, etc.) on the specific device you are using.
*   **Implication 1 (No Sync)**: If you open the specific Vercel URL on your **Laptop**, you will see your data. If you then open the *same* URL on your **Phone**, it will be **EMPTY**. The data does not sync between devices.
*   **Implication 2 (Persistence)**: If you clear your browser cache/cookies, **ALL DATA WILL BE LOST**.
*   **Implication 3 (Privacy)**: The data never leaves your device (it is not sent to any server).

### Recommendation for "Real" Business Use
If you need:
1.  **Multi-Device Sync**: Access the same orders from Phone and Laptop.
2.  **Multi-User Access**: Have an "Admin" create menus and "Staff" take orders.
3.  **Data Backup**: Protect data if you lose your device.

**You must upgrade the Data Handling to a backend database** (like Firebase, Supabase, or MongoDB).

*If you are just using this on a single device (e.g., the shop's main computer/tablet), the current setup is fine.*
