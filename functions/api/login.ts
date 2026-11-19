import { json, createSession, type Env } from "./_utils";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
	const body = (await request.json().catch(() => ({}))) as { password?: string };
	const pw = body.password || "";
	if (
		!pw ||
		pw.length !== env.ADMIN_PASSWORD.length ||
		pw !== env.ADMIN_PASSWORD
	) {
		return json({ error: "密码错误" }, 401);
	}
	const token = await createSession(env.SESSION_SECRET);
	return json(
		{ ok: true },
		200,
		{
			"Set-Cookie": `admin_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 3600}`,
		},
	);
};
