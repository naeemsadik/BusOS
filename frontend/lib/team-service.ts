import { api } from './api';
import { User } from './types';

class TeamService {
  async getTeamMembers(): Promise<User[]> {
    const response = await api.get('/users/team');
    return response.data;
  }
  
  async getTeamMember(userId: string): Promise<User> {
    const response = await api.get(`/users/team/${userId}`);
    return response.data;
  }
}

export const teamService = new TeamService();
