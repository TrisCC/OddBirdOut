#!/usr/bin/env python3
"""
Odd Bird Out — Behavioral Change Analysis (Trust vs Ostracism)
===============================================================
Per-player within-subject comparison of behavior between the
trust phase (rounds 1-6) and the ostracism phase (rounds 7-12).

Output: output_behavioral.json + PNG charts
"""

import json
import glob
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
SESSIONS_DIR = BASE_DIR.parent / "server" / "data" / "sessions"
OUTPUT_JSON = BASE_DIR / "output_behavioral.json"
CHARTS_DIR = BASE_DIR / "charts"
CHARTS_DIR.mkdir(exist_ok=True)

PLAYERS = ["A", "B", "C"]
PLOT_RC = {"figure.dpi": 150, "savefig.bbox": "tight", "savefig.pad_inches": 0.2}


# ═══════════════════════════════════════════════════════════════════════════════
# 1. LOAD & FLATTEN
# ═══════════════════════════════════════════════════════════════════════════════

def load_sessions():
    flat = []
    session_meta = {}

    for fpath in sorted(glob.glob(str(SESSIONS_DIR / "*.json"))):
        with open(fpath, "r", encoding="utf-8") as fh:
            s = json.load(fh)

        sid = s["sessionId"]
        date_str = s["startedAt"][:10] if s.get("startedAt") else "unknown"
        session_meta[sid] = {
            "sessionId": sid,
            "date": date_str,
            "finalScores": s.get("finalScores", {}),
            "winner": s.get("winner", []),
        }

        for rd in s.get("rounds", []):
            rnum = rd["round"]
            phase = rd["phase"]
            actions = rd["trueActions"]
            true_scores = rd["trueScores"]
            true_deltas = rd["trueDeltas"]

            for act in actions:
                player = act["player"]
                target = act.get("target")
                action = act["action"]

                mutual = _in_mutual_pair(actions, player, target, action)

                flat.append({
                    "session_id": sid,
                    "date": date_str,
                    "round": rnum,
                    "phase": phase,
                    "player": player,
                    "action": action,
                    "target": target,
                    "delta": true_deltas.get(player, 0),
                    "in_mutual_pair": mutual,
                })

    df = pd.DataFrame(flat)
    df["phase_num"] = df["phase"].map({"trust": 0, "ostracism": 1})
    return df, session_meta


def _in_mutual_pair(actions, self_player, self_target, self_action):
    if self_action != "share" or not self_target:
        return False
    share_target = {}
    for act in actions:
        if act["action"] == "share" and act.get("target"):
            share_target[act["player"]] = act["target"]
    return share_target.get(self_target) == self_player


# ═══════════════════════════════════════════════════════════════════════════════
# 2. BUILD PER-PLAYER PER-PHASE TABLE
# ═══════════════════════════════════════════════════════════════════════════════

