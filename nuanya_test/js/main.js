// --- 配置与通用工具 ---
const API_BASE = (window.location && window.location.port === '8000') ? '' : 'http://127.0.0.1:8000'
const JSON_HEADERS = { 'Content-Type': 'application/json' }

// --- 页面特定逻辑辅助 ---

// 加载我的收藏列表
async function loadCollections() {
    const listContainer = document.getElementById('collectionsList');
    if (!listContainer) return;
    listContainer.innerHTML = '<div class="loading-state">加载中...</div>';
    
    try {
        console.log('Fetching collections from:', `${API_BASE}/api/users/me/favorites`);
        const json = await apiGet('/api/users/me/favorites');
        console.log('Collections API response:', json);
        
        if (json.code === 200 && Array.isArray(json.data)) {
            renderCollections(json.data);
        } else {
            throw new Error(json.message || '加载失败');
        }
    } catch (e) {
        console.error('loadCollections error:', e);
        listContainer.innerHTML = `
            <div class="empty-state">
                <p>加载收藏失败：${e.message}</p>
            </div>
        `;
    }
}

function renderCollections(favorites) {
    const listContainer = document.getElementById('collectionsList');
    if (!listContainer) return;

    if (!favorites || favorites.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <p>还没有收藏过任何内容</p>
            </div>
        `;
        return;
    }

    const html = favorites.map((fav, idx) => {
        const createTime = new Date(fav.create_time).toLocaleDateString('zh-CN');
        const title = fav.question_title || '未指定问题';
        const answerText = fav.answer_text || '无内容';
        return `
            <div class="question-card collection-card" data-idx="${idx}" data-title="${title.replace(/"/g, '&quot;')}" data-answer="${answerText.replace(/"/g, '&quot;')}">
                <div class="card-header">
                    <span class="category-tag">收藏</span>
                </div>
                <p class="question-title">${title}</p>
                <div class="answer-text" data-analyze="1">${answerText}</div>
                <p class="card-footer">回答人：${fav.mom_name || '匿名'} · 收藏时间：${createTime}</p>
            </div>
        `;
    }).join('');

    listContainer.innerHTML = html;

    // 老人端收藏：已有回答用“静态预置分析”，新内容才现场分析
    if (window.ExperienceAnalyzer) {
        listContainer.querySelectorAll('.answer-text[data-analyze="1"]').forEach(el => {
            const text = el.textContent || '';
            window.ExperienceAnalyzer.renderCompactInto(el, text, '育儿/健康经验');
        });
    }

    // 老人端收藏：点击卡片查看完整版分析
    listContainer.querySelectorAll('.collection-card').forEach(card => {
        card.addEventListener('click', () => {
            const title = card.getAttribute('data-title') || '收藏详情';
            const text = card.getAttribute('data-answer') || '';
            openAnalysisDetailModal(title, text);
        });
    });
}

function openAnalysisDetailModal(title, text) {
    const modal = document.getElementById('analysisDetailModal');
    const titleEl = document.getElementById('analysisDetailTitle');
    const bodyEl = document.getElementById('analysisDetailBody');
    if (!modal || !titleEl || !bodyEl) return;

    titleEl.textContent = title || '收藏详情';
    bodyEl.innerHTML = '<div class="loading-state">加载中...</div>';
    modal.style.display = 'flex';

    if (window.ExperienceAnalyzer) {
        window.ExperienceAnalyzer.renderInto(bodyEl, text || '', '育儿/健康经验');
    } else {
        bodyEl.textContent = text || '';
    }
}

function closeAnalysisDetailModal() {
    const modal = document.getElementById('analysisDetailModal');
    if (modal) modal.style.display = 'none';
}

// 加载我的回答列表
async function loadMyAnswers() {
    const listContainer = document.getElementById('myAnswersList');
    listContainer.innerHTML = '<div class="loading-state">加载中...</div>';
    
    try {
        console.log('Fetching my answers from:', `${API_BASE}/api/users/me/answers`);
        const json = await apiGet('/api/users/me/answers');
        console.log('My answers API response:', json);
        
        if (json.code === 200 && Array.isArray(json.data)) {
            renderMyAnswers(json.data);
        } else {
            throw new Error(json.message || '加载失败');
        }
    } catch (e) {
        console.error('loadMyAnswers error:', e);
        const fallbackFromDb = (window.MockDB && Array.isArray(window.MockDB.answers) && window.MockDB.answers.length)
            ? window.MockDB.answers.map(a => ({
                ...a,
                question: a && a.question ? a.question : { title: '未知问题', category: '' }
            }))
            : null;

        if (fallbackFromDb) {
            renderMyAnswers(fallbackFromDb);
            return;
        }

        // 使用模拟数据作为后备：老人回答的育儿问题
        const mockData = [
            {
                id: 1,
                question: {
                    id: 101,
                    title: "宝宝不爱吃辅食怎么办？",
                    category: "饮食健康"
                },
                answer_text: "可以尝试改变辅食的形状和颜色，吸引宝宝的注意力。另外，大人在旁边吃得津津有味也能激发宝宝的食欲。",
                create_time: "2023-10-01T10:00:00.000000",
                voice_record_id: 101
            },
            {
                id: 2,
                question: {
                    id: 102,
                    title: "宝宝频繁夜醒怎么处理？",
                    category: "睡眠问题"
                },
                answer_text: "白天尽量让宝宝多活动，消耗精力。睡前建立固定的安抚程序，比如洗个温水澡、听轻柔的音乐，慢慢减少夜奶次数。",
                create_time: "2023-10-02T11:00:00.000000",
                voice_record_id: null
            },
            {
                id: 3,
                question: {
                    id: 103,
                    title: "如何正确给新生儿剪指甲？",
                    category: "日常护理"
                },
                answer_text: "最好在宝宝熟睡的时候剪，用婴儿专用的指甲剪。剪完后记得用小锉刀把边缘磨平，免得宝宝抓伤自己。",
                create_time: "2023-10-03T15:00:00.000000",
                voice_record_id: 102
            }
        ];
        renderMyAnswers(mockData);
    }
}

function renderMyAnswers(answers) {
    const listContainer = document.getElementById('myAnswersList');
    
    if (!answers || answers.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
                <p>还没有回答过问题</p>
                <p>去问答广场看看吧</p>
            </div>
        `;
        return;
    }
    
    const html = answers.map(answer => {
        const q = (answer && answer.question) ? answer.question : {};
        const questionTitle = (q && q.title) ? q.title : (answer.question_title || '未知问题');
        const questionCategory = (q && q.category) ? q.category : (answer.category || '');
        const answerText = answer.answer_text || answer.content || '';
        const createTime = new Date(answer.create_time || answer.created_at || Date.now()).toLocaleDateString('zh-CN');
        
        return `
            <div class="answer-item">
                <div class="answer-question-title">${questionTitle}</div>
                <div class="answer-question-category">${questionCategory}</div>
                <div class="answer-text" data-analyze="1">${answerText}</div>
                <div class="answer-meta">
                    <span class="answer-time">${createTime}</span>
                </div>
            </div>
        `;
    }).join('');
    
    listContainer.innerHTML = html;

    if (window.ExperienceAnalyzer) {
        listContainer.querySelectorAll('.answer-text[data-analyze="1"]').forEach(el => {
            const text = el.textContent || '';
            window.ExperienceAnalyzer.renderInto(el, text, '育儿/健康经验');
        });
    }
}

