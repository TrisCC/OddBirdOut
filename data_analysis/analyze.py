#!/usr/bin/env python3
"""
Odd Bird Out — Session Data Analysis
=====================================
Loads all session JSONs from ../server/data/sessions/, flattens into a pandas
DataFrame, and computes 11 analysis sections. Outputs structured JSON to
output.json and optional PNG charts to charts/.
"""

import json
import glob
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
SESSIONS_DIR = BASE_DIR.parent / "server" / "data" / "sessions"
OUTPUT_JSON = BASE_DIR / "output.json"
CHARTS_DIR = BASE_DIR / "charts"
CHARTS_DIR.mkdir(exist_ok=True)

PLAYERS = ["A", "B", "C"]
PLOT_CONTEXT = {"figure.dpi": 150, "savefig.bbox": "tight", "savefig.pad_inches": 0.2}


# ═══════════════════════════════════════════════════════════════════════════════
# 1. LOAD & FLATTEN
# ═══════════════════════════════════════════════════════════════════════════════

def load_sessions():
    rows = []
    session_meta = {}

    for fpath in sorted(glob.glob(str(SESSIONS_DIR / "*.json"))):
        with open(fpath, "r", encoding="utf-8") as fh:
            s = json.load(fh)

        sid = s["sessionId"]
        started = _parse_iso(s["startedAt"])
        ended = _parse_iso(s.get("endedAt"))
        date_str = started.strftime("%Y-%m-%d") if started else "unknown"
        duration = (ended - started).total_seconds() if started and ended else None

        session_meta[sid] = {
            "sessionId": sid,
            "date": date_str,
            "startedAt": s["startedAt"],
            "endedAt": s.get("endedAt"),
            "duration_seconds": duration,
            "totalRounds": s.get("config", {}).get("totalRounds", 12),
            "phase1Rounds": s.get("config", {}).get("phase1Rounds", 6),
            "startingEggs": s.get("config", {}).get("startingEggs", 0),
            "roundDurationMs": s.get("config", {}).get("roundDurationMs", 10000),
            "finalScores": s.get("finalScores", {}),
            "winner": s.get("winner", []),
            "roundCount": len(s.get("rounds", [])),
        }

        for rd in s.get("rounds", []):
            rnum = rd["round"]
            phase = rd["phase"]
            true_scores = rd["trueScores"]
            true_deltas = rd["trueDeltas"]
            actions_list = rd["trueActions"]
            illusions = rd.get("illusions", {})

            # ── true-action rows (one per player per round) ──
            for act in actions_list:
                player = act["player"]
                rows.append({
                    "session_id": sid,
                    "date": date_str,
                    "round": rnum,
                    "phase": phase,
                    "player": player,
                    "view": "true",
                    "action": act["action"],
                    "target": act.get("target"),
                    "score_before": true_scores.get(player, 0) - true_deltas.get(player, 0),
                    "score_after": true_scores.get(player, 0),
                    "delta": true_deltas.get(player, 0),
                    "illusion_score_after": None,
                    "score_gap": None,
                })

            # ── illusion rows (per victim, ostracism only) ──
            for victim, ill in illusions.items():
                ill_score = ill.get("illusionScoreAfter")
                true_after = true_scores.get(victim, 0)
                rows.append({
                    "session_id": sid,
                    "date": date_str,
                    "round": rnum,
                    "phase": phase,
                    "player": victim,
                    "view": "illusion",
                    "action": _find_own_action(ill.get("actions", []), "hide"),
                    "target": _find_own_target(ill.get("actions", [])),
                    "score_before": None,
                    "score_after": ill_score,
                    "delta": None,
                    "illusion_score_after": ill_score,
                    "score_gap": (true_after - ill_score) if ill_score is not None else None,
                })

    return pd.DataFrame(rows), session_meta


def _parse_iso(val):
    if not val:
        return None
    try:
        s = val.replace("Z", "+00:00")
        return datetime.fromisoformat(s)
    except (ValueError, TypeError):
        return None


def _find_own_action(actions, fallback):
    for a in actions:
        if a.get("player") == "You":
            return a.get("action", fallback)
    return fallback


