import { HttpInterceptorFn } from '@angular/common/http';

export const stateInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req);
};
