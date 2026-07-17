/*
router/index.ts - defines the app's URL routes. Home and the schematic pages are real routes;
List/Map/Help are handled inside App.vue as view-state toggles rather than separate routes (see
App.vue's currentView), which is why they don't appear here.
*/
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
      // Fallback default for anyone landing on the bare '/schematic' URL directly (the
      // sidebar and Home page instead push straight to the first slug in manifest.json - see
      // App.vue's changeView() and AppSidebar.vue - so this only matters for a raw URL/bookmark).
      // Router redirects are resolved synchronously, before manifest.json can be fetched, so
      // this one target has to stay a hardcoded slug; update it if you change your default page.
      path: '/schematic',
      redirect: '/schematic/lower-logan',
    },
    {
      // Slug isn't restricted to a fixed enum here - which slugs are valid is decided at
      // runtime by public/schematics/manifest.json (see hydroService.ts). An unknown slug
      // just fails to fetch its page JSON and SchematicView shows its own "couldn't load
      // this page" state, so no route-level guard is needed.
      path: '/schematic/:slug',
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
