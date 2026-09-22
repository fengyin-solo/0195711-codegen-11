#!/usr/bin/env node
/**
 * 题库清单校验（Node 入口）
 *
 * 与浏览器端共用 js/quiz-validator.js，保证本地开发与容器启动（构建）时
 * 使用同一套校验规则。
 *
 * 用法：
 *   node tools/validate-quiz.js
 *
 * 退出码：
 *   0 - 校验通过（无效条目已给出说明并跳过，不影响其余题目）
 *   1 - 致命错误（清单缺失/损坏，或没有任何有效题目）
 */
const path = require('path');

const manifest = require(path.join(__dirname, '..', 'data', 'quiz-manifest.js'));
const QuizValidator = require(path.join(__dirname, '..', 'js', 'quiz-validator.js'));

const report = QuizValidator.validate(manifest);

console.log('光学测验题库清单校验');
console.log('====================');
console.log(`清单版本：${manifest && manifest.version ? manifest.version : '未知'}`);
console.log(`知识点：${report.stats.validKnowledgePoints} 个有效 / 共 ${report.stats.totalKnowledgePoints} 个`);
console.log(`题目：${report.stats.validQuestions} 道有效 / 共 ${report.stats.totalQuestions} 道`);

if (report.skipped.length > 0) {
    console.log('');
    console.log(`⚠ 跳过 ${report.skipped.length} 条无效条目：`);
    report.skipped.forEach(item => {
        console.log(`  - [${item.kind}] ${item.id}：${item.reason}`);
    });
}

if (report.fatal.length > 0) {
    console.log('');
    console.error('✘ 致命错误：');
    report.fatal.forEach(message => console.error(`  - ${message}`));
    process.exit(1);
}

console.log('');
console.log('✔ 校验通过');
