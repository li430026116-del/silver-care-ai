# 育儿问答系统 API 文档与 MySQL 示例数据

- Base URL: `http://127.0.0.1:8000/`
- Content-Type: `application/json`
- Auth: 无（固定公共账号 `user_id=1`）

> 说明：以下接口完全对应项目中的 Django DRF APIViews 实现，返回结构与 `e:\python\nuanya\1.txt` 要求一致。文末提供 MySQL 插入语句模板与示例数据，字段与 models 文件保持一致。Django 实际表名使用默认规则：`<app>_<model>`。

---

## 老人端 - 育儿问答

### 获取待回答问题列表
- 方法: `GET`
- 路由: `/api/questions/unanswered`
- 说明: 返回所有未被回答的问题，按发布时间倒序

请求示例:
```
GET /api/questions/unanswered
```

响应示例:
```
{
  "code": 200,
  "message": "获取待回答问题列表成功",
  "data": [
    {
      "id": 1,
      "title": "孩子不爱吃饭怎么办？",
      "category": "饮食健康",
      "content": "我家孩子最近总是不好好吃饭...",
      "tags": "吃饭,喂养,儿童",
      "create_time": "2025-09-15T10:00:00.000000"
    }
  ]
}
```

返回字段:
- `id`：问题ID
- `title`：标题
- `category`：分类
- `content`：内容
- `tags`：标签（逗号分隔）
- `create_time`：发布时间（ISO 8601）

---

### 提交回答（支持语音占位）
- 方法: `POST`
- 路由: `/api/answers`
- 说明: 提交文字回答，可选提交语音占位信息（非真实文件上传）。后端自动创建 `Answer`，如有语音则创建 `VoiceRecord`；同时为用户加积分并累计回答数。

请求体字段:
- `question_id`（必填，整数）：问题ID
- `answer_text`（必填，字符串）：回答内容
- 以下三者任选其一或都不传，用于语音占位：
  - `voice_file`（可选，字符串）：语音格式说明文本（如“WAV 容器格式 + PCM16 + 单声道 + 16000Hz”）
  - `voice_file_url`（可选，字符串）：语音文件存储地址（如 OSS 链接）
  - `voice_format`（可选，字符串）：文件格式（如 `wav`/`mp3`）

请求示例:
```
POST /api/answers
Content-Type: application/json

{
  "question_id": 1,
  "answer_text": "孩子不爱吃饭可尝试少量多餐...",
  "voice_file": "WAV 容器格式 + 16 位有符号小端 PCM 编码 + 单声道 + 16000Hz 采样率"
}
```

响应示例:
```
{
  "code": 200,
  "message": "语音提交成功，后端已开始转写并生成回答",
  "data": {
    "answer_id": 1,
    "voice_record_id": 101,
    "user_id": 1,
    "question_id": 1,
    "create_time": "2025-09-30T11:00:00.000000"
  }
}
```

返回字段:
- `answer_id`：新回答ID
- `voice_record_id`：语音记录ID（无语音则为 `null`）
- `user_id`：固定公共账号ID（为 1）
- `question_id`：关联的问题ID
- `create_time`：回答创建时间（ISO 8601）

错误响应（问题不存在）:
```
{
  "code": 404,
  "message": "问题不存在",
  "data": null
}
```

---

## 个人中心

### 获取老人个人信息
- 方法: `GET`
- 路由: `/api/users/me`

响应示例:
```
{
  "code": 200,
  "message": "获取用户信息成功",
  "data": {
    "id": 1,
    "name": "共享育儿专家",
    "role": "育儿专家",
    "join_time": "2024-01-01T00:00:00.000000",
    "points": 2680,
    "answer_count": 156
  }
}
```

---

### 获取我的回答列表
- 方法: `GET`
- 路由: `/api/users/me/answers`

