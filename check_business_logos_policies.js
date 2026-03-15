import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBusinessLogosPolicies() {
  console.log('🔍 Verificando configuración del bucket business-logos...\n');

  try {
    console.log('📦 1. Verificando existencia del bucket...');
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();

    if (bucketsError) {
      console.error('❌ Error listando buckets:', bucketsError);
      return;
    }

    const businessLogosBucket = buckets?.find(b => b.name === 'business-logos');
    
    if (!businessLogosBucket) {
      console.log('❌ El bucket "business-logos" NO existe');
      console.log('\n📝 Pasos para crear el bucket:');
      console.log('1. Ve a Supabase Dashboard > Storage');
      console.log('2. Clic en "New bucket"');
      console.log('3. Nombre: business-logos');
      console.log('4. Public bucket: ✅ (activado)');
      console.log('5. Clic en "Create bucket"');
      return;
    }

    console.log('✅ Bucket "business-logos" existe');
    console.log('   - ID:', businessLogosBucket.id);
    console.log('   - Público:', businessLogosBucket.public ? 'Sí' : 'No');
    console.log('   - Tamaño límite:', businessLogosBucket.file_size_limit || 'Sin límite');

    console.log('\n📋 2. Intentando listar archivos del bucket...');
    const { data: files, error: listError } = await supabase
      .storage
      .from('business-logos')
      .list('', { limit: 5 });

    if (listError) {
      console.log('⚠️  Error listando archivos:', listError.message);
    } else {
      console.log('✅ Acceso al bucket exitoso');
      console.log('   - Archivos encontrados:', files?.length || 0);
    }

    console.log('\n🔐 3. Políticas RLS recomendadas para business-logos:');
    console.log('\n--- POLÍTICA 1: Permitir subida de logos (INSERT) ---');
    console.log('Nombre: "Owners can upload business logos"');
    console.log('Operación: INSERT');
    console.log('Target roles: authenticated');
    console.log('Policy definition:');
    console.log(`
(
  bucket_id = 'business-logos'
  AND auth.uid() IN (
    SELECT p.user_id 
    FROM profiles p
    INNER JOIN businesses b ON b.owner_id = p.id
    WHERE b.id::text = (storage.foldername(name))[1]
  )
)
    `);

    console.log('\n--- POLÍTICA 2: Permitir lectura pública de logos (SELECT) ---');
    console.log('Nombre: "Public read access to business logos"');
    console.log('Operación: SELECT');
    console.log('Target roles: public, authenticated');
    console.log('Policy definition:');
    console.log(`
bucket_id = 'business-logos'
    `);

    console.log('\n--- POLÍTICA 3: Permitir actualización de logos (UPDATE) ---');
    console.log('Nombre: "Owners can update business logos"');
    console.log('Operación: UPDATE');
    console.log('Target roles: authenticated');
    console.log('Policy definition:');
    console.log(`
(
  bucket_id = 'business-logos'
  AND auth.uid() IN (
    SELECT p.user_id 
    FROM profiles p
    INNER JOIN businesses b ON b.owner_id = p.id
    WHERE b.id::text = (storage.foldername(name))[1]
  )
)
    `);

    console.log('\n--- POLÍTICA 4: Permitir eliminación de logos (DELETE) ---');
    console.log('Nombre: "Owners can delete business logos"');
    console.log('Operación: DELETE');
    console.log('Target roles: authenticated');
    console.log('Policy definition:');
    console.log(`
(
  bucket_id = 'business-logos'
  AND auth.uid() IN (
    SELECT p.user_id 
    FROM profiles p
    INNER JOIN businesses b ON b.owner_id = p.id
    WHERE b.id::text = (storage.foldername(name))[1]
  )
)
    `);

    console.log('\n📝 4. Estructura de carpetas recomendada:');
    console.log('business-logos/');
    console.log('  └── {business_id}/');
    console.log('      └── logo.{ext}');
    console.log('\nEjemplo: business-logos/550e8400-e29b-41d4-a716-446655440000/logo.png');

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  }
}

console.log('🚀 Iniciando verificación del bucket business-logos...\n');
checkBusinessLogosPolicies();