def build_player_phase_table(df):
    action_lookup = {}
    for _, row in df.iterrows():
        key = (row["session_id"], row["round"], row["player"])
        action_lookup[key] = (row["action"], row["target"])

    rows = []

    for (sid, player), g in df.groupby(["session_id", "player"]):
        date = g["date"].iloc[0]

        for phase_name, phase_label in [("trust", 0), ("ostracism", 1)]:
            pdf = g[g["phase"] == phase_name]
            n = len(pdf)
            if n == 0:
                continue

            share_df = pdf[pdf["action"] == "share"]
            share_count = int(len(share_df))
            hide_count = int((pdf["action"] == "hide").sum())
            mutual_count = int(pdf["in_mutual_pair"].sum())
            shared_delta = share_df["delta"].sum()

            target_counts = share_df["target"].value_counts()
            preferred_target = target_counts.idxmax() if len(target_counts) > 0 else None

            reciprocations = 0
            for _, row_r in pdf.iterrows():
                if row_r["action"] == "share" and row_r["target"]:
                    partner = row_r["target"]
                    p_key = (sid, row_r["round"], partner)
                    p_act = action_lookup.get(p_key)
                    if p_act and p_act[0] == "share" and p_act[1] == player:
                        reciprocations += 1

            rows.append({
                "session_id": sid,
                "date": date,
                "player": player,
                "phase": phase_name,
                "rounds": n,
                "share_count": share_count,
                "hide_count": hide_count,
                "share_rate": round(share_count / n, 4),
                "hide_rate": round(hide_count / n, 4),
                "mutual_count": mutual_count,
                "mutual_rate": round(mutual_count / n, 4),
                "reciprocity_count": reciprocations,
                "reciprocity_rate": round(reciprocations / max(1, share_count), 4),
                "preferred_target": preferred_target,
                "target_vector": _target_vector(share_df, player),
                "total_delta": int(shared_delta),
                "final_score": None,
            })

    ppt = pd.DataFrame(rows)

    for sid, g in ppt.groupby("session_id"):
        trust_final = g[g["phase"] == "trust"].set_index("player")["total_delta"].to_dict()
        ost_final = g[g["phase"] == "ostracism"].set_index("player")["total_delta"].to_dict()
        for idx, row in g.iterrows():
            p = row["player"]
            base = trust_final.get(p, 0)
            add = ost_final.get(p, 0)
            ppt.at[idx, "final_score"] = base + add

    return ppt


def _target_vector(share_df, self_player):
    vec = {t: 0 for t in PLAYERS if t != self_player}
    for t in share_df["target"].dropna():
        if t in vec:
            vec[t] += 1
    return vec


# ═══════════════════════════════════════════════════════════════════════════════
# 3. ANALYSIS SECTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def section_b1_per_player_deltas(ppt):
    trust = ppt[ppt["phase"] == "trust"].set_index(["session_id", "player"])
    ost = ppt[ppt["phase"] == "ostracism"].set_index(["session_id", "player"])

    idx = trust.index.intersection(ost.index)
    trust = trust.loc[idx]
    ost = ost.loc[idx]

    deltas = []
    metrics = ["share_rate", "hide_rate", "mutual_rate", "reciprocity_rate"]

    for (sid, player) in idx:
        t = trust.loc[(sid, player)]
        o = ost.loc[(sid, player)]

        switched = t["preferred_target"] != o["preferred_target"]

        deltas.append({
            "session_id": sid,
            "player": player,
            "date": t["date"],
            "trust_share_rate": float(t["share_rate"]),
            "ostracism_share_rate": float(o["share_rate"]),
            "share_rate_change": round(float(o["share_rate"] - t["share_rate"]), 4),
            "trust_hide_rate": float(t["hide_rate"]),
            "ostracism_hide_rate": float(o["hide_rate"]),
            "hide_rate_change": round(float(o["hide_rate"] - t["hide_rate"]), 4),
            "trust_mutual_rate": float(t["mutual_rate"]),
            "ostracism_mutual_rate": float(o["mutual_rate"]),
            "mutual_rate_change": round(float(o["mutual_rate"] - t["mutual_rate"]), 4),
            "trust_reciprocity_rate": float(t["reciprocity_rate"]),
            "ostracism_reciprocity_rate": float(o["reciprocity_rate"]),
            "reciprocity_rate_change": round(float(o["reciprocity_rate"] - t["reciprocity_rate"]), 4),
            "trust_preferred_target": t["preferred_target"],
            "ostracism_preferred_target": o["preferred_target"],
            "target_switched": bool(switched),
            "shares_more_in_ostracism": bool(o["share_count"] > t["share_count"]),
            "hides_more_in_ostracism": bool(o["hide_count"] > t["hide_count"]),
        })

    dd = pd.DataFrame(deltas)

    summary = {
        "total_player_instances": len(dd),
        "target_switched_count": int(dd["target_switched"].sum()),
        "target_switched_rate": round(float(dd["target_switched"].mean()), 4),
        "shares_more_in_ostracism_count": int(dd["shares_more_in_ostracism"].sum()),
        "shares_more_in_ostracism_rate": round(float(dd["shares_more_in_ostracism"].mean()), 4),
        "hides_more_in_ostracism_count": int(dd["hides_more_in_ostracism"].sum()),
        "hides_more_in_ostracism_rate": round(float(dd["hides_more_in_ostracism"].mean()), 4),
        "per_metric_deltas": {},
    }

    for m in metrics:
        col = f"{m}_change"
        vals = dd[col]
        summary["per_metric_deltas"][m] = {
            "mean_change": round(float(vals.mean()), 4),
            "median_change": round(float(vals.median()), 4),
            "std_change": round(float(vals.std()), 4),
            "positive_change_count": int((vals > 0).sum()),
            "negative_change_count": int((vals < 0).sum()),
            "no_change_count": int((vals == 0).sum()),
        }

    per_role = {}
    for role in PLAYERS:
        rdd = dd[dd["player"] == role]
        per_role[role] = {
            "count": len(rdd),
            "target_switched_rate": round(float(rdd["target_switched"].mean()), 4),
            "mean_share_rate_change": round(float(rdd["share_rate_change"].mean()), 4),
            "mean_hide_rate_change": round(float(rdd["hide_rate_change"].mean()), 4),
            "mean_mutual_rate_change": round(float(rdd["mutual_rate_change"].mean()), 4),
            "mean_reciprocity_rate_change": round(float(rdd["reciprocity_rate_change"].mean()), 4),
        }

    return {
        "description": "Per-player within-subject behavioral change from trust to ostracism",
        "summary": summary,
        "per_role": per_role,
        "player_deltas": deltas,
    }