async function loadMyQuestions() {
    const listContainer = document.getElementById('myQuestionsList');
    if (!listContainer) return;
    listContainer.innerHTML = '<div class="loading-state">加载中...</div>';

    try {
        console.log('Fetching my questions from:', `${API_BASE}/api/users/me/questions`);
        const json = await apiGet('/api/users/me/questions');
        console.log('My questions API response:', json);

        if (json.code === 200 && Array.isArray(json.data) && json.data.length > 0) {
            renderMyQuestions(json.data);
        } else {
            // 如果接口没有返回数据，使用MockDB中的默认提问（健康相关问题）
            const defaultQuestions = window.MockDB ? window.MockDB.elderQuestions : [
                { id: 1, title: '血压高早上起来头晕怎么办？', content: '我最近早上起来总是觉得头晕目眩，量了下血压有点高，平时饮食上需要注意些什么呢？', category: '健康养生', create_time: '2023-09-15T11:00:00' },
                { id: 2, title: '晚上经常失眠，睡不好觉怎么调理？', content: '年纪大了，晚上翻来覆去睡不着，有什么好的调理方法或者安神的食物推荐吗？', category: '睡眠健康', create_time: '2023-09-16T14:20:00' }
            ];
            renderMyQuestions(defaultQuestions);
        }
    } catch (e) {
        console.error('loadMyQuestions error:', e);
        // 出错时也使用默认数据
        const defaultQuestions = window.MockDB ? window.MockDB.elderQuestions : [
            { id: 1, title: '血压高早上起来头晕怎么办？', content: '我最近早上起来总是觉得头晕目眩，量了下血压有点高，平时饮食上需要注意些什么呢？', category: '健康养生', create_time: '2023-09-15T11:00:00' },
            { id: 2, title: '晚上经常失眠，睡不好觉怎么调理？', content: '年纪大了，晚上翻来覆去睡不着，有什么好的调理方法或者安神的食物推荐吗？', category: '睡眠健康', create_time: '2023-09-16T14:20:00' }
        ];
        renderMyQuestions(defaultQuestions);
    }
}

function renderMyQuestions(questions) {
    const listContainer = document.getElementById('myQuestionsList');
    if (!listContainer) return;

    if (!questions || questions.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p>还没有提出过问题</p>
            </div>
        `;
        return;
    }

    const html = questions.map(q => {
        const createTime = new Date(q.create_time).toLocaleDateString('zh-CN');
        return `
            <div class="question-card my-question-card" data-qid="${q.id}">
                <div class="card-header"><span class="category-tag">老人问题</span></div>
                <p class="question-title">${q.title || ''}</p>
                <p class="question-snippet">${q.content || ''}</p>
                <p class="card-footer">发布时间：${createTime} · 点击查看回答分析</p>
            </div>
        `;
    }).join('');

    listContainer.innerHTML = html;
    listContainer.querySelectorAll('.my-question-card').forEach(card => {
        card.addEventListener('click', () => {
            const qid = Number(card.getAttribute('data-qid') || 0);
            if (qid) openMyQuestionAnswersModal(qid);
        });
    });
}

function openMyQuestionAnswersModal(questionId) {
    const modal = document.getElementById('analysisDetailModal');
    const titleEl = document.getElementById('analysisDetailTitle');
    const bodyEl = document.getElementById('analysisDetailBody');
    if (!modal || !titleEl || !bodyEl) return;

    const q = (window.MockDB && Array.isArray(window.MockDB.elderQuestions))
        ? window.MockDB.elderQuestions.find(x => Number(x.id) === Number(questionId))
        : null;
    titleEl.textContent = q ? `我的提问：${q.title}` : '我的提问详情';
    bodyEl.innerHTML = '<div class="loading-state">加载回答中...</div>';
    modal.style.display = 'flex';

    const answers = (window.MockDB && Array.isArray(window.MockDB.answers))
        ? window.MockDB.answers.filter(a => Number(a.question_id) === Number(questionId))
        : [];

    if (!answers.length) {
        bodyEl.innerHTML = '<div class="empty-state"><p>暂无回答</p></div>';
        return;
    }

    bodyEl.innerHTML = answers.map((a, idx) => `
        <div class="question-card" style="margin-bottom:12px;">
            <div class="card-header"><span class="category-tag">回答 ${idx + 1}</span></div>
            <p class="question-snippet">${a.answer_text || a.content || ''}</p>
            <div class="analysis-full-item" data-idx="${idx}">AI分析中...</div>
        </div>
    `).join('');

    if (window.ExperienceAnalyzer) {
        const blocks = bodyEl.querySelectorAll('.analysis-full-item');
        blocks.forEach((el, idx) => {
            const txt = answers[idx] ? (answers[idx].answer_text || answers[idx].content || '') : '';
            window.ExperienceAnalyzer.renderInto(el, txt, '老人健康经验');
        });
    }
}

function updateNotificationSection(enabled) {
    const section = document.getElementById('notificationsSection');
    if (!section) return;
    section.style.display = enabled ? 'block' : 'none';
}

function markNotificationRead(id) {
    notificationsData = notificationsData.map(n => n.id === id ? { ...n, unread: false } : n);
    renderNotifications();
}

// 渲染通知列表
function renderNotifications() {
    const container = document.getElementById('notificationList');
    if (!container) return;

    container.innerHTML = notificationsData.map(n => `
        <div class="notification-item ${n.unread ? 'unread' : ''}" data-id="${n.id}">
            <div class="notification-dot"></div>
            <div class="notification-content">
                <div class="notification-header">
                    <span class="notification-title">${n.title}</span>
                    <span class="notification-time">${n.time}</span>
                </div>
                <div class="notification-text">${n.content}</div>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.notification-item').forEach(item => {
        item.onclick = () => {
            const id = Number(item.getAttribute('data-id'));
            const notification = notificationsData.find(n => n.id === id);
            if (notification) {
                alert(`${notification.title}\n\n${notification.content}\n\n${notification.time}`);
                markNotificationRead(id);
            }
        };
    });
}

// --- Mock DB ---
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
    ],
    badges: [
        { id: 1, name: '首次回答', description: '发表第一个育儿问答即可获得' },
        { id: 2, name: '经验丰富', description: '累计回答30个问题可获得' },
        { id: 3, name: '分享达人', description: '连续7天提交回答可获得' }
    ],
    myBadges: [
        { id: 1, name: '首次回答', description: '发表第一个育儿问答即可获得' },
        { id: 2, name: '经验丰富', description: '累计回答30个问题可获得' }
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
                elderThankLetters: this.elderThankLetters,
                badges: this.badges,
                myBadges: this.myBadges
            };
            localStorage.setItem('nuanya_mock_db_v7', JSON.stringify(dataToSave));
        },
        generateId: function() {
            return Math.floor(Math.random() * 1000000);
        }
    };
})();

