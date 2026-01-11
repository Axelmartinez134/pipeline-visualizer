from __future__ import annotations
from manim import (
    Scene, VGroup, ValueTracker, Rectangle, RoundedRectangle,
    Text, Integer, Mobject, VMobject, ManimColor,
    LaggedStart, FadeIn, FadeOut, AnimationGroup, smooth, Succession,
    config, BLACK, WHITE,
    GREY_A, GREY_B, GREY_D, RED, GREEN, GREEN_C, GREEN_E,
    UP, DOWN, LEFT, RIGHT,
    Polygon, interpolate_color,
)
from manim import rate_functions as rf
import numpy as np


# ------------------------------------------------------------
# Pipeline Visualization in Manim (Mostly 2D, subtle depth)
# - Mirrors app logic for three optimization steps
# - Shows live capacities over each stage (integers)
# - Highlights bottleneck in red, then grows and turns green
# - Ends with "2-month Growth Plan Complete" overlay
# ------------------------------------------------------------


# ============================================================
# BEGIN USER TUNABLES (edit these values only)
#
# How to use:
# - Change the numbers below and re-render.
# - Suggested ranges are provided in comments. If something looks odd,
#   revert to the defaults indicated here.
# - Numbers above stages are locked to integers; no need to edit that.
#
# Visual size
STAGE_WIDTH = 2.0            # Width of each rectangle (1.2 – 3.0)
H_SPACING = 0.6              # Horizontal gap between stages (0.3 – 1.2)
MIN_THICKNESS = 0.40         # Global minimum height of a stage (0.2 – 0.8)
MAX_THICKNESS = 1.60         # Global maximum height of a stage (1.0 – 2.0)

# Capacities (starting values) [leadGen, qualification, onboarding, delivery, retention]
DEFAULT_CAPS = [60, 50, 40, 30, 30]

# Pulse and sustained widen
OVERSHOOT_FACTOR = 1.8       # Pulse peak relative to final thickness (1.4 – 2.0)
FINAL_THICKNESS_BOOST = 1.40 # Settled state multiplier (>1.0 is wider than normal)

# Colors (use Manim colors)
COLOR_NEUTRAL = GREY_B       # Default pipe color
COLOR_BOTTLENECK = RED       # Bottleneck highlight color
COLOR_IMPROVED = GREEN       # Improved stage color
COLOR_CONNECTOR = GREY_D     # Trapezoid connectors

# Optional PRESETS (uncomment ONE of the locals().update(...) lines to apply)
# SUBTLE = dict(OVERSHOOT_FACTOR=1.4, FINAL_THICKNESS_BOOST=1.10, MAX_THICKNESS=1.30)
# BOLD   = dict(OVERSHOOT_FACTOR=1.8, FINAL_THICKNESS_BOOST=1.40, MAX_THICKNESS=1.60)
# Apply a preset (uncomment one):
# locals().update(SUBTLE)
# locals().update(BOLD)
# ============================================================


# Global render configuration (overridable by CLI flags)
config.background_color = BLACK


