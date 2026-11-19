import { json, requireAuth, ghWriteFileBase64, type Env } from "./_utils";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ["png", "jpg", "jpeg", "gif", "webp", "avif", "svg", "ico"];

/* POST /api/upload — 上传图片到 public/uploads/，返回站内地址 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
	const denied = await requireAuth(request, env);
	if (denied) return denied;
	const body = (await request.json().catch(() => null)) as
		| { filename?: string; base64?: string }
		| null;
	if (!body?.filename || !body.base64) return json({ error: "缺少 filename / base64" }, 400);

	const ext = body.filename.split(".").pop()?.toLowerCase() || "";
	if (!ALLOWED.includes(ext)) return json({ error: `不支持的图片格式: .${ext}` }, 400);

	// base64 长度 → 原始字节数估算（去 padding）
	const bytes = Math.floor((body.base64.length * 3) / 4);
	if (bytes > MAX_BYTES) return json({ error: "图片超过 8MB 限制" }, 400);
	// 校验是合法 base64
	if (!/^[A-Za-z0-9+/=]+$/.test(body.base64)) return json({ error: "base64 数据无效" }, 400);

	const safeName =
		body.filename
			.replace(/[^\w\u4e00-\u9fff.-]/g, "_")
			.replace(/\.{2,}/g, ".")
			.slice(0, 80) || "image.png";
	const name = `${Date.now()}-${safeName}`;

	try {
		// base64 直接透传给 GitHub，避免二进制经 UTF-8 编码损坏
		await ghWriteFileBase64(
			env,
			`public/uploads/${name}`,
			body.base64,
			`Upload image ${name} (via blog admin)`,
		);
		return json({ ok: true, url: `/uploads/${name}` });
	} catch (e) {
		return json({ error: String((e as Error).message || e) }, 502);
	}
};