async function apiGet(path) {
    console.log('Mock API GET:', path);
    if (path.includes('/api/users/me/favorites')) {
        return { code: 200, data: window.MockDB.elderFavorites };
    }
    if (path.includes('/api/users/me/answers')) {
        return { code: 200, data: window.MockDB.answers };
    }
    if (path.includes('/api/users/me/questions')) {
        // 老人端“我的提问”应展示老人健康问题
        return { code: 200, data: window.MockDB.elderQuestions };
    }
    if (path.includes('/api/elder/questions/unanswered') || path.includes('/api/questions/unanswered')) {
        return { code: 200, data: window.MockDB.momQuestions };
    }
    if (path.includes('/api/user/profile')) {
        return { code: 200, data: window.MockDB.profile };
    }
    if (path.includes('/api/settings')) {
        return { code: 200, data: window.MockDB.settings };
    }
    if (path.includes('/api/users/me/badges')) {
        return { code: 200, data: DEFAULT_DB.myBadges };
    }
    if (path.includes('/api/badges') && !path.includes('/api/users/me/badges')) {
        return { code: 200, data: DEFAULT_DB.badges };
    }
    if (path.includes('/api/users/me/thank_letters') || path.includes('/api/thank-letters')) {
        return { code: 200, data: window.MockDB.elderThankLetters };
    }
    return { code: 404, message: 'Not found' };
}

async function apiPost(path, body) {
    console.log('Mock API POST:', path, body);
    if (path.includes('/api/voice/summary') || path.includes('/api/voice/transcript')) {
        try {
            const response = await fetch(`${API_BASE}${path}`, {
                method: 'POST',
                headers: JSON_HEADERS,
                body: JSON.stringify(body || {})
            });
            const json = await response.json();
            return json;
        } catch (error) {
            console.error('Voice API POST failed:', error);
            if (path.includes('/api/voice/transcript')) {
                return { code: 500, message: '语音识别接口调用失败', data: { text: '' } };
            }
            return { code: 500, message: 'AI总结接口调用失败', data: { summary: '' } };
        }
    }
    if (path.includes('/api/mom/questions/ask/')) {
        const newQ = {
            id: window.MockDB.generateId(),
            title: body.title,
            content: body.content,
            category: body.category,
            create_time: new Date().toISOString(),
            answers: []
        };
        window.MockDB.elderQuestions.unshift(newQ);
        window.MockDB.myQuestions.unshift(newQ);
        window.MockDB.save();
        // Refresh UI
        questionsLoaded = false;
        if (typeof fetchQuestionsAndRender === 'function') fetchQuestionsAndRender();
        if (typeof loadMyQuestions === 'function') loadMyQuestions();
        return { success: true, code: 200, data: newQ };
    }
    if (path.includes('/api/answers')) {
        const q = window.MockDB.momQuestions.find(q => q.id === body.question_id) || window.MockDB.elderQuestions.find(q => q.id === body.question_id);
        const qMeta = q ? { id: q.id, title: q.title, category: q.category } : { id: body.question_id, title: '未知问题', category: '' };
        const ans = {
            id: window.MockDB.generateId(),
            question_id: body.question_id,
            answer_text: body.answer_text,
            create_time: new Date().toISOString(),
            question: qMeta
        };
        window.MockDB.answers.unshift(ans);
        if (q && q.answers) {
            q.answers.push({
                id: ans.id,
                question_id: ans.question_id,
                answer_text: ans.answer_text,
                create_time: ans.create_time,
                question: { ...qMeta }
            });
        }
        window.MockDB.save();
        return { code: 200, success: true, data: ans };
    }
    if (path.includes('/api/voice/transcript')) {
        return { code: 200, data: { text: "这是一个模拟的语音转文字结果，实际上您在演示版本中不需要真正的录音。您刚才提到了一些育儿相关的问题。" } };
    }
    if (path.includes('/api/voice/summary')) {
        return { code: 200, data: { summary: "模拟总结：用户遇到育儿问题，需要建议。" } };
    }
    return { code: 200, success: true, data: {} };
}

async function apiPut(path, body) {
    console.log('Mock API PUT:', path, body);
    if (path.includes('/api/settings')) {
        window.MockDB.settings = { ...window.MockDB.settings, ...body };
        window.MockDB.save();
        return { code: 200, data: window.MockDB.settings };
    }
    return { code: 200, data: {} };
}

async function apiUpload(path, formData) {
    try {
        const response = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            body: formData
        });
        const json = await response.json();
        return json;
    } catch (error) {
        console.error('Voice API UPLOAD failed:', error);
        return {
            code: 500,
            message: '语音上传接口调用失败',
            data: {
                file_url: '',
                transcript: '',
                summary: ''
            }
        };
    }
}

// --- 数据和状态 ---
let questionsData = [];
let questionsLoaded = false; // 标记问题数据是否已加载
let thankLettersData = []; // 感谢信数据
let thankLettersLoaded = false; // 标记感谢信数据是否已加载
let notificationsData = [
    { id: 1, title: '恭喜！您的回答被设为最佳', content: '您关于“宝宝不爱吃辅食怎么办？”的回答被采纳了。', time: '10分钟前', unread: true },
    { id: 2, title: '收到一封新的感谢信', content: '张妈妈给您发来了一封感谢信，快去看看吧。', time: '1小时前', unread: true },
    { id: 3, title: '获得新勋章：暖心长辈', content: '由于您累计帮助了5位妈妈，获得了此勋章。', time: '昨天', unread: false }
];
// 移除模拟感谢信数据：如后端提供接口可接入；当前展示为空状态
let recordingState = 'idle', timerInterval = null, seconds = 0;
let currentSlide = 0;
let currentQuestion = null;
let lastVoiceFileUrl = null;
let lastTranscriptText = '';
let lastSummaryText = '';
let selectedExpertiseTags = []; // 用户选择的擅长领域标签

function loadSelectedExpertiseTags() {
    try {
        const raw = localStorage.getItem('selectedExpertiseTags');
        const parsed = raw ? JSON.parse(raw) : [];
        selectedExpertiseTags = Array.isArray(parsed) ? parsed : [];
    } catch {
        selectedExpertiseTags = [];
    }
}

// --- 导航逻辑 ---
const pages = document.querySelectorAll('.page');
const bottomNav = document.getElementById('bottomNav');
const navItems = document.querySelectorAll('.nav-item');

function navigateTo(pageId, data = {}) {
    console.log('导航到页面:', pageId, data);
    
    // 检查目标页面是否存在
    const targetPage = document.getElementById(pageId);
    if (!targetPage) {
        console.error('目标页面不存在:', pageId);
        showToast('页面不存在');
        return;
    }
    
    // 隐藏所有页面
    pages.forEach(page => page.classList.remove('active'));
    
    // 显示目标页面
    targetPage.classList.add('active');
    console.log('页面切换成功:', pageId);

    // 处理底部导航栏显示
    if (['page-home', 'page-collections', 'page-honor', 'page-profile'].includes(pageId)) {
        if (bottomNav) bottomNav.style.display = 'flex';
        navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.page === pageId);
        });
    } else {
        if (bottomNav) bottomNav.style.display = 'none';
    }

    // 页面特定的初始化逻辑
    if (pageId === 'page-answer-detail') {
        loadQuestionDetail(data.question_id || (currentQuestion && currentQuestion.id));
    }
    
    if (pageId === 'page-login') {
        const phoneInput = document.getElementById('phoneInput');
        const loginBtn = document.getElementById('loginBtn');
        if(phoneInput) phoneInput.value = '';
        if(loginBtn) loginBtn.disabled = true;
    }

    if (pageId === 'page-home') {
        const savedMode = localStorage.getItem('nuanya:qa_mode') || 'answer';
        setQaMode(savedMode, true);
        if (savedMode === 'answer') fetchQuestionsAndRender();
    }
    
    if (pageId === 'page-profile') {
        loadProfileAndSettings();
    }
    
    if (pageId === 'page-honor') {
        loadHonorBadges();
        loadThankLetters();
    }
    
    if (pageId === 'page-collections') {
        loadCollections();
    }
    
    // 添加我的回答页面处理
    if (pageId === 'page-my-answers') {
        loadMyAnswers();
    }

    if (pageId === 'page-my-questions') {
        loadMyQuestions();
    }
}

