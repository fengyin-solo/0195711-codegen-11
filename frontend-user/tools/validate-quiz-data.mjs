#!/usr/bin/env node
/**
 * 测验清单校验脚本（本地开发 / Docker 构建共用）
 *
 * 用法：
 *   node tools/validate-quiz-data.mjs [清单路径]
 *   npm run validate-quiz
 *
 * 退出码：
 *   0  清单可用（可能存在被跳过的题目，会在输出中逐条说明）
 *   1  清单存在阻断性错误（JSON 无法解析、结构缺失、没有任何可用题目等）
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const QuizData = require('../js/quiz-data.js');

const manifestPath = resolve(
    process.argv[2] || resolve(__dirname, '../data/quiz-manifest.json')
);

let raw;
try {
    raw = readFileSync(manifestPath, 'utf8');
} catch (err) {
    console.error(`[quiz-validate] ✗ 无法读取清单文件：${manifestPath}\n  ${err.message}`);
    process.exit(1);
}

let manifest;
try {
    manifest = JSON.parse(raw);
} catch (err) {
    console.error(`[quiz-validate] ✗ 清单不是合法的 JSON：${manifestPath}\n  ${err.message}`);
    process.exit(1);
}

const result = QuizData.validateManifest(manifest);

console.log(`[quiz-validate] 校验文件：${manifestPath}`);

result.errors.forEach((msg) => console.error(`[quiz-validate] ✗ ${msg}`));
result.warnings.forEach((msg) => console.warn(`[quiz-validate] ! ${msg}`));

const kpCount = Object.keys(result.knowledgePoints).length;
console.log(`[quiz-validate] 知识点：${kpCount} 条；题目：${result.questions.length} 道可用` +
    (result.skippedQuestions.length ? `，${result.skippedQuestions.length} 道被跳过` : ''));

if (!result.valid) {
    console.error('[quiz-validate] ✗ 校验未通过，请修复上述问题后重试。');
    process.exit(1);
}

if (result.skippedQuestions.length > 0) {
    console.warn('[quiz-validate] ! 存在被跳过的题目，应用只会加载通过校验的题目。');
} else {
    console.log('[quiz-validate] ✓ 校验通过，所有题目均可使用。');
}
