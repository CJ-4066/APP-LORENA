// @ts-nocheck
import React from 'react';
import { AdminFileUploader } from './AdminFileUploader';

export const CourseCoverUploader = ({
  apiBaseUrl,
  courseForm,
  setCourseForm,
  selectedCourseId
}) => {
  return (
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
  );
};