def section_b2_direction_stability(ppt):
    trust = ppt[ppt["phase"] == "trust"].set_index(["session_id", "player"])
    ost = ppt[ppt["phase"] == "ostracism"].set_index(["session_id", "player"])
    idx = trust.index.intersection(ost.index)

    stability_scores = []
    for (sid, player) in idx:
        tv = trust.loc[(sid, player), "target_vector"]
        ov = ost.loc[(sid, player), "target_vector"]
        if not isinstance(tv, dict) or not isinstance(ov, dict):
            continue

        keys = sorted(set(list(tv.keys()) + list(ov.keys())))
        a = np.array([tv.get(k, 0) for k in keys], dtype=float)
        b = np.array([ov.get(k, 0) for k in keys], dtype=float)

        dot = np.dot(a, b)
        norm = np.linalg.norm(a) * np.linalg.norm(b)
        cos_sim = float(dot / norm) if norm > 0 else 0.0

        stability_scores.append({
            "session_id": sid,
            "player": player,
            "trust_vector": tv,
            "ostracism_vector": ov,
            "cosine_similarity": round(cos_sim, 4),
        })

    sd = pd.DataFrame(stability_scores)

    per_role_stability = {}
    for role in PLAYERS:
        vals = sd[sd["player"] == role]["cosine_similarity"]
        per_role_stability[role] = {
            "mean": round(float(vals.mean()), 4),
            "median": round(float(vals.median()), 4),
            "std": round(float(vals.std()), 4),
        }

    return {
        "description": "Cosine similarity of per-player share direction vectors between phases",
        "overall_mean_stability": round(float(sd["cosine_similarity"].mean()), 4),
        "overall_median_stability": round(float(sd["cosine_similarity"].median()), 4),
        "per_role": per_role_stability,
        "scores": [{
            "session_id": r["session_id"],
            "player": r["player"],
            "cosine_similarity": r["cosine_similarity"],
        } for _, r in sd.iterrows()],
    }


