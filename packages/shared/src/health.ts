/** Shape of the API's health-check response, shared so the frontend gets compile-time safety. */
export interface HealthStatus {
  status: 'ok';
  timestamp: string;
}