响应示例:
```
{
  "code": 200,
  "message": "获取我的回答列表成功",
  "data": [
    {
      "id": 1,
      "question": {
        "id": 1,
        "title": "孩子不爱吃饭怎么办？",
        "category": "饮食健康"
      },
      "answer_text": "孩子不爱吃饭可尝试少量多餐...",
      "create_time": "2025-09-15T11:00:00.000000",
      "voice_record_id": 101
    },
    {
      "id": 2,
      "question": {
        "id": 2,
        "title": "宝宝晚上频繁夜醒怎么处理？",
        "category": "睡眠问题"
      },
      "answer_text": "宝宝夜醒可能是缺钙或睡眠环境不适...",
      "create_time": "2025-09-16T14:20:00.000000",
      "voice_record_id": null
    }
  ]
}
```

---

### 获取积分记录（分页）
- 方法: `GET`
- 路由: `/api/users/me/points_records`
- 查询参数: `page`（默认 `1`）、`size`（默认 `10`）

响应示例:
```
{
  "code": 200,
  "message": "获取积分记录成功",
  "data": [
    {
      "id": 1,
      "points": 50,
      "reason": "回答问题",
      "related_answer_id": 1,
      "create_time": "2025-09-15T11:00:00.000000"
    },
    {
      "id": 2,
      "points": 50,
      "reason": "回答问题",
      "related_answer_id": 2,
      "create_time": "2025-09-16T14:20:00.000000"
    }
  ],
  "page_info": {
    "page": 1,
    "size": 10,
    "total": 156,
    "total_page": 16
  }
}
```

---

### 获取与更新设置信息
- 方法: `GET` `/api/settings`
- 方法: `PUT` `/api/settings`

GET 响应示例:
```
{
  "code": 200,
  "message": "获取设置信息成功",
  "data": {
    "sound": "on",
    "notification": "on"
  }
}
```

PUT 请求体:
```
{
  "sound": "off",
  "notification": "on"
}
```

PUT 响应示例:
```
{
  "code": 200,
  "message": "更新设置信息成功",
  "data": {
    "sound": "off",
    "notification": "on"
  }
}
```

---

## 荣誉广场

### 获取排行榜
- 方法: `GET`
- 路由: `/api/rankings`
- 说明: 仅返回公共账号本身，`rank=1`

响应示例:
```
{
  "code": 200,
  "message": "获取排行榜成功",
  "data": [
    {
      "user_id": 1,
      "name": "共享育儿专家",
      "role": "育儿专家",
      "rank": 1,
      "points": 2680
    }
  ]
}
```

---

### 获取所有成就徽章
- 方法: `GET`
- 路由: `/api/badges`

响应示例:
```
{
  "code": 200,
  "message": "获取成就徽章列表成功",
  "data": [
    {
      "id": 1,
      "name": "首次回答",
      "description": "发表第一个育儿问答即可获得"
    },
    {
      "id": 2,
      "name": "经验丰富",
      "description": "累计回答100个问题可获得"
    }
  ]
}
```

---

### 获取用户已获徽章
- 方法: `GET`
- 路由: `/api/users/me/badges`

响应示例:
```
{
  "code": 200,
  "message": "获取用户已获得的徽章成功",
  "data": [
    {
      "id": 1,
      "name": "首次回答",
      "description": "发表第一个育儿问答即可获得",
      "obtain_time": "2024-01-02T00:00:00.000000"
    },
    {
      "id": 2,
      "name": "经验丰富",
      "description": "累计回答100个问题可获得",
      "obtain_time": "2024-06-15T00:00:00.000000"
    }
  ]
}
```

---

### 获取感谢信列表
- 方法: `GET`
- 路由: `/api/thank-letters`
- 查询参数: 
  - `featured`（可选）：是否精选，值为 `true` 或 `false`
  - `category`（可选）：帮助类别，如 "饮食健康"、"睡眠问题" 等

请求示例:
```
GET /api/thank-letters
GET /api/thank-letters?featured=true
GET /api/thank-letters?category=饮食健康
GET /api/thank-letters?featured=true&category=睡眠问题
```