def section_b3_hide_change(ppt):
    trust = ppt[ppt["phase"] == "trust"].set_index(["session_id", "player"])
    ost = ppt[ppt["phase"] == "ostracism"].set_index(["session_id", "player"])
    idx = trust.index.intersection(ost.index)

    trust_hides = trust.loc[idx, "hide_count"].values.astype(int)
    ost_hides = ost.loc[idx, "hide_count"].values.astype(int)

    more = int((ost_hides > trust_hides).sum())
    less = int((ost_hides < trust_hides).sum())
    same = int((ost_hides == trust_hides).sum())

    trust_rate = trust.loc[idx, "hide_rate"].values
    ost_rate = ost.loc[idx, "hide_rate"].values
    try:
        t_stat, t_p = stats.ttest_rel(trust_rate, ost_rate)
    except Exception:
        t_stat, t_p = np.nan, np.nan

    per_role = {}
    for role in PLAYERS:
        mask = ost.loc[idx].index.get_level_values("player") == role
        th = trust_rate[mask]
        oh = ost_rate[mask]
        per_role[role] = {
            "trust_mean_hide_rate": round(float(th.mean()), 4),
            "ostracism_mean_hide_rate": round(float(oh.mean()), 4),
            "hide_rate_change": round(float(oh.mean() - th.mean()), 4),
        }

    return {
        "description": "Hide behavior comparison between trust and ostracism phases",
        "trust_total_hides": int(trust_hides.sum()),
        "ostracism_total_hides": int(ost_hides.sum()),
        "players_hiding_more": more,
        "players_hiding_less": less,
        "players_hiding_same": same,
        "paired_t_statistic": round(float(t_stat), 4) if not np.isnan(t_stat) else None,
        "paired_t_p_value": round(float(t_p), 6) if not np.isnan(t_p) else None,
        "per_role": per_role,
    }


def section_b4_reciprocity_loyalty(ppt):
    trust = ppt[ppt["phase"] == "trust"].set_index(["session_id", "player"])
    ost = ppt[ppt["phase"] == "ostracism"].set_index(["session_id", "player"])
    idx = trust.index.intersection(ost.index)

    t_rec = trust.loc[idx, "reciprocity_rate"].values
    o_rec = ost.loc[idx, "reciprocity_rate"].values

    t_stat, t_p = stats.ttest_rel(t_rec, o_rec)
    cohens_d = _cohens_d(t_rec, o_rec)

    per_role = {}
    for role in PLAYERS:
        mask = ost.loc[idx].index.get_level_values("player") == role
        per_role[role] = {
            "trust_mean_reciprocity": round(float(t_rec[mask].mean()), 4),
            "ostracism_mean_reciprocity": round(float(o_rec[mask].mean()), 4),
            "mean_change": round(float(o_rec[mask].mean() - t_rec[mask].mean()), 4),
        }

    return {
        "description": "Reciprocity loyalty — does partner reciprocate at the same rate across phases?",
        "trust_mean_reciprocity_rate": round(float(t_rec.mean()), 4),
        "ostracism_mean_reciprocity_rate": round(float(o_rec.mean()), 4),
        "mean_change": round(float(o_rec.mean() - t_rec.mean()), 4),
        "paired_t_statistic": round(float(t_stat), 4),
        "paired_t_p_value": round(float(t_p), 6),
        "cohens_d": round(cohens_d, 4),
        "per_role": per_role,
    }


