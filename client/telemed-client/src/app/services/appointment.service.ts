import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Appointment } from '../models/Appointment';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
// import { REST, BASE_URL } from '../shared';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {



  // appoitmentUrl:string= "http://localhost:8080/appointments";
  appoitmentUrl:string = environment.baseURL + "/appointments";

  
  constructor(private http:HttpClient) {
   }


  add(appointment:Appointment):Observable<Appointment>{
   return this.http.post<Appointment>(this.appoitmentUrl, appointment);
  }

  update(appointment:Appointment):Observable<Appointment>{
    return this.http.put<Appointment>(this.appoitmentUrl, appointment);
   }

  getAppointments():Observable<Appointment[]>{
    return this.http.get<Appointment[]>(this.appoitmentUrl);
  }

  getAllDoctorAppoitments(doctorId:string):Observable<Appointment[]>{
    return this.http.get<Appointment[]>(this.appoitmentUrl + '/doctor/' + doctorId);
  }

  getAllPatientAppoitments(patientId:string):Observable<Appointment[]>{
    return this.http.get<Appointment[]>(this.appoitmentUrl + '/patient/' + patientId);
  }

  getById(id:string):Observable<Appointment>{
    return this.http.get<Appointment>(this.appoitmentUrl + '/' + id);
  }
}
