extends Node2D
class_name WaypointGraph
## 1D Walkable Waypoint Graph along Unified `GROUND_Y` (`src/world/WaypointGraph.gd`)
## Strictly enforces GEMINI.md Law 2.1 (`GROUND_Y = 124.0`) & Law 3.1 (1D Slot Coordinates).

const GROUND_Y := 124.0

const WAYPOINTS: Array[Vector2] = [
	Vector2(144.0, GROUND_Y),   # 0: Island 2 Left Hut
	Vector2(272.0, GROUND_Y),   # 1: Island 2 SoilPlot
	Vector2(397.0, GROUND_Y),   # 2: Island 2 Cauldron Workshop
	Vector2(492.0, GROUND_Y),   # 3: Bridge 1 Left
	Vector2(542.0, GROUND_Y),   # 4: Bridge 1 Arch Center
	Vector2(586.0, GROUND_Y),   # 5: Bridge 1 Right
	Vector2(612.4, GROUND_Y),   # 6: Island 1 Apple Tree
	Vector2(710.8, GROUND_Y),   # 7: Island 1 SoilPlot
	Vector2(811.2, GROUND_Y),   # 8: Island 1 Mushroom Cottage
	Vector2(908.4, GROUND_Y),   # 9: Island 1 Mortar Workshop
	Vector2(1013.4, GROUND_Y),  # 10: Island 1 Market Stall
	Vector2(1082.0, GROUND_Y),  # 11: Lotus Pond Bridge Left
	Vector2(1192.0, GROUND_Y),  # 12: Lotus Pond Bridge Center
	Vector2(1302.0, GROUND_Y),  # 13: Lotus Pond Bridge Right
	Vector2(1358.0, GROUND_Y),  # 14: Bridge 2 Arch Center
	Vector2(1414.0, GROUND_Y),  # 15: Island 3 West Landing
	Vector2(1462.0, GROUND_Y),  # 16: Island 3 Apple Tree
	Vector2(1562.4, GROUND_Y),  # 17: Island 3 SoilPlot
	Vector2(1655.3, GROUND_Y),  # 18: Island 3 Dual Workshop
	Vector2(1755.6, GROUND_Y)   # 19: Island 3 Right Tiki Landmark
]

const NAMED_WAYPOINTS: Dictionary = {
	"spawn_left": 0,
	"basket_2": 1,
	"cauldron": 2,
	"apple_tree": 6,
	"basket_1": 7,
	"cottage": 8,
	"mortar": 9,
	"market_stall": 10,
	"basket_3": 17,
	"orbis_linked": 18,
	"spawn_right": 19
}

func get_named_pos(key: String) -> Vector2:
	var idx: int = int(NAMED_WAYPOINTS.get(key, 10))
	return WAYPOINTS[clampi(idx, 0, WAYPOINTS.size() - 1)]

func get_nearest_waypoint_index(pos: Vector2) -> int:
	var best_idx := 0
	var best_d := 1e9
	for i in range(WAYPOINTS.size()):
		var d := absf(pos.x - WAYPOINTS[i].x)
		if d < best_d:
			best_d = d
			best_idx = i
	return best_idx

func compute_path(from_pos: Vector2, to_pos: Vector2) -> Array[Vector2]:
	var s_idx := get_nearest_waypoint_index(from_pos)
	var e_idx := get_nearest_waypoint_index(to_pos)
	var path: Array[Vector2] = []
	if s_idx <= e_idx:
		for i in range(s_idx, e_idx + 1):
			path.append(WAYPOINTS[i])
	else:
		for i in range(s_idx, e_idx - 1, -1):
			path.append(WAYPOINTS[i])
	path.append(constrain_to_walkable_surface(to_pos))
	return path

func constrain_to_walkable_surface(pos: Vector2) -> Vector2:
	return Vector2(clampf(pos.x, 120.0, 1790.0), GROUND_Y)