def _find_own_target(actions):
    for a in actions:
        if a.get("player") == "You":
            return a.get("target")
    return None


# ═══════════════════════════════════════════════════════════════════════════════
# 2. ANALYSIS ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

def section1_session_overview(df, meta):
    sessions = list(meta.values())
    durations = [s["duration_seconds"] for s in sessions if s["duration_seconds"] is not None]
    round_counts = [s["roundCount"] for s in sessions]

    per_session = []
    for s in sorted(sessions, key=lambda x: x["startedAt"] or ""):
        per_session.append({
            "sessionId": s["sessionId"],
            "date": s["date"],
            "startedAt": s["startedAt"],
            "endedAt": s["endedAt"],
            "duration_seconds": s["duration_seconds"],
            "roundCount": s["roundCount"],
            "finalScores": s["finalScores"],
            "winner": s["winner"],
        })

    return {
        "description": "Session-level metadata and aggregate overview",
        "total_sessions": len(sessions),
        "sessions_per_day": _count_by(sessions, "date"),
        "duration_stats": {
            "mean_seconds": float(np.mean(durations)) if durations else None,
            "median_seconds": float(np.median(durations)) if durations else None,
            "min_seconds": float(np.min(durations)) if durations else None,
            "max_seconds": float(np.max(durations)) if durations else None,
            "std_seconds": float(np.std(durations)) if durations else None,
        },
        "round_count_stats": {
            "mean": float(np.mean(round_counts)) if round_counts else None,
            "min": int(np.min(round_counts)) if round_counts else None,
            "max": int(np.max(round_counts)) if round_counts else None,
            "incomplete_sessions": [s["sessionId"] for s in sessions if s["roundCount"] < 12],
        },
        "per_session": per_session,
    }


def section2_daily_aggregates(df, meta):
    sessions = list(meta.values())
    dates = sorted(set(s["date"] for s in sessions if s["date"]))
    daily = []

    true_df = df[(df["view"] == "true") & (df["round"] == 12)][["date", "player", "score_after"]]

    for d in dates:
        day_sessions = [s for s in sessions if s["date"] == d]
        sids = {s["sessionId"] for s in day_sessions}
        day_df = df[df["session_id"].isin(sids)]

        true_actions = day_df[(day_df["view"] == "true")]
        hide_count = int((true_actions["action"] == "hide").sum())
        share_count = int((true_actions["action"] == "share").sum())

        winner_counts = defaultdict(int)
        tie_count = 0
        for s in day_sessions:
            w = s["winner"]
            if len(w) > 1:
                tie_count += 1
            for p in w:
                winner_counts[p] += 1

        role_scores = {}
        final_df = true_df[true_df["date"] == d]
        for role in PLAYERS:
            vals = final_df[final_df["player"] == role]["score_after"]
            if len(vals):
                role_scores[role] = {
                    "mean": float(vals.mean()),
                    "median": float(vals.median()),
                    "min": int(vals.min()),
                    "max": int(vals.max()),
                    "std": float(vals.std()),
                }

        daily.append({
            "date": d,
            "session_count": len(day_sessions),
            "total_actions": int(len(true_actions)),
            "share_count": share_count,
            "hide_count": hide_count,
            "hide_rate": round(hide_count / max(1, hide_count + share_count), 4),
            "winner_counts": dict(winner_counts),
            "tie_games": tie_count,
            "avg_final_score_by_role": role_scores,
        })

    return {"description": "Per-day aggregates across all sessions", "days": daily}


