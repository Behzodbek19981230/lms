import { APIResponse } from '../types/api.types';
import { Group, CreateGroupDto, UpdateGroupDto, GroupWithStudents } from '../types/group';
import { request } from '../configs/request';
import { AxiosResponse } from 'axios';

class GroupService {
  private async handleResponse<T>(response: AxiosResponse): Promise<APIResponse<T>> {
    return {
      success: true,
      data: response.data,
      message: response.data.message
    };
  }

  // Get all groups for current user (teacher)
  async getMyGroups(): Promise<APIResponse<Group[]>> {
    try {
      const response = await request.get('/groups/me');
      return this.handleResponse<Group[]>(response);
    } catch (error) {
      throw new Error('Failed to fetch my groups');
    }
  }

  // Get all groups (admin only)
  async getAllGroups(): Promise<APIResponse<Group[]>> {
    try {
      const response = await request.get('/groups');
      return this.handleResponse<Group[]>(response);
    } catch (error) {
      throw new Error('Failed to fetch all groups');
    }
  }

  // Get group by ID
  async getGroupById(id: string): Promise<APIResponse<GroupWithStudents>> {
    try {
      const response = await request.get(`/groups/${id}`);
      return this.handleResponse<GroupWithStudents>(response);
    } catch (error) {
      throw new Error('Failed to fetch group details');
    }
  }

  // Create new group
  async createGroup(groupData: CreateGroupDto): Promise<APIResponse<Group>> {
    try {
      const response = await request.post('/groups', groupData);
      return this.handleResponse<Group>(response);
    } catch (error) {
      throw new Error('Failed to create group');
    }
  }

  // Update group
  async updateGroup(id: string, groupData: UpdateGroupDto): Promise<APIResponse<Group>> {
    try {
      const response = await request.patch(`/groups/${id}`, groupData);
      return this.handleResponse<Group>(response);
    } catch (error) {
      throw new Error('Failed to update group');
    }
  }

  // Delete group
  async deleteGroup(id: string): Promise<APIResponse<void>> {
    try {
      const response = await request.delete(`/groups/${id}`);
      return this.handleResponse<void>(response);
    } catch (error) {
      throw new Error('Failed to delete group');
    }
  }

  // Add student to group
  async addStudentToGroup(groupId: string, studentId: string): Promise<APIResponse<void>> {
    try {
      const response = await request.post(`/groups/${groupId}/students/${studentId}`);
      return this.handleResponse<void>(response);
    } catch (error) {
      throw new Error('Failed to add student to group');
    }
  }

  // Remove student from group
  async removeStudentFromGroup(groupId: string, studentId: string): Promise<APIResponse<void>> {
    try {
      const response = await request.delete(`/groups/${groupId}/students/${studentId}`);
      return this.handleResponse<void>(response);
    } catch (error) {
      throw new Error('Failed to remove student from group');
    }
  }

  // Get group students
  async getGroupStudents(groupId: string): Promise<APIResponse<any[]>> {
    try {
      const response = await request.get(`/groups/${groupId}/students`);
      return this.handleResponse<any[]>(response);
    } catch (error) {
      throw new Error('Failed to fetch group students');
    }
  }

  // Toggle group active status
  async toggleGroupStatus(id: string): Promise<APIResponse<Group>> {
    try {
      const response = await request.patch(`/groups/${id}/toggle-status`);
      return this.handleResponse<Group>(response);
    } catch (error) {
      throw new Error('Failed to toggle group status');
    }
  }
}

export const groupService = new GroupService();
