import json
import logging
from typing import Dict, Any

# 尝试导入 transformers（如果本地尚未安装，也不影响基础流程的测试运行）
try:
    from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
    HAS_TRANSFORMERS = True
except ImportError:
    HAS_TRANSFORMERS = False

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class SemanticParser:
    """
    3.1 语义理解模型（统一语义解析）
    基于 BERT / ERNIE 微调模型
    功能：对所有输入内容（老人经验、父母问题、老人问题）进行统一语义解析
    实现“非结构化文本 → 可计算语义数据”的转化
    """
    def __init__(self, model_path: str = "nghuyong/ernie-3.0-base-zh", use_mock: bool = True):
        """
        初始化语义理解模型
        :param model_path: 本地微调的 BERT/ERNIE 模型路径或 HuggingFace 模型名
        :param use_mock: 是否使用 Mock 模式（在无显卡或未下载真实模型时测试逻辑）
        """
        self.model_path = model_path
        self.use_mock = use_mock
        
        if not self.use_mock and HAS_TRANSFORMERS:
            logging.info(f"正在加载预训练模型: {self.model_path} ...")
            try:
                # 这里演示标准的模型加载逻辑。
                # 实际微调模型可能是一个联合模型（Joint Model）做分类(主题)+NER(行为、年龄)
                self.tokenizer = AutoTokenizer.from_pretrained(self.model_path)
                
                # 假设此处加载了两个 pipeline，一个是主题分类，一个是信息抽取
                # self.theme_classifier = pipeline("text-classification", model=self.model_path, tokenizer=self.tokenizer)
                # self.ner_extractor = pipeline("ner", model=self.model_path + "-ner", tokenizer=self.tokenizer)
                
                logging.info("模型加载完成。")
            except Exception as e:
                logging.error(f"加载真实模型失败: {e}。回退到 Mock 模式。")
                self.use_mock = True
        elif not self.use_mock and not HAS_TRANSFORMERS:
            logging.warning("未安装 transformers 库，将强制使用 Mock 模式。运行 `pip install transformers` 安装。")
            self.use_mock = True

    def parse(self, text: str) -> Dict[str, Any]:
        """
        核心方法：统一语义解析
        :param text: 输入非结构化文本 (例如: "宝宝晚上哭闹可以轻轻拍背")
        :return: 结构化语义数据字典
        """
        if not text or not isinstance(text, str):
            return {"主题": "未知", "适用年龄": "未知", "行为": "未知"}
            
        if self.use_mock:
            return self._mock_inference(text)
            
        # ---------- 真实模型推理流程 (演示代码) ----------
        # 1. 预测主题
        # theme_pred = self.theme_classifier(text)[0]['label']
        
        # 2. 抽取实体 (行为、年龄)
        # entities = self.ner_extractor(text)
        # age = self._extract_entity_from_ner(entities, "AGE")
        # behavior = self._extract_entity_from_ner(entities, "BEHAVIOR")
        
        # return {
        #     "主题": theme_pred,
        #     "适用年龄": age if age else "未知",
        #     "行为": behavior if behavior else "未知"
        # }
        
        # 由于这里仅做代码框架搭建，不真实调用 transformer 模型，直接返回默认值
        return {"主题": "未知", "适用年龄": "未知", "行为": "未知"}

    def _mock_inference(self, text: str) -> Dict[str, Any]:
        """
        Mock 推理逻辑：基于规则/关键字，用于演示“非结构化文本 → 可计算语义数据”的效果。
        """
        # 针对输入示例的精确匹配
        if text.strip() == "宝宝晚上哭闹可以轻轻拍背":
            return {
                "主题": "哄睡",
                "适用年龄": "0-1岁",
                "行为": "拍背安抚"
            }
            
        # 通用关键字匹配模拟
        normalized = text.replace(" ", "")
        result = {"主题": "行为培养", "适用年龄": "0-3岁", "行为": "未知"}

        if any(
            k in normalized
            for k in [
                "哭",
                "夜醒",
                "哄睡",
                "入睡",
                "午睡",
                "赖床",
                "小夜灯",
                "踢被子",
                "摇篮曲",
                "睡",
                "夜奶",
                "睡前流程",
                "睡前",
                "安抚",
            ]
        ):
            result["主题"] = "哄睡"
            if any(k in normalized for k in ["拍背", "拍拍背", "轻拍背"]):
                result["行为"] = "拍背安抚"
            elif any(k in normalized for k in ["白噪音", "关灯", "讲故事", "抚触"]):
                result["行为"] = "睡前流程/环境调整"
            else:
                result["行为"] = "言语安抚/陪伴"
        elif any(
            k in normalized
            for k in [
                "辅食",
                "喂",
                "母乳",
                "吐奶",
                "拍嗝",
                "米粉",
                "铁",
                "挑食",
                "便秘",
                "喝水",
                "断奶",
                "吃饭",
                "能不能吃",
                "食物",
                "进食",
                "新食物",
                "致敏",
                "高致敏",
                "过敏体质",
                "忌口",
                "食盐",
                "盐",
                "烹调油",
                "食用油",
                "蔬菜",
                "水果",
                "全谷物",
                "杂豆",
                "蛋",
                "鱼",
                "低糖",
                "低盐",
                "高盐",
                "高糖",
                "高油",
                "加工食品",
                "钙片",
                "维生素",
                "通便",
                "摄入",
                "主食",
            ]
        ):
            result["主题"] = "饮食健康"
            if any(k in normalized for k in ["高铁", "含铁", "铁米粉", "米粉"]):
                result["行为"] = "辅食添加"
            elif any(k in normalized for k in ["拍嗝", "吐奶"]):
                result["行为"] = "喂养姿势/拍嗝"
            elif any(k in normalized for k in ["便秘", "腹泻", "拉肚子"]):
                result["行为"] = "饮食调整"
            else:
                result["行为"] = "饮食结构调整"
        elif any(
            k in normalized
            for k in [
                "发烧",
                "高烧",
                "体温",
                "咳嗽",
                "喘",
                "腹泻",
                "拉肚子",
                "湿疹",
                "尿布疹",
                "红屁屁",
                "护臀",
                "氧化锌",
                "流鼻血",
                "鼻出血",
                "鼻翼",
                "压迫",
                "鼻塞",
                "呕吐",
                "过敏",
                "荨麻疹",
                "疫苗",
                "接种",
                "异物",
                "冲洗",
                "角膜",
                "视力",
                "红肿",
                "疼痛",
                "白内障",
                "助听器",
                "急救",
                "消毒",
                "碘伏",
            ]
        ):
            result["主题"] = "病护应对"
            if any(k in normalized for k in ["酒精", "擦浴"]):
                result["行为"] = "禁止酒精擦拭"
            elif "口服补液盐" in normalized or "补液盐" in normalized or "ORS" in normalized:
                result["行为"] = "口服补液/防脱水"
            elif "温水" in normalized:
                result["行为"] = "温水擦拭/物理降温"
            elif "冷敷" in normalized:
                result["行为"] = "冷敷/观察"
            elif any(k in normalized for k in ["就医", "急诊", "医院"]):
                result["行为"] = "就医判断/观察"
        elif any(
            k in normalized
            for k in [
                "安全座椅",
                "误食",
                "误饮",
                "中毒",
                "烫伤",
                "溺水",
                "摔",
                "跌倒",
                "尖锐",
                "电池",
                "磁力珠",
                "药品",
                "清洁剂",
                "上锁",
                "高处",
                "分装",
                "饮料瓶",
                "近视",
                "远眺",
                "户外活动",
                "用眼",
                "口罩",
                "洗手",
                "通风",
                "消毒",
            ]
        ):
            result["主题"] = "安全防护"
            if any(k in normalized for k in ["安全座椅", "乘车"]):
                result["行为"] = "安全座椅使用"
            elif any(k in normalized for k in ["烫", "烫伤", "冲洗"]):
                result["行为"] = "烫伤急救"
            elif any(k in normalized for k in ["误食", "电池", "磁力珠", "中毒"]):
                result["行为"] = "防误食/就医"
            else:
                result["行为"] = "安全风险提示"
        elif any(
            k in normalized
            for k in [
                "背诗",
                "阅读",
                "绘本",
                "语言",
                "发音",
                "专注",
                "专注力",
                "学习",
                "启蒙",
                "早教",
                "积木",
                "拼图",
                "认知",
                "颜色",
                "数字",
                "数数",
                "讲故事",
                "互动",
                "训练",
                "练习",
                "写字",
                "收纳",
            ]
        ):
            result["主题"] = "知识启蒙"
            result["行为"] = "亲子互动/训练"
        elif any(k in normalized for k in ["抢玩具", "情绪", "发脾气", "规则", "奖励", "轮流", "分享", "如厕训练"]):
            result["主题"] = "行为培养"
            result["行为"] = "规则建立/正向强化"
            
        # 年龄推测
        if "月" in normalized or "婴儿" in normalized or "新生儿" in normalized:
            result["适用年龄"] = "0-1岁"
        elif "娃娃" in normalized or "娃" in normalized:
            result["适用年龄"] = "1-3岁"
            
        return result

def test_semantic_parser():
    """
    运行测试用例，验证语义解析模块的输出
    """
    parser = SemanticParser(use_mock=True)
    
    print("="*50)
    print(" 3.1 语义理解模型（统一语义解析）- 测试运行 ")
    print("="*50)
    
    test_cases = [
        "宝宝晚上哭闹可以轻轻拍背",
        "发烧了用温水擦身子，千万莫用酒精",
        "娃儿不爱吃饭，老一辈说喂点山楂水开胃",
        "娃儿摔跤了莫慌，先观察，能自己爬起来就没事"
    ]
    
    for i, text in enumerate(test_cases, 1):
        print(f"\n[测试用例 {i}]")
        print(f"输入非结构化文本: \"{text}\"")
        
        # 调用语义解析
        result = parser.parse(text)
        
        # 格式化输出
        print("输出结构 (可计算语义数据):")
        print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    test_semantic_parser()
