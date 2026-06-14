/**
 * 妈妈端API交互模块
 * 处理与后端API的所有交互
 */

// --- Mock DB (Shared for mom side) ---
const DEFAULT_DB = {
    elderQuestions: [
        { id: 1, title: '血压高早上起来头晕怎么办？', content: '我最近早上起来总是觉得头晕目眩，量了下血压有点高，平时饮食上需要注意些什么呢？', category: '健康养生', create_time: '2023-09-15T11:00:00', answers: [] },
        { id: 2, title: '晚上经常失眠，睡不好觉怎么调理？', content: '年纪大了，晚上翻来覆去睡不着，有什么好的调理方法或者安神的食物推荐吗？', category: '睡眠健康', create_time: '2023-09-16T14:20:00', answers: [] },
        { id: 3, title: '膝盖关节疼，下楼梯困难怎么缓解？', content: '这几天天气转凉，膝盖关节疼得厉害，下楼梯都觉得费劲，有没有什么缓解的办法？', category: '日常护理', create_time: '2023-09-17T09:30:00', answers: [] }
    ],
    momQuestions: [
        { id: 101, title: '宝宝不爱吃辅食怎么办？', content: '宝宝最近对辅食很抗拒，吃两口就吐出来，或者干脆不张嘴，该怎么引导呢？', category: '饮食健康', create_time: '2023-10-01T09:00:00', answers: [] },
        { id: 102, title: '宝宝频繁夜醒怎么处理？', content: '宝宝六个月了，晚上还要醒好几次，必须要抱着哄才能睡，大人实在吃不消。', category: '睡眠问题', create_time: '2023-10-02T10:30:00', answers: [] },
        { id: 103, title: '如何正确给新生儿剪指甲？', content: '宝宝的指甲长得很快，又不敢给他剪，怕剪到肉，有什么好的方法吗？', category: '日常护理', create_time: '2023-10-03T14:15:00', answers: [] },
        { id: 104, title: '一岁多宝宝爱打人怎么引导？', content: '一岁两个月的宝宝，一生气或者着急就喜欢打人，打脸打头，怎么教育比较好？', category: '行为培养', create_time: '2023-10-04T16:45:00', answers: [] },
        { id: 105, title: '宝宝不爱吃蔬菜怎么办？', content: '我家宝宝2岁了，最近特别抗拒吃蔬菜，不管怎么做都不愿意吃，担心营养不均衡，请问有什么好办法吗？', category: '饮食健康', create_time: '2025-10-18T10:00:00', answers: [] },
        { id: 106, title: '孩子不爱吃饭怎么办？', content: '孩子最近不好好吃饭，喂饭很困难。', category: '饮食健康', create_time: '2025-10-15T12:00:00', answers: [] },
        { id: 107, title: '辅食添加顺序', content: '辅食应该怎么逐步添加？', category: '饮食健康', create_time: '2025-10-14T09:00:00', answers: [] },
        { id: 108, title: '多大开始给宝宝读绘本合适？', content: '从几个月大就可以开始，主要是让他感受声音和翻书的乐趣，培养阅读的习惯。', category: '知识启蒙', create_time: '2023-10-05T09:00:00', answers: [] },
        { id: 109, title: '适合半岁宝宝的互动小游戏有哪些？', content: '可以玩躲猫猫、抓握不同材质的玩具、听声音找声源等游戏，锻炼他的感知能力。', category: '趣味陪伴', create_time: '2023-10-06T15:00:00', answers: [] },
        { id: 110, title: '宝宝发烧物理降温方法', content: '宝宝发低烧，除了吃药还有什么好的物理降温方法？', category: '病护应对', create_time: '2023-10-07T10:00:00', answers: [] }
    ],
    answers: [
        { id: 1, question_id: 1, answer_text: '建议饮食清淡，少吃盐，多吃蔬菜水果。早晨起床时动作要慢，不要起得太猛，可以在床边坐一会儿再站起来。', create_time: '2023-09-15T12:00:00', question: { title: '血压高早上起来头晕怎么办？' } },
        { id: 2, question_id: 2, answer_text: '睡前可以泡个热水脚，喝一杯热牛奶。白天适当运动，但睡前避免剧烈运动和喝浓茶咖啡。', create_time: '2023-09-16T15:30:00', question: { title: '晚上经常失眠，睡不好觉怎么调理？' } },
        { id: 3, question_id: 101, answer_text: '可以尝试改变辅食的形状和颜色，吸引宝宝的注意力。另外，大人在旁边吃得津津有味也能激发宝宝的食欲。', create_time: '2023-10-01T10:00:00', elder_avatar: 'images/avatar.png', elder_name: '李奶奶' },
        { id: 4, question_id: 102, answer_text: '白天尽量让宝宝多活动，消耗精力。睡前建立固定的安抚程序，比如洗个温水澡、听轻柔的音乐，慢慢减少夜奶次数。', create_time: '2023-10-02T11:00:00', elder_avatar: 'images/avatar.png', elder_name: '王爷爷' },
        { id: 5, question_id: 103, answer_text: '最好在宝宝熟睡的时候剪，用婴儿专用的指甲剪。剪完后记得用小锉刀把边缘磨平，免得宝宝抓伤自己。', create_time: '2023-10-03T15:00:00', elder_avatar: 'images/avatar.png', elder_name: '张奶奶' },
        { id: 6, question_id: 104, answer_text: '这个时候的宝宝还不会表达情绪，打人可能是觉得好玩或者着急。大人要严肃地告诉他不行，然后抓住他的手，教他轻轻摸。', create_time: '2023-10-04T17:00:00', elder_avatar: 'images/avatar.png', elder_name: '赵爷爷' },
        { id: 7, question_id: 105, answer_text: '把蔬菜剁碎混在肉丸子或者鸡蛋饼里，宝宝就不容易挑出来了。或者用带卡通图案的餐具装蔬菜。', create_time: '2025-10-18T11:00:00', elder_avatar: 'images/avatar.png', elder_name: '陈奶奶' },
        { id: 8, question_id: 106, answer_text: '吃饭前一个小时不要给零食，如果实在不吃也不要强迫，饿一顿没关系，让他知道只有在饭点才有东西吃。', create_time: '2025-10-15T13:00:00', elder_avatar: 'images/avatar.png', elder_name: '刘奶奶' },
        { id: 9, question_id: 107, answer_text: '辅食要从一种到多种，从稀到稠，从细到粗。每次加新食物要观察三天看有没有过敏。先加米粉，再加蔬菜泥、果泥、肉泥。', create_time: '2025-10-14T10:00:00', elder_avatar: 'images/avatar.png', elder_name: '孙爷爷' },
        { id: 10, question_id: 108, answer_text: '半岁左右就可以开始了，买那种撕不烂的布书或者纸板书，颜色鲜艳点，主要是让宝宝习惯看书。', create_time: '2023-10-05T10:00:00', elder_avatar: 'images/avatar.png', elder_name: '周奶奶' },
        { id: 11, question_id: 109, answer_text: '躲猫猫最好玩了，拿块手帕遮住脸再拿开。还可以拿拨浪鼓在他眼前晃，让他伸手抓。', create_time: '2023-10-06T16:00:00', elder_avatar: 'images/avatar.png', elder_name: '吴爷爷' },
        { id: 12, question_id: 110, answer_text: '用温水擦拭宝宝的额头、脖子、腋下、手心和脚心。多给宝宝喝温开水，衣服不要穿得太厚捂着。', create_time: '2023-10-07T11:00:00', elder_avatar: 'images/avatar.png', elder_name: '郑奶奶' }
    ],
    elderFavorites: [
        { id: 1, question_title: '血压高早上起来头晕怎么办？', answer_text: '建议饮食清淡，少吃盐，多吃蔬菜水果。早晨起床时动作要慢，不要起得太猛，可以在床边坐一会儿再站起来。', mom_name: '王妈妈', category: '健康养生', create_time: '2023-09-15T12:30:00' },
        { id: 2, question_title: '晚上经常失眠，睡不好觉怎么调理？', answer_text: '睡前可以泡个热水脚，喝一杯热牛奶。白天适当运动，但睡前避免剧烈运动和喝浓茶咖啡。', mom_name: '李妈妈', category: '睡眠健康', create_time: '2023-09-17T10:00:00' }
    ],
    momFavorites: [
        { id: 1, question_title: '宝宝不爱吃辅食怎么办？', answer_text: '建议把辅食做成可爱的形状，增加趣味性。可以在大人吃饭时让宝宝在旁边看着，激发他的食欲。', category: '饮食健康', create_time: '2023-10-01T10:00:00' },
        { id: 2, question_title: '宝宝频繁夜醒怎么处理？', answer_text: '白天多消耗体力，睡前建立固定的安抚程序，比如洗澡、讲故事。尽量不要一哭就抱，可以先轻轻拍哄。', category: '睡眠问题', create_time: '2023-10-02T11:00:00' },
        { id: 3, question_title: '如何正确给新生儿剪指甲？', answer_text: '最好在宝宝熟睡时修剪，使用专用的婴儿指甲剪，剪平后稍微磨圆边缘，防止抓伤自己。', category: '日常护理', create_time: '2023-10-03T14:00:00' },
        { id: 4, question_title: '一岁多宝宝爱打人怎么引导？', answer_text: '温和但坚定地制止，告诉他这样不对。可以教他用“摸摸”代替“打”，多给他一些正向的关注。', category: '行为培养', create_time: '2023-10-04T16:00:00' },
        { id: 5, question_title: '多大开始给宝宝读绘本合适？', answer_text: '从几个月大就可以开始，主要是让他感受声音和翻书的乐趣，培养阅读的习惯。', category: '知识启蒙', create_time: '2023-10-05T09:00:00' },
        { id: 6, question_title: '适合半岁宝宝的互动小游戏有哪些？', answer_text: '可以玩躲猫猫、抓握不同材质的玩具、听声音找声源等游戏，锻炼他的感知能力。', category: '趣味陪伴', create_time: '2023-10-06T15:00:00' }
    ],
    myQuestions: [
        { id: 101, title: '宝宝不爱吃辅食怎么办？', content: '宝宝最近对辅食很抗拒，吃两口就吐出来，或者干脆不张嘴，该怎么引导呢？', category: '饮食健康', create_time: '2023-10-01T09:00:00', answers: [] },
        { id: 102, title: '宝宝频繁夜醒怎么处理？', content: '宝宝六个月了，晚上还要醒好几次，必须要抱着哄才能睡，大人实在吃不消。', category: '睡眠问题', create_time: '2023-10-02T10:30:00', answers: [] }
    ],
    profile: {
        name: '王妈妈',
        role: '热心解答者',
        join_time: '2023-05-12T00:00:00',
        answer_count: 0,
        like_count: 0,
        help_count: 0
    },
    settings: {
        sound: 'on',
        notification: 'on'
    },
    momThankLetters: [
        { id: 1, title: '感谢您的耐心解答', content: '您的建议非常有用，我按照您说的注意了饮食，起床也慢了一些，现在早上头晕的症状缓解了不少，太感谢了！', sender_name: '张爷爷', sender_relation: '老人', recipient_expert: '王妈妈', help_category: '健康养生', create_time: '2023-09-18T10:00:00' }
    ],
    elderThankLetters: [
        { id: 1, title: '谢谢您分享的育儿经验', content: '李奶奶，您分享的关于宝宝辅食添加的经验太实用了，我家宝宝现在每天都乖乖吃饭，非常感谢您的热心指导！', sender_name: '张妈妈', sender_relation: '妈妈', recipient_expert: '李奶奶', question_title: '孩子不爱吃饭怎么办？', create_time: '2023-10-10T10:00:00' },
        { id: 2, title: '感恩您的安抚妙招', content: '王爷爷，用了您教的睡前抚触方法，宝宝夜里安稳多了，真的帮了我们大忙！', sender_name: '刘妈妈', sender_relation: '妈妈', recipient_expert: '王爷爷', question_title: '宝宝频繁夜醒怎么处理', create_time: '2023-10-12T14:30:00' }
    ]
};

