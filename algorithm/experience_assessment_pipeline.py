import ast
import csv
import json
import math
from pathlib import Path
from typing import Any, Dict, List, Sequence, Tuple

DEMO_INPUTS = [
    "宝宝发烧可以用酒精擦身体",
    "夜里总是哭闹，怎么哄睡更有效",
    "添加辅食从几个月开始比较合适",
]


def read_child_older(data_dir: Path) -> List[Dict[str, Any]]:
    records: List[Dict[str, str]] = []
    for name in ["child.csv", "older.csv"]:
        path = data_dir / name
        if not path.exists():
            continue
        with path.open("r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                text = (row.get("text") or "").strip()
                tags = parse_tags(row.get("tags"))
                safety = float_try(row.get("safety_score"))
                feasibility = float_try(row.get("feasibility_score"))
                utility = float_try(row.get("utility_score"))
                risk_level = (row.get("risk_level") or "").strip()
                if text:
                    records.append(
                        {
                            "text": text,
                            "tags": tags,
                            "safety": safety,
                            "feasibility": feasibility,
                            "utility": utility,
                            "risk_level": risk_level,
                            "features": text_features(text, tags),
                        }
                    )
    return records


def float_try(x: Any) -> float:
    try:
        return float(x)
    except Exception:
        return 0.0


def hash_vector(text: str, dim: int = 256) -> List[float]:
    counts = [0.0] * dim
    clean = "".join(text.split())
    for i in range(len(clean) - 1):
        pair = clean[i : i + 2]
        idx = hash(pair) % dim
        counts[idx] += 1.0
    norm = math.sqrt(sum(v * v for v in counts)) or 1.0
    return [v / norm for v in counts]


def cosine(a: Sequence[float], b: Sequence[float]) -> float:
    if len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)

def parse_tags(value: Any) -> List[str]:
    try:
        v = value if isinstance(value, str) else ""
        data = ast.literal_eval(v)
        return [str(x).strip() for x in data if str(x).strip()]
    except Exception:
        return []

def text_features(text: str, tags: List[str]) -> set:
    base = set()
    clean = "".join(text.split())
    for i in range(len(clean) - 1):
        base.add(clean[i : i + 2])
    for tag in tags:
        t = "".join(tag.split())
        for i in range(len(t) - 1):
            base.add(t[i : i + 2])
    return base

def jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0


def match_record(text: str, records: List[Dict[str, str]]) -> Dict[str, Any]:
    qf = text_features(text, [])
    best = None
    best_score = -1.0
    for r in records:
        score = jaccard(qf, r["features"])
        if score > best_score:
            best_score = score
            best = r
    return {"record": best, "score": best_score}


def sev_score(record: Dict[str, Any], alpha: float = 0.4, beta: float = 0.3, gamma: float = 0.3) -> float:
    s = record.get("safety", 0.0)
    f = record.get("feasibility", 0.0)
    u = record.get("utility", 0.0)
    base = alpha * s + beta * f + gamma * u
    risk = (record.get("risk_level") or "").strip()
    if risk == "risk":
        base = min(base, 30.0)
    elif risk == "caution":
        base = min(base, 80.0)
    return round(max(0.0, min(100.0, base)), 1)


def credibility_detect(text: str) -> Dict[str, Any]:
    t = text.replace(" ", "")
    risk_keys = ["酒精擦", "捂汗", "偏方", "土方法", "掏耳朵", "拔罐", "贴膏药"]
    verify_keys = ["传说", "听说", "据说", "有人说", "网上看", "老一辈说"]
    science_keys = ["指南", "儿科", "医师", "循证", "CDC", "WHO"]
    label = "待验证经验"
    level = "中"
    suggest = "参考专业育儿指南与正规医疗建议"
    if any(k in t for k in risk_keys):
        label = "风险经验"
        level = "高"
        suggest = risk_alternative(text)
    elif any(k in t for k in science_keys):
        label = "科学经验"
        level = "低"
        suggest = "依据专业指南执行即可"
    else:
        label = "待验证经验"
        level = "中"
        suggest = "谨慎尝试并咨询专业人士"
    return {"标签": label, "风险等级": level, "建议": suggest}


def risk_alternative(text: str) -> str:
    t = text.replace(" ", "")
    if "酒精擦" in t:
        return "发热处理建议：温水擦拭、物理降温、遵医嘱用药，避免酒精擦拭"
    if "捂汗" in t:
        return "退烧不捂汗：保持通风、适度衣物、及时补水，必要时就医"
    return "优先选择循证方案，必要时就医"


def assess(text: str, data_dir: Path) -> Dict[str, Any]:
    records = read_child_older(data_dir)
    m = match_record(text, records) if records else {"record": None, "score": 0.0}
    record = m["record"]
    cred = credibility_detect(text)
    tag = (record.get("tags")[0] if record and record.get("tags") else "")
    score = sev_score(record) if record else 50.0
    if cred["标签"] == "风险经验":
        score = min(score, 20.0)
    result = {
        "可信度": cred,
        "经验标签": tag,
        "价值评分": score,
        "依据记录相似度": round(m["score"], 4),
    }
    return result


def run_demo() -> None:
    data_dir = Path(__file__).resolve().parents[1] / "data"
    for text in DEMO_INPUTS:
        out = assess(text, data_dir)
        print(json.dumps({"输入": text, "输出": out}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    run_demo()