def section_b5_mutual_participation(ppt):
    trust = ppt[ppt["phase"] == "trust"].set_index(["session_id", "player"])
    ost = ppt[ppt["phase"] == "ostracism"].set_index(["session_id", "player"])
    idx = trust.index.intersection(ost.index)

    t_mut = trust.loc[idx, "mutual_rate"].values
    o_mut = ost.loc[idx, "mutual_rate"].values

    t_stat, t_p = stats.ttest_rel(t_mut, o_mut)
    cohens_d = _cohens_d(t_mut, o_mut)

    per_role = {}
    for role in PLAYERS:
        mask = ost.loc[idx].index.get_level_values("player") == role
        per_role[role] = {
            "trust_mean_mutual_rate": round(float(t_mut[mask].mean()), 4),
            "ostracism_mean_mutual_rate": round(float(o_mut[mask].mean()), 4),
            "mean_change": round(float(o_mut[mask].mean() - t_mut[mask].mean()), 4),
        }

    more = int((o_mut > t_mut).sum())
    less = int((o_mut < t_mut).sum())
    same = int((o_mut == t_mut).sum())

    return {
        "description": "Mutual pair participation rate per player across phases",
        "trust_mean_mutual_rate": round(float(t_mut.mean()), 4),
        "ostracism_mean_mutual_rate": round(float(o_mut.mean()), 4),
        "mean_change": round(float(o_mut.mean() - t_mut.mean()), 4),
        "paired_t_statistic": round(float(t_stat), 4),
        "paired_t_p_value": round(float(t_p), 6),
        "cohens_d": round(cohens_d, 4),
        "players_mutual_more_in_ostracism": more,
        "players_mutual_less_in_ostracism": less,
        "players_mutual_same": same,
        "per_role": per_role,
    }


def section_b6_day_evolution(ppt):
    days = sorted(ppt["date"].unique())
    day_data = []

    for d in days:
        dp = ppt[ppt["date"] == d]
        trust = dp[dp["phase"] == "trust"].set_index(["session_id", "player"])
        ost = dp[dp["phase"] == "ostracism"].set_index(["session_id", "player"])
        idx = trust.index.intersection(ost.index)

        day_data.append({
            "date": d,
            "session_count": int(dp["session_id"].nunique()),
            "player_count": len(idx),
            "trust_share_rate": round(float(trust.loc[idx, "share_rate"].mean()), 4),
            "ostracism_share_rate": round(float(ost.loc[idx, "share_rate"].mean()), 4),
            "trust_hide_rate": round(float(trust.loc[idx, "hide_rate"].mean()), 4),
            "ostracism_hide_rate": round(float(ost.loc[idx, "hide_rate"].mean()), 4),
            "trust_mutual_rate": round(float(trust.loc[idx, "mutual_rate"].mean()), 4),
            "ostracism_mutual_rate": round(float(ost.loc[idx, "mutual_rate"].mean()), 4),
            "trust_reciprocity_rate": round(float(trust.loc[idx, "reciprocity_rate"].mean()), 4),
            "ostracism_reciprocity_rate": round(float(ost.loc[idx, "reciprocity_rate"].mean()), 4),
        })

    return {
        "description": "Day-over-day evolution of trust vs ostracism behavioral metrics",
        "days": day_data,
    }


