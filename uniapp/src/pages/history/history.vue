<template>
  <view class="container">
    <view class="header">
      <text class="title">历史记录</text>
    </view>
    
    <view class="content">
      <view class="empty-state" v-if="historyList.length === 0">
        <text class="empty-icon">📜</text>
        <text class="empty-text">暂无历史记录</text>
        <text class="empty-desc">您创建或导入的内容将显示在这里</text>
      </view>
      
      <view class="history-list" v-else>
        <view class="history-item" v-for="(item, index) in historyList" :key="index" @click="openItem(item)">
          <view class="item-header">
            <text class="item-title">{{ item.title }}</text>
            <text class="item-date">{{ item.date }}</text>
          </view>
          <text class="item-desc">{{ item.description }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// 模拟历史记录数据
const historyList = ref([
  // 这里是示例数据，实际应用中应该从数据库或存储中获取
  // {
  //   id: '1',
  //   title: '示例项目',
  //   description: '这是一个示例项目描述',
  //   date: '2023-05-15'
  // }
])

// 打开历史项目
const openItem = (item: any) => {
  uni.navigateTo({
    url: `/pages/detail/detail?id=${item.id}`
  })
}
</script>

<style scoped>
.container {
  padding: 20rpx;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.header {
  padding: 20rpx 0;
  margin-bottom: 30rpx;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.content {
  flex: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-icon {
  font-size: 100rpx;
  margin-bottom: 30rpx;
}

.empty-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.empty-desc {
  font-size: 28rpx;
  color: #999;
  text-align: center;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.history-item {
  background-color: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}

.item-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.item-date {
  font-size: 24rpx;
  color: #999;
}

.item-desc {
  font-size: 26rpx;
  color: #666;
  line-height: 1.4;
}
</style>