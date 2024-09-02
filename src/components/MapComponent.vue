<template>
  <div class="map-wrapper">
    <!-- Top Bar -->
    <el-header height="60px" class="top-bar">
      <div class="top-bar-left">My WebGIS</div>
      <div class="top-bar-right">
        <el-dropdown v-if="isLoggedIn" class="user-menu">
          <span class="el-dropdown-link">
            <img :src="userAvatarUrl || '/default_avatar.png'" alt="avatar" class="user-avatar"/>
            {{ username }}
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="goToProfile">用户界面</el-dropdown-item>
              <el-dropdown-item @click="handleLogout">登出</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button v-else @click="openAuthModal">登录 / 注册</el-button>
      </div>
      <AuthModal ref="authModal" @login="handleLogin" @register="handleRegister" />
    </el-header>

    <!-- Map Container -->
    <div id="map-container" class="map-container"></div>

    <!-- 地理搜索框 -->
    <div id="geocoder" class="geocoder"></div>

    <!-- Map Controls -->
    <div class="map-controls">
      <el-button-group>
        <el-button @click="zoomIn" circle><el-icon><Plus /></el-icon></el-button>
        <el-button @click="zoomOut" circle><el-icon><Minus /></el-icon></el-button>
        <el-button @click="resetNorth" circle><el-icon><Aim /></el-icon></el-button>
        <el-button @click="toggle3D" circle>
          <el-icon><component :is="is3DMode ? View : Discount" /></el-icon>
        </el-button>
      </el-button-group>
    </div>

    <!-- Layer Control -->
    <div class="layer-control">
      <el-dropdown>
        <el-button type="primary">
          图层控制<el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="toggleLayer('terrain')">地形图层</el-dropdown-item>
            <el-dropdown-item @click="toggleLayer('buildings')">建筑图层</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'
import AuthModal from './AuthModal.vue'
import { ElMessage } from 'element-plus'
import { Plus, Minus, Aim, View, Discount, ArrowDown } from '@element-plus/icons-vue'

mapboxgl.accessToken = 'pk.eyJ1IjoiZWxpY2hlbiIsImEiOiJjbTBpbXlobDkwbm02Mm1xYW8wZDd6aTFrIn0.ZTjFhv29BHafPE_-v7Ng9g'

const map = ref(null)
const is3DMode = ref(false)
const isLoggedIn = ref(false)
const authModal = ref(null)
const marker = ref(null) // 用于放置搜索结果标记

const userAvatarUrl = ref('') // 用户头像URL
const username = ref('') // 用户名

const getEasternTime = () => {
  const options = { timeZone: 'America/New_York', hour: 'numeric', hour12: false }
  const formatter = new Intl.DateTimeFormat([], options)
  const easternHour = formatter.format(new Date())
  return parseInt(easternHour, 10) // 返回整点小时
}

const updateMapLighting = () => {
  const hour = getEasternTime()
  console.log('Eastern Time Hour:', hour) // 打印当前美东时间
  if (hour >= 6 && hour < 12) {
    map.value.setConfigProperty('basemap', 'lightPreset', 'day')
  } else if (hour >= 12 && hour < 14) {
    map.value.setConfigProperty('basemap', 'lightPreset', 'dusk')
  } else {
    map.value.setConfigProperty('basemap', 'lightPreset', 'night')
  }
}

