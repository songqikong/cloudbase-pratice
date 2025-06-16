import cloudbase from '@cloudbase/js-sdk';
import adapter from './adapter.js';

// 使用 UniApp 适配器
cloudbase.useAdapters(adapter);

// 云开发环境配置
const config = {
  env: 'your-env-id', // 请替换为您的云开发环境ID
  // 如果需要使用移动应用安全凭证，请取消注释并填写
  // appSign: 'your-app-sign',
  // appSecret: {
  //   appAccessKeyId: 1,
  //   appAccessKey: 'your-app-secret'
  // }
};

// 创建云开发应用实例
const app = cloudbase.init(config);

// 获取认证对象
const auth = app.auth();

// 获取数据库对象
const db = app.database();

// 获取云函数对象
const functions = app.functions();

// 获取云存储对象
const storage = app.storage();

/**
 * 初始化云开发
 * 自动进行匿名登录
 */
export async function initCloudBase() {
  try {
    // 检查登录状态
    const loginState = auth.hasLoginState();
    
    if (!loginState) {
      // 匿名登录
      await auth.signInAnonymously();
      console.log('云开发匿名登录成功');
    }
    
    const loginScope = await auth.loginScope();
    console.log('当前登录状态:', loginScope);
    
    return true;
  } catch (error) {
    console.error('云开发初始化失败:', error);
    return false;
  }
}

/**
 * 获取云开发实例
 */
export function getCloudBaseApp() {
  return app;
}

/**
 * 获取数据库实例
 */
export function getDatabase() {
  return db;
}

/**
 * 获取云函数实例
 */
export function getFunctions() {
  return functions;
}

/**
 * 获取云存储实例
 */
export function getStorage() {
  return storage;
}

/**
 * 获取认证实例
 */
export function getAuth() {
  return auth;
}

/**
 * 调用云函数
 * @param name 云函数名称
 * @param data 传递的数据
 */
export async function callFunction(name: string, data?: any) {
  try {
    const result = await functions.callFunction({
      name,
      data
    });
    return result;
  } catch (error) {
    console.error('调用云函数失败:', error);
    throw error;
  }
}

/**
 * 上传文件到云存储
 * @param cloudPath 云端路径
 * @param filePath 本地文件路径
 * @param onProgress 上传进度回调
 */
export async function uploadFile(cloudPath: string, filePath: string, onProgress?: (progress: number) => void) {
  try {
    const result = await storage.uploadFile({
      cloudPath,
      filePath,
      onUploadProgress: (progressEvent: any) => {
        if (onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      }
    });
    return result;
  } catch (error) {
    console.error('上传文件失败:', error);
    throw error;
  }
}

/**
 * 下载文件
 * @param fileID 文件ID
 */
export async function downloadFile(fileID: string) {
  try {
    const result = await storage.downloadFile({
      fileID
    });
    return result;
  } catch (error) {
    console.error('下载文件失败:', error);
    throw error;
  }
}

export default {
  app,
  auth,
  db,
  functions,
  storage,
  initCloudBase,
  getCloudBaseApp,
  getDatabase,
  getFunctions,
  getStorage,
  getAuth,
  callFunction,
  uploadFile,
  downloadFile,
}; 