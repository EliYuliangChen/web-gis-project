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
      <el-form-item v-if="isRegistering" label="安全问题" prop="securityQuestion">
        <el-select v-model="form.securityQuestion" placeholder="请选择安全问题">
          <el-option label="你的第一只宠物的名字是什么？" value="pet"></el-option>
          <el-option label="你最喜欢的电影是什么？" value="movie"></el-option>
          <el-option label="你小时候住在哪条街？" value="street"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item v-if="isRegistering" label="安全问题答案" prop="securityAnswer">
        <el-input v-model="form.securityAnswer" placeholder="请输入安全问题的答案"></el-input>
      </el-form-item>
      <el-form-item v-if="isRegistering" label="头像" prop="avatar">
        <el-upload
          class="avatar-uploader"
          :auto-upload="false"
          :show-file-list="false"
          :on-change="handleAvatarChange"
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
    <el-dialog title="忘记密码" v-model="forgetPasswordVisible">
      <el-steps :active="step" finish-status="success">
        <el-step title="验证邮箱"></el-step>
        <el-step title="验证安全问题"></el-step>
        <el-step title="重置密码"></el-step>
      </el-steps>

      <el-form v-if="step === 0">
        <el-form-item label="邮箱">
          <el-input v-model="forgotEmail" placeholder="请输入您的注册邮箱"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleCheckEmail">下一步</el-button>
          <p v-if="emailError" style="color:red;">{{ emailError }}</p>
        </el-form-item>
      </el-form>

      <el-form v-if="step === 1">
        <p>{{ securityQuestion }}</p> <!-- 显示安全问题 -->
        <el-form-item label="答案">
          <el-input v-model="answer" placeholder="请输入安全问题的答案"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleCheckAnswer">下一步</el-button>
          <p v-if="answerError" style="color:red;">{{ answerError }}</p>
        </el-form-item>
      </el-form>

      <el-form v-if="step === 2">
        <el-form-item label="新密码">
          <el-input type="password" v-model="newPassword" placeholder="请输入新密码"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleResetPassword">重置密码</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
    <div class="auth-footer">
      <el-button type="text" @click="toggleRegistering">
        {{ isRegistering ? '已有账户？点击登录' : '创建新账户' }}
      </el-button>
      <el-button type="text" v-if="!isRegistering" @click="forgetPasswordVisible = true">忘记密码？</el-button>
    </div>
    <CropperModal
      ref="cropperModal"
      :defaultAvatarUrl="defaultAvatarUrl"
      @updateAvatarFile="updateAvatarFile"
    />
  </el-dialog>
</template>

<script setup>
import { ref, defineEmits, defineExpose, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import CropperModal from './CropperModal.vue'

const isVisible = ref(false)
const isRegistering = ref(false)
const form = ref({ username: '', email: '', password: '', avatarUrl: '', avatarFile: null })
const authForm = ref(null)
const uploadKey = ref(Date.now())
const cropperModal = ref(null)

const emit = defineEmits(['login', 'register'])

const forgetPasswordVisible = ref(false) // 控制忘记密码弹窗的显示
const step = ref(0) // 当前步骤
const forgotEmail = ref('') // 用户输入的邮箱
const emailError = ref('') // 邮箱错误信息
const securityQuestion = ref('') // 安全问题
const answer = ref('') // 用户输入的安全问题答案
const answerError = ref('') // 安全问题答案的错误信息
const newPassword = ref('') // 用户输入的新密码

// const uploadAction = 'http://localhost:3000/upload-avatar'
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
    const response = await axios.post('http://192.168.68.103:3000/login', form.value)
    console.log('收到登录响应:', response.data)
    if (response.data && response.data.user && response.data.user.username) {
      console.log('登录成功,发送数据:', response.data)
      emit('login', response.data)
      handleClose()
      ElMessage.success('登录成功!')
    } else {
      console.error('登录响应中没有用户名:', response.data)
      throw new Error('登录失败: 服务器响应中没有用户名')
    }
  } catch (error) {
    console.error('登录错误:', error)
    ElMessage.error({
      message: error.response?.data?.message || error.message || '登录失败，请检查您的邮箱和密码',
      duration: 5000
    })
  }
}

