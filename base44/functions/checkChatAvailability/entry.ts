import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    try {
      await base44.auth.me();
    } catch (error) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cloud UCM API endpoint to check agent availability
    const cloudUCMUrl = 'https://071be2.c.myucm.cloud/api/agent-status';
    
    try {
      const response = await fetch(cloudUCMUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return Response.json({
          available: data.online || false,
          agentsOnline: data.agentsOnline || 0,
          avgResponseTime: data.avgResponseTime || 'N/A'
        });
      }
      
      // If API call fails, default to showing available
      return Response.json({
        available: true,
        agentsOnline: 1,
        avgResponseTime: '2 minutes'
      });
    } catch (error) {
      // If Cloud UCM is unreachable, default to available
      return Response.json({
        available: true,
        agentsOnline: 1,
        avgResponseTime: '2 minutes'
      });
    }
  } catch (error) {
    console.error('Error checking chat availability:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});