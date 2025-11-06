import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Verify secret from header
    const secret = request.headers.get('x-cron-secret');
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get up to 20 pending notifications
    const { data: notifications, error: fetchError } = await supabase
      .from('notification_queue')
      .select('queue_id')
      .eq('status', 'pending')
      .limit(20);

    if (fetchError) {
      throw new Error(`Failed to fetch notifications: ${fetchError.message}`);
    }

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No pending notifications',
        processed: 0 
      });
    }

    // Send all notifications
    const results = [];
    const errors = [];
    
    for (const notification of notifications) {
      try {
        const { data: result, error: invokeError } = await supabase.functions.invoke(
          'send-notification',
          {
            body: { queueId: notification.queue_id }
          }
        );

        if (invokeError) {
          errors.push({ 
            queueId: notification.queue_id, 
            error: invokeError.message 
          });
        } else {
          results.push({ 
            queueId: notification.queue_id, 
            result 
          });
        }
      } catch (err: any) {
        errors.push({ 
          queueId: notification.queue_id, 
          error: err.message 
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      failed: errors.length,
      total: notifications.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        success: false 
      },
      { status: 500 }
    );
  }
}

// Allow both GET and POST
export async function POST(request: NextRequest) {
  return GET(request);
}
