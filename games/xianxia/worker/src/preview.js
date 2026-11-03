/*
 * Link-unfurl support for kgnet-xianxia — port of tools/mock-kgnet/preview.js.
 *
 * Discord/Slack/Telegram crawlers GET the shared URL, read the Open Graph tags,
 * and never run JS. The page therefore carries baked OG metadata plus a meta
 * refresh that bounces real browsers into the game's read-only preview mode.
 */

import LZString from "./lz-string.js";

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

// --- save introspection -----------------------------------------------------

// Mirrors game.decompressLZData: base64 first, utf16 as the fallback.
function decompress(blob) {
	if (!blob) {
		return null;
	}
	if (blob[0] === "{") {
		return blob;
	}
	const asBase64 = LZString.decompressFromBase64(blob);
	if (asBase64 && asBase64[0] === "{") {
		return asBase64;
	}
	return LZString.decompressFromUTF16(blob);
}

function findByName(list, name) {
	if (!Array.isArray(list)) {
		return null;
	}
	return list.find(function (entry) { return entry && entry.name === name; }) || null;
}

function statValue(save, name) {
	const stat = findByName(save.stats, name);
	return stat ? (stat.val || 0) : 0;
}

function resourceValue(save, name) {
	const res = findByName(save.resources, name);
	return res ? (res.value || 0) : 0;
}

const REALMS = {
	lianqi: "炼气期",
	zhuji: "筑基期",
	jiedan: "结丹期",
	yuanying: "元婴期",
	huashen: "化神期",
	lianxu: "炼虚期",
	heti: "合体期",
	dacheng: "大乘期",
	dujie: "渡劫期"
};
const TIERS = ["", "初期", "中期", "后期"];

function realmLabel(save) {
	const stages = save.cultivation && save.cultivation.stages;
	if (!Array.isArray(stages)) {
		return "凡俗";
	}
	let deepest = null, deepestOrder = -1;
	const realmOrder = Object.keys(REALMS);
	for (const s of stages) {
		if (!s || !s.researched || !s.name) { continue; }
		const [prefix, layer] = s.name.split("_");
		const order = realmOrder.indexOf(prefix);
		const layerNum = Number(layer) || 0;
		if (order > deepestOrder || (order === deepestOrder && deepest && layerNum > deepest.layer)) {
			deepestOrder = order;
			deepest = { prefix: prefix, layer: layerNum };
		}
	}
	if (!deepest) {
		return "凡俗";
	}
	const realm = REALMS[deepest.prefix] || deepest.prefix;
	return deepest.prefix === "lianqi"
		? realm + "·" + deepest.layer + "层"
		: realm + (TIERS[deepest.layer] ? "·" + TIERS[deepest.layer] : "");
}

/**
 * Everything the embed needs, pulled straight out of the save blob.
 */
export function summarize(record) {
	const summary = {
		label: record.label || record.guid.slice(-4),
		guid: record.guid,
		timestamp: record.timestamp,
		size: record.size,
		year: 0,
		day: 0,
		realm: "凡俗",
		xiuwei: 0,
		karma: 0,
		resets: 0,
		broken: false
	};

	let save = null;
	try {
		save = JSON.parse(decompress(record.data));
	} catch (err) {
		console.warn("preview: unreadable save", record.guid, err.message);
	}
	// a blob that decompresses to "null" or a bare number parses fine and is still garbage
	if (!save || typeof save !== "object") {
		summary.broken = true;
		return summary;
	}

	if (save.calendar) {
		summary.year = save.calendar.year || 0;
		summary.day = Math.floor(save.calendar.day || 0);
	}
	summary.realm = realmLabel(save);
	summary.xiuwei = Math.floor(resourceValue(save, "xiuwei"));
	summary.karma = Math.floor(resourceValue(save, "karma"));
	summary.resets = statValue(save, "totalResets");

	return summary;
}

/** One line of prose for og:description and the card subtitle. */
export function describe(summary) {
	if (summary.broken) {
		return "这份存档已损毁,无法读取。";
	}
	const parts = [
		summary.realm,
		"道历" + summary.year + "年" + summary.day + "日"
	];
	if (summary.resets > 0) {
		parts.push(summary.resets + "世轮回");
	}
	if (summary.karma > 0) {
		parts.push("业果" + summary.karma);
	}
	return parts.join(" · ");
}

// --- the card ---------------------------------------------------------------

