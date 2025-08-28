const express = require('express');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const { router: scrapeRouter } = require('./routes/scrape');
const { authRouter, requireAuth } = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure output dirs exist
const outputDirs = [
    './assets/wallpaper/LiveWallpapers',
    './assets/wallpaper/StaticWallpapers'
];
outputDirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Middlewares
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Auth routes
app.use('/', authRouter);

// Protected routes
app.use('/scrape', requireAuth, scrapeRouter);

app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT,  () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