响应示例:
```
{
  "code": 200,
  "message": "获取感谢信列表成功",
  "data": [
    {
      "id": 1,
      "title": "感谢您的耐心指导",
      "content": "非常感谢您对我孩子饮食问题的详细解答，按照您的建议调整后，孩子现在吃饭好多了...",
      "sender_name": "李妈妈",
      "sender_phone": "138****5678",
      "recipient_expert": "张医生",
      "help_category": "饮食健康",
      "is_featured": true,
      "create_time": "2024-01-15T10:30:00.000000"
    },
    {
      "id": 2,
      "title": "宝宝睡眠改善了",
      "content": "感谢专家的睡眠指导，宝宝现在能安稳睡整夜了，全家都轻松了很多...",
      "sender_name": "王妈妈",
      "sender_phone": "139****1234",
      "recipient_expert": "李医生",
      "help_category": "睡眠问题",
      "is_featured": false,
      "create_time": "2024-01-14T16:20:00.000000"
    }
  ]
}
```

返回字段:
- `id`：感谢信ID
- `title`：标题
- `content`：感谢信内容
- `sender_name`：发送者姓名
- `sender_phone`：发送者电话（脱敏显示）
- `recipient_expert`：受感谢的专家
- `help_category`：帮助类别
- `is_featured`：是否精选
- `create_time`：创建时间（ISO 8601）

---

### 获取感谢信详情
- 方法: `GET`
- 路由: `/api/thank-letters/<letter_id>`
- 路径参数: `letter_id`（整数）：感谢信ID

请求示例:
```
GET /api/thank-letters/1
```

响应示例:
```
{
  "code": 200,
  "message": "获取感谢信详情成功",
  "data": {
    "id": 1,
    "title": "感谢您的耐心指导",
    "content": "非常感谢您对我孩子饮食问题的详细解答，按照您的建议调整后，孩子现在吃饭好多了。您提到的少量多餐、营造愉快用餐环境等方法都很实用。作为新手妈妈，能得到您这样专业又贴心的指导真的很幸运。希望以后还能继续得到您的帮助，也希望更多的家长能看到您的专业建议。",
    "sender_name": "李妈妈",
    "sender_phone": "138****5678",
    "recipient_expert": "张医生",
    "help_category": "饮食健康",
    "is_featured": true,
    "create_time": "2024-01-15T10:30:00.000000"
  }
}
```

错误响应（感谢信不存在）:
```
{
  "code": 404,
  "message": "感谢信不存在",
  "data": null
}
```

---

## 妈妈端 - 用户管理

### 妈妈用户注册（共享账户）
- 方法: `POST`
- 路由: `/api/mom/register/`
- 说明: 注册妈妈用户（实际返回共享账户信息，无需真实注册）

请求体字段:
- `name`（可选，字符串）：用户姓名
- `phone`（可选，字符串）：手机号
- `avatar`（可选，字符串）：头像URL
- `baby_age_months`（可选，整数）：宝宝月龄
- `baby_gender`（可选，字符串）：宝宝性别（male/female）
- `location`（可选，字符串）：所在地区

请求示例:
```
POST /api/mom/register/
Content-Type: application/json

{
  "name": "张妈妈",
  "phone": "13800138000",
  "avatar": "https://example.com/avatar.jpg",
  "baby_age_months": 18,
  "baby_gender": "male",
  "location": "北京市朝阳区"
}
```

响应示例:
```
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user_id": 1,
    "name": "共享妈妈用户",
    "phone": "00000000000"
  }
}
```

### 获取妈妈用户信息（共享账户）
- 方法: `GET`
- 路由: `/api/mom/profile/`
- 说明: 获取共享妈妈账户的详细信息

请求示例:
```
GET /api/mom/profile/
```

