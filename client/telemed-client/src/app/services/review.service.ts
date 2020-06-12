import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Review } from '../models/Review';
import { HttpClient } from '@angular/common/http';
import { Like } from '../models/Like';
import { REST, BASE_URL } from '../shared';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  doctorUrl:string = BASE_URL + "/doctors";
  // doctorUrl:string = "http://localhost:8080/doctors";

  doctorsURL:string = REST +'/doctors'
  // doctorUrl = this.doctorsURL; // test if this works
  constructor(private http:HttpClient) { 
    console.log("doctor URL", this.doctorsURL);
  }

  getReviews(doctorId:string):Observable<Review[]>{
    return this.http.get<Review[]>(this.doctorUrl + '/' + doctorId +  '/reviews');
  }
  addReview(doctorId:string, review:Review):Observable<Review>{
    console.log("review in service: ", review);
    return this.http.post<Review>(this.doctorUrl + '/' + doctorId + '/reviews', review);
  }
  updateReview(doctorId:string, review:Review):Observable<Review>{
    return this.http.put<Review>(this.doctorUrl+ '/' + doctorId + '/reviews/' + review.id, review);
  }

  deleteReview(doctorId:string, reviewId:string):Observable<any>{
    return this.http.delete(this.doctorUrl + '/' + doctorId + '/reviews/' + reviewId);
  }

  likeReview(reviewId:string, like:Like):Observable<Like>{
    return this.http.post<Like>(this.doctorUrl+ '/reviews/' + reviewId +'/like', like);
  }

  unlikeReview(reviewId:string, like:Like):Observable<Like>{
    return this.http.post<Like>(this.doctorUrl+ '/reviews/' + reviewId +'/unlike', like);
  }
}
