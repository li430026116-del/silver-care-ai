/**
 * 妈妈端API交互模块
 * 处理与后端API的所有交互
 */

// 妈妈端API配置
const MOM_API_CONFIG = {
    baseURL: (window.location && window.location.port === '8000') ? '/api' : 'http://127.0.0.1:8000/api',
    timeout: 10000
};

// API工具函数
const momApiRequest = async (url, options = {}) => {
    const fullUrl = `${MOM_API_CONFIG.baseURL}${url}`;
    console.log('Making API request to:', fullUrl, 'with options:', options);
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
        timeout: MOM_API_CONFIG.timeout
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    if (finalOptions.body && typeof finalOptions.body === 'object') {
        finalOptions.body = JSON.stringify(finalOptions.body);
    }
    
    try {
        const response = await fetch(fullUrl, finalOptions);
        console.log('API response status:', response.status, response.statusText);
        
        const data = await response.json();
        console.log('API response data:', data);
        
        if (!response.ok) {
            console.error('API request failed with status:', response.status, 'data:', data);
            return {
                success: false,
                message: data.message || `HTTP error! status: ${response.status}`,
                status: response.status
            };
        }
        
        return data;
    } catch (error) {
        console.error('API请求失败:', error);
        return {
            success: false,
            message: error.message || '网络请求失败',
            error: error
        };
    }
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
