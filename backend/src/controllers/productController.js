const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { uploadDir } = require('../middleware/upload');

const removeFile = (imageUrl) => {
    if (!imageUrl) return;
    fs.unlink(path.join(uploadDir, path.basename(imageUrl)), () => {});
};

exports.getAllProducts = async(req, res) => {
    try {
        const { category_id } = req.query;
        let query = `
      SELECT p.*, c.name AS category_name 
      FROM products p 
      JOIN categories c ON p.category_id = c.id
    `;
        const params = [];

        if (category_id) {
            query += ' WHERE p.category_id = ?';
            params.push(category_id);
        }

        query += ' ORDER BY p.name ASC';

        const [rows] = await db.query(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createProduct = async(req, res) => {
    try {
        const { category_id, name, cost_price, selling_price, stock, min_stock } = req.body;

        if (!category_id || !name || selling_price === undefined) {
            return res.status(400).json({ success: false, message: 'Kategori, nama rasa, dan harga jual wajib diisi.' });
        }

        const [result] = await db.query(
            'INSERT INTO products (category_id, name, cost_price, selling_price, stock, min_stock) VALUES (?, ?, ?, ?, ?, ?)', [category_id, name, cost_price || 0, selling_price, stock || 0, min_stock || 5]
        );

        res.status(201).json({
            success: true,
            message: 'Produk berhasil ditambahkan!',
            data: { id: result.insertId, ...req.body }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateProduct = async(req, res) => {
    try {
        const { id } = req.params;
        const { category_id, name, cost_price, selling_price, stock, min_stock } = req.body;

        const [result] = await db.query(
            `UPDATE products 
       SET category_id = ?, name = ?, cost_price = ?, selling_price = ?, stock = ?, min_stock = ? 
       WHERE id = ?`, [category_id, name, cost_price, selling_price, stock, min_stock, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
        }

        res.json({ success: true, message: 'Data produk berhasil diperbarui!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteProduct = async(req, res) => {
    const { id } = req.params;
    try {
        const [
            [existing]
        ] = await db.query('SELECT image_url FROM products WHERE id = ?', [id]); // baru
        const [result] = await db.query('DELETE FROM products WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
        }
        removeFile(existing ? existing.image_url : null);

        res.json({ success: true, message: 'Produk berhasil dihapus!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Daftar produk dengan stok menipis / habis
exports.getLowStock = async(req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT p.id, p.name, p.stock, p.min_stock, c.name AS category_name
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.stock <= p.min_stock
       ORDER BY (p.stock <= 0) DESC, p.stock ASC, p.name ASC`
        );

        const data = rows.map((r) => ({
            ...r,
            status: r.stock <= 0 ? 'habis' : 'menipis'
        }));

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/* Upload Image */
exports.uploadImage = async(req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File foto tidak ditemukan.' });
        }
        const { id } = req.params;
        const [rows] = await db.query('SELECT image_url FROM products WHERE id = ?', [id]);
        if (rows.length === 0) {
            fs.unlink(req.file.path, () => {});
            return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
        }

        const newUrl = `/uploads/products/${req.file.filename}`;
        await db.query('UPDATE products SET image_url = ? WHERE id = ?', [newUrl, id]);
        removeFile(rows[0].image_url); // hapus foto lama

        res.json({ success: true, message: 'Foto berhasil disimpan!', data: { image_url: newUrl } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.removeImage = async(req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT image_url FROM products WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
        }
        await db.query('UPDATE products SET image_url = NULL WHERE id = ?', [id]);
        removeFile(rows[0].image_url);
        res.json({ success: true, message: 'Foto dihapus.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};