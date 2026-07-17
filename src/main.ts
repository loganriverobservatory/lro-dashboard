/*
main.ts - app entry point. Creates the root Vue app, installs the router, and mounts it to
the #app element in index.html. Nothing app-specific belongs here - see App.vue for that.
*/
import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)

app.mount('#app')