// --- 页面专属逻辑 ---

function setQaMode(mode, skipSave = false) {
    const answerBtn = document.getElementById('qa-btn-answer');
    const askBtn = document.getElementById('qa-btn-ask');
    const answerContent = document.getElementById('qa-answer-content');
    const askContent = document.getElementById('qa-ask-content');
    if (!answerBtn || !askBtn || !answerContent || !askContent) return;

    const targetMode = mode === 'ask' ? 'ask' : 'answer';
    answerBtn.classList.toggle('active', targetMode === 'answer');
    askBtn.classList.toggle('active', targetMode === 'ask');
    answerContent.style.display = targetMode === 'answer' ? 'block' : 'none';
    askContent.style.display = targetMode === 'ask' ? 'block' : 'none';

    if (!skipSave) localStorage.setItem('nuanya:qa_mode', targetMode);
    if (targetMode === 'ask') resetAskVoiceUI();
    if (targetMode === 'answer') fetchQuestionsAndRender();
}

let askMediaRecorder = null;
let askAudioChunks = [];
let askRecordingState = 'idle';
let askTimerInterval = null;
let askSeconds = 0;
let askVoiceFileUrl = null;
let askTranscriptText = '';
let askTranscriptInterim = '';
let askSummaryText = '';
let askSpeechRecognition = null;

if ('webkitSpeechRecognition' in window) {
    askSpeechRecognition = new webkitSpeechRecognition();
    askSpeechRecognition.continuous = true;
    askSpeechRecognition.interimResults = true;
    askSpeechRecognition.lang = 'zh-CN';
    askSpeechRecognition.onresult = function(event) {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                askTranscriptText += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        askTranscriptInterim = interimTranscript;
        const originalEl = document.getElementById('askOriginalText');
        if (originalEl) originalEl.textContent = askTranscriptText + interimTranscript;
    };
}

function resetAskVoiceUI() {
    askVoiceFileUrl = null;
    askTranscriptText = '';
    askSummaryText = '';

    const wrapper = document.getElementById('askSummaryWrapper');
    const loading = document.getElementById('askAiLoading');
    const results = document.getElementById('askAiResults');
    if (wrapper) wrapper.classList.remove('visible');
    if (loading) loading.style.display = 'block';
    if (results) results.style.display = 'none';

    const orig = document.getElementById('askOriginalText');
    const refined = document.getElementById('askRefinedText');
    if (orig) orig.textContent = '';
    if (refined) refined.innerHTML = '';

    askRecordingState = 'idle';
    updateAskRecordingUI('idle');
    stopAskTimer();
}

async function startAskRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true
            }
        });

        let mimeType = 'audio/wav';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/webm;codecs=opus';
        }

        askMediaRecorder = new MediaRecorder(stream, { mimeType });
        askAudioChunks = [];

        askMediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) askAudioChunks.push(event.data);
        };

        askMediaRecorder.onstart = () => {
            askRecordingState = 'recording';
            updateAskRecordingUI('recording');
            startAskTimer();
            if (askSpeechRecognition) {
                askTranscriptText = '';
                try { askSpeechRecognition.start(); } catch(e) {}
            }
        };

        askMediaRecorder.onstop = async () => {
            askRecordingState = 'stopped';
            updateAskRecordingUI('stopped');
            stopAskTimer();
            if (askSpeechRecognition) {
                try { askSpeechRecognition.stop(); } catch(e) {}
            }

            // 合并 final + interim，降低“说话很短导致没识别”的概率
            const merged = `${askTranscriptText || ''}${askTranscriptInterim || ''}`.trim();
            if (merged) {
                askTranscriptText = merged;
                askTranscriptInterim = '';
            }

            const audioBlob = new Blob(askAudioChunks, { type: mimeType });
            const wrapper = document.getElementById('askSummaryWrapper');
            const loading = document.getElementById('askAiLoading');
            const results = document.getElementById('askAiResults');
            if (wrapper) wrapper.classList.add('visible');
            if (loading) loading.style.display = 'block';
            if (results) results.style.display = 'none';

            await uploadAskVoiceFile(audioBlob);
        };

        askMediaRecorder.start();
    } catch (error) {
        console.error('无法访问麦克风:', error);
        showToast('无法访问麦克风，请检查权限');
    }
}

