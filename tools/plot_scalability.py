#!/usr/bin/env python3
"""Draw the website resource cards from the published experimental measurements.

Run with Python and matplotlib; the website itself needs neither.
"""
import argparse
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

SITE = Path(__file__).resolve().parents[1]
INK, MUTED, GOLD, LINE, TINT = "#29271e", "#605d51", "#9a6700", "#e8e3d3", "#fbf9f1"
PANELS = (
    ("a", "Peak GPU memory", "peak_memory_allocated_gb", 1, "GB", ".2f", 26, [0, 8, 16, 24]),
    ("b", "Construction time", "build_time_s", 60, "min", ".1f", 27, [0, 10, 20]),
    ("c", "Gaussians", "filtered_hybrid", 1e6, "M", ".1f", 230, [0, 100, 200]),
)


def draw(rows, output, stacked=False):
    cols, count = (1, 3) if stacked else (3, 1)
    fig = plt.figure(figsize=(3.8 * cols, 3.85 * count), facecolor="white")
    width, height = 1 / cols, 1 / count
    for index, (letter, title, key, divisor, unit, fmt, ymax, ticks) in enumerate(PANELS):
        left = (index % cols) * width
        bottom = 1 - (index // cols + 1) * height

        def pos(x, y):
            return left + x * width, bottom + y * height

        fig.add_artist(FancyBboxPatch(
            pos(.02, .02), .96 * width, .96 * height,
            boxstyle="round,pad=0,rounding_size=0.015", transform=fig.transFigure,
            facecolor=TINT, edgecolor=LINE, linewidth=.8, zorder=0,
        ))
        fig.text(*pos(.075, .89), f"({letter})  {title}", color=INK, fontsize=13.5, weight="semibold")
        values = [row[key] / divisor for row in rows]
        fig.text(*pos(.075, .735), f"{values[-1]:{fmt}} {unit}", color=GOLD, fontsize=28, weight="semibold")
        fig.text(*pos(.075, .665), f"at {rows[-1]['input_frames']:,} input frames", color=MUTED, fontsize=10)
        ax = fig.add_axes([*pos(.16, .20), .75 * width, .38 * height], facecolor="none", zorder=1)
        frames = [row["input_frames"] for row in rows]
        ax.fill_between(frames, 0, values, color="#f4c430", alpha=.16, linewidth=0)
        ax.plot(frames, values, color=GOLD, linewidth=2.2, marker="o", markersize=5,
                markeredgecolor=TINT, markeredgewidth=1.2, zorder=3)
        ax.plot(frames[-1], values[-1], marker="o", markersize=7.5, color=GOLD,
                markeredgecolor=TINT, markeredgewidth=1.4, zorder=4)
        ax.set(xlim=(0, 4050), ylim=(0, ymax), xticks=[0, 1000, 2000, 3000],
               xticklabels=["0", "1k", "2k", "3k"], yticks=ticks)
        ax.set_axisbelow(True)
        ax.grid(axis="y", color=LINE, linewidth=.8)
        for spine in ("top", "left", "right"):
            ax.spines[spine].set_visible(False)
        ax.spines["bottom"].set_color(LINE)
        ax.tick_params(axis="both", which="both", length=0, pad=7, labelsize=10, colors=MUTED)
        if key == "peak_memory_allocated_gb":
            ax.axhline(24, color=MUTED, linewidth=1, dashes=(4, 3))
            ax.text(.99, 24.45, "24 GB budget", transform=ax.get_yaxis_transform(),
                    ha="right", va="bottom", fontsize=9, color=MUTED)
        fig.text(*pos(.54, .07), "Input frames", color=MUTED, fontsize=10, ha="center")
    fig.savefig(output.with_suffix(".svg"), metadata={"Date": None}, facecolor="white")
    fig.savefig(output.with_suffix(".png"), dpi=180, facecolor="white")
    plt.close(fig)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--data", type=Path, default=SITE / "media/scalability-resources.json")
    p.add_argument("--output-dir", type=Path, default=SITE / "media/images")
    args = p.parse_args()
    rows = json.loads(args.data.read_text())["rows"]
    assert len(rows) == 6
    assert all(a["input_frames"] < b["input_frames"] for a, b in zip(rows, rows[1:]))
    for row in rows:
        assert all(row[key] > 0 for key in ("peak_memory_allocated_gb", "build_time_s", "filtered_hybrid"))
    plt.rcParams.update({"font.family": "DejaVu Sans", "svg.fonttype": "none", "svg.hashsalt": "longaussian-resource-cards", "axes.unicode_minus": False})
    args.output_dir.mkdir(parents=True, exist_ok=True)
    draw(rows, args.output_dir / "scalability-resources")
    draw(rows, args.output_dir / "scalability-resources-stacked", stacked=True)


if __name__ == "__main__":
    main()
