import { APIResponse } from '../types/api.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface AttendanceRecord {
  id: number;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  notes?: string;
  arrivedAt?: Date;
  leftAt?: Date;
  student: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  group: {
    id: number;
    name: string;
    subject?: {
      id: number;
      name: string;
    };
  };
  teacher: {
    id: number;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceStats {
  totalStudents: number;
  todayAttendance: {
    present: number;
    absent: number;
    late: number;
    total: number;
  };
  weeklyPresentRate: number;
  group: {
    id: number;
    name: string;
    subject: string | null;
  };
}

export interface PresentStudentsResponse {
  groupName: string;
  subject: string;
  presentStudents: Array<{
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
    arrivedAt?: string;
    notes?: string;
  }>;
  totalPresent: number;
  date: string;
}

export interface CreateAttendanceDto {
  studentId: number;
  groupId: number;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  notes?: string;
  arrivedAt?: Date;
  leftAt?: Date;
}

export interface BulkAttendanceDto {
  groupId: number;
  date: string;
  attendanceRecords: Array<{
    studentId: number;
    status: 'PRESENT' | 'ABSENT' | 'LATE';
    notes?: string;
    arrivedAt?: Date;
    leftAt?: Date;
  }>;
}

export interface AttendanceQueryDto {
  groupId?: number;
  studentId?: number;
  startDate?: string;
  endDate?: string;
  period?: 'today' | 'week' | 'month';
}

class AttendanceService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async createAttendance(dto: CreateAttendanceDto): Promise<APIResponse<AttendanceRecord>> {
    try {
      const response = await fetch(`${API_BASE_URL}/attendance`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(dto),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error creating attendance:', error);
      return { 
        success: false, 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async createBulkAttendance(dto: BulkAttendanceDto): Promise<APIResponse<AttendanceRecord[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/bulk`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(dto),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error creating bulk attendance:', error);
      return { 
        success: false, 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async getAttendance(query?: AttendanceQueryDto): Promise<APIResponse<AttendanceRecord[]>> {
    try {
      const params = new URLSearchParams();
      if (query) {
        Object.entries(query).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, String(value));
          }
        });
      }

      const url = `${API_BASE_URL}/attendance${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching attendance:', error);
      return { 
        success: false, 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async getAttendanceStats(groupId: number): Promise<APIResponse<AttendanceStats>> {
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/stats/${groupId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
      return { 
        success: false, 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // NEW METHODS FOR PRESENT STUDENTS ONLY

  /**
   * Get only present students for a specific group and date
   */
  async getPresentStudents(groupId: number, date: string): Promise<APIResponse<PresentStudentsResponse>> {
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/present/${groupId}/${date}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching present students:', error);
      return { 
        success: false, 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get only present students for today
   */
  async getTodayPresentStudents(groupId: number): Promise<APIResponse<PresentStudentsResponse>> {
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/present/today/${groupId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching today present students:', error);
      return { 
        success: false, 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async updateAttendance(id: number, updates: Partial<CreateAttendanceDto>): Promise<APIResponse<AttendanceRecord>> {
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error updating attendance:', error);
      return { 
        success: false, 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async deleteAttendance(id: number): Promise<APIResponse<void>> {
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true, data: undefined };
    } catch (error) {
      console.error('Error deleting attendance:', error);
      return { 
        success: false, 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export const attendanceService = new AttendanceService();
export default attendanceService;