window.MockDB = (function() {
    let db = null;
    try {
        const stored = localStorage.getItem('nuanya_mock_db_v7');
        if (stored) {
            db = JSON.parse(stored);
        }
    } catch(e) {}
    
    if (!db) {
        db = DEFAULT_DB;
        localStorage.setItem('nuanya_mock_db_v7', JSON.stringify(db));
    }
    
    return {
        ...db,
        save: function() {
            const dataToSave = {
                elderQuestions: this.elderQuestions,
                momQuestions: this.momQuestions,
                answers: this.answers,
                elderFavorites: this.elderFavorites,
                momFavorites: this.momFavorites,
                myQuestions: this.myQuestions,
                profile: this.profile,
                settings: this.settings,
                momThankLetters: this.momThankLetters,
                elderThankLetters: this.elderThankLetters
            };
            localStorage.setItem('nuanya_mock_db_v7', JSON.stringify(dataToSave));
        },
        generateId: function() {
            return Math.floor(Math.random() * 1000000);
        }
    };
})();

window.apiGet = async function(path) {
    console.log('Mock Mom API GET:', path);
    if (path.includes('/api/elder/questions/unanswered') || path.includes('/api/questions/unanswered')) {
        return { code: 200, data: window.MockDB.elderQuestions };
    }
    return { code: 404 };
};

