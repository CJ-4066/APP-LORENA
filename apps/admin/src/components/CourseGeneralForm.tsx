// @ts-nocheck
import React from 'react';
import { AdminFileUploader } from './AdminFileUploader';
import { CourseCoverUploader } from './CourseCoverUploader';

function inferResourceKind(mimeType: string, url: string) {
  const mime = mimeType.trim().toLowerCase();
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';

  const parsedUrl = url.trim().toLowerCase();
  if (parsedUrl.includes('canva.com')) return 'canva';
  if (/\.(mp4|m4v|mov|webm)(\?|#|$)/.test(parsedUrl)) return 'video';
  if (/\.(png|jpe?g|webp|gif|svg)(\?|#|$)/.test(parsedUrl)) return 'image';
  if (/\.pdf(\?|#|$)/.test(parsedUrl)) return 'pdf';
  return parsedUrl.startsWith('http') ? 'link' : 'file';
}

export const CourseGeneralForm = ({
  courseForm,
  setCourseForm,
  handleSaveCourse,
  savingCourseId,
  isCreatingCourse,
  handleCloseCourseDrawer,
  apiBaseUrl,
  selectedCourseId,
}) => {
  const isPublished = courseForm.status === 'published';

  return (
    <form
      className="course-editor-form course-creator-flow"
      onSubmit={(event) => void handleSaveCourse(event)}
    >
      <section className="course-form-section course-form-section-first">
        <header className="course-form-section-head">
          <span className="course-form-step">01</span>
          <div>
            <p className="eyebrow">Ficha del curso</p>
            <h3>Contenido visible</h3>
          </div>
        </header>

        <div className="course-form-fields course-form-fields-main">
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
            <span>Subtítulo</span>
            <input
              value={courseForm.subtitle}
              onChange={(event) =>
                setCourseForm((current) => ({
                  ...current,
                  subtitle: event.target.value,
                }))
              }
              placeholder="Una frase breve que acompañe al título"
            />
          </label>

          <label>
            <span>Categoría</span>
            <input
              value={courseForm.category}
              onChange={(event) =>
                setCourseForm((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
              placeholder="Ej: Tarot o Astrología"
            />
          </label>

          <label>
            <span>Nivel</span>
            <select
              value={courseForm.level}
              onChange={(event) =>
                setCourseForm((current) => ({
                  ...current,
                  level: event.target.value,
                }))
              }
            >
              <option value="Inicial">Inicial</option>
              <option value="Intermedio">Intermedio</option>
              <option value="Avanzado">Avanzado</option>
              <option value="Todos los niveles">Todos los niveles</option>
            </select>
          </label>

          <label>
            <span>Duración estimada (horas)</span>
            <input
              type="number"
              min="0"
              step="0.5"
              inputMode="decimal"
              value={courseForm.estimatedHours}
              onChange={(event) =>
                setCourseForm((current) => ({
                  ...current,
                  estimatedHours: event.target.value,
                }))
              }
              placeholder="Ej: 2.5"
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
              placeholder="Describe el contenido y el propósito del curso"
            />
          </label>

          <label className="form-wide">
            <span>Resultados clave</span>
            <textarea
              rows={4}
              value={courseForm.outcomes}
              onChange={(event) =>
                setCourseForm((current) => ({
                  ...current,
                  outcomes: event.target.value,
                }))
              }
              placeholder={'Un resultado por línea\nEj: Interpretar una carta natal'}
            />
          </label>

          <label className="form-wide">
            <span>Frase destacada</span>
            <input
              value={courseForm.hook}
              onChange={(event) =>
                setCourseForm((current) => ({
                  ...current,
                  hook: event.target.value,
                }))
              }
              placeholder="Texto breve para presentar el curso en el catálogo"
            />
          </label>
        </div>
      </section>

      <section className="course-form-section">
        <header className="course-form-section-head">
          <span className="course-form-step">02</span>
          <div>
            <p className="eyebrow">Presentación</p>
            <h3>Portada y material principal</h3>
          </div>
        </header>

        <div className="course-media-fields">
          <div className="course-media-field">
            <CourseCoverUploader
              apiBaseUrl={apiBaseUrl}
              courseForm={courseForm}
              setCourseForm={setCourseForm}
              selectedCourseId={selectedCourseId}
            />
            <label>
              <span>URL externa de portada</span>
              <input
                type="url"
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
          </div>

          <div className="course-media-field">
            <AdminFileUploader
              apiBaseUrl={apiBaseUrl}
              label="Material principal"
              description="PDF, imagen o video compatible con la aplicación."
              accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
              mode="general"
              value={courseForm.resourceUrl}
              category="course"
              entityType="course"
              entityId={selectedCourseId ?? undefined}
              onUploaded={(asset) =>
                setCourseForm((current) => ({
                  ...current,
                  resourceUrl: asset.publicUrl,
                  resourceKind: inferResourceKind(asset.mimeType, asset.publicUrl),
                }))
              }
              onClear={() =>
                setCourseForm((current) => ({
                  ...current,
                  resourceUrl: '',
                  resourceKind: '',
                }))
              }
            />
            <label>
              <span>URL de Canva o recurso externo</span>
              <input
                type="url"
                value={courseForm.resourceUrl}
                onChange={(event) => {
                  const resourceUrl = event.target.value;
                  setCourseForm((current) => ({
                    ...current,
                    resourceUrl,
                    resourceKind: inferResourceKind('', resourceUrl),
                  }));
                }}
                placeholder="https://www.canva.com/design/..."
              />
            </label>
          </div>
        </div>
      </section>

      <section className="course-form-section">
        <header className="course-form-section-head">
          <span className="course-form-step">03</span>
          <div>
            <p className="eyebrow">Disponibilidad</p>
            <h3>Acceso y publicación</h3>
          </div>
        </header>

        <div className="course-publish-fields">
          <div className="course-status-line">
            <span>Estado actual</span>
            <strong className={`course-status course-status-${courseForm.status}`}>
              {isPublished
                ? 'Publicado'
                : courseForm.status === 'archived'
                  ? 'Archivado'
                  : 'Borrador'}
            </strong>
          </div>

          <div className="course-editor-switches">
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
              <span>Acceso Premium</span>
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
              <span>Destacar en el catálogo</span>
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
              <span>Permitir retirar de la biblioteca</span>
            </label>
          </div>
        </div>
      </section>

      <footer className="editor-actions course-editor-actions">
        {!isPublished ? (
          <button
            type="button"
            className="primary-button course-publish-button"
            disabled={savingCourseId !== null}
            onClick={() => void handleSaveCourse(undefined, 'published')}
          >
            {isCreatingCourse ? 'Crear y publicar' : 'Publicar curso'}
          </button>
        ) : null}
        <button
          type="submit"
          className={isPublished ? 'primary-button' : 'secondary-button'}
          disabled={savingCourseId !== null}
        >
          {savingCourseId
            ? 'Guardando...'
            : isCreatingCourse
              ? 'Guardar borrador'
              : 'Guardar cambios'}
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={handleCloseCourseDrawer}
        >
          Cancelar
        </button>
      </footer>
    </form>
  );
};
