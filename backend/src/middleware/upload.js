const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'products');
fs.mkdirSync(uploadDir, { recursive: true });

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${EXT[file.mimetype]}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (EXT[file.mimetype]) cb(null, true);
        else cb(new Error('Format foto harus JPG, PNG, atau WebP.'));
    }
});

module.exports = { upload, uploadDir };