响应示例:
```
{
  "success": true,
  "data": {
    "id": 1,
    "name": "共享妈妈用户",
    "phone": "00000000000",
    "avatar": "",
    "baby_age_months": 12,
    "baby_gender": "unknown",
    "location": "全国",
    "join_time": "2025-01-01T10:00:00.000000"
  }
}
```

---

## 妈妈端 - 问题管理

### 妈妈提问（共享账户）
- 方法: `POST`
- 路由: `/api/mom/questions/ask/`
- 说明: 妈妈用户提交新问题（使用共享账户）

请求体字段:
- `title`（必填，字符串）：问题标题
- `category`（必填，字符串）：问题分类
- `content`（必填，字符串）：问题详细内容
- `tags`（可选，数组）：问题标签
- `baby_age_months`（必填，整数）：宝宝月龄
- `urgency_level`（可选，字符串）：紧急程度，默认normal

请求示例:
```
POST /api/mom/questions/ask/
Content-Type: application/json

{
  "title": "宝宝夜里总是哭闹怎么办？",
  "category": "睡眠问题",
  "content": "我家宝宝18个月了，最近夜里总是哭闹不止...",
  "tags": ["夜哭", "睡眠", "18个月"],
  "baby_age_months": 18,
  "urgency_level": "high"
}
```

响应示例:
```
{
  "success": true,
  "message": "提问成功",
  "data": {
    "question_id": 10,
    "title": "宝宝夜里总是哭闹怎么办？",
    "create_time": "2025-01-15T20:30:00.000000"
  }
}
```

### 搜索问题（限制6个固定标签）
- 方法: `GET`
- 路由: `/api/mom/questions/search/`
- 说明: 根据固定标签搜索相关问题和答案（不支持关键词搜索）

**固定搜索标签（仅支持以下6个）：**
- 饮食健康
- 睡眠问题
- 行为培养
- 日常护理
- 知识启蒙
- 趣味陪伴

请求参数:
- `tag`（必需）：搜索标签（必须是上述6个固定标签之一）
- `page`（可选）：页码，默认1
- `page_size`（可选）：每页数量，默认10

请求示例:
```
GET /api/mom/questions/search/?tag=睡眠问题&page=1&page_size=5
```

响应示例:
```
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": 10,
        "title": "宝宝夜里总是哭闹怎么办？",
        "category": "睡眠问题",
        "content": "我家宝宝18个月了...",
        "tags": ["睡眠问题", "夜哭", "18个月"],
        "create_time": "2025-01-15T20:30:00.000000",
        "answer_count": 3,
        "has_best_answer": true
      }
    ],
    "total_count": 1,
    "page": 1,
    "page_size": 5,
    "total_pages": 1,
    "available_tags": ["饮食健康", "睡眠问题", "行为培养", "日常护理", "知识启蒙", "趣味陪伴"]
  }
}
```

---

## 妈妈端 - 互动功能

### 点赞回答（共享账户）
- 方法: `POST`
- 路由: `/api/mom/answers/like/`
- 说明: 妈妈用户为回答点赞（使用共享账户）

请求体字段:
- `answer_id`（必填，整数）：回答ID

请求示例:
```
POST /api/mom/answers/like/
Content-Type: application/json

{
  "answer_id": 25
}
```

响应示例:
```
{
  "success": true,
  "message": "点赞成功",
  "data": {
    "answer_id": 25,
    "like_count": 16,
    "is_liked": true
  }
}
```

### 取消点赞（共享账户）
- 方法: `POST`
- 路由: `/api/mom/answers/unlike/`
- 说明: 妈妈用户取消对回答的点赞（使用共享账户）

请求体字段:
- `answer_id`（必填，整数）：回答ID

请求示例:
```
POST /api/mom/answers/unlike/
Content-Type: application/json

{
  "answer_id": 25
}
```

响应示例:
```
{
  "success": true,
  "message": "取消点赞成功",
  "data": {
    "answer_id": 25,
    "like_count": 15,
    "is_liked": false
  }
}
```

