#!/bin/sh
# 容器启动时执行与本地开发（npm run validate-quiz）完全相同的测验清单校验。
# 校验规则来自同一份文件：js/quiz-data.js
# 清单缺少必填内容、或引用了不存在的知识点时，会输出说明并跳过该条；
# 若整份清单不可用（无任何可用题目/结构错误），容器启动失败。
set -e

export LD_LIBRARY_PATH="/opt/node-libs:${LD_LIBRARY_PATH}"

cd /usr/share/nginx/html
/opt/bin/node tools/validate-quiz-data.mjs data/quiz-manifest.json

exec nginx -g 'daemon off;'
