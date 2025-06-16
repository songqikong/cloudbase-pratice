// UniApp 适配器，用于云开发 JS SDK 多端兼容
const adapter = {
  // 网络请求
  request: (options) => {
    return new Promise((resolve, reject) => {
      const { url, method = 'GET', data, header } = options;
      
      uni.request({
        url,
        method,
        data,
        header,
        success: (res) => {
          resolve({
            status: res.statusCode,
            data: res.data,
            headers: res.header
          });
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },

  // 上传文件
  upload: (options) => {
    return new Promise((resolve, reject) => {
      const { url, filePath, name, formData, header, onUploadProgress } = options;
      
      const uploadTask = uni.uploadFile({
        url,
        filePath,
        name,
        formData,
        header,
        success: (res) => {
          resolve({
            status: res.statusCode,
            data: typeof res.data === 'string' ? JSON.parse(res.data) : res.data,
            headers: res.header || {}
          });
        },
        fail: (err) => {
          reject(err);
        }
      });

      // 监听上传进度
      if (onUploadProgress && uploadTask.onProgressUpdate) {
        uploadTask.onProgressUpdate((progressEvent) => {
          onUploadProgress({
            loaded: progressEvent.totalBytesSent,
            total: progressEvent.totalBytesExpectedToSend
          });
        });
      }
    });
  },

  // 下载文件
  download: (options) => {
    return new Promise((resolve, reject) => {
      const { url, header } = options;
      
      uni.downloadFile({
        url,
        header,
        success: (res) => {
          resolve({
            status: res.statusCode,
            tempFilePath: res.tempFilePath,
            headers: res.header || {}
          });
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },

  // WebSocket 连接
  websocket: {
    connect: (options) => {
      const { url, protocols } = options;
      return new Promise((resolve, reject) => {
        const socketTask = uni.connectSocket({
          url,
          protocols,
          success: () => {
            resolve(socketTask);
          },
          fail: (err) => {
            reject(err);
          }
        });
      });
    }
  },

  // 存储
  storage: {
    // 设置存储
    setItem: (key, value) => {
      return new Promise((resolve, reject) => {
        try {
          uni.setStorageSync(key, value);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    },
    
    // 获取存储
    getItem: (key) => {
      return new Promise((resolve, reject) => {
        try {
          const value = uni.getStorageSync(key);
          resolve(value);
        } catch (error) {
          reject(error);
        }
      });
    },
    
    // 删除存储
    removeItem: (key) => {
      return new Promise((resolve, reject) => {
        try {
          uni.removeStorageSync(key);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    },
    
    // 清空存储
    clear: () => {
      return new Promise((resolve, reject) => {
        try {
          uni.clearStorageSync();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    }
  },

  // 运行时环境检测
  runtime: (() => {
    // #ifdef APP-PLUS
    return 'app';
    // #endif
    
    // #ifdef H5
    return 'h5';
    // #endif
    
    // #ifdef MP-WEIXIN
    return 'mp-weixin';
    // #endif
    
    // #ifdef MP-ALIPAY
    return 'mp-alipay';
    // #endif
    
    // #ifdef MP-BAIDU
    return 'mp-baidu';
    // #endif
    
    // #ifdef MP-TOUTIAO
    return 'mp-toutiao';
    // #endif
    
    // #ifdef MP-QQ
    return 'mp-qq';
    // #endif
    
    return 'unknown';
  })()
};

export default adapter; 