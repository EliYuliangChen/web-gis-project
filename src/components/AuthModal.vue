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
import { ref, defineEmits, defineExpose, onMounted, onUnmounted } from 'vue'
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

const ws = ref(null)

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
  try {
    await authForm.value.validate()
    console.log('发送登录请求:', form.value)
    const response = await axios.post('http://localhost:3000/login', form.value)
    console.log('收到登录响应:', response.data)
    if (response.data) {
      console.log('登录成功,发送数据:', response.data)
      emit('login', {
        avatarUrl: response.data.avatarUrl,
        username: response.data.username
      })
      handleClose()
      ElMessage.success('登录成功!')
    } else {
      console.error('登录响应中没有token:', response.data)
      throw new Error('登录失败: 服务器响应中没有token')
    }
  } catch (error) {
    console.error('登录错误:', error)
    ElMessage.error({
      message: error.response?.data?.message || error.message || '登录失败，请检查您的邮箱和密码',
      duration: 5000
    })
  }
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
  connectWebSocket()
}

const handleClose = () => {
  if (form.value.avatarUrl && form.value.avatarUrl.includes('/uploads/temp/')) {
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
  disconnectWebSocket()
}

const resetForm = () => {
  form.value = { username: '', email: '', password: '', avatarUrl: defaultAvatarUrl }
  uploadKey.value = Date.now() // 强制重置上传状态
}

const connectWebSocket = () => {
  ws.value = new WebSocket('ws://localhost:3000')

  ws.value.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (data.type === 'FILE_DELETED' && form.value.avatarUrl.includes(data.filename)) {
      handleClose()
      ElMessage.info('由于长时间未操作，上传的头像已被删除')
    }
  }
}

const disconnectWebSocket = () => {
  if (ws.value) {
    ws.value.close()
  }
}

onMounted(() => {
  connectWebSocket()
})

onUnmounted(() => {
  disconnectWebSocket()
})

defineExpose({ open, handleClose })
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
