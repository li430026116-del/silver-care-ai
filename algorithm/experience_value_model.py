import ast
import csv
import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

try:
    from transformers import AutoModel, AutoTokenizer, pipeline

    HAS_TRANSFORMERS = True
except Exception:
    HAS_TRANSFORMERS = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


@dataclass
class ExperienceRecord:
    record_id: str
    text: str
    category: str
    subcategory: str
    safety_score: float
    feasibility_score: float
    utility_score: float
    risk_level: str
    tags: List[str]
    dialect: Optional[str]
    features: Set[str]


class ExperienceValueModel:
    def __init__(
        self,
        data_dir: str,
        alpha: float = 0.4,
        beta: float = 0.3,
        gamma: float = 0.3,
        use_mock: bool = True,
        model_name: str = "nghuyong/ernie-3.0-base-zh",
    ):
        self.data_dir = Path(data_dir)
        self.alpha = alpha
        self.beta = beta
        self.gamma = gamma
        self.use_mock = use_mock
        self.model_name = model_name
        self.records: List[ExperienceRecord] = []
        self._load_records()
        self.feature_extractor = None
        self.tokenizer = None
        self.model = None
        if not self.use_mock and HAS_TRANSFORMERS:
            self._init_transformers()
        if not self.use_mock and not HAS_TRANSFORMERS:
            self.use_mock = True

    def _init_transformers(self) -> None:
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModel.from_pretrained(self.model_name)
            self.feature_extractor = pipeline(
                "feature-extraction", model=self.model, tokenizer=self.tokenizer
            )
        except Exception:
            self.use_mock = True

    def _load_records(self) -> None:
        for file_name in ["child.csv", "older.csv"]:
            path = self.data_dir / file_name
            if not path.exists():
                continue
            with path.open("r", encoding="utf-8") as file:
                reader = csv.DictReader(file)
                for row in reader:
                    record = self._row_to_record(row)
                    self.records.append(record)

    def _get_value(self, row: Dict[str, str], *keys: str) -> str:
        for key in keys:
            if key in row and row[key] is not None:
                return row[key]
        return ""

    def _row_to_record(self, row: Dict[str, str]) -> ExperienceRecord:
        tags = self._parse_tags(self._get_value(row, "tags"))
        text = self._get_value(row, "text").strip()
        features = self._text_features(text, tags)
        return ExperienceRecord(
            record_id=self._get_value(row, "id", "\ufeffid").strip(),
            text=text,
            category=self._get_value(row, "category").strip(),
            subcategory=self._get_value(row, "subcategory").strip(),
            safety_score=self._to_float(self._get_value(row, "safety_score")),
            feasibility_score=self._to_float(self._get_value(row, "feasibility_score")),
            utility_score=self._to_float(self._get_value(row, "utility_score")),
            risk_level=self._get_value(row, "risk_level").strip(),
            tags=tags,
            dialect=self._get_value(row, "dialect").strip() or None,
            features=features,
        )

    def _parse_tags(self, value: str) -> List[str]:
        try:
            data = ast.literal_eval(value)
            return [str(x).strip() for x in data if str(x).strip()]
        except Exception:
            return []

    def _to_float(self, value: Optional[str]) -> float:
        try:
            return float(value)
        except Exception:
            return 0.0

    def _text_features(self, text: str, tags: List[str]) -> Set[str]:
        base = set()
        clean_text = "".join(text.split())
        for i in range(len(clean_text) - 1):
            base.add(clean_text[i : i + 2])
        for tag in tags:
            for i in range(len(tag) - 1):
                base.add(tag[i : i + 2])
        return base

    def _similarity(self, a: Set[str], b: Set[str]) -> float:
        if not a or not b:
            return 0.0
        inter = len(a & b)
        union = len(a | b)
        return inter / union if union else 0.0

    def _weighted_score(self, safety: float, feasibility: float, utility: float) -> float:
        score = self.alpha * safety + self.beta * feasibility + self.gamma * utility
        return max(0.0, min(100.0, round(score, 2)))

    def _choose_label(self, record: ExperienceRecord) -> List[str]:
        if record.tags:
            return [record.tags[0]]
        if record.subcategory:
            return [record.subcategory]
        if record.category:
            return [record.category]
        return ["未知"]

    def evaluate_text(self, text: str) -> Dict[str, Any]:
        text = (text or "").strip()
        if not text:
            return {"价值评分": 0, "经验标签": ["未知"]}
        if not self.records:
            return {"价值评分": 0, "经验标签": ["未知"]}
        if self.use_mock or not self.feature_extractor:
            return self._evaluate_text_by_rules(text)
        return self._evaluate_text_by_embeddings(text)

    def _evaluate_text_by_rules(self, text: str) -> Dict[str, Any]:
        query_features = self._text_features(text, [])
        best_record = None
        best_score = -1.0
        for record in self.records:
            score = self._similarity(query_features, record.features)
            if score > best_score:
                best_score = score
                best_record = record
        if not best_record:
            return {"价值评分": 0, "经验标签": ["未知"]}
        value_score = self._weighted_score(
            best_record.safety_score,
            best_record.feasibility_score,
            best_record.utility_score,
        )
        return {
            "价值评分": value_score,
            "经验标签": self._choose_label(best_record),
            "维度评分": {
                "安全性": best_record.safety_score,
                "可行性": best_record.feasibility_score,
                "实用性": best_record.utility_score,
            },
        }

    def _evaluate_text_by_embeddings(self, text: str) -> Dict[str, Any]:
        embeddings = self.feature_extractor(text, truncation=True, max_length=128)
        if not embeddings:
            return self._evaluate_text_by_rules(text)
        query_vector = self._mean_pool(embeddings[0])
        best_record = None
        best_score = -1.0
        for record in self.records:
            record_embeddings = self.feature_extractor(
                record.text, truncation=True, max_length=128
            )
            if not record_embeddings:
                continue
            record_vector = self._mean_pool(record_embeddings[0])
            score = self._cosine_similarity(query_vector, record_vector)
            if score > best_score:
                best_score = score
                best_record = record
        if not best_record:
            return self._evaluate_text_by_rules(text)
        value_score = self._weighted_score(
            best_record.safety_score,
            best_record.feasibility_score,
            best_record.utility_score,
        )
        return {
            "价值评分": value_score,
            "经验标签": self._choose_label(best_record),
            "维度评分": {
                "安全性": best_record.safety_score,
                "可行性": best_record.feasibility_score,
                "实用性": best_record.utility_score,
            },
        }

    def _mean_pool(self, vectors: List[List[float]]) -> List[float]:
        if not vectors:
            return []
        length = len(vectors[0])
        sums = [0.0] * length
        for vec in vectors:
            for i, value in enumerate(vec):
                sums[i] += value
        return [v / len(vectors) for v in sums]

    def _cosine_similarity(self, a: List[float], b: List[float]) -> float:
        if not a or not b or len(a) != len(b):
            return 0.0
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(y * y for y in b) ** 0.5
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    def evaluate_dataset(self, limit: Optional[int] = 5) -> List[Dict[str, Any]]:
        results = []
        for record in self.records[: limit or len(self.records)]:
            value_score = self._weighted_score(
                record.safety_score,
                record.feasibility_score,
                record.utility_score,
            )
            results.append(
                {
                    "id": record.record_id,
                    "文本": record.text,
                    "价值评分": value_score,
                    "经验标签": self._choose_label(record),
                }
            )
        return results


def run_demo() -> None:
    base_dir = Path(__file__).resolve().parents[1] / "data"
    model = ExperienceValueModel(data_dir=str(base_dir), use_mock=True)
    inputs = [
        "宝宝晚上哭闹可以轻轻拍背",
        "老年人每日食盐摄入量不超过5克，预防高血压",
        "娃儿不爱吃饭，老一辈说喂点山楂水开胃",
    ]
    for text in inputs:
        result = model.evaluate_text(text)
        print(json.dumps({"输入": text, "输出": result}, ensure_ascii=False, indent=2))
    dataset_preview = model.evaluate_dataset(limit=3)
    print(json.dumps({"数据集样例输出": dataset_preview}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    run_demo()
