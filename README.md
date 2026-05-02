# Riko Anime 🎌

A modern web-based anime streaming application with a highly responsive, Netflix-style interface. Built using **Next.js**, **React**, **Tailwind CSS**, and other modern technologies to provide a premium streaming and interactive experience.

## 🚀 Key Features
- **Premium UI/UX:** Modern design with smooth animation effects (using `framer-motion`).
- **Custom Video Player:** High-performance video player designed to handle HLS streaming links (using `hls.js`).
- **Stream System Proxy:** A GraphQL pipeline that fetches streaming links and performs routing/bypasses against third-party source protections (such as AllAnime).
- **Responsive Design:** Built with Tailwind CSS v4, ensuring perfect layouts across desktops, tablets, and mobile devices.
- **Fast State Management:** Integrates `Zustand` for seamless and lightweight state handling.

## 🛠️ Technology Stack
- [Next.js 16](https://nextjs.org/)
- [React 19](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [HLS.js](https://github.com/video-dev/hls.js/)
- [Zustand](https://github.com/pmndrs/zustand)
- [Lucide React](https://lucide.dev/) (Icons)

---

## 📦 Installation & Usage Guide

Follow the steps below to install and run the Riko Anime application on your local machine:

### 1. Prerequisites
Ensure that your system has **Node.js** installed (version 20+ is recommended).

### 2. Navigate to the Project Directory
Open your terminal and navigate to the project folder:
```bash
cd riko-anime
```

### 3. Install Dependencies
Run the following command to download all required modules:
```bash
npm install
```
*(You can also use `yarn install` or `pnpm install` if you prefer a different package manager).*

### 4. Running the Development Server
To start the application, run:
```bash
npm run dev
```
Once the process is complete (it usually takes a few seconds), open your web browser and navigate to **[http://localhost:3000](http://localhost:3000)**. Any code changes you make will automatically refresh on the screen.

### 5. Production Build
When you are ready to deploy your application (e.g., to Vercel or a personal server), run:
```bash
npm run build
npm run start
```

---

## 📜 License

This application is open-source and distributed under the [MIT License](./LICENSE). 

**Important:** You are free to use, modify, and distribute this project for free, but you **MUST credit the original creator (Riko)** by keeping the original copyright notice inside your project.
