---
name: Neon theme motion
description: Reusable interaction and accessibility convention for the Moneywise cyberpunk visual system.
---

Centralize shared hover, press, focus, elevation, and glow behavior in the theme stylesheet rather than repeating it across every page component.

**Why:** Moneywise has many cards, links, buttons, and transaction rows; a shared motion layer keeps the cyberpunk interaction language consistent and makes accessibility behavior easier to maintain.

**How to apply:** Prefer shared selectors or small semantic utility classes for future interaction polish, and always include a `prefers-reduced-motion` override when adding animation or transitions.