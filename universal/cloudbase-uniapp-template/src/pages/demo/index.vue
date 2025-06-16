<template>
  <view class="container">
    <view class="header">
      <text class="title">云开发 UniApp 演示</text>
      <text class="status" :class="{ success: isLoggedIn }">
        {{ loginStatus }}
      </text>
    </view>

    <view class="section">
      <view class="section-title">认证功能</view>
      <view class="btn-group">
        <button @click="anonymousLogin" class="btn primary">匿名登录</button>
        <button @click="logout" class="btn secondary">退出登录</button>
      </view>
    </view>

    <view class="section">
      <view class="section-title">云函数</view>
      <view class="btn-group">
        <button @click="callCloudFunction" class="btn primary">调用云函数</button>
      </view>
      <view v-if="functionResult" class="result">
        <text>{{ functionResult }}</text>
      </view>
    </view>

    <view class="section">
      <view class="section-title">数据库操作</view>
      <view class="btn-group">
        <button @click="addData" class="btn primary">添加数据</button>
        <button @click="queryData" class="btn primary">查询数据</button>
      </view>
      <view v-if="dbResult" class="result">
        <text>{{ dbResult }}</text>
      </view>
    </view>

    <view class="section">
      <view class="section-title">文件存储</view>
      <view class="btn-group">
        <button @click="uploadImage" class="btn primary">上传图片</button>
        <button @click="downloadFile" class="btn primary" :disabled="!uploadedFileId">下载文件</button>
      </view>
      <view v-if="uploadResult" class="result">
        <text>{{ uploadResult }}</text>
      </view>
      <view v-if="uploadProgress > 0 && uploadProgress < 100" class="progress">
        <text>上传进度: {{ uploadProgress }}%</text>
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: uploadProgress + '%' }"></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { 
  getAuth, 
  getDatabase, 
  callFunction, 
  uploadFile, 
  downloadFile 
} from '../../utils/cloudbase';
import { showToast, formatDate } from '../../utils/index';

