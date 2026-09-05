Deno.serve(async (req) => {
  try {
    const appId = Deno.env.get("CHERRY_APP_ID") || "";
    // roomId left empty so the Cherry embed loads the app's default room.
    // Set a valid Cherry room slug here (e.g. "@opentill") once a dedicated room is created.
    const roomId = "";
    return Response.json({
      appId,
      roomId,
      enabled: Boolean(appId),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});