def section_b7_statistical_tests(ppt):
    trust = ppt[ppt["phase"] == "trust"].set_index(["session_id", "player"])
    ost = ppt[ppt["phase"] == "ostracism"].set_index(["session_id", "player"])
    idx = trust.index.intersection(ost.index)

    test_results = {}

    metric_pairs = [
        ("share_rate", "Share rate"),
        ("hide_rate", "Hide rate"),
        ("mutual_rate", "Mutual pair participation"),
        ("reciprocity_rate", "Reciprocity rate"),
    ]

    for col, label in metric_pairs:
        t_vals = trust.loc[idx, col].values
        o_vals = ost.loc[idx, col].values

        try:
            t_stat, t_p = stats.ttest_rel(t_vals, o_vals)
        except Exception:
            t_stat, t_p = np.nan, np.nan

        d = _cohens_d(t_vals, o_vals)

        diff_vals = o_vals - t_vals
        sem = stats.sem(diff_vals)
        if sem and not np.isnan(sem) and sem > 0:
            ci = stats.t.interval(0.95, len(diff_vals) - 1, loc=diff_vals.mean(), scale=sem)
            ci_lo, ci_hi = round(float(ci[0]), 4), round(float(ci[1]), 4)
        else:
            ci_lo, ci_hi = None, None

        test_results[col] = {
            "metric": label,
            "trust_mean": round(float(t_vals.mean()), 4),
            "ostracism_mean": round(float(o_vals.mean()), 4),
            "mean_difference": round(float(o_vals.mean() - t_vals.mean()), 4),
            "paired_t_statistic": round(float(t_stat), 4) if not np.isnan(t_stat) else None,
            "paired_t_p_value": round(float(t_p), 6) if not np.isnan(t_p) else None,
            "significant_at_05": bool(t_p < 0.05) if not np.isnan(t_p) else False,
            "significant_at_01": bool(t_p < 0.01) if not np.isnan(t_p) else False,
            "cohens_d": round(d, 4),
            "cohens_d_interpretation": _interpret_d(d),
            "ci_95_lower": ci_lo,
            "ci_95_upper": ci_hi,
        }

    return {
        "description": "Statistical significance of behavioral changes between phases",
        "n_player_instances": len(idx),
        "tests": test_results,
        "interpretation_notes": {
            "cohens_d": "0.2 = small, 0.5 = medium, 0.8 = large",
            "p_value": "Probability of observing the difference if null hypothesis (no change) is true",
        },
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 4. CHARTS
# ═══════════════════════════════════════════════════════════════════════════════

def generate_charts(ppt):
    charts = {}
    sns.set_theme(style="whitegrid", palette="muted")
    with plt.rc_context(PLOT_RC):
        charts["share_rate_change_hist"] = _chart_share_rate_change(ppt)
        charts["hide_rate_change_by_role"] = _chart_hide_change_by_role(ppt)
        charts["direction_stability_hist"] = _chart_direction_stability(ppt)
        charts["day_evolution_lines"] = _chart_day_evolution(ppt)
        charts["effect_sizes_forest"] = _chart_effect_sizes(ppt)
    return charts


def _chart_share_rate_change(ppt):
    trust = ppt[ppt["phase"] == "trust"].set_index(["session_id", "player"])
    ost = ppt[ppt["phase"] == "ostracism"].set_index(["session_id", "player"])
    idx = trust.index.intersection(ost.index)
    deltas = ost.loc[idx, "share_rate"].values - trust.loc[idx, "share_rate"].values

    fig, ax = plt.subplots(figsize=(8, 4))
    ax.hist(deltas, bins=20, color="#5b9bd5", edgecolor="white", alpha=0.85)
    ax.axvline(x=0, color="gray", linestyle="--", alpha=0.5)
    ax.axvline(x=deltas.mean(), color="#e07b5a", linestyle="-", linewidth=2, label=f"Mean = {deltas.mean():.3f}")
    ax.set_title("Distribution of Share Rate Change (Ostracism - Trust)")
    ax.set_xlabel("Share rate change")
    ax.set_ylabel("Player count")
    ax.legend()
    path = CHARTS_DIR / "behavioral_share_rate_change.png"
    fig.savefig(path)
    plt.close(fig)
    return str(path)


def _chart_hide_change_by_role(ppt):
    trust = ppt[ppt["phase"] == "trust"].set_index(["session_id", "player"])
    ost = ppt[ppt["phase"] == "ostracism"].set_index(["session_id", "player"])
    idx = trust.index.intersection(ost.index)

    fig, ax = plt.subplots(figsize=(8, 4))
    x = np.arange(len(PLAYERS))
    width = 0.35

    for i, role in enumerate(PLAYERS):
        mask = ost.loc[idx].index.get_level_values("player") == role
        t_mean = trust.loc[idx][mask]["hide_rate"].mean()
        o_mean = ost.loc[idx][mask]["hide_rate"].mean()
        ax.bar(x[i] - width / 2, t_mean, width, label="Trust" if i == 0 else "", color="#5b9bd5", alpha=0.85)
        ax.bar(x[i] + width / 2, o_mean, width, label="Ostracism" if i == 0 else "", color="#e07b5a", alpha=0.85)

    ax.set_xticks(x)
    ax.set_xticklabels([f"Player {p}" for p in PLAYERS])
    ax.set_title("Mean Hide Rate: Trust vs Ostracism per Role")
    ax.set_ylabel("Hide rate")
    ax.legend()
    path = CHARTS_DIR / "behavioral_hide_change_by_role.png"
    fig.savefig(path)
    plt.close(fig)
    return str(path)


def _chart_direction_stability(ppt):
    trust = ppt[ppt["phase"] == "trust"].set_index(["session_id", "player"])
    ost = ppt[ppt["phase"] == "ostracism"].set_index(["session_id", "player"])
    idx = trust.index.intersection(ost.index)

    cos_sims = []
    for (sid, player) in idx:
        tv = trust.loc[(sid, player), "target_vector"]
        ov = ost.loc[(sid, player), "target_vector"]
        if not isinstance(tv, dict) or not isinstance(ov, dict):
            continue
        keys = sorted(set(list(tv.keys()) + list(ov.keys())))
        a = np.array([tv.get(k, 0) for k in keys], dtype=float)
        b = np.array([ov.get(k, 0) for k in keys], dtype=float)
        dot = np.dot(a, b)
        norm = np.linalg.norm(a) * np.linalg.norm(b)
        cos_sims.append(float(dot / norm) if norm > 0 else 0.0)

    fig, ax = plt.subplots(figsize=(8, 4))
    ax.hist(cos_sims, bins=20, color="#5b9bd5", edgecolor="white", alpha=0.85)
    ax.axvline(x=np.mean(cos_sims), color="#e07b5a", linestyle="-", linewidth=2,
               label=f"Mean = {np.mean(cos_sims):.3f}")
    ax.set_title("Distribution of Share Direction Stability (Cosine Similarity)")
    ax.set_xlabel("Cosine similarity (1 = identical direction, 0 = orthogonal)")
    ax.set_ylabel("Player count")
    ax.legend()
    path = CHARTS_DIR / "behavioral_direction_stability.png"
    fig.savefig(path)
    plt.close(fig)
    return str(path)


def _chart_day_evolution(ppt):
    days = sorted(ppt["date"].unique())
    trust = ppt[ppt["phase"] == "trust"].set_index(["session_id", "player"])
    ost = ppt[ppt["phase"] == "ostracism"].set_index(["session_id", "player"])

    day_trust_share = []
    day_ost_share = []
    for d in days:
        d_ppt = ppt[ppt["date"] == d]
        d_trust = d_ppt[d_ppt["phase"] == "trust"]
        d_ost = d_ppt[d_ppt["phase"] == "ostracism"]
        day_trust_share.append(float(d_trust["share_rate"].mean()))
        day_ost_share.append(float(d_ost["share_rate"].mean()))

    fig, ax = plt.subplots(figsize=(8, 4))
    x = np.arange(len(days))
    ax.plot(x, day_trust_share, "o-", color="#5b9bd5", linewidth=2, label="Trust phase")
    ax.plot(x, day_ost_share, "s-", color="#e07b5a", linewidth=2, label="Ostracism phase")
    ax.set_xticks(x)
    ax.set_xticklabels(days)
    ax.set_title("Mean Share Rate by Day: Trust vs Ostracism")
    ax.set_ylabel("Mean share rate")
    ax.legend()
    fig.autofmt_xdate()
    path = CHARTS_DIR / "behavioral_day_evolution.png"
    fig.savefig(path)
    plt.close(fig)
    return str(path)


def _chart_effect_sizes(ppt):
    trust = ppt[ppt["phase"] == "trust"].set_index(["session_id", "player"])
    ost = ppt[ppt["phase"] == "ostracism"].set_index(["session_id", "player"])
    idx = trust.index.intersection(ost.index)

    metrics = ["share_rate", "hide_rate", "mutual_rate", "reciprocity_rate"]
    labels = ["Share rate", "Hide rate", "Mutual participation", "Reciprocity"]
    d_vals = []
    for col in metrics:
        t_vals = trust.loc[idx, col].values
        o_vals = ost.loc[idx, col].values
        d_vals.append(_cohens_d(t_vals, o_vals))

    fig, ax = plt.subplots(figsize=(8, 3.5))
    colors = ["#5b9bd5" if d > 0 else "#e07b5a" for d in d_vals]
    y_pos = np.arange(len(labels))
    ax.barh(y_pos, d_vals, color=colors, alpha=0.85, height=0.5)
    ax.axvline(x=0, color="gray", linestyle="-", linewidth=1)
    ax.axvline(x=0.2, color="gray", linestyle="--", alpha=0.4)
    ax.axvline(x=0.5, color="gray", linestyle="--", alpha=0.4)
    ax.axvline(x=0.8, color="gray", linestyle="--", alpha=0.4)
    ax.set_yticks(y_pos)
    ax.set_yticklabels(labels)
    ax.set_xlabel("Cohen's d")
    ax.set_title("Effect Sizes of Behavioral Change (Trust → Ostracism)")
    for i, (d, lb) in enumerate(zip(d_vals, labels)):
        ax.text(d + 0.015 if d >= 0 else d - 0.08, i, f"{d:.3f}", va="center", fontsize=9)
    path = CHARTS_DIR / "behavioral_effect_sizes.png"
    fig.savefig(path)
    plt.close(fig)
    return str(path)


# ═══════════════════════════════════════════════════════════════════════════════
# 5. HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _cohens_d(a, b):
    diff = a - b
    n = len(diff)
    if n < 2:
        return 0.0
    std_val = np.std(diff, ddof=1)
    if std_val == 0 or np.isnan(std_val):
        return 0.0
    d_val = float(np.mean(diff) / std_val)
    return d_val


def _interpret_d(d):
    d_abs = abs(d)
    if d_abs < 0.2:
        return "negligible"
    if d_abs < 0.5:
        return "small"
    if d_abs < 0.8:
        return "medium"
    return "large"


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print("Loading sessions ...")
    df, meta = load_sessions()
    print(f"  Loaded {len(meta)} sessions, {len(df)} action rows")

    print("Building player-phase table ...")
    ppt = build_player_phase_table(df)
    print(f"  {len(ppt)} player-phase rows ({ppt['session_id'].nunique()} sessions)")

    print("Running behavioral change analyses ...")
    b1 = section_b1_per_player_deltas(ppt)
    b2 = section_b2_direction_stability(ppt)
    b3 = section_b3_hide_change(ppt)
    b4 = section_b4_reciprocity_loyalty(ppt)
    b5 = section_b5_mutual_participation(ppt)
    b6 = section_b6_day_evolution(ppt)
    b7 = section_b7_statistical_tests(ppt)

    print("Generating charts ...")
    charts = generate_charts(ppt)

    output = {
        "meta": {
            "total_sessions": len(meta),
            "player_instances": ppt["session_id"].nunique() * 3,
            "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
            "source_directory": str(SESSIONS_DIR),
        },
        "section_b1_per_player_deltas": b1,
        "section_b2_direction_stability": b2,
        "section_b3_hide_change": b3,
        "section_b4_reciprocity_loyalty": b4,
        "section_b5_mutual_participation": b5,
        "section_b6_day_evolution": b6,
        "section_b7_statistical_tests": b7,
        "charts": charts,
    }

    print(f"Writing {OUTPUT_JSON} ...")
    with open(OUTPUT_JSON, "w", encoding="utf-8") as fh:
        json.dump(output, fh, indent=2, ensure_ascii=False, default=str)

    print(f"Done. Output: {OUTPUT_JSON}")
    print(f"Charts: {len(charts)} PNGs in {CHARTS_DIR}")


if __name__ == "__main__":
    main()
