const express = require('express');
const { scrapeLinksFromUrl } = require('../services/scraper');
const { downloadWallpaper } = require('../services/downloader');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Store progress for each session
const progressSessions = new Map();

// Clean up old sessions (older than 1 hour)
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of progressSessions.entries()) {
        if (now - parseInt(sessionId) > 3600000) { // 1 hour
            progressSessions.delete(sessionId);
        }
    }
}, 300000); // Check every 5 minutes

// GET endpoint to check progress
router.get('/progress/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const progress = progressSessions.get(sessionId);
    
    if (!progress) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(progress);
});

router.post('/', async (req, res) => {
    const { name, urls } = req.body;

    if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: 'No URLs provided.' });
    }

    try {
        const startTime = Date.now();
        const sessionId = Date.now().toString();
        const allScrapedLinks = [];
        
        // Count only valid Pinterest URLs for progress denominator
        const validUrlsCount = urls.filter(u => typeof u === 'string' && u.includes('pinterest.com')).length;
        
        // Initialize progress tracking
        const progress = {
            totalUrls: validUrlsCount,
            urlsProcessed: 0,
            filesDownloaded: 0,
            scrapingProgress: 0,
            downloadProgress: 0,
            status: 'Starting...',
            activities: [],
            terminal: false,
            currentFiles: []
        };
        
        progressSessions.set(sessionId, progress);

        // Send initial response with session ID
        res.json({ 
            sessionId,
            message: 'Scraping started',
            progress
        });

        // Continue processing in background
        processUrls(urls, name, sessionId, startTime);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Processing failed.' });
    }
});

