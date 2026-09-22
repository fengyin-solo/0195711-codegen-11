# 阶段一：校验题库清单
# 与浏览器端共用 js/quiz-validator.js，保证本地开发与容器启动时使用同一套校验；
# 清单存在致命错误（如没有任何有效题目）时构建失败。
FROM node:20-alpine AS quiz-manifest-check
WORKDIR /build
COPY data/quiz-manifest.js data/quiz-manifest.js
COPY js/quiz-validator.js js/quiz-validator.js
COPY tools/validate-quiz.js tools/validate-quiz.js
RUN node tools/validate-quiz.js

# 阶段二：使用官方nginx:alpine镜像，支持多架构（ARM64/AMD64）
FROM nginx:alpine

# 复制静态文件到nginx目录
COPY . /usr/share/nginx/html/

# 删除Dockerfile与校验工具，避免暴露
RUN rm -f /usr/share/nginx/html/Dockerfile \
    && rm -rf /usr/share/nginx/html/tools

# 配置nginx
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
