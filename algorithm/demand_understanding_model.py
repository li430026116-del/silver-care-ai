import argparse
import csv
import json
import math
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

try:
    from sentence_transformers import SentenceTransformer

    HAS_SENTENCE_TRANSFORMERS = True
except Exception:
    HAS_SENTENCE_TRANSFORMERS = False

try:
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    HAS_TRANSFORMERS = True
except Exception:
    HAS_TRANSFORMERS = False

DEMAND_TYPES = ["育儿", "技术", "生活"]
URGENCY_LEVELS = ["高", "中", "低"]
HELP_TYPES = ["指导", "推荐", "解释"]


@dataclass
class DemandRecord:
    record_id: str
    text: str
    intent_type: str
    urgency: str
    help_type: str
    user_role: str
    expected_match: str


@dataclass
class ElderProfile:
    name: str
    expertise_tags: List[str]


class DemandUnderstandingModel:
    def __init__(
        self,
        data_dir: Path,
        use_mock: bool = True,
        encoder_name: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    ):
        self.data_dir = data_dir
        self.use_mock = use_mock
        self.encoder_name = encoder_name
        self.records = load_demand_dataset(self.data_dir)
        self.encoder = None
        if not self.use_mock and HAS_SENTENCE_TRANSFORMERS:
            self.encoder = SentenceTransformer(self.encoder_name)
        if not self.use_mock and not HAS_SENTENCE_TRANSFORMERS:
            self.use_mock = True
        self.elders = default_elder_profiles()

    def parse_demand(self, text: str, user_role: Optional[str] = None) -> Dict[str, Any]:
        text = (text or "").strip()
        if not text:
            return {"需求类型": "生活", "紧急程度": "中", "帮助类型": "解释"}
        if self.use_mock:
            return self._parse_by_rules(text, user_role)
        return self._parse_by_rules(text, user_role)

    def _parse_by_rules(self, text: str, user_role: Optional[str]) -> Dict[str, Any]:
        normalized = text.replace(" ", "")
        demand_type = self._infer_demand_type(normalized, user_role)
        urgency = self._infer_urgency(normalized)
        help_type = self._infer_help_type(normalized)
        return {"需求类型": demand_type, "紧急程度": urgency, "帮助类型": help_type}

    def _infer_demand_type(self, text: str, user_role: Optional[str]) -> str:
        tech_keywords = ["手机", "APP", "应用", "电脑", "微信", "不会用", "设置", "安装"]
        child_keywords = ["孩子", "宝宝", "新生儿", "母乳", "辅食", "哄睡", "育儿"]
        elder_keywords = ["老人", "老年", "血压", "糖尿病", "关节", "睡不着", "高血压"]
        if any(k in text for k in tech_keywords):
            return "技术"
        if any(k in text for k in child_keywords):
            return "育儿"
        if any(k in text for k in elder_keywords):
            return "生活"
        if user_role == "老人":
            return "生活"
        if user_role == "家长":
            return "育儿"
        return "生活"

    def _infer_urgency(self, text: str) -> str:
        high = ["马上", "立刻", "急", "严重", "危险", "持续", "高烧", "晕"]
        low = ["什么时候", "能不能", "建议", "推荐", "一般", "需要吗"]
        if any(k in text for k in high):
            return "高"
        if any(k in text for k in low):
            return "低"
        return "中"

    def _infer_help_type(self, text: str) -> str:
        if "推荐" in text or "哪个好" in text or "怎么选" in text:
            return "推荐"
        if "为什么" in text or "原因" in text or "解释" in text:
            return "解释"
        return "指导"

    def infer_need_tag(self, text: str, user_role: str) -> str:
        quick = self._quick_need_tag(text, user_role=user_role)
        if quick:
            return quick
        candidates = [r for r in self.records if r.user_role == user_role]
        if not candidates:
            return ""
        if self.encoder:
            need_vec = self.encoder.encode([text], normalize_embeddings=True)[0].tolist()
            best_score = -1.0
            best_tag = ""
            for record in candidates:
                record_vec = self.encoder.encode(
                    [record.text], normalize_embeddings=True
                )[0].tolist()
                score = cosine_similarity(need_vec, record_vec)
                if score > best_score:
                    best_score = score
                    best_tag = record.expected_match
            return best_tag
        need_vec = hash_vector(text)
        best_score = -1.0
        best_tag = ""
        for record in candidates:
            score = cosine_similarity(need_vec, hash_vector(record.text))
            if score > best_score:
                best_score = score
                best_tag = record.expected_match
        return best_tag

    def _quick_need_tag(self, text: str, user_role: str) -> str:
        t = (text or "").replace(" ", "")
        if not t:
            return ""
        tech_keywords = ["手机", "APP", "应用", "电脑", "微信", "不会用", "设置", "安装", "声音", "音量", "挂号"]
        if any(k in t for k in tech_keywords):
            return "技术帮助"
        if user_role == "家长":
            if any(k in t for k in ["哭", "哄睡", "夜醒", "入睡", "睡"]):
                return "睡眠安抚"
            if any(k in t for k in ["辅食", "吐奶", "拍嗝", "米粉", "便秘", "吃饭", "喝水"]):
                return "喂养护理"
            if any(k in t for k in ["发烧", "咳嗽", "腹泻", "湿疹", "流鼻血", "鼻塞", "疫苗", "接种", "过敏"]):
                return "疾病护理"
            if any(k in t for k in ["误食", "烫伤", "溺水", "跌倒", "中毒", "电池", "磁力珠", "安全座椅"]):
                return "安全急救"
            if any(k in t for k in ["发脾气", "规则", "奖励", "分享", "如厕训练"]):
                return "行为培养"
        if user_role == "老人":
            if any(k in t for k in ["血压", "高血压", "胸闷", "心慌", "头晕", "糖尿病", "血糖", "脑梗", "发热", "疼", "痛"]):
                return "疾病护理"
            if any(k in t for k in ["膝盖", "关节", "腰腿", "肩", "锻炼", "康复", "太极"]):
                return "康复建议"
            if any(k in t for k in ["睡不着", "失眠", "起夜"]):
                return "作息调整"
        return ""

    def recommend_elders(self, text: str, top_k: int = 3, user_role: str = "家长") -> Dict[str, Any]:
        parsed = self.parse_demand(text, user_role=user_role)
        need_tag = self.infer_need_tag(text, user_role=user_role)
        need_text = f"{text} {need_tag}".strip()
        if self.encoder:
            need_vec = self.encoder.encode([need_text], normalize_embeddings=True)[0].tolist()
        else:
            need_vec = hash_vector(need_text)
        scored: List[Tuple[float, ElderProfile]] = []
        for elder in self.elders:
            capability_text = " ".join(elder.expertise_tags)
            cap_vec = (
                self.encoder.encode([capability_text], normalize_embeddings=True)[0].tolist()
                if self.encoder
                else hash_vector(capability_text)
            )
            tag_score = tag_match_score(need_tag, elder.expertise_tags)
            score = 0.7 * tag_score + 0.3 * cosine_similarity(need_vec, cap_vec)
            scored.append((score, elder))
        scored.sort(key=lambda x: x[0], reverse=True)
        results = [
            {
                "老人姓名": elder.name,
                "擅长领域": elder.expertise_tags,
                "匹配度": round(score, 4),
            }
            for score, elder in scored[:top_k]
        ]
        return {"解析结果": parsed, "需求标签": need_tag, "推荐老人": results}


