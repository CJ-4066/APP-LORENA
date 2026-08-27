const mockStore = require('./apps/api/dist/data/mock-store.js');

console.log('--- 1. Crear curso con portada ---');
let course = mockStore.upsertCourse(null, {
  title: "Test Course P0",
  coverImageUrl: "https://example.com/cover.jpg"
});

console.log('Course ID:', course.id);
console.log('Cover URL:', course.coverImageUrl);

console.log('\n--- 2. Crear módulo y lección con MP4 ---');
let updatedCourse = mockStore.upsertCourseModule(course.id, null, {
  title: "M1"
});

const moduleId = updatedCourse.modules[0].id;

updatedCourse = mockStore.upsertCourseLesson(course.id, moduleId, null, {
  title: "L1 Video",
  resourceUrl: "https://example.com/video.mp4",
  mimeType: "video/mp4",
  format: "video"
});

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
