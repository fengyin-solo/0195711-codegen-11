/**
 * 光学测验管理器
 *
 * 功能：
 * - 从可维护的测验清单（data/quiz-manifest.json）加载题目与知识点
 * - 随机选择测验题目
 * - 依据清单中的 checks 逐项验证用户答案（透镜类型、参数、光线模式、观察到的现象等）
 * - 评分并给出详细解释
 * - 提供提示功能
 * - 记录答题历史
 *
 * 调整题目只需编辑清单文件，不需要修改本文件或页面代码。
 * 清单的校验规则见 js/quiz-data.js，本地开发与容器构建使用同一份校验。
 */
class QuizManager {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.renderer = canvasManager.getRenderer();
        this.currentQuestion = null;
        this.questionHistory = [];
        this.score = 0;
        this.totalQuestions = 0;
        this.hintUsed = false;
        this.isQuizMode = false;
        this.answeredQuestions = new Set();

        // 清单加载结果
        this.questions = [];
        this.knowledgePoints = {};
        this.questionTypeLabels = {};
        this.difficultyLabels = {};
        this.questionsLoaded = false;
        this.skippedQuestions = [];
        this.dataErrors = [];
        this.dataWarnings = [];
    }

    /**
     * 加载并校验测验清单
     * 清单中缺少必填内容或引用了不存在知识点的题目会被记录原因并跳过
     * @returns {Promise<boolean>} 是否成功加载到至少一道可用题目
     */
    async loadQuestions() {
        if (this.questionsLoaded) {
            return this.questions.length > 0;
        }

        let manifest;
        try {
            const response = await fetch('data/quiz-manifest.json', { cache: 'no-cache' });
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            manifest = await response.json();
        } catch (err) {
            console.error('[测验] 测验清单加载失败：' + err.message);
            this.dataErrors.push('测验清单加载失败：' + err.message);
            this.questionsLoaded = true;
            return false;
        }

        const result = QuizData.validateManifest(manifest);

        result.errors.forEach(msg => console.error('[测验] ' + msg));
        result.warnings.forEach(msg => console.warn('[测验] ' + msg));

        this.questions = result.questions;
        this.knowledgePoints = result.knowledgePoints;
        this.questionTypeLabels = result.questionTypeLabels;
        this.difficultyLabels = result.difficultyLabels;
        this.skippedQuestions = result.skippedQuestions;
        this.dataErrors = result.errors;
        this.dataWarnings = result.warnings;
        this.questionsLoaded = true;

        return this.questions.length > 0;
    }

    /**
     * 开启测验模式
     */
    async startQuizMode() {
        const ready = await this.loadQuestions();
        if (!ready) {
            window.dispatchEvent(new CustomEvent('quizDataUnavailable', {
                detail: {
                    errors: this.dataErrors,
                    skipped: this.skippedQuestions
                }
            }));
            return false;
        }

        this.isQuizMode = true;
        this.score = 0;
        this.totalQuestions = 0;
        this.answeredQuestions.clear();
        this.nextQuestion();
        return true;
    }

    /**
     * 关闭测验模式
     */
    stopQuizMode() {
        this.isQuizMode = false;
        this.currentQuestion = null;
        this.hintUsed = false;
        window.dispatchEvent(new CustomEvent('quizStopped'));
    }

    /**
     * 获取下一道随机题目（题目来自校验通过的清单）
     */
    nextQuestion() {
        const questions = this.questions;
        let availableQuestions = questions.filter(q => !this.answeredQuestions.has(q.id));

        if (availableQuestions.length === 0) {
            this.answeredQuestions.clear();
            availableQuestions = questions;
        }

        const randomIndex = Math.floor(Math.random() * availableQuestions.length);
        this.currentQuestion = availableQuestions[randomIndex];
        this.hintUsed = false;

        this.answeredQuestions.add(this.currentQuestion.id);

        window.dispatchEvent(new CustomEvent('questionChanged', {
            detail: this.currentQuestion
        }));

        return this.currentQuestion;
    }

    /**
     * 获取提示（清单中每道题的 hint 字段）
     */
    getHint() {
        if (!this.currentQuestion) return null;
        this.hintUsed = true;
        return this.currentQuestion.hint;
    }

    /**
     * 验证用户答案
     * 逐项执行清单中配置的 checks，每一项都关联一个知识点，
     * 返回结果中写明该知识点「能观察到什么现象」。
     */
    submitAnswer() {
        if (!this.currentQuestion) {
            return {
                isCorrect: false,
                score: 0,
                explanation: '请先选择一道题目',
                details: []
            };
        }

        const question = this.currentQuestion;
        const lenses = this.canvasManager.lenses;
        const lightMode = this.renderer.lightMode;

        if (lenses.length === 0) {
            return {
                isCorrect: false,
                score: 0,
                explanation: '请先在画布上添加一个透镜，然后再提交答案。',
                details: []
            };
        }

        const lens = lenses[0];
        const results = [];
        let failedCheckType = null;

        for (const check of question.checks) {
            const outcome = this.runCheck(check, lens, lightMode);
            results.push(outcome.detail);
            if (!outcome.detail.correct && failedCheckType === null) {
                failedCheckType = check.type;
            }
        }

        const isCorrect = failedCheckType === null;

        let earnedScore = 0;
        if (isCorrect) {
            earnedScore = this.hintUsed ? 5 : 10;
            this.score += earnedScore;
        }
        this.totalQuestions++;

        // 答题后的提示：优先取失败校验项对应的说明，其次题目级反馈，最后答对文案
        let explanation = question.feedback.correct;
        if (!isCorrect) {
            const failedCheck = question.checks.find(c => c.type === failedCheckType);
            explanation =
                (failedCheck && failedCheck.feedback && failedCheck.feedback.fail) ||
                question.feedback[failedCheckType] ||
                question.feedback.correct;
        }

        this.questionHistory.push({
            questionId: question.id,
            title: question.title,
            isCorrect: isCorrect,
            score: earnedScore,
            hintUsed: this.hintUsed,
            timestamp: Date.now()
        });

        return {
            isCorrect: isCorrect,
            score: earnedScore,
            totalScore: this.score,
            totalQuestions: this.totalQuestions,
            explanation: explanation,
            details: results,
            hintUsed: this.hintUsed
        };
    }

    /**
     * 执行单个校验项
     * @returns {{detail: Object}} detail 中带 phenomenon（能观察到的现象）
     */
    runCheck(check, lens, lightMode) {
        const knowledgePoint = this.knowledgePoints[check.knowledgePoint] || {};
        const phenomenon = knowledgePoint.phenomenon || '';
        const baseDetail = {
            name: knowledgePoint.name || check.type,
            expected: phenomenon,
            actual: '',
            correct: false,
            phenomenon: phenomenon
        };

        let actual = '';
        let correct = false;

        switch (check.type) {
            case 'lensType': {
                correct = lens.type === check.expected;
                actual = lens.getTypeName();
                if (!correct) actual += '（期望：' + this.getLensTypeName(check.expected) + '）';
                break;
            }
            case 'lightMode': {
                correct = lightMode === check.expected;
                const toName = mode => mode === 'parallel' ? '平行光' : '点光源';
                actual = toName(lightMode);
                if (!correct) actual += '（期望：' + toName(check.expected) + '）';
                break;
            }
            case 'material': {
                correct = lens.material === check.expected;
                actual = lens.getMaterialName();
                if (!correct) actual += '（期望：' + this.getMaterialName(check.expected) + '）';
                break;
            }
            case 'refractiveIndex': {
                const ri = lens.refractiveIndex;
                const minRI = check.min !== undefined ? check.min : -Infinity;
                const maxRI = check.max !== undefined ? check.max : Infinity;
                correct = ri >= minRI && ri <= maxRI;
                let rangeText;
                if (check.min !== undefined && check.max !== undefined) {
                    rangeText = '应在 ' + check.min + ' - ' + check.max + ' 范围内';
                } else if (check.min !== undefined) {
                    rangeText = '应不小于 ' + check.min;
                } else {
                    rangeText = '应不大于 ' + check.max;
                }
                actual = '折射率 ' + ri.toFixed(2) + (correct ? '' : '（' + rangeText + '）');
                break;
            }
            case 'curvature': {
                const curvature = lens.curvature;
                const minCurv = check.min !== undefined ? check.min : -Infinity;
                const maxCurv = check.max !== undefined ? check.max : Infinity;
                correct = curvature >= minCurv && curvature <= maxCurv;
                let curvRangeText;
                if (check.min !== undefined && check.max !== undefined) {
                    curvRangeText = '应在 ' + check.min + '% - ' + check.max + '% 范围内';
                } else if (check.min !== undefined) {
                    curvRangeText = '应不小于 ' + check.min + '%';
                } else {
                    curvRangeText = '应不大于 ' + check.max + '%';
                }
                actual = '曲率 ' + curvature + '%' + (correct ? '' : '（' + curvRangeText + '）');
                break;
            }
            case 'convergence': {
                const r = this.checkConvergence(lens);
                correct = r.converging;
                actual = r.message;
                break;
            }
            case 'divergence': {
                const r = this.checkDivergence(lens);
                correct = r.diverging;
                actual = r.message;
                break;
            }
            case 'noDeflection': {
                const r = this.checkNoDeflection(lens);
                correct = r.noDeflection;
                actual = r.message;
                break;
            }
            case 'dispersion': {
                const r = this.checkDispersion(lens);
                correct = r.hasDispersion;
                actual = r.message;
                break;
            }
            case 'lowDispersion': {
                const r = this.checkLowDispersion(lens);
                correct = r.lowDispersion;
                actual = r.message;
                break;
            }
            case 'sphericalAberration': {
                const r = this.checkSphericalAberration(lens);
                correct = r.hasAberration;
                actual = r.message;
                break;
            }
            case 'noSphericalAberration': {
                const r = this.checkNoSphericalAberration(lens);
                correct = r.noAberration;
                actual = r.message;
                break;
            }
            default:
                actual = '未知校验项：' + check.type;
        }

        return {
            detail: Object.assign(baseDetail, { actual: actual, correct: correct })
        };
    }

    /**
     * 检查光线会聚情况
     */
    checkConvergence(lens) {
        if (lens.type !== CONFIG.LENS_TYPES.CONVEX) {
            return { converging: false, message: '当前不是凸透镜，无法会聚光线' };
        }

        const focalLength = lens.getFocalLength();
        const minFocal = this.currentQuestion.requirements.minFocalLength || 50;
        const maxFocal = this.currentQuestion.requirements.maxFocalLength || 500;

        if (focalLength < minFocal || focalLength > maxFocal) {
            return {
                converging: false,
                message: `焦距 ${Math.round(focalLength)}px 不在合适范围内 (${minFocal}-${maxFocal}px)`
            };
        }

        const strength = (lens.refractiveIndex - 1) * (lens.curvature / 100);
        if (strength < 0.15) {
            return { converging: false, message: '会聚能力太弱，请增大折射率或曲率' };
        }

        return { converging: true, message: `光线会聚良好，焦距约 ${Math.round(focalLength)}px` };
    }

    /**
     * 检查光线发散情况
     */
    checkDivergence(lens) {
        if (lens.type !== CONFIG.LENS_TYPES.CONCAVE) {
            return { diverging: false, message: '当前不是凹透镜，光线没有向外发散' };
        }

        const strength = (lens.refractiveIndex - 1) * (lens.curvature / 100);
        if (strength < 0.1) {
            return { diverging: false, message: '发散能力太弱，请增大折射率或曲率' };
        }

        return { diverging: true, message: '光线发散效果明显' };
    }

    /**
     * 检查光线是否无偏折
     */
    checkNoDeflection(lens) {
        if (lens.type !== CONFIG.LENS_TYPES.PLANO) {
            return { noDeflection: false, message: '当前不是平面透镜，光线发生了偏折' };
        }

        if (Math.abs(this.renderer.incidentAngle) > 5) {
            return { noDeflection: false, message: '请让光线垂直入射（入射角为0）' };
        }

        return { noDeflection: true, message: '光线沿直线传播，方向不变' };
    }

    /**
     * 检查色散效果
     */
    checkDispersion(lens) {
        if (lens.dispersion < 0.2) {
            return { hasDispersion: false, message: '材料色散太小，请使用普通玻璃' };
        }

        if (Math.abs(this.renderer.incidentAngle) < 5) {
            return { hasDispersion: false, message: '请增大入射角，让光线斜入射' };
        }

        const strength = (lens.refractiveIndex - 1) * (lens.curvature / 100);
        if (strength < 0.2) {
            return { hasDispersion: false, message: '偏折太弱，色散不明显' };
        }

        return { hasDispersion: true, message: '色散现象明显，不同颜色光分离' };
    }

    /**
     * 检查低色散效果
     */
    checkLowDispersion(lens) {
        if (lens.dispersion > 0.15) {
            return { lowDispersion: false, message: '材料色散较大，请使用低色散镜片' };
        }

        return { lowDispersion: true, message: '色散很小，不同颜色光几乎重合' };
    }

    /**
     * 检查球差现象
     */
    checkSphericalAberration(lens) {
        if (lens.type !== CONFIG.LENS_TYPES.CONVEX) {
            return { hasAberration: false, message: '当前不是球面凸透镜' };
        }

        if (lens.curvature < 50) {
            return { hasAberration: false, message: '曲率太小，球差不明显' };
        }

        return { hasAberration: true, message: '球差明显，边缘光线会聚点与中心不同' };
    }

    /**
     * 检查无球差效果
     */
    checkNoSphericalAberration(lens) {
        if (lens.type !== CONFIG.LENS_TYPES.ASPHERIC) {
            return { noAberration: false, message: '当前不是非球面透镜，仍存在球差' };
        }

        return { noAberration: true, message: '球差被消除，所有光线会聚到同一点' };
    }

    /**
     * 获取透镜类型中文名称
     */
    getLensTypeName(type) {
        return QuizData.LENS_TYPE_NAMES[type] || type;
    }

    /**
     * 获取材料中文名称
     */
    getMaterialName(material) {
        return QuizData.MATERIAL_NAMES[material] || material;
    }

    /**
     * 获取题型显示名称
     */
    getQuestionTypeLabel(type) {
        return this.questionTypeLabels[type] || type;
    }

    /**
     * 获取难度显示名称
     */
    getDifficultyLabel(level) {
        return this.difficultyLabels[level] || level;
    }

    /**
     * 获取当前得分
     */
    getScore() {
        return {
            score: this.score,
            totalQuestions: this.totalQuestions,
            accuracy: this.totalQuestions > 0
                ? Math.round((this.questionHistory.filter(q => q.isCorrect).length / this.totalQuestions) * 100)
                : 0
        };
    }
}
