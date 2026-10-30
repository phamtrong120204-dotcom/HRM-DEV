---
description: Plan, build and review an animated admin dashboard page with the animated-admin-dashboard kit
argument-hint: <what the page should show, e.g. "tổng quan bán hàng cho MTK">
---
Create an admin dashboard page for: $ARGUMENTS

Steps:
1. Use the `dashboard-architect` agent to produce the plan (metrics, wireframe, data contracts). Show me the plan and the 3 or fewer open questions; continue with sensible assumptions if I don't answer.
2. Use the `dashboard-builder` agent to implement it with the `animated-admin-dashboard` skill.
3. Use the `dashboard-reviewer` agent on the result and fix every FAIL.
4. Report in Vietnamese: what exists, what is mock data, how to run it.