function escapeXml(text) {
	return String(text)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function statBlock(x, y, value, caption) {
	return [
		'<text x="' + x + '" y="' + y + '" class="stat">' + escapeXml(value) + "</text>",
		'<text x="' + x + '" y="' + (y + 38) + '" class="caption">' + escapeXml(caption) + "</text>"
	].join("");
}

export function renderCardSvg(summary) {
	const subtitle = "道历" + summary.year + "年" + summary.day + "日";

	return '<?xml version="1.0" encoding="UTF-8"?>\n'
		+ '<svg xmlns="http://www.w3.org/2000/svg" width="' + CARD_WIDTH + '" height="' + CARD_HEIGHT + '" viewBox="0 0 ' + CARD_WIDTH + " " + CARD_HEIGHT + '">'
		+ "<style>"
		+ ".bg { fill: #14100c; }"
		+ ".rule { stroke: #5a4a2e; stroke-width: 2; }"
		+ "text { font-family: 'Noto Serif SC', 'STKaiti', 'KaiTi', serif; fill: #d5cbb0; }"
		+ ".brand { font-size: 30px; fill: #8a7a55; letter-spacing: 6px; }"
		+ ".title { font-size: 76px; font-weight: bold; fill: #f0e6cc; }"
		+ ".subtitle { font-size: 38px; fill: #a89a75; }"
		+ ".stat { font-size: 54px; font-weight: bold; fill: #f0e6cc; }"
		+ ".caption { font-size: 26px; fill: #8a7a55; letter-spacing: 3px; }"
		+ ".footer { font-size: 24px; fill: #7a6c4d; }"
		+ "</style>"
		+ '<rect class="bg" width="' + CARD_WIDTH + '" height="' + CARD_HEIGHT + '"/>'
		+ '<text x="80" y="110" class="brand">凡人修仙传 · 放置</text>'
		+ '<line class="rule" x1="80" y1="146" x2="' + (CARD_WIDTH - 80) + '" y2="146"/>'
		+ '<text x="80" y="250" class="title">' + escapeXml(summary.label) + "</text>"
		+ '<text x="80" y="310" class="subtitle">' + escapeXml(subtitle) + "</text>"
		+ statBlock(80, 460, summary.realm, "境界")
		+ statBlock(430, 460, summary.xiuwei, "修为")
		+ statBlock(730, 460, summary.resets, "轮回")
		+ statBlock(980, 460, summary.karma, "业果")
		+ '<line class="rule" x1="80" y1="530" x2="' + (CARD_WIDTH - 80) + '" y2="530"/>'
		+ '<text x="80" y="578" class="footer">观道模式 · 只读</text>'
		+ "</svg>";
}

// --- the crawler-facing page ------------------------------------------------

function escapeHtml(text) {
	return escapeXml(text);
}

/**
 * @param {object} summary
 * @param {string} shareId - the save's share token (guids are not unique server-wide)
 * @param {string} baseUrl - public origin of THIS worker
 * @param {string} gameUrl - where a human should land
 */
export function renderPreviewPage(summary, shareId, baseUrl, gameUrl) {
	const title = summary.label + " — 凡人修仙传";
	const description = describe(summary);
	const pageUrl = baseUrl + "/preview/" + shareId;
	// cache-bust per save version so Discord's embed cache follows re-uploads
	const imageUrl = pageUrl + "/card.svg?v=" + summary.timestamp;
	const playUrl = gameUrl + "?saveId=" + encodeURIComponent(shareId);

	return "<!doctype html>\n"
		+ '<html lang="zh-CN">\n'
		+ "<head>\n"
		+ '<meta charset="utf-8">\n'
		+ "<title>" + escapeHtml(title) + "</title>\n"
		+ '<link rel="canonical" href="' + escapeHtml(pageUrl) + '">\n'
		+ '<meta name="description" content="' + escapeHtml(description) + '">\n'
		+ "\n"
		+ "<!-- Open Graph: Discord, Slack, Telegram, iMessage, Facebook -->\n"
		+ '<meta property="og:type" content="website">\n'
		+ '<meta property="og:site_name" content="凡人修仙传 · 放置">\n'
		+ '<meta property="og:title" content="' + escapeHtml(title) + '">\n'
		+ '<meta property="og:description" content="' + escapeHtml(description) + '">\n'
		+ '<meta property="og:url" content="' + escapeHtml(pageUrl) + '">\n'
		+ '<meta property="og:image" content="' + escapeHtml(imageUrl) + '">\n'
		+ '<meta property="og:image:width" content="' + CARD_WIDTH + '">\n'
		+ '<meta property="og:image:height" content="' + CARD_HEIGHT + '">\n'
		+ '<meta property="og:image:alt" content="' + escapeHtml(description) + '">\n'
		+ "\n"
		+ "<!-- Twitter/X wants its own namespace; Discord reads theme-color for the accent stripe -->\n"
		+ '<meta name="twitter:card" content="summary_large_image">\n'
		+ '<meta name="twitter:title" content="' + escapeHtml(title) + '">\n'
		+ '<meta name="twitter:description" content="' + escapeHtml(description) + '">\n'
		+ '<meta name="twitter:image" content="' + escapeHtml(imageUrl) + '">\n'
		+ '<meta name="theme-color" content="#14100c">\n'
		+ "\n"
		+ "<!-- humans go play; crawlers never get here because they do not run JS -->\n"
		+ '<meta http-equiv="refresh" content="0; url=' + escapeHtml(playUrl) + '">\n'
		+ "</head>\n"
		+ "<body>\n"
		+ "<p>" + escapeHtml(title) + " — " + escapeHtml(description) + "</p>\n"
		+ '<p><a href="' + escapeHtml(playUrl) + '">前往观道</a></p>\n'
		+ "</body>\n"
		+ "</html>\n";
}
