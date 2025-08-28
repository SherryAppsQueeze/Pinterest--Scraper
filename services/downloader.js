const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { muteMp4 } = require('./video');

const outputDirLive = './assets/wallpaper/LiveWallpapers';
const outputDirStatic = './assets/wallpaper/StaticWallpapers';

function ensureDirExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function getUniqueSubdir(baseDir, desiredName) {
    // Try desiredName, then 2_desiredName, 3_desiredName, ... until available
    let attempt = 0;
    let folderName = desiredName;
    let fullPath = path.join(baseDir, folderName);
    while (fs.existsSync(fullPath)) {
        attempt += 1;
        folderName = `${attempt + 1}_${desiredName}`; // 2_title, 3_title, etc.
        fullPath = path.join(baseDir, folderName);
    }
    ensureDirExists(fullPath);
    return { fullPath, folderName };
}

async function downloadFile(url, outputPath) {
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

function toWebPath(absPath) {
    return ('/' + absPath.replace(process.cwd(), '').replace(/\\/g, '/')).replace(/^\/+/, '/');
}

async function downloadWallpaper(allScrapedLinks, title, progressCallback, onMuted) {
    let videoCount = 0;
    let imageCount = 0;
    const safeTitle = title.replace(/\s+/g, '_');
    let totalFiles = 0;
    let downloadedFiles = 0;

    // Calculate totals and whether we need live/static folders
    let hasAnyVideo = false;
    let hasAnyImage = false;
    for (const item of allScrapedLinks) {
        if (!item.scraped_links) continue;
        const hdLink = item.scraped_links.find(l => l.type.includes('1080p'));
        const coverLink = item.scraped_links.find(l => l.type.includes('Cover'));
        if (hdLink) { totalFiles++; hasAnyVideo = true; }
        if (coverLink) { totalFiles++; hasAnyImage = true; }
    }

    // Prepare unique subfolders per category only if needed
    let liveTargetDir = null;
    let staticTargetDir = null;
    if (hasAnyVideo) {
        ensureDirExists(outputDirLive);
        liveTargetDir = getUniqueSubdir(outputDirLive, safeTitle).fullPath;
    }
    if (hasAnyImage) {
        ensureDirExists(outputDirStatic);
        staticTargetDir = getUniqueSubdir(outputDirStatic, safeTitle).fullPath;
    }

    for (const item of allScrapedLinks) {
        if (!item.scraped_links) continue;

        const hdLink = item.scraped_links.find(l => l.type.includes('1080p'));
        const coverLink = item.scraped_links.find(l => l.type.includes('Cover'));

        if (hdLink && liveTargetDir) {
            const finalFile = path.join(liveTargetDir, `${++videoCount}_${safeTitle}_${Date.now()}.mp4`);
            const tempFile = finalFile.replace('.mp4', '_temp.mp4');

            console.log(`Downloading HD video: ${hdLink.downloadLink}`);
            await downloadFile(hdLink.downloadLink, tempFile);

            console.log(`Muting: ${tempFile} -> ${finalFile}`);
            await muteMp4(tempFile, finalFile);

            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);

            if (typeof onMuted === 'function') {
                try { onMuted(); } catch (_) {}
            }

            downloadedFiles++;
            if (progressCallback) progressCallback(downloadedFiles, { url: toWebPath(finalFile), kind: 'video', title: safeTitle });
        }

        if (coverLink && staticTargetDir) {
            const fileName = `${++imageCount}_${safeTitle}_${Date.now()}.jpg`;
            console.log(`Downloading Cover image: ${coverLink.downloadLink}`);
            await downloadFile(coverLink.downloadLink, path.join(staticTargetDir, fileName));

            downloadedFiles++;
            if (progressCallback) progressCallback(downloadedFiles, { url: toWebPath(path.join(staticTargetDir, fileName)), kind: 'image', title: safeTitle });
        }
    }
}


module.exports = { downloadWallpaper };
