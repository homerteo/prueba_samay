import { HttpInterceptorFn } from '@angular/common/http';

export const websocketInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req);
};
