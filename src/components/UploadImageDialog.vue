<template>
    <el-dialog
        v-model="dialogVisible"
        title="上传图片"
        width="30%"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
        :show-close="!isAnalyzing"
    >
      <el-upload
        ref="uploadRef"
        class="upload-demo"
        drag
        action="#"
        :auto-upload="false"
        :on-change="handleFileChange"
        :disabled="isAnalyzing"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          拖拽文件到此处或 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            只能上传 jpg/png 文件，且不超过 5MB
          </div>
        </template>
      </el-upload>
      <template #footer>
        <span class="dialog-footer">
            <el-button @click="handleClose" :disabled="isAnalyzing">取消</el-button>
            <el-button type="primary" @click="handleSubmit" :loading="isAnalyzing" :disabled="!selectedFile">
            {{ isAnalyzing ? '分析中' : '提交' }}
            </el-button>
        </span>
      </template>
    </el-dialog>
  </template>

<script setup>
import { ref, defineProps, defineEmits, watch } from 'vue'
import { UploadFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  visible: Boolean
})

const emit = defineEmits(['close', 'submit'])

const dialogVisible = ref(false)
const selectedFile = ref(null)
const isAnalyzing = ref(false)
const uploadRef = ref(null)

watch(() => props.visible, (newValue) => {
  dialogVisible.value = newValue
  if (newValue) {
    // 当对话框打开时，重置上传组件
    resetUpload()
  }
})

const resetUpload = () => {
  selectedFile.value = null
  isAnalyzing.value = false
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}

const handleClose = () => {
//   selectedFile.value = null
  if (!isAnalyzing.value) {
    resetUpload()
    emit('close')
  }
}

const handleFileChange = (file) => {
  selectedFile.value = file
}

const handleSubmit = () => {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择一张图片')
    return
  }
  isAnalyzing.value = true
  emit('submit', selectedFile.value.raw)
}
</script>
