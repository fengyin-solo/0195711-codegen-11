/**
 * 测验清单（题库 + 知识点）加载与校验
 *
 * 同一份校验逻辑同时运行于：
 * - 浏览器（QuizManager 加载 data/quiz-manifest.json 时）
 * - Node.js（tools/validate-quiz-data.mjs，本地开发与 Docker 构建时执行）
 *
 * 校验规则：
 * - 清单缺少必填内容（题型、难度、考查内容、题干、提示、校验项等）→ 记录原因并跳过该条
 * - 题目引用了不存在的知识点 → 记录原因并跳过该条
 * - 知识点缺少「能观察到什么现象」(phenomenon) → 该知识点不可用，引用它的题目一并跳过
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.QuizData = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // 校验项类型 → 该类校验所依据的参数（题目 requirements / check 内联）
    const CHECK_TYPES = {
        lensType: {
            needsExpected: true,
            // 判定用户答案时使用的透镜类型取值
            validExpected: ['convex', 'concave', 'plano', 'aspheric']
        },
        material: {
            needsExpected: true,
            validExpected: ['normal', 'highIndex', 'lowDispersion']
        },
        lightMode: {
            needsExpected: true,
            validExpected: ['parallel', 'point']
        },
        refractiveIndex: { numericRange: true },
        curvature: { numericRange: true },
        convergence: {},
        divergence: {},
        noDeflection: {},
        dispersion: {},
        lowDispersion: {},
        sphericalAberration: {},
        noSphericalAberration: {}
    };

    const LENS_TYPE_NAMES = {
        convex: '凸透镜',
        concave: '凹透镜',
        plano: '平面透镜',
        aspheric: '非球面透镜'
    };

    const MATERIAL_NAMES = {
        normal: '普通玻璃',
        highIndex: '高折射率镜片',
        lowDispersion: '低色散镜片'
    };

    function isNonEmptyString(value) {
        return typeof value === 'string' && value.trim().length > 0;
    }

    /**
     * 校验整份清单
     * @param {Object} manifest 解析后的清单对象
     * @returns {{valid: boolean, questions: Array, knowledgePoints: Object,
     *            questionTypeLabels: Object, difficultyLabels: Object,
     *            skippedQuestions: Array<{id:string,title:string,reasons:string[]}>,
     *            errors: string[], warnings: string[]}}
     */
    function validateManifest(manifest) {
        const errors = [];
        const warnings = [];
        const skippedQuestions = [];
        const knowledgePoints = {};

        if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) {
            errors.push('清单必须是一个 JSON 对象');
            return failure(errors, warnings, skippedQuestions, knowledgePoints);
        }

        const questionTypeLabels = manifest.questionTypes && typeof manifest.questionTypes === 'object'
            ? manifest.questionTypes
            : {};
        const difficultyLabels = manifest.difficultyLevels && typeof manifest.difficultyLevels === 'object'
            ? manifest.difficultyLevels
            : {};

        if (Object.keys(questionTypeLabels).length === 0) {
            warnings.push('清单缺少 questionTypes 题型标签映射，界面将直接显示题型编码');
        }
        if (Object.keys(difficultyLabels).length === 0) {
            warnings.push('清单缺少 difficultyLevels 难度标签映射，界面将直接显示难度编码');
        }

        // ---------- 校验知识点 ----------
        const kpList = manifest.knowledgePoints;
        if (!Array.isArray(kpList)) {
            errors.push('清单缺少 knowledgePoints（知识点）数组');
        } else {
            kpList.forEach(function (kp, index) {
                const where = 'knowledgePoints[' + index + ']';
                if (kp === null || typeof kp !== 'object' || Array.isArray(kp)) {
                    errors.push(where + ' 不是有效的知识点对象，已跳过');
                    return;
                }
                const reasons = [];
                if (!isNonEmptyString(kp.id)) reasons.push('缺少 id');
                if (!isNonEmptyString(kp.name)) reasons.push('缺少 name（知识点名称）');
                if (!isNonEmptyString(kp.description)) reasons.push('缺少 description（知识点讲解）');
                // 必填：这道题/这个知识点能观察到什么现象
                if (!isNonEmptyString(kp.phenomenon)) reasons.push('缺少 phenomenon（能观察到什么现象）');

                if (reasons.length > 0) {
                    errors.push(where + (kp.id ? '（id: ' + kp.id + '）' : '') + '：' + reasons.join('；') + '，该知识点已跳过');
                    return;
                }
                if (knowledgePoints[kp.id]) {
                    errors.push(where + '：知识点 id 重复（' + kp.id + '），后出现的一条已跳过');
                    return;
                }
                knowledgePoints[kp.id] = kp;
            });
        }

        // ---------- 校验题目 ----------
        const validQuestions = [];
        const seenIds = new Set();
        const qList = manifest.questions;
        if (!Array.isArray(qList)) {
            errors.push('清单缺少 questions（题目）数组');
        } else {
            qList.forEach(function (question, index) {
                const where = 'questions[' + index + ']';
                const label = question && isNonEmptyString(question.id) ? question.id : '#' + index;
                const reasons = [];

                if (question === null || typeof question !== 'object' || Array.isArray(question)) {
                    errors.push(where + ' 不是有效的题目对象，已跳过');
                    skippedQuestions.push({ id: label, title: '', reasons: ['题目不是有效对象'] });
                    return;
                }

                if (!isNonEmptyString(question.id)) reasons.push('缺少 id');
                else if (seenIds.has(question.id)) reasons.push('id 重复（' + question.id + '）');

                if (!isNonEmptyString(question.title)) reasons.push('缺少 title（题目标题）');
                if (!isNonEmptyString(question.description)) reasons.push('缺少 description（题目描述）');
                if (!isNonEmptyString(question.content)) reasons.push('缺少 content（考查内容）');
                if (!isNonEmptyString(question.hint)) reasons.push('缺少 hint（答题提示）');

                if (!isNonEmptyString(question.questionType)) {
                    reasons.push('缺少 questionType（题型）');
                } else if (Object.keys(questionTypeLabels).length > 0 &&
                    !Object.prototype.hasOwnProperty.call(questionTypeLabels, question.questionType)) {
                    reasons.push('题型 "' + question.questionType + '" 未在 questionTypes 中定义');
                }

                if (!isNonEmptyString(question.difficulty)) {
                    reasons.push('缺少 difficulty（难度）');
                } else if (Object.keys(difficultyLabels).length > 0 &&
                    !Object.prototype.hasOwnProperty.call(difficultyLabels, question.difficulty)) {
                    reasons.push('难度 "' + question.difficulty + '" 未在 difficultyLevels 中定义');
                }

                if (!question.feedback || typeof question.feedback !== 'object') {
                    reasons.push('缺少 feedback（答题后的说明文案）');
                } else if (!isNonEmptyString(question.feedback.correct)) {
                    reasons.push('feedback 缺少 correct（答对后的提示）');
                }

                const requirements = question.requirements && typeof question.requirements === 'object'
                    ? question.requirements
                    : {};

                if (!Array.isArray(question.checks) || question.checks.length === 0) {
                    reasons.push('缺少 checks（答案校验项），至少需要一项');
                } else {
                    question.checks.forEach(function (check, ci) {
                        const cwhere = 'checks[' + ci + ']';
                        if (check === null || typeof check !== 'object' || Array.isArray(check)) {
                            reasons.push(cwhere + ' 不是有效对象');
                            return;
                        }
                        const checkDef = CHECK_TYPES[check.type];
                        if (!checkDef) {
                            reasons.push(cwhere + ' 的校验类型 "' + check.type + '" 不受支持');
                            return;
                        }
                        if (!isNonEmptyString(check.knowledgePoint)) {
                            reasons.push(cwhere + '（' + check.type + '）缺少 knowledgePoint（引用的知识点）');
                        } else if (!knowledgePoints[check.knowledgePoint]) {
                            reasons.push(cwhere + '（' + check.type + '）引用了不存在的知识点 "' +
                                check.knowledgePoint + '"');
                        }
                        if (checkDef.needsExpected) {
                            if (!isNonEmptyString(check.expected)) {
                                reasons.push(cwhere + '（' + check.type + '）缺少 expected（期望值）');
                            } else if (checkDef.validExpected.indexOf(check.expected) === -1) {
                                reasons.push(cwhere + '（' + check.type + '）期望值 "' +
                                    check.expected + '" 无效，允许值：' + checkDef.validExpected.join('、'));
                            }
                        }
                        if (checkDef.numericRange) {
                            if (check.min === undefined && check.max === undefined) {
                                reasons.push(cwhere + '（' + check.type + '）至少需要给出 min 或 max 中的一个');
                            }
                            const min = check.min;
                            const max = check.max;
                            if (min !== undefined && (typeof min !== 'number' || isNaN(min))) {
                                reasons.push(cwhere + '（' + check.type + '）min 必须是数字');
                            }
                            if (max !== undefined && (typeof max !== 'number' || isNaN(max))) {
                                reasons.push(cwhere + '（' + check.type + '）max 必须是数字');
                            }
                            if (min !== undefined && max !== undefined && min > max) {
                                reasons.push(cwhere + '（' + check.type + '）min 不能大于 max');
                            }
                        }
                        // 现象观察类与数值范围类校验必须内联 fail 提示；
                        // 枚举类校验（透镜类型/材料/光源模式）的失败文案取自题目级 feedback（按校验类型索引）
                        if (!checkDef.needsExpected) {
                            if (!check.feedback || typeof check.feedback !== 'object' ||
                                !isNonEmptyString(check.feedback.fail)) {
                                reasons.push(cwhere + '（' + check.type + '）缺少 feedback.fail（不符合要求时的提示）');
                            }
                        } else {
                            if (check.feedback && (!isNonEmptyString(check.feedback.fail))) {
                                reasons.push(cwhere + '（' + check.type + '）的 feedback.fail 不能为空字符串');
                            }
                            if (!question.feedback || !isNonEmptyString(question.feedback[check.type])) {
                                reasons.push(cwhere + '（' + check.type + '）需要在题目级 feedback.' +
                                    check.type + ' 中给出选错时的提示');
                            }
                        }
                    });
                }

                if (reasons.length > 0) {
                    errors.push(where + '（' + label + '）：' + reasons.join('；') + '，该题已跳过');
                    skippedQuestions.push({
                        id: question.id || '',
                        title: question.title || '',
                        reasons: reasons
                    });
                    return;
                }

                seenIds.add(question.id);
                validQuestions.push(normalizeQuestion(question));
            });
        }

        if (validQuestions.length === 0) {
            errors.push('清单中没有任何可用题目');
        }
        if (skippedQuestions.length > 0) {
            warnings.push('共跳过 ' + skippedQuestions.length + ' 道题目（详见上方说明）');
        }

        // 阻断性错误：无法解析出任何可用题目（结构缺失、题目全部被跳过等）。
        // 仅有个别条目不合格时属于「给出说明并跳过该条」，不阻断其余题目使用。
        const blocking = validQuestions.length === 0;

        return {
            valid: !blocking,
            questions: validQuestions,
            knowledgePoints: knowledgePoints,
            questionTypeLabels: questionTypeLabels,
            difficultyLabels: difficultyLabels,
            skippedQuestions: skippedQuestions,
            errors: errors,
            warnings: warnings
        };
    }

    function failure(errors, warnings, skippedQuestions, knowledgePoints) {
        return {
            valid: false,
            questions: [],
            knowledgePoints: knowledgePoints,
            questionTypeLabels: {},
            difficultyLabels: {},
            skippedQuestions: skippedQuestions,
            errors: errors,
            warnings: warnings
        };
    }

    /**
     * 规范化一道通过校验的题目，补充运行期使用的 requirements 聚合字段，
     * 使 QuizManager 无需再区分旧结构。
     */
    function normalizeQuestion(question) {
        const requirements = {};
        question.checks.forEach(function (check) {
            switch (check.type) {
                case 'lensType':
                    requirements.lensType = check.expected;
                    break;
                case 'material':
                    requirements.material = check.expected;
                    break;
                case 'lightMode':
                    requirements.lightMode = check.expected;
                    break;
                case 'refractiveIndex':
                    if (check.min !== undefined) requirements.minRefractiveIndex = check.min;
                    if (check.max !== undefined) requirements.maxRefractiveIndex = check.max;
                    break;
                case 'curvature':
                    if (check.min !== undefined) requirements.minCurvature = check.min;
                    if (check.max !== undefined) requirements.maxCurvature = check.max;
                    break;
                default:
                    break;
            }
        });
        // 现象观察类校验额外使用的参数
        ['minFocalLength', 'maxFocalLength'].forEach(function (key) {
            if (question.requirements && question.requirements[key] !== undefined) {
                requirements[key] = question.requirements[key];
            }
        });
        return Object.assign({}, question, { requirements: requirements });
    }

    return {
        CHECK_TYPES: CHECK_TYPES,
        LENS_TYPE_NAMES: LENS_TYPE_NAMES,
        MATERIAL_NAMES: MATERIAL_NAMES,
        validateManifest: validateManifest
    };
});
