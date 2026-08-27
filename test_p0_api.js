const http = require('http');

async function testP0() {
  const adminHost = 'http://localhost:3000'; // assuming api is running? No, we will just call the mock store functions locally to prove the logic.
  const mockStore = require('./apps/api/dist/data/mock-store.js');
  const persistentStore = require('./apps/api/dist/data/persistent-store.js');
  
  console.log('--- 1. Crear curso con portada ---');
  let course = await persistentStore.createCourse({
    title: "Test Course P0",
    coverImageUrl: "https://example.com/cover.jpg"
  }, { actorType: 'admin', actorId: 'admin1', source: 'admin', changedBy: 'Admin' });
  
  console.log('Course ID:', course.id);
  console.log('Cover URL:', course.coverImageUrl);
  
  console.log('\n--- 2. Crear módulo y lección con MP4 ---');
  await persistentStore.createCourseModule(course.id, {
    title: "M1"
  }, { actorType: 'admin', actorId: 'admin1', source: 'admin', changedBy: 'Admin' });
  
  const courseWithModule = mockStore.getAdminCourseById(course.id);
  const moduleId = courseWithModule.modules[0].id;
  
  await persistentStore.createCourseLesson(course.id, moduleId, {
    title: "L1 Video",
    resourceUrl: "https://example.com/video.mp4",
    mimeType: "video/mp4",
    format: "video"
  }, { actorType: 'admin', actorId: 'admin1', source: 'admin', changedBy: 'Admin' });
  
  console.log('\n--- 3. Verificando respuesta de API (getCourseById) ---');
  const finalCourse = mockStore.getCourseById(course.id);
  const finalLesson = finalCourse.modules[0].lessons[0];
  
  console.log('Lesson resourceUrl:', finalLesson.resourceUrl);
  console.log('Lesson format:', finalLesson.format);
  console.log('Lesson mediaType:', finalLesson.mediaType);
  console.log('Lesson mimeType:', finalLesson.mimeType);
  
  if (finalLesson.mediaType !== 'video') throw new Error("mediaType no es video!");
  if (course.coverImageUrl !== "https://example.com/cover.jpg") throw new Error("Portada no se guardó!");
  
  console.log('\n✅ P0 Validado a nivel de API/BD local!');
}

testP0().catch(console.error);