function stopAskRecording() {
    if (askMediaRecorder && askRecordingState === 'recording') {
        askMediaRecorder.stop();
        askMediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
}

function updateAskRecordingUI(state) {
    const recordBtn = document.getElementById('askRecordBtn');
    const statusText = document.getElementById('askStatusText');
    const instructions = document.getElementById('askInstructions');
    const progress = document.getElementById('askRecordingProgress');
    const fill = document.getElementById('askProgressFill');
    const timer = document.getElementById('askRecordingTimer');
    const micIcon = document.getElementById('ask-mic-icon');
    const stopIcon = document.getElementById('ask-stop-icon');

    if (!recordBtn || !statusText || !instructions || !progress || !fill || !timer || !micIcon || !stopIcon) return;

    if (state === 'idle') {
        recordBtn.className = 'record-button idle';
        micIcon.style.display = 'block';
        stopIcon.style.display = 'none';
        statusText.textContent = '';
        instructions.textContent = '点击按钮，开始说出您的问题';
        progress.style.display = 'none';
        fill.style.width = '0%';
        timer.textContent = '00:00';
    } else if (state === 'recording') {
        recordBtn.className = 'record-button recording';
        micIcon.style.display = 'none';
        stopIcon.style.display = 'block';
        statusText.textContent = '正在录音中...';
        instructions.textContent = '再次点击按钮停止录音';
        progress.style.display = 'block';
    } else if (state === 'stopped') {
        recordBtn.className = 'record-button idle';
        micIcon.style.display = 'block';
        stopIcon.style.display = 'none';
        statusText.textContent = '录音已完成，正在处理...';
        instructions.textContent = '正在上传和识别您的语音';
        progress.style.display = 'none';
    }
}

function startAskTimer() {
    const timer = document.getElementById('askRecordingTimer');
    const fill = document.getElementById('askProgressFill');
    const maxDuration = 120;

    askSeconds = 0;
    stopAskTimer();
    askTimerInterval = setInterval(() => {
        askSeconds++;
        const minutes = Math.floor(askSeconds / 60);
        const remainingSeconds = askSeconds % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;

        if (timer) timer.textContent = timeString;
        if (fill) {
            const progress = Math.min((askSeconds / maxDuration) * 100, 100);
            fill.style.width = `${progress}%`;
        }
        if (askSeconds >= maxDuration) stopAskRecording();
    }, 1000);
}

function stopAskTimer() {
    if (askTimerInterval) {
        clearInterval(askTimerInterval);
        askTimerInterval = null;
    }
}

async function uploadAskVoiceFile(audioBlob) {
    try {
        const loading = document.getElementById('askAiLoading');
        const results = document.getElementById('askAiResults');
        const originalEl = document.getElementById('askOriginalText');
        const refinedEl = document.getElementById('askRefinedText');

        const transcript = (askTranscriptText || '').trim();
        if (!transcript) {
            throw new Error('未识别到语音内容（可能声音过小、语速过快或环境噪音较大）');
        }

        // 1) 先展示转写文本
        if (originalEl) originalEl.textContent = transcript;

        // 2) 仅做“简单问题总结”（提问模块不做经验分析）
        askSummaryText = '';
        const askSummarizer = (window.NuanyaDeepseek && (
            (typeof window.NuanyaDeepseek.summarizeElderQuestion === 'function' && window.NuanyaDeepseek.summarizeElderQuestion) ||
            (typeof window.NuanyaDeepseek.summarizeAskQuestion === 'function' && window.NuanyaDeepseek.summarizeAskQuestion) ||
            (typeof window.NuanyaDeepseek.summarize === 'function' && window.NuanyaDeepseek.summarize)
        )) || null;

        if (askSummarizer) {
            try {
                const raw = await askSummarizer(transcript);
                askSummaryText = String(raw || '').replace(/\s+/g, ' ').trim();
            } catch {
                askSummaryText = transcript;
            }
        } else {
            askSummaryText = transcript;
        }

        askSummaryText = (askSummaryText || '').replace(/^问题总结[:：]\s*/g, '').trim();
        if (askSummaryText) {
            askSummaryText = askSummaryText.split(/\n+/).map(s => s.trim()).filter(Boolean)[0] || askSummaryText;
            askSummaryText = askSummaryText.replace(/[。！!]+$/g, '');
            if (!/[？?]$/.test(askSummaryText)) askSummaryText = `${askSummaryText}？`;
        } else {
            const fallback = transcript.substring(0, 30) + (transcript.length > 30 ? "..." : "");
            askSummaryText = `我想咨询：${fallback}？`;
        }

        if (askSummaryText.length > 38) {
            const head = askSummaryText.slice(0, 37).replace(/[？?]$/g, '');
            askSummaryText = `${head}...？`;
        }
        if (refinedEl) {
            refinedEl.innerHTML = `<p>${askSummaryText}</p>`;
        }

        // 3) 最后尝试上传（失败不影响展示/提问）
        let finalBlob = audioBlob;
        if (!audioBlob.type.includes('wav') && typeof convertToWav === 'function') {
            finalBlob = await convertToWav(audioBlob);
        }
        const formData = new FormData();
        formData.append('file', finalBlob, 'recording.wav');
        try {
            const up = await apiUpload('/api/voice/upload_transcribe_summarize', formData);
            if (up && up.code === 200) askVoiceFileUrl = up.data.file_url || '';
        } catch (e) {
            console.warn('语音提问上传失败（不影响分析展示）:', e);
        }

        if (loading) loading.style.display = 'none';
        if (results) results.style.display = 'block';
        askRecordingState = 'idle';
        updateAskRecordingUI('idle');
    } catch (error) {
        console.error('语音上传错误:', error);
        const loading = document.getElementById('askAiLoading');
        const results = document.getElementById('askAiResults');
        if (loading) loading.style.display = 'none';
        if (results) results.style.display = 'block';

        const originalEl = document.getElementById('askOriginalText');
        const refinedEl = document.getElementById('askRefinedText');
        if (originalEl) originalEl.textContent = '语音处理失败，请重新录制';
        if (refinedEl) {
            const msg = (error && error.message) ? error.message : '未知错误';
            if (msg.includes('未识别到语音')) {
                refinedEl.innerHTML = `<p>${msg}</p><p>建议：靠近麦克风、提高音量、减少环境噪音后重试。</p>`;
            } else {
                refinedEl.innerHTML = `<p>处理失败：${msg}</p>`;
            }
        }

        askRecordingState = 'idle';
        updateAskRecordingUI('idle');
    }
}

async function submitAskByVoice() {
    const categorySelect = document.getElementById('askCategorySelectVoice');
    const category = (categorySelect && categorySelect.value ? categorySelect.value : '').trim();
    const content = askTranscriptText || '';
    const titleSource = (askSummaryText || '').trim() || content;
    const title = titleSource.length > 18 ? `${titleSource.slice(0, 18)}...` : titleSource;

    if (!content) {
        showToast('请先录一段语音');
        return;
    }

    try {
        const payload = {
            title: title || '语音提问',
            category: category || '健康养生',
            content,
            tags: []
        };
        const json = await apiPost('/api/mom/questions/ask/', payload);
        if (json && json.success) {
            showToast('提问成功');
            resetAskVoiceUI();
            setQaMode('answer');
        } else {
            throw new Error((json && json.message) || '提问失败');
        }
    } catch (e) {
        showToast(`提问失败：${e.message}`);
    }
}

function openAskModal() {
    const modal = document.getElementById('askModal');
    if (!modal) return;
    modal.style.display = 'flex';
    const titleInput = document.getElementById('askTitleInput');
    if (titleInput) titleInput.focus();
}

function closeAskModal() {
    const modal = document.getElementById('askModal');
    if (!modal) return;
    modal.style.display = 'none';
}

async function submitAsk() {
    const titleInput = document.getElementById('askTitleInput');
    const categorySelect = document.getElementById('askCategorySelect');
    const contentInput = document.getElementById('askContentInput');
    const title = (titleInput && titleInput.value ? titleInput.value : '').trim();
    const category = (categorySelect && categorySelect.value ? categorySelect.value : '').trim();
    const content = (contentInput && contentInput.value ? contentInput.value : '').trim();

    if (!title) {
        showToast('请先填写标题');
        return;
    }

    try {
        const payload = {
            title,
            category,
            content,
            tags: []
        };
        const json = await apiPost('/api/mom/questions/ask/', payload);
        if (json && json.success) {
            showToast('提问成功');
            closeAskModal();
            if (titleInput) titleInput.value = '';
            if (contentInput) contentInput.value = '';
            setQaMode('answer');
        } else {
            throw new Error((json && json.message) || '提问失败');
        }
    } catch (e) {
        showToast(`提问失败：${e.message}`);
    }
}

function readStorageJson(key, fallbackValue) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallbackValue;
        return JSON.parse(raw);
    } catch {
        return fallbackValue;
    }
}

function writeStorageJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {}
}

function pushMomNotification(notification) {
    const key = 'nuanya:mom_notifications';
    const list = readStorageJson(key, []);
    list.unshift(notification);
    writeStorageJson(key, list.slice(0, 50));
}

// 问答广场：加载数据并渲染
async function fetchQuestionsAndRender() {
    const listContainer = document.getElementById('questionList');
    
    // 如果数据已经加载过，直接渲染现有数据
    if (questionsLoaded && questionsData.length > 0) {
        console.log('Using cached questions data');
        renderQuestions();
        return;
    }
    
    // 清空容器并显示加载状态
    listContainer.innerHTML = '<div class="loading-state">加载中...</div>';
    
    try {
        console.log('Fetching questions from:', `${API_BASE}/api/elder/questions/unanswered`);
        const json = await apiGet('/api/elder/questions/unanswered');
        console.log('API response:', json);
        if (json.code === 200 && Array.isArray(json.data)) {
            questionsData = json.data;
            questionsLoaded = true; // 标记数据已加载
        } else {
            throw new Error(json.message || '加载失败');
        }
    } catch (e) {
        console.error('fetchQuestionsAndRender error:', e);
        questionsData = [];
        questionsLoaded = false;
        const err = document.createElement('div');
        err.textContent = '加载问题列表失败，请稍后重试。';
        listContainer.innerHTML = '';
        listContainer.appendChild(err);
        return;
    }

    renderQuestions();
}

