<template>
  <view class="container">
    <view class="header">
      <text class="title">欢迎使用</text>
      <text class="subtitle">请选择以下操作开始</text>
    </view>
    
    <view class="content">
      <view class="button-group">
        <button class="btn btn-primary" @click="handleCreate">
          <text class="btn-icon">✚</text>
          <text class="btn-text">新建</text>
        </button>
        
        <button class="btn btn-secondary" @click="handleImport">
          <text class="btn-icon">↓</text>
          <text class="btn-text">导入</text>
        </button>
      </view>
      
      <view class="recent-section" v-if="recentItems.length > 0">
        <view class="section-header">
          <text class="section-title">最近使用</text>
          <text class="section-more" @click="navigateToHistory">查看全部</text>
        </view>
        
        <view class="recent-list">
          <view class="recent-item" v-for="(item, index) in recentItems" :key="index" @click="openItem(item)">
            <text class="item-title">{{ item.title }}</text>
            <text class="item-date">{{ item.date }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// 模拟最近使用的数据
const recentItems = ref([
  // 这里是示例数据，实际应用中应该从数据库或存储中获取
  // {
  //   id: '1',
  //   title: '示例项目',
  //   date: '2023-05-15'
  // }
])

// 处理新建按钮点击
const handleCreate = () => {
  uni.navigateTo({
    url: '/pages/create/create'
  })
}

// 处理导入按钮点击
const handleImport = () => {
  uni.chooseFile({
    count: 1,
    success: (res) => {
      console.log('选择的文件路径：', res.tempFilePaths)
      // 这里处理导入逻辑
    },
    fail: (err) => {
      console.error('选择文件失败：', err)
    }
  })
}

// 打开项目
const openItem = (item: any) => {
  uni.navigateTo({
    url: `/pages/detail/detail?id=${item.id}`
  })
}

// 跳转到历史页面
const navigateToHistory = () => {
  uni.switchTab({
    url: '/pages/history/history'
  })
}
</script>

<style scoped>
.container {
  padding: 40rpx 30rpx;
  min-height: 100vh;
  background-color: #f8f9fa;
}

.header {
  margin-bottom: 60rpx;
  text-align: center;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.subtitle {
  font-size: 28rpx;
  color: #666;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 60rpx;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100rpx;
  border-radius: 12rpx;
  font-size: 32rpx;
  font-weight: bold;
}

.btn-primary {
  background-color: #667eea;
  color: #fff;
}

.btn-secondary {
  background-color: #fff;
  color: #667eea;
  border: 2rpx solid #667eea;
}

.btn-icon {
  font-size: 36rpx;
  margin-right: 10rpx;
}

.recent-section {
  margin-top: 20rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.section-more {
  font-size: 26rpx;
  color: #667eea;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.recent-item {
  background-color: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.item-title {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.item-date {
  font-size: 24rpx;
  color: #999;
}
</style>