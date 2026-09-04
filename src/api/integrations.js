import { base44 } from './base44Client';

// File uploads stay client-side (no integration credits consumed).
export const UploadFile = base44.integrations.Core.UploadFile;
export const UploadPrivateFile = base44.integrations.Core.UploadPrivateFile;