// 统一的“经验分析”模块：DeepSeek 总结 + 结构化 + 可信度 + SEV 评分
// 说明：按演示需求将 API Key 写在前端代码里（会暴露给用户，仅适合 demo/本地）。

const EXPERIENCE_ANALYZER = (() => {
  const DEEPSEEK_API_KEY = "sk-3c47abd4c5294afb8c5e819e7042c5a0";
  const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
  const DEEPSEEK_MODEL = "deepseek-chat";

  const CACHE_PREFIX = "nuanya:experience_analysis:v1:";

  // demo：对“已有静态回答/收藏”使用预置分析结果，避免现场调用 DeepSeek
  // key 使用原始回答文本（trim 后完全匹配）
  const PRECOMPUTED = Object.freeze({
    // --- 健康养生 ---
    "建议饮食清淡，少吃盐，多吃蔬菜水果。早晨起床时动作要慢，不要起得太猛，可以在床边坐一会儿再站起来。": {
      summary: "饮食尽量清淡少盐，多吃蔬果；早晨起床别着急，先在床边坐一会再站起，避免突然起身加重头晕。",
      structured: { topic: "高血压起床头晕应对", age_range: "中老年/成人", core_behavior: "清淡控盐 + 缓慢起身", tags: ["血压管理", "起床防眩晕", "饮食调理"] },
      credibility: { category: "科学经验", risk_level: "无风险" },
      sev_model: { safety: 96, feasibility: 92, usefulness: 90, overall: 92 },
      recommendation: "可公开推荐，适合多数人日常参考；若反复头晕或血压很高请就医。"
    },
    "睡前可以泡个热水脚，喝一杯热牛奶。白天适当运动，但睡前避免剧烈运动和喝浓茶咖啡。": {
      summary: "睡前泡脚、喝温牛奶帮助放松；白天适度运动更利于入睡，但临睡前别剧烈运动，也尽量不喝浓茶咖啡。",
      structured: { topic: "失眠放松与作息调整", age_range: "成人/中老年", core_behavior: "睡前放松 + 避免刺激物", tags: ["睡眠卫生", "泡脚放松", "咖啡因管理"] },
      credibility: { category: "科学经验", risk_level: "无风险" },
      sev_model: { safety: 94, feasibility: 93, usefulness: 88, overall: 91 },
      recommendation: "可公开推荐；若长期失眠影响生活，建议评估焦虑/睡眠障碍并咨询医生。"
    },

    // --- 育儿：饮食/睡眠/护理/行为 ---
    "可以尝试改变辅食的形状和颜色，吸引宝宝的注意力。另外，大人在旁边吃得津津有味也能激发宝宝的食欲。": {
      summary: "辅食可以做得颜色更丰富、形状更有趣，先吸引宝宝的兴趣；大人也可以示范吃得开心，让宝宝更愿意尝试。",
      structured: { topic: "辅食兴趣引导", age_range: "6-18个月", core_behavior: "提升趣味 + 示范带动", tags: ["辅食添加", "进食兴趣", "亲子示范"] },
      credibility: { category: "科学经验", risk_level: "无风险" },
      sev_model: { safety: 97, feasibility: 90, usefulness: 86, overall: 92 },
      recommendation: "可公开推荐，适合新手父母参考。"
    },
    "白天尽量让宝宝多活动，消耗精力。睡前建立固定的安抚程序，比如洗个温水澡、听轻柔的音乐，慢慢减少夜奶次数。": {
      summary: "白天多让宝宝活动，晚上更容易睡稳；睡前建立固定的安抚流程（洗澡、轻音乐等），再循序渐进减少夜奶。",
      structured: { topic: "夜醒与作息安抚", age_range: "4-12个月", core_behavior: "固定睡前仪式 + 渐进减夜奶", tags: ["睡眠训练", "睡前仪式", "夜奶管理"] },
      credibility: { category: "科学经验", risk_level: "低风险" },
      sev_model: { safety: 92, feasibility: 85, usefulness: 90, overall: 89 },
      recommendation: "可公开推荐；注意根据宝宝月龄和喂养方式循序渐进。"
    },
    "最好在宝宝熟睡的时候剪，用婴儿专用的指甲剪。剪完后记得用小锉刀把边缘磨平，免得宝宝抓伤自己。": {
      summary: "选在宝宝熟睡时修剪指甲更安全；用婴儿专用指甲剪，剪完再轻轻磨圆边缘，避免划伤。",
      structured: { topic: "婴儿指甲修剪", age_range: "0-12个月", core_behavior: "熟睡时修剪 + 磨圆边缘", tags: ["日常护理", "安全防抓伤"] },
      credibility: { category: "科学经验", risk_level: "无风险" },
      sev_model: { safety: 95, feasibility: 92, usefulness: 88, overall: 92 },
      recommendation: "可公开推荐，适合日常护理参考。"
    },
    "这个时候的宝宝还不会表达情绪，打人可能是觉得好玩或者着急。大人要严肃地告诉他不行，然后抓住他的手，教他轻轻摸。": {
      summary: "宝宝打人多半是不会表达情绪或觉得好玩。大人要坚定制止并告诉他“不可以”，再示范用“轻轻摸”来替代。",
      structured: { topic: "打人行为引导", age_range: "1-3岁", core_behavior: "坚定制止 + 替代行为教学", tags: ["行为培养", "情绪表达", "正向引导"] },
      credibility: { category: "科学经验", risk_level: "低风险" },
      sev_model: { safety: 90, feasibility: 86, usefulness: 89, overall: 88 },
      recommendation: "可公开推荐；关键是持续一致与正向强化。"
    },
    "把蔬菜剁碎混在肉丸子或者鸡蛋饼里，宝宝就不容易挑出来了。或者用带卡通图案的餐具装蔬菜。": {
      summary: "把蔬菜切碎混入肉丸、鸡蛋饼等“主食”里，让宝宝更容易接受；也可以用有趣的餐具提升尝试意愿。",
      structured: { topic: "蔬菜摄入提升", age_range: "1-3岁", core_behavior: "混入食物 + 增加趣味", tags: ["挑食应对", "蔬菜摄入", "喂养策略"] },
      credibility: { category: "经验性建议", risk_level: "无风险" },
      sev_model: { safety: 96, feasibility: 88, usefulness: 85, overall: 90 },
      recommendation: "可公开推荐；同时要逐步培养宝宝识别并接受蔬菜本味。"
    },
    "吃饭前一个小时不要给零食，如果实在不吃也不要强迫，饿一顿没关系，让他知道只有在饭点才有东西吃。": {
      summary: "饭前尽量不吃零食，避免影响正餐；不想吃时先别强迫，建立固定饭点与规律，慢慢让孩子回到正常进食节奏。",
      structured: { topic: "饭点与零食管理", age_range: "1-6岁", core_behavior: "控制零食 + 建立规律饭点", tags: ["饮食习惯", "正餐规律", "零食管理"] },
      credibility: { category: "科学经验", risk_level: "中风险" },
      sev_model: { safety: 78, feasibility: 82, usefulness: 86, overall: 82 },
      recommendation: "建议谨慎：可用于短期调整，但需关注体重与情绪，避免用“饿”作为长期手段。"
    },
    "辅食要从一种到多种，从稀到稠，从细到粗。每次加新食物要观察三天看有没有过敏。先加米粉，再加蔬菜泥、果泥、肉泥。": {
      summary: "辅食添加遵循“从一种到多种、从稀到稠、从细到粗”。每加一种新食物观察几天是否过敏，循序渐进更稳妥。",
      structured: { topic: "辅食添加顺序", age_range: "6-12个月", core_behavior: "循序渐进 + 过敏观察", tags: ["辅食添加", "过敏观察", "喂养安全"] },
      credibility: { category: "科学经验", risk_level: "无风险" },
      sev_model: { safety: 97, feasibility: 90, usefulness: 92, overall: 93 },
      recommendation: "可公开推荐，是新手家长常用的安全策略。"
    },
    "半岁左右就可以开始了，买那种撕不烂的布书或者纸板书，颜色鲜艳点，主要是让宝宝习惯看书。": {
      summary: "半岁左右就可以开始读书启蒙，选择耐撕的布书/纸板书、颜色鲜艳的图案，让宝宝先建立“看书很有趣”的习惯。",
      structured: { topic: "早期阅读启蒙", age_range: "6-18个月", core_behavior: "选合适书本 + 形成阅读习惯", tags: ["早教启蒙", "亲子共读"] },
      credibility: { category: "科学经验", risk_level: "无风险" },
      sev_model: { safety: 99, feasibility: 92, usefulness: 86, overall: 93 },
      recommendation: "可公开推荐，适合多数家庭轻松执行。"
    },
    "躲猫猫最好玩了，拿块手帕遮住脸再拿开。还可以拿拨浪鼓在他眼前晃，让他伸手抓。": {
      summary: "可以玩躲猫猫、拨浪鼓追视与抓握等互动小游戏，既有趣又能锻炼宝宝的注意力、追视和手眼协调。",
      structured: { topic: "互动小游戏", age_range: "4-12个月", core_behavior: "躲猫猫/追视抓握互动", tags: ["亲子互动", "感知发展", "手眼协调"] },
      credibility: { category: "科学经验", risk_level: "无风险" },
      sev_model: { safety: 98, feasibility: 95, usefulness: 84, overall: 92 },
      recommendation: "可公开推荐，适合日常陪伴。"
    },
    "用温水擦拭宝宝的额头、脖子、腋下、手心和脚心。多给宝宝喝温开水，衣服不要穿得太厚捂着。": {
      summary: "低烧时可用温水擦拭重点部位帮助散热，并补充温水；衣物别穿太厚，避免“捂汗”导致更不舒服。",
      structured: { topic: "发热物理降温", age_range: "0-6岁", core_behavior: "温水擦拭 + 补液 + 避免捂热", tags: ["发热护理", "物理降温", "补液"] },
      credibility: { category: "科学经验", risk_level: "低风险" },
      sev_model: { safety: 90, feasibility: 92, usefulness: 88, overall: 89 },
      recommendation: "可公开推荐；若高热/精神差/持续不退请及时就医。"
    },

    // --- 妈妈端收藏（文案略有不同） ---
    "建议把辅食做成可爱的形状，增加趣味性。可以在大人吃饭时让宝宝在旁边看着，激发他的食欲。": {
      summary: "把辅食做得更有趣、样子更可爱，先提升宝宝兴趣；大人进餐时也可以示范，让宝宝更愿意跟着尝试。",
      structured: { topic: "辅食兴趣引导", age_range: "6-18个月", core_behavior: "增加趣味 + 示范带动", tags: ["辅食添加", "进食兴趣"] },
      credibility: { category: "科学经验", risk_level: "无风险" },
      sev_model: { safety: 97, feasibility: 90, usefulness: 86, overall: 92 },
      recommendation: "可公开推荐，适合新手父母参考。"
    },
    "白天多消耗体力，睡前建立固定的安抚程序，比如洗澡、讲故事。尽量不要一哭就抱，可以先轻轻拍哄。": {
      summary: "白天活动量足，晚上更好睡；睡前固定流程（洗澡、讲故事等）帮助入睡。夜里醒来先轻拍安抚，再逐步减少立刻抱起。",
      structured: { topic: "夜醒安抚与规律建立", age_range: "4-18个月", core_behavior: "固定睡前流程 + 先安抚再抱", tags: ["睡眠安抚", "睡前仪式"] },
      credibility: { category: "科学经验", risk_level: "中风险" },
      sev_model: { safety: 80, feasibility: 84, usefulness: 88, overall: 83 },
      recommendation: "建议谨慎：可循序渐进尝试，注意宝宝安全感与喂养需求。"
    },
    "最好在宝宝熟睡时修剪，使用专用的婴儿指甲剪，剪平后稍微磨圆边缘，防止抓伤自己。": {
      summary: "最好在宝宝熟睡时修剪指甲，用婴儿专用指甲剪；剪完再磨圆边缘，减少抓伤风险。",
      structured: { topic: "婴儿指甲修剪", age_range: "0-12个月", core_behavior: "熟睡时修剪 + 磨圆", tags: ["日常护理", "安全防护"] },
      credibility: { category: "科学经验", risk_level: "无风险" },
      sev_model: { safety: 95, feasibility: 92, usefulness: 88, overall: 92 },
      recommendation: "可公开推荐。"
    },
    "温和但坚定地制止，告诉他这样不对。可以教他用“摸摸”代替“打”，多给他一些正向的关注。": {
      summary: "先温和但坚定地制止，再告诉孩子“这样不对”；同时教他用“摸摸”等替代行为，并多给予正向关注。",
      structured: { topic: "打人行为替代训练", age_range: "1-3岁", core_behavior: "坚定制止 + 教替代行为", tags: ["行为培养", "正向引导"] },
      credibility: { category: "科学经验", risk_level: "低风险" },
      sev_model: { safety: 90, feasibility: 86, usefulness: 89, overall: 88 },
      recommendation: "可公开推荐。"
    },
    "从几个月大就可以开始，主要是让他感受声音和翻书的乐趣，培养阅读的习惯。": {
      summary: "从几个月大就可以开始亲子共读，让宝宝先感受声音、图画和翻书的乐趣，慢慢培养阅读习惯。",
      structured: { topic: "亲子共读启蒙", age_range: "3-18个月", core_behavior: "共读互动 + 习惯培养", tags: ["早教启蒙", "语言刺激"] },
      credibility: { category: "科学经验", risk_level: "无风险" },
      sev_model: { safety: 99, feasibility: 94, usefulness: 86, overall: 93 },
      recommendation: "可公开推荐。"
    },
    "可以玩躲猫猫、抓握不同材质的玩具、听声音找声源等游戏，锻炼他的感知能力。": {
      summary: "用躲猫猫、抓握不同材质玩具、听声音找声源等小游戏，帮助宝宝练习感知、注意力和手眼协调。",
      structured: { topic: "感知与互动游戏", age_range: "4-12个月", core_behavior: "多感官互动", tags: ["亲子互动", "感知发展"] },
      credibility: { category: "科学经验", risk_level: "无风险" },
      sev_model: { safety: 98, feasibility: 95, usefulness: 84, overall: 92 },
      recommendation: "可公开推荐。"
    }
  });

  function getPrecomputed(text) {
    const key = String(text || "").trim();
    const hit = PRECOMPUTED[key];
    return hit ? normalizeResult(hit) : null;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function sha256(text) {
    const data = new TextEncoder().encode(String(text || ""));
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function clampScore(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    return Math.max(0, Math.min(100, Math.round(x)));
  }

  function normalizeResult(json) {
    const out = json && typeof json === "object" ? json : {};
    const sev = out.sev_model || out.sev || {};
    return {
      summary: String(out.summary || out.refined_summary || "").trim(),
      structured: {
        topic: String((out.structured && out.structured.topic) || out.topic || "").trim(),
        age_range: String((out.structured && out.structured.age_range) || out.age_range || "").trim(),
        core_behavior: String((out.structured && out.structured.core_behavior) || out.core_behavior || "").trim(),
        tags: Array.isArray((out.structured && out.structured.tags) || out.tags) ? ((out.structured && out.structured.tags) || out.tags) : []
      },
      credibility: {
        category: String((out.credibility && out.credibility.category) || out.category || "").trim(),
        risk_level: String((out.credibility && out.credibility.risk_level) || out.risk_level || "").trim()
      },
      sev_model: {
        safety: clampScore(sev.safety),
        feasibility: clampScore(sev.feasibility),
        usefulness: clampScore(sev.usefulness),
        overall: clampScore(sev.overall)
      },
      recommendation: String(out.recommendation || out.conclusion || "").trim()
    };
  }

  async function deepseekAnalyze(text, domainHint = "") {
    const input = String(text || "").trim();
    if (!input) throw new Error("输入为空，无法分析");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const systemPrompt = [
      "你是一个“经验内容分析器”，会对用户提供的经验文本进行：总结、结构化、可信度检测、价值评分与推荐结论。",
      "文本可能是育儿经验，也可能是老人健康/养生经验。请自动识别领域。",
      "请严格以 JSON 输出，禁止输出除 JSON 以外的任何文字、解释或 Markdown。",
      "",
      "输出 JSON 结构固定为：",
      "{",
      '  "summary": "原来的总结（亲和、易懂，符合现代科学理念；大段自动换行每行不超过80字）",',
      '  "structured": {',
      '    "topic": "经验主题（短语）",',
      '    "age_range": "适用年龄（育儿则 0-1岁/1-3岁 等；健康则 可写 50+ 或 成人/老人 等）",',
      '    "core_behavior": "核心行为（动词短语）",',
      '    "tags": ["经验标签1","标签2"]',
      "  },",
      '  "credibility": {',
      '    "category": "科学经验/经验性建议/风险建议/迷信偏方（四选一）",',
      '    "risk_level": "无风险/低风险/中风险/高风险（四选一）"',
      "  },",
      '  "sev_model": {',
      '    "safety": 0-100,',
      '    "feasibility": 0-100,',
      '    "usefulness": 0-100,',
      '    "overall": 0-100',
      "  },",
      '  "recommendation": "系统推荐结论（一句话，例如：可公开推荐，适合新手父母参考/建议谨慎，不建议公开传播等）"',
      "}",
      "",
      "评分规则：风险越高安全性越低；越容易执行可行性越高；对大多数人越有帮助实用性越高；综合评分取加权平均（安全性权重最高）。",
      domainHint ? `领域提示：${domainHint}` : ""
    ].filter(Boolean).join("\n");

    const payload = {
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: input }
      ],
      stream: false
    };

    try {
      const resp = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const raw = await resp.text();
      if (!resp.ok) throw new Error(`DeepSeek请求失败：HTTP ${resp.status} ${resp.statusText}${raw ? ` - ${raw}` : ""}`);

      let json;
      try {
        json = JSON.parse(raw);
      } catch {
        throw new Error(`DeepSeek返回不是JSON：${raw.slice(0, 300)}`);
      }

      const content = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content
        ? String(json.choices[0].message.content).trim()
        : "";
      if (!content) throw new Error("DeepSeek未返回内容");

      let obj;
      try {
        obj = JSON.parse(content);
      } catch {
        // 有些模型会包一层多余字符，做一次最小提取
        const start = content.indexOf("{");
        const end = content.lastIndexOf("}");
        if (start >= 0 && end > start) {
          obj = JSON.parse(content.slice(start, end + 1));
        } else {
          throw new Error(`DeepSeek内容不是JSON对象：${content.slice(0, 300)}`);
        }
      }

      return normalizeResult(obj);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function analyzeWithCache(text, domainHint = "") {
    const key = CACHE_PREFIX + await sha256(String(text || "").trim());
    try {
      const cached = localStorage.getItem(key);
      if (cached) return normalizeResult(JSON.parse(cached));
    } catch {}

    const result = await deepseekAnalyze(text, domainHint);
    try {
      localStorage.setItem(key, JSON.stringify(result));
    } catch {}
    return result;
  }

  function buildSevBarsHtml(sev) {
    const items = [
      ["安全性", clampScore(sev && sev.safety)],
      ["可行性", clampScore(sev && sev.feasibility)],
      ["实用性", clampScore(sev && sev.usefulness)],
      ["综合评分", clampScore(sev && sev.overall)]
    ];
    return `
      <div class="sev-chart">
        ${items.map(([label, score]) => `
          <div class="sev-row">
            <div class="sev-label">${escapeHtml(label)}</div>
            <div class="sev-bar">
              <div class="sev-bar-fill" style="width:${score}%"></div>
            </div>
            <div class="sev-score">${score}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function formatAnalysisHtml(result) {
    const s = result || {};
    const structured = s.structured || {};
    const credibility = s.credibility || {};

    const tags = Array.isArray(structured.tags) ? structured.tags.filter(Boolean).slice(0, 6) : [];

    const risk = String((credibility && credibility.risk_level) || "").trim();
    const cat = String((credibility && credibility.category) || "").trim();
    const riskClass =
      risk.includes("高") ? "risk-high" :
      risk.includes("中") ? "risk-medium" :
      risk.includes("低") ? "risk-low" :
      "risk-none";

    return `
      <div class="analysis-block">
        <div class="analysis-head">
          <div class="analysis-head-left">
            <div class="analysis-head-title">原来的总结</div>
            <div class="analysis-summary">${escapeHtml(s.summary || "")}</div>
          </div>
          <div class="analysis-head-right">
            <div class="cred-badges">
              <span class="badge badge-cat">${escapeHtml(cat || "未分类")}</span>
              <span class="badge ${riskClass}">${escapeHtml(risk || "风险未知")}</span>
            </div>
            <div class="overall-score">
              <div class="overall-score-num">${clampScore((s.sev_model || {}).overall)}</div>
              <div class="overall-score-label">综合</div>
            </div>
          </div>
        </div>

        <div class="analysis-section-title">经验结构化结果</div>
        <div class="analysis-grid">
          <div class="analysis-item"><span class="k">经验主题：</span><span class="v">${escapeHtml(structured.topic || "—")}</span></div>
          <div class="analysis-item"><span class="k">适用年龄：</span><span class="v">${escapeHtml(structured.age_range || "—")}</span></div>
          <div class="analysis-item"><span class="k">核心行为：</span><span class="v">${escapeHtml(structured.core_behavior || "—")}</span></div>
          <div class="analysis-item"><span class="k">经验标签：</span><span class="v">${tags.length ? tags.map(t => `<span class="analysis-tag">${escapeHtml(t)}</span>`).join("") : "—"}</span></div>
        </div>

        <div class="analysis-section-title">经验可信度检测</div>
        <div class="analysis-grid">
          <div class="analysis-item"><span class="k">分类：</span><span class="v">${escapeHtml(credibility.category || "—")}</span></div>
          <div class="analysis-item"><span class="k">风险等级：</span><span class="v">${escapeHtml(credibility.risk_level || "—")}</span></div>
        </div>

        <div class="analysis-section-title">经验价值评分（SEV-Model）</div>
        ${buildSevBarsHtml(s.sev_model || {})}

        <div class="analysis-section-title">系统推荐结论</div>
        <div class="analysis-reco">${escapeHtml(s.recommendation || "—")}</div>
      </div>
    `;
  }

  function formatCompactHtml(result) {
    const s = result || {};
    const sev = s.sev_model || {};
    const credibility = s.credibility || {};
    const summary = String(s.summary || "").trim();
    const summaryShort = summary.length > 44 ? `${summary.slice(0, 44)}…` : summary;

    const risk = String((credibility && credibility.risk_level) || "").trim();
    const cat = String((credibility && credibility.category) || "").trim();
    const riskClass =
      risk.includes("高") ? "risk-high" :
      risk.includes("中") ? "risk-medium" :
      risk.includes("低") ? "risk-low" :
      "risk-none";

    return `
      <div class="analysis-compact">
        <div class="analysis-compact-top">
          <div class="analysis-compact-summary">${escapeHtml(summaryShort || "—")}</div>
          <div class="analysis-compact-score">
            <div class="analysis-compact-score-num">${clampScore(sev.overall)}</div>
            <div class="analysis-compact-score-label">综合</div>
          </div>
        </div>
        <div class="analysis-compact-badges">
          <span class="badge badge-cat">${escapeHtml(cat || "未分类")}</span>
          <span class="badge ${riskClass}">${escapeHtml(risk || "风险未知")}</span>
        </div>
      </div>
    `;
  }

  async function renderCompactInto(containerEl, textToAnalyze, domainHint = "") {
    if (!containerEl) return;
    const source = String(textToAnalyze || "").trim();
    if (!source) {
      containerEl.innerHTML = `<div class="analysis-compact"><div class="analysis-compact-summary">—</div></div>`;
      return;
    }

    const pre = getPrecomputed(source);
    if (pre) {
      containerEl.innerHTML = formatCompactHtml(pre);
      return;
    }

    // 非预置：先展示摘要截断（避免占屏幕），再后台补齐徽章与分数
    const fallbackSummary = source.length > 44 ? `${source.slice(0, 44)}…` : source;
    containerEl.innerHTML = `
      <div class="analysis-compact">
        <div class="analysis-compact-top">
          <div class="analysis-compact-summary">${escapeHtml(fallbackSummary)}</div>
          <div class="analysis-compact-score">
            <div class="analysis-compact-score-num">…</div>
            <div class="analysis-compact-score-label">综合</div>
          </div>
        </div>
        <div class="analysis-compact-badges">
          <span class="badge badge-cat">分析中</span>
          <span class="badge risk-low">请稍候</span>
        </div>
      </div>
    `;

    try {
      const result = await analyzeWithCache(source, domainHint);
      containerEl.innerHTML = formatCompactHtml(result);
    } catch {
      // 失败时保持压缩显示，不影响列表浏览
    }
  }

  // 渲染到一个容器：先放占位，再异步替换为完整分析
  async function renderInto(containerEl, textToAnalyze, domainHint = "") {
    if (!containerEl) return;
    const source = String(textToAnalyze || "").trim();
    if (!source) {
      containerEl.innerHTML = `<div class="analysis-block"><div class="analysis-reco">无内容可分析</div></div>`;
      return;
    }

    // 已有 demo 文案：直接同步渲染预置结果（不调用 DeepSeek）
    const pre = getPrecomputed(source);
    if (pre) {
      containerEl.innerHTML = formatAnalysisHtml(pre);
      return;
    }

    containerEl.innerHTML = `<div class="analysis-block"><div class="analysis-reco">AI分析中...</div></div>`;
    try {
      const result = await analyzeWithCache(source, domainHint);
      containerEl.innerHTML = formatAnalysisHtml(result);
    } catch (e) {
      const msg = e && e.message ? e.message : "分析失败";
      containerEl.innerHTML = `<div class="analysis-block"><div class="analysis-reco">无法生成分析：${escapeHtml(msg)}</div></div>`;
    }
  }

  return {
    analyzeWithCache,
    formatAnalysisHtml,
    renderInto,
    getPrecomputed
    ,formatCompactHtml
    ,renderCompactInto
  };
})();

window.ExperienceAnalyzer = EXPERIENCE_ANALYZER;

