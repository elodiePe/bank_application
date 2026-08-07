import type { Request, Response } from 'express';
import type { ExportService } from '../services/exportService.js';

export function createExportController(exportService: ExportService) {
  return {
    async exportFamilyData(req: Request, res: Response) {
      const data = await exportService.exportFamilyData(req.auth!.familyId);
      res.setHeader('Content-Disposition', 'attachment; filename="mes-donnees.json"');
      res.json(data);
    },
  };
}

export type ExportController = ReturnType<typeof createExportController>;
