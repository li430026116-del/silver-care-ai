/**
 * 妈妈端核心功能模块
 * 处理妈妈端的主要业务逻辑
 */

// 妈妈端状态管理
const MomState = {
    currentUser: null,
    currentQuestions: [],
    favorites: [],
    babyIssues: [],
    questionTags: [],
    searchHistory: [],
    
    // 初始化状态
    init() {
        this.loadFromStorage();
        this.loadQuestionTags();
    },
    
    // 从本地存储加载数据
    loadFromStorage() {
        const stored = localStorage.getItem('momState');
        if (stored) {
            const data = JSON.parse(stored);
            Object.assign(this, data);
        }
    },
    
    // 保存到本地存储
    saveToStorage() {
        localStorage.setItem('momState', JSON.stringify({
            currentUser: this.currentUser,
            favorites: this.favorites,
            babyIssues: this.babyIssues,
            searchHistory: this.searchHistory
        }));
    },
    
    // 加载问题标签
    async loadQuestionTags() {
        try {
            const response = await MomAPI.getQuestionTags();
            if (response.success && response.data && response.data.tags) {
                this.questionTags = response.data.tags;
                console.log('问题标签加载成功:', this.questionTags);
            } else {
                console.warn('问题标签数据格式异常:', response);
                this.questionTags = [];
            }
        } catch (error) {
            console.error('加载问题标签失败:', error);
            this.questionTags = [];
        }
    }
};