### 收藏回答（共享账户）
- 方法: `POST`
- 路由: `/api/mom/answers/favorite/`
- 说明: 妈妈用户收藏回答，可按标签分类（使用共享账户）

请求体字段:
- `answer_id`（必填，整数）：回答ID
- `tag_id`（可选，整数）：收藏标签ID

请求示例:
```
POST /api/mom/answers/favorite/
Content-Type: application/json

{
  "answer_id": 25,
  "tag_id": 3
}
```

响应示例:
```
{
  "success": true,
  "message": "收藏成功",
  "data": {
    "favorite_id": 8,
    "answer_id": 25,
    "tag_name": "睡眠问题"
  }
}
```

### 获取收藏列表（共享账户）
- 方法: `GET`
- 路由: `/api/mom/favorites/`
- 说明: 获取妈妈用户的收藏列表，按标签分类（使用共享账户）

请求参数:
- `tag_id`（可选）：筛选特定标签的收藏
- `page`（可选）：页码，默认1
- `page_size`（可选）：每页数量，默认10

请求示例:
```
GET /api/mom/favorites/?tag_id=3&page=1&page_size=5
```

响应示例:
```
{
  "success": true,
  "data": {
    "favorites_by_tag": {
      "睡眠问题": [
        {
          "id": 8,
          "answer": {
            "id": 25,
            "answer_text": "宝宝夜哭可能是因为...",
            "question_title": "宝宝夜里总是哭闹怎么办？",
            "like_count": 16
          },
          "create_time": "2025-01-16T10:30:00.000000"
        }
      ]
    },
    "total_count": 1,
    "page": 1,
    "page_size": 5,
    "total_pages": 1
  }
}
```

---

## 妈妈端 - 感谢信功能

### 发送感谢信（共享账户）
- 方法: `POST`
- 路由: `/api/mom/thank-letters/send/`
- 说明: 妈妈用户向老人发送感谢信（使用共享账户）

请求体字段:
- `elder_user_id`（必填，整数）：老人用户ID
- `answer_id`（必填，整数）：相关回答ID
- `content`（必填，字符串）：感谢信内容

请求示例:
```
POST /api/mom/thank-letters/send/
Content-Type: application/json

{
  "elder_user_id": 1,
  "answer_id": 25,
  "content": "非常感谢您的耐心回答，您的建议很有用！"
}
```

响应示例:
```
{
  "success": true,
  "message": "感谢信发送成功",
  "data": {
    "thank_letter_id": 5,
    "create_time": "2025-01-16T10:00:00.000000"
  }
}
```

---

## 妈妈端 - 问题标签

### 获取问题标签列表（固定6个标签）
- 方法: `GET`
- 路由: `/api/mom/question-tags/`
- 说明: 获取固定的6个问题标签（妈妈搜索专用）

请求参数:
- `category`（可选）：按分类筛选标签

请求示例:
```
GET /api/mom/question-tags/?category=育儿
```

响应示例:
```
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": 1,
        "name": "饮食健康",
        "description": "关于宝宝饮食营养和健康问题",
        "usage_count": 25
      },
      {
        "id": 2,
        "name": "睡眠问题", 
        "description": "关于宝宝睡觉、夜哭等问题",
        "usage_count": 18
      },
      {
        "id": 3,
        "name": "行为培养",
        "description": "关于宝宝行为习惯培养",
        "usage_count": 12
      },
      {
         "id": 4,
         "name": "日常护理",
         "description": "关于宝宝日常护理、健康保健等相关问题",
         "usage_count": 15
       },
      {
        "id": 5,
        "name": "知识启蒙",
        "description": "关于宝宝早教和知识启蒙",
        "usage_count": 20
      },
      {
        "id": 6,
        "name": "趣味陪伴",
        "description": "关于亲子游戏和趣味陪伴",
        "usage_count": 10
      }
    ]
  }
}
```

