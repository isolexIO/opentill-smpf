import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { builder_id, ...updateData } = body;

    if (!builder_id) {
      return Response.json(
        { success: false, error: 'Builder ID required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const builder = await base44.asServiceRole.entities.Builder.filter({
      id: builder_id,
    });

    if (!builder || builder.length === 0 || builder[0].user_email !== user.email) {
      return Response.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Update builder
    const updated = await base44.asServiceRole.entities.Builder.update(
      builder_id,
      updateData
    );

    return Response.json({
      success: true,
      builder: updated,
    });
  } catch (error) {
    console.error('Error updating builder profile:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});