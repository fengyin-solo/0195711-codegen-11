/**
 * 光学测验题库清单（可维护数据文件）
 *
 * 维护说明：
 * - 本文件是测验题目与知识点的唯一数据源，调整题目无需修改任何页面代码。
 * - 知识点（knowledgePoints）：每道题通过 id 引用，observable 必填，
 *   用于说明该知识点在实验中「能观察到什么现象」，答题验证后会展示给学生。
 * - 题目（questions）：每道题必须标出题型（type）、难度（difficulty）与
 *   考查内容（knowledgePoints），并给出提示（hints）与答题后的解析（explanation）。
 * - 清单在浏览器端与容器构建时使用同一套校验（js/quiz-validator.js），
 *   缺少必填内容或引用不存在的知识点时，会给出说明并跳过该条。
 * - 本地校验命令：node tools/validate-quiz.js
 *
 * 本文件同时支持浏览器（全局 QUIZ_MANIFEST）与 Node.js（module.exports）。
 */
(function (root, factory) {
    const manifest = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = manifest;
    } else {
        root.QUIZ_MANIFEST = manifest;
    }
})(typeof self !== 'undefined' ? self : this, function () {
    return {
        // 清单版本
        version: '1.0.0',

        // 题型枚举（key 为题目 type 字段的合法取值）
        questionTypes: {
            experiment: { name: '实验探究' },
            application: { name: '实际应用' },
            observation: { name: '现象观察' }
        },

        // 难度枚举（key 为题目 difficulty 字段的合法取值）
        difficultyLevels: {
            easy: { name: '基础' },
            medium: { name: '进阶' },
            hard: { name: '挑战' }
        },

        /**
         * 知识点清单
         * - id:         唯一标识，题目通过它引用
         * - name:       知识点名称（考查内容）
         * - observable: 该知识点在实验中能观察到的现象（必填，答题验证后展示）
         * - description: 补充说明（可选）
         */
        knowledgePoints: [
            {
                id: 'convex_converge',
                name: '凸透镜的会聚作用',
                observable: '平行于主光轴的光线经过凸透镜后，会会聚到焦点上',
                description: '凸透镜中间厚、边缘薄，对光线有会聚作用'
            },
            {
                id: 'concave_diverge',
                name: '凹透镜的发散作用',
                observable: '平行光经过凹透镜后向外发散，折射光线的反向延长线交于虚焦点',
                description: '凹透镜中间薄、边缘厚，对光线有发散作用'
            },
            {
                id: 'rectilinear_propagation',
                name: '光的直线传播',
                observable: '光线垂直穿过平面透镜时方向不变，仍沿直线传播',
                description: '光在同一种均匀介质中沿直线传播'
            },
            {
                id: 'focal_length_factors',
                name: '焦距与折射率、曲率的关系',
                observable: '折射率或曲率调大时，光线会聚点（焦点）向透镜靠近，焦距变短',
                description: '折射率越大、曲率越大，透镜折光能力越强，焦距越短'
            },
            {
                id: 'myopia_correction',
                name: '近视眼的矫正原理',
                observable: '凹透镜先让光线发散一些，再经晶状体会聚，像正好落在视网膜上',
                description: '近视眼成像在视网膜前方，需用凹透镜矫正'
            },
            {
                id: 'hyperopia_correction',
                name: '远视眼的矫正原理',
                observable: '凸透镜先让光线会聚一些，再经晶状体会聚，像正好落在视网膜上',
                description: '远视眼成像在视网膜后方，需用凸透镜矫正'
            },
            {
                id: 'magnifier_principle',
                name: '放大镜原理',
                observable: '短焦距凸透镜聚光能力强，物距小于焦距时成正立、放大的虚像',
                description: '放大镜是焦距较短的凸透镜'
            },
            {
                id: 'dispersion',
                name: '色散现象',
                observable: '白光斜入射透镜时，不同颜色的光偏折角度不同，光路分成彩色，蓝光偏折最多、红光最少',
                description: '不同颜色光的折射率不同，这就是色散'
            },
            {
                id: 'low_dispersion',
                name: '低色散材料（ED玻璃）',
                observable: '使用低色散镜片时，红、绿、蓝三色光几乎重合，看不到彩色边缘',
                description: '低色散镜片阿贝数高，各色光折射率几乎相同'
            },
            {
                id: 'spherical_aberration',
                name: '球差现象',
                observable: '球面凸透镜的边缘光线比中心光线偏折更多，会聚点更靠近透镜，光线无法聚于同一点',
                description: '球面透镜边缘与中心的会聚点不同，形成球差'
            },
            {
                id: 'aspheric_correction',
                name: '非球面透镜消球差',
                observable: '非球面透镜的边缘与中心光线会聚到同一个焦点，看不到球差',
                description: '非球面透镜表面曲率从中心到边缘逐渐变化，补偿球差'
            },
            {
                id: 'refractive_index',
                name: '折射率与偏折',
                observable: '折射率调大时，光线穿过透镜后的偏折角度明显变大',
                description: '折射率越大，光线偏折越明显'
            }
        ],

        /**
         * 题目清单
         * 必填字段：
         * - id / title / description
         * - type:            题型，取值见 questionTypes
         * - difficulty:      难度，取值见 difficultyLevels
         * - knowledgePoints: 考查内容，引用知识点 id，至少一个
         * - requirements:    达标条件（供测验管理器验证答案）
         * - validation:      启用哪些检查项（至少一项）
         * - explanation:     答题后的解析，必须含 correct，且每个启用的
         *                    检查项要有对应的失败解析（如 checkType → wrongType）
         * - hints:           答题提示，至少一条
         */
        questions: [
            {
                id: 'focus_convex',
                title: '平行光聚焦实验',
                description: '请选择合适的透镜和参数，使平行光能够精准会聚到一点。',
                type: 'experiment',
                difficulty: 'easy',
                knowledgePoints: ['convex_converge', 'focal_length_factors'],
                requirements: {
                    lensType: 'convex',
                    lightMode: 'parallel',
                    minFocalLength: 50,
                    maxFocalLength: 300
                },
                validation: {
                    checkType: true,
                    checkConvergence: true,
                    checkLightMode: true
                },
                explanation: {
                    correct: '太棒了！凸透镜对光线有会聚作用，平行于主光轴的光线经过凸透镜后会会聚到焦点上。',
                    wrongType: '这道题需要使用凸透镜。凹透镜会使光线发散，无法会聚到一点；平面透镜不会改变光线方向。',
                    noConvergence: '光线没有会聚到一点。请尝试增大折射率或曲率，增强透镜的会聚能力。',
                    wrongLightMode: '请切换到平行光模式，这样才能观察到平行光聚焦的效果。'
                },
                hints: [
                    '凸透镜中间厚边缘薄，能使光线会聚',
                    '折射率越大，光线偏折越明显',
                    '曲率越大，透镜弯曲程度越大，会聚能力越强'
                ]
            },
            {
                id: 'diverge_concave',
                title: '光线发散实验',
                description: '请选择合适的透镜，使平行光通过后向外发散开来。',
                type: 'experiment',
                difficulty: 'easy',
                knowledgePoints: ['concave_diverge'],
                requirements: {
                    lensType: 'concave',
                    lightMode: 'parallel'
                },
                validation: {
                    checkType: true,
                    checkDivergence: true,
                    checkLightMode: true
                },
                explanation: {
                    correct: '正确！凹透镜中间薄边缘厚，对光线有发散作用。光线通过凹透镜后会向外发散，其反向延长线会交于虚焦点。',
                    wrongType: '这道题需要使用凹透镜。凸透镜会使光线会聚，平面透镜不会改变光线方向。',
                    noDivergence: '光线没有明显发散。请尝试增大折射率或曲率，增强透镜的发散能力。',
                    wrongLightMode: '请切换到平行光模式，这样才能清晰观察到发散效果。'
                },
                hints: [
                    '凹透镜中间薄边缘厚，能使光线发散',
                    '近视眼镜就是凹透镜制成的',
                    '凹透镜成的是正立、缩小的虚像'
                ]
            },
            {
                id: 'no_deflection_plano',
                title: '光线直线传播实验',
                description: '请选择合适的透镜，使光线通过后方向不发生改变。',
                type: 'experiment',
                difficulty: 'easy',
                knowledgePoints: ['rectilinear_propagation'],
                requirements: {
                    lensType: 'plano'
                },
                validation: {
                    checkType: true,
                    checkNoDeflection: true
                },
                explanation: {
                    correct: '完全正确！平面透镜的两个表面都是平行的，光线垂直入射时方向不变，只会发生微小的侧移。',
                    wrongType: '这道题需要使用平面透镜。凸透镜会使光线会聚，凹透镜会使光线发散。',
                    hasDeflection: '光线发生了偏折。请确认你选择的是平面透镜，并且光线是垂直入射的。'
                },
                hints: [
                    '平面透镜的两个表面是平行的平面',
                    '光在同一种均匀介质中沿直线传播',
                    '平面透镜常用于保护光学元件'
                ]
            },
            {
                id: 'myopia_correction',
                title: '近视眼矫正',
                description: '近视眼的晶状体太厚，折光能力太强，成像在视网膜前方。请选择合适的透镜来矫正近视。',
                type: 'application',
                difficulty: 'medium',
                knowledgePoints: ['myopia_correction', 'concave_diverge'],
                requirements: {
                    lensType: 'concave',
                    minRefractiveIndex: 1.4,
                    maxRefractiveIndex: 1.6
                },
                validation: {
                    checkType: true,
                    checkRefractiveIndex: true
                },
                explanation: {
                    correct: '非常好！近视眼镜是凹透镜，它能先使光线发散一些，再经过晶状体会聚，就能让像正好成在视网膜上。',
                    wrongType: '近视眼需要用凹透镜矫正。凸透镜会使光线更会聚，成像会更靠前；远视眼才用凸透镜矫正。',
                    wrongRI: '折射率不太合适。普通眼镜片的折射率通常在1.5左右，请调整到合适范围。'
                },
                hints: [
                    '近视眼成像在视网膜前方',
                    '凹透镜对光线有发散作用',
                    '近视眼镜的度数是负数'
                ]
            },
            {
                id: 'hyperopia_correction',
                title: '远视眼矫正',
                description: '远视眼的晶状体太薄，折光能力太弱，成像在视网膜后方。请选择合适的透镜来矫正远视。',
                type: 'application',
                difficulty: 'medium',
                knowledgePoints: ['hyperopia_correction', 'convex_converge'],
                requirements: {
                    lensType: 'convex',
                    minRefractiveIndex: 1.4,
                    maxRefractiveIndex: 1.6
                },
                validation: {
                    checkType: true,
                    checkRefractiveIndex: true
                },
                explanation: {
                    correct: '完美！远视眼镜是凸透镜，它能先使光线会聚一些，再经过晶状体会聚，就能让像正好成在视网膜上。老花镜就是凸透镜。',
                    wrongType: '远视眼需要用凸透镜矫正。凹透镜会使光线更发散，成像会更靠后；近视眼才用凹透镜矫正。',
                    wrongRI: '折射率不太合适。普通眼镜片的折射率通常在1.5左右，请调整到合适范围。'
                },
                hints: [
                    '远视眼成像在视网膜后方',
                    '凸透镜对光线有会聚作用',
                    '老花镜的度数是正数'
                ]
            },
            {
                id: 'magnifier',
                title: '制作放大镜',
                description: '放大镜是一种常用的光学仪器，请选择合适的透镜和参数，制作一个聚光能力较强的放大镜。',
                type: 'application',
                difficulty: 'medium',
                knowledgePoints: ['magnifier_principle', 'focal_length_factors'],
                requirements: {
                    lensType: 'convex',
                    minCurvature: 50,
                    maxCurvature: 90,
                    minRefractiveIndex: 1.5
                },
                validation: {
                    checkType: true,
                    checkCurvature: true,
                    checkRefractiveIndex: true
                },
                explanation: {
                    correct: '太棒了！放大镜就是一个焦距较短的凸透镜。曲率越大、折射率越高，焦距越短，放大倍数越大。当物距小于焦距时，成正立、放大的虚像。',
                    wrongType: '放大镜需要使用凸透镜。凹透镜成的是缩小的像，无法作为放大镜使用。',
                    wrongCurvature: '曲率太小了，放大镜需要较大的曲率才能获得较短的焦距和较大的放大倍数。',
                    wrongRI: '折射率不够大，放大镜需要较高的折射率来获得更强的聚光能力。'
                },
                hints: [
                    '放大镜是一个短焦距的凸透镜',
                    '物距小于焦距时成正立放大的虚像',
                    '曲率越大，焦距越短，放大倍数越大'
                ]
            },
            {
                id: 'dispersion_demo',
                title: '色散现象演示',
                description: '白光通过透镜时会发生色散，不同颜色的光偏折程度不同。请选择合适的材料和参数，观察明显的色散现象。',
                type: 'observation',
                difficulty: 'medium',
                knowledgePoints: ['dispersion', 'refractive_index'],
                requirements: {
                    lensType: 'convex',
                    material: 'normal',
                    minCurvature: 60
                },
                validation: {
                    checkType: true,
                    checkMaterial: true,
                    checkCurvature: true,
                    checkDispersion: true
                },
                explanation: {
                    correct: '正确！普通玻璃的色散较大，白光通过时会分解成红、绿、蓝等颜色。蓝光折射率最大，偏折最多；红光折射率最小，偏折最少。',
                    wrongType: '请使用凸透镜来观察色散现象，光线需要偏折才能观察到色散。',
                    wrongMaterial: '低色散镜片（ED玻璃）的色散很小，不容易观察到色散现象。请使用普通玻璃材料。',
                    wrongCurvature: '曲率太小，光线偏折不明显，色散现象也不明显。请增大曲率。',
                    noDispersion: '色散现象不明显。请尝试增大入射角，让光线斜着入射，这样色散会更明显。'
                },
                hints: [
                    '白光是由多种颜色的光组成的',
                    '不同颜色的光折射率不同',
                    '蓝光偏折最多，红光偏折最少',
                    '让光线斜入射，色散更明显'
                ]
            },
            {
                id: 'low_dispersion_lens',
                title: '低色散镜头设计',
                description: '在摄影中，色散会产生彩色边缘，影响画质。请选择合适的材料设计一个低色散镜头。',
                type: 'application',
                difficulty: 'hard',
                knowledgePoints: ['low_dispersion', 'dispersion'],
                requirements: {
                    lensType: 'convex',
                    material: 'lowDispersion'
                },
                validation: {
                    checkType: true,
                    checkMaterial: true,
                    checkLowDispersion: true
                },
                explanation: {
                    correct: '专业！低色散镜片（ED玻璃）的阿贝数很高，不同颜色的光折射率几乎相同，能有效消除彩色边缘，显著提高成像质量。',
                    wrongType: '摄影镜头通常使用凸透镜作为主要镜片。',
                    wrongMaterial: '请选择低色散镜片（ED玻璃）材料。普通玻璃的色散较大，高折射率镜片的色散也比较明显。',
                    highDispersion: '色散还是比较明显。请确认你选择的是低色散镜片材料。'
                },
                hints: [
                    '低色散镜片简称ED玻璃',
                    '阿贝数越大，色散越小',
                    '专业相机镜头常用ED玻璃'
                ]
            },
            {
                id: 'spherical_aberration',
                title: '球差现象观察',
                description: '球面透镜的边缘光线和中心光线会聚点不同，这就是球差。请观察球面透镜的球差现象。',
                type: 'observation',
                difficulty: 'hard',
                knowledgePoints: ['spherical_aberration'],
                requirements: {
                    lensType: 'convex',
                    lightMode: 'parallel',
                    minCurvature: 60
                },
                validation: {
                    checkType: true,
                    checkLightMode: true,
                    checkCurvature: true,
                    checkSphericalAberration: true
                },
                explanation: {
                    correct: '观察得很仔细！球面透镜的边缘光线比中心光线偏折更多，导致球差。你可以看到边缘光线会聚在更靠近透镜的位置。',
                    wrongType: '请使用凸透镜来观察球差现象。',
                    wrongLightMode: '请切换到平行光模式，这样才能清晰观察到球差。',
                    wrongCurvature: '曲率太小，球差不明显。请增大曲率，球差会更显著。',
                    noAberration: '球差不明显。请尝试增大曲率，或者使用非球面透镜对比观察。'
                },
                hints: [
                    '球面透镜存在球差',
                    '边缘光线比中心光线偏折更多',
                    '曲率越大，球差越明显',
                    '非球面透镜可以消除球差'
                ]
            },
            {
                id: 'aspheric_correction',
                title: '非球面透镜消球差',
                description: '非球面透镜可以消除球差，让所有光线精准会聚。请对比观察非球面透镜和球面透镜的区别。',
                type: 'observation',
                difficulty: 'hard',
                knowledgePoints: ['aspheric_correction', 'spherical_aberration'],
                requirements: {
                    lensType: 'aspheric',
                    lightMode: 'parallel'
                },
                validation: {
                    checkType: true,
                    checkLightMode: true,
                    checkNoSphericalAberration: true
                },
                explanation: {
                    correct: '非常专业！非球面透镜通过改变表面曲率，从中心到边缘逐渐变化，完美补偿了球差，让所有光线都能会聚到同一点，成像更清晰。',
                    wrongType: '请使用非球面透镜。球面透镜存在球差，边缘光线会聚点与中心不同。',
                    wrongLightMode: '请切换到平行光模式，这样才能清晰观察到非球面透镜的消球差效果。',
                    hasAberration: '还是有球差存在。请确认你选择的是非球面透镜。'
                },
                hints: [
                    '非球面透镜可以消除球差',
                    '表面曲率从中心到边缘逐渐变化',
                    '所有光线会聚到同一点',
                    '高端镜头常用非球面透镜'
                ]
            }
        ]
    };
});
