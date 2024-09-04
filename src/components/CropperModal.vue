<template>
    <el-dialog v-model="isVisible" title="裁剪头像" width="600px" @close="handleClose">
      <div>
        <el-upload
            class="avatar-uploader"
            :action="null"
            :show-file-list="false"
            :before-upload="beforeAvatarUpload"
            @change="handleFileChange"
        >
        </el-upload>
        <img ref="cropperImage" :src="imageUrl" alt="Avatar link is lost, please refresh the page or upload again" style="max-width: 100%;">
        <!-- <div class="cropper-overlay"></div> -->
      </div>
      <div class="dialog-footer">
        <el-button @click="cancelCrop">取消</el-button>
        <el-button type="primary" @click="saveCrop">保存</el-button>
      </div>
    </el-dialog>
  </template>

<script setup>
import { ref, nextTick, watch, onMounted, defineExpose, defineProps, defineEmits } from 'vue'
import axios from 'axios'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import { ElMessage } from 'element-plus'

const props = defineProps(['form', 'defaultAvatarUrl', 'immediateUpdate']) // 增加 immediateUpdate
const emit = defineEmits(['updateAvatarUrl', 'updateTempAvatarUrl']) // 增加 updateTempAvatarUrl 事件

const isVisible = ref(false)
const cropper = ref(null)
const imageUrl = ref('')
const cropperImage = ref(null)
const localAvatarUrl = ref(props.form.avatarUrl)

const show = (url) => {
  imageUrl.value = url
  isVisible.value = true
}

const handleClose = () => {
  if (cropper.value) {
    cropper.value.destroy()
    cropper.value = null
  }
  imageUrl.value = '' // 清空图片路径
}

const cancelCrop = () => {
  isVisible.value = false
  localAvatarUrl.value = props.defaultAvatarUrl // 恢复默认头像
  emit('updateAvatarUrl', localAvatarUrl.value) // 通知父组件更新
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

const saveCrop = () => {
  if (cropper.value) {
    const canvas = cropper.value.getCroppedCanvas({
      width: 200,
      height: 200,
      imageSmoothingQuality: 'high'
    })
    canvas.toBlob((blob) => {
      const timeStamp = Date.now()
      const fileName = `${timeStamp}.png` // 使用时间戳生成唯一文件名
      const formData = new FormData()
      formData.append('file', blob, fileName)

      axios.post('http://localhost:3000/upload-avatar', formData)
        .then(response => {
          ElMessage.success('头像裁剪并上传成功')
          isVisible.value = false

          // 如果 immediateUpdate 为 true，更新正式头像
          if (props.immediateUpdate) {
            emit('updateAvatarUrl', `http://localhost:3000${response.data.tempAvatarUrl}`)
          } else {
            // 暂时更新，等用户点击“确认修改”后再更新正式头像
            emit('updateTempAvatarUrl', `http://localhost:3000${response.data.tempAvatarUrl}`)
          }
        })
        .catch(error => {
          console.error('头像裁剪上传失败:', error)
          ElMessage.error('头像裁剪上传失败')
        })
    })
  }
}

const initCropper = () => {
  nextTick(() => {
    if (cropperImage.value) {
      cropper.value = new Cropper(cropperImage.value, {
        aspectRatio: 1,
        viewMode: 1,
        autoCropArea: 1,
        dragMode: 'move',
        background: false,
        modal: true,
        guides: false,
        center: true,
        highlight: false,
        // cropBoxResizable: false,
        cropBoxMovable: false,
        cropBoxResizable: true,
        minCropBoxWidth: 200,
        minCropBoxHeight: 200,
        ready () {
          // 在这里可以进一步自定义裁剪框的行为
          const cropBoxData = cropper.value.getCropBoxData()
          const size = Math.min(cropBoxData.width, cropBoxData.height)
          cropper.value.setCropBoxData({
            left: (cropBoxData.width - size) / 2 + cropBoxData.left,
            top: (cropBoxData.height - size) / 2 + cropBoxData.top,
            width: size,
            height: size
          })
        }
      })
    } else {
      console.error('Failed to find the image element for cropper initialization.')
    }
  })
}

const watchVisibility = () => {
  watch(isVisible, (newValue) => {
    if (newValue) {
      initCropper()
    } else {
      handleClose()
    }
  })
}

onMounted(() => {
  watchVisibility()
})

defineExpose({ show })

</script>

<style scoped>
.cropper-container {
  position: relative;
}

:deep(.cropper-view-box),
:deep(.cropper-face) {
  border-radius: 50%;
}

</style>