def load_demand_dataset(data_dir: Path) -> List[DemandRecord]:
    records: List[DemandRecord] = []
    for file_name in ["child_demand.csv", "older_demand.csv"]:
        path = data_dir / file_name
        if not path.exists():
            continue
        with path.open("r", encoding="utf-8-sig") as file:
            reader = csv.DictReader(file)
            for row in reader:
                record = DemandRecord(
                    record_id=(row.get("id") or "").strip(),
                    text=(row.get("text") or "").strip(),
                    intent_type=(row.get("intent_type") or "").strip(),
                    urgency=(row.get("urgency") or "").strip(),
                    help_type=(row.get("help_type") or "").strip(),
                    user_role=(row.get("user_role") or "").strip(),
                    expected_match=(row.get("expected_match") or "").strip(),
                )
                if record.text:
                    records.append(record)
    return records


def hash_vector(text: str, dim: int = 256) -> List[float]:
    counts = [0.0] * dim
    clean = "".join(text.split())
    for i in range(len(clean) - 1):
        pair = clean[i : i + 2]
        idx = hash(pair) % dim
        counts[idx] += 1.0
    norm = math.sqrt(sum(v * v for v in counts)) or 1.0
    return [v / norm for v in counts]


def cosine_similarity(a: Sequence[float], b: Sequence[float]) -> float:
    if len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def default_elder_profiles() -> List[ElderProfile]:
    return [
        ElderProfile(name="王奶奶", expertise_tags=["睡眠安抚", "哄睡", "作息调整"]),
        ElderProfile(name="李爷爷", expertise_tags=["疾病护理", "发热处理", "就医判断"]),
        ElderProfile(name="张奶奶", expertise_tags=["喂养护理", "辅食添加", "营养搭配"]),
        ElderProfile(name="陈爷爷", expertise_tags=["行为培养", "情绪管理", "亲子沟通"]),
        ElderProfile(name="赵奶奶", expertise_tags=["安全急救", "烫伤处理", "跌倒观察"]),
        ElderProfile(name="周爷爷", expertise_tags=["技术帮助", "手机使用", "微信挂号"]),
    ]

