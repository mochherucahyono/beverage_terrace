import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/auth/LoginView.vue';
import POSView from '../views/POSView.vue';
import ProductsView from '../views/ProductsView.vue';
import ReportsView from '../views/ReportsView.vue';
import HistoryView from '../views/HistoryView.vue';
import CategoryView from '../views/CategoryView.vue';

const routes = [{
        path: '/login',
        name: 'login',
        component: LoginView,
        meta: {
            guestOnly: true
        }
    },
    {
        path: '/cashier',
        name: 'pos',
        component: POSView,
        meta: {
            requiresAuth: true
        }
    },
    {
        path: '/product',
        name: 'product',
        component: ProductsView,
        meta: { title: 'Produk - Teras Minuman' }
    },
    {
        path: '/category',
        name: 'category',
        component: CategoryView,
        meta: { title: 'Kategori - Teras Minuman' }
    },
    {
        path: '/report',
        name: 'report',
        component: ReportsView,
        meta: { title: 'Laporan - Teras Minuman' }
    },
    {
        path: '/history',
        name: 'history',
        component: HistoryView,
        meta: { title: 'Riwayat - Teras Minuman' }
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

router.beforeEach((to, from, next) => {
    const isAuthenticated = !!localStorage.getItem('terasminuman_token');
    document.title = to.meta.title || 'Teras Minuman';

    if (to.meta.requiresAuth && !isAuthenticated) {
        next({ name: 'login' });
    } else if (to.meta.guestOnly && isAuthenticated) {
        next({ name: 'pos' });
    } else {
        next();
    }
});


export default router;