import { apiClient } from '../config/api';
import {
  PresignUploadRequest,
  PresignUploadResponse,
  ProcessNoteRequest,
  ProcessNoteResponse,
  Note,
} from '../types';

export class NotesService {
  async presignUpload(data: PresignUploadRequest): Promise<PresignUploadResponse> {
    const response = (await apiClient.post(
      '/notes/presign-upload',
      data
    )) as { data: PresignUploadResponse };
    return response.data;
  }

  async processNote(data: ProcessNoteRequest): Promise<ProcessNoteResponse> {
    const response = (await apiClient.post(
      '/notes/process',
      data
    )) as { data: ProcessNoteResponse };
    return response.data;
  }

  async getNotes(courseId?: string): Promise<Note[]> {
    const params = courseId ? { courseId } : {};
    const response = (await apiClient.get('/notes', { params })) as {
      data: { notes: Note[] };
    };
    return response.data?.notes ?? [];
  }

  async deleteNote(noteId: string): Promise<void> {
    await apiClient.delete(`/notes/${noteId}`);
  }

  async uploadFile(
    uploadUrl: string,
    fileUri: string,
    contentType: string
  ): Promise<void> {
    // Read file and upload to S3
    const response = await fetch(fileUri);
    const blob = await response.blob();

    await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': contentType,
      },
    });
  }

  /**
   * Embed missing note sections
   * Triggers embedding generation for notes that haven't been embedded yet
   */
  async embedMissing(): Promise<{ status: string; message: string }> {
    const response = (await apiClient.post('/notes/embed-missing')) as {
      data: { status: string; message: string };
    };
    return response.data;
  }

  /**
   * Search notes using semantic search
   */
  async searchNotes(query: string, courseId?: string): Promise<any[]> {
    const params: Record<string, string> = { q: query };
    if (courseId) {
      params.courseId = courseId;
    }
    const response = (await apiClient.get('/search', { params })) as {
      data: { hits: any[] };
    };
    return response.data?.hits ?? [];
  }
}

export const notesService = new NotesService();