def section3_round_by_round(df):
    true_df = df[df["view"] == "true"]
    rounds = sorted(true_df["round"].unique())

    per_round = []
    for r in rounds:
        rdf = true_df[true_df["round"] == r]
        phase = rdf["phase"].iloc[0]

        mutual_pairs = 0
        no_mutual = 0
        has_hide = 0
        for sid, g in rdf.groupby("session_id"):
            actions = {row["player"]: (row["action"], row["target"]) for _, row in g.iterrows()}
            hid = any(a == "hide" for a, _ in actions.values())
            if hid:
                has_hide += 1
            mp = _detect_mutual_pair(actions)
            if mp:
                mutual_pairs += 1
            else:
                no_mutual += 1

        score_stats = {}
        for p in PLAYERS:
            svals = rdf[rdf["player"] == p]
            score_stats[p] = {
                "mean_score_after": round(svals["score_after"].mean(), 2) if len(svals) else None,
                "mean_delta": round(svals["delta"].mean(), 2) if len(svals) else None,
            }

        action_counts = rdf["action"].value_counts().to_dict()

        per_round.append({
            "round": int(r),
            "phase": phase,
            "session_count": int(rdf["session_id"].nunique()),
            "action_counts": {k: int(v) for k, v in action_counts.items()},
            "mutual_pair_count": mutual_pairs,
            "no_mutual_count": no_mutual,
            "hide_present_count": has_hide,
            "score_stats": score_stats,
        })

    return {"description": "Aggregate stats per round (1-12)", "rounds": per_round}


def section4_trust_phase(df):
    trust = df[(df["view"] == "true") & (df["phase"] == "trust")]
    return _phase_analysis(trust, "trust")


def section5_ostracism_phase(df):
    ost = df[(df["view"] == "true") & (df["phase"] == "ostracism")]
    base = _phase_analysis(ost, "ostracism")

    illusion = df[df["view"] == "illusion"]
    ill_stats = {}
    for r in sorted(illusion["round"].unique()):
        rdf = illusion[illusion["round"] == r]
        ill_stats[f"round_{r}"] = {
            "mean_illusion_score": round(rdf["score_after"].mean(), 2) if len(rdf) else None,
            "mean_score_gap": round(rdf["score_gap"].mean(), 2) if len(rdf) else None,
            "max_score_gap": float(rdf["score_gap"].max()) if len(rdf) else None,
        }

    base["illusion_per_round"] = ill_stats
    return base


def section6_lie_metrics(df):
    ill = df[df["view"] == "illusion"]

    per_player = []
    for p in PLAYERS:
        pdf = ill[ill["player"] == p]
        gaps = pdf["score_gap"].dropna()
        per_player.append({
            "player": p,
            "total_illusion_rounds": int(len(pdf)),
            "rounds_with_gap_gt_0": int((gaps > 0).sum()),
            "mean_score_gap": round(float(gaps.mean()), 2) if len(gaps) else None,
            "median_score_gap": round(float(gaps.median()), 2) if len(gaps) else None,
            "max_score_gap": float(gaps.max()) if len(gaps) else None,
            "cumulative_gap": round(float(gaps.sum()), 2) if len(gaps) else None,
        })

    round12 = ill[ill["round"] == 12]
    round12_zeroed = int((round12["score_after"] == 0).sum())
    round12_total = int(len(round12))

    hide_reflection = ill[ill["action"] == "hide"]
    hide_count = int(len(hide_reflection))

    return {
        "description": "Ostracism manipulation — metrics on fabricated views",
        "per_player": per_player,
        "round_12_zeroing": {
            "total_illusions": round12_total,
            "illusions_with_score_zero": round12_zeroed,
            "all_zeroed": round12_zeroed == round12_total,
        },
        "hide_reflection_count": hide_count,
        "note": "Hide actions are truthfully reflected in illusions per OstracismEngine.js:58",
    }