async function processUrls(urls, name, sessionId, startTime) {
    const progress = progressSessions.get(sessionId);
    if (!progress) return;

    const allScrapedLinks = [];

    try {
        // Skip invalid URLs, log them, and proceed with valid ones
        const validUrls = urls.filter(u => typeof u === 'string' && u.includes('pinterest.com'));
        const invalidUrls = urls.filter(u => typeof u === 'string' && !u.includes('pinterest.com'));

        // Log invalid ones
        for (const bad of invalidUrls) {
            progress.activities.push({ type: 'error', message: `Skipped invalid URL (not Pinterest): ${bad}` });
        }

        // If no valid URLs at all, end with error
        if (validUrls.length === 0) {
            progress.status = 'Error';
            progress.activities.push({ type: 'error', message: 'No valid Pinterest URLs to process.' });
            progress.terminal = true;
            setTimeout(() => progressSessions.delete(sessionId), 30000);
            return;
        }

        // Ensure totalUrls reflects current valid count
        progress.totalUrls = validUrls.length;

        for (let i = 0; i < validUrls.length; i++) {
            const url = validUrls[i];
            if (progress.terminal) return; // stop if already terminal

            progress.status = `Scraping URL ${i + 1} of ${validUrls.length}`;
            progress.activities.push({ type: 'info', message: `Starting to scrape: ${url}` });

            console.log(`Scraping: ${url}`);
            const scrapedLinks = await scrapeLinksFromUrl(url, {
                onRetry: ({ attempt, maxAttempts, message }) => {
                    progress.activities.push({ type: 'warning', message: `Retry ${attempt}/${maxAttempts} after timeout: ${message}` });
                }
            });
            allScrapedLinks.push({ scraped_links: scrapedLinks });
            
            progress.urlsProcessed++;
            progress.scrapingProgress = Math.round((progress.urlsProcessed / progress.totalUrls) * 100);
            if (scrapedLinks.length > 0) {
                progress.activities.push({ type: 'success', message: `Successfully scraped: ${url} (${scrapedLinks.length} links found)` });
            } else {
                progress.activities.push({ type: 'error', message: `Failed to scrape: ${url}` });
            }
        }

        if (progress.terminal) return;
        progress.status = 'Downloading files...';
        progress.activities.push({ type: 'info', message: 'Starting download process...' });

        // Calculate total expected files
        let totalExpectedFiles = 0;
        let totalVideosToMute = 0;
        let totalImages = 0;
        let totalVideos = 0;
        for (const item of allScrapedLinks) {
            if (!item.scraped_links) continue;
            const hdLink = item.scraped_links.find(l => l.type.includes('1080p'));
            const coverLink = item.scraped_links.find(l => l.type.includes('Cover'));
            if (hdLink) { totalExpectedFiles++; totalVideos++; totalVideosToMute++; }
            if (coverLink) { totalExpectedFiles++; totalImages++; }
        }

        // Track counts for UI
        progress.totalImages = totalImages;
        progress.totalVideos = totalVideos;

        // Track how many videos to mute for progress
        progress.videosToMute = totalVideosToMute;
        // Initialize mute progress counters
        progress.videosMuted = 0;
        progress.muteProgress = 0;

        // Download files with progress tracking
        await downloadWallpaper(allScrapedLinks, name, (downloadedFiles, fileInfo) => {
            if (progress.terminal) return;
            progress.filesDownloaded = downloadedFiles;
            progress.downloadProgress = totalExpectedFiles > 0 ? Math.round((downloadedFiles / totalExpectedFiles) * 100) : 0;
            progress.activities.push({ type: 'success', message: `Downloaded ${downloadedFiles} files` });
            if (fileInfo && fileInfo.url) {
                progress.currentFiles.push(fileInfo);
                if (progress.currentFiles.length > 50) progress.currentFiles.shift();
            }
        }, () => {
            if (progress.terminal) return;
            progress.videosMuted += 1;
            progress.muteProgress = progress.videosToMute > 0 ? Math.round((progress.videosMuted / progress.videosToMute) * 100) : 0;
            progress.activities.push({ type: 'success', message: `Muted ${progress.videosMuted}/${progress.videosToMute} videos` });
        });

        const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
        progress.status = 'Completed';
        progress.activities.push({ type: 'success', message: `Scraping & download completed in ${executionTime} seconds` });
        progress.terminal = true;
        setTimeout(() => progressSessions.delete(sessionId), 30000);
        
    } catch (error) {
        console.error(error);
        progress.status = 'Error';
        progress.activities.push({ type: 'error', message: 'Processing failed: ' + error.message });
        progress.terminal = true;
        setTimeout(() => progressSessions.delete(sessionId), 30000);
    }
}

module.exports = { router, progressSessions };

// Helper to build wallpaper listing
function listWallpapers() {
    const liveBase = path.join(process.cwd(), 'assets', 'wallpaper', 'LiveWallpapers');
    const staticBase = path.join(process.cwd(), 'assets', 'wallpaper', 'StaticWallpapers');

    const toWebPath = (absPath) => absPath
        .replace(process.cwd(), '')
        .replace(/\\/g, '/')
        .replace(/^\//, '');

    function scan(baseDir) {
        const items = [];
        if (!fs.existsSync(baseDir)) return items;
        const entries = fs.readdirSync(baseDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const titleDir = entry.name;
                const dirPath = path.join(baseDir, titleDir);
                const files = fs.readdirSync(dirPath, { withFileTypes: true })
                    .filter(f => f.isFile())
                    .map(f => ({
                        file: f.name,
                        url: '/' + toWebPath(path.join(dirPath, f.name)),
                        ext: path.extname(f.name).toLowerCase()
                    }));
                if (files.length > 0) {
                    items.push({ titleDir, files });
                }
            }
        }
        return items;
    }

    const live = scan(liveBase);
    const statics = scan(staticBase);
    return { live, statics };
}

// List wallpapers for gallery
router.get('/wallpapers', (req, res) => {
    try {
        const data = listWallpapers();
        res.json(data);
    } catch (e) {
        console.error('Failed to list wallpapers', e);
        res.status(500).json({ error: 'Failed to list wallpapers' });
    }
});