def normalize_tag(tag: str) -> str:
    aliases = {
        "哄睡": "睡眠安抚",
        "作息": "作息调整",
        "辅食": "辅食添加",
        "发热": "发热处理",
    }
    t = (tag or "").strip()
    return aliases.get(t, t)

def tag_match_score(need_tag: str, expertise_tags: List[str]) -> float:
    if not need_tag:
        return 0.0
    nt = normalize_tag(need_tag)
    normalized_ex = {normalize_tag(t) for t in expertise_tags}
    return 1.0 if nt in normalized_ex else 0.0


def train_intent_model(
    data_dir: Path,
    output_dir: Path,
    target: str,
    model_name: str = "nghuyong/ernie-3.0-base-zh",
    epochs: int = 3,
    batch_size: int = 8,
    seed: int = 42,
) -> Path:
    if not HAS_TRANSFORMERS:
        raise RuntimeError("需要安装 transformers 与 torch 才能训练模型")
    try:
        import torch
        from torch.utils.data import Dataset
        from transformers import Trainer, TrainingArguments
    except Exception as exc:
        raise RuntimeError("需要安装 torch 与 transformers 才能训练模型") from exc

    records = load_demand_dataset(data_dir)
    if not records:
        raise RuntimeError("数据集为空，请确认 child_demand 与 older_demand 已准备")

    labels = sorted({getattr(r, target) for r in records})
    label_to_id = {label: idx for idx, label in enumerate(labels)}
    id_to_label = {idx: label for label, idx in label_to_id.items()}

    random.Random(seed).shuffle(records)
    split_index = int(len(records) * 0.8)
    train_records = records[:split_index]
    eval_records = records[split_index:]

    tokenizer = AutoTokenizer.from_pretrained(model_name)

    class IntentDataset(Dataset):
        def __init__(self, items: Sequence[DemandRecord]):
            self.items = list(items)

        def __len__(self) -> int:
            return len(self.items)

        def __getitem__(self, index: int) -> Dict[str, Any]:
            item = self.items[index]
            encoded = tokenizer(
                item.text,
                padding="max_length",
                truncation=True,
                max_length=128,
                return_tensors="pt",
            )
            encoded = {k: v.squeeze(0) for k, v in encoded.items()}
            encoded["labels"] = torch.tensor(
                label_to_id[getattr(item, target)], dtype=torch.long
            )
            return encoded

    model = AutoModelForSequenceClassification.from_pretrained(
        model_name, num_labels=len(labels), id2label=id_to_label, label2id=label_to_id
    )

    output_dir.mkdir(parents=True, exist_ok=True)
    training_args = TrainingArguments(
        output_dir=str(output_dir),
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        num_train_epochs=epochs,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        logging_steps=10,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        seed=seed,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=IntentDataset(train_records),
        eval_dataset=IntentDataset(eval_records) if eval_records else None,
    )
    trainer.train()
    trainer.save_model(str(output_dir))
    tokenizer.save_pretrained(str(output_dir))
    return output_dir


def run_demo() -> None:
    data_dir = Path(__file__).resolve().parents[1] / "data"
    model = DemandUnderstandingModel(data_dir=data_dir, use_mock=True)
    demo_inputs = [
        "孩子半夜总醒，是不是缺钙，要不要去医院",
        "孩子几个月可以加辅食，最先吃什么",
        "孩子一直哭闹，怎么哄都哄不住怎么办",
    ]
    for text in demo_inputs:
        result = model.recommend_elders(text=text, top_k=3)
        print(json.dumps({"输入": text, "输出": result}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", action="store_true")
    parser.add_argument("--target", choices=["intent_type", "urgency", "help_type"])
    parser.add_argument(
        "--output_dir", default=str(Path(__file__).resolve().parents[1] / "models/demand")
    )
    parser.add_argument("--model_name", default="nghuyong/ernie-3.0-base-zh")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch_size", type=int, default=8)
    args = parser.parse_args()
    if args.train and args.target:
        output_dir = Path(args.output_dir) / args.target
        train_intent_model(
            data_dir=Path(__file__).resolve().parents[1] / "data",
            output_dir=output_dir,
            target=args.target,
            model_name=args.model_name,
            epochs=args.epochs,
            batch_size=args.batch_size,
        )
    run_demo()