export default {
  data() {
    return {
      isLoggedIn: false,
      loginStatus: '未登录',
      functionResult: '',
      dbResult: '',
      uploadResult: '',
      uploadProgress: 0,
      uploadedFileId: ''
    }
  },

  onLoad() {
    this.checkLoginStatus();
  },

  methods: {
    // 检查登录状态
    async checkLoginStatus() {
      try {
        const auth = getAuth();
        const loginState = auth.hasLoginState();
        
        if (loginState) {
          const loginScope = await auth.loginScope();
          this.isLoggedIn = true;
          this.loginStatus = `已登录 (${loginScope})`;
        } else {
          this.isLoggedIn = false;
          this.loginStatus = '未登录';
        }
      } catch (error) {
        console.error('检查登录状态失败:', error);
        this.loginStatus = '登录状态异常';
      }
    },

    // 匿名登录
    async anonymousLogin() {
      try {
        showToast('登录中...', 'loading');
        const auth = getAuth();
        await auth.signInAnonymously();
        
        showToast('登录成功', 'success');
        this.checkLoginStatus();
      } catch (error) {
        console.error('匿名登录失败:', error);
        showToast('登录失败', 'error');
      }
    },

    // 退出登录
    async logout() {
      try {
        const auth = getAuth();
        await auth.signOut();
        
        showToast('已退出登录', 'success');
        this.checkLoginStatus();
      } catch (error) {
        console.error('退出登录失败:', error);
        showToast('退出失败', 'error');
      }
    },

    // 调用云函数
    async callCloudFunction() {
      try {
        if (!this.isLoggedIn) {
          showToast('请先登录', 'error');
          return;
        }

        showToast('调用中...', 'loading');
        const result = await callFunction('hello', {
          name: 'UniApp',
          timestamp: Date.now()
        });
        
        this.functionResult = JSON.stringify(result, null, 2);
        showToast('调用成功', 'success');
      } catch (error) {
        console.error('调用云函数失败:', error);
        this.functionResult = `调用失败: ${error.message}`;
        showToast('调用失败', 'error');
      }
    },

    // 添加数据
    async addData() {
      try {
        if (!this.isLoggedIn) {
          showToast('请先登录', 'error');
          return;
        }

        showToast('添加中...', 'loading');
        const db = getDatabase();
        const result = await db.collection('test').add({
          message: 'Hello from UniApp',
          timestamp: new Date(),
          platform: uni.getSystemInfoSync().platform
        });
        
        this.dbResult = `添加成功，ID: ${result.id}`;
        showToast('添加成功', 'success');
      } catch (error) {
        console.error('添加数据失败:', error);
        this.dbResult = `添加失败: ${error.message}`;
        showToast('添加失败', 'error');
      }
    },

    // 查询数据
    async queryData() {
      try {
        if (!this.isLoggedIn) {
          showToast('请先登录', 'error');
          return;
        }

        showToast('查询中...', 'loading');
        const db = getDatabase();
        const result = await db.collection('test').limit(5).get();
        
        this.dbResult = `查询到 ${result.data.length} 条数据:\n${JSON.stringify(result.data, null, 2)}`;
        showToast('查询成功', 'success');
      } catch (error) {
        console.error('查询数据失败:', error);
        this.dbResult = `查询失败: ${error.message}`;
        showToast('查询失败', 'error');
      }
    },

    // 上传图片
    uploadImage() {
      if (!this.isLoggedIn) {
        showToast('请先登录', 'error');
        return;
      }

      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          try {
            const filePath = res.tempFilePaths[0];
            const cloudPath = `images/${Date.now()}.jpg`;
            
            this.uploadProgress = 0;
            showToast('上传中...', 'loading');
            
            const result = await uploadFile(cloudPath, filePath, (progress) => {
              this.uploadProgress = progress;
            });
            
            this.uploadedFileId = result.fileID;
            this.uploadResult = `上传成功:\n文件ID: ${result.fileID}`;
            this.uploadProgress = 100;
            showToast('上传成功', 'success');
          } catch (error) {
            console.error('上传失败:', error);
            this.uploadResult = `上传失败: ${error.message}`;
            showToast('上传失败', 'error');
          }
        },
        fail: (error) => {
          console.error('选择图片失败:', error);
          showToast('选择图片失败', 'error');
        }
      });
    },

    // 下载文件
    async downloadFile() {
      try {
        if (!this.uploadedFileId) {
          showToast('请先上传文件', 'error');
          return;
        }

        showToast('下载中...', 'loading');
        const result = await downloadFile(this.uploadedFileId);
        
        showToast('下载成功', 'success');
        console.log('下载结果:', result);
      } catch (error) {
        console.error('下载失败:', error);
        showToast('下载失败', 'error');
      }
    }
  }
}
</script>

<style scoped>
.container {
  padding: 20rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
  padding: 40rpx 20rpx;
  background: white;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 20rpx;
}

.status {
  font-size: 28rpx;
  color: #999;
  padding: 10rpx 20rpx;
  background: #f0f0f0;
  border-radius: 20rpx;
  display: inline-block;
}

.status.success {
  color: #07c160;
  background: #e7f8f0;
}

.section {
  margin-bottom: 40rpx;
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 30rpx;
  border-left: 8rpx solid #07c160;
  padding-left: 20rpx;
}

.btn-group {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
  flex-wrap: wrap;
}

.btn {
  flex: 1;
  min-width: 200rpx;
  height: 80rpx;
  border-radius: 40rpx;
  border: none;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn.primary {
  background: #07c160;
  color: white;
}

.btn.primary:active {
  background: #06ad56;
}

.btn.secondary {
  background: #f0f0f0;
  color: #666;
}

.btn.secondary:active {
  background: #e0e0e0;
}

.btn:disabled {
  background: #ccc !important;
  color: #999 !important;
}

.result {
  margin-top: 20rpx;
  padding: 20rpx;
  background: #f8f9fa;
  border-radius: 10rpx;
  border-left: 6rpx solid #07c160;
}

.result text {
  font-size: 24rpx;
  color: #333;
  line-height: 1.5;
  word-break: break-all;
}

.progress {
  margin-top: 20rpx;
}

.progress text {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 10rpx;
  display: block;
}

.progress-bar {
  height: 8rpx;
  background: #f0f0f0;
  border-radius: 4rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #07c160;
  transition: width 0.3s ease;
}
</style> 