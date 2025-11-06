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

    // Get 1 pending notification (to avoid rate limits)
    const { data: notifications, error: fetchError } = await supabase
      .from('notification_queue')
      .select('queue_id')
      .eq('status', 'pending')
      .limit(1);

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

    // Call Edge Function to send the email
    const { data: result, error: invokeError } = await supabase.functions.invoke(
      'send-notification',
      {
        body: { queueId: notifications[0].queue_id }
      }
    );

    if (invokeError) {
      throw new Error(`Failed to send notification: ${invokeError.message}`);
    }

    return NextResponse.json({
      success: true,
      processed: 1,
      queueId: notifications[0].queue_id,
      result
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
