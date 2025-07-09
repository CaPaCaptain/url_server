# URL Storage Server

一个基于Express.js的简单服务器，用于根据客户端IP和设备指纹存储和检索URL。

## 项目概述

本服务器应用提供了一个简单的API，用于存储和检索与客户端设备关联的URL。它结合使用IP地址和设备指纹来唯一标识客户端，无需用户身份验证。

## 功能特性

- 存储带有客户端标识的URL
- 检索先前存储的URL
- 设备指纹识别以增强客户端识别
- 支持跨域请求的CORS配置
- Docker容器化以便于部署

## 安装指南

### 前提条件
- Node.js (v16或更高版本)
- npm (v6或更高版本)

### 本地安装

1. 克隆仓库
2. 安装依赖：
   ```
   npm install
   ```
3. 启动服务器：
   ```
   npm start
   ```

## API文档

### 存储URL

存储与客户端设备关联的URL。

- **URL**: `/storeURL`
- **方法**: `POST`
- **请求体**: 
  ```json
  {"url": "https://example.com"}
  ```
- **成功响应**:
  - **状态码**: 200
  - **内容**: `{"message": "URL stored successfully.", "userId": "<user-identifier>"}`
- **错误响应**:
  - **状态码**: 400
  - **内容**: `{"error": "URL is required."}` 或 `{"error": "Invalid URL format."}`

### 获取URL

检索客户端设备存储的URL。

- **URL**: `/getURL`
- **方法**: `GET`
- **成功响应**:
  - **状态码**: 200
  - **内容**: `{"url": "https://example.com"}`
- **错误响应**:
  - **状态码**: 404
  - **内容**: `{"error": "No URL found for this device."}`

## 部署指南

### Docker部署

1. 构建Docker镜像：
   ```
   docker build -t url-server .
   ```
2. 运行容器：
   ```
   docker run -p 7860:7860 url-server
   ```

### 环境变量

- `PORT`: 服务器运行的端口号（默认：7860）

## 技术栈

- **框架**: Express.js
- **依赖包**: body-parser, cookie-parser, cors, request-ip

## 许可证

本项目采用MIT许可证 - 详见LICENSE文件。