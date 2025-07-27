import { HttpInterceptorFn } from '@angular/common/http';

export const ErrorHandlingInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req);
};
