const db = require('../config/db');

exports.createTransaction = async(req, res) => {
    const { payment_method, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Daftar item belanja tidak boleh kosong.' });
    }

    const method = ['cash', 'qris'].includes(payment_method) ? payment_method : 'cash';
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Header dibuat dulu dengan total 0, diisi setelah semua item dihitung
        const [txResult] = await connection.query(
            'INSERT INTO transactions (total_amount, payment_method) VALUES (?, ?)', [0, method]
        );
        const transactionId = txResult.insertId;
        let total = 0;

        for (const item of items) {
            const qty = parseInt(item.quantity);
            if (!Number.isInteger(qty) || qty <= 0) {
                throw new Error('Jumlah item tidak valid.');
            }

            const [productRows] = await connection.query(
                'SELECT stock, name, cost_price, selling_price FROM products WHERE id = ? FOR UPDATE', [item.product_id]
            );

            if (productRows.length === 0) {
                throw new Error(`Produk dengan ID ${item.product_id} tidak ditemukan.`);
            }

            const product = productRows[0];
            if (product.stock < qty) {
                throw new Error(`Stok saset ${product.name} tidak cukup (Sisa: ${product.stock}).`);
            }

            total += Number(product.selling_price) * qty;

            await connection.query(
                'INSERT INTO transaction_items (transaction_id, product_id, quantity, price, cost_price) VALUES (?, ?, ?, ?, ?)', [transactionId, item.product_id, qty, product.selling_price, product.cost_price]
            );

            await connection.query(
                'UPDATE products SET stock = stock - ? WHERE id = ?', [qty, item.product_id]
            );
        }

        await connection.query(
            'UPDATE transactions SET total_amount = ? WHERE id = ?', [total, transactionId]
        );

        await connection.commit();
        res.status(201).json({
            success: true,
            message: 'Transaksi berhasil disimpan & stok diperbarui!',
            transactionId
        });
    } catch (error) {
        await connection.rollback();
        res.status(400).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

exports.getTransactions = async(req, res) => {
    try {
        const [rows] = await db.query(`
      SELECT t.*, 
             COALESCE(SUM(ti.quantity), 0) AS total_items
      FROM transactions t
      LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Riwayat dengan filter + pagination
exports.getHistory = async(req, res) => {
    try {
        const { start_date, end_date, payment_method } = req.query;
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
        const offset = (page - 1) * limit;

        const where = [];
        const params = [];
        if (start_date) {
            where.push('DATE(t.created_at) >= ?');
            params.push(start_date);
        }
        if (end_date) {
            where.push('DATE(t.created_at) <= ?');
            params.push(end_date);
        }
        if (payment_method) {
            where.push('t.payment_method = ?');
            params.push(payment_method);
        }
        const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

        const [
            [{ total }]
        ] = await db.query(
            `SELECT COUNT(*) AS total FROM transactions t ${whereSql}`, params
        );

        const [rows] = await db.query(
            `SELECT t.*,
              COALESCE(SUM(ti.quantity), 0) AS total_items,
              COALESCE(SUM((ti.price - ti.cost_price) * ti.quantity), 0) AS profit
       FROM transactions t
       LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
       ${whereSql}
       GROUP BY t.id
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`, [...params, limit, offset]
        );

        res.json({
            success: true,
            data: rows,
            pagination: { page, limit, total, total_pages: Math.ceil(total / limit) || 1 }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Detail satu transaksi
exports.getTransactionById = async(req, res) => {
    try {
        const { id } = req.params;
        const [txRows] = await db.query('SELECT * FROM transactions WHERE id = ?', [id]);
        if (txRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
        }
        const [items] = await db.query(
            `SELECT ti.*, p.name AS product_name, c.name AS category_name
       FROM transaction_items ti
       JOIN products p ON p.id = ti.product_id
       JOIN categories c ON c.id = p.category_id
       WHERE ti.transaction_id = ?`, [id]
        );
        res.json({ success: true, data: {...txRows[0], items } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};