// 渲染问题列表
function renderQuestions() {
    const listContainer = document.getElementById('questionList');
    listContainer.innerHTML = '';

    // 按“擅长领域”优先排序：匹配标签的题目排在前面
    const prioritized = [...questionsData].sort((a, b) => {
        const aHit = selectedExpertiseTags.includes(a.category) ? 1 : 0;
        const bHit = selectedExpertiseTags.includes(b.category) ? 1 : 0;
        if (aHit !== bHit) return bHit - aHit;
        const at = new Date(a.create_time || 0).getTime();
        const bt = new Date(b.create_time || 0).getTime();
        return bt - at;
    });

    prioritized.forEach((q, index) => {
        const cardLink = document.createElement('a');
        cardLink.className = 'question-card-link';
        cardLink.onclick = () => { currentQuestion = q; navigateTo('page-answer-detail', { question_id: q.id }); };

        const card = document.createElement('div');
        card.className = 'question-card';
        card.style.animationDelay = `${index * 0.05}s`;
        
        card.innerHTML = `
            <div class="card-header">
                <span class="category-tag">${q.category || ''}</span>
                ${selectedExpertiseTags.includes(q.category) ? '<span class="category-tag" style="margin-left:8px;background:#FEF3E2;color:#E59866;">推荐</span>' : ''}
            </div>
            <p class="question-title">${q.title || ''}</p>
            <p class="card-footer">发布时间：${(q.create_time || '').replace('T',' ').split('.')[0]}</p>
        `;
        cardLink.appendChild(card);
        listContainer.appendChild(cardLink);
    });
}

// 引导页逻辑
const slides = document.querySelectorAll('.slide');
const dotsContainer = document.getElementById('dotsContainer');
const onboardingBtn = document.getElementById('onboardingBtn');

function setupOnboarding() {
    dotsContainer.innerHTML = '';
    for (let i = 0; i < slides.length; i++) {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        dotsContainer.appendChild(dot);
    }
    updateOnboardingUI();
}

function updateOnboardingUI() {
    slides.forEach((slide, index) => {
        slide.style.display = index === currentSlide ? 'flex' : 'none';
    });
    const dots = dotsContainer.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
    });
    if (currentSlide === slides.length - 1) {
        onboardingBtn.textContent = '开启我的分享之旅';
    } else {
        onboardingBtn.textContent = '下一页';
    }
}

// 荣誉墙页面的Tab切换
function showHonorTab(tabName) {
    document.getElementById('btn-badges').classList.remove('active');
    document.getElementById('btn-letters').classList.remove('active');
    document.getElementById('honor-badges-content').style.display = 'none';
    document.getElementById('honor-letters-content').style.display = 'none';

    document.getElementById(`btn-${tabName}`).classList.add('active');
    document.getElementById(`honor-${tabName}-content`).style.display = 'block';
}

// 感谢信详情逻辑
const letterDetailOverlay = document.getElementById('letterDetailOverlay');
function showLetterDetail(letterId) {
    // 查找对应的感谢信数据
    const letter = thankLettersData.find(l => l.id === letterId);
    
    if (!letter) {
        console.error('未找到感谢信数据:', letterId);
        return;
    }
    
    // 隐藏图片元素（当前设计不包含图片）
    const photoEl = document.getElementById('letterDetailPhoto');
    if (photoEl) {
        photoEl.style.display = 'none';
    }
    
    // 显示感谢信内容
    const textEl = document.getElementById('letterDetailText');
    if (textEl) {
        textEl.innerHTML = `
            <div class="letter-detail-content">
                <h3>${letter.title}</h3>
                <div class="letter-content" style="margin: 15px 0; line-height: 1.6;">${letter.content}</div>
                <div class="letter-meta" style="font-size: 14px; color: #666; border-top: 1px dashed #eee; padding-top: 10px;">
                    <p><strong>来自：</strong>${letter.sender_name}（${letter.sender_relation}）</p>
                    <p><strong>收件人：</strong>${letter.recipient_expert || '我'}</p>
                    <p><strong>相关问题：</strong>${letter.question_title || letter.help_category || '无'}</p>
                    <p><strong>时间：</strong>${new Date(letter.create_time).toLocaleDateString('zh-CN')}</p>
                </div>
            </div>
        `;
    }
    
    // 显示弹窗
    letterDetailOverlay.classList.add('visible');
    setTimeout(() => { letterDetailOverlay.classList.add('open'); }, 10);
}
function closeLetterDetail() {
    letterDetailOverlay.classList.remove('open');
    setTimeout(() => {
        letterDetailOverlay.classList.remove('visible');
    }, 800);
}

// 回答详情页逻辑
function loadQuestionDetail(questionId) {
    const question = questionsData.find(q => q.id === questionId) || currentQuestion;
    if(question) {
        currentQuestion = question;
        document.getElementById('questionTitleDetail').textContent = question.title || '';
        document.getElementById('questionContentDetail').textContent = question.content || '';
        resetAnswerFlowUI();
    }
}

function resetAnswerFlowUI() {
    // 重置摘要区和录音状态，确保可重复录音/转写/分析
    lastVoiceFileUrl = null;
    lastTranscriptText = '';
    lastSummaryText = '';

    const summaryWrapper = document.getElementById('summaryWrapper');
    const aiLoading = document.getElementById('aiLoading');
    const aiResults = document.getElementById('aiResults');
    const uploadProgress = document.getElementById('uploadProgress');
    const uploadProgressText = document.getElementById('uploadProgressText');
    const uploadProgressBar = document.getElementById('uploadProgressBar');
    const origEl = document.querySelector('.original-text');
    const suggEl = document.querySelector('.refined-suggestions');

    if (summaryWrapper) {
        summaryWrapper.style.display = ''; // 清理 cancel 时写入的 none
        summaryWrapper.classList.remove('visible');
    }
    if (aiLoading) aiLoading.style.display = 'block';
    if (aiResults) aiResults.style.display = 'none';
    if (uploadProgress) uploadProgress.style.display = 'none';
    if (uploadProgressText) uploadProgressText.style.display = 'none';
    if (uploadProgressBar) uploadProgressBar.style.width = '0%';
    if (origEl) origEl.textContent = '';
    if (suggEl) suggEl.innerHTML = '';

    recordingState = 'idle';
    if (typeof updateRecordingUI === 'function') updateRecordingUI('idle');
}

