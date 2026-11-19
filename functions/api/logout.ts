import { json, type Env } from "./_utils";

export const onRequestPost: PagesFunction<Env> = async () => {
	return json(
		{ ok: true },
		200,
		{ "Set-Cookie": "admin_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0" },
	);
};
