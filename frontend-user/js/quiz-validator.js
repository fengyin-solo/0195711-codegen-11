/**
 * 光学测验题库清单校验器
 *
 * 同一份校验逻辑用于两个环境：
 * - 浏览器端：quiz.js 加载题库时运行（本地开发 / 容器运行一致）
 * - Node 端：tools/validate-quiz.js 在本地开发与容器构建时运行
 *
 * 校验规则：
 * - 清单缺少必填内容（如题目缺 title、知识点缺 observable 等）→ 记录原因并跳过该条
 * - 题目引用了不存在的知识点 / 题型 / 难度 → 记录原因并跳过该条
 * - 清单结构损坏或没有任何有效题目 → 视为致命错误（fatal）
 *
 * 本文件同时支持浏览器（全局 QuizValidator）与 Node.js（module.exports）。
 */
(function (root, factory) {
    const validator = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = validator;
    } else {
        root.QuizValidator = validator;
    }
})(typeof self !== 'undefined' ? self : this, function () {

    // 测验管理器（quiz.js）支持的答案检查项，及对应的失败解析键
    // 注意：需与 quiz.js 中 submitAnswer 的 explanationKey 保持一致
    const CHECK_DEFINITIONS = {
        checkType: { explanationKey: 'wrongType', requiredRequirement: 'lensType' },
        checkLightMode: { explanationKey: 'wrongLightMode', requiredRequirement: 'lightMode' },
        checkMaterial: { explanationKey: 'wrongMaterial', requiredRequirement: 'material' },
        checkRefractiveIndex: { explanationKey: 'wrongRI', requiredRequirement: null },
        checkCurvature: { explanationKey: 'wrongCurvature', requiredRequirement: null },
        checkConvergence: { explanationKey: 'noConvergence', requiredRequirement: null },
        checkDivergence: { explanationKey: 'noDivergence', requiredRequirement: null },
        checkNoDeflection: { explanationKey: 'hasDeflection', requiredRequirement: null },
        checkDispersion: { explanationKey: 'noDispersion', requiredRequirement: null },
        checkLowDispersion: { explanationKey: 'highDispersion', requiredRequirement: null },
        checkSphericalAberration: { explanationKey: 'noAberration', requiredRequirement: null },
        checkNoSphericalAberration: { explanationKey: 'hasAberration', requiredRequirement: null }
    };

    // 与 js/config.js 中 CONFIG 对应的合法取值（Node 端无 CONFIG，故内置）
    const VALID_LENS_TYPES = ['convex', 'concave', 'plano', 'aspheric'];
    const VALID_MATERIALS = ['normal', 'highIndex', 'lowDispersion'];
    const VALID_LIGHT_MODES = ['parallel', 'point'];

    function isNonEmptyString(value) {
        return typeof value === 'string' && value.trim().length > 0;
    }

    function isPlainObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    /**
     * 校验整个题库清单
     * @param {object} manifest 题库清单（data/quiz-manifest.js 导出对象）
     * @returns {{
     *   ok: boolean,                 // 是否可用（无致命错误且至少一道有效题目）
     *   fatal: string[],             // 致命错误说明
     *   knowledgePoints: object,     // 有效知识点（id → 知识点）
     *   questions: object[],         // 有效题目（知识点已解析、附题型/难度中文名）
     *   skipped: Array<{kind:string, id:string, reason:string}>, // 被跳过的条目及原因
     *   stats: object                // 统计信息
     * }}
     */
    function validate(manifest) {
        const report = {
            ok: false,
            fatal: [],
            knowledgePoints: {},
            questions: [],
            skipped: [],
            stats: {
                totalKnowledgePoints: 0,
                validKnowledgePoints: 0,
                totalQuestions: 0,
                validQuestions: 0
            }
        };

        if (!isPlainObject(manifest)) {
            report.fatal.push('题库清单缺失或格式不正确：未找到有效的清单对象（QUIZ_MANIFEST）。');
            return report;
        }

        const questionTypes = validateEnumSection(manifest.questionTypes, 'questionTypes（题型枚举）', report);
        const difficultyLevels = validateEnumSection(manifest.difficultyLevels, 'difficultyLevels（难度枚举）', report);

        if (!Array.isArray(manifest.knowledgePoints)) {
            report.fatal.push('题库清单缺少 knowledgePoints（知识点清单）数组。');
        }
        if (!Array.isArray(manifest.questions)) {
            report.fatal.push('题库清单缺少 questions（题目清单）数组。');
        }
        if (report.fatal.length > 0) {
            return report;
        }

        // 第一遍：校验知识点，建立有效知识点表
        manifest.knowledgePoints.forEach((kp, index) => {
            const errors = validateKnowledgePoint(kp, index, report.knowledgePoints);
            if (errors.length > 0) {
                report.skipped.push({
                    kind: '知识点',
                    id: kp && kp.id ? kp.id : `(第${index + 1}条)`,
                    reason: errors.join('；')
                });
                return;
            }
            report.knowledgePoints[kp.id] = {
                id: kp.id,
                name: kp.name.trim(),
                observable: kp.observable.trim(),
                description: isNonEmptyString(kp.description) ? kp.description.trim() : ''
            };
        });

        // 第二遍：校验题目，解析知识点引用（id 重复时保留先出现的条目）
        const acceptedQuestionIds = {};
        manifest.questions.forEach((question, index) => {
            const errors = validateQuestion(question, index, report.knowledgePoints, questionTypes, difficultyLevels, acceptedQuestionIds);
            if (errors.length > 0) {
                report.skipped.push({
                    kind: '题目',
                    id: question && question.id ? question.id : `(第${index + 1}题)`,
                    reason: errors.join('；')
                });
                return;
            }
            acceptedQuestionIds[question.id] = true;
            report.questions.push(normalizeQuestion(question, report.knowledgePoints, questionTypes, difficultyLevels));
        });

        report.stats.totalKnowledgePoints = manifest.knowledgePoints.length;
        report.stats.validKnowledgePoints = Object.keys(report.knowledgePoints).length;
        report.stats.totalQuestions = manifest.questions.length;
        report.stats.validQuestions = report.questions.length;

        if (report.questions.length === 0) {
            report.fatal.push('题库清单中没有任何有效题目，测验模式无法使用。请根据上面的跳过说明修正清单。');
        }

        report.ok = report.fatal.length === 0;
        return report;
    }

    /**
     * 校验枚举区块（题型 / 难度）
     */
    function validateEnumSection(section, label, report) {
        if (!isPlainObject(section) || Object.keys(section).length === 0) {
            report.fatal.push(`题库清单缺少 ${label}，或该区块为空。`);
            return {};
        }
        const result = {};
        Object.keys(section).forEach(key => {
            const entry = section[key];
            if (isPlainObject(entry) && isNonEmptyString(entry.name)) {
                result[key] = entry.name.trim();
            } else {
                report.fatal.push(`${label} 中的「${key}」缺少 name（中文名称）。`);
            }
        });
        return result;
    }

    /**
     * 校验单个知识点，返回错误说明数组（空数组表示通过）
     */
    function validateKnowledgePoint(kp, index, accepted) {
        const errors = [];
        const label = `知识点${kp && kp.id ? `「${kp.id}」` : `(第${index + 1}条)`}`;

        if (!isPlainObject(kp)) {
            return [`${label}不是有效的对象`];
        }
        if (!isNonEmptyString(kp.id)) {
            errors.push(`${label}缺少必填字段 id`);
        } else if (accepted[kp.id]) {
            errors.push(`${label}的 id 与已有知识点重复`);
        }
        if (!isNonEmptyString(kp.name)) {
            errors.push(`${label}缺少必填字段 name（知识点名称）`);
        }
        if (!isNonEmptyString(kp.observable)) {
            errors.push(`${label}缺少必填字段 observable（该知识点能观察到什么现象）`);
        }
        return errors;
    }

    /**
     * 校验单道题目，返回错误说明数组（空数组表示通过）
     */
    function validateQuestion(question, index, knowledgePoints, questionTypes, difficultyLevels, acceptedIds) {
        const errors = [];

        if (!isPlainObject(question)) {
            return [`题目(第${index + 1}题)不是有效的对象`];
        }

        const label = `题目「${isNonEmptyString(question.id) ? question.id : `(第${index + 1}题)`}」`;

        // 基本信息
        if (!isNonEmptyString(question.id)) {
            errors.push(`${label}缺少必填字段 id`);
        } else if (acceptedIds[question.id]) {
            errors.push(`${label}的 id 与其他题目重复`);
        }
        if (!isNonEmptyString(question.title)) {
            errors.push(`${label}缺少必填字段 title（题目标题）`);
        }
        if (!isNonEmptyString(question.description)) {
            errors.push(`${label}缺少必填字段 description（题目描述）`);
        }

        // 题型与难度
        if (!isNonEmptyString(question.type)) {
            errors.push(`${label}缺少必填字段 type（题型）`);
        } else if (!questionTypes[question.type]) {
            errors.push(`${label}的题型 type「${question.type}」不存在，可选值：${Object.keys(questionTypes).join(' / ')}`);
        }
        if (!isNonEmptyString(question.difficulty)) {
            errors.push(`${label}缺少必填字段 difficulty（难度）`);
        } else if (!difficultyLevels[question.difficulty]) {
            errors.push(`${label}的难度 difficulty「${question.difficulty}」不存在，可选值：${Object.keys(difficultyLevels).join(' / ')}`);
        }

        // 考查内容（知识点引用）
        if (!Array.isArray(question.knowledgePoints) || question.knowledgePoints.length === 0) {
            errors.push(`${label}缺少必填字段 knowledgePoints（考查内容，至少引用一个知识点）`);
        } else {
            question.knowledgePoints.forEach(kpId => {
                if (!knowledgePoints[kpId]) {
                    errors.push(`${label}引用了不存在的知识点「${kpId}」`);
                }
            });
        }

        // 达标条件与检查项
        if (!isPlainObject(question.requirements)) {
            errors.push(`${label}缺少必填字段 requirements（达标条件）`);
        }
        if (!isPlainObject(question.validation)) {
            errors.push(`${label}缺少必填字段 validation（答案检查项）`);
        } else {
            const enabledChecks = Object.keys(question.validation).filter(key => question.validation[key] === true);
            if (enabledChecks.length === 0) {
                errors.push(`${label}的 validation 未启用任何检查项`);
            }
            enabledChecks.forEach(checkKey => {
                const definition = CHECK_DEFINITIONS[checkKey];
                if (!definition) {
                    errors.push(`${label}启用了未知的检查项「${checkKey}」，可选值：${Object.keys(CHECK_DEFINITIONS).join(' / ')}`);
                    return;
                }
                if (definition.requiredRequirement && isPlainObject(question.requirements)) {
                    if (question.requirements[definition.requiredRequirement] === undefined) {
                        errors.push(`${label}启用了 ${checkKey}，但 requirements 中缺少「${definition.requiredRequirement}」`);
                    }
                }
            });

            // 检查项引用的取值合法性
            if (isPlainObject(question.requirements)) {
                const req = question.requirements;
                if (question.validation.checkType === true && req.lensType !== undefined && !VALID_LENS_TYPES.includes(req.lensType)) {
                    errors.push(`${label}的 lensType「${req.lensType}」不存在，可选值：${VALID_LENS_TYPES.join(' / ')}`);
                }
                if (question.validation.checkMaterial === true && req.material !== undefined && !VALID_MATERIALS.includes(req.material)) {
                    errors.push(`${label}的 material「${req.material}」不存在，可选值：${VALID_MATERIALS.join(' / ')}`);
                }
                if (question.validation.checkLightMode === true && req.lightMode !== undefined && !VALID_LIGHT_MODES.includes(req.lightMode)) {
                    errors.push(`${label}的 lightMode「${req.lightMode}」不存在，可选值：${VALID_LIGHT_MODES.join(' / ')}`);
                }
                errors.push(...validateRange(req, 'RefractiveIndex', '折射率', label));
                errors.push(...validateRange(req, 'Curvature', '曲率', label));
                errors.push(...validateRange(req, 'FocalLength', '焦距', label));
            }
        }

        // 答题后的解析：必须有 correct，且每个启用的检查项要有对应失败解析
        if (!isPlainObject(question.explanation)) {
            errors.push(`${label}缺少必填字段 explanation（答题后的解析）`);
        } else {
            if (!isNonEmptyString(question.explanation.correct)) {
                errors.push(`${label}的 explanation 缺少 correct（答对时的解析）`);
            }
            if (isPlainObject(question.validation)) {
                Object.keys(question.validation)
                    .filter(key => question.validation[key] === true && CHECK_DEFINITIONS[key])
                    .forEach(checkKey => {
                        const explanationKey = CHECK_DEFINITIONS[checkKey].explanationKey;
                        if (!isNonEmptyString(question.explanation[explanationKey])) {
                            errors.push(`${label}启用了 ${checkKey}，但 explanation 缺少对应的失败解析「${explanationKey}」`);
                        }
                    });
            }
        }

        // 答题提示
        if (!Array.isArray(question.hints) || question.hints.length === 0 || !question.hints.every(isNonEmptyString)) {
            errors.push(`${label}缺少必填字段 hints（答题提示，至少一条非空文本）`);
        }

        return errors;
    }

    /**
     * 校验数值范围字段（min/max 成对出现时必须合法）
     */
    function validateRange(requirements, suffix, label, questionLabel) {
        const errors = [];
        const min = requirements[`min${suffix}`];
        const max = requirements[`max${suffix}`];
        if (min !== undefined && typeof min !== 'number') {
            errors.push(`${questionLabel}的 min${suffix} 必须是数字`);
        }
        if (max !== undefined && typeof max !== 'number') {
            errors.push(`${questionLabel}的 max${suffix} 必须是数字`);
        }
        if (typeof min === 'number' && typeof max === 'number' && min > max) {
            errors.push(`${questionLabel}的${label}范围不合法：min${suffix}(${min}) 大于 max${suffix}(${max})`);
        }
        return errors;
    }

    /**
     * 规范化题目：解析知识点引用，附加题型/难度中文名
     */
    function normalizeQuestion(question, knowledgePoints, questionTypes, difficultyLevels) {
        return Object.assign({}, question, {
            typeLabel: questionTypes[question.type],
            difficultyLabel: difficultyLevels[question.difficulty],
            knowledgePoints: question.knowledgePoints.map(kpId => knowledgePoints[kpId])
        });
    }

    return {
        CHECK_DEFINITIONS: CHECK_DEFINITIONS,
        VALID_LENS_TYPES: VALID_LENS_TYPES,
        VALID_MATERIALS: VALID_MATERIALS,
        VALID_LIGHT_MODES: VALID_LIGHT_MODES,
        validate: validate
    };
});