window.apiPost = async function(path, body) {
    if (path.includes('/api/answers')) {
        const q = window.MockDB.elderQuestions.find(q => q.id === body.question_id) || window.MockDB.momQuestions.find(q => q.id === body.question_id);
        const qMeta = q ? { id: q.id, title: q.title, category: q.category } : { id: body.question_id, title: '未知问题', category: '' };
        const ans = {
            id: window.MockDB.generateId(),
            question_id: body.question_id,
            answer_text: body.answer_text,
            create_time: new Date().toISOString(),
            // 关键：不要把 q 对象本体挂在 answer 上，否则 q.answers.push(ans) 会形成循环引用导致 JSON.stringify 失败
            question: qMeta
        };
        window.MockDB.answers.unshift(ans);
        if (q && q.answers) {
            // 只把轻量结构放进 q.answers，避免环
            q.answers.push({
                id: ans.id,
                question_id: ans.question_id,
                answer_text: ans.answer_text,
                create_time: ans.create_time,
                question: qMeta
            });
        }
        window.MockDB.save();
        return { code: 200, success: true, data: ans };
    }
    return { code: 200 };
};

// 妈妈端API配置
const MOM_API_CONFIG = {
    baseURL: (window.location && window.location.port === '8000') ? '/api' : 'http://127.0.0.1:8000/api',
    timeout: 10000
};