// 妈妈端功能函数
const MomFunctions = {
    // 初始化妈妈端
    async init() {
        MomState.init();
        await this.initUser();
        this.bindEvents();
    },
    
    // 初始化用户
    async initUser() {
        try {
            const response = await MomAPI.getProfile();
            if (response.success) {
                MomState.currentUser = response.data;
                MomState.saveToStorage();
            }
        } catch (error) {
            console.error('获取用户信息失败:', error);
            // 如果获取失败，尝试注册
            await this.registerUser();
        }
    },
    
    // 注册用户
    async registerUser() {
        try {
            const response = await MomAPI.register({
                name: '妈妈用户',
                join_time: new Date().toISOString()
            });
            if (response.success) {
                MomState.currentUser = response.data;
                MomState.saveToStorage();
                showToast('欢迎使用妈妈端！');
            }
        } catch (error) {
            console.error('用户注册失败:', error);
            showToast('用户初始化失败，请刷新页面重试');
        }
    },
    
    // 提问功能
    async askQuestion(questionData) {
        try {
            const response = await MomAPI.askQuestion(questionData);
            if (response.success) {
                showToast('提问成功！');
                // 刷新问题列表
                await this.loadQuestions();
                return response.data;
            }
        } catch (error) {
            console.error('提问失败:', error);
            showToast('提问失败，请重试');
            throw error;
        }
    },
    
    // 搜索问题
    async searchQuestions(tag = '', keyword = '', page = 1) {
        try {
            const params = {
                page: page,
                page_size: 10
            };
            
            if (tag) params.tag = tag;
            if (keyword) params.keyword = keyword;
            
            const response = await MomAPI.searchQuestions(params);
            
            if (response.success) {
                MomState.currentQuestions = response.data.questions;
                
                // 记录搜索历史
                const searchTerm = keyword || tag;
                if (searchTerm && !MomState.searchHistory.includes(searchTerm)) {
                    MomState.searchHistory.unshift(searchTerm);
                    if (MomState.searchHistory.length > 10) {
                        MomState.searchHistory = MomState.searchHistory.slice(0, 10);
                    }
                    MomState.saveToStorage();
                }
                
                return response.data;
            }
        } catch (error) {
            console.error('搜索失败:', error);
            showToast('搜索失败，请重试');
            throw error;
        }
    },
    
    // 加载问题列表
    async loadQuestions(tag = '', keyword = '') {
        return await this.searchQuestions(tag, keyword);
    },
    
    // 点赞答案
    async likeAnswer(answerId) {
        try {
            const response = await MomAPI.likeAnswer(answerId);
            if (response.success) {
                showToast('点赞成功！');
                return true;
            }
        } catch (error) {
            console.error('点赞失败:', error);
            showToast('点赞失败，请重试');
            return false;
        }
    },
    
    // 取消点赞
    async unlikeAnswer(answerId) {
        try {
            const response = await MomAPI.unlikeAnswer(answerId);
            if (response.success) {
                showToast('已取消点赞');
                return true;
            }
        } catch (error) {
            console.error('取消点赞失败:', error);
            showToast('操作失败，请重试');
            return false;
        }
    },
    
    // 收藏答案
    async favoriteAnswer(answerId) {
        try {
            const response = await MomAPI.favoriteAnswer(answerId);
            if (response.success) {
                showToast('收藏成功！');
                // 更新本地收藏列表
                await this.loadFavorites();
                return true;
            }
        } catch (error) {
            console.error('收藏失败:', error);
            showToast('收藏失败，请重试');
            return false;
        }
    },
    
    // 加载收藏列表
    async loadFavorites(page = 1, tag = '', pageSize = 10) {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                page_size: pageSize.toString()
            });
            if (tag && tag !== '全部') {
                params.append('tag', tag);
            }
            
            const response = await MomAPI.getFavorites(params.toString());
            if (response.success) {
                if (page === 1) {
                    MomState.favorites = response.data.favorites;
                } else {
                    // 分页加载时追加数据
                    MomState.favorites = [...(MomState.favorites || []), ...response.data.favorites];
                }
                MomState.favoritesTotal = response.data.total_count;
                MomState.favoritesCurrentPage = page;
                MomState.saveToStorage();
                return response.data;
            }
        } catch (error) {
            console.error('加载收藏失败:', error);
            return { favorites: [], total_count: 0 };
        }
    },
    
    // 发送感谢信
    async sendThankLetter(letterData) {
        try {
            const response = await MomAPI.sendThankLetter(letterData);
            if (response.success) {
                showToast('感谢信发送成功！');
                return response.data;
            }
        } catch (error) {
            console.error('发送感谢信失败:', error);
            showToast('发送失败，请重试');
            throw error;
        }
    },
    
    // 记录宝宝问题
    async recordBabyIssue(issueData) {
        try {
            const response = await MomAPI.recordBabyIssue(issueData);
            if (response.success) {
                showToast('记录成功！');
                // 更新本地记录
                await this.loadBabyIssues();
                return response.data;
            }
        } catch (error) {
            console.error('记录宝宝问题失败:', error);
            showToast('记录失败，请重试');
            throw error;
        }
    },
    
    // 加载宝宝问题记录
    async loadBabyIssues() {
        try {
            const response = await MomAPI.getBabyIssues();
            if (response.success) {
                MomState.babyIssues = response.data.issues;
                MomState.saveToStorage();
                return response.data;
            }
        } catch (error) {
            console.error('加载宝宝问题记录失败:', error);
            return { issues: [], total_count: 0 };
        }
    },
    
    // 绑定事件
    bindEvents() {
        // 提问表单提交
        const askForm = document.getElementById('askQuestionForm');
        if (askForm) {
            askForm.addEventListener('submit', this.handleAskQuestion.bind(this));
        }
        
        // 感谢信表单提交
        const thankForm = document.getElementById('thankLetterForm');
        if (thankForm) {
            thankForm.addEventListener('submit', this.handleSendThankLetter.bind(this));
        }
        
        // 标签点击事件
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tag-item')) {
                const tag = e.target.textContent.trim();
                this.handleTagClick(tag);
            }
            
            // 点赞按钮
            if (e.target.classList.contains('like-btn')) {
                const answerId = e.target.dataset.answerId;
                this.handleLikeClick(answerId, e.target);
            }
            
            // 收藏按钮
            if (e.target.classList.contains('favorite-btn')) {
                const answerId = e.target.dataset.answerId;
                this.handleFavoriteClick(answerId, e.target);
            }
        });
    },
    
    // 处理提问表单提交
    async handleAskQuestion(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const questionData = {
            title: formData.get('title'),
            content: formData.get('content'),
            category: formData.get('category'),
            baby_age_months: parseInt(formData.get('baby_age_months')) || 0,
            urgency_level: formData.get('urgency_level') || 'normal'
        };
        
        try {
            await this.askQuestion(questionData);
            e.target.reset();
            closeModal('askQuestionModal');
        } catch (error) {
            // 错误已在askQuestion中处理
        }
    },
    
    // 处理感谢信表单提交
    async handleSendThankLetter(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const letterData = {
            elder_user_id: parseInt(formData.get('elder_user_id')),
            answer_id: parseInt(formData.get('answer_id')),
            title: formData.get('title'),
            content: formData.get('content')
        };
        
        try {
            await this.sendThankLetter(letterData);
            e.target.reset();
            closeModal('thankLetterModal');
        } catch (error) {
            // 错误已在sendThankLetter中处理
        }
    },
    
    // 处理标签点击
    async handleTagClick(tag) {
        try {
            await this.searchQuestions(tag);
            this.renderQuestions();
        } catch (error) {
            // 错误已在searchQuestions中处理
        }
    },
    
    // 处理点赞点击
    async handleLikeClick(answerId, button) {
        const isLiked = button.classList.contains('liked');
        
        if (isLiked) {
            const success = await this.unlikeAnswer(answerId);
            if (success) {
                button.classList.remove('liked');
                button.textContent = '👍';
            }
        } else {
            const success = await this.likeAnswer(answerId);
            if (success) {
                button.classList.add('liked');
                button.textContent = '👍 已赞';
            }
        }
    },
    
    // 处理收藏点击
    async handleFavoriteClick(answerId, button) {
        const success = await this.favoriteAnswer(answerId);
        if (success) {
            button.classList.add('favorited');
            button.textContent = '⭐ 已收藏';
        }
    },
    
    // 渲染问题列表
    renderQuestions() {
        const container = document.getElementById('questionsContainer');
        if (!container) return;
        
        if (MomState.currentQuestions.length === 0) {
            container.innerHTML = '<div class="no-data">暂无相关问题</div>';
            return;
        }
        
        const html = MomState.currentQuestions.map(question => `
            <div class="question-item" data-question-id="${question.id}" onclick="showAnswerDetail(${question.id}, '${question.title}')">
                <h3 class="question-title">${question.title}</h3>
                <p class="question-content">${question.content}</p>
                <div class="question-meta">
                    <span class="question-time">${new Date(question.create_time).toLocaleDateString()}</span>
                    <span class="question-category">${question.category || ''}</span>
                </div>
                <div class="question-answers">
                    ${question.answers ? question.answers.map(answer => `
                        <div class="answer-item">
                            <p class="answer-content">${answer.content}</p>
                            <div class="answer-actions">
                                <button class="like-btn" data-answer-id="${answer.id}" onclick="event.stopPropagation();">👍</button>
                                <button class="favorite-btn" data-answer-id="${answer.id}" onclick="event.stopPropagation();">⭐</button>
                            </div>
                        </div>
                    `).join('') : ''}
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    },
    
    // 渲染问题标签
    renderQuestionTags() {
        const container = document.getElementById('questionTagsContainer');
        if (!container) {
            console.warn('问题标签容器未找到');
            return;
        }
        
        container.innerHTML = '';
        
        if (!MomState.questionTags || MomState.questionTags.length === 0) {
            container.innerHTML = '<p class="no-tags">暂无问题标签</p>';
            return;
        }
        
        MomState.questionTags.forEach(tag => {
            const tagElement = document.createElement('button');
            tagElement.className = 'question-tag';
            tagElement.textContent = tag.name;
            tagElement.title = tag.description;
            tagElement.onclick = () => MomFunctions.handleTagClick(tag.name);
            container.appendChild(tagElement);
        });
        
        console.log('问题标签渲染完成，共', MomState.questionTags.length, '个标签');
    },
    
    // 渲染收藏列表
    renderFavorites(filterTag = '全部') {
        const container = document.getElementById('collectionsList');
        if (!container) {
            console.warn('收藏列表容器未找到');
            return;
        }
        
        container.innerHTML = '';
        
        if (!MomState.favorites || MomState.favorites.length === 0) {
            container.innerHTML = '<div class="empty" style="text-align: center; padding: 40px; color: #999; font-size: 16px;">暂无收藏内容<br><small style="font-size: 14px; color: #ccc;">收藏的问题和答案会显示在这里</small></div>';
            return;
        }
        
        const TAG_ORDER = ['饮食健康','睡眠问题','日常护理','行为培养','知识启蒙','趣味陪伴'];
        const groups = {};
        
        MomState.favorites.forEach(f => {
            const primary = f.category || (f.tags && f.tags.length ? f.tags[0] : '其他');
            if (!groups[primary]) groups[primary] = [];
            groups[primary].push(f);
        });
        
        const order = TAG_ORDER.concat(Object.keys(groups).filter(t => !TAG_ORDER.includes(t)));
        order.forEach(tag => {
            const items = groups[tag];
            if (!items) return;
            // 应用标签筛选
            if (filterTag !== '全部' && filterTag !== tag) return;
            
            const section = document.createElement('div');
            section.className = 'collection-section';
            section.innerHTML = `<h3 style="margin: 15px 0 10px 0; padding: 0 15px; font-size: 16px; color: var(--text-color);">${tag}</h3>`;
            
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'feed-card';
                card.style.margin = '0 15px 10px 15px';
                card.innerHTML = `
                    <h3 class="question-title">${item.question_title || item.title || '未知问题'}</h3>
                    <p class="answer-summary">${item.answer_content ? item.answer_content.substring(0, 100) + '...' : '暂无内容'}</p>
                    <div class="tag" style="margin-top: 8px;">${tag}</div>
                `;
                card.onclick = () => showAnswerDetail(item.question_id || item.qid, item.question_title || item.title);
                section.appendChild(card);
            });
            container.appendChild(section);
        });
        
        // 添加加载更多按钮
        if (MomState.favorites.length < MomState.favoritesTotal) {
            const loadMoreBtn = document.createElement('div');
            loadMoreBtn.className = 'load-more-btn';
            loadMoreBtn.style.cssText = 'text-align: center; padding: 20px; color: #666; cursor: pointer; border-top: 1px solid #f0f0f0;';
            loadMoreBtn.innerHTML = '加载更多...';
            loadMoreBtn.onclick = async () => {
                const nextPage = (MomState.favoritesCurrentPage || 1) + 1;
                await this.loadFavorites(nextPage, filterTag);
                this.renderFavorites(filterTag);
            };
            container.appendChild(loadMoreBtn);
        }
        
        console.log('收藏列表渲染完成，共', MomState.favorites.length, '个收藏');
    },
};

// 导出功能对象
window.MomFunctions = MomFunctions;
window.MomState = MomState;

// 渲染我的提问列表
async function renderMyQuestions() {
    const container = document.getElementById('myQuestionsList');
    if (!container) return;
    
    try {
        // 显示加载状态
        container.innerHTML = '<div class="loading">加载中...</div>';
        
        // 获取我的提问数据
        const response = await MomAPI.getMyQuestions();
        if (!response.success) {
            container.innerHTML = '<div class="error">获取提问列表失败</div>';
            return;
        }
        
        const questions = response.data.questions || [];
        
        if (questions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 64px; height: 64px; color: #ccc; margin-bottom: 16px;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9 9h6v6H9z"></path>
                    </svg>
                    <p style="color: #999; font-size: 16px; margin: 0;">还没有提问过</p>
                    <p style="color: #ccc; font-size: 14px; margin: 8px 0 0 0;">去首页发布您的第一个问题吧</p>
                </div>
            `;
            return;
        }
        
        // 渲染问题列表
        const html = questions.map(question => {
            const createTime = new Date(question.created_at).toLocaleDateString('zh-CN');
            const answerCount = question.answer_count || 0;
            
            return `
                <div class="question-item" onclick="showAnswerDetail(${question.id}, '${question.title}')">
                    <div class="question-title">${question.title}</div>
                    <div class="question-content">${question.content || '暂无详细内容'}</div>
                    <div class="question-meta">
                        <span class="question-time">${createTime}</span>
                        <span class="question-category">${question.category || '未分类'}</span>
                    </div>
                    <div class="question-stats">
                        <span class="answer-count">${answerCount} 个回答</span>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('渲染我的提问列表失败:', error);
        container.innerHTML = '<div class="error">加载失败，请重试</div>';
    }
}

// 渲染感谢信列表
async function renderThankLetters() {
    const container = document.getElementById('thankLettersList');
    if (!container) return;
    
    try {
        // 显示加载状态
        container.innerHTML = '<div class="loading">加载中...</div>';
        
        // 获取感谢信数据
        const response = await MomAPI.getThankLetters();
        if (!response.success) {
            container.innerHTML = '<div class="error">获取感谢信列表失败</div>';
            return;
        }
        
        const letters = response.data.results || [];
        
        // 保存当前感谢信数据供详情查看使用
        window.currentThankLetters = letters;
        
        if (letters.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 64px; height: 64px; color: #ccc; margin-bottom: 16px;">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    <p style="color: #999; font-size: 16px; margin: 0;">还没有发送过感谢信</p>
                    <p style="color: #ccc; font-size: 14px; margin: 8px 0 0 0;">当您收到有用的回答时，可以发送感谢信</p>
                </div>
            `;
            return;
        }
        
        // 渲染感谢信列表
        const html = letters.map(letter => {
            const createTime = new Date(letter.created_at).toLocaleDateString('zh-CN');
            const shortContent = letter.content.length > 50 ? letter.content.substring(0, 50) + '...' : letter.content;
            
            return `
                <div class="thank-letter-item" onclick="showThankLetterDetail(${letter.id})">
                    <div class="letter-header">
                        <div class="letter-title">${letter.title}</div>
                        <div class="letter-time">${createTime}</div>
                    </div>
                    <div class="letter-content">${shortContent}</div>
                    <div class="letter-meta">
                        <span class="recipient">感谢 ${letter.recipient_name || '匿名用户'}</span>
                        <span class="question-ref">相关问题：${letter.question_title || '未知问题'}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('渲染感谢信列表失败:', error);
        container.innerHTML = '<div class="error">加载失败，请重试</div>';
    }
}

// 显示感谢信详情
function showThankLetterDetail(letterId) {
    const letters = window.currentThankLetters || [];
    const letter = letters.find(l => l.id === letterId);
    if (!letter) {
        showToast('感谢信数据不存在');
        return;
    }
    
    // 填充详情内容
    document.getElementById('thank-letter-detail-title').textContent = '感谢信详情';
    document.getElementById('thank-letter-detail-content').innerHTML = `
        <div style="margin-bottom: 15px;">
            <strong>内容：</strong><br>
            ${letter.content || '无内容'}
        </div>
    `;
    
    document.getElementById('thank-letter-detail-meta').innerHTML = `
        <div><strong>发送给：</strong> ${letter.recipient_name || '未知'}</div>
        <div><strong>相关问题：</strong> ${letter.question_title || '无'}</div>
        <div><strong>发送时间：</strong> ${new Date(letter.created_at).toLocaleString()}</div>
    `;
    
    // 显示弹窗
    document.getElementById('thank-letter-detail-overlay').classList.add('visible');
}

// 关闭感谢信详情弹窗
function closeThankLetterDetail() {
    document.getElementById('thank-letter-detail-overlay').classList.remove('visible');
}

// 渲染宝贝常遇问题列表
async function renderCommonIssues() {
    const container = document.getElementById('commonIssuesList');
    if (!container) return;
    
    try {
        container.innerHTML = '<div class="loading">加载中...</div>';
        const response = await MomAPI.getBabyIssues();
        
        if (response.success && response.data.issues && response.data.issues.length > 0) {
            const issuesHtml = response.data.issues.map(issue => `
                <div class="issue-item">
                    <h4>${issue.issue_title}</h4>
                    <p class="issue-description">${issue.issue_description}</p>
                    <div class="issue-meta">
                        <span class="category">${issue.category}</span>
                        <span class="create-time">${new Date(issue.create_time).toLocaleDateString()}</span>
                    </div>
                </div>
            `).join('');
            container.innerHTML = issuesHtml;
        } else {
            container.innerHTML = '<div class="empty-state">暂无宝宝问题记录</div>';
        }
    } catch (error) {
        console.error('获取宝宝问题失败:', error);
        container.innerHTML = '<div class="error-state">加载失败，请稍后重试</div>';
    }
}