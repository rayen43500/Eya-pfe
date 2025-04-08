import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
  last_login: string;
  role: string;
}

export interface UserCreate {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  is_staff?: boolean;
  role?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:8000/api/users/';

  constructor(private http: HttpClient) { }

  getUsers(): Observable<User[]> {
    console.log('Appel à getUsers() - URL:', this.apiUrl);
    return this.http.get<User[]>(this.apiUrl);
  }

  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}${id}/`);
  }

  createUser(user: UserCreate): Observable<User> {
    return this.http.post<User>(this.apiUrl, user);
  }

  updateUser(id: number, user: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}${id}/`, user);
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}${id}/`);
  }

  setActive(id: number, isActive: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}${id}/set_active/`, { is_active: isActive });
  }

  setStaff(id: number, isStaff: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}${id}/set_staff/`, { is_staff: isStaff });
  }

  setRole(id: number, role: string): Observable<any> {
    return this.http.post(`${this.apiUrl}${id}/set_role/`, { role });
  }

  resetPassword(id: number, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}${id}/reset_password/`, { password });
  }
} 