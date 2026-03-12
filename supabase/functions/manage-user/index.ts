import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { action, ...payload } = await req.json()

    // All actions require authenticated admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify admin role
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')

    if (!roles?.length) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'create') {
      const { name, roll_number, pin, hostel_id, role } = payload
      const email = `${roll_number.toLowerCase().replace(/[^a-z0-9]/g, '')}@mess.app`

      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: pin,
        email_confirm: true,
      })
      if (authError) {
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      await supabaseAdmin.from('users').insert({
        id: authUser.user.id,
        name,
        roll_number,
        hostel_id: hostel_id ? Number(hostel_id) : null,
      })
      await supabaseAdmin.from('user_roles').insert({
        user_id: authUser.user.id,
        role: role || 'student',
      })

      return new Response(JSON.stringify({ success: true, user_id: authUser.user.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'delete') {
      const { user_id } = payload
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id)
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'change_pin') {
      const { user_id, new_pin } = payload
      if (!user_id || !new_pin || new_pin.length < 6) {
        return new Response(JSON.stringify({ error: 'user_id and new_pin (min 6 chars) required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { error } = await supabaseAdmin.auth.admin.updateUser(user_id, { password: new_pin })
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'batch_create') {
      const { students } = payload
      const results = { added: 0, skipped: 0 }

      for (const s of students) {
        const email = `${s.roll_number.toLowerCase().replace(/[^a-z0-9]/g, '')}@mess.app`
        const { data: authUser, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: s.pin,
          email_confirm: true,
        })
        if (error) {
          results.skipped++
          continue
        }
        await supabaseAdmin.from('users').insert({
          id: authUser.user.id,
          name: s.name,
          roll_number: s.roll_number,
          hostel_id: s.hostel_id ? Number(s.hostel_id) : null,
        })
        await supabaseAdmin.from('user_roles').insert({
          user_id: authUser.user.id,
          role: 'student',
        })
        results.added++
      }

      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
