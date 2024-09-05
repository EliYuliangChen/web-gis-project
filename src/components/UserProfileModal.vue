<template>
    <el-dialog v-model="isVisible" title="用户界面" width="600px" custom-class="user-profile-dialog">
      <div class="user-profile-content">
        <div class="user-avatar-section">
          <el-avatar :size="150" :src="avatarUrl" />
          <el-button size="small" type="primary" @click="openCropper">更换头像</el-button>
          <el-upload
            class="avatar-uploader"
            :action="uploadAction"
            :show-file-list="false"
            :before-upload="beforeAvatarUpload"
            @change="handleFileChange"
          >
            <el-button size="small" type="primary">上传图片</el-button>
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
        <div class="dialog-footer">
          <el-button @click="discardChanges" :disabled="!isAvatarModified">取消</el-button>
          <el-button type="primary" @click="confirmChanges" :disabled="!isAvatarModified">确认修改</el-button>
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

    <!-- 裁剪头像对话框 -->
    <CropperModal
      ref="cropperModal"
      :form="userForm"
      :defaultAvatarUrl="avatarUrl"
      :immediateUpdate="false"
      @updateTempAvatarUrl="handleTempAvatarUpdate"
      @updateAvatarUrl="handleAvatarUpdate"
    />
</template>

<script setup>
import { ref, reactive, defineEmits, defineExpose, defineProps } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import CropperModal from './CropperModal.vue' // 引入裁剪组件

const API_BASE_URL = 'http://localhost:3000'

const props = defineProps(['initialUserData'])
const emit = defineEmits(['update:userData'])

const isVisible = ref(false)
const avatarUrl = ref(props.initialUserData.avatarUrl)
const userForm = reactive({
  username: props.initialUserData.username,
  email: props.initialUserData.email,
  avatarUrl: props.initialUserData.avatarUrl
})
const isEditingUsername = ref(false)
const changePasswordVisible = ref(false)
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const isAvatarModified = ref(false) // 追踪头像是否修改过
const cropperModal = ref(null)
const uploadAction = ref(`${API_BASE_URL}/upload-avatar`)

const open = async () => {
  isVisible.value = true
  const userId = localStorage.getItem('userId')
  if (userId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/user/profile`)
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

const openCropper = () => {
  cropperModal.value.show(avatarUrl.value)
}

const handleFileChange = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    cropperModal.value.show(e.target.result)
  }
  reader.readAsDataURL(file.raw)
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

const handleAvatarUpdate = (newAvatarUrl) => {
  // 确保我们只使用文件名
  const fileName = newAvatarUrl.split('/').pop()
  avatarUrl.value = `${API_BASE_URL}/uploads/avatar/${fileName}`
  userForm.avatarUrl = fileName
  emit('update:userData', { ...props.initialUserData, avatarUrl: fileName })
  isAvatarModified.value = true
  console.log('Updated avatarUrl:', avatarUrl.value)
  console.log('Updated userForm.avatarUrl:', userForm.avatarUrl)
}

const handleTempAvatarUpdate = (newTempAvatarUrl) => {
  // 确保我们只使用文件名
  const fileName = newTempAvatarUrl.split('/').pop()
  avatarUrl.value = `${API_BASE_URL}/uploads/temp/${fileName}`
  userForm.avatarUrl = fileName
  isAvatarModified.value = true
  console.log('Updated avatarUrl:', avatarUrl.value)
  console.log('Updated userForm.avatarUrl:', userForm.avatarUrl)
}

const confirmChanges = async () => {
  const userId = localStorage.getItem('userId')
  try {
    const response = await axios.post(`${API_BASE_URL}/update-avatar`, {
      userId,
      newAvatar: userForm.avatarUrl // 提交新的正式头像
    })
    console.log('newAvatar:', userForm.avatarUrl)
    if (response.data.avatarUrl) {
      ElMessage.success('头像修改成功')
      emit('update:userData', { ...props.initialUserData, avatarUrl: response.data.avatarUrl })
      isAvatarModified.value = false // 重置修改标记
      isVisible.value = false
    }
  } catch (error) {
    ElMessage.error('头像修改失败')
  }
}

const discardChanges = async () => {
  try {
    await axios.post(`${API_BASE_URL}/delete-temp-avatar`, {
      tempAvatarUrl: avatarUrl.value // 删除临时头像文件
    })
    avatarUrl.value = props.initialUserData.avatarUrl // 恢复为旧头像
    userForm.avatarUrl = props.initialUserData.avatarUrl
    isAvatarModified.value = false
  } catch (error) {
    ElMessage.error('取消修改失败')
  }
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
        if (!avatarUrl.value.startsWith('http')) {
          avatarUrl.value = `${API_BASE_URL}${avatarUrl.value}`
        }
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

const changePassword = () => {
  changePasswordVisible.value = true
}

const submitChangePassword = async () => {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    ElMessage.error('两次输入的新密码不一致')
    return
  }

  const userId = localStorage.getItem('userId')
  const token = localStorage.getItem('token')

  try {
    const response = await axios.post(`${API_BASE_URL}/api/change-password`,
      {
        userId,
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )
    if (response.data.success) {
      ElMessage.success('密码修改成功')
      changePasswordVisible.value = false
      passwordForm.currentPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''
    }
  } catch (error) {
    console.error('Error changing password:', error)
    if (error.response && error.response.status === 401) {
      ElMessage.error('当前密码不正确')
    } else {
      ElMessage.error('密码修改失败，请稍后重试')
    }
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