class PipelineAfterAutomation(Scene):
    """Renders a five-stage pipeline and animates three optimization steps.

    Visual model
    - Each stage is a Rectangle (constant width, variable thickness)
    - Thickness encodes capacity (linear map using app bounds 10..110)
    - Connectors are trapezoids that exactly bridge adjacent rectangles
      and morph in sync to read as one continuous pipe
    """

    # App defaults (internal, not the displayed numbers noted in comments)
    STAGE_KEYS = [
        "leadGen",
        "qualification",
        "onboarding",
        "delivery",
        "retention",
    ]
    STAGE_LABELS = ["Marketing", "Sales", "Onboarding", "Fulfillment", "Retention"]
    DEFAULT_CAPS = [60, 50, 40, 30, 30]

    # App pipeline bounds (mirrors src/3d/constants/businessData.js)
    MIN_CAP = 10
    MAX_CAP = 110

    # Visual constants (copied from USER TUNABLES)
    STAGE_WIDTH = STAGE_WIDTH
    MIN_THICKNESS = MIN_THICKNESS
    MAX_THICKNESS = MAX_THICKNESS
    H_SPACING = H_SPACING
    LABEL_FONT_SIZE = 28
    NUM_FONT_SIZE = 30
    # Pulse/settle parameters (copied from USER TUNABLES)
    OVERSHOOT_FACTOR = OVERSHOOT_FACTOR
    FINAL_THICKNESS_BOOST = FINAL_THICKNESS_BOOST

    COLOR_NEUTRAL = COLOR_NEUTRAL
    COLOR_BOTTLENECK = COLOR_BOTTLENECK
    COLOR_IMPROVED = COLOR_IMPROVED
    COLOR_CONNECTOR = COLOR_CONNECTOR

    def construct(self) -> None:
        # Layout base group
        pipeline_group = VGroup()

        # ValueTrackers for mutable capacities
        self.trackers = [ValueTracker(v) for v in DEFAULT_CAPS]

        # Stage rectangles (thickness from capacity)
        self.stage_rects: list[Rectangle] = []
        self.stage_labels: list[Mobject] = []
        self.number_labels: list[Integer] = []

        # Build stages, labels, and numbers
        x = -((self.STAGE_WIDTH * 5) + (self.H_SPACING * 4)) / 2 + self.STAGE_WIDTH / 2
        for i, (stage_name, label_text, tracker) in enumerate(
            zip(self.STAGE_KEYS, self.STAGE_LABELS, self.trackers)
        ):
            rect = self._make_stage_rect(self._thickness_from_capacity(tracker.get_value()))
            rect.set_fill(self.COLOR_NEUTRAL, opacity=0.9)
            rect.set_stroke(WHITE, width=1.2, opacity=0.2)
            rect.move_to(np.array([x, 0, 0]))

            # Under-pipe label
            label = Text(label_text, font_size=self.LABEL_FONT_SIZE)
            label.set_color(GREY_A)
            label.next_to(rect, DOWN, buff=0.25)

            # Number above pipe with updater (integer only)
            num = Integer(int(round(tracker.get_value())), font_size=self.NUM_FONT_SIZE)

            def make_num_updater(idx: int):
                def _upd(m: Integer):
                    m.set_value(int(round(self.trackers[idx].get_value())))
                    m.next_to(self.stage_rects[idx], UP, buff=0.18)
                    return m

                return _upd

            self.add(rect, label, num)
            num.add_updater(make_num_updater(i))

            self.stage_rects.append(rect)
            self.stage_labels.append(label)
            self.number_labels.append(num)

            pipeline_group.add(rect, label, num)
            x += self.STAGE_WIDTH + self.H_SPACING

        # Trapezoid connectors (continuous pipe look)
        self.connectors = self._build_connectors()
        self.add(self.connectors)

        # Intro fade-in
        self.play(
            LaggedStart(
                *[FadeIn(r, shift=DOWN * 0.25, scale=0.98) for r in self.stage_rects],
                lag_ratio=0.07,
                run_time=0.8,
            )
        )

        # Perform three optimization steps (mirror app logic)
        # First step follows the special baseline/third-distinct rule
        self._run_step(step_index=1, is_first=True)
        self._run_step(step_index=2)
        self._run_step(step_index=3)

        # End card
        end_card = Text("2-month Growth Plan Complete", font_size=44)
        end_card.set_color(GREEN_C)
        end_card.to_edge(UP)
        self.play(FadeIn(end_card, shift=UP * 0.25), run_time=1.0)
        self.wait(1.0)

        # Keep final frame briefly
        self.wait(0.2)

    # ----------------------------- Helpers -----------------------------
    def _thickness_from_capacity(self, capacity: float) -> float:
        # Linear map from [MIN_CAP, MAX_CAP] => [MIN_THICKNESS, MAX_THICKNESS]
        c = np.clip(capacity, self.MIN_CAP, self.MAX_CAP)
        t = (c - self.MIN_CAP) / (self.MAX_CAP - self.MIN_CAP)
        return self.MIN_THICKNESS + t * (self.MAX_THICKNESS - self.MIN_THICKNESS)

    def _make_stage_rect(self, thickness: float) -> Rectangle:
        return Rectangle(width=self.STAGE_WIDTH, height=thickness)

    def _bottleneck_index(self, caps: list[float]) -> int:
        # Tie-break by stage order (first minimum)
        min_val = min(caps)
        for i, v in enumerate(caps):
            if v == min_val:
                return i
        return 0

    def _third_distinct_baseline(self, caps: list[int]) -> int:
        distinct_sorted = sorted(set(caps))
        if len(distinct_sorted) >= 3:
            return distinct_sorted[2]
        return distinct_sorted[-1]

    def _update_stage_visual(self, idx: int, new_capacity: float, run_time: float = 0.8):
        # Animate thickness change + number via tracker
        new_thickness = self._thickness_from_capacity(new_capacity)
        rect = self.stage_rects[idx]
        tracker = self.trackers[idx]
        return AnimationGroup(
            tracker.animate.set_value(new_capacity),
            rect.animate.stretch_to_fit_height(new_thickness),
            lag_ratio=0.0,
            run_time=run_time,
            rate_func=smooth,
        )

    def _apply_pipe_fill(self, mobj: VMobject, base: ManimColor) -> None:
        # Subtle metallic-style gradient derived from base color
        top = interpolate_color(WHITE, base, 0.75)
        bottom = interpolate_color(BLACK, base, 0.75)
        try:
            mobj.set_fill_by_gradient(top, bottom)
        except Exception:
            mobj.set_fill(base, opacity=0.95)
        mobj.set_stroke(WHITE, width=1.2, opacity=0.25)

    def _colorize_stage_and_connectors(self, idx: int, base: ManimColor, animate: bool = True, run_time: float = 0.3):
        anims = []
        stage = self.stage_rects[idx]
        if animate:
            anims.append(stage.animate.set_fill(base, opacity=0.95).set_stroke(WHITE, width=1.2, opacity=0.25))
        else:
            stage.set_fill(base, opacity=0.95).set_stroke(WHITE, width=1.2, opacity=0.25)
        # Adjacent connectors adopt the same color
        left_conn = self.connectors[idx - 1] if idx - 1 >= 0 else None
        right_conn = self.connectors[idx] if idx < len(self.connectors) else None
        for conn in [left_conn, right_conn]:
            if conn is None:
                continue
            if animate:
                anims.append(conn.animate.set_fill(base, opacity=0.9).set_stroke(WHITE, width=1.0, opacity=0.2))
            else:
                conn.set_fill(base, opacity=0.9).set_stroke(WHITE, width=1.0, opacity=0.2)
        if anims:
            self.play(*anims, run_time=run_time)
        # Re-apply gradient look immediately (non-animated) for subtle depth
        self._apply_pipe_fill(stage, base)
        for conn in [left_conn, right_conn]:
            if conn is not None:
                self._apply_pipe_fill(conn, base)

    def _neutralize_all(self):
        for r in self.stage_rects:
            r.set_fill(self.COLOR_NEUTRAL, opacity=0.95).set_stroke(WHITE, width=1.2, opacity=0.25)
            self._apply_pipe_fill(r, self.COLOR_NEUTRAL)
        for c in self.connectors:
            c.set_fill(self.COLOR_CONNECTOR, opacity=0.9).set_stroke(WHITE, width=1.0, opacity=0.2)
            self._apply_pipe_fill(c, self.COLOR_CONNECTOR)

    def _build_connectors(self) -> VGroup:
        connectors = VGroup()

        for i in range(len(self.stage_rects) - 1):
            left_rect = self.stage_rects[i]
            right_rect = self.stage_rects[i + 1]

            # Initial placeholder polygon; will be updated by updater
            conn = Polygon(LEFT, RIGHT, RIGHT, LEFT)
            conn.set_fill(self.COLOR_CONNECTOR, opacity=0.9)
            conn.set_stroke(WHITE, width=1.0, opacity=0.2)

            def make_updater(lr: Rectangle, rr: Rectangle):
                def _upd(m: Polygon):
                    # Compute trapezoid corners from current rectangle heights/positions
                    l_right = lr.get_right()
                    r_left = rr.get_left()

                    l_hh = lr.get_height() / 2
                    r_hh = rr.get_height() / 2

                    top_left = l_right + UP * l_hh
                    bottom_left = l_right + DOWN * l_hh
                    top_right = r_left + UP * r_hh
                    bottom_right = r_left + DOWN * r_hh

                    new_poly = Polygon(top_left, top_right, bottom_right, bottom_left)
                    new_poly.match_style(m)
                    m.become(new_poly)
                    return m

                return _upd

            conn.add_updater(make_updater(left_rect, right_rect))
            self._apply_pipe_fill(conn, self.COLOR_CONNECTOR)
            connectors.add(conn)

        return connectors

    def _run_step(self, step_index: int, is_first: bool = False):
        # Determine current caps and bottleneck
        caps = [int(round(t.get_value())) for t in self.trackers]
        bottleneck = self._bottleneck_index(caps)

        # Reset all to neutral gradient
        self._neutralize_all()

        # Pre-highlight bottleneck
        self._colorize_stage_and_connectors(bottleneck, self.COLOR_BOTTLENECK, animate=True, run_time=0.35)

        # Compute targets per app logic
        if is_first:
            # First step: jump to at least (third distinct baseline + 1)
            baseline_caps = self.DEFAULT_CAPS[:]  # baseline snapshot (immutable)
            baseline_third = self._third_distinct_baseline(baseline_caps)
            current_val = caps[bottleneck]
            first_target = min(self.MAX_CAP, max(current_val + 1, baseline_third + 1))
            self.optimized_delta = max(1, first_target - current_val)
            target_val = first_target
        else:
            # Subsequent steps: add the same delta
            current_val = caps[bottleneck]
            step_delta = getattr(self, "optimized_delta", 1)
            target_val = min(self.MAX_CAP, current_val + step_delta)

        # Pulse overshoot then settle to slightly larger final
        # Compute final and overshoot thicknesses
        final_thickness = self._thickness_from_capacity(target_val) * self.FINAL_THICKNESS_BOOST
        overshoot_thickness = final_thickness * self.OVERSHOOT_FACTOR

        # Clamp sanity (avoid absurdly tall shapes if OVERSHOOT pushes too far)
        max_visual = self.MAX_THICKNESS * 2.0
        final_thickness = min(final_thickness, max_visual)
        overshoot_thickness = min(overshoot_thickness, max_visual)

        rect = self.stage_rects[bottleneck]
        tracker = self.trackers[bottleneck]

        # Phase 1: pulse to overshoot while numbers advance ~60%
        mid_val = current_val + (target_val - current_val) * 0.6
        self.play(
            rect.animate.stretch_to_fit_height(overshoot_thickness),
            tracker.animate.set_value(mid_val),
            run_time=0.45,
            rate_func=rf.ease_out_cubic,
        )

        # Phase 2: settle to boosted final while numbers reach target
        self.play(
            rect.animate.stretch_to_fit_height(final_thickness),
            tracker.animate.set_value(target_val),
            run_time=0.45,
            rate_func=rf.ease_out_sine,
        )

        # Turn improved stage green
        self._colorize_stage_and_connectors(bottleneck, self.COLOR_IMPROVED, animate=True, run_time=0.35)

        # A short settle pause before the next step
        self.wait(0.2)


# -------------- Optional convenience scene name alias --------------
class Pipeline(Scene):
    """Alias scene that forwards to PipelineAfterAutomation for CLI ergonomics."""

    def construct(self):
        self.add(Text("Use PipelineAfterAutomation scene.", font_size=28).to_edge(DOWN))
        self.next_section("forward")
        scene = PipelineAfterAutomation()
        # Manim requires scenes to be constructed by the engine; we show a hint only.
        # This alias exists so that `manim -pqh Constraints_Pipeline.py Pipeline` shows a hint.
        self.play(FadeIn(Text("Run: manim -pqh Constraints_Pipeline.py PipelineAfterAutomation", font_size=26)))
        self.wait(0.5)


