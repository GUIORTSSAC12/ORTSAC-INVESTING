---
name: Card boundary alignment
description: Durable guidance for aligning elements across adjacent dashboard cards.
---

When the user asks to align one element with a neighboring card, measure against the boundary of the explicitly named parent container. Do not substitute a nested child card just because it is visually nearby.

**Why:** The dashboard's VIX card has nested panels, and aligning against the inner VIX panel placed the radar banner too high. The intended reference was the complete macro-volatility container.

**How to apply:** Use the named parent element's `getBoundingClientRect()` edge and a visual transform when the page flow, container dimensions, and scrolling must remain unchanged.