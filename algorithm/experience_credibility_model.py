import argparse
import csv
import json
import logging
import random
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

try:
    from transformers import AutoModelForSequenceClassification, AutoTokenizer, pipeline

    HAS_TRANSFORMERS = True
except Exception:
    HAS_TRANSFORMERS = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

LABELS = ["科学经验", "待验证经验", "风险经验"]
LABEL_TO_ID = {label: idx for idx, label in enumerate(LABELS)}
ID_TO_LABEL = {idx: label for label, idx in LABEL_TO_ID.items()}
DEFAULT_LABEL_MAPPING = {
    "SCIENCE": "科学经验",
    "VERIFY": "待验证经验",
    "RISK": "风险经验",
    "LABEL_0": "科学经验",
    "LABEL_1": "待验证经验",
    "LABEL_2": "风险经验",
}


@dataclass
class CredibilityResult:
    label: str
    risk_level: str
    suggestion: str
    confidence: Optional[float]


class ExperienceCredibilityModel:
    def __init__(
        self,
        model_name: str = "nghuyong/ernie-3.0-base-zh",
        use_mock: bool = True,
        label_mapping: Optional[Dict[str, str]] = None,
    ):
        self.model_name = model_name
        self.use_mock = use_mock
        self.label_mapping = label_mapping or dict(DEFAULT_LABEL_MAPPING)
        self.classifier = None
        if not self.use_mock and HAS_TRANSFORMERS:
            self._init_model()
        if not self.use_mock and not HAS_TRANSFORMERS:
            self.use_mock = True

    def _init_model(self) -> None:
        try:
            tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            model = AutoModelForSequenceClassification.from_pretrained(self.model_name)
            if hasattr(model.config, "id2label") and model.config.id2label:
                self.label_mapping.update(
                    {str(k): v for k, v in model.config.id2label.items()}
                )
            self.classifier = pipeline(
                "text-classification",
                model=model,
                tokenizer=tokenizer,
                return_all_scores=True,
            )
        except Exception:
            self.use_mock = True

    def classify(self, text: str) -> Dict[str, Any]:
        text = (text or "").strip()
        if not text:
            return self._build_result("待验证经验", "中", "补充更多上下文后再判断", None)
        if self.use_mock or not self.classifier:
            return self._classify_by_rules(text)
        return self._classify_by_model(text)

    def _classify_by_rules(self, text: str) -> Dict[str, Any]:
        lower = text.replace(" ", "")
        risk_keywords = [
            "酒精擦",
            "偏方",
            "口服抗生素",
            "退烧贴",
            "高烧捂汗",
            "不吃药",
            "不看医生",
            "苦瓜汁",
            "香油涂",
            "吓一下",
            "掐人中",
            "土方法",
            "祖传",
            "包治百病",
            "神药",
            "秘方",
        ]
        verify_keywords = [
            "可能",
            "听说",
            "据说",
            "有人说",
            "我觉得",
            "试试看",
            "也许",
            "老一辈说",
            "听人说",
            "网上说",
            "传闻",
            "听朋友说",
            "听邻居说",
        ]
        science_keywords = [
            "温水擦拭",
            "遵医嘱",
            "按说明书",
            "少量多次",
            "补水",
            "低盐",
            "不超过",
            "控制在",
            "建议",
            "预防",
            "监测",
            "体检",
            "疫苗",
            "就医",
            "急救",
            "医生",
            "医师",
            "看牙医",
            "生理盐水",
            "碘伏",
            "指南",
            "循证",
            "共识",
            "规范",
            "优先",
            "优先选择",
            "避免",
            "不要",
            "不建议",
            "禁止",
            "需要",
            "应",
            "应该",
            "推荐",
            "根据",
            "观察",
            "评估",
            "补液盐",
            "ORS",
            "消毒",
            "戴口罩",
            "洗手",
            "通风",
            "少盐",
            "限盐",
        ]

        if any(k in lower for k in risk_keywords):
            return self._build_result(
                "风险经验",
                "高",
                "建议咨询医生或改用医学替代方案",
                0.92,
            )
        if any(k in lower for k in verify_keywords):
            return self._build_result(
                "待验证经验",
                "中",
                "建议结合权威来源或医生建议验证",
                0.72,
            )
        if any(k in lower for k in science_keywords):
            return self._build_result(
                "科学经验",
                "低",
                "可作为日常建议参考",
                0.83,
            )
        if re.search(r"\d+(\.\d+)?\s*(mg|g|ml|mmhg|分钟|小时|℃|度|岁|个月)", lower, re.IGNORECASE):
            return self._build_result(
                "科学经验",
                "低",
                "可作为日常建议参考",
                0.78,
            )
        return self._build_result("科学经验", "低", "可作为日常建议参考", 0.55)

    def _classify_by_model(self, text: str) -> Dict[str, Any]:
        scores = self.classifier(text)
        if not scores:
            return self._classify_by_rules(text)
        best_label, best_score = self._pick_best(scores[0])
        mapped_label = self.label_mapping.get(best_label, best_label)
        if mapped_label == "风险经验":
            return self._build_result(mapped_label, "高", "建议咨询医生或改用医学替代方案", best_score)
        if mapped_label == "科学经验":
            return self._build_result(mapped_label, "低", "可作为日常建议参考", best_score)
        return self._build_result(mapped_label, "中", "建议结合权威来源或医生建议验证", best_score)

    def _pick_best(self, scores: List[Dict[str, Any]]) -> tuple[str, float]:
        best = max(scores, key=lambda x: x.get("score", 0.0))
        return best.get("label", "VERIFY"), float(best.get("score", 0.0))

    def _build_result(
        self, label: str, risk_level: str, suggestion: str, confidence: Optional[float]
    ) -> Dict[str, Any]:
        return {
            "分类标签": label,
            "风险等级": risk_level,
            "建议": suggestion,
            "置信度": confidence,
        }


