// Test script para verificar la subida de imágenes
// Ejecutar con: node test_image_upload.js

const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase (reemplaza con tus valores)
const supabaseUrl = 'TU_SUPABASE_URL';
const supabaseKey = 'TU_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

// Simular la función uploadProductImage
async function testUploadImage() {
  try {
    console.log('🧪 Probando subida de imagen...');

    // Simular archivo (en un test real usarías un archivo real)
    const mockFile = {
      name: 'test-image.jpg',
      type: 'image/jpeg',
      size: 1024 * 1024, // 1MB
    };

    // Simular businessId
    const businessId = 'test-business-id';

    // Generar nombre único (como en el código real)
    const fileExt = mockFile.name.split('.').pop();
    const fileName = `${businessId}/temp_${Date.now()}.${fileExt}`;

    console.log('📁 Nombre del archivo:', fileName);

    // Intentar subir (esto fallará sin archivo real, pero podemos ver el error)
    const { error } = await supabase.storage
      .from('product-images')
      .upload(fileName, new Blob(['test']), {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.log('❌ Error esperado (sin archivo real):', error.message);

      // Verificar tipo de error
      if (error.message.includes('Bucket not found')) {
        console.log('🔍 Problema: El bucket "product-images" no existe');
        console.log('💡 Solución: Crear el bucket en Supabase Dashboard > Storage');
      } else if (error.message.includes('Permission denied') || error.message.includes('policy')) {
        console.log('🔍 Problema: Error de permisos RLS');
        console.log('💡 Solución: Verificar políticas RLS del bucket');
      } else {
        console.log('🔍 Otro error:', error.message);
      }
    } else {
      console.log('✅ Subida exitosa (inesperado sin archivo real)');
    }

  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

// Verificar bucket público
async function testBucketAccess() {
  try {
    console.log('\n🧪 Verificando acceso al bucket...');

    const { data, error } = await supabase.storage
      .from('product-images')
      .list('', { limit: 1 });

    if (error) {
      console.log('❌ Error accediendo al bucket:', error.message);
    } else {
      console.log('✅ Bucket accesible');
      console.log('📊 Archivos encontrados:', data?.length || 0);
    }
  } catch (error) {
    console.error('💥 Error verificando bucket:', error);
  }
}

// Ejecutar tests
async function runTests() {
  console.log('🚀 Iniciando tests de imagen...\n');

  await testBucketAccess();
  await testUploadImage();

  console.log('\n✨ Tests completados');
  console.log('\n📝 Próximos pasos:');
  console.log('1. Verificar que el bucket "product-images" existe');
  console.log('2. Verificar que es público');
  console.log('3. Verificar políticas RLS');
  console.log('4. Probar desde la aplicación real');
}

runTests();
