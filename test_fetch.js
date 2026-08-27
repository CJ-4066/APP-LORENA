async function test() {
  const api = 'http://127.0.0.1:4000';
  let res = await fetch(api + '/api/admin/courses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: "Masterclass de Fotografía y Creación Audiovisual", status: "draft" })
  });
  console.log(await res.text());
}
test();
