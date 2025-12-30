
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://kilndogpsffkgkealkaq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbG5kb2dwc2Zma2drZWFsa2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzODg4MDUsImV4cCI6MjA3OTk2NDgwNX0.04nyCSgm0_dnD9aAJ_kHpv3OxRVr_V6lkM9-Cu_ZlXA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debug() {
    console.log("--- COMBUSTIVEIS ATUAIS ---");
    const { data: combustiveis, error } = await supabase.from('Combustivel').select('*');
    if (error) {
        console.error(error);
    } else {
        console.table(combustiveis);
    }

    console.log("--- POSTOS ATUAIS ---");
    const { data: postos, error: errorPostos } = await supabase.from('Posto').select('*');
    if (errorPostos) {
        console.error(errorPostos);
    } else {
        console.table(postos);
    }
}

debug();
