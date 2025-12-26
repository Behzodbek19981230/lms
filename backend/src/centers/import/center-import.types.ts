export type ImportError = {
  sheet: string;
  row: number; // 1-based data row (excluding header)
  message: string;
};

export type CenterExcelImportResult = {
  summary: {
    subjectsCreated: number;
    groupsCreated: number;
    groupsUpdated: number;
    studentsCreated: number;
    studentsUpdated: number;
    studentGroupLinksCreated: number;
    paymentsCreated: number;
    paymentsSkipped: number;
  };
  errors: ImportError[];
};
