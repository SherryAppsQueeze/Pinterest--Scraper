const ffmpeg = require('fluent-ffmpeg');

function muteMp4(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions([
                '-c:v copy',
                '-an',
                '-movflags +faststart'
            ])
            .save(outputPath)
            .on('end', resolve)
            .on('error', reject);
    });
}

module.exports = { muteMp4 };
