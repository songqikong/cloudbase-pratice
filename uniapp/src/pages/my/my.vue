<template>
  <view class="container">
    <view class="header">
      <view class="user-info">
        <image class="avatar" src="/static/logo.png" mode="aspectFill"></image>
        <view class="user-details">
          <text class="username">用户名</text>
          <text class="user-id">ID: 10001</text>
        </view>
      </view>
    </view>
    
    <view class="content">
      <view class="menu-list">
        <view class="menu-item" @click="navigateTo('/pages/settings/settings')">
          <text class="menu-icon">⚙️</text>
          <text class="menu-text">设置</text>
          <text class="menu-arrow">›</text>
        </view>
        
        <view class="menu-item" @click="navigateTo('/pages/feedback/feedback')">
          <text class="menu-icon">📝</text>
          <text class="menu-text">意见反馈</text>
          <text class="menu-arrow">›</text>
        </view>
        
        <view class="menu-item" @click="navigateTo('/pages/about/about')">
          <text class="menu-icon">ℹ️</text>
          <text class="menu-text">关于我们</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
      
      <view class="version-info">
        <text class="version-text">版本 1.0.0</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
// 页面跳转
const navigateTo = (url: string) => {
  uni.navigateTo({ url })
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.header {
  background-color: #667eea;
  padding: 40rpx 30rpx;
  margin-bottom: 20rpx;
}

.user-info {
  display: flex;
  align-items: center;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  background-color: #fff;
  margin-right: 20rpx;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.username {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 6rpx;
}

.user-id {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.content {
  padding: 0 20rpx;
}

.menu-list {
  background-color: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  margin-bottom: 30rpx;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 30rpx 20rpx;
  position: relative;
}

.menu-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 20rpx;
  right: 20rpx;
  bottom: 0;
  height: 1rpx;
  background-color: #f0f0f0;
}

.menu-icon {
  font-size: 40rpx;
  margin-right: 20rpx;
}

.menu-text {
  flex: 1;
  font-size: 30rpx;
  color: #333;
}

.menu-arrow {
  font-size: 36rpx;
  color: #ccc;
}

.version-info {
  text-align: center;
  padding: 40rpx 0;
}

.version-text {
  font-size: 24rpx;
  color: #999;
}
</style>