def section7_action_decisions(df):
    true_df = df[df["view"] == "true"]
    share_df = true_df[true_df["action"] == "share"]

    direction_edges = defaultdict(int)
    for _, row in share_df.iterrows():
        if row["target"]:
            direction_edges[(row["player"], row["target"])] += 1
    direction_matrix = {
        f"{src}→{dst}": cnt for (src, dst), cnt in sorted(direction_edges.items())
    }

    reciprocity = {"A-B": 0, "A-C": 0, "B-C": 0}
    for sid, g in share_df.groupby("session_id"):
        for r in sorted(g["round"].unique()):
            ra = g[g["round"] == r]
            acts = {row["player"]: row["target"] for _, row in ra.iterrows() if row["target"]}
            for p1, p2 in [("A", "B"), ("A", "C"), ("B", "C")]:
                if acts.get(p1) == p2 and acts.get(p2) == p1:
                    reciprocity[f"{p1}-{p2}"] += 1

    hide_df = true_df[true_df["action"] == "hide"]
    hide_by_phase = hide_df.groupby("phase").size().to_dict()
    hide_by_player = hide_df.groupby("player").size().to_dict()

    first_movers = defaultdict(int)
    for sid, g in true_df.groupby("session_id"):
        for r in sorted(g["round"].unique()):
            ra = g[g["round"] == r].sort_values("score_before")
            if len(ra):
                first = ra.iloc[0]["player"]
                first_movers[first] += 1

    return {
        "description": "Player action decision patterns",
        "share_direction_counts": direction_matrix,
        "reciprocity_per_pair": reciprocity,
        "hide_by_phase": {k: int(v) for k, v in hide_by_phase.items()},
        "hide_by_player": {k: int(v) for k, v in hide_by_player.items()},
        "first_mover_counts": dict(first_movers),
    }


def section8_player_role_analysis(df, meta):
    true_df = df[df["view"] == "true"]
    ill_df = df[df["view"] == "illusion"]

    per_role = []
    for p in PLAYERS:
        ptrue = true_df[true_df["player"] == p]
        pill = ill_df[ill_df["player"] == p]

        final_scores = []
        for sid, g in ptrue[ptrue["round"] == 12].groupby("session_id"):
            if len(g):
                final_scores.append(g["score_after"].iloc[0])

        win_count = sum(1 for s in meta.values() if p in s.get("winner", []))

        per_role.append({
            "player": p,
            "total_actions": int(len(ptrue)),
            "share_count": int((ptrue["action"] == "share").sum()),
            "hide_count": int((ptrue["action"] == "hide").sum()),
            "avg_final_score": round(float(np.mean(final_scores)), 2) if final_scores else None,
            "median_final_score": round(float(np.median(final_scores)), 2) if final_scores else None,
            "win_count": win_count,
            "win_rate": round(win_count / max(1, len(meta)), 4),
            "total_illusion_rounds": int(len(pill)),
            "avg_score_gap": round(float(pill["score_gap"].mean()), 2) if len(pill) else None,
        })

    return {"description": "Aggregated stats per player role (A/B/C)", "roles": per_role}


def section9_scoring_distribution(df, meta):
    true_df = df[df["view"] == "true"]
    final = true_df[true_df["round"] == 12][["session_id", "player", "score_after"]]

    all_finals = final["score_after"].tolist()
    bins = [0, 3, 5, 7, 9, 11, 20]
    labels = ["0-2", "3-4", "5-6", "7-8", "9-10", "11+"]
    hist = pd.cut(final["score_after"], bins=bins, labels=labels, right=True).value_counts().sort_index()

    per_player_dist = {}
    for p in PLAYERS:
        vals = final[final["player"] == p]["score_after"]
        per_player_dist[p] = {
            "mean": round(float(vals.mean()), 2),
            "median": round(float(vals.median()), 2),
            "std": round(float(vals.std()), 2),
            "min": int(vals.min()) if len(vals) else None,
            "max": int(vals.max()) if len(vals) else None,
        }

    ties = sum(1 for s in meta.values() if len(s.get("winner", [])) > 1)

    return {
        "description": "Final score distributions",
        "histogram": {str(k): int(v) for k, v in hist.items()},
        "per_player": per_player_dist,
        "tie_count": ties,
        "tie_rate": round(ties / max(1, len(meta)), 4),
    }