---

## 妈妈端 - 宝宝常见问题

### 记录宝宝常见问题（共享账户）
- 方法: `POST`
- 路由: `/api/mom/baby-issues/record/`
- 说明: 记录宝宝的常见问题和症状（使用共享账户）

请求体字段:
- `issue_type`（必填，字符串）：问题类型
- `description`（必填，字符串）：问题描述
- `frequency`（可选，字符串）：发生频率
- `severity`（可选，字符串）：严重程度

请求示例:
```
POST /api/mom/baby-issues/record/
Content-Type: application/json

{
  "issue_type": "睡眠问题",
  "description": "夜里经常哭闹，难以入睡",
  "frequency": "每晚2-3次",
  "severity": "中等"
}
```

响应示例:
```
{
  "success": true,
  "message": "记录成功",
  "data": {
    "issue_id": 12,
    "issue_type": "睡眠问题",
    "create_time": "2025-01-16T11:00:00.000000"
  }
}
```

### 获取宝宝问题记录（共享账户）
- 方法: `GET`
- 路由: `/api/mom/baby-issues/`
- 说明: 获取妈妈用户记录的宝宝问题列表（使用共享账户）

请求参数:
- `page`（可选）：页码，默认1
- `page_size`（可选）：每页数量，默认10
- `issue_type`（可选）：按问题类型筛选

请求示例:
```
GET /api/mom/baby-issues/?page=1&page_size=5&issue_type=睡眠问题
```

响应示例:
```
{
  "success": true,
  "data": {
    "issues": [
      {
        "id": 12,
        "issue_type": "睡眠问题",
        "description": "夜里经常哭闹，难以入睡",
        "frequency": "每晚2-3次",
        "severity": "中等",
        "create_time": "2025-01-16T11:00:00.000000"
      }
    ],
    "total_count": 1,
    "page": 1,
    "page_size": 5,
    "total_pages": 1
  }
}
}
```

---

## 语音与 AI 总结

> 注：此处迁移了你在 `test.py` 与 `newApi.py` 的逻辑到 `voice` 应用中，保持 apikey/secretkey 的读取方式（常量）不变。除下述“上传-转写-总结一体化接口”外，`/api/voice/transcribe` 与 `/api/voice/summarize` 仍可独立使用以便单独调试与复用。

### 语音转文字（百度 ASR）
- 方法: `POST`
- 路由: `/api/voice/transcribe`
- 说明: 接收本地服务器可访问的 WAV 文件路径（16kHz / 单声道 / PCM16），调用百度 ASR。

请求体:
```
{
  "audio_file_path": "E:/python/voice/test1.wav"
}
```

成功响应:
```
{
  "code": 200,
  "message": "识别成功",
  "data": { "result": ["孩子不爱吃饭怎么办..."] }
}
```

失败响应:
```
{
  "code": 500,
  "message": "识别失败",
  "data": { "error": "错误信息..." }
}
```

### AI 文本总结（DeepSeek）
- 方法: `POST`
- 路由: `/api/voice/summarize`
- 说明: 接收原文文本，调用 DeepSeek 进行总结。

请求体:
```
{
  "text": "原文文本..."
}
```

成功响应:
```
{
  "code": 200,
  "message": "总结成功",
  "data": { "summary": "总结后的文本..." }
}
```

失败响应:
```
{
  "code": 500,
  "message": "总结失败",
  "data": { "error": "错误：输入内容为空，无法进行总结。" }
}


### 一次上传就拿到转写+总结（推荐老人流程）
- 方法: `POST`
- 路由: `/api/voice/upload_transcribe_summarize`
- 说明: 通过 `multipart/form-data` 上传 WAV（16kHz / 单声道 / PCM16），后端保存文件，调用百度 ASR 转写，再使用 DeepSeek 进行总结，一次返回“原文转写 + AI 总结 + 文件URL”。

请求（form-data）示例：
```
POST /api/voice/upload_transcribe_summarize
Content-Type: multipart/form-data

