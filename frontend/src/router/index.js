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
        path: '/product',
        name: 'product',
        component: ProductsView
    },
    {
        path: '/category',
        name: 'category',
        component: CategoryView
    },
    {
        path: '/report',
        name: 'report',
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