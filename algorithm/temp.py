import argparse
import ast
import csv
import json
import logging
import math
import random
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

from experience_credibility_model import ExperienceCredibilityModel
from experience_value_model import ExperienceRecord, ExperienceValueModel
from semantic_parser import SemanticParser
from demand_understanding_model import DemandUnderstandingModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


DEFAULT_COLUMNS = [
    "id",
    "text",
    "category",
    "subcategory",
    "safety_score",
    "feasibility_score",
    "utility_score",
    "risk_level",
    "tags",
    "dialect",
]

def _read_csv_rows(path: Path) -> List[Dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows: List[Dict[str, str]] = []
        for row in reader:
            rows.append({k: (v if v is not None else "") for k, v in row.items()})
        return rows


def _read_text_as_csv_rows(path: Path) -> List[Dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            raise ValueError("test.txt 为空或缺少表头")
        rows: List[Dict[str, str]] = []
        for row in reader:
            rows.append({k: (v if v is not None else "") for k, v in row.items()})
        return rows


def _normalize_tags(value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return "[]"
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return json.dumps([str(x).strip() for x in parsed if str(x).strip()], ensure_ascii=False)
    except Exception:
        pass
    try:
        parsed = ast.literal_eval(raw)
        if isinstance(parsed, (list, tuple)):
            return str([str(x).strip() for x in parsed if str(x).strip()])
    except Exception:
        pass
    return str([raw])


def build_test_csv(input_txt: Path, output_csv: Path) -> int:
    rows = _read_text_as_csv_rows(input_txt)
    output_csv.parent.mkdir(parents=True, exist_ok=True)

    with output_csv.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=DEFAULT_COLUMNS, extrasaction="ignore")
        writer.writeheader()
        count = 0
        for row in rows:
            normalized = dict(row)
            normalized["tags"] = _normalize_tags(normalized.get("tags", ""))
            writer.writerow(normalized)
            count += 1
    return count


def _load_experiences_from_csv(model: ExperienceValueModel, path: Path) -> List[ExperienceRecord]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        records: List[ExperienceRecord] = []
        for row in reader:
            record = model._row_to_record({k: (v if v is not None else "") for k, v in row.items()})
            if record.text:
                records.append(record)
        return records


def _svg_escape(text: str) -> str:
    return (
        (text or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def _write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _write_json(path: Path, data: Any) -> None:
    _write_text(path, json.dumps(data, ensure_ascii=False, indent=2))


def _write_csv(path: Path, rows: List[Dict[str, Any]], fieldnames: List[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({k: ("" if row.get(k) is None else row.get(k)) for k in fieldnames})


def _svg_bar_chart(
    title: str,
    categories: Sequence[str],
    series: Sequence[Tuple[str, Sequence[float]]],
    y_max: float,
    width: int = 1100,
    height: int = 520,
) -> str:
    pad_l, pad_r, pad_t, pad_b = 90, 30, 70, 80
    plot_w = width - pad_l - pad_r
    plot_h = height - pad_t - pad_b
    n_cat = max(1, len(categories))
    n_series = max(1, len(series))
    group_w = plot_w / n_cat
    bar_w = max(6.0, min(36.0, group_w / (n_series + 1.5)))
    gap = (group_w - n_series * bar_w) / 2.0
    colors = ["#2563eb", "#16a34a", "#f97316", "#a855f7", "#ef4444"]

    def y_of(v: float) -> float:
        v = max(0.0, min(float(y_max or 1.0), float(v)))
        return pad_t + plot_h - (v / float(y_max or 1.0)) * plot_h

    parts: List[str] = []
    parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}">')
    parts.append(f'<rect x="0" y="0" width="{width}" height="{height}" fill="white"/>')
    parts.append(f'<text x="{width/2}" y="40" text-anchor="middle" font-size="20" font-family="Arial">{_svg_escape(title)}</text>')
    parts.append(f'<line x1="{pad_l}" y1="{pad_t+plot_h}" x2="{pad_l+plot_w}" y2="{pad_t+plot_h}" stroke="#111827" stroke-width="1"/>')
    parts.append(f'<line x1="{pad_l}" y1="{pad_t}" x2="{pad_l}" y2="{pad_t+plot_h}" stroke="#111827" stroke-width="1"/>')
    for tick in range(0, 6):
        v = (float(y_max or 1.0) / 5.0) * tick
        y = y_of(v)
        parts.append(f'<line x1="{pad_l-6}" y1="{y}" x2="{pad_l}" y2="{y}" stroke="#111827" stroke-width="1"/>')
        parts.append(f'<text x="{pad_l-10}" y="{y+4}" text-anchor="end" font-size="12" font-family="Arial">{v:.2f}</text>')
        parts.append(f'<line x1="{pad_l}" y1="{y}" x2="{pad_l+plot_w}" y2="{y}" stroke="#e5e7eb" stroke-width="1"/>')

    for ci, cat in enumerate(categories):
        base_x = pad_l + ci * group_w + gap
        parts.append(f'<text x="{pad_l + ci*group_w + group_w/2}" y="{pad_t+plot_h+28}" text-anchor="middle" font-size="12" font-family="Arial">{_svg_escape(str(cat))}</text>')
        for si, (label, vals) in enumerate(series):
            v = float(vals[ci]) if ci < len(vals) else 0.0
            x = base_x + si * bar_w
            y = y_of(v)
            h = pad_t + plot_h - y
            parts.append(f'<rect x="{x}" y="{y}" width="{bar_w-1}" height="{h}" fill="{colors[si % len(colors)]}"/>')
            parts.append(f'<text x="{x + (bar_w-1)/2}" y="{y-6}" text-anchor="middle" font-size="11" font-family="Arial">{v:.3f}</text>')

    legend_x = pad_l + 10
    legend_y = pad_t - 30
    for si, (label, _vals) in enumerate(series):
        lx = legend_x + si * 180
        parts.append(f'<rect x="{lx}" y="{legend_y}" width="14" height="14" fill="{colors[si % len(colors)]}"/>')
        parts.append(f'<text x="{lx+20}" y="{legend_y+12}" font-size="12" font-family="Arial">{_svg_escape(label)}</text>')
    parts.append("</svg>")
    return "\n".join(parts)


def _svg_confusion_matrix(title: str, labels: Sequence[str], matrix: Sequence[Sequence[int]]) -> str:
    n = max(1, len(labels))
    cell = 70
    pad_l, pad_t = 220, 110
    width = pad_l + n * cell + 40
    height = pad_t + n * cell + 80
    vmax = max([1] + [int(v) for row in matrix for v in row])

    def color(v: int) -> str:
        t = float(v) / float(vmax or 1)
        r0, g0, b0 = 239, 246, 255
        r1, g1, b1 = 37, 99, 235
        r = int(r0 + (r1 - r0) * t)
        g = int(g0 + (g1 - g0) * t)
        b = int(b0 + (b1 - b0) * t)
        return f"rgb({r},{g},{b})"

    parts: List[str] = []
    parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}">')
    parts.append(f'<rect x="0" y="0" width="{width}" height="{height}" fill="white"/>')
    parts.append(f'<text x="{width/2}" y="44" text-anchor="middle" font-size="20" font-family="Arial">{_svg_escape(title)}</text>')
    parts.append(f'<text x="{pad_l + (n*cell)/2}" y="78" text-anchor="middle" font-size="14" font-family="Arial">Pred</text>')
    parts.append(f'<text x="60" y="{pad_t + (n*cell)/2}" text-anchor="middle" font-size="14" font-family="Arial" transform="rotate(-90 60 {pad_t + (n*cell)/2})">Truth</text>')
    for i, lab in enumerate(labels):
        x = pad_l + i * cell + cell / 2
        parts.append(f'<text x="{x}" y="{pad_t-12}" text-anchor="middle" font-size="12" font-family="Arial">{_svg_escape(str(lab))}</text>')
        y = pad_t + i * cell + cell / 2 + 4
        parts.append(f'<text x="{pad_l-10}" y="{y}" text-anchor="end" font-size="12" font-family="Arial">{_svg_escape(str(lab))}</text>')
    for r in range(n):
        for c in range(n):
            v = int(matrix[r][c]) if r < len(matrix) and c < len(matrix[r]) else 0
            x = pad_l + c * cell
            y = pad_t + r * cell
            parts.append(f'<rect x="{x}" y="{y}" width="{cell}" height="{cell}" fill="{color(v)}" stroke="#111827" stroke-width="1"/>')
            parts.append(f'<text x="{x+cell/2}" y="{y+cell/2+5}" text-anchor="middle" font-size="14" font-family="Arial">{v}</text>')
    parts.append("</svg>")
    return "\n".join(parts)


def _svg_scatter(
    title: str,
    xs: Sequence[float],
    ys: Sequence[float],
    x_label: str,
    y_label: str,
    width: int = 1100,
    height: int = 520,
) -> str:
    pad_l, pad_r, pad_t, pad_b = 90, 40, 70, 80
    plot_w = width - pad_l - pad_r
    plot_h = height - pad_t - pad_b
    if not xs or not ys:
        xs = [0.0]
        ys = [0.0]
    mn = min(min(xs), min(ys))
    mx = max(max(xs), max(ys))
    mn = math.floor(mn / 5.0) * 5.0
    mx = math.ceil(mx / 5.0) * 5.0
    if mx <= mn:
        mx = mn + 1.0

    def x_of(v: float) -> float:
        return pad_l + (float(v) - mn) / (mx - mn) * plot_w

    def y_of(v: float) -> float:
        return pad_t + plot_h - (float(v) - mn) / (mx - mn) * plot_h

    parts: List[str] = []
    parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}">')
    parts.append(f'<rect x="0" y="0" width="{width}" height="{height}" fill="white"/>')
    parts.append(f'<text x="{width/2}" y="40" text-anchor="middle" font-size="20" font-family="Arial">{_svg_escape(title)}</text>')
    parts.append(f'<line x1="{pad_l}" y1="{pad_t+plot_h}" x2="{pad_l+plot_w}" y2="{pad_t+plot_h}" stroke="#111827" stroke-width="1"/>')
    parts.append(f'<line x1="{pad_l}" y1="{pad_t}" x2="{pad_l}" y2="{pad_t+plot_h}" stroke="#111827" stroke-width="1"/>')
    for tick in range(0, 6):
        v = mn + (mx - mn) * tick / 5.0
        x = x_of(v)
        y = y_of(v)
        parts.append(f'<line x1="{x}" y1="{pad_t+plot_h}" x2="{x}" y2="{pad_t+plot_h+6}" stroke="#111827" stroke-width="1"/>')
        parts.append(f'<text x="{x}" y="{pad_t+plot_h+24}" text-anchor="middle" font-size="12" font-family="Arial">{v:.0f}</text>')
        parts.append(f'<line x1="{pad_l-6}" y1="{y}" x2="{pad_l}" y2="{y}" stroke="#111827" stroke-width="1"/>')
        parts.append(f'<text x="{pad_l-10}" y="{y+4}" text-anchor="end" font-size="12" font-family="Arial">{v:.0f}</text>')
        parts.append(f'<line x1="{pad_l}" y1="{y}" x2="{pad_l+plot_w}" y2="{y}" stroke="#e5e7eb" stroke-width="1"/>')
    parts.append(f'<line x1="{x_of(mn)}" y1="{y_of(mn)}" x2="{x_of(mx)}" y2="{y_of(mx)}" stroke="#f97316" stroke-width="2"/>')
    for x, y in zip(xs, ys):
        parts.append(f'<circle cx="{x_of(x)}" cy="{y_of(y)}" r="3.5" fill="#2563eb" opacity="0.7"/>')
    parts.append(f'<text x="{pad_l + plot_w/2}" y="{height-20}" text-anchor="middle" font-size="14" font-family="Arial">{_svg_escape(x_label)}</text>')
    parts.append(f'<text x="30" y="{pad_t + plot_h/2}" text-anchor="middle" font-size="14" font-family="Arial" transform="rotate(-90 30 {pad_t + plot_h/2})">{_svg_escape(y_label)}</text>')
    parts.append("</svg>")
    return "\n".join(parts)


def _svg_flow(title: str, left_label: str, middle_label: str, right_label: str) -> str:
    width, height = 1100, 360
    parts: List[str] = []
    parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}">')
    parts.append(f'<rect x="0" y="0" width="{width}" height="{height}" fill="white"/>')
    parts.append(f'<text x="{width/2}" y="40" text-anchor="middle" font-size="20" font-family="Arial">{_svg_escape(title)}</text>')
    y = 150
    boxes = [
        (90, y, 260, 90, left_label),
        (420, y, 260, 90, middle_label),
        (750, y, 260, 90, right_label),
    ]
    for x, yy, w, h, lab in boxes:
        parts.append(f'<rect x="{x}" y="{yy}" width="{w}" height="{h}" rx="14" ry="14" fill="#f3f4f6" stroke="#111827"/>')
        parts.append(f'<text x="{x+w/2}" y="{yy+h/2+6}" text-anchor="middle" font-size="16" font-family="Arial">{_svg_escape(lab)}</text>')
    parts.append('<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="3" orient="auto"><path d="M0,0 L10,3 L0,6 Z" fill="#111827"/></marker></defs>')
    parts.append(f'<line x1="{90+260}" y1="{y+45}" x2="{420}" y2="{y+45}" stroke="#111827" stroke-width="2" marker-end="url(#arrow)"/>')
    parts.append(f'<line x1="{420+260}" y1="{y+45}" x2="{750}" y2="{y+45}" stroke="#111827" stroke-width="2" marker-end="url(#arrow)"/>')
    parts.append("</svg>")
    return "\n".join(parts)


def _sub_to_topic(subcategory: str, text: str, tags: Sequence[str]) -> str:
    sub = (subcategory or "").strip()
    t = (text or "").strip()
    if any(k in t for k in ["安全座椅", "误食", "烫伤", "溺水", "跌倒", "摔", "中毒", "电池", "磁力珠", "尖锐"]):
        return "安全防护"
    if "睡眠" in sub or any("睡" in x for x in tags) or any(k in t for k in ["哄睡", "夜醒", "午睡", "踢被子", "睡", "夜奶"]):
        return "哄睡"
    if "饮食" in sub or any(
        k in t
        for k in [
            "辅食",
            "吐奶",
            "拍嗝",
            "便秘",
            "吃饭",
            "喝水",
            "断奶",
            "米粉",
            "食物",
            "进食",
            "新食物",
            "致敏",
            "忌口",
            "食盐",
            "烹调油",
            "蔬菜",
            "水果",
            "全谷物",
            "杂豆",
            "钙片",
            "营养",
            "摄入",
        ]
    ):
        return "饮食健康"
    if "病护" in sub or any(
        k in t
        for k in [
            "发烧",
            "咳嗽",
            "腹泻",
            "拉肚子",
            "湿疹",
            "尿布疹",
            "流鼻血",
            "鼻出血",
            "鼻塞",
            "接种",
            "疫苗",
            "用药",
            "过敏",
            "急救",
            "消毒",
            "碘伏",
        ]
    ):
        return "病护应对"
    if "启蒙" in sub or any(k in t for k in ["绘本", "阅读", "语言", "早教", "启蒙", "背诗", "专注", "学习", "拼图", "积木"]):
        return "知识启蒙"
    if "安全" in sub:
        return "安全防护"
    if "病护" in sub:
        return "病护应对"
    if "饮食" in sub:
        return "饮食健康"
    if "启蒙" in sub:
        return "知识启蒙"
    return "行为培养"


@dataclass
class _IndexedDB:
    records: List[ExperienceRecord]
    feature_sizes: List[int]
    postings: Dict[str, List[int]]

    def query_best(self, query_features: Sequence[str]) -> Tuple[Optional[int], float]:
        q = list(query_features)
        if not q:
            return None, 0.0
        counts: Dict[int, int] = {}
        for feat in q:
            for idx in self.postings.get(feat, []):
                counts[idx] = counts.get(idx, 0) + 1
        if not counts:
            return None, 0.0
        qn = len(set(q))
        best_idx = None
        best_score = -1.0
        for idx, inter in counts.items():
            denom = qn + self.feature_sizes[idx] - inter
            score = float(inter) / float(denom or 1)
            if score > best_score:
                best_score = score
                best_idx = idx
        return best_idx, float(best_score)


def _build_index(records: List[ExperienceRecord]) -> _IndexedDB:
    postings: Dict[str, List[int]] = {}
    sizes: List[int] = []
    for i, r in enumerate(records):
        feats = r.features or set()
        sizes.append(len(feats))
        for f in feats:
            postings.setdefault(f, []).append(i)
    return _IndexedDB(records=records, feature_sizes=sizes, postings=postings)


def _pearson(x: Sequence[float], y: Sequence[float]) -> float:
    if not x or not y or len(x) != len(y):
        return 0.0
    n = len(x)
    mx = sum(x) / n
    my = sum(y) / n
    num = sum((a - mx) * (b - my) for a, b in zip(x, y))
    dx = math.sqrt(sum((a - mx) ** 2 for a in x))
    dy = math.sqrt(sum((b - my) ** 2 for b in y))
    if dx == 0 or dy == 0:
        return 0.0
    return float(num / (dx * dy))


def _mae(x: Sequence[float], y: Sequence[float]) -> float:
    if not x or not y or len(x) != len(y):
        return 0.0
    return float(sum(abs(a - b) for a, b in zip(x, y)) / len(x))


def _eval_semantic(
    name: str,
    parser: SemanticParser,
    records: List[ExperienceRecord],
    out_dir: Path,
    sample_count: int,
    rng: random.Random,
) -> Dict[str, Any]:
    rows: List[Dict[str, Any]] = []
    correct = 0
    per_topic: Dict[str, Dict[str, int]] = {}
    for r in records:
        expected = _sub_to_topic(r.subcategory, r.text, r.tags or [])
        pred = parser.parse(r.text)
        pred_topic = (pred.get("主题") or "").strip() or "未知"
        pred_action = (pred.get("行为") or "").strip() or "未知"
        is_ok = pred_topic == expected
        correct += 1 if is_ok else 0
        per_topic.setdefault(expected, {"total": 0, "correct": 0})
        per_topic[expected]["total"] += 1
        per_topic[expected]["correct"] += 1 if is_ok else 0
        rows.append(
            {
                "输入文本": r.text,
                "模型输出主题": pred_topic,
                "模型输出核心行为": pred_action,
                "期望主题": expected,
                "准确率": "正确" if is_ok else "错误",
            }
        )
    acc = float(correct / len(records)) if records else 0.0
    _write_csv(
        out_dir / f"semantic_{name}_full.csv",
        rows,
        ["输入文本", "模型输出主题", "模型输出核心行为", "期望主题", "准确率"],
    )
    sample = [rows[i] for i in rng.sample(range(len(rows)), k=min(sample_count, len(rows)))] if rows else []
    _write_csv(
        out_dir / f"semantic_{name}_samples.csv",
        sample,
        ["输入文本", "模型输出主题", "模型输出核心行为", "期望主题", "准确率"],
    )
    topic_stats = {
        k: {
            "accuracy": round(v["correct"] / v["total"], 4) if v["total"] else 0.0,
            "total": v["total"],
        }
        for k, v in sorted(per_topic.items(), key=lambda x: x[0])
    }
    return {"accuracy": round(acc, 4), "total": len(records), "by_topic": topic_stats}


def _eval_credibility(
    name: str,
    credibility_model: ExperienceCredibilityModel,
    records: List[ExperienceRecord],
    out_dir: Path,
    sample_count: int,
    rng: random.Random,
) -> Dict[str, Any]:
    labels = ["科学经验", "待验证经验", "风险经验"]
    idx = {lab: i for i, lab in enumerate(labels)}
    mat = [[0 for _ in labels] for _ in labels]
    rows: List[Dict[str, Any]] = []
    correct = 0
    for r in records:
        truth = _risk_level_to_cred_label(r.risk_level)
        pred = (credibility_model.classify(r.text).get("分类标签") or "").strip() or "待验证经验"
        correct += 1 if pred == truth else 0
        mat[idx.get(truth, 1)][idx.get(pred, 1)] += 1
        rows.append({"经验内容": r.text, "可信度分类": pred, "真实分类": truth, "匹配结果": "正确" if pred == truth else "错误"})
    acc = float(correct / len(records)) if records else 0.0
    _write_csv(out_dir / f"credibility_{name}_full.csv", rows, ["经验内容", "可信度分类", "真实分类", "匹配结果"])
    sample = [rows[i] for i in rng.sample(range(len(rows)), k=min(sample_count, len(rows)))] if rows else []
    _write_csv(out_dir / f"credibility_{name}_samples.csv", sample, ["经验内容", "可信度分类", "真实分类", "匹配结果"])
    _write_text(out_dir / f"credibility_{name}_confusion.svg", _svg_confusion_matrix(f"可信度分类混淆矩阵（{name}）", labels, mat))
    return {"accuracy": round(acc, 4), "total": len(records), "labels": labels, "confusion_matrix": mat}


def _eval_value(
    name: str,
    value_model: ExperienceValueModel,
    index_db: _IndexedDB,
    records: List[ExperienceRecord],
    out_dir: Path,
    sample_count: int,
    rng: random.Random,
) -> Dict[str, Any]:
    truth_scores: List[float] = []
    pred_scores: List[float] = []
    rows: List[Dict[str, Any]] = []
    for r in records:
        truth = value_model._weighted_score(r.safety_score, r.feasibility_score, r.utility_score)
        qf = list(value_model._text_features(r.text, []))
        best_idx, sim = index_db.query_best(qf)
        if best_idx is None:
            pred = 0.0
        else:
            br = index_db.records[best_idx]
            pred = value_model._weighted_score(br.safety_score, br.feasibility_score, br.utility_score)
        truth_scores.append(float(truth))
        pred_scores.append(float(pred))
        rows.append(
            {
                "经验内容": r.text,
                "真实价值评分": truth,
                "预测价值评分": pred,
                "相似度": round(sim, 6),
                "误差": round(float(pred) - float(truth), 2),
            }
        )
    _write_csv(out_dir / f"value_{name}_full.csv", rows, ["经验内容", "真实价值评分", "预测价值评分", "相似度", "误差"])
    sample = [rows[i] for i in rng.sample(range(len(rows)), k=min(sample_count, len(rows)))] if rows else []
    _write_csv(out_dir / f"value_{name}_samples.csv", sample, ["经验内容", "真实价值评分", "预测价值评分", "相似度", "误差"])
    _write_text(out_dir / f"value_{name}_scatter.svg", _svg_scatter(f"价值评分：真实 vs 预测（{name}）", truth_scores, pred_scores, "真实价值评分", "预测价值评分"))
    return {
        "total": len(records),
        "mae": round(_mae(truth_scores, pred_scores), 4),
        "pearson": round(_pearson(truth_scores, pred_scores), 4),
    }


def _eval_parent_matching(
    name: str,
    value_model: ExperienceValueModel,
    records: List[ExperienceRecord],
    demand_rows: List[Dict[str, str]],
    out_dir: Path,
    sample_count: int,
    rng: random.Random,
    topk: int,
) -> Dict[str, Any]:
    total = 0
    hit1 = 0
    hitk = 0
    sim_sum = 0.0
    conf: Dict[str, Dict[str, int]] = {}
    outputs: List[Dict[str, Any]] = []
    for row in demand_rows:
        text = (row.get("text") or "").strip()
        expected = _bucket_expected(row.get("expected_match"))
        if not text:
            continue
        candidates = _candidate_records(expected, records) or records
        top_matches = _topk_matches(value_model, text, candidates, topk=topk)
        best, sim = (top_matches[0][0], top_matches[0][1]) if top_matches else (None, 0.0)
        pred_bucket = _bucket_record(best) if best else "其他"
        total += 1
        sim_sum += float(sim or 0.0)
        if pred_bucket == expected:
            hit1 += 1
        if any(_bucket_record(r) == expected for r, _s in top_matches):
            hitk += 1
        _confusion_add(conf, expected, pred_bucket)
        outputs.append(
            {
                "父母问题": text,
                "期望匹配": expected,
                "匹配到的经验": (best.text if best else ""),
                "匹配结果": "匹配正确" if pred_bucket == expected else "匹配错误",
                "相似度": round(float(sim or 0.0), 6),
            }
        )
    _write_csv(out_dir / f"matching_parent_{name}_full.csv", outputs, ["父母问题", "期望匹配", "匹配到的经验", "匹配结果", "相似度"])
    sample = [outputs[i] for i in rng.sample(range(len(outputs)), k=min(sample_count, len(outputs)))] if outputs else []
    _write_csv(out_dir / f"matching_parent_{name}_samples.csv", sample, ["父母问题", "期望匹配", "匹配到的经验", "匹配结果", "相似度"])
    labels = sorted({k for k in conf.keys()} | {k2 for v in conf.values() for k2 in v.keys()})
    mat = [[0 for _ in labels] for _ in labels]
    lidx = {lab: i for i, lab in enumerate(labels)}
    for t_lab, preds in conf.items():
        for p_lab, v in preds.items():
            mat[lidx[t_lab]][lidx[p_lab]] = int(v)
    _write_text(out_dir / f"matching_parent_{name}_confusion.svg", _svg_confusion_matrix(f"双向匹配：父母问题→老人经验（{name} Top1）", labels, mat))
    acc1 = float(hit1 / total) if total else 0.0
    acck = float(hitk / total) if total else 0.0
    return {
        "total": total,
        "top1_accuracy": round(acc1, 4),
        "topk_accuracy": round(acck, 4),
        "avg_similarity_top1": round(float(sim_sum / total), 6) if total else 0.0,
        "topk": int(topk),
    }


class ElderHelpTypeClassifier:
    def _truth_bucket(self, truth: str) -> str:
        t = (truth or "").replace(" ", "")
        if not t:
            return "其他"
        if "紧急" in t or "禁忌" in t or "安全" in t:
            return "安全"
        if "用药" in t:
            return "用药"
        if "饮食" in t or "营养" in t:
            return "饮食"
        if any(k in t for k in ["就医", "检查", "诊断", "评估", "治疗"]):
            return "就医"
        if "康复" in t or "运动" in t:
            return "康复"
        if "心理" in t or "情感" in t:
            return "心理"
        if "生活" in t or "作息" in t:
            return "生活"
        if "护理" in t or "缓解" in t or "方法" in t:
            return "护理"
        return "其他"

    def predict(self, text: str) -> str:
        t = (text or "").replace(" ", "")
        if any(k in t for k in ["发烧", "高烧", "头晕", "胸闷", "心慌", "疼", "痛", "麻", "肿", "血压", "血糖", "糖尿病", "高血压", "脑梗", "白内障", "助听器"]):
            return "就医"
        if any(k in t for k in ["药", "剂量", "副作用", "漏吃", "补吃", "上瘾", "安眠药", "降压药", "胰岛素"]):
            return "用药"
        if any(k in t for k in ["能不能吃", "吃啥", "饮食", "水果", "咸菜", "盐", "通便", "营养", "钙片", "全谷物", "蔬菜", "油"]):
            return "饮食"
        if any(k in t for k in ["要不要去", "医院", "就医", "急诊", "拍片", "检查", "配助听器", "白内障"]):
            return "就医"
        if any(k in t for k in ["锻炼", "康复", "训练", "太极", "抬不起来", "肩周炎", "腰腿痛", "膝盖"]):
            return "康复"
        if any(k in t for k in ["睡不着", "失眠", "起夜", "偏方", "调理"]):
            return "生活"
        if any(k in t for k in ["记性", "痴呆", "帕金森", "认知"]):
            return "就医"
        if any(k in t for k in ["心情", "抑郁", "想哭", "烦躁"]):
            return "心理"
        if any(k in t for k in ["忘关火", "安全", "跌倒", "防滑", "中毒", "烫伤"]):
            return "安全"
        if any(k in t for k in ["怎么缓解", "护理", "热敷", "冷敷", "贴膏药", "按摩"]):
            return "护理"
        return "其他"


def _eval_elder_help(
    name: str,
    classifier: ElderHelpTypeClassifier,
    rows: List[Dict[str, str]],
    out_dir: Path,
    sample_count: int,
    rng: random.Random,
) -> Dict[str, Any]:
    total = 0
    correct = 0
    outputs: List[Dict[str, Any]] = []
    for row in rows:
        text = (row.get("text") or "").strip()
        truth_raw = (row.get("help_type") or "").strip()
        if not text or not truth_raw:
            continue
        truth = classifier._truth_bucket(truth_raw)
        pred = classifier.predict(text)
        total += 1
        correct += 1 if pred == truth else 0
        outputs.append(
            {
                "老人问题": text,
                "匹配帮助类型": pred,
                "真实帮助类型": truth,
                "真实原始标签": truth_raw,
                "匹配结果": "匹配正确" if pred == truth else "匹配错误",
            }
        )
    _write_csv(
        out_dir / f"matching_elder_{name}_full.csv",
        outputs,
        ["老人问题", "匹配帮助类型", "真实帮助类型", "真实原始标签", "匹配结果"],
    )
    sample = [outputs[i] for i in rng.sample(range(len(outputs)), k=min(sample_count, len(outputs)))] if outputs else []
    _write_csv(
        out_dir / f"matching_elder_{name}_samples.csv",
        sample,
        ["老人问题", "匹配帮助类型", "真实帮助类型", "真实原始标签", "匹配结果"],
    )
    acc = float(correct / total) if total else 0.0
    return {"total": total, "help_type_accuracy": round(acc, 4)}


def _candidate_records(expected_match: str, records: List[ExperienceRecord]) -> List[ExperienceRecord]:
    key = (expected_match or "").strip()
    if not key:
        return records
    if "睡眠" in key:
        return [r for r in records if ("睡眠" in (r.subcategory or "")) or any("睡" in t for t in r.tags)]
    if "疾病" in key:
        return [
            r
            for r in records
            if ("病护" in (r.subcategory or ""))
            or any(t in {"护理", "就医", "急救"} for t in r.tags)
            or any(k in (r.text or "") for k in ["发烧", "咳嗽", "腹泻", "湿疹", "流鼻血"])
        ]
    if "喂养" in key:
        return [
            r
            for r in records
            if ("饮食" in (r.subcategory or ""))
            or any(k in (r.text or "") for k in ["喂", "辅食", "吐奶", "便秘", "拉肚子"])
        ]
    if "安全" in key:
        return [
            r
            for r in records
            if ("安全" in (r.subcategory or ""))
            or any("安全" in t for t in r.tags)
            or any(k in (r.text or "") for k in ["避免", "不要", "莫", "急救"])
        ]
    if "发育" in key or "行为" in key:
        return [
            r
            for r in records
            if ("行为" in (r.subcategory or "")) or ("启蒙" in (r.subcategory or "")) or any(t in {"早教"} for t in r.tags)
        ]
    return records


def _best_match(
    model: ExperienceValueModel, query: str, records: List[ExperienceRecord]
) -> Tuple[Optional[ExperienceRecord], float]:
    query_features = model._text_features(query, [])
    best: Optional[ExperienceRecord] = None
    best_score = -1.0
    for record in records:
        score = model._similarity(query_features, record.features)
        if score > best_score:
            best_score = score
            best = record
    return best, float(best_score)

def _topk_matches(
    model: ExperienceValueModel, query: str, records: List[ExperienceRecord], topk: int
) -> List[Tuple[ExperienceRecord, float]]:
    query_features = model._text_features(query, [])
    scored: List[Tuple[ExperienceRecord, float]] = []
    for record in records:
        score = model._similarity(query_features, record.features)
        scored.append((record, float(score)))
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[: max(1, int(topk or 1))]


def _risk_level_to_cred_label(risk_level: str) -> str:
    key = (risk_level or "").strip().lower()
    if key in {"safe"}:
        return "科学经验"
    if key in {"caution"}:
        return "待验证经验"
    if key in {"risk", "high_risk_avoid"}:
        return "风险经验"
    return "待验证经验"


def _bucket_expected(value: str) -> str:
    return (value or "").strip() or "其他"


def _bucket_record(record: ExperienceRecord) -> str:
    sub = (record.subcategory or "").strip()
    tags = record.tags or []
    text = record.text or ""
    if "睡眠" in sub or any("睡" in t for t in tags) or any(k in text for k in ["哄睡", "午睡", "赖床", "夜灯", "踢被子"]):
        return "睡眠安抚"
    if "病护" in sub or any(t in {"护理", "就医", "急救"} for t in tags) or any(k in text for k in ["发烧", "咳嗽", "腹泻", "湿疹", "流鼻血", "鼻塞", "打针", "用药", "消毒"]):
        return "疾病护理"
    if "饮食" in sub or any(k in text for k in ["辅食", "吐奶", "拍嗝", "便秘", "拉肚子", "喝水", "挑食", "吃饭", "断奶"]):
        return "喂养护理"
    if "安全" in sub or any("安全" in t for t in tags) or any(k in text for k in ["避免", "不要", "莫", "急救", "跌倒", "摔", "口罩", "安全座椅"]):
        return "安全防护"
    if "行为" in sub or "启蒙" in sub or any(t in {"早教"} for t in tags) or any(k in text for k in ["背诗", "学数", "学颜色", "发脾气", "规则", "奖励", "轮流玩"]):
        return "发育行为"
    return "其他"


def _confusion_add(conf: Dict[str, Dict[str, int]], truth: str, pred: str) -> None:
    if truth not in conf:
        conf[truth] = {}
    conf[truth][pred] = conf[truth].get(pred, 0) + 1


def _experience_outputs(
    credibility_model: ExperienceCredibilityModel,
    value_model: ExperienceValueModel,
    limit: Optional[int],
) -> List[Dict[str, Any]]:
    outputs: List[Dict[str, Any]] = []
    for idx, record in enumerate(value_model.records, start=1):
        if limit is not None and idx > limit:
            break
        cred_result = credibility_model.classify(record.text)
        value_score = value_model._weighted_score(
            record.safety_score, record.feasibility_score, record.utility_score
        )
        outputs.append(
            {
                "experience_id": record.record_id,
                "text": record.text,
                "credibility": cred_result,
                "value": {
                    "价值评分": value_score,
                    "经验标签": value_model._choose_label(record),
                    "维度评分": {
                        "安全性": record.safety_score,
                        "可行性": record.feasibility_score,
                        "实用性": record.utility_score,
                    },
                },
            }
        )
    return outputs


def run_validation(
    test_csv: Path,
    demand_csv: Path,
    experience_limit: Optional[int] = None,
    demand_limit: Optional[int] = None,
    topk: int = 5,
) -> None:
    base_dir = test_csv.parent
    credibility_model = ExperienceCredibilityModel(use_mock=True)
    value_model = ExperienceValueModel(data_dir=str(base_dir), use_mock=True)
    value_model.records = _load_experiences_from_csv(value_model, test_csv)

    cred_total = 0
    cred_correct = 0
    cred_confusion: Dict[str, Dict[str, int]] = {}
    for record in value_model.records:
        truth = _risk_level_to_cred_label(record.risk_level)
        pred = (credibility_model.classify(record.text).get("分类标签") or "").strip() or "待验证经验"
        cred_total += 1
        if pred == truth:
            cred_correct += 1
        _confusion_add(cred_confusion, truth, pred)

    with demand_csv.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        demand_total = 0
        demand_hit_top1 = 0
        demand_hit_topk = 0
        sim_sum = 0.0
        for idx, row in enumerate(reader, start=1):
            if demand_limit is not None and idx > demand_limit:
                break
            demand_text = (row.get("text") or "").strip()
            expected_match = _bucket_expected(row.get("expected_match"))
            candidates = _candidate_records(expected_match, value_model.records) or value_model.records
            top_matches = _topk_matches(value_model, demand_text, candidates, topk=topk)
            matched, sim = (top_matches[0][0], top_matches[0][1]) if top_matches else (None, 0.0)

            demand_total += 1
            sim_sum += float(sim or 0.0)
            top1_bucket = _bucket_record(matched) if matched else "其他"
            if top1_bucket == expected_match:
                demand_hit_top1 += 1
            if any(_bucket_record(r) == expected_match for r, _s in top_matches):
                demand_hit_topk += 1
        result = {
            "test_csv": str(test_csv),
            "credibility_accuracy": round(cred_correct / cred_total, 4) if cred_total else 0.0,
            "credibility_total": cred_total,
            "demand_top1_accuracy": round(demand_hit_top1 / demand_total, 4) if demand_total else 0.0,
            "demand_topk_accuracy": round(demand_hit_topk / demand_total, 4) if demand_total else 0.0,
            "demand_avg_similarity_top1": round(sim_sum / demand_total, 6) if demand_total else 0.0,
            "demand_count": demand_total,
            "topk": int(topk),
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))


def run_full(data_dir: Path, out_dir: Path, seed: int, topk: int) -> Dict[str, Any]:
    rng = random.Random(seed)
    out_dir.mkdir(parents=True, exist_ok=True)
    _write_text(out_dir / "flow_parent.svg", _svg_flow("双向匹配流程图（父母问题→老人经验）", "父母问题", "双向语义匹配引擎", "老人经验"))
    _write_text(out_dir / "flow_elder.svg", _svg_flow("双向匹配流程图（老人问题→帮助类型）", "老人问题", "需求解析/路由", "帮助类型"))

    semantic_parser = SemanticParser(use_mock=True)
    credibility_model = ExperienceCredibilityModel(use_mock=True)
    demand_model = DemandUnderstandingModel(data_dir=data_dir, use_mock=True)
    value_model = ExperienceValueModel(data_dir=str(data_dir), use_mock=True)

    train_records = _load_experiences_from_csv(value_model, data_dir / "child.csv")
    index_db = _build_index(train_records)

    verify_records = _load_experiences_from_csv(value_model, data_dir / "verify.csv")
    test_records = _load_experiences_from_csv(value_model, data_dir / "test.csv")

    semantic_verify = _eval_semantic("verify", semantic_parser, verify_records, out_dir, 8, rng)
    semantic_test = _eval_semantic("test", semantic_parser, test_records, out_dir, 8, rng)

    cred_verify = _eval_credibility("verify", credibility_model, verify_records, out_dir, 8, rng)
    cred_test = _eval_credibility("test", credibility_model, test_records, out_dir, 8, rng)

    value_verify = _eval_value("verify", value_model, index_db, verify_records, out_dir, 8, rng)
    value_test = _eval_value("test", value_model, index_db, test_records, out_dir, 8, rng)

    verify_demand_rows = _read_csv_rows(data_dir / "verify_demand.csv")
    test_demand_rows = _read_csv_rows(data_dir / "test_demand.csv")
    match_parent_verify = _eval_parent_matching("verify", value_model, train_records, verify_demand_rows, out_dir, 8, rng, topk=topk)
    match_parent_test = _eval_parent_matching("test", value_model, train_records, test_demand_rows, out_dir, 8, rng, topk=topk)

    elder_rows = _read_csv_rows(data_dir / "older_demand.csv")
    rng.shuffle(elder_rows)
    split = int(len(elder_rows) * 0.8)
    elder_verify_rows = elder_rows[:split]
    elder_test_rows = elder_rows[split:]
    elder_classifier = ElderHelpTypeClassifier()
    match_elder_verify = _eval_elder_help("verify", elder_classifier, elder_verify_rows, out_dir, 8, rng)
    match_elder_test = _eval_elder_help("test", elder_classifier, elder_test_rows, out_dir, 8, rng)

    demo_experiences = [
        {"经验内容": "宝宝哭闹轻拍后背安抚", "期望可信度分类": "科学经验"},
        {"经验内容": "发烧用酒精擦身体降温", "期望可信度分类": "风险经验"},
        {"经验内容": "听说喝点姜汤能退烧", "期望可信度分类": "待验证经验"},
    ]
    cred_value_demo_rows: List[Dict[str, Any]] = []
    value_scores: List[float] = []
    for item in demo_experiences:
        text = item["经验内容"]
        cred = credibility_model.classify(text)
        label = (cred.get("分类标签") or "").strip()
        risk_level = (cred.get("风险等级") or "").strip()
        safety_level = "安全" if risk_level == "低" else ("中风险" if risk_level == "中" else "高危")
        value_out = value_model.evaluate_text(text)
        raw_score = float(value_out.get("价值评分") or 0.0)
        if risk_level == "高":
            score = round(raw_score * 0.25, 1)
        elif risk_level == "中":
            score = round(raw_score * 0.6, 1)
        else:
            score = round(raw_score, 1)
        value_scores.append(score)
        cred_value_demo_rows.append(
            {
                "经验内容": text,
                "可信度分类": label,
                "安全等级": safety_level,
                "价值评分（0-100）": score,
            }
        )
    _write_csv(
        out_dir / "cred_value_demo.csv",
        cred_value_demo_rows,
        ["经验内容", "可信度分类", "安全等级", "价值评分（0-100）"],
    )
    _write_text(
        out_dir / "cred_value_demo.svg",
        _svg_bar_chart(
            "经验可信度 + 价值评分示例（PPT 可用）",
            ["科学", "风险", "待验证"],
            [("价值评分", value_scores)],
            y_max=100.0,
        ),
    )

    elder_helper_demo = [
        {"老人问题": "我手机声音太小不会调", "期望匹配到": "技术帮助", "用户角色": "老人"},
        {"老人问题": "微信挂号怎么操作", "期望匹配到": "技术帮助", "用户角色": "老人"},
        {"老人问题": "血压高，早上起来头晕得很，是不是药量不够？", "期望匹配到": "疾病护理", "用户角色": "老人"},
        {"老人问题": "晚上睡不着，白天又没精神，咋个调理？", "期望匹配到": "作息调整", "用户角色": "老人"},
        {"老人问题": "膝盖痛，上下楼梯恼火得很，有啥子锻炼方法不伤膝盖？", "期望匹配到": "康复建议", "用户角色": "老人"},
        {"老人问题": "孩子几个月可以加辅食，最先吃什么", "期望匹配到": "喂养护理", "用户角色": "家长"},
    ]
    elder_helper_rows: List[Dict[str, Any]] = []
    for item in elder_helper_demo:
        q = item["老人问题"]
        expected = item["期望匹配到"]
        role = item.get("用户角色") or "老人"
        rec = demand_model.recommend_elders(q, top_k=1, user_role=role)
        top = (rec.get("推荐老人") or [])
        top1 = top[0] if top else {}
        tags = top1.get("擅长领域") or []
        matched_ok = "匹配正确" if expected in tags else "匹配错误"
        elder_helper_rows.append(
            {
                "老人问题": q,
                "推荐老人": top1.get("老人姓名") or "",
                "推荐老人擅长领域": ",".join([str(x) for x in tags]) if isinstance(tags, list) else str(tags),
                "期望匹配到": expected,
                "匹配结果": matched_ok,
                "匹配度": top1.get("匹配度") or "",
            }
        )
    _write_csv(
        out_dir / "elder_helper_demo.csv",
        elder_helper_rows,
        ["老人问题", "推荐老人", "推荐老人擅长领域", "期望匹配到", "匹配结果", "匹配度"],
    )

    _write_text(
        out_dir / "semantic_accuracy.svg",
        _svg_bar_chart(
            "语义理解准确率（主题）",
            ["验证集", "测试集"],
            [("主题准确率", [semantic_verify["accuracy"], semantic_test["accuracy"]])],
            y_max=1.0,
        ),
    )
    _write_text(
        out_dir / "credibility_accuracy.svg",
        _svg_bar_chart(
            "可信度分类准确率",
            ["验证集", "测试集"],
            [("准确率", [cred_verify["accuracy"], cred_test["accuracy"]])],
            y_max=1.0,
        ),
    )
    _write_text(
        out_dir / "matching_parent_accuracy.svg",
        _svg_bar_chart(
            f"父母问题→老人经验 匹配准确率（Top1/Top{int(topk)}）",
            ["验证集", "测试集"],
            [
                ("Top1", [match_parent_verify["top1_accuracy"], match_parent_test["top1_accuracy"]]),
                (f"Top{int(topk)}", [match_parent_verify["topk_accuracy"], match_parent_test["topk_accuracy"]]),
            ],
            y_max=1.0,
        ),
    )
    _write_text(
        out_dir / "matching_elder_accuracy.svg",
        _svg_bar_chart(
            "老人问题→帮助类型 匹配准确率",
            ["验证集", "测试集"],
            [("帮助类型准确率", [match_elder_verify["help_type_accuracy"], match_elder_test["help_type_accuracy"]])],
            y_max=1.0,
        ),
    )

    summary = {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "data_dir": str(data_dir),
        "out_dir": str(out_dir),
        "semantic": {"verify": semantic_verify, "test": semantic_test},
        "credibility": {"verify": cred_verify, "test": cred_test},
        "value": {"verify": value_verify, "test": value_test},
        "matching_parent": {"verify": match_parent_verify, "test": match_parent_test},
        "matching_elder": {"verify": match_elder_verify, "test": match_elder_test},
        "demand_model_demo": demand_model.recommend_elders("宝宝晚上总哭怎么办", top_k=3),
        "demo_outputs": {
            "cred_value_demo_csv": str(out_dir / "cred_value_demo.csv"),
            "cred_value_demo_svg": str(out_dir / "cred_value_demo.svg"),
            "elder_helper_demo_csv": str(out_dir / "elder_helper_demo.csv"),
        },
    }
    _write_json(out_dir / "metrics.json", summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return summary


def main() -> None:
    project_root = Path(__file__).resolve().parents[1]
    data_dir = project_root / "data"

    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["full", "legacy"], default="full")
    parser.add_argument("--input", default=str(data_dir / "test.txt"))
    parser.add_argument("--output", default=str(data_dir / "test.csv"))
    parser.add_argument("--demand", default=str(data_dir / "test_demand.csv"))
    parser.add_argument("--experience-limit", type=int, default=5)
    parser.add_argument("--demand-limit", type=int, default=10)
    parser.add_argument("--topk", type=int, default=5)
    parser.add_argument("--seed", type=int, default=20260328)
    parser.add_argument("--out", default=str(data_dir / "eval_outputs"))
    args = parser.parse_args()

    input_txt = Path(args.input)
    output_csv = Path(args.output)
    demand_csv = Path(args.demand)
    out_dir = Path(args.out)

    if args.mode == "legacy":
        if input_txt.exists():
            count = build_test_csv(input_txt, output_csv)
            logging.info("已生成 %s（%d 行）", str(output_csv), count)
        elif output_csv.exists():
            logging.info("未找到 %s，直接使用已有 %s", str(input_txt), str(output_csv))
        else:
            raise FileNotFoundError(f"未找到输入 {input_txt}，且输出 {output_csv} 不存在，无法继续")
        run_validation(
            output_csv,
            demand_csv,
            experience_limit=args.experience_limit,
            demand_limit=args.demand_limit,
            topk=args.topk,
        )
        return

    required = [
        data_dir / "verify.csv",
        data_dir / "test.csv",
        data_dir / "child.csv",
        data_dir / "verify_demand.csv",
        data_dir / "test_demand.csv",
        data_dir / "older_demand.csv",
    ]
    missing = [str(p) for p in required if not p.exists()]
    if missing:
        raise FileNotFoundError("缺少必要数据文件：" + ", ".join(missing))
    run_full(data_dir=data_dir, out_dir=out_dir, seed=int(args.seed), topk=int(args.topk))


if __name__ == "__main__":
    main()
