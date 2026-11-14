const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.login = async(req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Validasi input di sisi server (sesuai NFR Keamanan PRD)
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username dan kata sandi wajib diisi.'
            });
        }

        // 2. Cek kecocokan username pemilik tunggal
        const validUsername = process.env.OWNER_USERNAME || 'herucahyono';
        const validPasswordHash = process.env.OWNER_PASSWORD_HASH;

        if (username.trim() !== validUsername || !validPasswordHash) {
            return res.status(401).json({
                success: false,
                message: 'Nama pengguna atau kata sandi salah.'
            });
        }

        // 3. Verifikasi kata sandi ter-hash dengan bcrypt
        const isPasswordMatch = await bcrypt.compare(password, validPasswordHash);
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Nama pengguna atau kata sandi salah.'
            });
        }

        // 4. Terbitkan token sesi (berlaku 24 jam)
        const token = jwt.sign({ username: validUsername, role: 'owner' },
            process.env.JWT_SECRET, { expiresIn: '24h' }
        );

        return res.json({
            success: true,
            message: 'Login berhasil.',
            token,
            user: { username: validUsername }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server saat proses autentikasi.'
        });
    }
};

exports.verifySession = (req, res) => {
    // Jika melewati middleware auth, berarti token masih valid
    res.json({
        success: true,
        user: req.user
    });
};