# NuanYa (暖芽) — AI-Assisted Intergenerational Parenting Knowledge Assessment & Recommendation Platform

> 深圳零一学院 X-Challenge 挑战营 · 社会智能赛道（清华大学深圳国际研究生院主办）  
> 🏆 上海首届大学生AI+国际创业大赛总决赛 入围  
> 🧬 华大基因『猛犸杯』国际生命科学创新大赛 青少年科学家赛道半决赛优胜

## About

An intelligent platform connecting **elderly experience contributors** with **young parents**, using NLP and AI to evaluate, filter, and recommend trustworthy parenting advice.

**The core problem**: Young parents face fragmented, low-quality online parenting information, while elderly family members possess rich practical experience but lack effective channels to share it.

**Our solution**: A 3-layer AI evaluation pipeline that assesses every piece of shared experience for *demand relevance*, *credibility*, and *practical value* before recommending it to users.

### Team & My Role

- **10-person cross-university team** (BNBU, Zhejiang University, HIT Shenzhen, and others)
- **My role**: Project Initiator & Lead Developer (4-person code team)
- Led the project from concept to working prototype to **competition finals presentation**

## ✨ Core Innovation: 3-Layer AI Evaluation Pipeline

What sets NuanYa apart from a generic Q&A system is its **automated experience quality assessment**:

```
User Experience Input
        ↓
  ┌─────────────────┐
  │ Layer 1: Demand  │  → Classify need type, urgency, help format
  │   Understanding  │     (Rule-based + NLP keyword analysis)
  └────────┬────────┘
           ↓
  ┌─────────────────┐
  │ Layer 2:         │  → Classify as Scientific / Unverified / Risky
  │   Credibility    │     Flag dangerous advice (e.g. alcohol rub for fever)
  │   Assessment     │     Output: label, risk level, confidence score
  └────────┬────────┘
           ↓
  ┌─────────────────┐
  │ Layer 3: Value   │  → Score = α·Safety + β·Feasibility + γ·Utility
  │   Assessment     │     (α=0.4, β=0.3, γ=0.3)
  └────────┬────────┘
           ↓
     Risk Identification
           ↓
   Ranked Recommendation
```

### Layer 1: Demand Understanding

When a user posts a question, the system automatically identifies:

| Dimension | Example Output |
|-----------|---------------|
| Need Type | Parenting |
| Urgency | High |
| Help Format | Guidance |

Implementation: rule-based system + NLP keyword analysis + Sentence Transformer extension interface.

### Layer 2: Experience Credibility Assessment

Not all experience is correct. The system classifies shared experiences into:

| Category | Example | Risk |
|----------|---------|------|
| **Scientific** | "Stay hydrated, follow doctor's advice" | ✅ Safe |
| **Unverified** | "I heard this works" / "Old tradition" | ⚠️ Needs verification |
| **Risky** | "Rub alcohol on baby" / "Sweat out the fever" | ❌ Dangerous |

Output: classification label, risk level, recommended action, confidence score.

### Layer 3: Experience Value Assessment

Even credible experiences may not be useful. The value scoring model evaluates:

```
Value = 0.4 × Safety + 0.3 × Feasibility + 0.3 × Utility
```

Used for ranking and recommendation of experiences.

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Django + Django REST Framework |
| **Database** | MySQL |
| **AI/NLP** | Sentence Transformer, keyword analysis, rule-based classification |
| **Frontend** | Mobile App (cross-platform) |
| **API Design** | RESTful |

## 📋 System Architecture

### Backend Modules

| Module | Path | Responsibility |
|--------|------|---------------|
| **QA** | `qa/` | Question posting, answer submission, question management |
| **User** | `user/` | User management, favorites, points system |
| **Voice** | `voice/` | Voice recording, speech-to-text conversion |
| **Honors** | `honors/` | Badges, thank-you letters, leaderboard |

### AI Assessment Modules

| Module | File | Function |
|--------|------|----------|
| Demand Understanding | `demand_understanding_model.py` | Classify user needs (type, urgency, help format) |
| Credibility Assessment | `experience_credibility_model.py` | Classify experience reliability + risk flagging |
| Value Assessment | `experience_value_model.py` | Multi-dimensional value scoring (Safety/Feasibility/Utility) |
| Full Pipeline | `experience_assessment_pipeline.py` | End-to-end: input → understand → credibility → value → recommend |

### Mobile App Features

- User registration & login
- Question browsing & posting
- Voice-based experience sharing (elderly-friendly)
- Honor & badge system (gamified engagement)
- Points & reward system

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- MySQL 8.0+

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/nuanya.git
cd nuanya

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure database
# Create .env file with your MySQL credentials

# Run migrations
python manage.py migrate

# Start server
python manage.py runserver
```

## 📸 Screenshots

> Add screenshots of the running application here.

| View | Description |
|------|-------------|
| Question Feed | Browse parenting questions with category filters |
| Voice Answer | Elderly user recording voice-based experience |
| Assessment Result | AI credibility & value scores for an experience |
| Honor Board | User badges and leaderboard |

To add: create a `docs/` folder, save screenshots, and reference:
```markdown
![Question Feed](docs/question_feed.png)
```

## 🔬 Research Relevance

This project touches on several active research areas:

- **Trustworthy AI**: automated health information credibility screening
- **NLP for Social Good**: applying language understanding to intergenerational knowledge transfer
- **Knowledge Quality Evaluation**: multi-dimensional scoring of user-generated content
- **Human-AI Collaboration**: AI-assisted experience curation and risk identification

## 🏆 Awards

| Competition | Result |
|-------------|--------|
| 上海首届大学生AI+国际创业大赛总决赛 | Finalist (决赛路演) |
| 华大基因『猛犸杯』国际生命科学创新大赛 | Semi-finalist (青少年科学家赛道) |
| 深圳零一学院 X-Challenge 挑战营 | Selected Project |

## 👤 Author

**Sophie Li (李子怿)** — Data Science, BNBU

Project Initiator & Lead Developer (4-person code team within 10-person cross-university team)

📫 u430026116@mail.bnbu.edu.cn
