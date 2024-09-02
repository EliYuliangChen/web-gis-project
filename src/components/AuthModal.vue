<template>
  <el-dialog v-model="isVisible" :title="isRegistering ? '创建账户' : '登录'" width="400px" custom-class="auth-dialog" @close="handleClose">
    <el-form :model="form" label-position="top" ref="authForm" :rules="rules" @keydown.enter="isRegistering ? handleRegister() : handleSubmit()">
      <el-form-item v-if="isRegistering" label="用户名" prop="username">
        <el-input v-model="form.username" placeholder="请输入用户名"></el-input>
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="form.email" type="email" placeholder="请输入邮箱"></el-input>
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input v-model="form.password" type="password" placeholder="请输入密码"></el-input>
      </el-form-item>
      <el-form-item v-if="isRegistering" label="头像" prop="avatar">
        <el-upload
          class="avatar-uploader"
          :action="uploadAction"
          :show-file-list="false"
          :on-success="handleAvatarSuccess"
          :before-upload="beforeAvatarUpload"
          :key="uploadKey"
        >
          <img v-if="form.avatarUrl" :src="form.avatarUrl" class="avatar" />
          <img v-else :src="defaultAvatarUrl" class="avatar" />
        </el-upload>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="isRegistering ? handleRegister() : handleSubmit()" style="width: 100%;">
          {{ isRegistering ? '注册' : '登录' }}
        </el-button>
      </el-form-item>
    </el-form>
    <div class="auth-footer">
      <el-button type="text" @click="toggleRegistering">
        {{ isRegistering ? '已有账户？点击登录' : '创建新账户' }}
      </el-button>
      <el-button type="text" v-if="!isRegistering">忘记密码？</el-button>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, defineEmits, defineExpose, onUnmounted, watch } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const isVisible = ref(false)
const isRegistering = ref(false)
const form = ref({ username: '', email: '', password: '', avatarUrl: '' })
const authForm = ref(null)
const uploadKey = ref(Date.now())

const emit = defineEmits(['login', 'register'])

const uploadAction = 'http://localhost:3000/upload-avatar'
const defaultAvatarUrl = '/default_avatar.png'

// 添加定时器相关变量
const TIMEOUT_DURATION = 30000 // 30秒
let timeoutId = null

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: ['blur'] }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少需要6个字符', trigger: 'blur' }
  ]
}

const handleSubmit = async () => {
  authForm.value.validate(async (valid) => {
    if (valid) {
      try {
        const response = await axios.post('http://localhost:3000/login', form.value)
        if (response.data.token) {
          emit('login', {
            token: response.data.token,
            avatarUrl: response.data.avatarUrl,
            username: response.data.username
          })
          handleClose()
        }
      } catch (error) {
        ElMessage.error({
          message: error.response?.data?.message || '登录失败，请检查您的邮箱和密码',
          duration: 5000
        })
      }
    }
  })
}

const handleRegister = async () => {
  authForm.value.validate(async (valid) => {
    if (valid) {
      try {
        const formData = new FormData()
        formData.append('username', form.value.username)
        formData.append('email', form.value.email)
        formData.append('password', form.value.password)
        if (form.value.avatarUrl && form.value.avatarUrl !== defaultAvatarUrl) {
          formData.append('avatar', form.value.avatarUrl.split('/uploads/temp/')[1])
        }

        const response = await axios.post('http://localhost:3000/register', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })

        emit('register', {
          avatarUrl: response.data.user.avatar_url,
          username: response.data.user.username
        })
        handleClose()
      } catch (error) {
        ElMessage.error({
          message: error.response?.data?.message || '注册失败，请稍后再试',
          duration: 5000
        })
      }
    }
  })
}

const toggleRegistering = () => {
  isRegistering.value = !isRegistering.value
  uploadKey.value = Date.now()
  resetForm()
}

const handleAvatarSuccess = (response) => {
  console.log('Upload response:', response)
  if (response.tempAvatarUrl) {
    form.value.avatarUrl = `http://localhost:3000${response.tempAvatarUrl}`
  } else {
    console.error('Failed to get tempAvatarUrl from the response:', response)
  }
}

const beforeAvatarUpload = (file) => {
  const isJPG = file.type === 'image/jpeg' || file.type === 'image/png'
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isJPG) {
    ElMessage.error('头像必须是 JPG 或 PNG 格式!')
  }
  if (!isLt2M) {
    ElMessage.error('头像大小不能超过 2MB!')
  }
  return isJPG && isLt2M
}

const open = () => {
  isVisible.value = true
  startTimeout()
}

const handleClose = () => {
  if (form.value.avatarUrl && form.value.avatarUrl.includes('/uploads/temp/')) {
    // 调用后端删除临时头像
    const tempAvatarUrl = form.value.avatarUrl.split('http://localhost:3000')[1]
    axios.post('http://localhost:3000/delete-temp-avatar', { tempAvatarUrl })
      .then(() => {
        console.log('临时头像删除成功')
      })
      .catch((error) => {
        console.error('删除临时头像时出错:', error)
      })
  }

  resetForm()
  isVisible.value = false
  clearTimeout(timeoutId)
}

const resetForm = () => {
  form.value = { username: '', email: '', password: '', avatarUrl: defaultAvatarUrl }
  uploadKey.value = Date.now() // 强制重置上传状态
}

// 添加开始计时的函数
const startTimeout = () => {
  clearTimeout(timeoutId) // 清除之前的定时器
  timeoutId = setTimeout(() => {
    handleClose()
    ElMessage.info('由于长时间未操作，登录/注册界面已自动关闭')
  }, TIMEOUT_DURATION)
}

// 添加重置计时器的函数
const resetTimeout = () => {
  if (isVisible.value) {
    startTimeout()
  }
}

// 监听表单变化，重置计时器
watch(() => form.value, resetTimeout, { deep: true })

// 监听 isVisible 的变化
watch(isVisible, (newValue) => {
  if (!newValue) {
    handleClose()
  } else {
    startTimeout()
  }
})

onUnmounted(() => {
  handleClose()
})

defineExpose({ open })
</script>

<style scoped>
.auth-dialog {
  border-radius: 8px;
}
.auth-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}
.avatar-uploader {
  display: block;
  width: 178px;
  height: 178px;
  margin: 10px auto;
  border: 1px dashed #d9d9d9;
  border-radius: 50%;
  cursor: pointer;
  overflow: hidden;
  position: relative;
}
.avatar {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
