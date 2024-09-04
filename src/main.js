import { createApp } from 'vue'
import axios from 'axios'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

axios.interceptors.request.use(config => {
  // 从 localStorage 获取 token
  const token = localStorage.getItem('token')
  if (token) {
    // 如果有 token，将其添加到请求头中
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, error => {
  // 处理请求错误
  return Promise.reject(error)
})

app.use(ElementPlus).mount('#app')
