<template>
  <el-dialog v-model="isVisible" title="裁剪头像" width="400px" height="400px" @close="handleClose">
    <div>
      <img ref="cropperImage" :src="imageUrl" alt="Avatar link is lost, please refresh the page or upload again" style="max-width: 100%;">
    </div>
    <div class="dialog-footer">
      <el-button @click="cancelCrop">取消</el-button>
      <el-button type="primary" @click="saveCrop">保存</el-button>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, nextTick, watch, onMounted, defineExpose, defineEmits } from 'vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import { ElMessage } from 'element-plus'

// const props = defineProps(['defaultAvatarUrl'])
const emit = defineEmits(['updateAvatarFile'])

const isVisible = ref(false)
const cropper = ref(null)
const imageUrl = ref('')
const cropperImage = ref(null)

const show = (url) => {
  console.log('CropperModal: show called with URL:', url)
  imageUrl.value = url
  isVisible.value = true
}

const handleClose = () => {
  console.log('CropperModal: handleClose called')
  if (cropper.value) {
    cropper.value.destroy()
    cropper.value = null
  }
  imageUrl.value = ''
}

const cancelCrop = () => {
  console.log('CropperModal: cancelCrop called')
  isVisible.value = false
  emit('updateAvatarFile', null)
}

const saveCrop = () => {
  console.log('CropperModal: saveCrop called')
  if (cropper.value) {
    const canvas = cropper.value.getCroppedCanvas({
      width: 400,
      height: 400,
      imageSmoothingQuality: 'high'
    })
    canvas.toBlob((blob) => {
      const file = new File([blob], 'avatar.png', { type: 'image/png' })
      console.log('CropperModal: Cropped image created', file)
      emit('updateAvatarFile', file)
      isVisible.value = false
      ElMessage.success('头像裁剪成功')
    }, 'image/png')
  }
}

const initCropper = () => {
  console.log('CropperModal: initCropper called')
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
        cropBoxMovable: false,
        cropBoxResizable: false,
        minCropBoxWidth: 400,
        minCropBoxHeight: 400,
        ready () {
          console.log('CropperModal: Cropper ready')
          const cropBoxData = cropper.value.getCropBoxData()
          const size = Math.min(cropBoxData.width, cropBoxData.height)
          cropper.value.setCropBoxData({
            left: (cropBoxData.width - size) / 2 + cropBoxData.left,
            top: (cropBoxData.height - size) / 2 + cropBoxData.top,
            width: 400,
            height: 400
          })
        }
      })
    } else {
      console.error('CropperModal: Failed to find the image element for cropper initialization.')
    }
  })
}

const watchVisibility = () => {
  watch(isVisible, (newValue) => {
    console.log('CropperModal: Visibility changed to', newValue)
    if (newValue) {
      initCropper()
    } else {
      handleClose()
    }
  })
}

onMounted(() => {
  console.log('CropperModal: Component mounted')
  watchVisibility()
})

defineExpose({ show })
</script>

<style scoped>
.cropper-container {
  /* width: 500px;
  height: 500px; */
  position: relative;
}

:deep(.cropper-view-box),
:deep(.cropper-face) {
  border-radius: 50%;
}
</style>