const handleAvatarChange = (file) => {
  const isJPG = file.raw.type === 'image/jpeg'
  const isPNG = file.raw.type === 'image/png'
  const isLt2M = file.raw.size / 1024 / 1024 < 2

  if (!isJPG && !isPNG) {
    ElMessage.error('头像必须是 JPG 或 PNG 格式!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('头像大小不能超过 2MB!')
    return false
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    form.value.avatarUrl = e.target.result
    cropperModal.value.show(e.target.result)
  }
  reader.readAsDataURL(file.raw)
}

const updateAvatarFile = (file) => {
  if (file) {
    form.value.avatarFile = file
    form.value.avatarUrl = URL.createObjectURL(file)
  } else {
    form.value.avatarFile = null
    form.value.avatarUrl = defaultAvatarUrl // 恢复默认头像
  }
}

const handleRegister = async () => {
  if (await authForm.value.validate()) {
    try {
      const formData = new FormData()
      formData.append('username', form.value.username)
      formData.append('email', form.value.email)
      formData.append('password', form.value.password)
      formData.append('securityQuestion', form.value.securityQuestion)
      formData.append('securityAnswer', form.value.securityAnswer)
      if (form.value.avatarFile) {
        formData.append('avatar', form.value.avatarFile)
      }

      const response = await axios.post('http://192.168.68.103:3000/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      emit('register', response.data.message)
      isRegistering.value = false
      resetForm()
    } catch (error) {
      ElMessage.error({
        message: error.response?.data?.message || '注册失败，请稍后再试',
        duration: 5000
      })
    }
  }
}

const toggleRegistering = () => {
  isRegistering.value = !isRegistering.value
  uploadKey.value = Date.now()
  resetForm()
}

// const handleAvatarSuccess = (response, file) => {
//   // 使用 file.raw，它是原始的 File 对象
//   const localUrl = URL.createObjectURL(file.raw)
//   form.value.avatarUrl = localUrl
//   form.value.avatarFile = file.raw // 保存文件对象以便后续上传
//   cropperModal.value.show(localUrl) // 显示裁剪窗口
// }

// const beforeAvatarUpload = (file) => {
//   const isJPG = file.type === 'image/jpeg' || file.type === 'image/png'
//   const isLt2M = file.size / 1024 / 1024 < 2

//   if (!isJPG) {
//     ElMessage.error('头像必须是 JPG 或 PNG 格式!')
//   }
//   if (!isLt2M) {
//     ElMessage.error('头像大小不能超过 2MB!')
//   }
//   return isJPG && isLt2M
// }

// const updateAvatarUrl = (newAvatarUrl) => {
//   form.value.avatarUrl = newAvatarUrl
// }

const open = () => {
  isVisible.value = true
  connectWebSocket()
}

const handleClose = () => {
  resetForm()
  isVisible.value = false
}

const resetForm = () => {
  if (form.value.avatarUrl && form.value.avatarUrl.startsWith('blob:')) {
    URL.revokeObjectURL(form.value.avatarUrl)
  }
  form.value = { username: '', email: '', password: '', avatarUrl: defaultAvatarUrl, avatarFile: null }
}

// const resetForm = () => {
//   if (form.value.avatarUrl && form.value.avatarUrl.startsWith('blob:')) {
//     URL.revokeObjectURL(form.value.avatarUrl)
//   }
//   form.value = { username: '', email: '', password: '', avatarUrl: defaultAvatarUrl, avatarFile: null }
//   uploadKey.value = Date.now()
// }

const switchToLogin = () => {
  isRegistering.value = false
  resetForm()
}

const handleCheckEmail = async () => {
  try {
    const response = await axios.post('http://192.168.68.103:3000/api/check-email', { email: forgotEmail.value })
    if (response.data.exists) {
      securityQuestion.value = response.data.securityQuestion // 获取后端返回的安全问题
      step.value = 1 // 进入下一步
    } else {
      emailError.value = '邮箱不存在或未注册'
    }
  } catch (error) {
    console.error('检查邮箱错误:', error)
    emailError.value = '检查邮箱错误'
  }
}

// 处理安全问题回答
const handleCheckAnswer = async () => {
  try {
    const response = await axios.post('http://192.168.68.103:3000/api/check-answer', { email: forgotEmail.value, answer: answer.value })
    if (response.data.correct) {
      step.value = 2 // 进入下一步
    } else {
      answerError.value = '安全问题答案错误'
    }
  } catch (error) {
    console.error('验证安全问题答案错误:', error)
    answerError.value = '验证安全问题答案错误'
  }
}

// 处理重置密码
const handleResetPassword = async () => {
  try {
    const response = await axios.post('http://192.168.68.103:3000/api/reset-password', { email: forgotEmail.value, newPassword: newPassword.value })
    if (response.data.success) {
      ElMessage.success('密码重置成功，请重新登录')
      forgetPasswordVisible.value = false // 关闭弹窗
      step.value = 0 // 重置步骤
    }
  } catch (error) {
    console.error('重置密码错误:', error)
  }
}

const connectWebSocket = () => {
  ws.value = new WebSocket('ws://192.168.68.103:3000')

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

defineExpose({ open, handleClose, switchToLogin })
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
