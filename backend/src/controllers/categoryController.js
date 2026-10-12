const db = require('../config/db');

exports.getAllCategories = async(req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT c.id, c.name, c.created_at, COUNT(p.id) AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
       GROUP BY c.id, c.name, c.created_at
       ORDER BY c.name ASC`
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createCategory = async(req, res) => {
    try {
        const name = (req.body.name || '').trim();
        if (!name) {
            return res.status(400).json({ success: false, message: 'Nama brand wajib diisi.' });
        }
        if (name.length > 50) {
            return res.status(400).json({ success: false, message: 'Nama brand maksimal 50 karakter.' });
        }
        const [result] = await db.query('INSERT INTO categories (name) VALUES (?)', [name]);
        res.status(201).json({
            success: true,
            message: 'Brand berhasil ditambahkan!',
            data: { id: result.insertId, name }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Nama brand sudah ada.' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateCategory = async(req, res) => {
    try {
        const { id } = req.params;
        const name = (req.body.name || '').trim();
        if (!name) {
            return res.status(400).json({ success: false, message: 'Nama brand wajib diisi.' });
        }
        if (name.length > 50) {
            return res.status(400).json({ success: false, message: 'Nama brand maksimal 50 karakter.' });
        }
        const [result] = await db.query('UPDATE categories SET name = ? WHERE id = ?', [name, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Brand tidak ditemukan.' });
        }
        res.json({ success: true, message: 'Brand berhasil diperbarui!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Nama brand sudah ada.' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteCategory = async(req, res) => {
    try {
        const { id } = req.params;
        // Tabel products memakai ON DELETE CASCADE, jadi cek manual agar rasa tidak ikut terhapus
        const [
            [{ total }]
        ] = await db.query(
            'SELECT COUNT(*) AS total FROM products WHERE category_id = ?', [id]
        );
        if (total > 0) {
            return res.status(400).json({
                success: false,
                message: `Brand masih punya ${total} rasa (termasuk yang nonaktif). Pindahkan rasanya ke brand lain lewat menu Edit dulu.`
            });
        }
        const [result] = await db.query('DELETE FROM categories WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Brand tidak ditemukan.' });
        }
        res.json({ success: true, message: 'Brand berhasil dihapus!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};