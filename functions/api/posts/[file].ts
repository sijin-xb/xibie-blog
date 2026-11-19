import {
	json,
	requireAuth,
	ghReadFile,
	ghWriteFile,
	ghDeleteFile,
	parseFrontmatter,
	buildMarkdown,
	validFilename,
	type Env,
	type PostMeta,
} from "../_utils";

interface Ctx {
	request: Request;
	env: Env;
	params: { file: string };
}

/* GET /api/posts/<file> — 读取单篇（frontmatter 字段 + 正文） */
export const onRequestGet: PagesFunction<Env, "file"> = async ({
	request,
	env,
	params,
}: Ctx) => {
	const denied = await requireAuth(request, env);
	if (denied) return denied;
	const name = decodeURIComponent(params.file);
	if (!validFilename(name)) return json({ error: "文件名不合法" }, 400);
	try {
		const { raw, sha } = await ghReadFile(env, `src/content/posts/${name}`);
		const { meta, body } = parseFrontmatter(raw);
		return json({
			file: name,
			sha,
			title: meta.title || "",
			published: meta.published || "",
			description: meta.description || "",
			tags: meta.tags || [],
			category: meta.category || "",
			draft: meta.draft === "true",
			body,
		});
	} catch (e) {
		return json({ error: String((e as Error).message || e) }, 404);
	}
};

/* PUT /api/posts/<file> — 更新文章 */
export const onRequestPut: PagesFunction<Env, "file"> = async ({
	request,
	env,
	params,
}: Ctx) => {
	const denied = await requireAuth(request, env);
	if (denied) return denied;
	const name = decodeURIComponent(params.file);
	if (!validFilename(name)) return json({ error: "文件名不合法" }, 400);
	const body = (await request.json().catch(() => null)) as
		| (PostMeta & { body?: string; sha?: string })
		| null;
	if (!body?.title || !body.published || !body.sha) {
		return json({ error: "缺少 title / published / sha" }, 400);
	}
	try {
		await ghWriteFile(
			env,
			`src/content/posts/${name}`,
			buildMarkdown(body, body.body || ""),
			body.sha,
		);
		return json({ ok: true });
	} catch (e) {
		return json({ error: String((e as Error).message || e) }, 502);
	}
};

/* DELETE /api/posts/<file> — 删除文章 */
export const onRequestDelete: PagesFunction<Env, "file"> = async ({
	request,
	env,
	params,
}: Ctx) => {
	const denied = await requireAuth(request, env);
	if (denied) return denied;
	const name = decodeURIComponent(params.file);
	if (!validFilename(name)) return json({ error: "文件名不合法" }, 400);
	const body = (await request.json().catch(() => ({}))) as { sha?: string };
	if (!body.sha) return json({ error: "缺少 sha（先 GET 列表获取）" }, 400);
	try {
		await ghDeleteFile(env, `src/content/posts/${name}`, body.sha);
		return json({ ok: true });
	} catch (e) {
		return json({ error: String((e as Error).message || e) }, 502);
	}
};
