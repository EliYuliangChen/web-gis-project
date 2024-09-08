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
            action="https://jsonplaceholder.typicode.com/posts/"
            :show-file-list="false"
            :on-success="handleImageSuccess"
            :before-upload="beforeImageUpload"
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

const props = defineProps({
  visible: Boolean,
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
  // 表单验证逻辑
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
  emit('submit', form.value)
}

const handleImageSuccess = (res, file) => {
  form.value.imageUrl = URL.createObjectURL(file.raw)
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