// 个人中心：加载用户信息与设置
async function loadProfileAndSettings() {
    try {
        const me = await apiGet('/api/user/profile');
        if (me.code === 200 && me.data) {
            const d = me.data;
            document.querySelector('#page-profile .user-info .name').textContent = d.name || '共享育儿专家';
            document.querySelector('#page-profile .user-info .tag').textContent = `${d.role || '育儿专家'} · ${String(d.join_time || '').slice(0,10)} 加入`;
            const stats = document.querySelectorAll('#page-profile .stat-item .count');
            // 使用数据库中的真实数据
            if (stats[0]) stats[0].textContent = d.answer_count || 0;
            if (stats[1]) stats[1].textContent = d.like_count || 0;
            if (stats[2]) stats[2].textContent = d.help_count || 0;
        }
    } catch(e) {
        console.error('加载用户资料失败:', e);
        // 如果API调用失败，显示0而不是随机数据
        const stats = document.querySelectorAll('#page-profile .stat-item .count');
        if (stats[0]) stats[0].textContent = 0;
        if (stats[1]) stats[1].textContent = 0;
        if (stats[2]) stats[2].textContent = 0;
    }

    // 设置：声音提醒与消息通知
    try {
        const s = await apiGet('/api/settings');
        if (s.code === 200 && s.data) {
            const soundSwitch = document.getElementById('soundAlert');
            const notifSwitch = document.getElementById('messageNotification');
            if (soundSwitch) soundSwitch.checked = (s.data.sound === 'on');
            if (notifSwitch) notifSwitch.checked = (s.data.notification === 'on');
            updateNotificationSection(!notifSwitch || notifSwitch.checked);
            renderNotifications();
            if (soundSwitch) {
                soundSwitch.onchange = async () => {
                    await apiPut('/api/settings', { sound: soundSwitch.checked ? 'on' : 'off', notification: notifSwitch && notifSwitch.checked ? 'on' : 'off' });
                };
            }
            if (notifSwitch) {
                notifSwitch.onchange = async () => {
                    await apiPut('/api/settings', { sound: soundSwitch && soundSwitch.checked ? 'on' : 'off', notification: notifSwitch.checked ? 'on' : 'off' });
                    updateNotificationSection(notifSwitch.checked);
                };
            }
        }
    } catch(e) {}
}

// 设置弹窗相关函数
function showSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = 'flex';
    loadSettingsData();
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = 'none';
}

async function loadSettingsData() {
    try {
        const s = await apiGet('/api/settings');
        if (s.code === 200 && s.data) {
            const soundSwitch = document.getElementById('soundAlert');
            const notifSwitch = document.getElementById('messageNotification');
            if (soundSwitch) soundSwitch.checked = (s.data.sound === 'on');
            if (notifSwitch) notifSwitch.checked = (s.data.notification === 'on');
            updateNotificationSection(!notifSwitch || notifSwitch.checked);
            renderNotifications();
            if (soundSwitch) {
                soundSwitch.onchange = async () => {
                    await apiPut('/api/settings', { 
                        sound: soundSwitch.checked ? 'on' : 'off', 
                        notification: notifSwitch && notifSwitch.checked ? 'on' : 'off' 
                    });
                };
            }
            if (notifSwitch) {
                notifSwitch.onchange = async () => {
                    await apiPut('/api/settings', { 
                        sound: soundSwitch && soundSwitch.checked ? 'on' : 'off', 
                        notification: notifSwitch.checked ? 'on' : 'off' 
                    });
                    updateNotificationSection(notifSwitch.checked);
                };
            }
        }
    } catch(e) {
        console.error('加载设置失败:', e);
    }
}

function ensureSettingsSwitch(labelText, id) {
    // 在功能列表中确保存在两个设置项（声音提醒、消息通知）
    const list = document.querySelector('#page-profile .function-list');
    let item = document.getElementById(id);
    if (!item) {
        item = document.createElement('div');
        item.className = 'list-item';
        item.id = id;
        item.innerHTML = `
            <div class="item-left">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>
                <span>${labelText}</span>
            </div>
            <label class="switch"><input type="checkbox"><span class="slider"></span></label>
        `;
        list.insertBefore(item, list.firstChild);
    }
    return item.querySelector('input');
}

// 荣誉墙：加载徽章（已获与全部）
async function loadHonorBadges() {
    try {
        const all = await apiGet('/api/badges');
        const mine = await apiGet('/api/users/me/badges');
        const unlocked = new Set((mine.data || []).map(b => b.id));
        const grid = document.querySelector('.badge-grid');
        grid.innerHTML = '';
        (all.data || []).forEach(b => {
            const isUnlocked = unlocked.has(b.id);
            const el = document.createElement('div');
            el.className = 'badge-item';
            el.innerHTML = `
                <div class="badge-icon ${isUnlocked ? 'unlocked' : ''}">
                    <div>${isUnlocked ? '已获得' : '未解锁'}</div>
                </div>
                <p class="badge-name ${isUnlocked ? 'unlocked' : ''}">${b.name}</p>
                <p class="badge-description">${b.description || '暂无描述'}</p>
            `;
            grid.appendChild(el);
        });
    } catch(e) {}
}

// 擅长领域选择功能
function setupExpertiseSelection() {
    const expertiseOptions = document.querySelectorAll('.expertise-option');
    const expertiseBtn = document.getElementById('expertiseBtn');
    
    if (!expertiseOptions.length || !expertiseBtn) {
        console.warn('擅长领域选择元素未找到');
        return;
    }
    
    expertiseOptions.forEach(option => {
        option.addEventListener('click', () => {
            const tag = option.dataset.tag;
            
            if (option.classList.contains('selected')) {
                // 取消选择
                option.classList.remove('selected');
                selectedExpertiseTags = selectedExpertiseTags.filter(t => t !== tag);
            } else {
                // 添加选择
                option.classList.add('selected');
                selectedExpertiseTags.push(tag);
            }
            
            // 更新按钮状态
            expertiseBtn.disabled = selectedExpertiseTags.length === 0;
            console.log('当前选择的擅长领域:', selectedExpertiseTags);
        });
    });
    
    expertiseBtn.addEventListener('click', async () => {
        if (selectedExpertiseTags.length > 0) {
            try {
                console.log('准备保存擅长领域:', selectedExpertiseTags);
                
                // 先保存到本地存储
                localStorage.setItem('selectedExpertiseTags', JSON.stringify(selectedExpertiseTags));
                
                // 显示保存成功提示
                showToast('擅长领域已保存');
                
                // 导航到主页
                navigateTo('page-home');
                
                // 异步提交到后端（如果后端可用）
                try {
                    await apiPut('/api/users/me/expertise_tags', {
                        expertise_tags: selectedExpertiseTags
                    });
                    console.log('擅长领域已同步到后端');
                } catch (backendError) {
                    console.warn('后端同步失败，但本地已保存:', backendError);
                    // 不显示错误，因为本地已保存成功
                }
                
            } catch (error) {
                console.error('保存擅长领域失败:', error);
                showToast('保存失败，请重试');
            }
        } else {
            showToast('请至少选择一个擅长领域');
        }
    });
}
async function cancelRecording() {
    try {
        // 调用清理音频文件的API
        await cleanupVoiceFiles();

        // 标准化重置（可再次录音）
        resetAnswerFlowUI();

        // 显示成功消息
        if (typeof showToast === 'function') showToast('已取消本次回答，可重新录制');
        
    } catch (error) {
        console.error('取消录音时出错:', error);
        if (typeof showToast === 'function') showToast('取消录音失败，请重试');
    }
}

