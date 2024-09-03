<template>
    <el-dialog v-model="isVisible" title="用户界面" width="600px" custom-class="user-profile-dialog">
      <div class="user-profile-content">
        <div class="user-avatar-section">
          <el-avatar :size="150" :src="avatarUrl" />
          <el-upload
            class="avatar-uploader"
            :action="`${API_BASE_URL}/api/upload-avatar`"
            :show-file-list="false"
            :on-success="handleAvatarSuccess"
            :before-upload="beforeAvatarUpload"
          >
            <el-button size="small" type="primary">更换头像</el-button>
          </el-upload>
        </div>
        <div class="user-info-section">
          <el-form :model="userForm" label-width="100px">
            <el-form-item label="用户名">
              <el-input v-model="userForm.username" :disabled="!isEditingUsername">
                <template #append>
                  <el-button @click="toggleUsernameEdit">{{ isEditingUsername ? '保存' : '编辑' }}</el-button>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="邮箱">
              <el-input v-model="userForm.email" disabled></el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="changePassword">更改密码</el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </el-dialog>

    <!-- 更改密码对话框 -->
    <el-dialog v-model="changePasswordVisible" title="更改密码" width="400px" append-to-body>
      <el-form :model="passwordForm" label-width="100px">
        <el-form-item label="当前密码" prop="currentPassword">
          <el-input v-model="passwordForm.currentPassword" type="password"></el-input>
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password"></el-input>
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="changePasswordVisible = false">取消</el-button>
          <el-button type="primary" @click="submitChangePassword">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </template>

<script setup>
import { ref, reactive, defineEmits, defineExpose, defineProps } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000'

const props = defineProps(['initialUserData'])
const emit = defineEmits(['update:userData'])

const isVisible = ref(false)
const avatarUrl = ref(props.initialUserData.avatarUrl)
const userForm = reactive({
  username: props.initialUserData.username,
  email: props.initialUserData.email
})
const isEditingUsername = ref(false)
const changePasswordVisible = ref(false)
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const open = async () => {
  isVisible.value = true
  const userId = localStorage.getItem('userId')
  if (userId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/user/${userId}`)
      userForm.username = response.data.username
      userForm.email = response.data.email
      avatarUrl.value = `${API_BASE_URL}${response.data.avatarUrl}`
      console.log('Loaded avatarUrl:', avatarUrl.value)
    } catch (error) {
      console.error('Error fetching user data:', error)
      ElMessage.error('获取用户数据失败')
    }
  }
}

const handleAvatarSuccess = (response) => {
  avatarUrl.value = `${API_BASE_URL}${response.avatarUrl}`
  emit('update:userData', { ...props.initialUserData, avatarUrl: avatarUrl.value })
}

const beforeAvatarUpload = (file) => {
  const isJPG = file.type === 'image/jpeg' || file.type === 'image/png'
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isJPG) {
    ElMessage.error('头像图片必须是 JPG 或 PNG 格式!')
  }
  if (!isLt2M) {
    ElMessage.error('头像图片大小不能超过 2MB!')
  }
  return isJPG && isLt2M
}

const toggleUsernameEdit = async () => {
  if (isEditingUsername.value) {
    try {
      const userId = localStorage.getItem('userId')
      console.log('Sending update username request:', { userId, newUsername: userForm.username })
      const response = await axios.post(`${API_BASE_URL}/api/update-username`, {
        userId,
        newUsername: userForm.username
      })
      console.log('Update username response:', response.data)
      if (response.data.success) {
        ElMessage.success('用户名更新成功')
        emit('update:userData', { ...props.initialUserData, username: userForm.username })
        isEditingUsername.value = false
      }
    } catch (error) {
      console.error('Error updating username:', error)
      if (error.response && error.response.status === 409) {
        ElMessage.error('用户名已存在，请选择其他用户名')
      } else {
        ElMessage.error('更新用户名失败')
      }
      userForm.username = props.initialUserData.username
    }
  } else {
    isEditingUsername.value = true
  }
}

// const uploadAvatar = async (file) => {
//   try {
//     const formData = new FormData()
//     formData.append('avatar', file)
//     formData.append('userId', localStorage.getItem('userId'))

//     const response = await axios.post(`${API_BASE_URL}/api/upload-avatar`, formData)
//     handleAvatarSuccess(response.data)
//   } catch (error) {
//     ElMessage.error('上传头像失败，请稍后再试')
//   }
// }

const changePassword = () => {
  changePasswordVisible.value = true
}

const submitChangePassword = async () => {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    ElMessage.error('两次输入的新密码不一致')
    return
  }

  try {
    const response = await axios.post('/api/change-password', passwordForm)
    if (response.data.success) {
      ElMessage.success('密码修改成功')
      changePasswordVisible.value = false
      passwordForm.currentPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''
    }
  } catch (error) {
    ElMessage.error('密码修改失败，请检查当前密码是否正确')
  }
}

defineExpose({ open })
</script>

  <style scoped>
  .user-profile-content {
    display: flex;
    justify-content: space-between;
  }

  .user-avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-right: 20px;
  }

  .avatar-uploader {
    margin-top: 20px;
  }

  .user-info-section {
    flex-grow: 1;
  }
  </style>