def dataset_schema() -> Dict[str, Any]:
    return {
        "字段": [
            "id",
            "text",
            "label",
        ],
        "label取值": ["科学经验", "待验证经验", "风险经验"],
        "说明": "每一行代表一条经验文本及其人工标注分类标签",
        "示例": [
            {
                "id": "cred_001",
                "text": "宝宝发烧可以用酒精擦身体",
                "label": "风险经验",
            },
            {
                "id": "cred_002",
                "text": "老年人每日食盐摄入量不超过5克，预防高血压",
                "label": "科学经验",
            },
            {
                "id": "cred_003",
                "text": "听说喝点姜汤能退烧",
                "label": "待验证经验",
            },
        ],
    }

def load_credibility_dataset(data_dir: Path) -> List[Dict[str, str]]:
    datasets = []
    for file_name in ["child_risk.csv", "older_risk.csv"]:
        path = data_dir / file_name
        if not path.exists():
            continue
        with path.open("r", encoding="utf-8-sig") as file:
            reader = csv.DictReader(file)
            for row in reader:
                text = (row.get("text") or "").strip()
                label = (row.get("label") or "").strip()
                if text and label:
                    datasets.append({"text": text, "label": label})
    return datasets


def train_credibility_model(
    data_dir: Path,
    output_dir: Path,
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

    data = load_credibility_dataset(data_dir)
    if not data:
        raise RuntimeError("数据集为空，请确认 child_risk.csv 与 older_risk.csv 已准备")

    random.Random(seed).shuffle(data)
    split_index = int(len(data) * 0.8)
    train_data = data[:split_index]
    eval_data = data[split_index:]

    tokenizer = AutoTokenizer.from_pretrained(model_name)

    class CredibilityDataset(Dataset):
        def __init__(self, items: Sequence[Dict[str, str]]):
            self.items = list(items)

        def __len__(self) -> int:
            return len(self.items)

        def __getitem__(self, index: int) -> Dict[str, Any]:
            item = self.items[index]
            encoded = tokenizer(
                item["text"],
                padding="max_length",
                truncation=True,
                max_length=128,
                return_tensors="pt",
            )
            encoded = {k: v.squeeze(0) for k, v in encoded.items()}
            encoded["labels"] = torch.tensor(LABEL_TO_ID[item["label"]], dtype=torch.long)
            return encoded

    model = AutoModelForSequenceClassification.from_pretrained(
        model_name, num_labels=len(LABELS), id2label=ID_TO_LABEL, label2id=LABEL_TO_ID
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
        train_dataset=CredibilityDataset(train_data),
        eval_dataset=CredibilityDataset(eval_data) if eval_data else None,
    )
    trainer.train()
    trainer.save_model(str(output_dir))
    tokenizer.save_pretrained(str(output_dir))
    return output_dir


def run_demo(data_dir: Path, model: ExperienceCredibilityModel) -> None:
    dataset = load_credibility_dataset(data_dir)
    sample_inputs = [item["text"] for item in dataset[:3]] or [
        "宝宝发烧可以用酒精擦身体",
        "老年人每日食盐摄入量不超过5克，预防高血压",
        "听说喝点姜汤能退烧",
    ]
    for text in sample_inputs:
        result = model.classify(text)
        print(json.dumps({"输入": text, "输出": result}, ensure_ascii=False, indent=2))
    print(
        json.dumps(
            {
                "数据集结构": dataset_schema(),
                "数据量": len(dataset),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", action="store_true")
    parser.add_argument(
        "--output_dir", default=str(Path(__file__).resolve().parents[1] / "models/credibility")
    )
    parser.add_argument("--model_name", default="nghuyong/ernie-3.0-base-zh")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch_size", type=int, default=8)
    args = parser.parse_args()
    data_dir = Path(__file__).resolve().parents[1] / "data"
    if args.train:
        output_dir = Path(args.output_dir)
        train_credibility_model(
            data_dir=data_dir,
            output_dir=output_dir,
            model_name=args.model_name,
            epochs=args.epochs,
            batch_size=args.batch_size,
        )
        model = ExperienceCredibilityModel(model_name=str(output_dir), use_mock=False)
    else:
        model = ExperienceCredibilityModel(use_mock=True)
    run_demo(data_dir=data_dir, model=model)
