# 阶段一：使用与本地开发相同的脚本校验测验清单
# 清单缺少必填内容或引用了不存在的知识点时构建失败（输出说明与被跳过的条目）
FROM node:alpine AS validator
WORKDIR /app
COPY data ./data
COPY js/quiz-data.js ./js/quiz-data.js
COPY tools ./tools
RUN node tools/validate-quiz-data.mjs

# 收集 node 运行时所需的动态库，放到独立目录，避免污染运行镜像的 /usr/lib
RUN mkdir -p /node-libs && \
    for lib in $(ldd /usr/local/bin/node | awk '/=>/ {print $3}'); do \
        cp -L "$lib" /node-libs/; \
    done

# 阶段二：运行镜像（nginx），同时携带独立的 node 二进制与运行库，
# 使容器启动时能运行与本地开发完全相同的校验脚本
FROM nginx:alpine

# node 二进制及其动态库（仅在启动校验时使用）
COPY --from=validator /usr/local/bin/node /opt/bin/node
COPY --from=validator /node-libs /opt/node-libs

# 复制静态文件到nginx目录
COPY . /usr/share/nginx/html/

# 删除Dockerfile避免暴露
RUN rm -f /usr/share/nginx/html/Dockerfile && \
    chmod +x /usr/share/nginx/html/docker-entrypoint.sh

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

# 容器启动时执行与本地开发相同的清单校验，通过后再启动 nginx
ENTRYPOINT ["/usr/share/nginx/html/docker-entrypoint.sh"]