// 提交回答：携带语音占位与文件URL
async function submitAnswer() {
    if (!currentQuestion) return;
    if (!lastSummaryText) {
        showToast('请先完成录音并生成AI总结');
        return;
    }
    const payload = {
        question_id: currentQuestion.id,
        answer_text: lastSummaryText,
        voice_file: 'WAV 容器格式 + 16 位有符号小端 PCM 编码 + 单声道 + 16000Hz',
        voice_file_url: lastVoiceFileUrl || '',
        voice_format: 'wav'
    };
    try {
        const json = await apiPost('/api/answers', payload);
        if (json.code === 200) {
            pushMomNotification({
                id: `ans_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                type: 'answer',
                unread: true,
                question_id: currentQuestion.id,
                question_title: currentQuestion.title || '',
                answer_excerpt: (payload.answer_text || '').slice(0, 80),
                create_time: new Date().toISOString()
            });
            document.getElementById('successOverlay').classList.add('visible');
            setTimeout(() => {
                document.getElementById('successOverlay').classList.remove('visible');
                navigateTo('page-home');
            }, 1500);
        } else {
            throw new Error(json.message || '提交失败');
        }
    } catch(e) {
        alert('提交失败：' + e.message);
    }
}

// --- 初始化和事件绑定 ---
function initializeApp() {
    loadSelectedExpertiseTags();
    // 绑定所有静态按钮的事件
    onboardingBtn.addEventListener('click', () => {
        if (currentSlide < slides.length - 1) {
            currentSlide++;
            updateOnboardingUI();
        } else {
            navigateTo('page-expertise');
        }
    });
    
    // 底部导航切换
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.dataset.page;
            if (target) navigateTo(target);
        });
    });

    // 荣誉墙标签切换
    const btnBadges = document.getElementById('btn-badges');
    const btnLetters = document.getElementById('btn-letters');
    if (btnBadges) btnBadges.addEventListener('click', () => showHonorTab('badges'));
    if (btnLetters) btnLetters.addEventListener('click', () => showHonorTab('letters'));

    const recordBtn = document.getElementById('recordBtn');
    const submitBtn = document.getElementById('submitBtn');

    recordBtn.addEventListener('click', () => {
        if (recordingState === 'idle' || recordingState === 'finished') startRecording();
        else if (recordingState === 'recording') stopRecording();
    });

    submitBtn.addEventListener('click', submitAnswer);

    // 绑定取消按钮事件
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelRecording);
    }

    const askRecordBtn = document.getElementById('askRecordBtn');
    if (askRecordBtn) {
        askRecordBtn.addEventListener('click', () => {
            if (askRecordingState === 'idle') startAskRecording();
            else if (askRecordingState === 'recording') stopAskRecording();
        });
    }

    const askCancelBtn = document.getElementById('askCancelBtn');
    if (askCancelBtn) {
        askCancelBtn.addEventListener('click', async () => {
            if (typeof cleanupVoiceFiles === 'function') await cleanupVoiceFiles();
            resetAskVoiceUI();
        });
    }

    const askSubmitBtn = document.getElementById('askSubmitBtn');
    if (askSubmitBtn) {
        askSubmitBtn.addEventListener('click', submitAskByVoice);
    }

    const phoneInput = document.getElementById('phoneInput');
    const loginBtn = document.getElementById('loginBtn');
    phoneInput.addEventListener('input', () => {
        loginBtn.disabled = !(phoneInput.value.length === 11 && /^\d{11}$/.test(phoneInput.value));
    });
    loginBtn.addEventListener('click', () => {
        if(!loginBtn.disabled) navigateTo('page-onboarding');
    });
    
    // 初始化页面
    setupOnboarding();
    setupExpertiseSelection();
    navigateTo('page-splash');
    setTimeout(() => { navigateTo('page-login'); }, 1500);
}

// 退出登录功能
function handleLogout() {
    try {
        // 清除本地存储的用户数据
        localStorage.removeItem('userProfile');
        localStorage.removeItem('selectedExpertiseTags');
        localStorage.removeItem('questionsData');
        localStorage.removeItem('thankLettersData');
        localStorage.removeItem('honorBadges');
        
        // 清除全局变量
        questionsData = [];
        questionsLoaded = false;
        thankLettersData = [];
        thankLettersLoaded = false;
        selectedExpertiseTags = [];
        
        // 显示退出成功提示
        showToast('已退出登录');
        
        // 延迟跳转到用户类型选择页面
        setTimeout(() => {
            window.location.href = 'splash_screen.html';
        }, 1000);
        
    } catch (error) {
        console.error('退出登录失败:', error);
        showToast('退出登录失败，请重试');
    }
}

// Toast 提示功能
function showToast(message) {
    // 创建或获取toast元素
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
        
        // 添加toast样式
        const style = document.createElement('style');
        style.textContent = `
            .toast {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background-color: rgba(0,0,0,0.7);
                color: white;
                padding: 10px 20px;
                border-radius: 20px;
                font-size: 14px;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.5s, top 0.5s;
            }
            .toast.show {
                opacity: 1;
                top: 40px;
            }
        `;
        document.head.appendChild(style);
    }
    
    toast.textContent = message;
    toast.classList.add('show');
    
    // 3秒后隐藏
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

document.addEventListener('DOMContentLoaded', initializeApp);

// 加载感谢信数据
async function loadThankLetters() {
    // 如果数据已经加载过，直接返回现有数据
    if (thankLettersLoaded && thankLettersData.length > 0) {
        console.log('Using cached thank letters data');
        return;
    }
    
    try {
        console.log('Fetching thank letters from:', `${API_BASE}/api/thank-letters`);
        const json = await apiGet('/api/thank-letters');
        console.log('Thank letters API response:', json);
        
        if (json.code === 200 && Array.isArray(json.data)) {
            thankLettersData = json.data;
            thankLettersLoaded = true; // 标记数据已加载
            renderThankLetters();
        } else {
            throw new Error(json.message || '加载感谢信失败');
        }
    } catch (e) {
        console.error('loadThankLetters error:', e);
        thankLettersData = [];
        thankLettersLoaded = false;
        // 显示错误状态
        const lettersList = document.querySelector('.letter-list');
        if (lettersList) {
            lettersList.innerHTML = `
                <div class="letter-card">
                    <p class="letter-text">加载感谢信失败，请稍后重试</p>
                    <p class="letter-info">—</p>
                    <p class="letter-question">—</p>
                </div>
            `;
        }
    }
}

// 渲染感谢信列表
function renderThankLetters() {
    const lettersList = document.querySelector('.letter-list');
    if (!lettersList) return;
    
    if (!thankLettersData || thankLettersData.length === 0) {
        lettersList.innerHTML = `
            <div class="letter-card">
                <p class="letter-text">暂无感谢信</p>
                <p class="letter-info">—</p>
                <p class="letter-question">—</p>
            </div>
        `;
        return;
    }
    
    const html = thankLettersData.map(letter => {
        // 截取内容前50个字符作为预览
        const previewText = letter.content.length > 50 
            ? letter.content.substring(0, 50) + '...' 
            : letter.content;
        
        return `
            <div class="letter-card" onclick="showLetterDetail(${letter.id})">
                <p class="letter-title" style="font-weight:bold;margin-bottom:5px;">${letter.title || '感谢信'}</p>
                <p class="letter-text">${previewText}</p>
                <p class="letter-info" style="margin-top:10px;font-size:12px;color:#888;">来自 ${letter.sender_name}（${letter.sender_relation}）</p>
                <p class="letter-question" style="font-size:12px;color:#888;">相关问题：${letter.question_title || letter.help_category || '无'}</p>
            </div>
        `;
    }).join('');
    
    lettersList.innerHTML = html;
}
