# 使用 Node.js 官方镜像
FROM node:16

# 设置工作目录
WORKDIR /app

# 复制项目文件
COPY . .

# 安装依赖
RUN npm install

# 暴露端口（Hugging Face 会自动分配端口）
EXPOSE 7860

# 启动服务
CMD ["npm", "start"]
