import './styles/base.css';
import './styles/toolbar.css';
import './styles/canvas.css';
import './styles/statusbar.css';
import './styles/dialog.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { i18n } from './i18n';

createApp(App).use(createPinia()).use(i18n).mount('#app');
