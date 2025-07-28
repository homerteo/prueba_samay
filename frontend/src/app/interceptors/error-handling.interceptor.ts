import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorService } from '../services/error.service';
import { CategoriaError } from '../types/sensor.types';

export const ErrorHandlingInterceptor: HttpInterceptorFn = (req, next) => {
  const errorService = inject(ErrorService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Categorizar el error
      const categoria = categorizarError(error);
      
      // Registrar el error
      registrarError(req, error, categoria);
      
      // Mostrar mensaje user-friendly
      mostrarErrorUsuario(categoria);
      
      // Propagar el error
      return throwError(() => error);
    })
  );
};

/**
 * Categoriza error HTTP según el status code
 */
function categorizarError(error: HttpErrorResponse): CategoriaError {
  switch (error.status) {
    case 0:
      return {
        type: 'network',
        severity: 'alta',
        retryable: true,
        userMessage: 'Sin conexión a internet',
        technicalMessage: `Network error: ${error.message}`
      };
    case 401:
      return {
        type: 'client',
        severity: 'media',
        retryable: false,
        userMessage: 'Sesión expirada, por favor inicia sesión',
        technicalMessage: `Unauthorized: ${error.message}`
      };
    case 403:
      return {
        type: 'client',
        severity: 'media',
        retryable: false,
        userMessage: 'No tienes permisos para esta acción',
        technicalMessage: `Forbidden: ${error.message}`
      };
    case 404:
      return {
        type: 'client',
        severity: 'baja',
        retryable: false,
        userMessage: 'Recurso no encontrado',
        technicalMessage: `Not Found: ${error.message}`
      };
    case 500:
      return {
        type: 'server',
        severity: 'alta',
        retryable: true,
        userMessage: 'Error interno del servidor',
        technicalMessage: `Internal Server Error: ${error.message}`
      };
    case 503:
      return {
        type: 'server',
        severity: 'alta',
        retryable: true,
        userMessage: 'Servicio temporalmente no disponible',
        technicalMessage: `Service Unavailable: ${error.message}`
      };
    default:
      return {
        type: 'server',
        severity: 'media',
        retryable: false,
        userMessage: 'Error inesperado, intenta de nuevo',
        technicalMessage: `HTTP ${error.status}: ${error.message}`
      };
  }
}

/**
 * Registra el error para logging
 */
function registrarError(req: any, error: HttpErrorResponse, categoria: CategoriaError): void {
  const errorInfo = {
    id: generarErrorId(),
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method,
    status: error.status,
    statusText: error.statusText,
    categoria: categoria.type,
    severidad: categoria.severity,
    retryable: categoria.retryable,
    userMessage: categoria.userMessage,
    technicalMessage: categoria.technicalMessage,
    context: {
      userAgent: navigator.userAgent,
      currentUrl: window.location.href
    }
  };

  // Log según severidad
  switch (categoria.severity) {
    case 'critica':
    case 'alta':
      console.error('🚨 HTTP Error [CRÍTICO]:', errorInfo);
      break;
    case 'media':
      console.warn('⚠️ HTTP Error [MEDIO]:', errorInfo);
      break;
    case 'baja':
      console.info('ℹ️ HTTP Error [BAJO]:', errorInfo);
      break;
  }
}

/**
 * Muestra mensaje de error al usuario
 */
function mostrarErrorUsuario(categoria: CategoriaError): void {
  console.log(`💬 Mensaje para usuario: ${categoria.userMessage}`);
}

/**
 * Genera ID único para tracking de errores
 */
function generarErrorId(): string {
  return `HTTP_ERR_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
}
