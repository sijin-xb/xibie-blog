import {
	json,
	requireAuth,
	ghListDir,
	ghReadFile,
	ghWriteFile,
	buildMarkdown,
	parseFrontmatter,
	slugify,
	validFilename,
	type Env,
	type PostMeta,
} from "../_utils";

/* GET /api/posts — 文章列表（含每篇的标题/日期/草稿状态） */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
	const denied = await requireAuth(request, env);
	if (denied) return denied;
	try {
		const files = await ghListDir(env, "src/content/posts");
		const posts = await Promise.all(
			files.map(async (f) => {
				try {
					const { raw, sha } = await ghReadFile(env, `src/content/posts/${f.name}`);
					const { meta } = parseFrontmatter(raw);
					return {
						file: f.name,
						sha,
						title: (meta.title as string) || f.name,
						published: (meta.published as string) || "",
						draft: meta.draft === "true",
					};
				} catch {
					return { file: f.name, sha: "", title: f.name, published: "", draft: false };
				}
			}),
		);
		posts.sort((a, b) => (b.published || "").localeCompare(a.published || ""));
		return json({ posts });
	} catch (e) {
		return json({ error: String((e as Error).message || e) }, 502);
	}
};

/* POST /api/posts — 新建文章 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
	const denied = await requireAuth(request, env);
	if (denied) return denied;
	const body = (await request.json().catch(() => null)) as
		| (PostMeta & { body?: string })
		| null;
	if (!body?.title || !body.published) {
		return json({ error: "标题和发布日期不能为空" }, 400);
	}
	const filename = `${body.published}-${slugify(body.title)}.md`;
	if (!validFilename(filename)) {
		return json({ error: `文件名不合法: ${filename}` }, 400);
	}
	try {
		const existing = await ghListDir(env, "src/content/posts");
		if (existing.some((f) => f.name === filename)) {
			return json({ error: `文件已存在: ${filename}` }, 409);
		}
		await ghWriteFile(
			env,
			`src/content/posts/${filename}`,
			buildMarkdown(body, body.body || ""),
		);
		return json({ ok: true, file: filename });
	} catch (e) {
		return json({ error: String((e as Error).message || e) }, 502);
	}
};
