import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const EMAIL_FROM = Deno.env.get('EMAIL_FROM_ADDRESS') || 'notifications@datara.digital'
const APP_URL = Deno.env.get('APP_URL') || 'https://your-app.vercel.app'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { queueId } = await req.json()
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get notification from queue
    const { data: notification, error: fetchError } = await supabase
      .from('notification_queue')
      .select(`
        *,
        user:user_id (email, display_name)
      `)
      .eq('queue_id', queueId)
      .eq('status', 'pending')
      .single()
    
    if (fetchError || !notification) {
      throw new Error('Notification not found or already sent')
    }
    
    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: notification.user.email,
        subject: notification.subject,
        html: notification.body,
      }),
    })
    
    const emailResult = await emailResponse.json()
    
    if (!emailResponse.ok) {
      throw new Error(emailResult.message || 'Failed to send email')
    }
    
    // Update queue status to sent
    await supabase
      .from('notification_queue')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('queue_id', queueId)
    
    // Log success
    await supabase
      .from('notification_log')
      .insert({
        user_id: notification.user_id,
        notification_type: notification.notification_type,
        recipient_email: notification.user.email,
        subject: notification.subject,
        status: 'sent'
      })
    
    return new Response(
      JSON.stringify({ success: true, messageId: emailResult.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Error:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
