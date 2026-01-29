<p align="center">
  <a href="https://isshin.app/">
    <img alt="Isshin is an open source focus toolset for better work and fewer distractions." src="./.github/assets/logo.svg" width="200" height="200">
  </a>
</p>

<h3 align="center">Isshin <i>by <a href="https://builder.group/">builder.group</a></i></h3>

<p align="center">
  Focus toolset for better work and fewer distractions.
  <br />
  <a href="https://isshin.app/"><strong>Learn more »</strong></a>
  <br />
  <br />
  <a href="#introduction"><strong>Introduction</strong></a> ·
  <a href="#roadmap"><strong>Roadmap</strong></a> ·
  <a href="#tech-stack"><strong>Tech Stack</strong></a> ·
  <a href="#contributing"><strong>Contributing</strong></a>
</p>

<p align="center">
  <a href="https://github.com/builder-group/isshin/blob/develop/LICENSE">
    <img src="https://img.shields.io/badge/License-AGPL_v3-blue.svg" alt="GitHub License" />
  </a>
  <a href="https://saku-v1.vercel.app/discord">
    <img src="https://img.shields.io/discord/795291052897992724.svg?label=&logo=discord&logoColor=ffffff&color=293140&labelColor=3377FF" alt="Join Discord" />
  </a>
</p>

<br />

> 🚧 Under construction. Coming soon 👀

## Introduction

**Isshin** (一心: One Mind) — a state of singular focus and wholehearted dedication, where all energy is directed towards one goal, achieving an unparalleled level of concentration.

Isshin is a native macOS utility that connects your daily schedule with your digital environment. You plan your day once, and your computer automatically adjusts itself around that plan. No toggling, no willpower needed — just focus.

## Roadmap

Isshin is developed with a **validation-first approach**. Instead of building the full system upfront, the project begins with a **standalone Minimal Viable Product** to validate user interest in focus enforcement and system-level blocking.

### Minimal Viable Product — _FocusCat_ (January)

> FocusCat — friendly focus sessions with a cozy companion

FocusCat is a free, standalone macOS app built under the Isshin umbrella.
It runs fully locally and works independently of the full Isshin system.

**Validates:** Do users want **enforced focus sessions** with Pomodoro timers, app blocking, and mandatory breaks?

**Scope:**

- **Pomodoro Timer** — Focus and break cycles with configurable durations
- **App & Site Blocking** — Distractions blocked during focus sessions only
- **Break Enforcement** — Breaks cannot be skipped once started
- **Cat Companion** — Bongo Cat-inspired mascot that reacts to your focus
- **Minimal Landing Page** — Simple download and explanation

FocusCat is intentionally limited — no planning, Zones, Tasks, or analytics.

### Minimal Viable Product — _Abstand_ (February)

> Abstand — intentional distance from the digital

Abstand is a free, standalone macOS app built under the Isshin umbrella.
It runs fully locally and works independently of the full Isshin system.

**Validates:** Do users value **self-imposed commitment** over external enforcement — and does visible accountability lead to deeper focus?

**Concept:**

You start a detox mission for a set number of days. You're not locked out of anything — but every deviation is tracked. Open YouTube during a detox? A popup appears: _"This is not part of your Detox. Watching will degrade your rank."_ You can continue, but the cost is visible and immediate.

Two outcomes exist:

- **Complete** — Finish the mission with a rank (Platinum → Bronze) based on adherence
- **Cancel** — End the mission early and it's gone forever, no record

No locks. No tricks. Just honesty with yourself.

**Scope:**

- **Detox Missions** — Fixed-duration commitments (e.g. 3, 7, 14 days)
- **Deviation Warnings** — Popup when opening blocked apps/sites, showing rank cost
- **Rank Degradation** — Platinum, Gold, Silver, Bronze based on time spent deviating
- **One-Way Cancellation** — Ending a mission permanently removes it
- **Minimal UI** — One active mission, no history, no recovery mechanics

Abstand is intentionally limited — no streaks, no reminders, no external enforcement.

### Beyond the POC — Isshin Vision

If validated, Isshin will expand into a **planning-first focus system** where your daily intent shapes your digital environment automatically.

Potential future directions include:

- **Daily Planning** — Schedule tasks and time blocks ahead of time
- **Zones & Modes** — Baseline and task-specific focus rules
- **Context-Aware Blocking** — Rules adapt dynamically to the active task
- **Local Time Tracking** — Private, on-device usage insights
- **Commitment Enforcement** — Optional hard locks and consequences

Isshin is designed as a **native, private, one-time purchase** tool.  
All data stays on-device. No subscriptions. No cloud dependency.
