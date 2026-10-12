import { createRouter, createWebHistory } from 'vue-router';
import POSView from '../views/POSView.vue';
import ProductsView from '../views/ProductsView.vue';
import ReportsView from '../views/ReportsView.vue';
import HistoryView from '../views/HistoryView.vue';
import CategoryView from '../views/CategoryView.vue';

const routes = [{
        path: '/',
        name: 'pos',
        component: POSView
    },
    {
        path: '/products',
        name: 'products',
        component: ProductsView
    },
    {
        path: '/categories',
        name: 'categories',
        component: CategoryView
    },
    {
        path: '/reports',
        name: 'reports',
        component: ReportsView
    },
    {
        path: '/history',
        name: 'history',
        component: HistoryView
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;