def section10_mutual_pair_dynamics(df):
    true_df = df[df["view"] == "true"]

    pair_counts = {"A-B": 0, "A-C": 0, "B-C": 0}
    trust_mp = 0
    ost_mp = 0
    trust_rounds = 0
    ost_rounds = 0
    insider_mutual = 0
    insider_total = 0

    for sid, g in true_df.groupby("session_id"):
        for r in sorted(g["round"].unique()):
            ra = g[g["round"] == r]
            phase = ra["phase"].iloc[0]
            acts = {row["player"]: (row["action"], row["target"]) for _, row in ra.iterrows()}
            mp = _detect_mutual_pair(acts)

            if phase == "trust":
                trust_rounds += 1
                if mp:
                    trust_mp += 1
                if mp:
                    pair_counts[mp] += 1
            else:
                ost_rounds += 1
                if mp:
                    ost_mp += 1
                    pair_counts[mp] += 1

    return {
        "description": "Mutual pair formation dynamics",
        "pair_frequencies": pair_counts,
        "trust_phase": {
            "total_rounds": trust_rounds,
            "mutual_pair_rounds": trust_mp,
            "mutual_rate": round(trust_mp / max(1, trust_rounds), 4),
        },
        "ostracism_phase": {
            "total_rounds": ost_rounds,
            "mutual_pair_rounds": ost_mp,
            "mutual_rate": round(ost_mp / max(1, ost_rounds), 4),
        },
    }


