<template>
    <div class="marker-form-sidebar" :class="{ 'is-visible': visible }">
        <h3>添加标记点</h3>
        <el-form :model="form" label-position="top">
        <el-form-item label="名称">
            <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="类型">
            <el-select v-model="form.type" placeholder="请选择类型">
            <el-option label="类型1" value="type1" />
            <el-option label="类型2" value="type2" />
            <el-option label="类型3" value="type3" />
            </el-select>
        </el-form-item>
        <el-form-item label="上传图片">
          <el-upload
            class="image-uploader"
            :show-file-list="false"
            :on-change="handleImageChange"
            :before-upload="beforeImageUpload"
            :auto-upload="false"
          >
            <img v-if="form.imageUrl" :src="form.imageUrl" class="uploaded-image" />
            <el-icon v-else class="image-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="描述">
            <el-input v-model="form.description" type="textarea" />
        </el-form-item>
        </el-form>
        <div class="form-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button type="primary" @click="handleSubmit">提交</el-button>
        </div>
    </div>
  </template>

<script setup>
import { ref, defineProps, defineEmits, watch, watchEffect } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const props = defineProps({
  visible: Boolean,
  markerCoordinates: Object,
  initialImage: String
})

const emit = defineEmits(['close', 'submit'])

const form = ref({
  name: '',
  type: '',
  imageUrl: '',
  description: ''
})

watchEffect(() => {
  if (props.visible && props.initialImage) {
    form.value.imageUrl = props.initialImage
  }
})

watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    form.value = {
      name: '',
      type: '',
      imageUrl: '',
      description: ''
    }
  }
})

watch(() => props.initialImage, (newImage) => {
  if (newImage) {
    form.value.imageUrl = newImage
  }
})

const handleClose = () => {
  emit('close')
}

const handleSubmit = () => {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入标记点名称')
    return
  }
  if (!form.value.type) {
    ElMessage.warning('请选择标记点类型')
    return
  }
  if (!form.value.imageUrl) {
    ElMessage.warning('请上传标记点图片')
    return
  }
  if (!form.value.description.trim()) {
    ElMessage.warning('请输入标记点描述')
    return
  }

  if (!props.markerCoordinates) {
    ElMessage.error('无法获取经纬度，请先放置标记点')
    return
  }

  const formData = new FormData()
  formData.append('name', form.value.name)
  formData.append('type', form.value.type)
  formData.append('description', form.value.description)
  formData.append('lat', props.markerCoordinates.lat) // 添加纬度
  formData.append('lng', props.markerCoordinates.lng) // 添加经度

  // 这里 form.value.imageUrl 包含的是图片的 URL，需要将上传的文件也一起发送
  formData.append('image', form.value.imageFile)

  // 发送表单数据和文件到后端
  axios.post('http://192.168.68.103:3000/api/markers', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
    .then(response => {
      ElMessage.success('标记点提交成功')
      emit('submit', response.data.marker)
    })
    .catch(error => {
      ElMessage.error('标记点提交失败')
      console.error('Error submitting marker:', error)
    })
}

const handleImageChange = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    form.value.imageUrl = e.target.result // 将图片预览显示在上传框中
  }
  reader.readAsDataURL(file.raw) // 读取图片文件内容，生成 base64 URL
  form.value.imageFile = file.raw // 保存图片文件供后续上传
}

const beforeImageUpload = (file) => {
  const isJPG = file.type === 'image/jpeg' || file.type === 'image/png'
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isJPG) {
    ElMessage.error('头像图片必须是 JPG 或 PNG 格式!')
  }
  if (!isLt2M) {
    ElMessage.error('上传头像图片大小不能超过 2MB!')
  }
  return isJPG && isLt2M
}
</script>

  <style scoped>
  .marker-form-sidebar {
    position: absolute;
    left: 30px;
    top: 400px; /* 可能需要根据您的布局调整 */
    width: 300px;
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    padding: 20px;
    transform: translateX(-120%);
    transition: transform 0.3s ease-in-out;
    z-index: 1000;
  }

  .marker-form-sidebar.is-visible {
    transform: translateX(0);
  }

  .image-uploader .uploaded-image {
    width: 178px;
    height: 178px;
    display: block;
  }

  .image-uploader .el-upload {
    border: 1px dashed var(--el-border-color);
    border-radius: 6px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
  }

  .image-uploader .el-upload:hover {
    border-color: var(--el-color-primary);
  }

  .el-icon.image-uploader-icon {
    font-size: 28px;
    color: #8c939d;
    width: 178px;
    height: 178px;
    text-align: center;
  }

  .form-footer {
    display: flex;
    justify-content: space-between;
    margin-top: 20px;
  }
  </style>