file=<本地 WAV 文件，键名为 file>
```

成功响应示例：
```
{
  "code": 200,
  "message": "处理成功",
  "data": {
    "transcript": "识别出的原始文本...",
    "summary": "基于原始文本的结构化总结...",
    "file_url": "/media/voice/xxxxx.wav"
  }
}
```

错误响应示例：
```
// 缺少文件或格式不符
{
  "code": 400,
  "message": "缺少文件，请使用字段名 file 进行上传" // 或 "仅支持 WAV 格式，请先转换为 16kHz/单声道/PCM16",
  "data": null
}

// ASR 或总结失败
{
  "code": 500,
  "message": "语音识别失败" // 或 "总结失败",
  "data": {"error": "详细错误信息", "file_path": "服务端保存路径", "transcript": "（若可用）识别文本"}
}
```

Postman 使用指引：
- 方法：`POST`
- URL：`http://127.0.0.1:8000/api/voice/upload_transcribe_summarize`
- Body：选择 `form-data`，新增键 `file`，类型选 `File`，上传本地 WAV（16kHz/mono/PCM16）
- 成功后可在响应中获取 `file_url`；在开发环境 `DEBUG=True` 且已配置 `MEDIA_URL=/media/` 与 `MEDIA_ROOT` 时，可直接访问 `http://127.0.0.1:8000/media/voice/<文件名>`

注意事项：
- 若源文件不是 16kHz/单声道/PCM16，可用 `ffmpeg` 转码：
  - `ffmpeg -i input.mp3 -ar 16000 -ac 1 -c:a pcm_s16le output.wav`
- 生产环境建议使用 Nginx/对象存储提供静态/媒体文件访问；文档中的 `/media/` 路由仅用于开发调试。

INSERT INTO user_user (id, name, role, join_time, points, answer_count, like_count, help_count)
VALUES
  (1, '共享育儿专家', '育儿专家', '2024-01-01 00:00:00', 0, 0, 0, 0);

INSERT INTO qa_question (id, title, category, content, tags, create_time)
VALUES
  (1, '孩子不爱吃饭怎么办？', '饮食健康', '孩子最近不好好吃饭，喂饭很困难。', '吃饭,喂养,儿童', '2025-09-15 10:00:00'),
  (2, '宝宝晚上频繁夜醒怎么处理？', '睡眠问题', '宝宝2岁，最近每天晚上醒3-4次。', '夜醒,睡眠,2岁+', '2025-09-16 09:30:00'),
  (3, '如何帮助孩子建立自律习惯？', '行为培养', '希望孩子能按时完成作业并自我管理。', '自律,作业,习惯', '2025-09-17 08:20:00'),
  (4, '宝宝日常作息安排', '作息', '请给出合理作息建议', '', '2025-10-14 11:24:42.000000'),
  (5, '辅食添加顺序', '饮食', '辅食应该怎么逐步添加？', '辅食,添加', '2025-10-14 11:25:27.000000'),
  (6, '如何应对夜哭', '睡眠', '孩子晚上经常哭闹怎么办？', '睡眠,夜哭', '2025-10-14 11:25:32.000000');

-- 插入 3 条语音记录示例（均绑定 user_id=1 和对应 question_id）
INSERT INTO voice_voicerecord (id, user_id, question_id, voice_file_url, voice_format, transcribe_status, transcribed_text, create_time, update_time)
VALUES
  (101, 1, 1, 'E:\python\nuanya\temp\test1.wav', 'wav', 'pending', NULL, '2025-09-30 11:00:00', '2025-09-30 11:00:00'),
  (102, 1, 2, 'E:\python\nuanya\temp\dayao.wav', 'wav', 'pending', '宝宝夜醒通常与睡眠环境相关。', '2025-09-30 11:05:00', '2025-09-30 11:10:00'),
  (103, 1, 3, 'E:\python\nuanya\temp\eda.wav', 'wav', 'pending', NULL, '2025-09-30 11:15:00', '2025-09-30 11:15:30');

