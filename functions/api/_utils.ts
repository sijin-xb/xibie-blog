/* 后端共享工具：会话签名 + GitHub 内容 API 封装 */

export interface Env {
	ADMIN_PASSWORD: string;
	SESSION_SECRET: string;
	GITHUB_TOKEN: string;
	GITHUB_BRANCH?: string;
}

const OWNER = "sijin-xb";
const REPO = "xibie-blog";
const POSTS_DIR = "src/content/posts";
const COOKIE = "admin_session";
const WEEK = 7 * 24 * 3600;

export const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json", ...extra },
	});

function hex(buf: ArrayBuffer): string {
	return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(secret: string, msg: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)));
}

export function getCookie(request: Request, name: string): string | undefined {
	for (const part of request.headers.get("Cookie")?.split(";") ?? []) {
		const [k, ...v] = part.trim().split("=");
		if (k === name) return v.join("=");
	}
	return undefined;
}

export async function createSession(secret: string): Promise<string> {
	const exp = Date.now() + WEEK * 1000;
	return `${exp}.${await hmac(secret, String(exp))}`;
}

export async function verifySession(secret: string, token?: string): Promise<boolean> {
	if (!token) return false;
	const [expStr, sig] = token.split(".");
	const exp = Number(expStr);
	if (!exp || !sig || exp < Date.now()) return false;
	const expect = await hmac(secret, expStr);
	if (expect.length !== sig.length) return false;
	// 逐字符异或做常数时间比较
	let diff = 0;
	for (let i = 0; i < expect.length; i++) diff |= expect.charCodeAt(i) ^ sig.charCodeAt(i);
	return diff === 0;
}

export async function requireAuth(request: Request, env: Env): Promise<Response | null> {
	const ok = await verifySession(env.SESSION_SECRET, getCookie(request, COOKIE));
	return ok ? null : json({ error: "未登录或会话已过期" }, 401);
}

/* ---------- GitHub ---------- */

function ghHeaders(env: Env): HeadersInit {
	// GitHub API 强制要求 User-Agent，缺失会 403
	return {
		Authorization: `Bearer ${env.GITHUB_TOKEN}`,
		Accept: "application/vnd.github+json",
		"User-Agent": "xibie-blog-admin",
	};
}

const branch = (env: Env) => env.GITHUB_BRANCH || "main";

function toBase64(str: string): string {
	const bytes = new TextEncoder().encode(str);
	let bin = "";
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin);
}

export async function ghListDir(env: Env, dir: string): Promise<{ name: string; sha: string }[]> {
	const res = await fetch(
		`https://api.github.com/repos/${OWNER}/${REPO}/contents/${dir}?ref=${branch(env)}`,
		{ headers: ghHeaders(env) },
	);
	// 目录不存在（一篇都还没发过）视为空
	if (res.status === 404) return [];
	if (!res.ok) throw new Error(`GitHub 列目录失败: ${res.status}`);
	const items = (await res.json()) as { name: string; sha: string; type: string }[];
	return items.filter((i) => i.type === "file" && i.name.endsWith(".md"));
}

export async function ghReadFile(
	env: Env,
	path: string,
): Promise<{ raw: string; sha: string }> {
	const res = await fetch(
		`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${branch(env)}`,
		{ headers: ghHeaders(env) },
	);
	if (!res.ok) throw new Error(`GitHub 读文件失败: ${res.status}`);
	const data = (await res.json()) as { content: string; sha: string };
	// atob 只做 Latin-1 解码，中文内容必须再按 UTF-8 解
	const bin = atob(data.content.replace(/\n/g, ""));
	const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
	return { raw: new TextDecoder().decode(bytes), sha: data.sha };
}

export async function ghWriteFile(
	env: Env,
	path: string,
	content: string,
	sha?: string,
	message?: string,
): Promise<void> {
	const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
		method: "PUT",
		headers: { ...ghHeaders(env), "Content-Type": "application/json" },
		body: JSON.stringify({
			message: message || `${sha ? "Edit" : "Create"} ${path} (via blog admin)`,
			content: toBase64(content),
			branch: branch(env),
			...(sha ? { sha } : {}),
		}),
	});
	if (!res.ok) {
		const detail = (await res.json().catch(() => ({}))) as { message?: string };
		throw new Error(`GitHub 写入失败: ${res.status} ${detail.message || ""}`);
	}
}

/* 图片等二进制：base64 直接透传，不做 UTF-8 转换 */
export async function ghWriteFileBase64(
	env: Env,
	path: string,
	base64: string,
	message?: string,
): Promise<void> {
	const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
		method: "PUT",
		headers: { ...ghHeaders(env), "Content-Type": "application/json" },
		body: JSON.stringify({
			message: message || `Upload ${path} (via blog admin)`,
			content: base64,
			branch: branch(env),
		}),
	});
	if (!res.ok) {
		const detail = (await res.json().catch(() => ({}))) as { message?: string };
		throw new Error(`GitHub 上传失败: ${res.status} ${detail.message || ""}`);
	}
}

export async function ghDeleteFile(env: Env, path: string, sha: string): Promise<void> {
	const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
		method: "DELETE",
		headers: { ...ghHeaders(env), "Content-Type": "application/json" },
		body: JSON.stringify({
			message: `Delete ${path} (via blog admin)`,
			sha,
			branch: branch(env),
		}),
	});
	if (!res.ok) {
		const detail = (await res.json().catch(() => ({}))) as { message?: string };
		throw new Error(`GitHub 删除失败: ${res.status} ${detail.message || ""}`);
	}
}

/* ---------- 文章 frontmatter ---------- */

export interface PostMeta {
	title: string;
	published: string;
	description?: string;
	tags?: string[];
	category?: string;
	draft?: boolean;
}

function yamlStr(s: string): string {
	return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function buildMarkdown(meta: PostMeta, body: string): string {
	const lines = [
		"---",
		`title: ${yamlStr(meta.title)}`,
		`published: ${meta.published}`,
		meta.description ? `description: ${yamlStr(meta.description)}` : null,
		meta.tags?.length ? `tags: [${meta.tags.map(yamlStr).join(", ")}]` : null,
		meta.category ? `category: ${yamlStr(meta.category)}` : null,
		meta.draft ? "draft: true" : null,
		"---",
		"",
		body.trimEnd(),
		"",
	];
	return lines.filter((l) => l !== null).join("\n");
}

export function parseFrontmatter(raw: string): { meta: Record<string, string | string[]>; body: string } {
	const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!m) return { meta: {}, body: raw };
	const meta: Record<string, string | string[]> = {};
	for (const line of m[1].split(/\r?\n/)) {
		const kv = line.match(/^([\w-]+):\s*(.*)$/);
		if (!kv) continue;
		let v: string | string[] = kv[2].trim();
		if (v.startsWith("[") && v.endsWith("]")) {
			v = v
				.slice(1, -1)
				.split(",")
				.map((s) => s.trim().replace(/^["']|["']$/g, ""))
				.filter(Boolean);
		} else {
			v = v.replace(/^["']|["']$/g, "");
		}
		meta[kv[1]] = v;
	}
	return { meta, body: m[2] };
}

export function slugify(title: string): string {
	return (
		title
			.trim()
			.replace(/[/\\:*?"<>|#%{}[\]$&@!~^`'；，。！？（）：]/g, "")
			.replace(/\s+/g, "-")
			.slice(0, 60) || "post"
	);
}

export function validFilename(name: string): boolean {
	return /^[\w\u4e00-\u9fff-]+\.md$/.test(name) && !name.includes("..");
}
