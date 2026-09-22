/**
 * 配置常量
 */
const CONFIG = {
    // 应用版本
    VERSION: '1.0.0',
    
    // 存储键名
    STORAGE_KEYS: {
        DESIGNS: 'optics_designs',
        SETTINGS: 'optics_settings',
        GUIDE_COMPLETED: 'optics_guide_completed'
    },
    
    // 透镜类型
    LENS_TYPES: {
        CONVEX: 'convex',
        CONCAVE: 'concave',
        PLANO: 'plano',
        ASPHERIC: 'aspheric'
    },
    
    // 材料类型
    MATERIALS: {
        NORMAL: {
            id: 'normal',
            name: '普通玻璃',
            refractiveIndex: 1.5,
            dispersion: 0.4  // 普通玻璃色散较大
        },
        HIGH_INDEX: {
            id: 'highIndex',
            name: '高折射率镜片',
            refractiveIndex: 1.7,
            dispersion: 0.35  // 高折射率通常色散也较大
        },
        LOW_DISPERSION: {
            id: 'lowDispersion',
            name: '低色散镜片',
            refractiveIndex: 1.52,
            dispersion: 0.08  // ED玻璃，色散很小
        }
    },
    
    // 透镜默认参数
    LENS_DEFAULTS: {
        refractiveIndex: 1.5,
        size: 100,
        curvature: 50,
        material: 'normal'
    },
    
    // 光源类型
    LIGHT_MODES: {
        PARALLEL: 'parallel',
        POINT: 'point'
    },
    
    // 光路默认参数
    LIGHT_DEFAULTS: {
        mode: 'parallel',
        rayCount: 5,
        angle: 0,
        wavelength: 550 // 绿光波长(nm)
    },
    
    // 颜色配置
    COLORS: {
        INCIDENT_RAY: '#E74C3C',
        REFRACTED_RAY: '#3498DB',
        RAY_RED: '#E74C3C',
        RAY_GREEN: '#27AE60',
        RAY_BLUE: '#3498DB',
        LENS_FILL: 'rgba(74, 144, 226, 0.3)',
        LENS_STROKE: '#4A90E2',
        LENS_SELECTED: '#2ECC71',
        OPTICAL_AXIS: '#999999',
        FOCAL_POINT: '#E74C3C',
        GRID: '#E5E5E5'
    },
    
    // 渲染配置
    RENDER: {
        RAY_WIDTH: 2,
        LENS_STROKE_WIDTH: 2,
        FOCAL_POINT_RADIUS: 5,
        ANIMATION_DURATION: 300,
        UPDATE_DELAY: 50
    },
    
    // 帮助文本
    HELP_TEXTS: {
        convex: '凸透镜：中间厚、边缘薄，可以让光线汇聚到一点（焦点）。边缘光线会有轻微球差。',
        concave: '凹透镜：中间薄、边缘厚，可以让光线发散开来',
        plano: '平面透镜：两面都是平的，光线穿过时方向不变',
        aspheric: '非球面透镜：表面曲率从中心到边缘逐渐变化，能消除球差，让所有光线精准汇聚到同一焦点',
        lowDispersion: '低色散镜片（ED玻璃）：阿贝数高，不同颜色的光折射角度几乎相同，成像更清晰无彩边',
        highIndex: '高折射率镜片：更薄更轻，聚光能力更强，但色散也较明显',
        refractiveIndex: '折射率：数值越大，光线偏折越明显。不同颜色光的折射率略有不同，这就是色散的原因',
        curvature: '弧度：调节透镜的弯曲程度，影响焦距和球差'
    },
    
    // 知识点提示
    KNOWLEDGE_TIPS: [
        '光从空气进入玻璃会向法线偏折',
        '凸透镜可以把平行光汇聚到焦点',
        '凹透镜可以把光线发散开来',
        '折射率越大，光线偏折越明显',
        '不同颜色的光折射程度不同，这就是色散',
        '蓝光折射率最大，红光折射率最小',
        '非球面透镜可以消除球差，让光线更精准汇聚',
        '球面透镜的边缘光线会偏折过度，产生球差',
        '低色散镜片（ED玻璃）可以减少彩色边缘',
        '近视眼镜用凹透镜，远视眼镜用凸透镜',
        '放大镜就是一个凸透镜',
        '光在同一种介质中沿直线传播',
        '光的传播速度在不同介质中不同',
        '阿贝数越大，色散越小',
        '相机镜头常用非球面透镜来提高成像质量'
    ],
    
    // 测验题库与知识点已迁移至可维护清单：data/quiz-manifest.json
    // 由 js/quiz-data.js 负责校验，QuizManager 运行时加载，调整题目无需修改代码。

    // 预设案例
    PRESETS: {
        magnifier: {
            name: '放大镜成像',
            lenses: [
                {
                    type: 'convex',
                    x: 0.5,
                    y: 0.5,
                    refractiveIndex: 1.5,
                    size: 120,
                    curvature: 60,
                    material: 'normal'
                }
            ],
            light: {
                mode: 'parallel',
                rayCount: 5,
                angle: 0
            }
        },
        myopia: {
            name: '近视眼镜矫正',
            lenses: [
                {
                    type: 'concave',
                    x: 0.5,
                    y: 0.5,
                    refractiveIndex: 1.5,
                    size: 100,
                    curvature: 40,
                    material: 'normal'
                }
            ],
            light: {
                mode: 'parallel',
                rayCount: 5,
                angle: 0
            }
        },
        dispersion: {
            name: '色散现象',
            lenses: [
                {
                    type: 'convex',
                    x: 0.5,
                    y: 0.5,
                    refractiveIndex: 1.6,
                    size: 100,
                    curvature: 70,
                    material: 'normal'
                }
            ],
            light: {
                mode: 'parallel',
                rayCount: 3,
                angle: 15
            },
            showDispersion: true
        }
    }
};

// 冻结配置对象，防止意外修改
Object.freeze(CONFIG);
Object.freeze(CONFIG.STORAGE_KEYS);
Object.freeze(CONFIG.LENS_TYPES);
Object.freeze(CONFIG.MATERIALS);
Object.freeze(CONFIG.LENS_DEFAULTS);
Object.freeze(CONFIG.LIGHT_MODES);
Object.freeze(CONFIG.LIGHT_DEFAULTS);
Object.freeze(CONFIG.COLORS);
Object.freeze(CONFIG.RENDER);
Object.freeze(CONFIG.HELP_TEXTS);
Object.freeze(CONFIG.PRESETS);