onMounted(() => {
  map.value = new mapboxgl.Map({
    container: 'map-container',
    style: 'mapbox://styles/mapbox/standard',
    center: [-103.979380, 41.860223],
    zoom: 3,
    pitch: 0,
    bearing: 0
  })

  map.value.on('style.load', () => {
    console.log('Style loaded, adding buildings layer')
    updateMapLighting() // 根据时间调整光照模式

    // 添加地理搜索框
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      marker: false // 禁用默认标记，因为我们要自定义标记
    })

    // 将 geocoder 添加到地图的左上角
    document.getElementById('geocoder').appendChild(geocoder.onAdd(map.value))

    // 监听搜索结果事件
    geocoder.on('result', (e) => {
      const coordinates = e.result.geometry.coordinates
      map.value.flyTo({
        center: coordinates,
        zoom: 15,
        essential: true // 这一参数将会保证动画在用户自定义的设置中总是会出现
      })

      // 如果已有标记，先移除它
      if (marker.value) {
        marker.value.remove()
      }

      // 在新位置添加标记
      marker.value = new mapboxgl.Marker()
        .setLngLat(coordinates)
        .addTo(map.value)
    })
  })

  map.value.on('error', (e) => {
    console.error('Mapbox GL error:', e)
  })
})

const zoomIn = () => map.value.zoomIn()
const zoomOut = () => map.value.zoomOut()
const resetNorth = () => map.value.easeTo({ bearing: 0, pitch: 0 })

const toggle3D = () => {
  is3DMode.value = !is3DMode.value
  map.value.easeTo({ pitch: is3DMode.value ? 60 : 0, duration: 1000 })
}

const toggleLayer = (layer) => {
  if (map.value.getLayer(layer)) {
    const visibility = map.value.getLayoutProperty(layer, 'visibility')
    map.value.setLayoutProperty(
      layer,
      'visibility',
      visibility === 'visible' ? 'none' : 'visible'
    )
  } else {
    console.warn(`Layer '${layer}' not found.`)
  }
  console.log('Layer visibility:', map.value.getLayoutProperty(layer, 'visibility'))
}

const openAuthModal = () => {
  authModal.value.open()
}

const handleLogin = (formData) => {
  console.log('MapComponent 收到登录数据:', formData)
  if (formData) {
    isLoggedIn.value = true
    userAvatarUrl.value = `http://localhost:3000${formData.avatarUrl}` // 设置用户头像URL
    username.value = formData.username // 设置用户名
    authModal.value.handleClose()
  } else {
    console.error('登录数据无效:', formData)
    ElMessage.error('登录失败: 接收到的数据无效')
  }
}

const handleRegister = (message) => {
  console.log('Register:', message)
  ElMessage.success(message) // 显示注册成功消息
  // 不设置登录状态
  // 不关闭模态框，而是切换到登录界面
  if (authModal.value) {
    authModal.value.switchToLogin()
  }
}

const handleLogout = () => {
  isLoggedIn.value = false
  userAvatarUrl.value = ''
  username.value = ''
  // 清除其他登录相关的数据
}

const goToProfile = () => {
  // 这里处理跳转到用户界面的逻辑
  console.log('Go to user profile')
}
</script>

<style scoped>
.map-wrapper {
  position: relative;
  width: 100vw;
  height: 100vh;
}

.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  background-color: rgba(51, 51, 51, 0.8);
  color: #fff;
  z-index: 1;
}

.top-bar-left {
  font-size: 24px;
  font-weight: bold;
}

.top-bar-right {
  display: flex;
  gap: 10px;
}

.user-menu {
  margin-left: auto;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 10px;
}

.map-container {
  width: 100%;
  height: 100%;
}

.geocoder {
  position: absolute !important;
  top: 100px !important;
  left: 30px !important; /* 搜索框放置在地图的右上角 */
  z-index: 2 !important;
  width: 400px !important;
  /* max-width: 500px !important; 调整搜索框的最大宽度 */
}

.mapboxgl-ctrl-geocoder {
  min-width: 300px; /* 搜索框的最小宽度 */
  border-radius: 25px; /* 椭圆形效果 */
  background-color: #556B2F; /* 草木灰绿色 */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* 添加阴影效果 */
  color: #ffffff; /* 白色的字体颜色 */
}

.map-controls {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 1;
}

.layer-control {
  position: absolute;
  top: 80px;
  right: 20px;
  z-index: 1;
}
</style>