def section11_session_engagement(df, meta):
    sessions = list(meta.values())
    durations = [s["duration_seconds"] for s in sessions if s["duration_seconds"] is not None]

    dur_bins = [0, 120, 150, 180, 210, 240, 300, 999]
    dur_labels = ["<2m", "2-2.5m", "2.5-3m", "3-3.5m", "3.5-4m", "4-5m", "5m+"]
    dur_hist = pd.cut(pd.Series(durations), bins=dur_bins, labels=dur_labels, right=True).value_counts().sort_index()

    day_order = defaultdict(list)
    for s in sorted(sessions, key=lambda x: x["startedAt"] or ""):
        day_order[s["date"]].append(s["startedAt"])

    gaps = []
    for d, starts in day_order.items():
        sorted_starts = sorted(starts)
        for i in range(1, len(sorted_starts)):
            t1 = _parse_iso(sorted_starts[i - 1])
            t2 = _parse_iso(sorted_starts[i])
            if t1 and t2:
                gaps.append((t2 - t1).total_seconds() / 60)

    return {
        "description": "Session duration and engagement patterns",
        "duration_histogram": {str(k): int(v) for k, v in dur_hist.items()},
        "duration_seconds_stats": {
            "mean": round(float(np.mean(durations)), 1) if durations else None,
            "median": round(float(np.median(durations)), 1) if durations else None,
        },
        "inter_session_gap_minutes": {
            "mean": round(float(np.mean(gaps)), 1) if gaps else None,
            "median": round(float(np.median(gaps)), 1) if gaps else None,
            "min": round(float(np.min(gaps)), 1) if gaps else None,
            "max": round(float(np.max(gaps)), 1) if gaps else None,
        },
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 3. VISUALIZATION
# ═══════════════════════════════════════════════════════════════════════════════

def generate_charts(df, meta):
    charts = {}
    sns.set_theme(style="whitegrid", palette="muted")
    with plt.rc_context(PLOT_CONTEXT):
        charts["daily_sessions"] = _chart_daily_sessions(meta)
        charts["round_scores"] = _chart_round_scores(df)
        charts["final_score_distribution"] = _chart_final_scores(df)
        charts["score_gap_per_round"] = _chart_score_gap(df)
        charts["action_heatmap"] = _chart_action_heatmap(df)
        charts["mutual_pair_pie"] = _chart_mutual_pie(df)
        charts["duration_histogram"] = _chart_duration_histogram(meta)
    return charts


def _chart_daily_sessions(meta):
    sessions = list(meta.values())
    daily = _count_by(sessions, "date")
    fig, ax = plt.subplots(figsize=(8, 4))
    dates = sorted(daily.keys())
    ax.bar(dates, [daily[d] for d in dates], color="#5b9bd5")
    ax.set_title("Sessions per Day")
    ax.set_ylabel("Session count")
    fig.autofmt_xdate()
    path = CHARTS_DIR / "daily_sessions.png"
    fig.savefig(path)
    plt.close(fig)
    return str(path)


def _chart_round_scores(df):
    true_df = df[df["view"] == "true"]
    piv = true_df.groupby(["round", "player"])["score_after"].mean().unstack()
    fig, ax = plt.subplots(figsize=(10, 5))
    for p in PLAYERS:
        ax.plot(piv.index, piv[p], marker="o", label=f"Player {p}")
    ax.axvline(x=6.5, color="gray", linestyle="--", alpha=0.5, label="Phase boundary")
    ax.set_title("Mean Score Progression per Player")
    ax.set_xlabel("Round")
    ax.set_ylabel("Mean score")
    ax.legend()
    path = CHARTS_DIR / "round_scores.png"
    fig.savefig(path)
    plt.close(fig)
    return str(path)


def _chart_final_scores(df):
    true_df = df[df["view"] == "true"]
    final = true_df[true_df["round"] == 12]
    fig, ax = plt.subplots(figsize=(8, 4))
    for i, p in enumerate(PLAYERS):
        vals = final[final["player"] == p]["score_after"]
        ax.hist(vals, bins=range(0, 15), alpha=0.6, label=f"Player {p}")
    ax.set_title("Final Score Distribution")
    ax.set_xlabel("Score")
    ax.set_ylabel("Frequency")
    ax.legend()
    path = CHARTS_DIR / "final_score_distribution.png"
    fig.savefig(path)
    plt.close(fig)
    return str(path)


def _chart_score_gap(df):
    ill = df[df["view"] == "illusion"]
    gp = ill.groupby("round")["score_gap"].mean()
    fig, ax = plt.subplots(figsize=(8, 4))
    ax.bar(gp.index, gp.values, color="#e07b5a")
    ax.set_title("Mean Score Gap (True − Illusion) per Round")
    ax.set_xlabel("Round")
    ax.set_ylabel("Mean gap")
    path = CHARTS_DIR / "score_gap_per_round.png"
    fig.savefig(path)
    plt.close(fig)
    return str(path)


def _chart_action_heatmap(df):
    true_df = df[df["view"] == "true"]
    share_df = true_df[true_df["action"] == "share"]
    matrix = defaultdict(lambda: defaultdict(int))
    for _, row in share_df.iterrows():
        if row["target"]:
            matrix[row["player"]][row["target"]] += 1
    arr = np.zeros((3, 3))
    for i, src in enumerate(PLAYERS):
        for j, dst in enumerate(PLAYERS):
            arr[i][j] = matrix[src].get(dst, 0)
    fig, ax = plt.subplots(figsize=(6, 5))
    sns.heatmap(arr, annot=True, fmt=".0f", xticklabels=PLAYERS, yticklabels=PLAYERS,
                cmap="YlOrRd", ax=ax)
    ax.set_title("Share Direction Counts (From → To)")
    ax.set_xlabel("Target")
    ax.set_ylabel("Source")
    path = CHARTS_DIR / "action_heatmap.png"
    fig.savefig(path)
    plt.close(fig)
    return str(path)


def _chart_mutual_pie(df):
    true_df = df[df["view"] == "true"]
    trust = true_df[true_df["phase"] == "trust"]
    ost = true_df[true_df["phase"] == "ostracism"]

    def count_mutuals(sub_df):
        mp = 0
        total = 0
        for sid, g in sub_df.groupby("session_id"):
            for r in sorted(g["round"].unique()):
                ra = g[g["round"] == r]
                acts = {row["player"]: (row["action"], row["target"]) for _, row in ra.iterrows()}
                total += 1
                if _detect_mutual_pair(acts):
                    mp += 1
        return mp, total

    t_mp, t_total = count_mutuals(trust)
    o_mp, o_total = count_mutuals(ost)

    fig, axes = plt.subplots(1, 2, figsize=(10, 4))
    for ax, (mp, tot), title in zip(
        axes,
        [(t_mp, t_total), (o_mp, o_total)],
        ["Trust Phase", "Ostracism Phase"],
    ):
        nm = tot - mp
        ax.pie([mp, nm], labels=["Mutual Pair", "No Mutual"], autopct="%1.1f%%",
               colors=["#5b9bd5", "#d5d5d5"], startangle=90)
        ax.set_title(title)
    path = CHARTS_DIR / "mutual_pair_pie.png"
    fig.savefig(path)
    plt.close(fig)
    return str(path)


def _chart_duration_histogram(meta):
    sessions = list(meta.values())
    durations = [s["duration_seconds"] for s in sessions if s["duration_seconds"] is not None]
    fig, ax = plt.subplots(figsize=(8, 4))
    ax.hist(durations, bins=15, color="#5b9bd5", edgecolor="white")
    ax.set_title("Session Duration Distribution")
    ax.set_xlabel("Duration (seconds)")
    ax.set_ylabel("Frequency")
    path = CHARTS_DIR / "duration_histogram.png"
    fig.savefig(path)
    plt.close(fig)
    return str(path)


# ═══════════════════════════════════════════════════════════════════════════════
# 4. HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _count_by(items, key):
    c = defaultdict(int)
    for it in items:
        c[it.get(key, "unknown")] += 1
    return dict(c)


def _detect_mutual_pair(actions):
    """
    `actions`: dict of player -> (action, target)
    Returns the pair label ("A-B", "B-C", "C-A") or None.
    """
    share_target = {}
    for p, (act, tgt) in actions.items():
        if act == "share" and tgt:
            share_target[p] = tgt
    for p1, t1 in share_target.items():
        if share_target.get(t1) == p1:
            pair = sorted([p1, t1])
            return f"{pair[0]}-{pair[1]}"
    return None


def _phase_analysis(phase_df, phase_name):
    rounds_data = []
    for r in sorted(phase_df["round"].unique()):
        rdf = phase_df[phase_df["round"] == r]
        mutual = 0
        no_mutual = 0
        has_hide = 0
        for sid, g in rdf.groupby("session_id"):
            acts = {row["player"]: (row["action"], row["target"]) for _, row in g.iterrows()}
            if any(a == "hide" for a, _ in acts.values()):
                has_hide += 1
            if _detect_mutual_pair(acts):
                mutual += 1
            else:
                no_mutual += 1

        action_counts = rdf["action"].value_counts().to_dict()
        rounds_data.append({
            "round": int(r),
            "session_count": int(rdf["session_id"].nunique()),
            "action_counts": {k: int(v) for k, v in action_counts.items()},
            "mutual_pair_count": mutual,
            "no_mutual_count": no_mutual,
            "hide_present_count": has_hide,
        })

    direction_edges = defaultdict(int)
    share_df = phase_df[phase_df["action"] == "share"]
    for _, row in share_df.iterrows():
        if row["target"]:
            direction_edges[(row["player"], row["target"])] += 1

    return {
        "description": f"True action analysis for {phase_name} phase",
        "rounds": rounds_data,
        "share_direction_counts": {
            f"{src}→{dst}": cnt for (src, dst), cnt in sorted(direction_edges.items())
        },
    }


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print("Loading sessions ...")
    df, meta = load_sessions()
    print(f"  Loaded {len(meta)} sessions, {len(df)} rows")

    print("Running analyses ...")
    output = {
        "meta": {
            "total_sessions": len(meta),
            "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
            "source_directory": str(SESSIONS_DIR),
        },
        "section1_session_overview": section1_session_overview(df, meta),
        "section2_daily_aggregates": section2_daily_aggregates(df, meta),
        "section3_round_by_round": section3_round_by_round(df),
        "section4_trust_phase": section4_trust_phase(df),
        "section5_ostracism_phase": section5_ostracism_phase(df),
        "section6_lie_metrics": section6_lie_metrics(df),
        "section7_action_decisions": section7_action_decisions(df),
        "section8_player_role_analysis": section8_player_role_analysis(df, meta),
        "section9_scoring_distribution": section9_scoring_distribution(df, meta),
        "section10_mutual_pair_dynamics": section10_mutual_pair_dynamics(df),
        "section11_session_engagement": section11_session_engagement(df, meta),
    }

    print("Generating charts ...")
    charts = generate_charts(df, meta)
    output["charts"] = charts

    print(f"Writing {OUTPUT_JSON} ...")
    with open(OUTPUT_JSON, "w", encoding="utf-8") as fh:
        json.dump(output, fh, indent=2, ensure_ascii=False, default=str)

    print(f"Done. Output: {OUTPUT_JSON}")
    print(f"Charts: {len(charts)} PNGs in {CHARTS_DIR}")


if __name__ == "__main__":
    main()