// API工具函数
const momApiRequest = async (url, options = {}) => {
    console.log('Mock Mom API request:', url, options);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    let body = {};
    if (options.body) {
        try { body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body; } catch(e) {}
    }

    if (url.includes('/mom/questions/ask/')) {
        const newQ = {
            id: window.MockDB.generateId(),
            title: body.title,
            content: body.content,
            category: body.category,
            create_time: new Date().toISOString()
        };
        window.MockDB.momQuestions.unshift(newQ);
        window.MockDB.myQuestions.unshift(newQ);
        window.MockDB.save();
        if (typeof fetchQuestionsAndRender === 'function') {
            questionsLoaded = false;
            fetchQuestionsAndRender();
        }
        return { success: true, data: newQ };
    }

    if (url.includes('/mom/answers/thanks/')) {
        return { success: true, message: "感谢信已发送" };
    }

    if (url.includes('/mom/answers/favorite/')) {
        const answer = window.MockDB.answers.find(a => a.id === body.answer_id) || { id: body.answer_id, answer_text: "模拟回答", question: { title: "模拟问题" } };
        window.MockDB.momFavorites.unshift({
            id: window.MockDB.generateId(),
            question_title: answer.question ? answer.question.title : '未知',
            answer_text: answer.answer_text,
            mom_name: "张妈妈",
            create_time: new Date().toISOString()
        });
        window.MockDB.save();
        if (typeof loadCollections === 'function') loadCollections();
        return { success: true };
    }

    if (url.includes('/mom/answers/toggle-favorite/')) {
        return { success: true, is_favorited: true };
    }
    
    if (url.includes('/mom/answers/like/') || url.includes('/mom/answers/toggle-like/')) {
        return { success: true, is_liked: true, like_count: 1 };
    }

    if (url.match(/\/mom\/questions\/\d+\/answers\//)) {
        const qidStr = url.match(/\/mom\/questions\/(\d+)\/answers\//)[1];
        const qid = parseInt(qidStr);
        let answers = window.MockDB.answers.filter(a => a.question_id === qid);
        
        // If no answers found in DB, let's try to find them in the questions
        if (answers.length === 0) {
            const q = window.MockDB.momQuestions.find(q => q.id === qid);
            if (q && q.answers && q.answers.length > 0) {
                answers = q.answers;
            } else if (q) {
                // Generate a default answer
                answers = [{
                    id: window.MockDB.generateId(),
                    question_id: qid,
                    content: `关于“${q.title}”的建议：您可以尝试多观察宝宝的状态，保持耐心，这通常是阶段性的情况。`,
                    create_time: new Date().toISOString(),
                    elder_avatar: 'images/avatar.png',
                    elder_name: '热心老人',
                    author: '热心老人',
                    avatar: 'images/avatar.png'
                }];
            }
        }
        
        // ensure format matches mom.html expectation
        answers = answers.map(a => ({
            ...a,
            content: a.content || a.answer_text,
            author: a.author || a.elder_name || '热心老人',
            avatar: a.avatar || a.elder_avatar || 'images/avatar.png'
        }));
        
        return { success: true, data: answers };
    }

    if (url.match(/\/mom\/questions\/\d+\/interactions\//)) {
        return { success: true, data: { is_liked: false, is_favorited: false } };
    }
    
    if (url.match(/\/mom\/questions\/\d+\//)) {
        const qid = parseInt(url.split('/').filter(Boolean).pop());
        const q = window.MockDB.momQuestions.find(q => q.id === qid) || window.MockDB.momQuestions[0];
        return { success: true, data: q };
    }

    if (url.includes('/mom/questions/my/')) {
        return { success: true, data: { questions: window.MockDB.myQuestions } };
    }

    if (url.includes('/mom/favorites/')) {
        return { success: true, data: { results: window.MockDB.momFavorites } };
    }
    
    if (url.includes('/mom/thank-letters/my/')) {
        return { success: true, data: { results: window.MockDB.momThankLetters } };
    }

    if (url.includes('/mom/questions/search/')) {
        const queryParams = new URLSearchParams(url.split('?')[1] || '');
        const tag = queryParams.get('tag') || '';
        const keyword = queryParams.get('keyword') || '';
        
        let results = window.MockDB.momQuestions; // 妈妈端提问的是育儿问题，供老人解答的
        
        if (tag && tag !== '全部') {
            results = results.filter(q => q.category === tag);
        }
        
        if (keyword) {
            const lowerKeyword = keyword.toLowerCase();
            results = results.filter(q => 
                (q.title && q.title.toLowerCase().includes(lowerKeyword)) || 
                (q.content && q.content.toLowerCase().includes(lowerKeyword))
            );
        }
        
        // Add default answers if missing to match requirement
        results = results.map(q => {
            if (!q.answers || q.answers.length === 0) {
                // Find existing answers for this question or create a mock one
                const existingAnswers = window.MockDB.answers.filter(a => a.question_id === q.id);
                if (existingAnswers.length > 0) {
                    q.answers = existingAnswers;
                } else {
                    q.answers = [{
                        id: window.MockDB.generateId(),
                        question_id: q.id,
                        content: `关于“${q.title}”的建议：您可以尝试多观察宝宝的状态，保持耐心，这通常是阶段性的情况。`,
                        answer_text: `关于“${q.title}”的建议：您可以尝试多观察宝宝的状态，保持耐心，这通常是阶段性的情况。`,
                        create_time: new Date().toISOString(),
                        elder_avatar: 'images/avatar.png',
                        elder_name: '热心老人'
                    }];
                }
            } else {
                // Ensure answers have elder avatar
                q.answers = q.answers.map(a => ({
                    ...a,
                    content: a.content || a.answer_text,
                    elder_avatar: a.elder_avatar || 'images/avatar.png',
                    elder_name: a.elder_name || '热心老人'
                }));
            }
            return q;
        });
        
        return { success: true, data: { questions: results } };
    }

    if (url.includes('/mom/profile/')) {
        return { success: true, data: window.MockDB.profile };
    }

    if (url.includes('/mom/question-tags/')) {
        return { 
            success: true, 
            data: { 
                tags: [
                    { id: 1, name: '饮食健康', description: '关于宝宝喂养、辅食添加等' },
                    { id: 2, name: '睡眠问题', description: '关于宝宝睡眠习惯、夜醒等' },
                    { id: 3, name: '行为培养', description: '关于宝宝行为习惯、性格养成等' },
                    { id: 4, name: '日常护理', description: '关于宝宝日常清洁、穿衣等' },
                    { id: 5, name: '知识启蒙', description: '关于宝宝早教、智力开发等' },
                    { id: 6, name: '趣味陪伴', description: '关于亲子游戏、互动等' }
                ] 
            } 
        };
    }

    return { success: true, data: {} };
};

// 妈妈端API接口
const MomAPI = {
    // 用户相关
    async register(userData) {
        return await momApiRequest('/mom/register/', {
            method: 'POST',
            body: userData
        });
    },
    
    async getProfile() {
        return await momApiRequest('/mom/profile/');
    },
    
    // 问题相关
    async askQuestion(questionData) {
        return await momApiRequest('/mom/questions/ask/', {
            method: 'POST',
            body: questionData
        });
    },
    
    async getMyQuestions(page = 1, pageSize = 10) {
        return await momApiRequest(`/mom/questions/my/?page=${page}&page_size=${pageSize}`);
    },
    
    async searchQuestions(params) {
        const queryString = new URLSearchParams(params).toString();
        return await momApiRequest(`/mom/questions/search/?${queryString}`);
    },
    
    // 答案互动
    async likeAnswer(answerId) {
        return await momApiRequest('/mom/answers/like/', {
            method: 'POST',
            body: { answer_id: answerId }
        });
    },
    
    async toggleLike(answerId) {
        return await momApiRequest('/mom/answers/toggle-like/', {
            method: 'POST',
            body: { answer_id: answerId }
        });
    },
    
    async toggleFavorite(answerId) {
        return await momApiRequest('/mom/answers/toggle-favorite/', {
            method: 'POST',
            body: { answer_id: answerId }
        });
    },
    
    async submitThanks(answerId, content) {
        return await momApiRequest('/mom/answers/thanks/', {
            method: 'POST',
            body: { answer_id: answerId, content: content }
        });
    },
    
    async getQuestionDetail(questionId) {
        return await momApiRequest(`/mom/questions/${questionId}/`);
    },
    
    async getAnswers(questionId) {
        console.log('MomAPI.getAnswers called with questionId:', questionId);
        const result = await momApiRequest(`/mom/questions/${questionId}/answers/`);
        console.log('MomAPI.getAnswers result:', result);
        return result;
    },
    
    async getUserInteractions(questionId) {
        return await momApiRequest(`/mom/questions/${questionId}/interactions/`);
    },

    async unlikeAnswer(answerId) {
        return await momApiRequest('/mom/answers/unlike/', {
            method: 'DELETE',
            body: { answer_id: answerId }
        });
    },

    async favoriteAnswer(answerId) {
        return await momApiRequest('/mom/answers/favorite/', {
            method: 'POST',
            body: { answer_id: answerId }
        });
    },
    
    async getFavorites(queryParams = '') {
        const url = queryParams ? `/mom/favorites/?${queryParams}` : '/mom/favorites/';
        return await momApiRequest(url);
    },
    
    // 感谢信
    async sendThankLetter(letterData) {
        return await momApiRequest('/mom/thank-letters/send/', {
            method: 'POST',
            body: letterData
        });
    },
    
    // 获取我的感谢信列表
    async getThankLetters(page = 1, pageSize = 10) {
        return await momApiRequest(`/mom/thank-letters/my/?page=${page}&page_size=${pageSize}`, {
            method: 'GET'
        });
    },
    
    // 宝宝问题记录
    async recordBabyIssue(issueData) {
        return await momApiRequest('/mom/baby-issues/record/', {
            method: 'POST',
            body: issueData
        });
    },
    
    async getBabyIssues(page = 1, pageSize = 10) {
        return await momApiRequest(`/mom/baby-issues/?page=${page}&page_size=${pageSize}`);
    },
    
    // 问题标签
    async getQuestionTags() {
        return await momApiRequest('/mom/question-tags/');
    }
};

// 导出API对象
window.MomAPI = MomAPI;
