const fs = require('fs');

async function createMasterclass() {
  const api = 'http://127.0.0.1:4000';
  
  // Login
  let res = await fetch(api + '/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: "admin@lore.com", password: "Admin123!" })
  });
  
  const cookie = res.headers.get('set-cookie');
  if (!cookie) throw new Error("No cookie returned");
  const admin_session = cookie.split(';')[0];
  
  console.log("Logged in!");
  const headers = {
    'Content-Type': 'application/json',
    'Cookie': admin_session
  };
  
  // Create draft course
  res = await fetch(api + '/api/admin/courses', {
    method: 'POST',
    headers,
    body: JSON.stringify({ title: "Masterclass de Fotografía y Creación Audiovisual", status: "draft" })
  });
  let json = await res.json();
  const courseId = json.item.id;
  
  // Save details
  await fetch(api + '/api/admin/courses/' + courseId, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      title: "Masterclass de Fotografía y Creación Audiovisual",
      status: "published",
      summary: "Aprende fotografía y video profesional",
      coverImageUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=2000"
    })
  });
  
  // Modules
  for (let i = 1; i <= 4; i++) {
    res = await fetch(api + '/api/admin/courses/' + courseId + '/modules', {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: "Módulo " + i, status: "published" })
    });
    json = await res.json();
    const moduleId = json.item.id;
    
    // MP4 video
    await fetch(api + '/api/admin/courses/' + courseId + '/modules/' + moduleId + '/lessons', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: "Video Lesson " + i,
        status: "published",
        format: "video",
        resourceUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
      })
    });
    
    // Image lesson
    await fetch(api + '/api/admin/courses/' + courseId + '/modules/' + moduleId + '/lessons', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: "Image Lesson " + i,
        status: "published",
        format: "image",
        resourceUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=100" + i
      })
    });
  }
  
  // 5th video
  res = await fetch(api + '/api/admin/courses/' + courseId + '/modules', {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: "Módulo 5 Extra", status: "published" })
  });
  json = await res.json();
  const mod5Id = json.item.id;
  await fetch(api + '/api/admin/courses/' + courseId + '/modules/' + mod5Id + '/lessons', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: "Video Lesson 5",
      status: "published",
      format: "video",
      resourceUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
    })
  });
  
  // Canva lesson
  await fetch(api + '/api/admin/courses/' + courseId + '/modules/' + mod5Id + '/lessons', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: "Canva Lesson",
      status: "published",
      format: "canva",
      resourceUrl: "https://www.canva.com/design/DAF-x/view"
    })
  });

  // PDFs (Library)
  for(let i=1; i<=2; i++) {
     await fetch(api + '/api/admin/library/pdfs', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: "PDF Resource " + i,
          fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          courseId: courseId,
          status: "published"
        })
     });
  }

  // Verify
  const courseRes = await fetch(api + '/api/mobile/courses');
  const courseData = await courseRes.json();
  
  const ourCourse = courseData.items.find(c => c.id === courseId);
  const vLesson = ourCourse.modules[0].lessons.find(l => l.format === 'video');

  console.log("Masterclass created successfully. Modules:", ourCourse.modules.length);
  console.log("Verificando API para MP4: mimeType =", vLesson.mimeType, ", mediaType =", vLesson.mediaType);
}

createMasterclass().catch(console.error);
