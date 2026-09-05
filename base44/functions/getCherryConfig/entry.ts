Deno.serve(async (req) => {
  try {
    const appId = Deno.env.get("CHERRY_APP_ID") || "";
    const roomId = Deno.env.get("CHERRY_ROOM_ID") || "";
    return Response.json({
      appId,
      roomId,
      enabled: Boolean(appId),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});