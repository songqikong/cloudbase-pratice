import { ContextInjected, TcbExtendedContext } from '@cloudbase/functions-typings';
import tcb from '@cloudbase/node-sdk';
export type TcbContext = ContextInjected<TcbExtendedContext>;

import { McpServer, McpTransportConfig } from './mcp';

let defaultEnvId: string;

export function setDefaultEnvId(envId: string) {
  if (!defaultEnvId && envId) {
    defaultEnvId = envId;
  }
}

export function getEnvId(context: TcbContext): string {
  return context.extendedContext?.envId || defaultEnvId || '';
}

/**
 * Gets the OpenAPI base URL for the current TCB environment.
 * @param context - The TCB context containing environment information
 * @returns The formatted base URL string in format: `https://{envId}.api.tcloudbasegateway.com`
 */
export function getOpenAPIBaseURL(context: TcbContext): string {
  return `https://${getEnvId(context)}.api.tcloudbasegateway.com`;
}

let defaultAccessToken: string;
export function setDefaultAccessToken(accessToken: string) {
  if (!defaultAccessToken && accessToken) {
    defaultAccessToken = accessToken;
  }
}
export function getAccessToken(context: TcbContext) {
  if (defaultAccessToken) {
    return defaultAccessToken.trim();
  }
  const accessToken =
    context?.extendedContext?.serviceAccessToken || context?.extendedContext?.accessToken;
  if (typeof accessToken !== 'string') {
    throw new Error('Invalid accessToken');
  }

  return accessToken.replace('Bearer', '').trim();
}

export function replaceEnvId(context: TcbContext, urlTemplate: string) {
  return urlTemplate.replace('{{envId}}', getEnvId(context));
}

export function checkIsInCBR() {
  // CBR = CLOUDBASE_RUN
  return !!process.env.CBR_ENV_ID;
}

export async function getFileInfo(context: TcbContext, files: string[]): Promise<any[]> {
  const originFileInfos = [];
  if (!files || files.length === 0) {
    return originFileInfos;
  }

  // 本地调试时，初始化 tcbapp 需要用到 secretID 和 secretKey，可以参考: https://docs.cloudbase.net/api-reference/server/node-sdk/initialization
  try {
    const tcbapp = tcb.init({ context });
    // 获取文件信息，用户保存在聊天记录中
    const data = await tcbapp.getTempFileURL({ fileList: files });
    if (data?.fileList && data?.fileList?.length !== 0) {
      const filePromises = data.fileList.map(async (item) => {
        const res = await fetch(item.tempFileURL, {
          method: 'HEAD',
        });
        const fileSize = parseInt(res.headers.get('content-length')) || 0;
        const contentType = res.headers.get('content-type') || '';
        const fileType = contentType.startsWith('image/') ? 'image' : 'file';

        console.log(item.fileID, fileSize, fileType);
        return { fileID: item.fileID, fileSize, fileType };
      });

      const result = await Promise.all(filePromises);
      result.map((item) => {
        originFileInfos.push({
          cloudId: item.fileID,
          fileName: item.fileID.split('/').pop(),
          bytes: item.fileSize,
          type: item.fileType,
        });
      });
    }
  } catch (error) {
    console.log('获取图片信息失败', error);
  }
  return originFileInfos;
}

export function dealMcpServerList(
  context: TcbContext,
  mcpServers: McpServer[],
): McpTransportConfig[] {
  const accessToken = getAccessToken(context);
  return mcpServers
    .filter((v) => mcpJudgeMcpUrl(v.url))
    .map((v: McpServer) => {
      return {
        name: v.name,
        url: new URL(v.url),
        transport: v.transport,
        tools: v.tools || [],
        requestInit: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        executeHook: async (toolResult) => {
          toolResult.content = await Promise.all(
            (toolResult.content as any)?.map(
              async (mcpContent: McpContent) =>
                await mcpProcessContent(context, mcpContent, v.name)
                  .then((mcpContent) => mcpContent)
                  .catch(() => mcpContent),
            ),
          );
          return toolResult;
        },
      };
    });
}

interface McpContent {
  type: string;
  data: string;
}

/**
 * 处理mcp工具返回的content中的图片或文件资源
 */
async function mcpProcessContent(
  context: TcbContext,
  content: McpContent,
  mcpName: string,
): Promise<McpContent> {
  if (content.type === 'image') {
    const buffer = Buffer.from(content.data, 'base64');
    const tcbapp = tcb.init({ context });
    const file = await tcbapp.uploadFile({
      cloudPath: `mcp_server/${mcpName}/${new Date().getTime()}.png`,
      fileContent: buffer,
    });
    const data = await tcbapp.getTempFileURL({ fileList: [file.fileID] });
    const tempFileURL = data?.fileList?.[0]?.tempFileURL;
    return {
      ...content,
      data: tempFileURL,
    };
  }
  return content;
}

function mcpJudgeMcpUrl(url: string): boolean {
  if (!url) return false;
  try {
    const urlFormat = new URL(url);
    return /(service.tcloudbase.com)|(api.tcloudbasegateway.com)$/.test(urlFormat.host);
  } catch (error) {
    console.log('mcpJudgeMcpUrl error:', error);
  }
  return false;
}
