extends Node
## Global Signal Bus (`EventBus.gd` Autoload) — PRD v2.0 Section 6

signal gold_changed(new_gold: int, delta: int)
signal prosperity_changed(new_score: int)
signal inventory_changed()
signal item_produced(island_idx: int, item_id: String, qty: int)
signal item_delivered(item_id: String, amount: int, target_name: String)
signal customer_paid(recipe_id: String, qty: int, total_gold: int, world_pos: Vector2)
signal customer_left_unhappy(world_pos: Vector2)
signal toggle_desktop_mode(enabled: bool)
signal upgrade_purchased(category: String, key: String, new_level: int)
signal island_unlocked(island_idx: int)
signal offline_earnings_ready(seconds_away: int, gold_earned: int)
signal spawn_floating_text(world_pos: Vector2, text_str: String, col: Color)
signal weather_changed(new_weather: int)
signal codex_unlocked(item_id: String)
signal carnival_frenzy_started(duration: float)
