const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { upload } = require('../middleware/upload');

router.post(
    '/:id/image',
    (req, res, next) => {
        upload.single('image')(req, res, (err) => {
            if (err) {
                const message = err.code === 'LIMIT_FILE_SIZE' ? 'Ukuran foto maksimal 2 MB.' : err.message;
                return res.status(400).json({ success: false, message });
            }
            next();
        });
    },
    productController.uploadImage
);
router.delete('/:id/image', productController.removeImage);

router.get('/', productController.getAllProducts);
router.get('/low-stock', productController.getLowStock);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;