INSERT INTO qa_answer (id, user_id, question_id, answer_text, create_time, like_count, voice_record_id)
VALUES
  (1, 1, 1, '可尝试少量多餐，搭配鲜艳餐具吸引注意力，餐前1小时不喂零食。', '2025-09-30 11:00:00', 0, 101),
  (2, 1, 2, '保持房间温度22-24℃，睡前避免过度兴奋，注意补充维生素D。', '2025-09-30 11:20:00', 0, NULL),
  (3, 1, 3, '建立家庭作息表，给孩子明确的任务清单与奖励机制。', '2025-09-30 11:30:00', 0, 103);

INSERT INTO user_pointsrecord (id, user_id, points, reason, related_answer_id, create_time)
VALUES
  (1, 1, 50, '回答问题', 1, '2025-09-30 11:00:00'),
  (2, 1, 50, '回答问题', 2, '2025-09-30 11:20:00'),
  (3, 1, 50, '回答问题', 3, '2025-09-30 11:30:00');

INSERT INTO honors_badge (id, name, description)
VALUES
  (1, '首次回答', '发表第一个育儿问答即可获得'),
  (2, '经验丰富', '累计回答100个问题可获得'),
  (3, '分享达人', '连续7天提交回答可获得');
  (4, '育儿专家', '获得100个点赞可获得');

INSERT INTO honors_userbadge (id, user_id, badge_id, obtain_time)
VALUES
  (1, 1, 1, '2024-01-02 00:00:00'),
  (2, 1, 2, '2024-06-15 00:00:00'),
  (3, 1, 3, '2025-09-30 12:00:00');

INSERT INTO user_usersettings (id, user_id, sound, notification)
VALUES
  (1, 1, 'on', 'on');

INSERT INTO qa_question (title, category, content, tags, create_time) VALUES ('宝宝日常作息安排', '作息', '请给出合理作息建议', '', NOW());
INSERT INTO qa_question (title, category, content, tags, create_time) VALUES ('辅食添加顺序', '饮食', '辅食应该怎么逐步添加？', '辅食,添加', NOW());
INSERT INTO qa_question (title, category, content, tags, create_time) VALUES ('如何应对夜哭', '睡眠', '孩子晚上经常哭闹怎么办？', '睡眠,夜哭', NOW());

INSERT INTO honors_thankletter (title, content, sender_name, create_time, recipient_expert, help_category, is_featured, sender_relation) 
VALUES 
('感谢解答睡眠难题', '您教的“建立睡前仪式”方法太有用了，宝宝现在晚上能很快入睡，夜醒也少了，全家都能睡安稳觉了。', '王妈妈', '2025-10-15 10:15:00', '共享育儿专家', '睡眠调整', 1, '家长');
('育儿路上的启发', '非常感谢您在育儿方面的悉心指导，您分享的那些接地气的经验 —— 比如观察孩子饥饱信号喂饭、用规律作息帮孩子养成好习惯，还有孩子摔倒时先安抚再引导的小技巧，真的帮我们解决了不少实际难题。之前我们总在喂饭、哄睡这些事上手忙脚乱，听了您的建议后慢慢调整，发现孩子不仅配合多了，我们带娃也少了很多焦虑，真是受益 发明。您的指导不只是方法，更带着对孩子的耐心和对我们的理解，没有居高临下的 “说教”，全是实实在在的经验之谈，让我们既学到了带娃技巧，也更懂怎么蹲下来跟孩子相处。往后要是遇到新的育儿困惑，还想多向您请教，也会把这些好用的经验分享给身边有需要的朋友，让更多家长和孩子受益。', '李爸爸', '2025-10-15 09:30:00', '共享育儿专家', '辅食喂养', 0, '家长');