const db = require('../config/db');

const toISO = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const isValidDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

exports.getSummary = async(req, res) => {
    try {
        // Default: 7 hari terakhir (termasuk hari ini)
        const today = new Date();
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 6);

        const start = isValidDate(req.query.start_date) ? req.query.start_date : toISO(weekAgo);
        const end = isValidDate(req.query.end_date) ? req.query.end_date : toISO(today);

        const rangeSql = 'DATE(t.created_at) BETWEEN ? AND ?';

        // 1. Ringkasan total
        const [
            [s]
        ] = await db.query(
            `SELECT COUNT(DISTINCT t.id) AS transactions,
              COALESCE(SUM(ti.quantity), 0) AS qtys,
              COALESCE(SUM(ti.price * ti.quantity), 0) AS revenue,
              COALESCE(SUM((ti.price - ti.cost_price) * ti.quantity), 0) AS profit
       FROM transactions t
       JOIN transaction_items ti ON ti.transaction_id = t.id
       WHERE ${rangeSql}`, [start, end]
        );

        // 2. Rincian per hari
        const [daily] = await db.query(
            `SELECT DATE_FORMAT(t.created_at, '%Y-%m-%d') AS day,
              COUNT(DISTINCT t.id) AS transactions,
              SUM(ti.quantity) AS qtys,
              SUM(ti.price * ti.quantity) AS revenue,
              SUM((ti.price - ti.cost_price) * ti.quantity) AS profit
       FROM transactions t
       JOIN transaction_items ti ON ti.transaction_id = t.id
       WHERE ${rangeSql}
       GROUP BY day
       ORDER BY day DESC`, [start, end]
        );

        // 3. Rasa terlaris
        const [topProducts] = await db.query(
            `SELECT p.id, p.name, c.name AS category_name,
              SUM(ti.quantity) AS qty_sold,
              SUM((ti.price - ti.cost_price) * ti.quantity) AS profit
       FROM transaction_items ti
       JOIN transactions t ON t.id = ti.transaction_id
       JOIN products p ON p.id = ti.product_id
       JOIN categories c ON c.id = p.category_id
       WHERE ${rangeSql}
       GROUP BY p.id, p.name, c.name
       ORDER BY qty_sold DESC
       LIMIT 5`, [start, end]
        );

        const revenue = Number(s.revenue);
        const profit = Number(s.profit);

        res.json({
            success: true,
            data: {
                range: { start_date: start, end_date: end },
                summary: {
                    transactions: Number(s.transactions),
                    qtys: Number(s.qtys),
                    revenue,
                    profit,
                    margin: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0
                },
                daily: daily.map((d) => ({
                    day: d.day,
                    transactions: Number(d.transactions),
                    qtys: Number(d.qtys),
                    revenue: Number(d.revenue),
                    profit: Number(d.profit)
                })),
                top_products: topProducts.map((p) => ({
                    id: p.id,
                    name: p.name,
                    category_name: p.category_name,
                    qty_sold: Number(p.qty_sold),
                    profit: Number(p.profit)
                }))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};