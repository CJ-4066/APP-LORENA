{isCourseDrawerOpen ? (
        <section className="admin-panel admin-panel-wide course-workspace-page">
          <div
            className={
              isCreatingCourse
                ? "course-workspace-shell course-create-shell"
                : "course-workspace-shell"
            }
          >
            <div className="audit-detail-head course-drawer-head">
              <div>
                <p className="eyebrow">
                  {courseDrawerTab === "library" ? "Biblioteca" : "Cursos"}
                </p>
                <h2 id="course-drawer-title">
                  {courseDrawerTab === "library"
                    ? selectedLibraryPdfId
                      ? "Editar PDF"
                      : "Nuevo PDF"
                    : selectedCourse
                      ? `Editar ${selectedCourse.title}`
                      : "Nuevo curso"}
                </h2>
                <p className="badge-editor-copy">
                  {courseDrawerTab === "library"
                    ? "Datos del PDF, categoría, vínculo opcional y publicación."
                    : isCreatingCourse
                      ? "Completa las casillas y crea el curso. El material quedará vinculado automáticamente."
                      : "Datos del curso, material y publicación."}
                </p>
              </div>
              <div className="course-drawer-head-actions">
                {!isCreatingCourse ? (
                  <>
                    <span className="topbar-pill">
                      {selectedCourse?.status === "published"
                        ? "Publicado"
                        : selectedCourse?.status === "archived"
                          ? "Archivado"
                          : "Borrador"}
                    </span>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => openCourseWorkspaceTab(null, "data")}
                    >
                      Nuevo curso
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleCloseCourseDrawer}
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div
              className={
                isCreatingCourse
                  ? "course-drawer-layout course-drawer-layout-create"
                  : "course-drawer-layout"
              }
            >
              {!isCreatingCourse ? (
                <aside className="course-drawer-sidebar">
                <div className="course-drawer-summary">
                  <div>
                    <span className="course-drawer-kicker">
                      Vista del curso
                    </span>
                    <strong>
                      {selectedCourse?.title ?? "Nuevo curso sin nombre"}
                    </strong>
                    <p>
                      {selectedCourse
                        ? selectedCourse.subtitle || "Sin subtítulo todavía"
                        : "Completa la base, luego agrega módulos, lecciones y publicación."}
                    </p>
                  </div>
                  <div className="course-drawer-metrics">
                    <div>
                      <span>Módulos</span>
                      <strong>{selectedCourseModules.length}</strong>
                    </div>
                    <div>
                      <span>Lecciones</span>
                      <strong>{selectedCourseLessons.length}</strong>
                    </div>
                    <div>
                      <span>Recursos</span>
                      <strong>{selectedCourseResources.length}</strong>
                    </div>
                  </div>
                </div>

                <div className="course-drawer-rail">
                  {[
                    ["data", "Datos", "Información y archivo del curso"],
                    ["modules", "Módulos", "Temario y contenido del curso"],
                    ["history", "Historial", "Auditoría y cambios"],
                  ].map(([value, label, hint]) => (
                    <button
                      key={value}
                      type="button"
                      className={
                        courseDrawerTab === value
                          ? "course-drawer-nav-item course-drawer-nav-item-active"
                          : "course-drawer-nav-item"
                      }
                      onClick={() =>
                        handleSelectCourseDrawerTab(value as CourseWorkspaceTab)
                      }
                    >
                      <strong>{label}</strong>
                      <span>{hint}</span>
                    </button>
                  ))}
                </div>

                <div className="course-drawer-note">
                  <span>Atajo</span>
                  <p>
                    Usa la pestaña activa para editar una sola capa del curso
                    sin perder el contexto del resto.
                  </p>
                </div>
                </aside>
              ) : null}

              <section className="course-drawer-main">
                {courseError ? (
                  <p className="badge-feedback badge-feedback-error">
                    {courseError}
                  </p>
                ) : null}
                {courseMessage ? (
                  <p className="badge-feedback badge-feedback-success">
                    {courseMessage}
                  </p>
                ) : null}

                {courseDrawerTab === "data" ? (
                  <form
                    className="badge-editor-form course-editor-form"
                    onSubmit={(event) => void handleSaveCourse(event)}
                  >
                    <div className="course-editor-grid">
                      <section className="course-editor-card">
                        <div className="course-editor-card-head">
                          <div>
                            <p className="eyebrow">Datos principales</p>
                            <h3>Información del curso</h3>
                          </div>
                        </div>
                        <div className="badge-form-grid badge-form-grid-compact">
                          <label className="form-wide">
                            <span>Título del curso</span>
                            <input
                              required
                              value={courseForm.title}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  title: event.target.value,
                                }))
                              }
                              placeholder="Ej: Tarot Evolutivo Nivel 1"
                            />
                          </label>
                          <label className="form-wide">
                            <span>Categoría</span>
                            <input
                              value={courseForm.category}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  category: event.target.value,
                                }))
                              }
                              placeholder="Ej: Tarot, Astrología, General"
                            />
                          </label>
                          <label className="form-wide">
                            <span>Descripción</span>
                            <textarea
                              rows={5}
                              value={courseForm.description}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  description: event.target.value,
                                }))
                              }
                              placeholder="Describe brevemente de qué trata este curso..."
                            />
                          </label>
                        </div>
                      </section>

                      <section className="course-editor-card course-editor-card-visual">
                        <div className="course-editor-card-head">
                          <div>
                            <p className="eyebrow">Recurso interactivo</p>
                            <h3>Presentación, Video o PDF</h3>
                          </div>
                        </div>
                        <AdminFileUploader
                          apiBaseUrl={apiBaseUrl}
                          label="Archivo del Curso"
                          description="Sube la presentación (PowerPoint, PDF) o el video del curso."
                          accept="application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,video/mp4,video/quicktime"
                          mode="general"
                          value={courseForm.resourceUrl}
                          category="course"
                          entityType="course"
                          entityId={selectedCourseId ?? undefined}
                          onUploaded={(asset) => {
                            setCourseForm((current) => ({
                              ...current,
                              resourceUrl: asset.publicUrl,
                            }));
                            void handleAutoAttachCourseResource(asset.publicUrl);
                          }}
                          onClear={() =>
                            setCourseForm((current) => ({
                              ...current,
                              resourceUrl: "",
                            }))
                          }
                        />
                        <div className="badge-form-grid badge-form-grid-compact">
                          <label className="form-wide">
                            <span>Enlace alternativo (Canva, PowerPoint Online, etc.)</span>
                            <input
                              value={courseForm.resourceUrl}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  resourceUrl: event.target.value,
                                }))
                              }
                              placeholder="https://www.canva.com/design/... o URL externa del archivo"
                            />
                          </label>
                        </div>
                      </section>

                      <section className="course-editor-card course-editor-card-visual">
                        <div className="course-editor-card-head">
                          <div>
                            <p className="eyebrow">Portada y estado</p>
                            <h3>Publicación</h3>
                          </div>
                        </div>
                        <AdminFileUploader
                          apiBaseUrl={apiBaseUrl}
                          label="Portada"
                          description="Sube una imagen para el curso o pega una URL externa."
                          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                          mode="image"
                          value={courseForm.coverImageUrl}
                          category="course"
                          entityType="course"
                          entityId={selectedCourseId ?? undefined}
                          onUploaded={(asset) =>
                            setCourseForm((current) => ({
                              ...current,
                              coverImageUrl: asset.publicUrl,
                            }))
                          }
                          onClear={() =>
                            setCourseForm((current) => ({
                              ...current,
                              coverImageUrl: "",
                            }))
                          }
                        />
                        <label className="form-wide">
                          <span>URL externa de portada</span>
                          <input
                            value={courseForm.coverImageUrl}
                            onChange={(event) =>
                              setCourseForm((current) => ({
                                ...current,
                                coverImageUrl: event.target.value,
                              }))
                            }
                            placeholder="https://..."
                          />
                        </label>
                        <div className="course-editor-switches">
                          <label>
                            <span>Estado</span>
                            <select
                              value={courseForm.status}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  status: event.target.value as any,
                                }))
                              }
                            >
                              <option value="draft">Borrador</option>
                              <option value="published">Publicado</option>
                              <option value="archived">Archivado</option>
                            </select>
                          </label>
                          <label className="switch-row">
                            <input
                              type="checkbox"
                              checked={courseForm.premium}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  premium: event.target.checked,
                                }))
                              }
                            />
                            <span>Premium</span>
                          </label>
                          <label className="switch-row">
                            <input
                              type="checkbox"
                              checked={courseForm.featured}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  featured: event.target.checked,
                                }))
                              }
                            />
                            <span>Destacado</span>
                          </label>
                          <label className="switch-row">
                            <input
                              type="checkbox"
                              checked={courseForm.removable}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  removable: event.target.checked,
                                }))
                              }
                            />
                            <span>Eliminable</span>
                          </label>
                        </div>
                      </section>
                    </div>

                    <div className="editor-actions course-editor-actions">
                      {courseForm.status !== "published" && (
                        <button
                          type="button"
                          className="primary-button"
                          style={{ backgroundColor: "#10b981", borderColor: "#10b981", color: "white" }}
                          disabled={savingCourseId !== null}
                          onClick={(e) => {
                            e.preventDefault();
                            setCourseForm((prev) => ({ ...prev, status: "published" }));
                            setTimeout(() => {
                              const form = e.currentTarget.closest("form");
                              if (form) form.requestSubmit();
                            }, 50);
                          }}
                        >
                          {isCreatingCourse ? "Publicar nuevo curso" : "Publicar curso"}
                        </button>
                      )}
                      <button
                        type="submit"
                        className="primary-button"
                        disabled={savingCourseId !== null}
                      >
                        {savingCourseId
                          ? "Guardando..."
                          : isCreatingCourse
                            ? "Crear curso"
                            : "Guardar cambios"}
                      </button>
                      <button type="button" className="secondary-button" onClick={handleCloseCourseDrawer}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : null}

                {courseDrawerTab === "modules" ? (
                  <div className="course-subview-grid course-subview-grid-modules">
                    <article className="course-subview-card">
                      <div className="panel-head">
                        <div>
                          <p className="eyebrow">Módulos</p>
                          <h3>
                            {selectedCourseModuleId
                              ? "Editar módulo"
                              : "Nuevo módulo"}
                          </h3>
                          <p>
                            {selectedCourse?.title ?? "Selecciona un curso"}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            setSelectedCourseModuleId(null);
                            setCourseModuleForm({
                              title: "",
                              summary: "",
                              durationMinutes: "",
                              order: "",
                              status: "draft",
                              isActive: true,
                            });
                          }}
                        >
                          Nuevo
                        </button>
                      </div>
                      <form
                        className="badge-form-grid badge-form-grid-compact"
                        onSubmit={(event) => void handleSaveCourseModule(event)}
                      >
                        <label className="form-wide">
                          <span>Título</span>
                          <input
                            value={courseModuleForm.title}
                            onChange={(event) =>
                              setCourseModuleForm((current) => ({
                                ...current,
                                title: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="form-wide">
                          <span>Resumen</span>
                          <textarea
                            rows={2}
                            value={courseModuleForm.summary}
                            onChange={(event) =>
                              setCourseModuleForm((current) => ({
                                ...current,
                                summary: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <div className="course-inline-fields">
                          <label>
                            <span>Duración</span>
                            <input
                              type="number"
                              value={courseModuleForm.durationMinutes}
                              onChange={(event) =>
                                setCourseModuleForm((current) => ({
                                  ...current,
                                  durationMinutes: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label>
                            <span>Orden</span>
                            <input
                              type="number"
                              value={courseModuleForm.order}
                              onChange={(event) =>
                                setCourseModuleForm((current) => ({
                                  ...current,
                                  order: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label>
                            <span>Estado</span>
                            <select
                              value={courseModuleForm.status}
                              onChange={(event) =>
                                setCourseModuleForm((current) => ({
                                  ...current,
                                  status: event.target.value,
                                }))
                              }
                            >
                              <option value="draft">Borrador</option>
                              <option value="published">Publicado</option>
                              <option value="archived">Archivado</option>
                            </select>
                          </label>
                        </div>
                        <label className="switch-row">
                          <input
                            type="checkbox"
                            checked={courseModuleForm.isActive}
                            onChange={(event) =>
                              setCourseModuleForm((current) => ({
                                ...current,
                                isActive: event.target.checked,
                              }))
                            }
                          />
                          <span>
                            {courseModuleForm.isActive ? "Activo" : "Inactivo"}
                          </span>
                        </label>
                        <div className="editor-actions form-wide">
                          <button type="submit" className="primary-button">
                            {selectedCourseModuleId
                              ? "Guardar módulo"
                              : "Crear módulo"}
                          </button>
                        </div>
                      </form>
                    </article>

                    <article className="course-subview-card course-subview-list-card">
                      <div className="panel-head">
                        <div>
                          <p className="eyebrow">Lista</p>
                          <h3>{selectedCourseModules.length} módulos</h3>
                        </div>
                      </div>
                      {selectedCourseModules.length > 0 ? (
                        <div className="course-item-list">
                          {selectedCourseModules.map((module) => (
                            <article
                              key={module.id}
                              className="course-item-row"
                            >
                              <div>
                                <strong>{module.title}</strong>
                                <p>{module.summary}</p>
                              </div>
                              <div className="course-item-meta">
                                <span>{module.lessons.length} lecciones</span>
                                <strong className="topbar-pill">
                                  {module.status ?? "draft"}
                                </strong>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => {
                                    setSelectedCourseModuleId(module.id);
                                    setCourseModuleForm({
                                      title: module.title,
                                      summary: module.summary,
                                      durationMinutes: String(
                                        module.durationMinutes,
                                      ),
                                      order: String(module.order ?? 1),
                                      status: module.status ?? "draft",
                                      isActive: module.isActive ?? true,
                                    });
                                    handleSelectCourseDrawerTab("modules");
                                  }}
                                >
                                  Editar
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state">
                          <h3>No hay módulos todavía.</h3>
                          <p>
                            Agrega el primer módulo para empezar a estructurar
                            el curso.
                          </p>
                        </div>
                      )}
                    </article>
                  </div>
                ) : null}

                {courseDrawerTab === "lessons" ? (
                  <div className="course-subview-grid">
                    <article className="course-subview-card">
                      <div className="panel-head">
                        <div>
                          <strong>
                            {selectedCourseLessonId
                              ? "Editar lección"
                              : "Nueva lección"}
                          </strong>
                          <p>
                            {selectedCourse?.title ?? "Selecciona un curso"}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            setSelectedCourseLessonId(null);
                            setCourseLessonForm({
                              title: "",
                              format: "video",
                              durationMinutes: "",
                              prompt: "",
                              content: "",
                              resourceUrl: "",
                              order: "",
                              status: "draft",
                              isActive: true,
                            });
                          }}
                        >
                          Nueva
                        </button>
                      </div>
                      <label>
                        <span>Módulo</span>
                        <select
                          value={selectedCourseModuleId ?? ""}
                          onChange={(event) =>
                            setSelectedCourseModuleId(
                              event.target.value || null,
                            )
                          }
                        >
                          <option value="">Selecciona</option>
                          {selectedCourseModules.map((module) => (
                            <option key={module.id} value={module.id}>
                              {module.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <form
                        className="badge-form-grid badge-form-grid-compact"
                        onSubmit={(event) => void handleSaveCourseLesson(event)}
                      >
                        <label className="form-wide">
                          <span>Título</span>
                          <input
                            value={courseLessonForm.title}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                title: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          <span>Formato</span>
                          <input
                            value={courseLessonForm.format}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                format: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          <span>Duración</span>
                          <input
                            type="number"
                            value={courseLessonForm.durationMinutes}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                durationMinutes: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          <span>Orden</span>
                          <input
                            type="number"
                            value={courseLessonForm.order}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                order: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="form-wide">
                          <span>Prompt</span>
                          <textarea
                            rows={3}
                            value={courseLessonForm.prompt}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                prompt: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="form-wide">
                          <span>Contenido</span>
                          <textarea
                            rows={4}
                            value={courseLessonForm.content}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                content: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="form-wide">
                          <span>Recurso</span>
                          <input
                            value={courseLessonForm.resourceUrl}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                resourceUrl: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <div className="form-wide">
                          <AdminFileUploader
                            apiBaseUrl={apiBaseUrl}
                            label="Archivo de la lección"
                            description="PDF, imagen o exportación de Canva."
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,application/pdf"
                            mode="general"
                            value={courseLessonForm.resourceUrl}
                            category="lesson"
                            entityType="course_lesson"
                            entityId={selectedCourseLessonId ?? undefined}
                            onUploaded={(asset) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                resourceUrl: asset.publicUrl,
                              }))
                            }
                            onClear={() =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                resourceUrl: "",
                              }))
                            }
                          />
                        </div>
                        <label>
                          <span>Estado</span>
                          <select
                            value={courseLessonForm.status}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                status: event.target.value,
                              }))
                            }
                          >
                            <option value="draft">Borrador</option>
                            <option value="published">Publicado</option>
                            <option value="archived">Archivado</option>
                          </select>
                        </label>
                        <label className="switch-row">
                          <input
                            type="checkbox"
                            checked={courseLessonForm.isActive}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                isActive: event.target.checked,
                              }))
                            }
                          />
                          <span>
                            {courseLessonForm.isActive ? "Activo" : "Inactivo"}
                          </span>
                        </label>
                        <div className="editor-actions form-wide">
                          <button type="submit" className="primary-button">
                            {selectedCourseLessonId
                              ? "Guardar lección"
                              : "Crear lección"}
                          </button>
                        </div>
                      </form>
                    </article>

                    <article className="course-subview-card course-subview-list-card">
                      <div className="panel-head">
                        <div>
                          <p className="eyebrow">Lista</p>
                          <h3>{selectedCourseLessons.length} lecciones</h3>
                        </div>
                      </div>
                      {selectedCourseLessons.length > 0 ? (
                        <div className="course-item-list">
                          {selectedCourseLessons.map((lesson) => (
                            <article
                              key={lesson.id}
                              className="course-item-row"
                            >
                              <div>
                                <strong>{lesson.title}</strong>
                                <p>{lesson.prompt || lesson.content}</p>
                              </div>
                              <div className="course-item-meta">
                                <span>{lesson.format}</span>
                                <strong>{lesson.durationMinutes} min</strong>
                                <span className="topbar-pill">
                                  {lesson.status ?? "draft"}
                                </span>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => {
                                    setSelectedCourseLessonId(lesson.id);
                                    setCourseLessonForm({
                                      title: lesson.title,
                                      format: lesson.format,
                                      durationMinutes: String(
                                        lesson.durationMinutes,
                                      ),
                                      prompt: lesson.prompt,
                                      content: lesson.content ?? "",
                                      resourceUrl: lesson.resourceUrl ?? "",
                                      order: String(lesson.order ?? 1),
                                      status: lesson.status ?? "draft",
                                      isActive: lesson.isActive ?? true,
                                    });
                                    handleSelectCourseDrawerTab("lessons");
                                  }}
                                >
                                  Editar
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state">
                          <h3>No hay lecciones todavía.</h3>
                          <p>
                            Selecciona un módulo y agrega la primera lección
                            para completar la ruta.
                          </p>
                        </div>
                      )}
                    </article>
                  </div>
                ) : null}

                {courseDrawerTab === "resources" ? (
                  <div className="course-subview-grid">
                    <article className="course-subview-card">
                      <div className="panel-head">
                        <div>
                          <strong>Recurso</strong>
                          <p>
                            {selectedCourse?.title ?? "Selecciona un curso"}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            setSelectedCourseResourceId(null);
                            setCourseResourceForm({
                              title: "",
                              kind: "link",
                              description: "",
                              url: "",
                              status: "draft",
                              isActive: true,
                            });
                          }}
                        >
                          Nuevo
                        </button>
                      </div>
                      <form
                        className="badge-form-grid badge-form-grid-compact"
                        onSubmit={(event) =>
                          void handleSaveCourseResource(event)
                        }
                      >
                        <label className="form-wide">
                          <span>Título</span>
                          <input
                            value={courseResourceForm.title}
                            onChange={(event) =>
                              setCourseResourceForm((current) => ({
                                ...current,
                                title: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          <span>Tipo</span>
                          <select
                            value={courseResourceForm.kind}
                            onChange={(event) =>
                              setCourseResourceForm((current) => ({
                                ...current,
                                kind: event.target.value,
                              }))
                            }
                          >
                            <option value="pdf">PDF</option>
                            <option value="canva">Canva</option>
                            <option value="file">Archivo</option>
                            <option value="image">Imagen</option>
                            <option value="link">Enlace</option>
                          </select>
                        </label>
                        <label className="form-wide">
                          <span>Descripción</span>
                          <textarea
                            rows={3}
                            value={courseResourceForm.description}
                            onChange={(event) =>
                              setCourseResourceForm((current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="form-wide">
                          <span>Archivo o enlace Canva</span>
                          <input
                            placeholder="Pega el enlace Canva/PDF o sube un archivo abajo"
                            value={courseResourceForm.url}
                            onChange={(event) =>
                              setCourseResourceForm((current) => ({
                                ...current,
                                url: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <div className="form-wide">
                          <AdminFileUploader
                            apiBaseUrl={apiBaseUrl}
                            label="Recurso descargable"
                            description="Sube PDF, DOC, DOCX o imagen; para Canva pega el enlace compartido."
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            mode="general"
                            value={courseResourceForm.url}
                            category="course"
                            entityType="course_resource"
                            entityId={selectedCourseResourceId ?? undefined}
                            onUploaded={(asset) =>
                              setCourseResourceForm((current) => ({
                                ...current,
                                kind:
                                  asset.mimeType === "application/pdf"
                                    ? "pdf"
                                    : asset.mimeType.startsWith("image/")
                                      ? "image"
                                      : "file",
                                url: asset.publicUrl,
                              }))
                            }
                            onClear={() =>
                              setCourseResourceForm((current) => ({
                                ...current,
                                url: "",
                              }))
                            }
                          />
                        </div>
                        <div className="editor-actions form-wide">
                          <button type="submit" className="primary-button">
                            Guardar recurso
                          </button>
                        </div>
                      </form>
                    </article>

                    <article className="course-subview-card course-subview-list-card">
                      <div className="panel-head">
                        <div>
                          <p className="eyebrow">Lista</p>
                          <h3>{selectedCourseResources.length} recursos</h3>
                        </div>
                      </div>
                      {selectedCourseResources.length > 0 ? (
                        <div className="course-item-list">
                          {selectedCourseResources.map((resource) => (
                            <article
                              key={resource.id}
                              className="course-item-row"
                            >
                              <div>
                                <strong>{resource.title}</strong>
                                <p>{resource.description}</p>
                              </div>
                              <div className="course-item-meta">
                                <span>{resource.kind}</span>
                                <strong className="topbar-pill">
                                  {resource.status ?? "draft"}
                                </strong>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => {
                                    setSelectedCourseResourceId(resource.id);
                                    setCourseResourceForm({
                                      title: resource.title,
                                      kind: resource.kind,
                                      description: resource.description,
                                      url: resource.url,
                                      status: resource.status ?? "draft",
                                      isActive: resource.isActive ?? true,
                                    });
                                    handleSelectCourseDrawerTab("resources");
                                  }}
                                >
                                  Editar
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state">
                          <h3>No hay recursos todavía.</h3>
                          <p>
                            Agrega PDFs, enlaces o materiales extra para
                            complementar el curso.
                          </p>
                        </div>
                      )}
                    </article>
                  </div>
                ) : null}

                {courseDrawerTab === "library" ? (
                  <>
                    {libraryBulkNotice ? (
                      <section
                        className={`library-notice library-notice-${libraryBulkNotice.tone}`}
                      >
                        <div className="library-notice-icon" aria-hidden="true">
                          <ActionIcon
                            name={
                              libraryBulkNotice.tone === "success"
                                ? "success"
                                : libraryBulkNotice.tone === "warning"
                                  ? "warning"
                                  : libraryBulkNotice.tone === "info"
                                    ? "info"
                                    : "close"
                            }
                          />
                        </div>
                        <div className="library-notice-copy">
                          <strong>{libraryBulkNotice.title}</strong>
                          <p>{libraryBulkNotice.message}</p>
                          {libraryBulkNotice.details &&
                          libraryBulkNotice.details.length > 0 ? (
                            <ul>
                              {libraryBulkNotice.details.map((detail) => (
                                <li key={detail}>{detail}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="secondary-button library-notice-close"
                          onClick={() => setLibraryBulkNotice(null)}
                        >
                          <span className="button-icon" aria-hidden="true">
                            <ActionIcon name="close" />
                          </span>
                        </button>
                      </section>
                    ) : null}

                    <div className="course-subview-grid">
                      <article className="course-subview-card">
                        <div className="panel-head">
                          <div>
                            <strong>
                              {selectedLibraryPdfId
                                ? "Editar PDF"
                                : "Nuevo PDF"}
                            </strong>
                            <p>Biblioteca formativa</p>
                          </div>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => {
                              resetLibraryPdfDraft(null);
                            }}
                          >
                            Nuevo
                          </button>
                        </div>
                        <p className="muted-copy">
                          Este editor sirve para ajustar un PDF ya cargado o
                          crear uno nuevo con vínculo opcional a un curso.
                        </p>
                        <form
                          className="badge-form-grid badge-form-grid-compact"
                          onSubmit={(event) => void handleSaveLibraryPdf(event)}
                        >
                          <label className="form-wide">
                            <span>Título</span>
                            <input
                              value={libraryPdfForm.title}
                              onChange={(event) =>
                                setLibraryPdfForm((current) => ({
                                  ...current,
                                  title: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label className="form-wide">
                            <span>Archivo PDF, DOC o DOCX</span>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              onChange={(event) => {
                                const file = event.target.files?.[0] ?? null;
                                setLibraryPdfFile(file);
                                if (file && !libraryPdfForm.title.trim()) {
                                  const prettyName = prettifyLibraryFileTitle(
                                    file.name,
                                  );
                                  if (prettyName) {
                                    setLibraryPdfForm((current) => ({
                                      ...current,
                                      title: prettyName,
                                    }));
                                  }
                                }
                              }}
                            />
                            <p className="muted-copy" style={{ marginTop: 8 }}>
                              {libraryPdfFile
                                ? `Seleccionado: ${libraryPdfFile.name}`
                                : libraryPdfForm.fileUrl
                                  ? "Archivo actual cargado"
                                  : "Selecciona un PDF, DOC o DOCX para subirlo al servidor."}
                            </p>
                          </label>
                          <label className="form-wide">
                            <div className="library-toggle-row">
                              <span>Categoría</span>
                              <label className="switch-row compact">
                                <input
                                  type="checkbox"
                                  checked={libraryPdfForm.assignCategory}
                                  onChange={(event) =>
                                    setLibraryPdfForm((current) => ({
                                      ...current,
                                      assignCategory: event.target.checked,
                                      category: event.target.checked
                                        ? current.category
                                        : "",
                                    }))
                                  }
                                />
                                <span>Asignar</span>
                              </label>
                            </div>
                            {libraryPdfForm.assignCategory ? (
                              <>
                                <input
                                  list="library-category-suggestions"
                                  value={libraryPdfForm.category}
                                  onChange={(event) =>
                                    setLibraryPdfForm((current) => ({
                                      ...current,
                                      category: event.target.value,
                                    }))
                                  }
                                  placeholder="Ej. Guías, Tarot, Ritual"
                                />
                                <datalist id="library-category-suggestions">
                                  {libraryCategorySuggestions.map(
                                    (category) => (
                                      <option key={category} value={category} />
                                    ),
                                  )}
                                </datalist>
                              </>
                            ) : (
                              <p className="muted-copy">
                                Se guardará como General.
                              </p>
                            )}
                          </label>
                          <div className="library-link-card form-wide">
                            <div className="library-link-card-head">
                              <div>
                                <span className="course-drawer-kicker">
                                  Relación con curso
                                </span>
                                <strong>Vinculación opcional</strong>
                              </div>
                              <label className="switch-row">
                                <input
                                  type="checkbox"
                                  checked={libraryPdfForm.linkToCourse}
                                  onChange={(event) =>
                                    setLibraryPdfForm((current) => ({
                                      ...current,
                                      linkToCourse: event.target.checked,
                                      courseId: event.target.checked
                                        ? current.courseId
                                        : "",
                                    }))
                                  }
                                />
                                <span>Vincular a un curso</span>
                              </label>
                            </div>
                            <p className="muted-copy">
                              La categoría organiza la app móvil. El vínculo a
                              curso solo agrega contexto editorial.
                            </p>
                            {libraryPdfForm.linkToCourse ? (
                              <select
                                value={libraryPdfForm.courseId}
                                onChange={(event) =>
                                  setLibraryPdfForm((current) => ({
                                    ...current,
                                    courseId: event.target.value,
                                  }))
                                }
                              >
                                <option value="">Selecciona un curso</option>
                                {courses.map((course) => (
                                  <option key={course.id} value={course.id}>
                                    {course.title}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="library-link-preview">
                                <span className="topbar-pill">Sin vínculo</span>
                                <p>
                                  {selectedLibraryCourse
                                    ? `Si activas la vinculación se asociará con ${selectedLibraryCourse.title}.`
                                    : "No estará asociado a ningún curso."}
                                </p>
                              </div>
                            )}
                          </div>
                          <label>
                            <span>Estado</span>
                            <select
                              value={libraryPdfForm.status}
                              onChange={(event) =>
                                setLibraryPdfForm((current) => ({
                                  ...current,
                                  status: event.target.value as
                                    "draft" | "published",
                                }))
                              }
                            >
                              <option value="published">Publicado</option>
                              <option value="draft">Borrador</option>
                            </select>
                          </label>
                          <div className="editor-actions form-wide">
                            <button type="submit" className="primary-button">
                              Guardar PDF
                            </button>
                          </div>
                        </form>
                      </article>

                      <article className="course-subview-card course-subview-list-card">
                        <div className="panel-head">
                          <div>
                            <p className="eyebrow">Lista</p>
                            <h3>{libraryPdfs.length} PDFs</h3>
                          </div>
                        </div>
                        {libraryPdfs.length > 0 ? (
                          <div className="library-list">
                            {libraryPdfs.map((pdf) => (
                              <article
                                key={pdf.id}
                                className="library-list-row"
                              >
                                <div className="library-list-main">
                                  <div className="library-list-title">
                                    <strong>{pdf.title}</strong>
                                    <p>
                                      {pdf.description || "Sin descripción"}
                                    </p>
                                  </div>
                                  <div className="library-list-meta">
                                    <span>{pdf.category}</span>
                                    <span>
                                      {pdf.courseId
                                        ? pdf.courseId
                                        : "Sin vínculo"}
                                    </span>
                                    <span>{pdf.pageCount} páginas</span>
                                    <span className="topbar-pill">
                                      {pdf.status ?? "draft"}
                                    </span>
                                  </div>
                                </div>
                                <div className="library-list-actions">
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => openLibraryPdfEditor(pdf)}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          `¿Eliminar "${pdf.title}"?`,
                                        )
                                      ) {
                                        void handleLibraryPdfAction(
                                          pdf.id,
                                          "delete",
                                        );
                                      }
                                    }}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <div className="empty-state">
                            <h3>No hay PDFs todavía.</h3>
                            <p>
                              Sube material de apoyo para que la biblioteca
                              quede ordenada por curso.
                            </p>
                          </div>
                        )}
                      </article>
                    </div>
                  </>
                ) : null}

                {courseDrawerTab === "publication" ? (
                  <section className="course-publication-grid">
                    <article className="course-subview-card">
                      <div className="panel-head">
                        <div>
                          <p className="eyebrow">Publicación</p>
                          <h3>Estado actual</h3>
                        </div>
                      </div>
                      <div className="metric-card">
                        <span>
                          {selectedCourse?.title ?? "Selecciona un curso"}
                        </span>
                        <strong>{selectedCourse?.status ?? "draft"}</strong>
                        <p>
                          {selectedCourse?.status === "published"
                            ? "Visible para alumnos"
                            : selectedCourse?.status === "archived"
                              ? "Archivado"
                              : "Aún en edición"}
                        </p>
                      </div>
                    </article>
                    <article className="course-subview-card">
                      <div className="panel-head">
                        <div>
                          <p className="eyebrow">Acciones</p>
                          <h3>Control de publicación</h3>
                        </div>
                      </div>
                      <div className="course-publication-actions">
                        <button
                          type="button"
                          className="primary-button button-with-icon"
                          onClick={() => void handlePublishCourse("publish")}
                        >
                          <span className="button-icon" aria-hidden="true">
                            <ActionIcon name="publish" />
                          </span>
                          <span>Publicar</span>
                        </button>
                        <button
                          type="button"
                          className="secondary-button button-with-icon"
                          onClick={() => void handlePublishCourse("unpublish")}
                        >
                          <span className="button-icon" aria-hidden="true">
                            <ActionIcon name="refresh" />
                          </span>
                          <span>Volver a borrador</span>
                        </button>
                        <button
                          type="button"
                          className="danger-button button-with-icon"
                          onClick={() => void handlePublishCourse("archive")}
                        >
                          <span className="button-icon" aria-hidden="true">
                            <ActionIcon name="archive" />
                          </span>
                          <span>Archivar</span>
                        </button>
                      </div>
                    </article>
                  </section>
                ) : null}

                {courseDrawerTab === "history" ? (
                  <section className="course-audit-panel">
                    <div className="panel-head">
                      <div>
                        <p className="eyebrow">Historial</p>
                        <h3>Cambios registrados</h3>
                      </div>
                    </div>

                    {courseAuditError ? (
                      <p className="badge-feedback badge-feedback-error">
                        {courseAuditError}
                      </p>
                    ) : null}

                    {courseAuditEntries.length > 0 ? (
                      <div className="audit-table">
                        <div className="audit-table-head audit-table-row">
                          <span>Fecha</span>
                          <span>Acción</span>
                          <span>Elemento</span>
                          <span>Campo</span>
                          <span>Antes</span>
                          <span>Después</span>
                          <span>Origen</span>
                          <span />
                        </div>
                        {courseAuditEntries.map((entry) => (
                          <article key={entry.id} className="audit-table-row">
                            <span>{formatDate(entry.changedAt)}</span>
                            <span>
                              {getCourseAuditActionLabel(
                                entry.action,
                                entry.fieldChanged,
                              )}
                            </span>
                            <span>{getCourseAuditElementLabel(entry)}</span>
                            <span>
                              {formatAuditFieldLabel(entry.fieldChanged)}
                            </span>
                            <span>
                              {summarizeAuditValue(entry.previousValue)}
                            </span>
                            <span>{summarizeAuditValue(entry.newValue)}</span>
                            <span>{entry.changedBy}</span>
                            <span className="align-right">
                              <button
                                type="button"
                                className="secondary-button audit-detail-button"
                                onClick={() => handleOpenAuditEntry(entry)}
                              >
                                Ver detalle
                              </button>
                            </span>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <h3>No hay cambios registrados todavía.</h3>
                        <p>
                          Los cambios de curso, módulos, lecciones, PDFs y
                          recursos aparecerán aquí.
                        </p>
                      </div>
                    )}
                  </section>
                ) : null}
              </section>
            </div>
          </div>
        </section>
      ) : null}