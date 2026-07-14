import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/schematic',
      redirect: '/schematic/lower-logan',
    },
    {
      path: '/schematic/:slug(upper-logan|lower-logan|blacksmith-fork|little-bear)',
      name: 'schematic',
      component: () => import('../views/SchematicView.vue'),
      props: true,
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

export default router
